/* Wood Chips sign-up page — the ONLY file that talks to the backend.
 *
 * Everything else (wood-chips.js) calls the functions returned here and never touches fetch,
 * sessionStorage, or the Edge Function URL directly. That keeps the contract in one place and
 * makes it easy to point this whole page at a different backend later.
 *
 * No supabase-js library is loaded on this page (see the build's HARD RULES) — the two Auth
 * calls below (verify / refresh token) are plain fetches to Supabase's own REST endpoints, using
 * only the public "publishable" key, exactly as documented for browser clients without the SDK.
 *
 * The session (access token + refresh token) lives in sessionStorage ONLY — it disappears the
 * moment this tab closes, by design (see the plan's security section). Nothing here ever writes
 * it to localStorage, a cookie, or anywhere durable.
 */
window.TTCChipApi = (function () {
  'use strict';
  var CFG = window.TTC_CHIP_CONFIG || {};
  var COPY = window.TTC_CHIP_COPY || {};
  var SESSION_KEY = 'ttc_chip_session';

  // A small, uniform error shape every function below throws on failure, so wood-chips.js only
  // ever needs to read `.kind` and show `.message` — never a raw server error, never a stack trace.
  //   kind: 'closed' | 'too_many' | 'invalid_code' | 'network' | 'signed_out' | 'error'
  function ApiError(kind, message) {
    this.kind = kind;
    this.message = message;
  }

  // ------------------------------------------------------------ session storage (tab-only)
  function saveSession(s) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* private mode etc. */ }
  }
  function loadSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }
  function hasSession() {
    var s = loadSession();
    return !!(s && s.access_token);
  }

  // ------------------------------------------------------------ low-level plumbing
  function parseJsonSafe(res) {
    return res.text().then(function (t) {
      if (!t) return {};
      try { return JSON.parse(t); } catch (e) { return {}; }
    });
  }

  // Turns a parsed body into the right ApiError per the contract: {closed:true} -> closed state;
  // {error:'too_many'} -> the rate-limit message; any other {error:...} -> a plain generic
  // message (never the raw server string, so a backend detail can never leak into the UI).
  function throwForBody(body) {
    if (body && body.closed === true) throw new ApiError('closed', COPY.closedMessage);
    if (body && body.error === 'too_many') throw new ApiError('too_many', COPY.tooManyError);
    if (body && body.error) throw new ApiError('error', COPY.genericError);
  }

  async function refreshSession(s) {
    var res;
    try {
      res = await fetch(CFG.SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY },
        body: JSON.stringify({ refresh_token: s.refresh_token })
      });
    } catch (e) {
      throw new ApiError('network', COPY.networkError);
    }
    var body = await parseJsonSafe(res);
    if (!res.ok || !body.access_token) { clearSession(); return null; }
    var session = {
      access_token: body.access_token,
      refresh_token: body.refresh_token || s.refresh_token,
      expires_at: Date.now() + (Number(body.expires_in || 3600) * 1000)
    };
    saveSession(session);
    return session;
  }

  // Refreshes when the token is near (within 60s of) expiring; returns null if there is no
  // session at all, or the refresh itself failed (caller then treats the customer as signed out).
  async function ensureFreshSession() {
    var s = loadSession();
    if (!s) return null;
    if (Date.now() < (s.expires_at - 60000)) return s;
    return refreshSession(s);
  }

  // The one Edge Function every action (except the two Supabase Auth calls below) goes through.
  // auth:true = a signed-in action (Authorization: Bearer <access token>, per the contract).
  async function callFunction(action, payload, opts) {
    opts = opts || {};
    var session = opts.auth ? await ensureFreshSession() : loadSession();
    if (opts.auth && !session) throw new ApiError('signed_out', COPY.genericError);
    var headers = { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY };
    if (session && session.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    var res;
    try {
      res = await fetch(CFG.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(Object.assign({ action: action }, payload || {}))
      });
    } catch (e) {
      throw new ApiError('network', COPY.networkError);
    }
    var body = await parseJsonSafe(res);
    throwForBody(body);
    if (!res.ok) throw new ApiError('error', COPY.genericError);
    return body;
  }

  // ------------------------------------------------------------ Supabase Auth REST (not the Edge Function)
  function sendCode(email, turnstileToken) {
    return callFunction('code', { email: email, turnstile_token: turnstileToken }, { auth: false });
  }

  async function verifyCode(email, code) {
    var res;
    try {
      res = await fetch(CFG.SUPABASE_URL + '/auth/v1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY },
        body: JSON.stringify({ type: 'email', email: email, token: code })
      });
    } catch (e) {
      throw new ApiError('network', COPY.networkError);
    }
    var body = await parseJsonSafe(res);
    if (!res.ok || !body.access_token) throw new ApiError('invalid_code', COPY.invalidCodeError);
    var session = {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: Date.now() + (Number(body.expires_in || 3600) * 1000)
    };
    saveSession(session);
    return session;
  }

  // ------------------------------------------------------------ public actions (no session needed)
  function tiers() { return callFunction('tiers', {}, { auth: false }); }
  function geocode(street, city, zip) {
    return callFunction('geocode', { street: street, city: city, zip: zip }, { auth: false });
  }

  // ------------------------------------------------------------ signed-in actions
  function me() { return callFunction('me', {}, { auth: true }); }
  function signup(data, requestId) {
    return callFunction('signup', { data: data, request_id: requestId }, { auth: true });
  }
  function update(changes, paidConsent) {
    return callFunction('update', { changes: changes, paid_consent: !!paidConsent }, { auth: true });
  }
  function leave(reason) {
    return callFunction('leave', { reason: reason || '' }, { auth: true });
  }
  function photoUrl(ext) { return callFunction('photo_url', { ext: ext }, { auth: true }); }
  function photoConfirm(path) { return callFunction('photo_confirm', { path: path }, { auth: true }); }

  // Orchestrates the full photo hand-off: get a signed URL, PUT the (already browser-resized)
  // JPEG blob straight to storage, then tell the backend to confirm it. Returns the stored path,
  // which the caller includes in the signup/update payload.
  async function uploadDropPhoto(blob) {
    var got = await photoUrl('jpg');
    try {
      var put = await fetch(got.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob
      });
      if (!put.ok) throw new Error('upload failed');
    } catch (e) {
      throw new ApiError('error', COPY.photoUploadFailed || COPY.genericError);
    }
    await photoConfirm(got.path);
    return got.path;
  }

  function newRequestId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    // Fallback only for a browser without crypto.randomUUID; still unique-enough per form, just
    // not cryptographically random. Modern phones all have randomUUID, so this rarely runs.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  return {
    hasSession: hasSession,
    clearSession: clearSession,
    newRequestId: newRequestId,
    code: sendCode,
    verifyCode: verifyCode,
    tiers: tiers,
    geocode: geocode,
    me: me,
    signup: signup,
    update: update,
    leave: leave,
    uploadDropPhoto: uploadDropPhoto
  };
})();
