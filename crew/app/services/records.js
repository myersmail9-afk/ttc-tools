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
// Backend shapes match backend/_API-CONTRACT.md + backend/apps-script/Code.gs (2026-09-22, v5.1.0).
// v5 adds a tiny `sync_head` action. Visible pages poll only its opaque revision every three seconds;
// real page data is fetched only when that marker changes. Hidden tabs pause and refresh on return.
(function () {
  'use strict';

  // auth-gate.js may load this file before a page's legacy footer include reaches it. Keep the
  // second include inert so it cannot replace the live session, listeners, caches, or sync loop.
  if (window.TTCRecords) return;

  var SELF_SRC = document.currentScript && document.currentScript.src;
  var CONFIG_URL = SELF_SRC ? new URL('../crew-api.json', SELF_SRC).href : '../crew-api.json';
  var CONFIG_CACHE_KEY = 'ttc-crew-api-config:v1';
  var SESSION_KEY = 'ttc-crew-session:v1';
  var LOCAL_DB_KEY = 'ttc-crew-local-db:v1';
  var SYNC_META_KEY = 'ttc-crew-sync-meta:v1';
  var SYNC_POLL_MS = 3000;
  var SYNC_MAX_BACKOFF_MS = 30000;

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

  function loadSyncMeta() {
    try { return JSON.parse(localStorage.getItem(SYNC_META_KEY) || 'null') || {}; } catch (e) { return {}; }
  }
  function saveSyncMeta(meta) {
    try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta)); } catch (e) { /* private mode etc. */ }
  }

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

  var state = { config: null, session: loadSession(), readyPromise: null };
  var meCache = {}; // { [area]: {itemId: {state,ts,note,by_person_id,by_role}} } — for the CURRENT person only
  var savedSyncMeta = loadSyncMeta();
  var sync = {
    status: 'local', lastSuccess: savedSyncMeta.lastSuccess || null, lastError: null,
    activeWrites: 0, lastRevision: null, watchers: [], timer: null, headInFlight: null,
    backoffMs: SYNC_POLL_MS, wakeAt: 0, queuedAfterWrite: false
  };

  function syncSnapshot() {
    return {
      status: sync.status, lastSuccess: sync.lastSuccess, lastError: sync.lastError,
      activeWrites: sync.activeWrites, configured: configured()
    };
  }

  function setSyncStatus(status, err, quiet) {
    var changed = sync.status !== status || (!!err && err !== sync.lastError);
    sync.status = status;
    sync.lastError = err || null;
    if (status === 'synced') {
      // A healthy head poll happens every three seconds. Keep the timestamp useful without
      // rewriting localStorage on every heartbeat (which is especially wasteful on phones).
      if (!sync.lastSuccess || !quiet || (Date.now() - sync.lastSuccess) >= 15000) {
        sync.lastSuccess = Date.now();
        saveSyncMeta({ lastSuccess: sync.lastSuccess });
      }
    }
    if (!quiet || changed) emit('syncstate', syncSnapshot());
  }

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
    state.readyPromise = fetchConfig().then(function (cfg) {
      state.config = cfg && typeof cfg === 'object' ? cfg : { url: null };
      // First live launch migration: demo mode stored `local-*` tokens that are deliberately not
      // valid server credentials. Do not let an old device present one to the new backend and get
      // stranded on "Malformed token." Keep its local demo records intact, but discard the obsolete
      // demo identity so every former tester lands on the real email-code sign-in screen once.
      if (configured() && state.session &&
          (state.session.mode !== 'remote' || /^local-/.test(String(state.session.token || '')))) {
        var stalePerson = state.session.person || null;
        state.session = null;
        saveSession(null);
        meCache = {};
        emit('signout', stalePerson);
      }
      setSyncStatus(configured() ? 'idle' : 'local', null, false);
      return null;
    });
    return state.readyPromise;
  }

  function configured() { return !!(state.config && state.config.url); }

  // ---------------------------------------------------------------------- transport (remote)

  var WRITE_ACTIONS = ['record', 'record_batch', 'set_catalog', 'people_admin', 'profile_set', 'certs_set'];

  function beginWrite() {
    sync.activeWrites++;
    setSyncStatus('saving', null, false);
  }

  function endWrite(ok, err) {
    sync.activeWrites = Math.max(0, sync.activeWrites - 1);
    if (ok) setSyncStatus('synced', null, false);
    else setSyncStatus((typeof navigator !== 'undefined' && navigator.onLine === false) ? 'offline' : 'error', err && (err.message || String(err)), false);
    if (sync.activeWrites === 0 && sync.queuedAfterWrite) {
      sync.queuedAfterWrite = false;
      refreshAllWatchers('after-write');
    }
  }

  function apiPost(action, fields, needsToken) {
    var isWrite = WRITE_ACTIONS.indexOf(action) !== -1;
    var payload = Object.assign({ action: action }, fields || {});
    if (needsToken) {
      if (!state.session || !state.session.token) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      payload.token = state.session.token;
    }
    if (isWrite) beginWrite();
    var request = fetch(state.config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (res) {
      // Do not apply a late refresh to a session that was signed out or replaced while this request
      // was in flight. The request token identifies the exact session the response belongs to.
      var storedForRefresh = res && res.token_refreshed ? loadSession() : null;
      if (res && res.token_refreshed && state.session && state.session.token === payload.token &&
          storedForRefresh && storedForRefresh.token === payload.token &&
          storedForRefresh.person && state.session.person && storedForRefresh.person.id === state.session.person.id) {
        state.session.token = res.token_refreshed;
        saveSession(state.session);
      }
      if (!res || res.ok !== true) {
        var e = new Error((res && res.message) || 'Request failed');
        e.error = res && res.error;
        e.message = (res && res.message) || 'Request failed';
        throw e;
      }
      // Do not advance the client's observed head from a write response. A concurrent write from
      // another device may have landed just before this one; the next head check must still trigger a
      // complete page refresh so that earlier change cannot be hidden behind our newer revision.
      if (!isWrite && action !== 'sync_head') setSyncStatus('synced', null, true);
      return res;
    });
    if (!isWrite) {
      return request.catch(function (err) {
        setSyncStatus((typeof navigator !== 'undefined' && navigator.onLine === false) ? 'offline' : 'error', err && (err.message || String(err)), false);
        throw err;
      });
    }
    return request.then(function (res) {
      endWrite(true, null);
      return res;
    }, function (err) {
      endWrite(false, err);
      throw err;
    });
  }

  // ---------------------------------------------------------------------- visible-page auto-sync

  function stablePayload(value) {
    if (Array.isArray(value)) return value.map(stablePayload);
    if (!value || typeof value !== 'object') return value;
    var out = {};
    Object.keys(value).sort().forEach(function (key) {
      if (key === 'server_time' || key === 'token_refreshed' || key === 'expires' || key === 'sync_revision') return;
      out[key] = stablePayload(value[key]);
    });
    return out;
  }

  function fingerprint(value) {
    try { return JSON.stringify(stablePayload(value)); } catch (e) { return String(Date.now()); }
  }

  function runWatcher(watcher, reason) {
    if (!watcher || watcher.stopped) return Promise.resolve(null);
    if (sync.activeWrites > 0) {
      watcher.queued = true;
      sync.queuedAfterWrite = true;
      return Promise.resolve(null);
    }
    if (watcher.inFlight) {
      watcher.queued = true;
      return watcher.inFlight;
    }
    watcher.queued = false;
    var p;
    try { p = Promise.resolve(watcher.loader(reason)); }
    catch (err) { p = Promise.reject(err); }
    watcher.inFlight = p.then(function (data) {
      var nextFingerprint = (watcher.options.fingerprint || fingerprint)(data);
      var changed = watcher.lastFingerprint === null || watcher.lastFingerprint !== nextFingerprint;
      watcher.needsRetry = false;
      watcher.lastFingerprint = nextFingerprint;
      if (changed && watcher.apply) watcher.apply(data, { reason: reason });
      if (changed) emit('data', { key: watcher.key, reason: reason, data: data, ts: Date.now() });
      return data;
    }).then(function (data) {
      watcher.inFlight = null;
      if (watcher.queued) runWatcher(watcher, 'queued');
      return data;
    }, function (err) {
      watcher.inFlight = null;
      watcher.needsRetry = true;
      if (watcher.options.onError) {
        try { watcher.options.onError(err, { reason: reason }); } catch (e) { /* listener isolation */ }
      }
      if (watcher.queued) runWatcher(watcher, 'queued');
      return null;
    });
    return watcher.inFlight;
  }

  function refreshAllWatchers(reason) {
    if (!configured() || !person()) return Promise.resolve([]);
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && reason === 'remote-change') return Promise.resolve([]);
    return Promise.all(sync.watchers.slice().map(function (watcher) { return runWatcher(watcher, reason); }));
  }

  function scheduleHeadPoll(delay) {
    if (sync.timer) clearTimeout(sync.timer);
    sync.timer = setTimeout(pollHead, delay == null ? SYNC_POLL_MS : delay);
  }

  function pollHead() {
    sync.timer = null;
    if (!sync.watchers.length || !configured() || !person()) return;
    if ((typeof document !== 'undefined' && document.visibilityState === 'hidden') || sync.activeWrites > 0) {
      scheduleHeadPoll(sync.activeWrites > 0 ? 500 : SYNC_POLL_MS);
      return;
    }
    if (sync.headInFlight) { scheduleHeadPoll(500); return; }
    sync.headInFlight = apiPost('sync_head', {}, true).then(function (res) {
      var revision = String(res.revision || '0');
      // Treat the first successful head as a change too. That one conservative refresh closes the
      // tiny race between the page's initial read and its first heartbeat; later polls stay head-only.
      var changed = sync.lastRevision === null || revision !== sync.lastRevision;
      sync.lastRevision = revision;
      sync.backoffMs = SYNC_POLL_MS;
      setSyncStatus('synced', null, true);
      var needsRetry = sync.watchers.some(function (watcher) { return watcher.needsRetry; });
      if (changed || needsRetry) return refreshAllWatchers(changed ? 'remote-change' : 'retry');
      return null;
    }).then(function () {
      sync.headInFlight = null;
      scheduleHeadPoll(SYNC_POLL_MS);
    }, function () {
      sync.headInFlight = null;
      sync.backoffMs = Math.min(SYNC_MAX_BACKOFF_MS, Math.max(SYNC_POLL_MS, sync.backoffMs * 2));
      scheduleHeadPoll(sync.backoffMs);
    });
  }

  function wakeSync(reason) {
    if (!configured() || !person()) return;
    var now = Date.now();
    if ((now - sync.wakeAt) < 1200) return;
    sync.wakeAt = now;
    // Check the cheap marker first. The page data is fetched only if something actually changed
    // while this tab was hidden or another app had focus.
    scheduleHeadPoll(0);
  }

  function watchVisible(key, loader, apply, options) {
    options = options || {};
    var watcher = { key: key, loader: loader, apply: apply, options: options, lastFingerprint: null, inFlight: null, queued: false, needsRetry: false, stopped: false };
    sync.watchers.push(watcher);
    if (configured() && person()) {
      if (options.initial !== false) runWatcher(watcher, 'initial');
      scheduleHeadPoll(0);
    }
    return function () {
      watcher.stopped = true;
      var idx = sync.watchers.indexOf(watcher);
      if (idx !== -1) sync.watchers.splice(idx, 1);
      if (!sync.watchers.length && sync.timer) { clearTimeout(sync.timer); sync.timer = null; }
    };
  }

  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') wakeSync('visible');
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', function () { wakeSync('focus'); });
    window.addEventListener('pageshow', function () { wakeSync('pageshow'); });
    window.addEventListener('online', function () { wakeSync('online'); });
    window.addEventListener('offline', function () { setSyncStatus('offline', 'No network connection.', false); });
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

  // The app entrance gate uses the cheapest authenticated endpoint to prove that a saved remote
  // token is still accepted. A configured backend is mandatory here: local demo identities are
  // useful in development screens, but are never authorization for the published app gate.
  function requireSession() {
    return ready().then(function () {
      // localStorage is authoritative across tabs. Re-read it for every gate validation rather than
      // trusting the in-memory snapshot created when this script first ran.
      state.session = loadSession();
      if (!configured()) {
        var configError = new Error('TTC Crew sign-in is not configured.');
        configError.error = 'not_configured';
        throw configError;
      }
      if (!state.session || state.session.mode !== 'remote' || !state.session.token || !state.session.person) {
        var sessionError = new Error('Please sign in to TTC Crew.');
        sessionError.error = 'not_signed_in';
        throw sessionError;
      }
      var checkedToken = state.session.token;
      var checkedPersonId = state.session.person.id;
      return apiPost('profile_get', {}, true).then(function (res) {
        // A sign-out or account switch may happen while profile_get is in flight. Never let that
        // older response restore the former identity or its refreshed token.
        var persisted = loadSession();
        var acceptedToken = res && res.token_refreshed ? res.token_refreshed : checkedToken;
        if (!persisted || persisted.mode !== 'remote' || persisted.token !== acceptedToken ||
            !persisted.person || persisted.person.id !== checkedPersonId) {
          state.session = persisted;
          var changed = new Error('The sign-in changed while it was being checked.');
          changed.error = 'session_changed';
          throw changed;
        }
        // Refresh mutable roster facts on every entrance. In particular, a role change must take
        // effect before any page renders; authenticate_ also rejects people who are now inactive.
        var fresh = res && res.person;
        if (!fresh || !fresh.id || !fresh.role) {
          var invalid = new Error('The signed-in person could not be verified.');
          invalid.error = 'invalid_session';
          throw invalid;
        }
        var nextPerson = {
          id: fresh.id, name: fresh.name, role: fresh.role,
          email: fresh.email || persisted.person.email || '', test: !!fresh.test
        };
        state.session = persisted;
        if (JSON.stringify(state.session.person) !== JSON.stringify(nextPerson)) {
          state.session.person = nextPerson;
          saveSession(state.session);
        }
        return state.session.person;
      });
    });
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
      // Status choices are a decision, not training work. They must never inflate a tier's
      // denominator or require a reviewer to mark mutually exclusive choices as complete.
      var options = L.signoff && L.signoff.items || [];
      var signoff = options.filter(function (it) { return /^(pass|ready\b)/i.test(it.text || ''); })[0] || options[0];
      return { id: L.id, title: L.title, order: L.order != null ? L.order : 0,
        items: items, signoffItemId: signoff ? signoff.id : null };
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
      if (L.signoffItemId && (!stateByItem[L.signoffItemId] || stateByItem[L.signoffItemId].state !== 'verified')) allVerified = false;
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
      var gatePassed = !L.signoffItemId || (recordsMap[L.signoffItemId] && recordsMap[L.signoffItemId].state === 'verified');
      if (v < total || total === 0 || !gatePassed) {
        var nextSection = null;
        (full.sections || []).some(function (S) {
          var items = S.items || [];
          var sv = 0; items.forEach(function (it) { if (recordsMap[it.id] && recordsMap[it.id].state === 'verified') sv++; });
          if (sv < items.length) { nextSection = { id: S.id, title: S.title, verified: sv, total: items.length }; return true; }
          return false;
        });
        return {
          id: L.id, title: L.title, kind: full.kind || 'tier', purpose: full.purpose || '',
          verified: v, total: total, remaining: total - v, nextSection: nextSection,
          waitingForSignoff: v === total && total > 0 && !gatePassed, allDone: false,
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
  function recordsFor(pid, area) {
    area = area || 'passoff';
    return ready().then(function () {
      var self = person(); if (!self) return Promise.reject({ error: 'not_signed_in', message: 'Not signed in.' });
      if (!configured()) {
        if (pid !== self.id && !can('see_everyone')) return Promise.reject({ error: 'forbidden', message: 'You may only view your own records.' });
        ensureFounderPassoff(pid);
        var db = loadLocalDb();
        return (localPerson(db, pid).records || {})[area] || {};
      }
      if (pid === self.id) return apiPost('me', { area: area }, true).then(function (r) { return (r.records && r.records[area]) || {}; });
      if (!can('see_everyone')) return Promise.reject({ error: 'forbidden', message: 'You may only view your own records.' });
      return apiPost('person', { person_id: pid, area: area }, true).then(function (r) { return (r.records && r.records[area]) || {}; });
    });
  }

  function passoffRecordsFor(pid) { return recordsFor(pid, 'passoff'); }

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

  // David wrote this standard and holds the authority it describes, so his own pass-off is a
  // founding record rather than something to work through. Seeded complete, attributed to him,
  // and only ever created once — if he later undoes an item, it stays undone.
  var PASSOFF_FOUNDER = 'david-thunell';
  function ensureFounderPassoff(personId) {
    if (personId !== PASSOFF_FOUNDER) return;
    var db = loadLocalDb(), lp = localPerson(db, personId);
    if (lp.passoffSeeded) return;
    var D = window.TTC_PASSOFF; if (!D) return;          // data not loaded yet; try again later
    lp.records = lp.records || {}; lp.records.passoff = lp.records.passoff || {};
    var ts = Date.now();
    (D.levels || []).forEach(function (L) {
      var ids = [];
      (L.sections || []).forEach(function (S) { (S.items || []).forEach(function (i) { ids.push(i.id); }); });
      if (L.signoff && L.signoff.items) L.signoff.items.forEach(function (i) { ids.push(i.id); });
      ids.forEach(function (id) {
        if (lp.records.passoff[id]) return;
        lp.records.passoff[id] = {
          state: 'verified', ts: ts, note: 'Authored this standard; qualified at Tier 3 with both specialty endorsements.',
          by_person_id: personId, by_role: 'office'
        };
      });
    });
    lp.passoffSeeded = true;
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
        return apiPost('certs_get', pid !== self.id ? { person_id: pid } : {}, true);
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
        return apiPost('certs_set', body, true);
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
        ensureFounderPassoff(p.person_id);
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
        // MERGE, never replace. A write response carries only the items in that batch, so assigning
        // it over meCache would wipe the state of every item not in this call — which looked, on the
        // page, like only one item could ever be marked done at a time (2026-09-22).
        if (pid === self.id) {
          var fresh = res.records && res.records[pid] && res.records[pid][area];
          if (fresh) {
            meCache[area] = meCache[area] || {};
            for (var k in fresh) { if (Object.prototype.hasOwnProperty.call(fresh, k)) meCache[area][k] = fresh[k]; }
          }
        }
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
      ensureFounderPassoff(self.id);
      var db = loadLocalDb(), lp = localPerson(db, self.id);
      meCache[area] = (lp.records && lp.records[area]) || {};
      return meCache[area];
    });
  }

  // ---------------------------------------------------------------------- events

  function on(evt, cb) {
    listeners[evt] = listeners[evt] || [];
    listeners[evt].push(cb);
    return function () {
      var list = listeners[evt] || [], idx = list.indexOf(cb);
      if (idx !== -1) list.splice(idx, 1);
    };
  }

  // ---------------------------------------------------------------------- export

  window.TTCRecords = {
    ready: ready,
    configured: configured,
    people: people,
    signIn: signIn, verifyCode: verifyCode, signInAs: signInAs, signOut: signOut, requireSession: requireSession,
    person: person, role: role, can: can,
    profileGet: profileGet, profileSet: profileSet,
    certsGet: certsGet, certsSet: certsSet, certsExpiring: certsExpiring,
    insights: insights, reviewQueue: reviewQueue,
    recordBatch: recordBatch, recordSet: recordSet,
    records: records, loadRecords: loadRecords,
    passoffCurrentLevel: passoffCurrentLevel, passoffRecordsFor: passoffRecordsFor, recordsFor: recordsFor,
    currentLevelFromRecords: computeCurrentLevel,
    passoffLevelsFlat: passoffLevelsFlat, passoffCatalog: flattenPassoffCatalog,
    watchVisible: watchVisible,
    refreshVisible: function () { return refreshAllWatchers('manual'); },
    syncStatus: syncSnapshot,
    on: on
  };
})();
