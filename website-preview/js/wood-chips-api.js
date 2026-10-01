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
  // {error:'too_many'} -> the rate-limit message; {error:'too_many_locations'} -> the 5-active-
  // locations cap message; any other {error:...} -> a plain generic message (never the raw server
  // string, so a backend detail can never leak into the UI).
  function throwForBody(body) {
    if (body && body.closed === true) throw new ApiError('closed', COPY.closedMessage);
    if (body && body.error === 'too_many') throw new ApiError('too_many', COPY.tooManyError);
    if (body && body.error === 'too_many_locations') throw new ApiError('too_many_locations', COPY.maxLocationsNote);
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
  //
  // Timeout (2026-09-30): a real TEST outage once left this fetch hanging well past a minute (the
  // door/function stalled, not erroring) while the UI kept saying "Checking…" — long enough that a
  // customer pressed the button again. 20s is generous for a normal request but short enough that a
  // stalled server still ends in the existing network error message instead of spinning forever.
  async function callFunction(action, payload, opts) {
    opts = opts || {};
    var session = opts.auth ? await ensureFreshSession() : loadSession();
    if (opts.auth && !session) throw new ApiError('signed_out', COPY.genericError);
    var headers = { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY };
    if (session && session.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;
    var res;
    try {
      res = await fetch(CFG.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(Object.assign({ action: action }, payload || {})),
        signal: controller ? controller.signal : undefined
      });
    } catch (e) {
      // Covers both a real network failure and our own 20s abort (e.name === 'AbortError') —
      // either way the customer sees the same plain "couldn't reach the server" message.
      throw new ApiError('network', COPY.networkError);
    } finally {
      if (timer) clearTimeout(timer);
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

  // One-click sign-in from the email's "Sign Me In" button (2026-09-30): verifies the token_hash
  // Supabase put in the link (#token_hash=...&type=email) instead of a typed 6-digit code. Same
  // endpoint, same session shape/storage as verifyCode — the only difference is what identifies the
  // sign-in. A failure here almost always means the link already expired or was already used (for
  // example, an email security scanner opening it before the customer clicks it), so it reuses the
  // 'invalid_code' kind but with link-specific wording; wood-chips.js sends the customer back to the
  // email step on either kind of failure.
  async function verifyTokenHash(tokenHash, type) {
    var res;
    try {
      res = await fetch(CFG.SUPABASE_URL + '/auth/v1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY },
        body: JSON.stringify({ type: type, token_hash: tokenHash })
      });
    } catch (e) {
      throw new ApiError('network', COPY.networkError);
    }
    var body = await parseJsonSafe(res);
    if (!res.ok || !body.access_token) throw new ApiError('invalid_code', COPY.linkExpiredMessage);
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
  // me() -> {customers:[view...] newest first (includes 'left' ones), customer: view|null}.
  function me() { return callFunction('me', {}, { auth: true }); }
  // Each signup creates a NEW location for the signed-in account (the first signup also creates
  // the account). Server throws {error:'too_many_locations'} once the account already has 5
  // non-left locations — surfaced above as ApiError('too_many_locations', ...).
  function signup(data, requestId) {
    return callFunction('signup', { data: data, request_id: requestId }, { auth: true });
  }
  // customer_id says which location the change applies to (pause:true/resume:true go in `changes`).
  function update(customerId, changes, paidConsent) {
    return callFunction('update', { customer_id: customerId, changes: changes, paid_consent: !!paidConsent }, { auth: true });
  }
  // Account-wide: updates name/phone on every one of the signed-in customer's locations.
  function updateContact(data) {
    return callFunction('update_contact', { first_name: data.first_name, last_name: data.last_name, phone: data.phone }, { auth: true });
  }
  function leave(customerId, reason) {
    return callFunction('leave', { customer_id: customerId, reason: reason || '' }, { auth: true });
  }
  // Only valid for a 'left' location; all four consents are required again. Returns the location
  // with status back to 'pending'.
  function rejoin(customerId, data, paidConsent) {
    return callFunction('rejoin', { customer_id: customerId, data: data, paid_consent: !!paidConsent }, { auth: true });
  }
  function photoUrl(customerId, ext) { return callFunction('photo_url', { customer_id: customerId, ext: ext }, { auth: true }); }
  function photoConfirm(customerId, path) { return callFunction('photo_confirm', { customer_id: customerId, path: path }, { auth: true }); }

  // Orchestrates the full photo hand-off: get a signed URL, PUT the (already browser-resized)
  // JPEG blob straight to storage, then tell the backend to confirm it. Returns the stored path,
  // which the caller includes in the signup/update/rejoin payload. customerId is optional (there's
  // no location yet on a brand-new signup or an added location) — the contract accepts it blank.
  async function uploadDropPhoto(customerId, blob) {
    var got = await photoUrl(customerId, 'jpg');
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
    await photoConfirm(customerId, got.path);
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
    verifyTokenHash: verifyTokenHash,
    tiers: tiers,
    geocode: geocode,
    me: me,
    signup: signup,
    update: update,
    updateContact: updateContact,
    leave: leave,
    rejoin: rejoin,
    uploadDropPhoto: uploadDropPhoto
  };
})();
