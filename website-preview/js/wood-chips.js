/* Wood Chips sign-up page — page logic (/wood-chips/).
 *
 * Reads config from window.TTC_CHIP_CONFIG, words from window.TTC_CHIP_COPY, and talks to the
 * backend only through window.TTCChipApi — this file never calls fetch directly and never writes
 * a customer-facing sentence inline (every string comes from the copy object).
 *
 * Security: every value that came from the backend or from the customer is inserted with
 * textContent or as DOM nodes built by hand (see the `h()` helper below) — never innerHTML with
 * data. The only innerHTML use anywhere in this file is clearing a container, which never touches
 * variable content.
 *
 * One account can have several chip drop locations (Joseph, 2026-09-30). There is one profile
 * page: a single "Your Contact Info" card (name/email/phone, account-wide), then one card per
 * drop location ("Your Chip Drop Requests"), each with its own Change/Pause/Remove/Get-Back-on-
 * the-List actions. A brand-new account (0 locations) still sees the full sign-up form first —
 * that is what creates the account.
 */
(function () {
  'use strict';
  var CFG = window.TTC_CHIP_CONFIG || {};
  var COPY = window.TTC_CHIP_COPY || {};
  var API = window.TTCChipApi;

  var ROOT_ID = 'chip-app';

  // ---------------------------------------------------------------- tiny DOM builder (no innerHTML)
  // h('div', {class:'x', onclick:fn}, ['text', childNode]) — attrs starting 'on' become listeners.
  function h(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null) return;
        if (k.lastIndexOf('on', 0) === 0 && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else if (k === 'class') e.className = v;
        else if (k === 'for') e.htmlFor = v;
        else if (k === 'checked' || k === 'disabled' || k === 'required' || k === 'hidden') { if (v) e.setAttribute(k, ''); }
        else e.setAttribute(k, v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return e;
  }
  function clear(node) { node.textContent = ''; }
  function mount(node) {
    var root = document.getElementById(ROOT_ID);
    clear(root);
    root.appendChild(node);
  }

  // ---------------------------------------------------------------- state
  var STATE = {
    step: 'loading',        // loading | closed | email | code | signup | confirm | profile | fatal
    tiers: [],
    email: '',
    turnstileToken: null,
    customers: [],           // every location on the account, newest first (includes 'left' ones)
    jobberHubUrl: null,      // account-level Jobber Client Hub link — only ever on a singular
                              // `customer` reply (me().customer, or signup/update/leave/rejoin's
                              // `customer`), never on an entry inside customers[]. Captured as we
                              // see it; the "See Your Invoices" link is hidden until we have one.
    error: null,
    form: null,               // the in-progress FULL sign-up form (first-ever location only)
    requestId: null,
    profileUi: null
  };
  function captureJobberUrl(customer) {
    if (customer && customer.jobber_hub_url) STATE.jobberHubUrl = customer.jobber_hub_url;
  }

  // The full sign-up form (creates the account + its first location together) — the only place
  // name/phone are collected once the account exists (adding/editing/rejoining a location never
  // asks for them again; they live on the account, edited from the contact card).
  function freshForm() {
    return {
      first_name: '', last_name: '', phone: '',
      street: '', city: '', zip: '',
      lat: null, lng: null, pinSet: false,
      tier: '', loads_wanted: '', drop_notes: '',
      photoBlob: null, photoPreviewUrl: null, photoPath: null,
      truck_access: '',
      consent_mixed_ok: false, consent_stays_on_list: false,
      consent_property_access: false, consent_photo_use: false,
      paid_consent: false,
      _errors: {}, _topError: null
    };
  }

  // A location-only form: everything freshForm() has except name/phone. Used for Add Another
  // Drop Location, Change on an existing location, and Get Back on the List.
  function freshLocationForm() {
    return {
      street: '', city: '', zip: '',
      lat: null, lng: null, pinSet: false,
      tier: '', loads_wanted: '', drop_notes: '',
      photoBlob: null, photoPreviewUrl: null, photoPath: null,
      truck_access: '',
      consent_mixed_ok: false, consent_stays_on_list: false,
      consent_property_access: false, consent_photo_use: false,
      paid_consent: false,
      _errors: {}, _topError: null
    };
  }

  // Pre-fills a location form from an existing location's view (edit or rejoin). Consents always
  // start unchecked — an edit never shows them (validateLocationForm skips them for mode 'edit'),
  // and a rejoin requires the customer to check each one again, per Joseph's spec.
  function initLocationFormFromCustomer(c) {
    var hasPin = typeof c.lat === 'number' && typeof c.lng === 'number';
    return {
      street: c.street || '', city: c.city || '', zip: c.zip || '',
      lat: hasPin ? c.lat : null, lng: hasPin ? c.lng : null, pinSet: hasPin,
      tier: c.tier || '', loads_wanted: loadsKeyFor(c.loads_wanted), drop_notes: c.drop_notes || '',
      truck_access: c.truck_access === 'unsure' ? 'not_sure' : (c.truck_access || ''),
      photoBlob: null, photoPreviewUrl: (c.photos && c.photos[0] && c.photos[0].url) || null, photoPath: null,
      consent_mixed_ok: false, consent_stays_on_list: false, consent_property_access: false, consent_photo_use: false,
      paid_consent: false,
      _errors: {}, _topError: null
    };
  }

  // ---------------------------------------------------------------- small validators
  function digitsOnly(s) { return (s || '').replace(/\D/g, ''); }
  function isValidZip(z) { return /^\d{5}$/.test((z || '').trim()); }
  function isValidPhone(p) { return digitsOnly(p).length === 10; }
  function tierByKey(key) {
    for (var i = 0; i < STATE.tiers.length; i++) if (STATE.tiers[i].key === key) return STATE.tiers[i];
    return null;
  }

  // ---------------------------------------------------------------- shared bits
  function officePhoneLink() {
    return h('a', { href: CFG.OFFICE_PHONE_HREF }, [CFG.OFFICE_PHONE_DISPLAY || '']);
  }
  function banner(kind, message) {
    return h('div', { class: 'chip-banner chip-banner--' + kind, role: 'alert' }, [message]);
  }
  function fieldError(message) {
    return message ? h('p', { class: 'chip-error' }, [message]) : null;
  }

  // ---------------------------------------------------------------- Turnstile widget wrapper
  var Turnstile = {
    widgetId: null,
    token: null,
    gaveUp: false,
    render: function (container, onToken) {
      this.token = null; this.gaveUp = false;
      this._onToken = onToken;
      this._container = container;
      this._tryRender(0);
    },
    _tryRender: function (tries) {
      var self = this;
      if (window.turnstile && typeof window.turnstile.render === 'function') {
        this.widgetId = window.turnstile.render(this._container, {
          sitekey: CFG.TURNSTILE_SITE_KEY,
          callback: function (token) { self.token = token; if (self._onToken) self._onToken(token); }
        });
        return;
      }
      if (tries > 100) { this.gaveUp = true; if (this._onToken) this._onToken(null, true); return; }
      setTimeout(function () { self._tryRender(tries + 1); }, 100);
    },
    reset: function () {
      this.token = null;
      if (window.turnstile && this.widgetId != null) window.turnstile.reset(this.widgetId);
    }
  };

  // ---------------------------------------------------------------- map widget wrapper (Leaflet + Esri satellite)
  // Same pin-on-satellite approach as domains/stump-grinding/apps/stump-locator/index.html, but a
  // single small-circle marker instead of numbered pins, matching the spec for this page. It is a
  // singleton — only one location form (sign-up, add, change, or rejoin) is ever open at a time on
  // this page, so one Leaflet instance is always enough; init() tears down any previous map first.
  var DEFAULT_CENTER = { lat: 41.737, lng: -111.834 }; // Cache Valley, UT — just a starting view
  var MapWidget = {
    map: null, marker: null,
    init: function (container, opts) {
      this.destroy();
      opts = opts || {};
      var lat = opts.lat != null ? opts.lat : DEFAULT_CENTER.lat;
      var lng = opts.lng != null ? opts.lng : DEFAULT_CENTER.lng;
      var map = L.map(container, { tap: true }).setView([lat, lng], opts.zoom || (opts.lat != null ? 18 : 11));
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 21, maxNativeZoom: 19, attribution: 'Imagery © Esri' }).addTo(map);
      var icon = L.divIcon({ className: '', html: '<div class="chip-pin-circle"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
      var marker = L.marker([lat, lng], { icon: icon, draggable: !!opts.draggable }).addTo(map);
      this.map = map; this.marker = marker;
      if (opts.draggable && opts.onMove) {
        marker.on('dragend', function () { var ll = marker.getLatLng(); opts.onMove(ll.lat, ll.lng); });
        map.on('click', function (e) { marker.setLatLng(e.latlng); opts.onMove(e.latlng.lat, e.latlng.lng); });
      }
      // A freshly-opened Leaflet map inside a container that wasn't visible/sized yet can render
      // gray until it recalculates its size — nudge it once the container has settled.
      setTimeout(function () { map.invalidateSize(); }, 60);
    },
    setView: function (lat, lng, zoom) {
      if (!this.map) return;
      this.map.setView([lat, lng], zoom || 18);
      if (this.marker) this.marker.setLatLng([lat, lng]);
    },
    destroy: function () {
      if (this.map) { this.map.remove(); this.map = null; this.marker = null; }
    }
  };

  // A map is only ever built once a form's container is actually mounted in the document, so
  // buildLocationFormFields() stashes the init call here and render() callers fire it right after
  // mount(). Cleared after firing so a render pass with no map-bearing form does nothing.
  var pendingMapInit = null;

  // ---------------------------------------------------------------- photo: resize to <=1600px JPEG via canvas
  // Re-encoding through canvas both shrinks the file and strips EXIF (including GPS location).
  function processPhotoFile(file, cb) {
    var reader = new FileReader();
    reader.onerror = function () { cb(new Error('read failed')); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { cb(new Error('decode failed')); };
      img.onload = function () {
        var maxSide = 1600;
        var w = img.naturalWidth, hgt = img.naturalHeight;
        var scale = Math.min(1, maxSide / Math.max(w, hgt));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(hgt * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
        canvas.toBlob(function (blob) {
          if (!blob) { cb(new Error('encode failed')); return; }
          // Preview uses a data: URL (fixed 2026-09-30 — Joseph saw a broken preview): unlike a blob: URL it
          // can't be revoked or go stale across re-renders.
          var preview = '';
          try { preview = canvas.toDataURL('image/jpeg', 0.7); } catch (x) { preview = URL.createObjectURL(blob); }
          cb(null, blob, preview);
        }, 'image/jpeg', 0.85);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderLoading() {
    mount(h('div', { class: 'chip-loading' }, [COPY.loadingText]));
  }

  function renderClosed() {
    mount(h('div', { class: 'chip-card chip-closed' }, [
      h('p', {}, [COPY.closedMessage])
    ]));
  }

  function renderFatal(message) {
    mount(h('div', { class: 'chip-card chip-closed' }, [
      h('p', {}, [message || COPY.genericError]),
      h('p', {}, ['Call ', officePhoneLink(), ' for help.'])
    ]));
  }

  var emailUi = { sending: false, error: null, verifying: false, codeError: null, code: '' };

  function renderEmailStep() {
    var wrap = h('div', { class: 'chip-card' });
    if (STATE.step === 'email') {
      wrap.appendChild(h('h1', {}, [COPY.introTitle]));
      wrap.appendChild(h('p', { class: 'chip-lead' }, [COPY.introLead]));
      (COPY.introSections || []).forEach(function (sec) {
        var box = h('div', { class: 'chip-intro-sec' + (sec.callout ? ' chip-intro-sec--callout' : '') });
        box.appendChild(h('h3', {}, [sec.title]));
        (sec.paras || []).forEach(function (t) { box.appendChild(h('p', {}, [t])); });
        if (sec.items && sec.items.length) {
          box.appendChild(h(sec.ordered ? 'ol' : 'ul', {}, sec.items.map(function (t) { return h('li', {}, [t]); })));
        }
        wrap.appendChild(box);
      });
      if (COPY.calcUrl) {
        wrap.appendChild(h('p', { class: 'chip-intro-calc' }, [COPY.calcText,
          h('a', { href: COPY.calcUrl, target: '_blank', rel: 'noopener' }, [COPY.calcLinkText]), COPY.calcNote]));
      }
      wrap.appendChild(h('p', {}, [COPY.introP3]));
    }
    wrap.appendChild(h('h2', {}, [COPY.emailStepTitle]));

    if (STATE.step === 'code') {
      wrap.appendChild(h('p', { class: 'chip-banner chip-banner--info' }, [COPY.codeSentAlways]));
    }

    if (emailUi.error) wrap.appendChild(banner('error', emailUi.error));

    if (STATE.step === 'email') {
      var emailInput = h('input', {
        type: 'email', id: 'cw-email', required: true, autocomplete: 'email',
        value: STATE.email, oninput: function (e) { STATE.email = e.target.value; }
      });
      emailInput.value = STATE.email;
      var tsDiv = h('div', { class: 'chip-turnstile' });
      var tsNote = h('p', { class: 'chip-error', hidden: true }, [COPY.turnstileFailed]);
      var sendBtn = h('button', { class: 'btn', type: 'submit', disabled: true }, [COPY.sendCodeButton]);

      var form = h('form', {
        class: 'chip-form', onsubmit: function (e) {
          e.preventDefault();
          if (!STATE.email) { emailUi.error = COPY.errorRequired; return renderEmailStep(); }
          submitSendCode(sendBtn);
        }
      }, [
        h('div', { class: 'field' }, [h('label', { for: 'cw-email' }, [COPY.emailLabel]), emailInput]),
        h('p', { class: 'chip-help' }, [COPY.emailHelp]),
        tsDiv,
        tsNote,
        sendBtn
      ]);
      wrap.appendChild(form);
      mount(wrap);
      Turnstile.render(tsDiv, function (token, gaveUp) {
        sendBtn.disabled = !token;
        if (gaveUp) tsNote.hidden = false;
      });
      emailInput.focus();
      return;
    }

    // step === 'code'
    var codeInput = h('input', {
      type: 'text', id: 'cw-code', inputmode: 'numeric', pattern: '[0-9]{6}', maxlength: '6',
      autocomplete: 'one-time-code', required: true,
      oninput: function (e) { emailUi.code = e.target.value; }
    });
    codeInput.value = emailUi.code;
    if (emailUi.codeError) wrap.appendChild(fieldError(emailUi.codeError));
    var verifyBtn = h('button', { class: 'btn', type: 'submit' }, [emailUi.verifying ? COPY.verifying : COPY.verifyButton]);
    var codeForm = h('form', {
      class: 'chip-form', onsubmit: function (e) { e.preventDefault(); submitVerifyCode(); }
    }, [
      h('div', { class: 'field' }, [h('label', { for: 'cw-code' }, [COPY.codeLabel]), codeInput]),
      h('p', { class: 'chip-help' }, [COPY.codeHelp]),
      verifyBtn
    ]);
    wrap.appendChild(codeForm);
    var links = h('div', { class: 'chip-links' }, [
      h('button', { class: 'chip-linkbtn', type: 'button', onclick: function () { resendCode(); } }, [COPY.resendButton]),
      h('button', {
        class: 'chip-linkbtn', type: 'button', onclick: function () {
          STATE.step = 'email'; emailUi.error = null; emailUi.code = ''; render();
        }
      }, [COPY.changeEmailButton])
    ]);
    wrap.appendChild(links);
    mount(wrap);
    codeInput.focus();
  }

  function submitSendCode(sendBtn) {
    emailUi.error = null; emailUi.sending = true;
    sendBtn.disabled = true; sendBtn.textContent = COPY.sendingCode;
    API.code(STATE.email, Turnstile.token).then(function () {
      emailUi.sending = false; STATE.step = 'code'; emailUi.codeError = null; render();
    }).catch(function (err) {
      emailUi.sending = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      emailUi.error = err.message || COPY.genericError;
      Turnstile.reset();
      render();
    });
  }

  function resendCode() {
    // Turnstile tokens are single-use, and the widget only exists on the email screen — send the
    // customer back there (email still filled in) to get a fresh token and press Send again.
    emailUi.error = null; emailUi.codeError = null; emailUi.code = '';
    STATE.step = 'email';
    render();
  }

  // Decides where to land right after sign-in (fresh code verify, or a returning session in
  // boot()): 0 locations -> the full sign-up form (creates the account); 1+ -> the one profile
  // page, which lists every location as its own card.
  function customersFromMeResponse(meRes) {
    if (meRes && Array.isArray(meRes.customers)) return meRes.customers;
    if (meRes && meRes.customer) return [meRes.customer];
    return [];
  }
  function routeAfterAuth(meRes) {
    var customers = customersFromMeResponse(meRes);
    STATE.customers = customers;
    STATE.profileUi = null;
    captureJobberUrl(meRes && meRes.customer);
    if (customers.length === 0) {
      STATE.form = freshForm(); STATE.requestId = API.newRequestId(); STATE.step = 'signup';
    } else {
      STATE.step = 'profile';
    }
  }

  function submitVerifyCode() {
    if (!/^\d{6}$/.test(emailUi.code)) { emailUi.codeError = COPY.invalidCodeError; return render(); }
    emailUi.verifying = true; emailUi.codeError = null; render();
    API.verifyCode(STATE.email, emailUi.code).then(function () {
      return API.me();
    }).then(function (meRes) {
      emailUi.verifying = false;
      routeAfterAuth(meRes);
      render();
    }).catch(function (err) {
      emailUi.verifying = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      emailUi.codeError = err.message || COPY.invalidCodeError;
      render();
    });
  }

  // ---------------------------------------------------------------- shared field helper
  function labeledField(id, labelText, inputEl, errorMsg, helpText) {
    var kids = [h('label', { for: id }, [labelText]), inputEl];
    if (helpText) kids.push(h('p', { class: 'chip-help' }, [helpText]));
    var err = fieldError(errorMsg);
    if (err) kids.push(err);
    return h('div', { class: 'field' }, kids);
  }

  // ---------------------------------------------------------------- shared location-form fields
  // Everything a drop location needs EXCEPT name/phone: address+map, tier, loads, notes, photo,
  // truck access, and (for signup/add/rejoin only) the four consents. One shared builder behind
  // the full sign-up form, "Add Another Drop Location", a location's "Change", and "Get Back on
  // the List" — so the same fields, ids, and behavior appear everywhere they're asked.
  // mode: 'signup' | 'add' | 'edit' | 'rejoin'. Fixed element ids are safe to reuse because only
  // one location form is ever mounted at a time (see closeAllEditPanels()).
  function buildLocationFormFields(container, f, errors, mode) {
    // ---- address ----
    container.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionAddress]));
    var streetInput = h('input', { type: 'text', id: 'cw-street', required: true, autocomplete: 'address-line1', oninput: function (e) { f.street = e.target.value; } });
    streetInput.value = f.street;
    container.appendChild(labeledField('cw-street', COPY.streetLabel, streetInput, errors.street));
    var cityInput = h('input', { type: 'text', id: 'cw-city', required: true, autocomplete: 'address-level2', oninput: function (e) { f.city = e.target.value; } });
    cityInput.value = f.city;
    var zipInput = h('input', { type: 'text', id: 'cw-zip', required: true, inputmode: 'numeric', maxlength: '5', autocomplete: 'postal-code', oninput: function (e) { f.zip = e.target.value; } });
    zipInput.value = f.zip;
    container.appendChild(h('div', { class: 'row' }, [
      labeledField('cw-city', COPY.cityLabel, cityInput, errors.city),
      labeledField('cw-zip', COPY.zipLabel, zipInput, errors.zip)
    ]));

    var addressErrorHolder = h('div', {}, []);
    var findBtn = h('button', { class: 'btn btn--outline', type: 'button' }, [COPY.findAddressButton]);
    findBtn.addEventListener('click', function () {
      if (!f.street.trim() || !f.city.trim() || !isValidZip(f.zip)) {
        clear(addressErrorHolder); addressErrorHolder.appendChild(fieldError(COPY.errorRequired));
        return;
      }
      findBtn.disabled = true; var was = findBtn.textContent; findBtn.textContent = COPY.finding;
      API.geocode(f.street.trim(), f.city.trim(), f.zip.trim()).then(function (res) {
        findBtn.disabled = false; findBtn.textContent = was;
        clear(addressErrorHolder);
        if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
          f.lat = res.lat; f.lng = res.lng; f.pinSet = true;
          MapWidget.setView(res.lat, res.lng, 18);
        } else {
          addressErrorHolder.appendChild(fieldError(COPY.errorAddressNotFound));
        }
      }).catch(function (err) {
        findBtn.disabled = false; findBtn.textContent = was;
        if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
        clear(addressErrorHolder);
        addressErrorHolder.appendChild(fieldError(err.message || COPY.genericError));
      });
    });
    container.appendChild(h('div', { class: 'chip-find-address' }, [
      findBtn,
      h('p', { class: 'chip-help' }, [COPY.findAddressHelp])
    ]));
    container.appendChild(addressErrorHolder);

    // ---- map ----
    container.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionMap]));
    container.appendChild(h('p', { class: 'chip-map-hint' }, [COPY.mapHint]));
    var mapDiv = h('div', { class: 'chip-map' });
    container.appendChild(mapDiv);
    container.appendChild(h('p', { class: 'chip-help' }, [COPY.mapHintTap]));
    var pinErr = fieldError(errors.pin);
    if (pinErr) container.appendChild(pinErr);
    pendingMapInit = function () {
      MapWidget.init(mapDiv, {
        lat: f.pinSet ? f.lat : null, lng: f.pinSet ? f.lng : null, draggable: true,
        onMove: function (lat, lng) { f.lat = lat; f.lng = lng; f.pinSet = true; }
      });
    };

    // ---- tier ----
    var tierSet = h('fieldset', { class: 'chip-fieldset' }, [h('legend', {}, [COPY.sectionTier])]);
    var paidConsentText = h('span', {}, ['']);
    var paidConsentCheckbox = h('input', { type: 'checkbox', checked: f.paid_consent, onchange: function (e) { f.paid_consent = e.target.checked; } });
    var paidConsentRow = h('label', { class: 'chip-consent', hidden: true }, [paidConsentCheckbox, paidConsentText]);
    function onTierChange() {
      var t = tierByKey(f.tier);
      var isPaid = !!(t && t.price_per_drop > 0);
      paidConsentRow.hidden = !isPaid;
      if (!isPaid) { f.paid_consent = false; paidConsentCheckbox.checked = false; }
      else { paidConsentText.textContent = COPY.paidConsent(t.price_per_drop); }
    }
    STATE.tiers.forEach(function (t) {
      var id = 'cw-tier-' + t.key;
      var priceText = (t.price_per_drop > 0) ? ('$' + t.price_per_drop) : COPY.tierFreeLabel;
      var radio = h('input', {
        type: 'radio', name: 'cw-tier', id: id, checked: f.tier === t.key,
        onchange: function () { f.tier = t.key; onTierChange(); }
      });
      var kids = [radio, h('span', { class: 'chip-tier-name' }, [t.name + ' — ' + priceText])];
      if (t.call_first) kids.push(h('span', { class: 'chip-tier-callfirst' }, [COPY.tierCallFirstNote]));
      if (t.description) kids.push(h('p', { class: 'chip-tier-desc' }, [t.description]));
      tierSet.appendChild(h('label', { class: 'chip-tier-option' }, kids));
    });
    var tierErr = fieldError(errors.tier); if (tierErr) tierSet.appendChild(tierErr);
    container.appendChild(tierSet);
    container.appendChild(paidConsentRow);
    var paidConsentErr = fieldError(errors.paid_consent);
    if (paidConsentErr) container.appendChild(paidConsentErr);
    if (f.tier) onTierChange();

    // ---- loads wanted ----
    var loadsSelect = h('select', { id: 'cw-loads', onchange: function (e) { f.loads_wanted = e.target.value; } });
    loadsSelect.appendChild(h('option', { value: '' }, [COPY.loadsChoosePlaceholder]));
    Object.keys(COPY.loadsOptions).forEach(function (k) {
      loadsSelect.appendChild(h('option', { value: k }, [COPY.loadsOptions[k]]));
    });
    loadsSelect.value = f.loads_wanted;
    container.appendChild(labeledField('cw-loads', COPY.sectionLoads, loadsSelect, errors.loads_wanted, COPY.loadsHelp));

    // ---- drop notes ----
    var charsLeftNode = h('span', { class: 'chip-charcount' }, [COPY.charsLeft(500 - f.drop_notes.length)]);
    var notesArea = h('textarea', {
      id: 'cw-notes', maxlength: '500', rows: '3', placeholder: COPY.dropNotesPlaceholder,
      oninput: function (e) { f.drop_notes = e.target.value; charsLeftNode.textContent = COPY.charsLeft(500 - e.target.value.length); }
    });
    notesArea.value = f.drop_notes;
    container.appendChild(h('div', { class: 'field' }, [
      h('label', { for: 'cw-notes' }, [COPY.dropNotesLabel]),
      notesArea, charsLeftNode
    ]));

    // ---- photo (kept unless a new one is chosen, once one exists) ----
    container.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionPhoto]));
    var hasPhoto = !!(f.photoBlob || f.photoPreviewUrl);
    var photoHelp = hasPhoto && mode !== 'signup' && mode !== 'add' ? COPY.photoKeptHelp : COPY.photoRequiredHelp;
    container.appendChild(h('p', { class: 'chip-help' }, [photoHelp]));
    var previewImg = h('img', { class: 'chip-photo-preview', alt: COPY.photoPreviewAlt, hidden: !hasPhoto });
    previewImg.addEventListener('error', function () { previewImg.hidden = true; });
    if (f.photoPreviewUrl) previewImg.setAttribute('src', f.photoPreviewUrl);
    var photoStatus = h('p', { class: 'chip-help' }, ['']);
    var photoErrHolder = h('div', {}, [fieldError(errors.photo)]);
    var fileInput = h('input', {
      type: 'file', accept: 'image/*', capture: 'environment', id: 'cw-photo', style: 'display:none',
      onchange: function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        photoStatus.textContent = COPY.photoProcessing;
        processPhotoFile(file, function (err, blob, url) {
          photoStatus.textContent = '';
          if (err) { clear(photoErrHolder); photoErrHolder.appendChild(fieldError(COPY.photoUploadFailed)); return; }
          if (f.photoPreviewUrl && f.photoPreviewUrl.lastIndexOf('blob:', 0) === 0) URL.revokeObjectURL(f.photoPreviewUrl);
          f.photoBlob = blob; f.photoPreviewUrl = url; f.photoPath = null;
          clear(photoErrHolder);
          previewImg.setAttribute('src', url); previewImg.hidden = false;
          chooseBtn.textContent = COPY.photoRetakeButton;
        });
      }
    });
    var chooseBtn = h('button', {
      class: 'btn btn--outline', type: 'button', onclick: function () { fileInput.click(); }
    }, [hasPhoto ? COPY.photoRetakeButton : COPY.photoChooseButton]);
    container.appendChild(h('div', { class: 'chip-photo' }, [fileInput, chooseBtn, photoStatus, previewImg, photoErrHolder]));

    // ---- truck access ----
    var truckSet = h('fieldset', { class: 'chip-fieldset' }, [h('legend', {}, [COPY.truckAccessQuestion])]);
    var truckOpts = [['yes', COPY.truckAccessYes], ['no', COPY.truckAccessNo], ['not_sure', COPY.truckAccessNotSure]];
    var truckRow = h('div', { class: 'chip-radio-row' });
    truckOpts.forEach(function (pair) {
      var radio = h('input', {
        type: 'radio', name: 'cw-truck', checked: f.truck_access === pair[0],
        onchange: function () { f.truck_access = pair[0]; }
      });
      truckRow.appendChild(h('label', { class: 'chip-radio-row__opt' }, [radio, pair[1]]));
    });
    truckSet.appendChild(truckRow);
    var truckErr = fieldError(errors.truck_access); if (truckErr) truckSet.appendChild(truckErr);
    container.appendChild(truckSet);

    // ---- consents (asked on sign-up, adding a location, and rejoining — never on a plain edit) ----
    if (mode !== 'edit') {
      if (mode === 'rejoin') container.appendChild(h('p', { class: 'chip-banner chip-banner--info' }, [COPY.rejoinFormNote]));
      var consentSet = h('fieldset', { class: 'chip-fieldset' }, [h('legend', {}, [COPY.sectionConsents])]);
      [
        ['consent_mixed_ok', COPY.consentMixedOk],
        ['consent_stays_on_list', COPY.consentStaysOnList],
        ['consent_property_access', COPY.consentPropertyAccess],
        ['consent_photo_use', COPY.consentPhotoUse]
      ].forEach(function (pair) {
        var key = pair[0];
        var cb = h('input', { type: 'checkbox', checked: f[key], onchange: function (e) { f[key] = e.target.checked; } });
        consentSet.appendChild(h('label', { class: 'chip-consent' }, [cb, h('span', {}, [pair[1]])]));
      });
      var consentsErr = fieldError(errors.consents); if (consentsErr) consentSet.appendChild(consentsErr);
      container.appendChild(consentSet);
    }
  }

  function validateLocationForm(f, mode) {
    var e = {};
    if (!f.street.trim()) e.street = COPY.errorRequired;
    if (!f.city.trim()) e.city = COPY.errorRequired;
    if (!isValidZip(f.zip)) e.zip = COPY.errorZip;
    if (!f.pinSet || f.lat == null || f.lng == null) e.pin = COPY.errorPin;
    if (!f.tier) e.tier = COPY.errorTier;
    if (!f.loads_wanted) e.loads_wanted = COPY.errorLoads;
    if (!f.truck_access) e.truck_access = COPY.errorTruckAccess;
    if (mode !== 'edit') {
      if (!f.photoBlob && !f.photoPreviewUrl) e.photo = COPY.errorPhoto;
      if (!(f.consent_mixed_ok && f.consent_stays_on_list && f.consent_property_access && f.consent_photo_use)) e.consents = COPY.errorConsents;
    }
    var t = tierByKey(f.tier);
    if (t && t.price_per_drop > 0 && !f.paid_consent) e.paid_consent = COPY.errorPaidConsent;
    return e;
  }

  var FOCUS_ID_FOR_ERROR = { first_name: 'cw-first', last_name: 'cw-last', phone: 'cw-phone', street: 'cw-street', city: 'cw-city', zip: 'cw-zip', loads_wanted: 'cw-loads' };
  function focusFirstError(errors) {
    var order = ['first_name', 'last_name', 'phone', 'street', 'city', 'zip', 'pin', 'tier', 'loads_wanted', 'photo', 'truck_access', 'consents', 'paid_consent'];
    for (var i = 0; i < order.length; i++) {
      if (!errors[order[i]]) continue;
      var id = FOCUS_ID_FOR_ERROR[order[i]];
      var elNode = id && document.getElementById(id);
      if (elNode) elNode.focus();
      return;
    }
  }

  // ---------------------------------------------------------------- full sign-up form (0 locations)
  // The only screen that asks for name/phone — it creates the account and its first location
  // together. Everything location-specific is the same shared builder used everywhere else.
  function validateSignup(f) {
    var e = {};
    if (!f.first_name.trim()) e.first_name = COPY.errorRequired;
    if (!f.last_name.trim()) e.last_name = COPY.errorRequired;
    if (!isValidPhone(f.phone)) e.phone = COPY.errorPhone;
    var locErrors = validateLocationForm(f, 'signup');
    Object.keys(locErrors).forEach(function (k) { e[k] = locErrors[k]; });
    return e;
  }

  function renderSignupForm() {
    var f = STATE.form;
    var errors = f._errors || {};
    var wrap = h('div', { class: 'chip-card chip-card--signup' });
    wrap.appendChild(h('h1', {}, [COPY.signupTitle]));
    if (f._topError) wrap.appendChild(banner('error', f._topError));

    // ---- contact ----
    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionContact]));
    var firstInput = h('input', { type: 'text', id: 'cw-first', required: true, autocomplete: 'given-name', oninput: function (e) { f.first_name = e.target.value; } });
    firstInput.value = f.first_name;
    var lastInput = h('input', { type: 'text', id: 'cw-last', required: true, autocomplete: 'family-name', oninput: function (e) { f.last_name = e.target.value; } });
    lastInput.value = f.last_name;
    wrap.appendChild(h('div', { class: 'row' }, [
      labeledField('cw-first', COPY.firstNameLabel, firstInput, errors.first_name),
      labeledField('cw-last', COPY.lastNameLabel, lastInput, errors.last_name)
    ]));
    var phoneInput = h('input', { type: 'tel', id: 'cw-phone', required: true, autocomplete: 'tel', oninput: function (e) { f.phone = e.target.value; } });
    phoneInput.value = f.phone;
    wrap.appendChild(labeledField('cw-phone', COPY.phoneLabel, phoneInput, errors.phone));

    buildLocationFormFields(wrap, f, errors, 'signup');

    var submitBtn = h('button', { class: 'btn chip-submit', type: 'button', onclick: function () { onSubmitSignup(submitBtn); } }, [COPY.submitButton]);
    wrap.appendChild(submitBtn);

    mount(wrap);
    if (pendingMapInit) { pendingMapInit(); pendingMapInit = null; }
  }

  function onSubmitSignup(submitBtn) {
    var f = STATE.form;
    var errors = validateSignup(f);
    f._errors = errors;
    if (Object.keys(errors).length) { render(); focusFirstError(errors); return; }
    f._topError = null;
    submitBtn.disabled = true; submitBtn.textContent = COPY.submitting;
    var photoStep = f.photoPath ? Promise.resolve(f.photoPath) : API.uploadDropPhoto(null, f.photoBlob).then(function (path) { f.photoPath = path; return path; });
    photoStep.then(function (photoPath) {
      var payload = {
        first_name: f.first_name.trim(), last_name: f.last_name.trim(), phone: digitsOnly(f.phone),
        street: f.street.trim(), city: f.city.trim(), zip: f.zip.trim(),
        lat: f.lat, lng: f.lng,
        tier: f.tier, loads_wanted: f.loads_wanted, drop_notes: f.drop_notes.trim(),
        photo_path: photoPath, truck_access: f.truck_access,
        // Sent with the database's own column names (chip_customer_signup's v_allowed list) so the
        // Edge Function needs no key-mapping step: mixed_ok, stay_on_list_ack, property_access_ok,
        // photo_ok, paid_consent. These four checkboxes are already required by validateSignup()
        // above (e.consents) before submit is ever reachable, so `true` here reflects a real,
        // already-validated consent, not an assumption.
        mixed_ok: true, stay_on_list_ack: true,
        property_access_ok: true, photo_ok: true,
        paid_consent: f.paid_consent
      };
      return API.signup(payload, STATE.requestId);
    }).then(function (res) {
      var newCustomer = (res && res.customer) || null;
      captureJobberUrl(newCustomer);
      if (newCustomer) {
        STATE.customers = [newCustomer];
        STATE.profileUi = null;
        ensureProfileUi().justSignedUp = true;
        STATE.step = 'profile';
      } else {
        STATE.step = 'confirm';
      }
      render();
    }).catch(function (err) {
      submitBtn.disabled = false; submitBtn.textContent = COPY.submitButton;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      f._topError = err.message || COPY.genericError;
      render();
    });
  }

  function renderConfirmation() {
    mount(h('div', { class: 'chip-card' }, [
      h('h1', {}, [COPY.successTitle]),
      h('p', {}, [COPY.successBody1]),
      h('ul', { class: 'chip-list' }, [
        h('li', {}, [COPY.successBody2]),
        h('li', {}, [COPY.successBody3]),
        h('li', {}, [COPY.successBody4])
      ]),
      h('p', {}, ['Call ', officePhoneLink(), ' with questions.'])
    ]));
  }

  // ---------------------------------------------------------------- profile (one page, contact + every location)
  // Only one edit panel (contact, a location's Change, Add Another, or Get Back on the List) is
  // ever open at a time — opening one closes any other, which is also what keeps the singleton
  // MapWidget and the reused field ids safe (see buildLocationFormFields).
  function ensureProfileUi() {
    if (!STATE.profileUi) {
      STATE.profileUi = {
        justSignedUp: false,
        editingContact: false, contactForm: null, contactSaving: false, contactSaved: false,
        editingLocationId: null, editForm: null, editSaving: false,
        addingLocation: false, addForm: null, addSaving: false, addRequestId: null,
        rejoinLocationId: null, rejoinForm: null, rejoinSaving: false,
        locActions: {}
      };
    }
    return STATE.profileUi;
  }
  function closeAllEditPanels(ui) {
    ui.editingContact = false; ui.contactForm = null;
    ui.editingLocationId = null; ui.editForm = null;
    ui.addingLocation = false; ui.addForm = null; ui.addRequestId = null;
    ui.rejoinLocationId = null; ui.rejoinForm = null;
  }
  // Per-location UI state (pause/leave/confirm/banners) — keyed by location id, since each card
  // on the page acts independently.
  function locAction(ui, id) {
    if (!ui.locActions[id]) {
      ui.locActions[id] = {
        leaveOpen: false, leaveReason: '', leaving: false, pausing: false, error: null,
        justSaved: false, addressRecheck: false, justAdded: false, justRejoined: false
      };
    }
    return ui.locActions[id];
  }
  function activeLocationCount() {
    return (STATE.customers || []).filter(function (c) { return c.status !== 'left'; }).length;
  }
  function upsertCustomerInList(updated) {
    if (!updated) return;
    var list = STATE.customers || (STATE.customers = []);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === updated.id) { list[i] = updated; return; }
    }
    list.unshift(updated);
  }

  // The database stores loads as a number, or null for "as many as you can give me"; the <select> uses
  // the COPY.loadsOptions keys. 10+ shows as "10 or more" (the server maps ten_plus -> 10).
  function loadsKeyFor(v) {
    if (v == null || v === '') return 'as_many_as_possible';
    var n = Number(v);
    if (n >= 10) return 'ten_plus';
    return COPY.loadsOptions[String(n)] ? String(n) : String(v);
  }

  function tierDisplayText(key) {
    var t = tierByKey(key);
    if (!t) return key || '';
    return t.name + ' — ' + (t.price_per_drop > 0 ? ('$' + t.price_per_drop) : COPY.tierFreeLabel);
  }
  function truckDisplayText(v) {
    if (v === 'yes') return COPY.truckAccessYes;
    if (v === 'no') return COPY.truckAccessNo;
    return COPY.truckAccessNotSure;
  }

  // A single "Label: value" line inside a profile card. Falls back to an em dash, same convention the
  // old read-only <dl> used, so an empty field still reads as "nothing here yet" rather than blank.
  function profileField(label, value) {
    return h('p', { class: 'chip-profile-field' }, [
      h('span', { class: 'chip-profile-field__label' }, [label + ': ']),
      h('span', { class: 'chip-profile-field__value' }, [value || '—'])
    ]);
  }

  // One profile card: a title, its own "Change" button, then whatever body nodes the caller built.
  function profileCard(title, bodyNodes, onChange) {
    var card = h('div', { class: 'chip-profile-card' });
    card.appendChild(h('div', { class: 'chip-profile-card__head' }, [
      h('h3', {}, [title]),
      h('button', { class: 'btn btn--outline chip-profile-card__change', type: 'button', onclick: onChange }, [COPY.changeButton])
    ]));
    (bodyNodes || []).forEach(function (n) { if (n) card.appendChild(n); });
    return card;
  }

  // A "YYYY-MM-DD" drop date is a calendar day, not an instant — anchoring it at noon UTC before
  // formatting in America/Denver keeps it on that same calendar day regardless of the viewer's own
  // timezone or Denver's DST offset (midnight UTC would roll back a day in some zones).
  function denverDateLabel(ymd) {
    if (!ymd) return null;
    var parts = String(ymd).split('-');
    var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
    if (!y || !m || !d) return null;
    var dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    try {
      return dt.toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }

  // ---- contact card (account-wide: name, email (read-only — it's the sign-in), phone) ----
  function openContactEdit() {
    var ui = ensureProfileUi();
    closeAllEditPanels(ui);
    var account = (STATE.customers && STATE.customers[0]) || {};
    ui.editingContact = true;
    ui.contactForm = { first_name: account.first_name || '', last_name: account.last_name || '', phone: account.phone || '', _errors: {}, _topError: null };
    render();
  }
  function validateContactForm(f) {
    var e = {};
    if (!f.first_name.trim()) e.first_name = COPY.errorRequired;
    if (!f.last_name.trim()) e.last_name = COPY.errorRequired;
    if (!isValidPhone(f.phone)) e.phone = COPY.errorPhone;
    return e;
  }
  function onSaveContact(saveBtn) {
    var ui = ensureProfileUi();
    var f = ui.contactForm;
    var errors = validateContactForm(f);
    f._errors = errors;
    if (Object.keys(errors).length) { render(); focusFirstError(errors); return; }
    f._topError = null;
    ui.contactSaving = true; render();
    API.updateContact({ first_name: f.first_name.trim(), last_name: f.last_name.trim(), phone: digitsOnly(f.phone) }).then(function (res) {
      var ui2 = ensureProfileUi();
      ui2.contactSaving = false; ui2.editingContact = false; ui2.contactForm = null; ui2.contactSaved = true;
      var customers = customersFromMeResponse(res);
      if (customers.length) STATE.customers = customers;
      render();
    }).catch(function (err) {
      ui.contactSaving = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      f._topError = err.message || COPY.genericError;
      render();
    });
  }
  function renderContactCard(ui, account) {
    if (ui.editingContact) return renderContactEditCard(ui);
    var body = [];
    if (ui.contactSaved) { body.push(banner('success', COPY.saveSuccessMessage)); ui.contactSaved = false; }
    body.push(profileField(COPY.fieldReadLabels.name, ((account.first_name || '') + ' ' + (account.last_name || '')).trim()));
    body.push(profileField(COPY.fieldReadLabels.email, account.email));
    body.push(profileField(COPY.fieldReadLabels.phone, account.phone));
    return profileCard(COPY.cardContactTitle, body, function () { openContactEdit(); });
  }
  function renderContactEditCard(ui) {
    var f = ui.contactForm;
    var errors = f._errors || {};
    var card = h('div', { class: 'chip-profile-card chip-profile-card--editing' });
    card.appendChild(h('h3', {}, [COPY.cardContactTitle]));
    if (f._topError) card.appendChild(banner('error', f._topError));
    var firstInput = h('input', { type: 'text', id: 'cw-first', required: true, autocomplete: 'given-name', oninput: function (e) { f.first_name = e.target.value; } });
    firstInput.value = f.first_name;
    var lastInput = h('input', { type: 'text', id: 'cw-last', required: true, autocomplete: 'family-name', oninput: function (e) { f.last_name = e.target.value; } });
    lastInput.value = f.last_name;
    card.appendChild(h('div', { class: 'row' }, [
      labeledField('cw-first', COPY.firstNameLabel, firstInput, errors.first_name),
      labeledField('cw-last', COPY.lastNameLabel, lastInput, errors.last_name)
    ]));
    var phoneInput = h('input', { type: 'tel', id: 'cw-phone', required: true, autocomplete: 'tel', oninput: function (e) { f.phone = e.target.value; } });
    phoneInput.value = f.phone;
    card.appendChild(labeledField('cw-phone', COPY.phoneLabel, phoneInput, errors.phone));
    var saveBtn = h('button', { class: 'btn', type: 'button', onclick: function () { onSaveContact(saveBtn); } }, [ui.contactSaving ? COPY.savingButton : COPY.saveButton]);
    var cancelBtn = h('button', {
      class: 'btn btn--outline', type: 'button',
      onclick: function () { var ui2 = ensureProfileUi(); ui2.editingContact = false; ui2.contactForm = null; render(); }
    }, [COPY.cancelButton]);
    card.appendChild(h('div', { class: 'chip-actions' }, [saveBtn, cancelBtn]));
    return card;
  }

  // ---- add a location ----
  function openAddLocation() {
    var ui = ensureProfileUi();
    closeAllEditPanels(ui);
    ui.addingLocation = true;
    ui.addForm = freshLocationForm();
    ui.addRequestId = API.newRequestId();
    render();
  }
  function onSubmitAddLocation(submitBtn) {
    var ui = ensureProfileUi();
    var f = ui.addForm;
    var errors = validateLocationForm(f, 'add');
    f._errors = errors;
    if (Object.keys(errors).length) { render(); focusFirstError(errors); return; }
    f._topError = null;
    ui.addSaving = true; render();
    var account = (STATE.customers && STATE.customers[0]) || {};
    var photoStep = f.photoPath ? Promise.resolve(f.photoPath) : API.uploadDropPhoto(null, f.photoBlob).then(function (path) { f.photoPath = path; return path; });
    photoStep.then(function (photoPath) {
      var payload = {
        first_name: account.first_name || '', last_name: account.last_name || '', phone: account.phone || '',
        street: f.street.trim(), city: f.city.trim(), zip: f.zip.trim(),
        lat: f.lat, lng: f.lng,
        tier: f.tier, loads_wanted: f.loads_wanted, drop_notes: f.drop_notes.trim(),
        photo_path: photoPath, truck_access: f.truck_access,
        mixed_ok: true, stay_on_list_ack: true, property_access_ok: true, photo_ok: true,
        paid_consent: f.paid_consent
      };
      return API.signup(payload, ui.addRequestId);
    }).then(function (res) {
      var ui2 = ensureProfileUi();
      ui2.addSaving = false; ui2.addingLocation = false; ui2.addForm = null; ui2.addRequestId = null;
      var newCustomer = (res && res.customer) || null;
      captureJobberUrl(newCustomer);
      if (newCustomer) {
        upsertCustomerInList(newCustomer);
        locAction(ui2, newCustomer.id).justAdded = true;
      }
      render();
    }).catch(function (err) {
      ui.addSaving = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      f._topError = err.message || COPY.genericError;
      render();
    });
  }
  function renderAddLocationControl(ui) {
    if (ui.addingLocation) return renderAddLocationCard(ui);
    var disabled = activeLocationCount() >= 5;
    var wrap = h('div', { class: 'chip-add-location' });
    wrap.appendChild(h('button', {
      class: 'btn btn--outline', type: 'button', disabled: disabled,
      onclick: function () { if (!disabled) openAddLocation(); }
    }, [COPY.addLocationButton]));
    if (disabled) wrap.appendChild(h('p', { class: 'chip-help' }, [COPY.maxLocationsNote]));
    return wrap;
  }
  function renderAddLocationCard(ui) {
    var f = ui.addForm;
    var errors = f._errors || {};
    var card = h('div', { class: 'chip-profile-card chip-profile-card--editing' });
    card.appendChild(h('h3', {}, [COPY.addLocationFormTitle]));
    if (f._topError) card.appendChild(banner('error', f._topError));
    buildLocationFormFields(card, f, errors, 'add');
    var submitBtn = h('button', { class: 'btn chip-submit', type: 'button', onclick: function () { onSubmitAddLocation(submitBtn); } }, [ui.addSaving ? COPY.submitting : COPY.addLocationSubmitButton]);
    var cancelBtn = h('button', {
      class: 'btn btn--outline', type: 'button',
      onclick: function () { var ui2 = ensureProfileUi(); ui2.addingLocation = false; ui2.addForm = null; ui2.addRequestId = null; render(); }
    }, [COPY.cancelButton]);
    card.appendChild(h('div', { class: 'chip-actions chip-actions--save-bar' }, [submitBtn, cancelBtn]));
    return card;
  }

  // ---- change an existing location ----
  function openLocationEdit(c) {
    var ui = ensureProfileUi();
    closeAllEditPanels(ui);
    ui.editingLocationId = c.id;
    ui.editForm = initLocationFormFromCustomer(c);
    render();
  }
  function onSaveLocation(id, saveBtn) {
    var ui = ensureProfileUi();
    var f = ui.editForm;
    var errors = validateLocationForm(f, 'edit');
    f._errors = errors;
    if (Object.keys(errors).length) { render(); focusFirstError(errors); return; }
    f._topError = null;
    ui.editSaving = true; render();
    var photoStep = f.photoBlob ? API.uploadDropPhoto(id, f.photoBlob).then(function (p) { f.photoPath = p; return p; }) : Promise.resolve(null);
    photoStep.then(function (photoPath) {
      var changes = {
        street: f.street.trim(), city: f.city.trim(), zip: f.zip.trim(), lat: f.lat, lng: f.lng,
        tier: f.tier, loads_wanted: f.loads_wanted, drop_notes: f.drop_notes.trim(), truck_access: f.truck_access
      };
      if (photoPath) changes.photo_path = photoPath;
      return API.update(id, changes, f.paid_consent);
    }).then(function (res) {
      var ui2 = ensureProfileUi();
      ui2.editSaving = false; ui2.editingLocationId = null; ui2.editForm = null;
      var updated = (res && res.customer) || null;
      captureJobberUrl(updated);
      if (updated) upsertCustomerInList(updated);
      var la = locAction(ui2, id);
      la.justSaved = true; la.addressRecheck = !!(res && res.recheck);
      render();
    }).catch(function (err) {
      ui.editSaving = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      f._topError = err.message || COPY.genericError;
      render();
    });
  }
  function renderLocationEditCard(ui, c) {
    var f = ui.editForm;
    var errors = f._errors || {};
    var card = h('div', { class: 'chip-profile-card chip-profile-card--editing' });
    card.appendChild(h('h3', {}, [[c.street, c.city, c.zip].filter(Boolean).join(', ') || COPY.editButton]));
    if (f._topError) card.appendChild(banner('error', f._topError));
    buildLocationFormFields(card, f, errors, 'edit');
    var saveBtn = h('button', { class: 'btn chip-submit', type: 'button', onclick: function () { onSaveLocation(c.id, saveBtn); } }, [ui.editSaving ? COPY.savingButton : COPY.saveButton]);
    var cancelBtn = h('button', {
      class: 'btn btn--outline', type: 'button',
      onclick: function () { var ui2 = ensureProfileUi(); ui2.editingLocationId = null; ui2.editForm = null; render(); }
    }, [COPY.cancelButton]);
    card.appendChild(h('div', { class: 'chip-actions chip-actions--save-bar' }, [saveBtn, cancelBtn]));
    return card;
  }

  // ---- pause / start again, remove (leave) ----
  function onPauseLocation(c, resume) {
    var ui = ensureProfileUi();
    var la = locAction(ui, c.id);
    la.pausing = true; la.error = null; render();
    API.update(c.id, resume ? { resume: true } : { pause: true }, false).then(function (res) {
      var ui2 = ensureProfileUi(); var la2 = locAction(ui2, c.id);
      la2.pausing = false;
      var updated = (res && res.customer) || null;
      captureJobberUrl(updated);
      if (updated) upsertCustomerInList(updated);
      render();
    }).catch(function (err) {
      var la2 = locAction(ensureProfileUi(), c.id);
      la2.pausing = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      la2.error = err.message || COPY.genericError;
      render();
    });
  }
  function onLeaveLocation(c) {
    var ui = ensureProfileUi();
    var la = locAction(ui, c.id);
    la.leaving = true; la.error = null; render();
    API.leave(c.id, la.leaveReason.trim()).then(function (res) {
      var ui2 = ensureProfileUi(); var la2 = locAction(ui2, c.id);
      la2.leaving = false; la2.leaveOpen = false; la2.leaveReason = '';
      var updated = (res && res.customer) || null;
      captureJobberUrl(updated);
      if (updated) upsertCustomerInList(updated);
      render();
    }).catch(function (err) {
      var la2 = locAction(ensureProfileUi(), c.id);
      la2.leaving = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      la2.error = err.message || COPY.genericError;
      render();
    });
  }
  function renderLeaveConfirmFor(c, la) {
    var reasonInput = h('textarea', { rows: '2', oninput: function (e) { la.leaveReason = e.target.value; } });
    reasonInput.value = la.leaveReason;
    return h('div', { class: 'chip-confirm' }, [
      h('h3', {}, [COPY.leaveConfirmTitle]),
      h('p', {}, [COPY.leaveConfirmBody]),
      h('div', { class: 'field' }, [h('label', {}, [COPY.leaveReasonLabel]), reasonInput]),
      h('div', { class: 'chip-actions' }, [
        h('button', { class: 'btn', type: 'button', onclick: function () { onLeaveLocation(c); } }, [la.leaving ? COPY.leavingButton : COPY.leaveConfirmButton]),
        h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { la.leaveOpen = false; render(); } }, [COPY.leaveCancelButton])
      ])
    ]);
  }

  // ---- rejoin (a 'left' location only) ----
  function openRejoin(c) {
    var ui = ensureProfileUi();
    closeAllEditPanels(ui);
    ui.rejoinLocationId = c.id;
    ui.rejoinForm = initLocationFormFromCustomer(c);
    render();
  }
  function onSubmitRejoin(id, submitBtn) {
    var ui = ensureProfileUi();
    var f = ui.rejoinForm;
    var errors = validateLocationForm(f, 'rejoin');
    f._errors = errors;
    if (Object.keys(errors).length) { render(); focusFirstError(errors); return; }
    f._topError = null;
    ui.rejoinSaving = true; render();
    var account = (STATE.customers && STATE.customers[0]) || {};
    var photoStep = f.photoBlob ? API.uploadDropPhoto(id, f.photoBlob).then(function (p) { f.photoPath = p; return p; }) : Promise.resolve(null);
    photoStep.then(function (photoPath) {
      var payload = {
        first_name: account.first_name || '', last_name: account.last_name || '', phone: account.phone || '',
        street: f.street.trim(), city: f.city.trim(), zip: f.zip.trim(), lat: f.lat, lng: f.lng,
        tier: f.tier, loads_wanted: f.loads_wanted, drop_notes: f.drop_notes.trim(), truck_access: f.truck_access,
        mixed_ok: true, stay_on_list_ack: true, property_access_ok: true, photo_ok: true,
        paid_consent: f.paid_consent
      };
      if (photoPath) payload.photo_path = photoPath;
      return API.rejoin(id, payload, f.paid_consent);
    }).then(function (res) {
      var ui2 = ensureProfileUi();
      ui2.rejoinSaving = false; ui2.rejoinLocationId = null; ui2.rejoinForm = null;
      var updated = (res && res.customer) || null;
      captureJobberUrl(updated);
      if (updated) upsertCustomerInList(updated);
      locAction(ui2, id).justRejoined = true;
      render();
    }).catch(function (err) {
      ui.rejoinSaving = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      f._topError = err.message || COPY.genericError;
      render();
    });
  }
  function renderRejoinCard(ui, c) {
    var f = ui.rejoinForm;
    var errors = f._errors || {};
    var card = h('div', { class: 'chip-profile-card chip-profile-card--editing' });
    card.appendChild(h('h3', {}, [COPY.rejoinFormTitle]));
    if (f._topError) card.appendChild(banner('error', f._topError));
    buildLocationFormFields(card, f, errors, 'rejoin');
    var submitBtn = h('button', { class: 'btn chip-submit', type: 'button', onclick: function () { onSubmitRejoin(c.id, submitBtn); } }, [ui.rejoinSaving ? COPY.submitting : COPY.rejoinSubmitButton]);
    var cancelBtn = h('button', {
      class: 'btn btn--outline', type: 'button',
      onclick: function () { var ui2 = ensureProfileUi(); ui2.rejoinLocationId = null; ui2.rejoinForm = null; render(); }
    }, [COPY.cancelButton]);
    card.appendChild(h('div', { class: 'chip-actions chip-actions--save-bar' }, [submitBtn, cancelBtn]));
    return card;
  }

  // ---- one location's read-only card (address, status, plan, notes, photos, drop history, actions) ----
  function renderLocationSection(ui, c) {
    if (ui.editingLocationId === c.id) return renderLocationEditCard(ui, c);
    if (ui.rejoinLocationId === c.id) return renderRejoinCard(ui, c);

    var la = locAction(ui, c.id);
    var statusKey = c.status || 'pending';
    var card = h('div', { class: 'chip-profile-card chip-location-section' });

    var head = h('div', { class: 'chip-profile-card__head' }, [
      h('h3', {}, [[c.street, c.city, c.zip].filter(Boolean).join(', ') || COPY.cardDropSpotTitle])
    ]);
    if (statusKey !== 'left') {
      head.appendChild(h('button', { class: 'btn btn--outline chip-profile-card__change', type: 'button', onclick: function () { openLocationEdit(c); } }, [COPY.changeButton]));
    }
    card.appendChild(head);

    if (la.justSaved) { card.appendChild(banner('success', COPY.saveSuccessMessage)); la.justSaved = false; }
    if (la.addressRecheck) { card.appendChild(banner('info', COPY.addressChangedNotice)); la.addressRecheck = false; }
    if (la.justAdded) { card.appendChild(banner('info', COPY.locationAddedNote)); la.justAdded = false; }
    if (la.justRejoined) { card.appendChild(banner('info', COPY.rejoinSuccessBody)); la.justRejoined = false; }
    if (la.error) card.appendChild(banner('error', la.error));

    card.appendChild(h('p', { class: 'chip-location-status chip-location-status--' + statusKey }, [COPY.statusLabels[statusKey] || statusKey]));
    var helpTxt = (COPY.statusHelp && COPY.statusHelp[statusKey]) || '';
    if (helpTxt) card.appendChild(h('p', { class: 'chip-help' }, [helpTxt]));

    if (typeof c.lat === 'number' && typeof c.lng === 'number') {
      card.appendChild(h('p', {}, [
        h('a', { href: 'https://www.google.com/maps/search/?api=1&query=' + c.lat + ',' + c.lng, target: '_blank', rel: 'noopener' }, [COPY.mapLinkText])
      ]));
    }

    card.appendChild(h('h4', {}, [COPY.cardPlanTitle]));
    card.appendChild(profileField(COPY.fieldReadLabels.tier, tierDisplayText(c.tier)));
    card.appendChild(profileField(COPY.fieldReadLabels.loads_wanted, COPY.loadsOptions[loadsKeyFor(c.loads_wanted)] || c.loads_wanted));
    card.appendChild(profileField(COPY.fieldReadLabels.truck_access, truckDisplayText(c.truck_access)));

    card.appendChild(h('h4', {}, [COPY.cardNotesTitle]));
    card.appendChild(h('p', {}, [c.drop_notes || '—']));

    card.appendChild(h('h4', {}, [COPY.photosTitle]));
    if (c.photos && c.photos.length) {
      var photoGrid = h('div', { class: 'chip-photo-grid' });
      c.photos.forEach(function (p) { photoGrid.appendChild(h('img', { src: p.url, alt: COPY.photoPreviewAlt, loading: 'lazy' })); });
      card.appendChild(photoGrid);
    } else {
      card.appendChild(h('p', { class: 'chip-help' }, [COPY.noPhotosText]));
    }

    // ---- Your Chip Drops: what the crew has actually delivered, read only ----
    card.appendChild(h('h4', {}, [COPY.cardDropsTitle]));
    var loadsDelivered = typeof c.loads_delivered === 'number' ? c.loads_delivered : 0;
    var loadsWantedIsNumber = typeof c.loads_wanted === 'number';
    card.appendChild(h('p', { class: 'chip-drops-count' }, [COPY.loadsDeliveredCount(loadsDelivered, loadsWantedIsNumber ? c.loads_wanted : null)]));
    if (!loadsWantedIsNumber) card.appendChild(h('p', { class: 'chip-help' }, [COPY.loadsDeliveredAsManyNote]));
    var lastDropLabel = denverDateLabel(c.last_drop);
    if (lastDropLabel) card.appendChild(profileField(COPY.fieldReadLabels.lastDrop, lastDropLabel));
    if (c.drops && c.drops.length) {
      var dropsList = h('ul', { class: 'chip-drops-list' });
      c.drops.forEach(function (d) {
        var dateLabel = denverDateLabel(d.dropped_on) || d.dropped_on;
        dropsList.appendChild(h('li', {}, [COPY.dropLineText(dateLabel, d.loads)]));
      });
      card.appendChild(dropsList);
    } else {
      card.appendChild(h('p', { class: 'chip-help' }, [COPY.noDropsYetText]));
    }

    // ---- actions ----
    var actions = h('div', { class: 'chip-actions chip-location-actions' });
    if (statusKey === 'left') {
      actions.appendChild(h('button', { class: 'btn', type: 'button', onclick: function () { openRejoin(c); } }, [COPY.rejoinButton]));
    } else {
      if (statusKey === 'active') {
        actions.appendChild(h('button', {
          class: 'btn btn--outline', type: 'button', onclick: function () { onPauseLocation(c, false); }
        }, [la.pausing ? COPY.pausing : COPY.pauseButton]));
      } else if (statusKey === 'paused') {
        actions.appendChild(h('button', {
          class: 'btn', type: 'button', onclick: function () { onPauseLocation(c, true); }
        }, [la.pausing ? COPY.resuming : COPY.resumeButton]));
      }
      actions.appendChild(h('button', {
        class: 'btn btn--outline chip-btn-danger', type: 'button', onclick: function () { la.leaveOpen = true; render(); }
      }, [COPY.leaveButton]));
    }
    card.appendChild(actions);
    if (la.leaveOpen) card.appendChild(renderLeaveConfirmFor(c, la));

    return card;
  }

  function renderProfile() {
    var ui = ensureProfileUi();
    var customers = STATE.customers || [];
    var account = customers[0] || {};
    var wrap = h('div', { class: 'chip-card chip-card--profile' });

    if (ui.justSignedUp) {
      wrap.appendChild(h('div', { class: 'chip-banner chip-banner--info chip-welcome' }, [
        h('strong', {}, [COPY.successTitle]),
        h('p', {}, [COPY.successBody2 + ' ' + COPY.successBody3]),
        h('p', {}, [COPY.profileSavedNote])
      ]));
      ui.justSignedUp = false;
    }

    wrap.appendChild(h('h1', { class: 'chip-profile-greeting' }, [COPY.profileGreeting(account.first_name)]));
    wrap.appendChild(h('p', { class: 'chip-profile-greeting-sub' }, [COPY.profileGreetingSub]));

    wrap.appendChild(renderContactCard(ui, account));

    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.requestsSectionTitle]));
    var grid = h('div', { class: 'chip-locations-grid' });
    customers.forEach(function (c) { grid.appendChild(renderLocationSection(ui, c)); });
    wrap.appendChild(grid);

    wrap.appendChild(renderAddLocationControl(ui));

    // jobber_hub_url only ever arrives on a singular `customer` reply, never inside customers[] —
    // captureJobberUrl() picks it up as we see it. Hide the link until we actually have one rather
    // than guess at a URL.
    if (STATE.jobberHubUrl) {
      wrap.appendChild(h('p', { class: 'chip-profile-jobber' }, [
        h('a', { class: 'btn btn--outline', href: STATE.jobberHubUrl, target: '_blank', rel: 'noopener' }, [COPY.viewJobberButton])
      ]));
    }

    mount(wrap);
    if (pendingMapInit) { pendingMapInit(); pendingMapInit = null; }
  }

  // ---------------------------------------------------------------- boot
  function render() {
    if (STATE.step === 'loading') return renderLoading();
    if (STATE.step === 'closed') return renderClosed();
    if (STATE.step === 'email' || STATE.step === 'code') return renderEmailStep();
    if (STATE.step === 'signup') return renderSignupForm();
    if (STATE.step === 'confirm') return renderConfirmation();
    if (STATE.step === 'profile') return renderProfile();
    return renderFatal(STATE.error);
  }

  async function boot() {
    try {
      var t = await API.tiers();
      STATE.tiers = t.tiers || [];
    } catch (e) {
      if (e.kind === 'closed') { STATE.step = 'closed'; return render(); }
      STATE.step = 'fatal'; STATE.error = e.message; return render();
    }
    if (API.hasSession()) {
      try {
        var meRes = await API.me();
        routeAfterAuth(meRes);
        return render();
      } catch (e) {
        if (e.kind === 'closed') { STATE.step = 'closed'; return render(); }
        // A dead/expired session with no working refresh — fall back to signing in again.
        API.clearSession();
      }
    }
    STATE.step = 'email';
    render();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
