// TTC Crew — shared entrance gate. This hides static UI until a saved remote session is validated.
// It is an access-control UI for a public static site; the records backend remains the data boundary.
(function () {
  'use strict';
  if (window.TTCAuthGate) return;

  var script = document.currentScript;
  var scriptUrl = new URL(script && script.src || 'shared/auth-gate.js', location.href);
  var root = new URL('../', scriptUrl);
  var recordsUrl = new URL('services/records.js', root).href;
  var loginUrl = new URL('pages/me/index.html', root);
  var sessionKey = 'ttc-crew-session:v1';
  // Validating the session costs a full Apps Script round trip, which is seconds, not milliseconds.
  // Doing that on EVERY page open put a "Checking your sign-in…" screen in front of every tap —
  // opening the pass-off felt like signing in again. Remember that this exact token was validated
  // recently, show the page straight away, and re-validate quietly in the background.
  // Safe because this gate is UI, not the boundary: the records backend still refuses every
  // request without a valid token. The cost is that a role change or a deactivation takes up to
  // VALID_FOR_MS to change what the UI offers, while the data itself is refused immediately.
  var validKey = 'ttc-crew-auth-ok:v1';
  var VALID_FOR_MS = 10 * 60 * 1000;
  var checking = null;
  var loadedRecords = null;
  var initialized = false;
  var signingOut = false;
  var lastCheck = 0;
  var messageVersion = 0;

  document.documentElement.classList.add('ttc-auth-pending');
  document.documentElement.classList.remove('ttc-auth-ready');
  var style = document.createElement('style');
  style.textContent = 'html.ttc-auth-pending body>*:not(#ttc-auth-gate){visibility:hidden!important}' +
    '#ttc-auth-gate{visibility:visible!important;position:fixed;z-index:2147483647;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9f6f2;color:#1f2419;font:16px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}' +
    '#ttc-auth-gate>div{max-width:420px}#ttc-auth-gate h1{font-size:22px;margin:0 0 8px}#ttc-auth-gate p{margin:0 0 16px;color:#5a5f55}#ttc-auth-gate button{border:0;border-radius:9px;padding:10px 18px;background:#c9601a;color:white;font:700 15px inherit;cursor:pointer}' +
    '@media(prefers-color-scheme:dark){#ttc-auth-gate{background:#1b2218;color:#f1eee7}#ttc-auth-gate p{color:#b9bcb2}}';
  (document.head || document.documentElement).appendChild(style);

  function storedToken() {
    try {
      var raw = JSON.parse(localStorage.getItem(sessionKey) || 'null');
      return (raw && raw.mode === 'remote' && raw.token) ? String(raw.token) : null;
    } catch (e) { return null; }
  }
  function markValidated(token) {
    if (!token) return;
    try { localStorage.setItem(validKey, JSON.stringify({ token: token, at: Date.now() })); } catch (e) { /* private mode */ }
  }
  function clearValidated() { try { localStorage.removeItem(validKey); } catch (e) { /* ignore */ } }
  function recentlyValidated(token) {
    if (!token) return false;
    try {
      var mark = JSON.parse(localStorage.getItem(validKey) || 'null');
      return !!mark && mark.token === token && (Date.now() - Number(mark.at || 0)) < VALID_FOR_MS;
    } catch (e) { return false; }
  }

  function normalizedPath(pathname) { return pathname.replace(/index\.html$/, '').replace(/\/+$/, ''); }
  function isLogin() { return normalizedPath(location.pathname) === normalizedPath(loginUrl.pathname); }
  function signinTarget(returnValue) {
    var target = new URL(loginUrl.href);
    target.searchParams.set('signin', '1');
    if (returnValue) target.searchParams.set('return', returnValue);
    return target.href;
  }
  function currentReturn() { return location.pathname + location.search + location.hash; }
  function safeReturn(value) {
    if (!value || typeof value !== 'string') return null;
    var candidate;
    try { candidate = new URL(value, location.origin); } catch (e) { return null; }
    if (candidate.origin !== location.origin || candidate.username || candidate.password) return null;
    var rootPath = root.pathname.replace(/\/+$/, '/') ;
    if (candidate.pathname.indexOf(rootPath) !== 0) return null;
    if (normalizedPath(candidate.pathname) === normalizedPath(loginUrl.pathname)) return null;
    return candidate.pathname + candidate.search + candidate.hash;
  }
  function reveal() {
    messageVersion++;
    document.documentElement.classList.remove('ttc-auth-pending');
    document.documentElement.classList.add('ttc-auth-ready');
    var old = document.getElementById('ttc-auth-gate');
    if (old) old.remove();
  }
  function message(title, detail, retry) {
    var version = ++messageVersion;
    function draw() {
      if (version !== messageVersion) return;
      var old = document.getElementById('ttc-auth-gate');
      if (old) old.remove();
      var box = document.createElement('div'); box.id = 'ttc-auth-gate';
      var inner = document.createElement('div');
      var h = document.createElement('h1'); h.textContent = title;
      var p = document.createElement('p'); p.textContent = detail;
      inner.appendChild(h); inner.appendChild(p);
      if (retry) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Try again';
        b.addEventListener('click', function () { location.reload(); }); inner.appendChild(b);
      }
      box.appendChild(inner);
      document.body.appendChild(box);
    }
    if (document.body) draw(); else document.addEventListener('DOMContentLoaded', draw, { once: true });
  }
  function loadRecords() {
    if (window.TTCRecords) return Promise.resolve(window.TTCRecords);
    if (loadedRecords) return loadedRecords;
    loadedRecords = new Promise(function (resolve, reject) {
      var tag = document.createElement('script'); tag.src = recordsUrl; tag.async = false;
      tag.onload = function () { window.TTCRecords ? resolve(window.TTCRecords) : reject(new Error('Records service did not start.')); };
      tag.onerror = function () { reject(new Error('Could not load the sign-in service.')); };
      (document.head || document.documentElement).appendChild(tag);
    }).catch(function (err) { loadedRecords = null; throw err; });
    return loadedRecords;
  }
  function goToSignIn() {
    if (isLogin()) { reveal(); return; }
    location.replace(signinTarget(currentReturn()));
  }
  function invalidAuth(err) { return err && ['not_signed_in', 'bad_token', 'invalid_token', 'invalid_session', 'session_changed', 'expired_token', 'unknown_person', 'forbidden'].indexOf(err.error) !== -1; }
  function check(opts) {
    opts = opts || {};
    if (checking) return checking;
    lastCheck = Date.now();
    // Straight in when this device validated this same token minutes ago. The check still runs,
    // just behind the page instead of in front of it.
    var quiet = !opts.force && recentlyValidated(storedToken()) && !isLogin();
    if (quiet) {
      reveal();
    } else {
      document.documentElement.classList.remove('ttc-auth-ready');
      document.documentElement.classList.add('ttc-auth-pending');
      message('Checking your sign-in…', 'One moment while TTC Crew verifies this device.', false);
    }
    checking = loadRecords().then(function (records) {
      return records.ready().then(function () {
        if (!initialized) {
          initialized = true;
          records.on('signout', function () { clearValidated(); if (!signingOut) goToSignIn(); });
        }
        return records.requireSession();
      });
    }).then(function () {
      markValidated(storedToken());
      var params = new URLSearchParams(location.search);
      if (params.get('signin') === '1') location.replace(safeReturn(params.get('return')) || new URL('index.html#/', root).href);
      else reveal();
    }).catch(function (err) {
      if (err && err.error === 'session_changed') {
        // Another tab replaced or refreshed the session during validation. The persisted replacement
        // is authoritative; let this check unwind, then validate it without deleting it.
        setTimeout(function () { check(opts); }, 0);
        return;
      }
      if (invalidAuth(err)) {
        clearValidated();
        if (isLogin() && err.error === 'not_signed_in') { reveal(); return; }
        signingOut = true;
        if (window.TTCRecords) window.TTCRecords.signOut();
        signingOut = false;
        goToSignIn();
        return;
      }
      // A quiet re-validation that cannot reach the network must never blank a page the person is
      // already reading. The records service shows its own offline state; leave the page alone.
      if (quiet) return;
      message('TTC Crew is unavailable', err && err.error === 'not_configured' ?
        'Sign-in has not been configured. Please contact the office.' :
        'We could not verify your sign-in. Check your connection, then try again.', true);
    }).then(function () { checking = null; }, function () { checking = null; });
    return checking;
  }
  function completeSignIn() {
    var params = new URLSearchParams(location.search);
    location.replace(safeReturn(params.get('return')) || new URL('index.html#/', root).href);
  }

  window.TTCAuthGate = { safeReturn: safeReturn, completeSignIn: completeSignIn, check: check };
  window.addEventListener('storage', function (event) { if (event.key === sessionKey) check({ force: true }); });
  window.addEventListener('pageshow', function (event) { if (event.persisted) check(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck > VALID_FOR_MS) check();
  });
  check();
})();
