// TTC Crew — records.js
// window.TTCRecords: the ONE place any page talks to the records backend. Never touches the DOM.
//
// Config comes from crew-api.json (next to this file, one level up from services/), fetched
// network-first with a cached fallback — the same pattern the brain page uses for brain.json.
// While crew-api.json's "url" is null (no Apps Script backend deployed yet), every call in here
// falls back to a LOCAL fallback that behaves like the real thing:
//   - Identity is a real sign-in, not a role picker. A person is chosen from window.TTC_PEOPLE
//     (data/people.js) and from then on the app behaves as that person, with that person's role,
//     until they sign out. There is no "viewing as" control anywhere — the signed-in person's role
//     is the only thing that changes what a page shows or allows.
//   - Writes land in one localStorage-backed store (ttc-crew-local-db:v1), shaped exactly like the
//     real backend's response shapes, so a page never has to branch on configured()/!configured()
//     except to decide what the SIGN-IN SCREEN looks like (a people-picker locally, email+code once
//     the backend is live).
//
// Backend shapes match backend/_API-CONTRACT.md + backend/apps-script/Code.gs (2026-09-22, v4.0.0).
// Two gaps found while wiring this up, left exactly as found (not this file's to fix):
//   - Code.gs wires up `certs_get` / `certs_set` in its action switch, but never defines
//     actionCertsGet_ / actionCertsSet_, and setup.gs never creates the "Certs" sheet Code.gs expects.
//     Calling either action today will 500. This module calls them anyway (future-proof — they'll
//     start working the day someone finishes them) and falls back to the local cert store on any
//     failure, so a person's own badge marks are never lost to a half-built endpoint.
//   - actionProfileGet_ already returns a `photo` field, but actionProfileSet_ never accepts one and
//     the Profile sheet has no photo column — a photo saved today will not persist against the real
//     backend once deployed. Flagged, not fixed (backend/** is not this file's to change).
(function () {
  'use strict';

  var SELF_SRC = document.currentScript && document.currentScript.src;
  var CONFIG_URL = SELF_SRC ? new URL('../crew-api.json', SELF_SRC).href : '../crew-api.json';
  var CONFIG_CACHE_KEY = 'ttc-crew-api-config:v1';
  var SESSION_KEY = 'ttc-crew-session:v1';
  var LOCAL_DB_KEY = 'ttc-crew-local-db:v1';
  var APP_SECRET_KEY = 'ttc-crew-app-secret'; // set by hand on a device once a real backend exists; never shipped here

  var ROLE_CAPS = {
    crew: {},
    trainer: { verify_others: true, see_everyone: true },
    office: { verify_others: true, see_everyone: true, admin_people: true }
  };

  var PROFILE_FORBIDDEN = ['email', 'role', 'person_id', 'active'];
  var PROFILE_LIMITS = { preferred_name: 40, about: 280, certifications: 200, phone_optional: 25 };

  // Local-fallback demo seed only, mirroring backend/certifications-seed.json (a real 2026-09-22 pull
  // of the company website bios). NEVER used once a real backend is configured. No date is guessed —
  // every row starts needs-confirmation with no earned_on, exactly like the real seed.
  var LOCAL_CERTS_SEED = {
    'david-thunell': [['isa-bcma', 'earned'], ['isa-arborist', 'earned'], ['isa-climber', 'earned'], ['isa-traq', 'earned'], ['tcia-ctsp', 'earned'], ['utah-aoty', 'earned']],
    'gabriel-dye': [['isa-arborist', 'earned'], ['isa-traq', 'earned'], ['isa-climber', 'earned']],
    'trevor-stevens': [['isa-arborist', 'earned'], ['pesticide', 'earned']],
    'tyler-montoya': [['isa-arborist', 'earned'], ['isa-climber', 'earned'], ['emt', 'earned']],
    'cole-cook': [['isa-arborist', 'earned']],
    'ethan-risenmay': [['tca-ground', 'earned'], ['tca-chainsaw', 'earned'], ['isa-climber', 'in_progress']],
    'matthew-gil': [['isa-arborist', 'in_progress']]
  };

  var listeners = {};
  function emit(evt, data) { (listeners[evt] || []).slice().forEach(function (cb) { try { cb(data); } catch (e) { /* a bad listener never breaks the module */ } }); }

  // ---------------------------------------------------------------------- storage

  function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  function saveSession(s) { try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (e) { /* private mode etc. */ } }

  function loadLocalDb() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(LOCAL_DB_KEY) || 'null'); } catch (e) { /* ignore */ }
    if (!d || typeof d !== 'object') d = { people: {} };
    if (!d.people) d.people = {};
    return d;
  }
  function saveLocalDb(d) { try { localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function localPerson(db, id) {
    if (!db.people[id]) db.people[id] = { profile: {}, certs: {}, records: {}, last_sign_in: null, certsSeeded: false };
    return db.people[id];
  }

  function getAppSecret() { try { return localStorage.getItem(APP_SECRET_KEY) || ''; } catch (e) { return ''; } }

  var state = { config: null, session: loadSession(), readyPromise: null };
  var meCache = {}; // { [area]: {itemId: {state,ts,note,by_person_id,by_role}} } — for the CURRENT person only

  // ---------------------------------------------------------------------- config + ready()

  function fetchConfig() {
    return fetch(CONFIG_URL, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('crew-api.json: HTTP ' + r.status);
      return r.json();
    }).then(function (cfg) {
      try { localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
      return cfg;
    }).catch(function () {
      var cached = null;
      try { cached = JSON.parse(localStorage.getItem(CONFIG_CACHE_KEY) || 'null'); } catch (e) { /* ignore */ }
      return cached || { url: null };
    });
  }

  function ready() {
    if (state.readyPromise) return state.readyPromise;
    state.readyPromise = fetchConfig().then(function (cfg) { state.config = cfg && typeof cfg === 'object' ? cfg : { url: null }; return null; });
    return state.readyPromise;
  }

  function configured() { return !!(state.config && state.config.url); }

  // ---------------------------------------------------------------------- transport (remote)

  function apiPost(action, fields, needsToken) {
    var payload = Object.assign({ action: action, app_secret: getAppSecret() }, fields || {});
    if (needsToken) {
      if (!state.session || !state.session.token) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      payload.token = state.session.token;
    }
    return fetch(state.config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res && res.token_refreshed && state.session) {
        state.session.token = res.token_refreshed;
        saveSession(state.session);
      }
      if (!res || res.ok !== true) {
        var e = new Error((res && res.message) || 'Request failed');
        e.error = res && res.error;
        e.message = (res && res.message) || 'Request failed';
        throw e;
      }
      return res;
    });
  }

  // ---------------------------------------------------------------------- people (local sign-in roster)

  function people() { return (window.TTC_PEOPLE || []).slice(); }
  function findPersonByEmail(email) {
    email = (email || '').trim().toLowerCase();
    var all = people();
    for (var i = 0; i < all.length; i++) if ((all[i].email || '').toLowerCase() === email) return all[i];
    return null;
  }
  function findPersonById(id) {
    var all = people();
    for (var i = 0; i < all.length; i++) if (all[i].person_id === id) return all[i];
    return null;
  }

  // ---------------------------------------------------------------------- identity

  function person() { return state.session ? state.session.person : null; }
  function role() { var p = person(); return p ? p.role : null; }
  function can(cap) { var r = role(); return !!(r && ROLE_CAPS[r] && ROLE_CAPS[r][cap]); }

  function completeSignIn(mode, p, token) {
    state.session = { mode: mode, token: token, person: { id: p.id, name: p.name, email: p.email || '', role: p.role, test: !!p.test } };
    saveSession(state.session);
    if (mode === 'local') {
      var db = loadLocalDb();
      var lp = localPerson(db, p.id);
      lp.last_sign_in = Date.now();
      saveLocalDb(db);
    }
    meCache = {};
    emit('signin', state.session.person);
  }

  function signIn(email) {
    return ready().then(function () {
      if (configured()) {
        return apiPost('signin_start', { email: email }).then(function () {
          state.session = { mode: 'remote', pendingEmail: email };
          saveSession(state.session);
          return { sent: true };
        });
      }
      var p = findPersonByEmail(email);
      if (!p) return Promise.reject({ error: 'unknown_person', message: "That email isn't on this device's roster." });
      state.session = { mode: 'local', pendingPersonId: p.person_id };
      saveSession(state.session);
      return { sent: true, local: true };
    });
  }

  function verifyCode(code) {
    return ready().then(function () {
      if (configured()) {
        var email = state.session && state.session.pendingEmail;
        if (!email) return Promise.reject({ error: 'bad_request', message: 'Start sign-in first.' });
        return apiPost('signin_verify', { email: email, code: code }).then(function (res) {
          completeSignIn('remote', { id: res.person.id, name: res.person.name, role: res.person.role, email: email }, res.token);
          return { ok: true, person: person() };
        });
      }
      var pid = state.session && state.session.pendingPersonId;
      if (!pid) return Promise.reject({ error: 'bad_request', message: 'Pick yourself from the list first.' });
      var p = findPersonById(pid);
      if (!p) return Promise.reject({ error: 'unknown_person', message: 'Unknown person.' });
      completeSignIn('local', { id: p.person_id, name: p.display_name, role: p.role, email: p.email, test: !!p.test }, 'local-' + p.person_id);
      return { ok: true, person: person() };
    });
  }

  // Local-only convenience: skip the code step entirely, per Joseph's "you pick yourself" sign-in.
  function signInAs(personId) {
    return ready().then(function () {
      if (configured()) return Promise.reject({ error: 'forbidden', message: 'Sign in with email + code — the backend is live.' });
      var p = findPersonById(personId);
      if (!p) return Promise.reject({ error: 'unknown_person', message: 'Unknown person.' });
      completeSignIn('local', { id: p.person_id, name: p.display_name, role: p.role, email: p.email, test: !!p.test }, 'local-' + p.person_id);
      return { ok: true, person: person() };
    });
  }

  function signOut() {
    var p = state.session && state.session.person;
    state.session = null;
    saveSession(null);
    meCache = {};
    emit('signout', p);
  }

  // ---------------------------------------------------------------------- passoff helpers (shared local math)

  function flattenPassoffCatalog() {
    var D = window.TTC_PASSOFF, out = {};
    if (!D) return out;
    (D.levels || []).forEach(function (L) {
      (L.sections || []).forEach(function (S) {
        (S.items || []).forEach(function (it) { out[it.id] = { label: it.text, level: L.title, levelId: L.id, section: S.title, sectionId: S.id }; });
      });
      if (L.signoff && L.signoff.items) {
        L.signoff.items.forEach(function (it) { out[it.id] = { label: it.text, level: L.title, levelId: L.id, section: L.signoff.title || 'Sign-off', sectionId: L.id + '-signoff' }; });
      }
    });
    return out;
  }

  function passoffLevelsFlat() {
    var D = window.TTC_PASSOFF;
    if (!D) return [];
    return (D.levels || []).map(function (L) {
      var items = [];
      (L.sections || []).forEach(function (S) { (S.items || []).forEach(function (it) { items.push(it.id); }); });
      if (L.signoff && L.signoff.items) L.signoff.items.forEach(function (it) { items.push(it.id); });
      return { id: L.id, title: L.title, order: L.order != null ? L.order : 0, items: items };
    }).sort(function (a, b) { return a.order - b.order; });
  }

  function computePassoffStats(personId) {
    var levels = passoffLevelsFlat();
    var db = loadLocalDb(), lp = localPerson(db, personId);
    var stateByItem = (lp.records && lp.records.passoff) || {};
    var total = 0, verified = 0, claimed = 0, standingLevel = null;
    levels.forEach(function (L) {
      var allVerified = L.items.length > 0;
      L.items.forEach(function (id) {
        total++;
        var st = stateByItem[id] && stateByItem[id].state;
        if (st === 'verified') verified++; else if (st === 'claimed') claimed++;
        if (st !== 'verified') allVerified = false;
      });
      if (!allVerified && standingLevel === null) standingLevel = L.title;
    });
    if (standingLevel === null && levels.length) standingLevel = levels[levels.length - 1].title;
    return { verified: verified, claimed: claimed, total: total, level: standingLevel };
  }

  // The per-GATE view: never a document-wide denominator. "Tier 2 — 18 of 24", the next unfinished
  // section within that tier, and how many items stand between here and that tier's own sign-off.
  function computeCurrentLevel(recordsMap) {
    recordsMap = recordsMap || {};
    var D = window.TTC_PASSOFF;
    if (!D) return null;
    var levels = passoffLevelsFlat();
    var byId = {}; (D.levels || []).forEach(function (L) { byId[L.id] = L; });
    for (var i = 0; i < levels.length; i++) {
      var L = levels[i], full = byId[L.id] || {};
      var v = 0, total = L.items.length;
      L.items.forEach(function (id) { if (recordsMap[id] && recordsMap[id].state === 'verified') v++; });
      if (v < total || total === 0) {
        var nextSection = null;
        (full.sections || []).some(function (S) {
          var items = S.items || [];
          var sv = 0; items.forEach(function (it) { if (recordsMap[it.id] && recordsMap[it.id].state === 'verified') sv++; });
          if (sv < items.length) { nextSection = { id: S.id, title: S.title, verified: sv, total: items.length }; return true; }
          return false;
        });
        return {
          id: L.id, title: L.title, kind: full.kind || 'tier', purpose: full.purpose || '',
          verified: v, total: total, remaining: total - v, nextSection: nextSection, allDone: false,
          order: i, isLast: i === levels.length - 1
        };
      }
    }
    var last = levels[levels.length - 1];
    if (!last) return null;
    var lastFull = byId[last.id] || {};
    return { id: last.id, title: last.title, kind: lastFull.kind || 'tier', purpose: lastFull.purpose || '',
      verified: last.items.length, total: last.items.length, remaining: 0, nextSection: null, allDone: true,
      order: levels.length - 1, isLast: true };
  }

  // Raw per-item passoff records for ANY person (self or, for a trainer/office viewer, someone else),
  // local or remote — the one place both the profile page and the pass-off page get "what state is
  // item X in for person Y" without duplicating the local/remote branch everywhere.
  function passoffRecordsFor(pid) {
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      if (!configured()) {
        var db = loadLocalDb();
        return (localPerson(db, pid).records || {}).passoff || {};
      }
      if (pid === self.id) return apiPost('me', { area: 'passoff' }, true).then(function (r) { return (r.records && r.records.passoff) || {}; });
      if (!can('see_everyone')) return Promise.reject({ error: 'forbidden', message: 'You may only view your own records.' });
      return apiPost('person', { person_id: pid, area: 'passoff' }, true).then(function (r) { return (r.records && r.records.passoff) || {}; });
    });
  }

  function passoffCurrentLevel(pid) {
    return passoffRecordsFor(pid).then(function (recMap) { return computeCurrentLevel(recMap); });
  }

  function countOwnClaimed(personId) {
    var db = loadLocalDb(), lp = localPerson(db, personId);
    var recs = (lp.records && lp.records.passoff) || {};
    var count = 0, oldestTs = null;
    Object.keys(recs).forEach(function (id) {
      var r = recs[id];
      if (r.state === 'claimed') { count++; if (oldestTs === null || r.ts < oldestTs) oldestTs = r.ts; }
    });
    return { count: count, oldestTs: oldestTs, oldestDays: oldestTs != null ? Math.floor((Date.now() - oldestTs) / 86400000) : null };
  }

  // ---------------------------------------------------------------------- profile

  function profileGet(id) {
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      var pid = id || self.id;
      var basePromise;
      if (configured()) {
        basePromise = apiPost('profile_get', pid !== self.id ? { person_id: pid } : {}, true);
      } else {
        if (pid !== self.id && !can('see_everyone')) { basePromise = Promise.reject({ error: 'forbidden', message: 'You may only view your own profile.' }); }
        else {
          var roster = findPersonById(pid);
          if (!roster) { basePromise = Promise.reject({ error: 'unknown_person', message: 'Unknown person.' }); }
          else {
            var db = loadLocalDb(), lp = localPerson(db, pid);
            var passoff = computePassoffStats(pid);
            var claimed = countOwnClaimed(pid);
            basePromise = Promise.resolve({
              ok: true,
              person: { id: roster.person_id, name: roster.display_name, email: roster.email, role: roster.role, active: true, test: !!roster.test },
              profile: Object.assign({ preferred_name: '', about: '', certifications: '', phone_optional: '', photo: '', updated_at: null }, lp.profile || {}),
              stats: { passoff: passoff, items_waiting_review: claimed.count, last_sign_in: lp.last_sign_in || null },
              server_time: Date.now()
            });
          }
        }
      }
      // Attach the per-gate ("Tier 2 — 18 of 24") view alongside whatever document-wide numbers the
      // backend contract returns — a page renders the per-gate object, never stats.passoff.total.
      return basePromise.then(function (res) {
        return passoffCurrentLevel(pid).then(function (cl) { res.stats.passoff.currentLevel = cl; return res; })
          .catch(function () { res.stats.passoff.currentLevel = null; return res; });
      });
    });
  }

  function profileSet(fields) {
    fields = fields || {};
    for (var i = 0; i < PROFILE_FORBIDDEN.length; i++) {
      if (Object.prototype.hasOwnProperty.call(fields, PROFILE_FORBIDDEN[i])) {
        return Promise.reject({ error: 'forbidden', message: '"' + PROFILE_FORBIDDEN[i] + '" cannot be changed from a profile edit.' });
      }
    }
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      if (configured()) return apiPost('profile_set', fields, true);
      var db = loadLocalDb(), lp = localPerson(db, self.id);
      lp.profile = lp.profile || {};
      ['preferred_name', 'about', 'certifications', 'phone_optional', 'photo'].forEach(function (k) {
        if (fields[k] == null) return;
        var v = String(fields[k]).replace(/[\x00-\x1F\x7F]/g, '');
        if (k !== 'photo') { v = v.trim(); var lim = PROFILE_LIMITS[k]; if (lim && v.length > lim) v = v.slice(0, lim); }
        lp.profile[k] = v;
      });
      lp.profile.updated_at = new Date().toISOString();
      saveLocalDb(db);
      return { ok: true, profile: lp.profile, server_time: Date.now() };
    });
  }

  // ---------------------------------------------------------------------- certifications (badges)

  function ensureLocalCertsSeed(personId) {
    var db = loadLocalDb(), lp = localPerson(db, personId);
    if (lp.certsSeeded) return;
    lp.certs = lp.certs || {};
    (LOCAL_CERTS_SEED[personId] || []).forEach(function (pair) {
      var badgeId = pair[0], st = pair[1];
      if (!lp.certs[badgeId]) {
        lp.certs[badgeId] = {
          state: st, earned_on: null, expires_on: null, verification: 'needs-confirmation',
          note: 'Seeded from the company website bio, 2026-09-22 — confirm the date.',
          updated_at: new Date().toISOString(), by_person_id: personId, by_role: 'system'
        };
      }
    });
    lp.certsSeeded = true;
    saveLocalDb(db);
  }

  function localCertsGet(pid) {
    ensureLocalCertsSeed(pid);
    var db = loadLocalDb(), lp = localPerson(db, pid);
    var items = Object.keys(lp.certs || {}).map(function (bid) { return Object.assign({ badge_id: bid }, lp.certs[bid]); });
    return { ok: true, items: items, server_time: Date.now() };
  }

  function certsGet(id) {
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      var pid = id || self.id;
      if (pid !== self.id && !can('see_everyone')) return Promise.reject({ error: 'forbidden', message: 'You may only view your own badges.' });
      if (configured()) {
        return apiPost('certs_get', pid !== self.id ? { person_id: pid } : {}, true).catch(function () { return localCertsGet(pid); });
      }
      return localCertsGet(pid);
    });
  }

  function localCertsSet(targetId, payload, actor) {
    var db = loadLocalDb(), lp = localPerson(db, targetId);
    lp.certs = lp.certs || {};
    var prev = lp.certs[payload.badge_id] || {};
    lp.certs[payload.badge_id] = Object.assign({}, prev, payload, { updated_at: new Date().toISOString(), by_person_id: actor.id, by_role: actor.role });
    saveLocalDb(db);
    return { ok: true, item: Object.assign({ badge_id: payload.badge_id }, lp.certs[payload.badge_id]), server_time: Date.now() };
  }

  // certsSet(badgeId, {state, earned_on?, expires_on?, note?}, forPersonId?)
  // A person may mark their OWN badge earned/in_progress — it always lands needs-confirmation, never
  // confirmed, no matter what the caller passes. Only verify_others may confirm, and only for someone
  // else (or for themselves acting in a trainer capacity is still "self", so still needs-confirmation —
  // nobody confirms their own badge).
  function certsSet(badgeId, fields, forPersonId) {
    fields = fields || {};
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      var targetId = forPersonId || self.id;
      var isSelf = targetId === self.id;
      if (!isSelf && !can('verify_others')) return Promise.reject({ error: 'forbidden', message: "Only a trainer or office can confirm someone else's badge." });
      var payload = {
        badge_id: badgeId,
        state: fields.state,
        earned_on: fields.earned_on || null,
        expires_on: fields.expires_on || null,
        note: fields.note || '',
        verification: isSelf ? 'needs-confirmation' : 'confirmed'
      };
      if (configured()) {
        var body = Object.assign({}, payload, targetId !== self.id ? { person_id: targetId } : {});
        return apiPost('certs_set', body, true).catch(function () { return localCertsSet(targetId, payload, self); });
      }
      return localCertsSet(targetId, payload, self);
    });
  }

  // ---------------------------------------------------------------------- expiring certifications (team overview panel)

  function badgeCatalogById(id) {
    var out = null;
    (window.TTC_CERTS && window.TTC_CERTS.groups || []).forEach(function (g) { g.badges.forEach(function (b) { if (b.id === id) out = b; }); });
    return out;
  }
  function badgeExpiryInfo(badge, row) {
    if (!row) return null;
    var dateStr = row.expires_on;
    if (!dateStr && row.earned_on && badge.renews) {
      var d = new Date(row.earned_on + 'T00:00:00');
      if (!isNaN(d)) { d.setFullYear(d.getFullYear() + badge.renews); dateStr = d.toISOString().slice(0, 10); }
    }
    if (!dateStr) return null;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var exp = new Date(dateStr + 'T00:00:00');
    var days = Math.round((exp - now) / 86400000);
    return { date: dateStr, days: days };
  }

  // Every certification lapsing within 90 days, or already lapsed, across the whole roster — the
  // report the office actually needs, surfaced once instead of found one profile at a time.
  var CERTS_EXPIRING_WINDOW_DAYS = 90;
  function certsExpiring() {
    return ready().then(function () {
      if (!can('see_everyone')) return Promise.reject({ error: 'forbidden', message: 'This page is for David and the office.' });
      var roster = people().filter(function (p) { return !p.test; });
      var out = [];
      function fromRows(p, rows) {
        rows.forEach(function (row) {
          var badge = badgeCatalogById(row.badge_id); if (!badge) return;
          var info = badgeExpiryInfo(badge, row);
          if (info && info.days <= CERTS_EXPIRING_WINDOW_DAYS) out.push({ person_id: p.person_id, name: p.display_name, badge_id: row.badge_id, badge_name: badge.name, tier: badge.tier, expires_on: info.date, days: info.days });
        });
      }
      if (!configured()) {
        roster.forEach(function (p) { fromRows(p, localCertsGet(p.person_id).items); });
        out.sort(function (a, b) { return a.days - b.days; });
        return { ok: true, items: out, server_time: Date.now() };
      }
      return Promise.all(roster.map(function (p) { return certsGet(p.person_id).then(function (res) { fromRows(p, res.items || []); }).catch(function () {}); }))
        .then(function () { out.sort(function (a, b) { return a.days - b.days; }); return { ok: true, items: out, server_time: Date.now() }; });
    });
  }

  // ---------------------------------------------------------------------- insights (team overview)

  function insights() {
    return ready().then(function () {
      if (!can('see_everyone')) return Promise.reject({ error: 'forbidden', message: 'This page is for David and the office.' });
      if (configured()) return apiPost('insights', {}, true);
      var db = loadLocalDb();
      var out = people().filter(function (p) { return !p.test; }).map(function (p) {
        var passoff = computePassoffStats(p.person_id);
        var claimed = countOwnClaimed(p.person_id);
        var lp = db.people[p.person_id] || {};
        ensureLocalCertsSeed(p.person_id);
        var lp2 = localPerson(loadLocalDb(), p.person_id);
        var badgeEarned = 0, badgeTotal = 0;
        (window.TTC_CERTS && window.TTC_CERTS.groups || []).forEach(function (g) { g.badges.forEach(function (b) {
          badgeTotal++; if (lp2.certs && lp2.certs[b.id] && lp2.certs[b.id].state === 'earned') badgeEarned++;
        }); });
        var recMap = (lp.records && lp.records.passoff) || {};
        return {
          person_id: p.person_id, name: p.display_name, role: p.role, test: !!p.test,
          photo: (lp.profile && lp.profile.photo) || '',
          ever_signed_in: !!lp.last_sign_in, last_sign_in: lp.last_sign_in || null,
          passoff_verified: passoff.verified, passoff_total: passoff.total, level: passoff.level,
          currentLevel: computeCurrentLevel(recMap),
          badge_earned: badgeEarned, badge_total: badgeTotal,
          items_waiting_review: claimed.count, oldest_waiting_days: claimed.oldestDays
        };
      });
      out.sort(function (a, b) {
        var ad = a.oldest_waiting_days == null ? -1 : a.oldest_waiting_days;
        var bd = b.oldest_waiting_days == null ? -1 : b.oldest_waiting_days;
        return bd - ad;
      });
      return { ok: true, people: out, server_time: Date.now() };
    });
  }

  // ---------------------------------------------------------------------- review queue

  function reviewQueue() {
    return ready().then(function () {
      if (!can('verify_others')) return Promise.reject({ error: 'forbidden', message: 'This page is for David and the office.' });
      if (configured()) return apiPost('review_queue', {}, true);
      var db = loadLocalDb();
      var catalog = flattenPassoffCatalog();
      var out = [];
      people().filter(function (p) { return !p.test; }).forEach(function (p) {
        var lp = db.people[p.person_id];
        if (!lp || !lp.records || !lp.records.passoff) return;
        Object.keys(lp.records.passoff).forEach(function (itemId) {
          var r = lp.records.passoff[itemId];
          if (r.state !== 'claimed') return;
          var cat = catalog[itemId] || {};
          out.push({
            person_id: p.person_id, person_name: p.display_name, display_name: p.display_name,
            area: 'passoff', item_id: itemId, item_label: cat.label || itemId, level: cat.level || '', section: cat.section || '',
            note: r.note || '', ts: r.ts, since: r.ts, claimed_at: r.ts
          });
        });
      });
      out.sort(function (a, b) { return b.ts - a.ts; });
      return { ok: true, items: out, server_time: Date.now() };
    });
  }

  // ---------------------------------------------------------------------- record writes

  function localRecordBatch(items, actor) {
    var db = loadLocalDb();
    var written = 0, records = {};
    items.forEach(function (it) {
      var pid = it.person_id, area = it.area || 'passoff';
      var lp = localPerson(db, pid);
      lp.records = lp.records || {}; lp.records[area] = lp.records[area] || {};
      var ts = it.ts != null ? Number(it.ts) : Date.now();
      var cur = lp.records[area][it.item_id];
      if (cur && cur.ts > ts) return; // never let an older tap stomp a newer state — same rule as the server
      lp.records[area][it.item_id] = { state: it.state, ts: ts, note: it.note != null ? it.note : '', by_person_id: actor.id, by_role: actor.role };
      written++;
      records[pid] = records[pid] || {}; records[pid][area] = records[pid][area] || {};
      records[pid][area][it.item_id] = lp.records[area][it.item_id];
    });
    saveLocalDb(db);
    return { ok: true, written: written, records: records, server_time: Date.now() };
  }

  // recordBatch(items): items = [{person_id, area, item_id, item_label?, state, note?, ts?}, ...]
  // Mirrors the backend's `record_batch` action exactly — one call, many people, many areas.
  function recordBatch(items) {
    items = items || [];
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (self.role === 'crew') {
          if (it.person_id !== self.id) return Promise.reject({ error: 'forbidden', message: "crew may not batch-verify another person's item." });
          if (it.state !== 'claimed') return Promise.reject({ error: 'forbidden', message: 'crew may only set state to claimed.' });
        }
      }
      if (configured()) return apiPost('record_batch', { items: items }, true);
      return localRecordBatch(items, self);
    });
  }

  // recordSet(area, item, forPersonId?): the single-item convenience the pass-off page uses for a
  // person's own tap (claim / undo / verify / send back on themselves). Thin wrapper over recordBatch.
  function recordSet(area, item, forPersonId) {
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      var pid = forPersonId || self.id;
      var payload = [{ person_id: pid, area: area, item_id: item.item_id, item_label: item.item_label || '', state: item.state, note: item.note || '', ts: item.ts }];
      return recordBatch(payload).then(function (res) {
        if (pid === self.id) meCache[area] = (res.records && res.records[pid] && res.records[pid][area]) || meCache[area];
        return res;
      });
    });
  }

  // ---------------------------------------------------------------------- "me" cache (sync reads for render)

  function records(area) { return meCache[area] || {}; }

  function loadRecords(area) {
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      if (configured()) {
        return apiPost('me', { area: area }, true).then(function (res) {
          meCache[area] = (res.records && res.records[area]) || {};
          return meCache[area];
        });
      }
      var db = loadLocalDb(), lp = localPerson(db, self.id);
      meCache[area] = (lp.records && lp.records[area]) || {};
      return meCache[area];
    });
  }

  // ---------------------------------------------------------------------- events

  function on(evt, cb) { listeners[evt] = listeners[evt] || []; listeners[evt].push(cb); }

  // ---------------------------------------------------------------------- export

  window.TTCRecords = {
    ready: ready,
    configured: configured,
    people: people,
    signIn: signIn, verifyCode: verifyCode, signInAs: signInAs, signOut: signOut,
    person: person, role: role, can: can,
    profileGet: profileGet, profileSet: profileSet,
    certsGet: certsGet, certsSet: certsSet, certsExpiring: certsExpiring,
    insights: insights, reviewQueue: reviewQueue,
    recordBatch: recordBatch, recordSet: recordSet,
    records: records, loadRecords: loadRecords,
    passoffCurrentLevel: passoffCurrentLevel, passoffRecordsFor: passoffRecordsFor,
    passoffLevelsFlat: passoffLevelsFlat, passoffCatalog: flattenPassoffCatalog,
    on: on
  };
})();
