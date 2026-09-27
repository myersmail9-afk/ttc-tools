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
        else if (k === 'checked' || k === 'disabled' || k === 'required') { if (v) e.setAttribute(k, ''); }
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
    customer: null,
    error: null,
    form: null,              // the in-progress sign-up/edit form data (see freshForm())
    requestId: null
  };

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
      paid_consent: false
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
  // single small-circle marker instead of numbered pins, matching the spec for this page.
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
          cb(null, blob, URL.createObjectURL(blob));
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
      wrap.appendChild(h('p', {}, [COPY.introP1]));
      wrap.appendChild(h('p', {}, [COPY.introP2]));
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

  function submitVerifyCode() {
    if (!/^\d{6}$/.test(emailUi.code)) { emailUi.codeError = COPY.invalidCodeError; return render(); }
    emailUi.verifying = true; emailUi.codeError = null; render();
    API.verifyCode(STATE.email, emailUi.code).then(function () {
      return API.me();
    }).then(function (meRes) {
      emailUi.verifying = false;
      if (meRes.customer) { STATE.customer = meRes.customer; STATE.step = 'profile'; return render(); }
      STATE.form = freshForm(); STATE.requestId = API.newRequestId(); STATE.step = 'signup'; render();
    }).catch(function (err) {
      emailUi.verifying = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      emailUi.codeError = err.message || COPY.invalidCodeError;
      render();
    });
  }

  // ---------------------------------------------------------------- sign-up form (step d)
  function labeledField(id, labelText, inputEl, errorMsg, helpText) {
    var kids = [h('label', { for: id }, [labelText]), inputEl];
    if (helpText) kids.push(h('p', { class: 'chip-help' }, [helpText]));
    var err = fieldError(errorMsg);
    if (err) kids.push(err);
    return h('div', { class: 'field' }, kids);
  }

  function renderSignupForm() {
    var f = STATE.form;
    var errors = f._errors || {};
    var wrap = h('div', { class: 'chip-card' });
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

    // ---- address ----
    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionAddress]));
    var streetInput = h('input', { type: 'text', id: 'cw-street', required: true, autocomplete: 'address-line1', oninput: function (e) { f.street = e.target.value; } });
    streetInput.value = f.street;
    wrap.appendChild(labeledField('cw-street', COPY.streetLabel, streetInput, errors.street));
    var cityInput = h('input', { type: 'text', id: 'cw-city', required: true, autocomplete: 'address-level2', oninput: function (e) { f.city = e.target.value; } });
    cityInput.value = f.city;
    var zipInput = h('input', { type: 'text', id: 'cw-zip', required: true, inputmode: 'numeric', maxlength: '5', autocomplete: 'postal-code', oninput: function (e) { f.zip = e.target.value; } });
    zipInput.value = f.zip;
    wrap.appendChild(h('div', { class: 'row' }, [
      labeledField('cw-city', COPY.cityLabel, cityInput, errors.city),
      labeledField('cw-zip', COPY.zipLabel, zipInput, errors.zip)
    ]));

    var addressErrorNode = fieldError(null);
    var findBtn = h('button', {
      class: 'btn btn--outline', type: 'button', onclick: function () { onFindAddress(findBtn, addressErrorNode); }
    }, [COPY.findAddressButton]);
    wrap.appendChild(h('div', { class: 'chip-find-address' }, [
      findBtn,
      h('p', { class: 'chip-help' }, [COPY.findAddressHelp])
    ]));
    var addressErrorHolder = h('div', {}, []);
    wrap.appendChild(addressErrorHolder);

    // ---- map ----
    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionMap]));
    wrap.appendChild(h('p', { class: 'chip-map-hint' }, [COPY.mapHint]));
    var mapDiv = h('div', { class: 'chip-map', id: 'cw-map' });
    wrap.appendChild(mapDiv);
    wrap.appendChild(h('p', { class: 'chip-help' }, [COPY.mapHintTap]));
    var pinErr = fieldError(errors.pin);
    if (pinErr) wrap.appendChild(pinErr);

    appendSignupPart2(wrap, f, errors);

    mount(wrap);
    MapWidget.init(mapDiv, {
      lat: f.pinSet ? f.lat : null, lng: f.pinSet ? f.lng : null, draggable: true,
      onMove: function (lat, lng) { f.lat = lat; f.lng = lng; f.pinSet = true; }
    });

    function onFindAddress(btn) {
      if (!f.street.trim() || !f.city.trim() || !isValidZip(f.zip)) {
        clear(addressErrorHolder); addressErrorHolder.appendChild(fieldError(COPY.errorRequired));
        return;
      }
      btn.disabled = true; var was = btn.textContent; btn.textContent = COPY.finding;
      API.geocode(f.street.trim(), f.city.trim(), f.zip.trim()).then(function (res) {
        btn.disabled = false; btn.textContent = was;
        clear(addressErrorHolder);
        if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
          f.lat = res.lat; f.lng = res.lng; f.pinSet = true;
          MapWidget.setView(res.lat, res.lng, 18);
        } else {
          addressErrorHolder.appendChild(fieldError(COPY.errorAddressNotFound));
        }
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = was;
        if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
        clear(addressErrorHolder);
        addressErrorHolder.appendChild(fieldError(err.message || COPY.genericError));
      });
    }
  }

  function appendSignupPart2(wrap, f, errors) {
    // ---- tier ----
    var tierSet = h('fieldset', { class: 'chip-fieldset' }, [h('legend', {}, [COPY.sectionTier])]);
    var paidConsentRow, paidConsentText, paidConsentCheckbox;
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
    wrap.appendChild(tierSet);

    // ---- paid consent (only shown for a tier with a price; lives near tier, applied at submit) ----
    paidConsentText = h('span', {}, ['']);
    paidConsentCheckbox = h('input', { type: 'checkbox', onchange: function (e) { f.paid_consent = e.target.checked; } });
    paidConsentRow = h('label', { class: 'chip-consent', hidden: true }, [paidConsentCheckbox, paidConsentText]);
    var paidConsentErr = fieldError(errors.paid_consent);
    wrap.appendChild(paidConsentRow);
    if (paidConsentErr) wrap.appendChild(paidConsentErr);

    function onTierChange() {
      var t = tierByKey(f.tier);
      var isPaid = !!(t && t.price_per_drop > 0);
      paidConsentRow.hidden = !isPaid;
      if (!isPaid) { f.paid_consent = false; paidConsentCheckbox.checked = false; }
      else { paidConsentText.textContent = COPY.paidConsent(t.price_per_drop); }
    }
    if (f.tier) onTierChange();

    // ---- loads wanted ----
    var loadsSelect = h('select', { id: 'cw-loads', onchange: function (e) { f.loads_wanted = e.target.value; } });
    loadsSelect.appendChild(h('option', { value: '' }, [COPY.loadsChoosePlaceholder]));
    Object.keys(COPY.loadsOptions).forEach(function (k) {
      loadsSelect.appendChild(h('option', { value: k }, [COPY.loadsOptions[k]]));
    });
    loadsSelect.value = f.loads_wanted;
    wrap.appendChild(labeledField('cw-loads', COPY.sectionLoads, loadsSelect, errors.loads_wanted, COPY.loadsHelp));

    // ---- drop notes ----
    var charsLeftNode = h('span', { class: 'chip-charcount' }, [COPY.charsLeft(500 - f.drop_notes.length)]);
    var notesArea = h('textarea', {
      id: 'cw-notes', maxlength: '500', rows: '3', placeholder: COPY.dropNotesPlaceholder,
      oninput: function (e) { f.drop_notes = e.target.value; charsLeftNode.textContent = COPY.charsLeft(500 - e.target.value.length); }
    });
    notesArea.value = f.drop_notes;
    wrap.appendChild(h('div', { class: 'field' }, [
      h('label', { for: 'cw-notes' }, [COPY.dropNotesLabel]),
      notesArea, charsLeftNode
    ]));

    appendPhotoAndRest(wrap, f, errors);
  }

  function appendPhotoAndRest(wrap, f, errors) {
    // ---- photo ----
    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionPhoto]));
    wrap.appendChild(h('p', { class: 'chip-help' }, [COPY.photoRequiredHelp]));
    var previewImg = h('img', { class: 'chip-photo-preview', alt: COPY.photoPreviewAlt, hidden: !f.photoBlob });
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
          if (f.photoPreviewUrl) URL.revokeObjectURL(f.photoPreviewUrl);
          f.photoBlob = blob; f.photoPreviewUrl = url; f.photoPath = null;
          clear(photoErrHolder);
          previewImg.setAttribute('src', url); previewImg.hidden = false;
          chooseBtn.textContent = COPY.photoRetakeButton;
        });
      }
    });
    var chooseBtn = h('button', {
      class: 'btn btn--outline', type: 'button', onclick: function () { fileInput.click(); }
    }, [f.photoBlob ? COPY.photoRetakeButton : COPY.photoChooseButton]);
    wrap.appendChild(h('div', { class: 'chip-photo' }, [fileInput, chooseBtn, photoStatus, previewImg, photoErrHolder]));

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
    wrap.appendChild(truckSet);

    // ---- consents ----
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
    wrap.appendChild(consentSet);

    // ---- submit ----
    var submitBtn = h('button', { class: 'btn chip-submit', type: 'button', onclick: function () { onSubmitSignup(submitBtn); } }, [COPY.submitButton]);
    wrap.appendChild(submitBtn);
  }

  function validateSignup(f) {
    var e = {};
    if (!f.first_name.trim()) e.first_name = COPY.errorRequired;
    if (!f.last_name.trim()) e.last_name = COPY.errorRequired;
    if (!isValidPhone(f.phone)) e.phone = COPY.errorPhone;
    if (!f.street.trim()) e.street = COPY.errorRequired;
    if (!f.city.trim()) e.city = COPY.errorRequired;
    if (!isValidZip(f.zip)) e.zip = COPY.errorZip;
    if (!f.pinSet || f.lat == null || f.lng == null) e.pin = COPY.errorPin;
    if (!f.tier) e.tier = COPY.errorTier;
    if (!f.loads_wanted) e.loads_wanted = COPY.errorLoads;
    if (!f.photoBlob) e.photo = COPY.errorPhoto;
    if (!f.truck_access) e.truck_access = COPY.errorTruckAccess;
    if (!(f.consent_mixed_ok && f.consent_stays_on_list && f.consent_property_access && f.consent_photo_use)) e.consents = COPY.errorConsents;
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

  function onSubmitSignup(submitBtn) {
    var f = STATE.form;
    var errors = validateSignup(f);
    f._errors = errors;
    if (Object.keys(errors).length) { render(); focusFirstError(errors); return; }
    f._topError = null;
    submitBtn.disabled = true; submitBtn.textContent = COPY.submitting;
    var photoStep = f.photoPath ? Promise.resolve(f.photoPath) : API.uploadDropPhoto(f.photoBlob).then(function (path) { f.photoPath = path; return path; });
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
      STATE.customer = (res && res.customer) || null;
      STATE.step = 'confirm';
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

  // ---------------------------------------------------------------- profile (step e)
  // TODO(owner): confirm this is the correct Jobber Client Hub sign-in link before customers see
  // it. clienthub_id 5a7fcc26-6b73-4bec-a630-dd63f55352e9 comes from the work-request widget
  // already embedded on the homepage (working/src/pages/index.html); Jobber's client-facing
  // sign-in path may not be exactly this one — check Client Hub settings in the Jobber dashboard.
  var JOBBER_CLIENT_HUB_LOGIN_URL = 'https://clienthub.getjobber.com/client_hubs/5a7fcc26-6b73-4bec-a630-dd63f55352e9/login';

  function ensureProfileUi() {
    if (!STATE.profileUi) {
      STATE.profileUi = {
        editing: false, saving: false, error: null,
        leaveOpen: false, leaveReason: '', leaving: false, pausing: false,
        editForm: null, justSaved: false, addressRecheck: false
      };
    }
    return STATE.profileUi;
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

  function renderProfile() {
    var ui = ensureProfileUi();
    if (ui.editing) return renderProfileEdit();
    var c = STATE.customer || {};
    var justSaved = ui.justSaved, recheck = ui.addressRecheck;
    ui.justSaved = false; ui.addressRecheck = false;

    var statusKey = c.status || 'pending';
    var wrap = h('div', { class: 'chip-card' });
    wrap.appendChild(h('h1', {}, [COPY.profileTitle]));
    wrap.appendChild(h('p', { class: 'chip-status-pill chip-status-pill--' + statusKey }, [COPY.statusLabels[statusKey] || statusKey]));
    if (justSaved) wrap.appendChild(banner('info', COPY.saveSuccessMessage));
    if (recheck) wrap.appendChild(banner('info', COPY.addressChangedNotice));
    if (ui.error) wrap.appendChild(banner('error', ui.error));

    var dl = h('dl', { class: 'chip-readview' });
    function row(label, value) {
      dl.appendChild(h('dt', {}, [label]));
      dl.appendChild(h('dd', {}, [value || '—']));
    }
    row(COPY.fieldReadLabels.name, ((c.first_name || '') + ' ' + (c.last_name || '')).trim());
    row(COPY.fieldReadLabels.phone, c.phone);
    row(COPY.fieldReadLabels.address, [c.street, c.city, c.zip].filter(Boolean).join(', '));
    row(COPY.fieldReadLabels.tier, tierDisplayText(c.tier));
    row(COPY.fieldReadLabels.loads_wanted, COPY.loadsOptions[c.loads_wanted] || c.loads_wanted);
    row(COPY.fieldReadLabels.drop_notes, c.drop_notes);
    row(COPY.fieldReadLabels.truck_access, truckDisplayText(c.truck_access));
    wrap.appendChild(dl);

    if (typeof c.lat === 'number' && typeof c.lng === 'number') {
      wrap.appendChild(h('p', {}, [
        h('a', { href: 'https://www.google.com/maps/search/?api=1&query=' + c.lat + ',' + c.lng, target: '_blank', rel: 'noopener' }, [COPY.mapLinkText])
      ]));
    }

    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.photosTitle]));
    if (c.photos && c.photos.length) {
      var grid = h('div', { class: 'chip-photo-grid' });
      c.photos.forEach(function (p) { grid.appendChild(h('img', { src: p.url, alt: COPY.photoPreviewAlt, loading: 'lazy' })); });
      wrap.appendChild(grid);
    } else {
      wrap.appendChild(h('p', { class: 'chip-help' }, [COPY.noPhotosText]));
    }

    wrap.appendChild(h('p', {}, [
      h('a', { class: 'btn btn--outline', href: JOBBER_CLIENT_HUB_LOGIN_URL, target: '_blank', rel: 'noopener' }, [COPY.viewJobberButton])
    ]));

    if (statusKey === 'paused') wrap.appendChild(h('p', { class: 'chip-help' }, [COPY.pausedNote]));
    if (statusKey === 'left') wrap.appendChild(h('p', { class: 'chip-help' }, [COPY.leftNote]));

    var actions = h('div', { class: 'chip-actions' });
    actions.appendChild(h('button', {
      class: 'btn', type: 'button', onclick: function () { ui.editing = true; ui.editForm = initEditFormFromCustomer(c); render(); }
    }, [COPY.editButton]));
    if (statusKey !== 'left') {
      if (statusKey !== 'paused') {
        actions.appendChild(h('button', {
          class: 'btn btn--outline', type: 'button', onclick: onPause
        }, [ui.pausing ? COPY.pausing : COPY.pauseButton]));
      }
      actions.appendChild(h('button', {
        class: 'chip-linkbtn chip-linkbtn--danger', type: 'button', onclick: function () { ui.leaveOpen = true; render(); }
      }, [COPY.leaveButton]));
    }
    wrap.appendChild(actions);
    if (ui.leaveOpen) wrap.appendChild(renderLeaveConfirm(ui));

    mount(wrap);
  }

  function renderLeaveConfirm(ui) {
    var reasonInput = h('textarea', { id: 'cw-leave-reason', rows: '2', oninput: function (e) { ui.leaveReason = e.target.value; } });
    reasonInput.value = ui.leaveReason;
    return h('div', { class: 'chip-confirm' }, [
      h('h3', {}, [COPY.leaveConfirmTitle]),
      h('p', {}, [COPY.leaveConfirmBody]),
      h('div', { class: 'field' }, [h('label', { for: 'cw-leave-reason' }, [COPY.leaveReasonLabel]), reasonInput]),
      h('div', { class: 'chip-actions' }, [
        h('button', { class: 'btn', type: 'button', onclick: onLeave }, [ui.leaving ? COPY.leavingButton : COPY.leaveConfirmButton]),
        h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { ui.leaveOpen = false; render(); } }, [COPY.leaveCancelButton])
      ])
    ]);
  }

  function onPause() {
    var ui = ensureProfileUi();
    ui.pausing = true; ui.error = null; render();
    API.update({ status: 'paused' }, false).then(function (res) {
      ui.pausing = false;
      STATE.customer = (res && res.customer) || STATE.customer;
      render();
    }).catch(function (err) {
      ui.pausing = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      ui.error = err.message || COPY.genericError;
      render();
    });
  }

  function onLeave() {
    var ui = ensureProfileUi();
    ui.leaving = true; ui.error = null; render();
    API.leave(ui.leaveReason.trim()).then(function () {
      return API.me();
    }).then(function (meRes) {
      ui.leaving = false; ui.leaveOpen = false; ui.leaveReason = '';
      STATE.customer = meRes.customer || null;
      render();
    }).catch(function (err) {
      ui.leaving = false;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      ui.error = err.message || COPY.genericError;
      render();
    });
  }

  function initEditFormFromCustomer(c) {
    var hasPin = typeof c.lat === 'number' && typeof c.lng === 'number';
    return {
      first_name: c.first_name || '', last_name: c.last_name || '', phone: c.phone || '',
      street: c.street || '', city: c.city || '', zip: c.zip || '',
      lat: hasPin ? c.lat : null, lng: hasPin ? c.lng : null, pinSet: hasPin,
      tier: c.tier || '', loads_wanted: c.loads_wanted || '', drop_notes: c.drop_notes || '',
      photoBlob: null, photoPreviewUrl: (c.photos && c.photos[0] && c.photos[0].url) || null, photoPath: null,
      paid_consent: false,
      _errors: {}, _topError: null
    };
  }

  function validateEdit(f) {
    var e = {};
    if (!f.first_name.trim()) e.first_name = COPY.errorRequired;
    if (!f.last_name.trim()) e.last_name = COPY.errorRequired;
    if (!isValidPhone(f.phone)) e.phone = COPY.errorPhone;
    if (!f.street.trim()) e.street = COPY.errorRequired;
    if (!f.city.trim()) e.city = COPY.errorRequired;
    if (!isValidZip(f.zip)) e.zip = COPY.errorZip;
    if (!f.pinSet || f.lat == null || f.lng == null) e.pin = COPY.errorPin;
    if (!f.tier) e.tier = COPY.errorTier;
    if (!f.loads_wanted) e.loads_wanted = COPY.errorLoads;
    var t = tierByKey(f.tier);
    if (t && t.price_per_drop > 0 && !f.paid_consent) e.paid_consent = COPY.errorPaidConsent;
    return e;
  }

  function renderProfileEdit() {
    var ui = ensureProfileUi();
    var f = ui.editForm;
    var errors = f._errors || {};
    var wrap = h('div', { class: 'chip-card' });
    wrap.appendChild(h('h1', {}, [COPY.editButton]));
    if (f._topError) wrap.appendChild(banner('error', f._topError));

    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionContact]));
    var firstInput = h('input', { type: 'text', id: 'cw-first', required: true, oninput: function (e) { f.first_name = e.target.value; } });
    firstInput.value = f.first_name;
    var lastInput = h('input', { type: 'text', id: 'cw-last', required: true, oninput: function (e) { f.last_name = e.target.value; } });
    lastInput.value = f.last_name;
    wrap.appendChild(h('div', { class: 'row' }, [
      labeledField('cw-first', COPY.firstNameLabel, firstInput, errors.first_name),
      labeledField('cw-last', COPY.lastNameLabel, lastInput, errors.last_name)
    ]));
    var phoneInput = h('input', { type: 'tel', id: 'cw-phone', required: true, oninput: function (e) { f.phone = e.target.value; } });
    phoneInput.value = f.phone;
    wrap.appendChild(labeledField('cw-phone', COPY.phoneLabel, phoneInput, errors.phone));

    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionAddress]));
    var streetInput = h('input', { type: 'text', id: 'cw-street', required: true, oninput: function (e) { f.street = e.target.value; } });
    streetInput.value = f.street;
    wrap.appendChild(labeledField('cw-street', COPY.streetLabel, streetInput, errors.street));
    var cityInput = h('input', { type: 'text', id: 'cw-city', required: true, oninput: function (e) { f.city = e.target.value; } });
    cityInput.value = f.city;
    var zipInput = h('input', { type: 'text', id: 'cw-zip', required: true, inputmode: 'numeric', maxlength: '5', oninput: function (e) { f.zip = e.target.value; } });
    zipInput.value = f.zip;
    wrap.appendChild(h('div', { class: 'row' }, [
      labeledField('cw-city', COPY.cityLabel, cityInput, errors.city),
      labeledField('cw-zip', COPY.zipLabel, zipInput, errors.zip)
    ]));
    var addressErrorHolder = h('div', {}, []);
    var findBtn = h('button', { class: 'btn btn--outline', type: 'button' }, [COPY.findAddressButton]);
    findBtn.addEventListener('click', function () {
      if (!f.street.trim() || !f.city.trim() || !isValidZip(f.zip)) {
        clear(addressErrorHolder); addressErrorHolder.appendChild(fieldError(COPY.errorRequired)); return;
      }
      findBtn.disabled = true; var was = findBtn.textContent; findBtn.textContent = COPY.finding;
      API.geocode(f.street.trim(), f.city.trim(), f.zip.trim()).then(function (res) {
        findBtn.disabled = false; findBtn.textContent = was; clear(addressErrorHolder);
        if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
          f.lat = res.lat; f.lng = res.lng; f.pinSet = true;
          MapWidget.setView(res.lat, res.lng, 18);
        } else {
          addressErrorHolder.appendChild(fieldError(COPY.errorAddressNotFound));
        }
      }).catch(function (err) {
        findBtn.disabled = false; findBtn.textContent = was;
        if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
        clear(addressErrorHolder); addressErrorHolder.appendChild(fieldError(err.message || COPY.genericError));
      });
    });
    wrap.appendChild(h('div', { class: 'chip-find-address' }, [findBtn, h('p', { class: 'chip-help' }, [COPY.findAddressHelp])]));
    wrap.appendChild(addressErrorHolder);

    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionMap]));
    wrap.appendChild(h('p', { class: 'chip-map-hint' }, [COPY.mapHint]));
    var mapDiv = h('div', { class: 'chip-map', id: 'cw-map' });
    wrap.appendChild(mapDiv);
    wrap.appendChild(h('p', { class: 'chip-help' }, [COPY.mapHintTap]));
    var pinErr = fieldError(errors.pin); if (pinErr) wrap.appendChild(pinErr);

    appendEditPart2(wrap, f, errors);

    mount(wrap);
    MapWidget.init(mapDiv, {
      lat: f.pinSet ? f.lat : null, lng: f.pinSet ? f.lng : null, draggable: true,
      onMove: function (lat, lng) { f.lat = lat; f.lng = lng; f.pinSet = true; }
    });
  }

  function appendEditPart2(wrap, f, errors) {
    var tierSet = h('fieldset', { class: 'chip-fieldset' }, [h('legend', {}, [COPY.sectionTier])]);
    var paidConsentText = h('span', {}, ['']);
    var paidConsentCheckbox = h('input', { type: 'checkbox', onchange: function (e) { f.paid_consent = e.target.checked; } });
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
    wrap.appendChild(tierSet);
    wrap.appendChild(paidConsentRow);
    var paidErr = fieldError(errors.paid_consent); if (paidErr) wrap.appendChild(paidErr);
    if (f.tier) onTierChange();

    var loadsSelect = h('select', { id: 'cw-loads', onchange: function (e) { f.loads_wanted = e.target.value; } });
    loadsSelect.appendChild(h('option', { value: '' }, [COPY.loadsChoosePlaceholder]));
    Object.keys(COPY.loadsOptions).forEach(function (k) { loadsSelect.appendChild(h('option', { value: k }, [COPY.loadsOptions[k]])); });
    loadsSelect.value = f.loads_wanted;
    wrap.appendChild(labeledField('cw-loads', COPY.sectionLoads, loadsSelect, errors.loads_wanted, COPY.loadsHelp));

    var charsLeftNode = h('span', { class: 'chip-charcount' }, [COPY.charsLeft(500 - f.drop_notes.length)]);
    var notesArea = h('textarea', {
      id: 'cw-notes', maxlength: '500', rows: '3',
      oninput: function (e) { f.drop_notes = e.target.value; charsLeftNode.textContent = COPY.charsLeft(500 - e.target.value.length); }
    });
    notesArea.value = f.drop_notes;
    wrap.appendChild(h('div', { class: 'field' }, [h('label', { for: 'cw-notes' }, [COPY.dropNotesLabel]), notesArea, charsLeftNode]));

    // photo — optional in edit mode; keep the existing one unless a new one is chosen
    wrap.appendChild(h('h2', { class: 'chip-section-title' }, [COPY.sectionPhoto]));
    var previewImg = h('img', { class: 'chip-photo-preview', alt: COPY.photoPreviewAlt, hidden: !f.photoPreviewUrl });
    if (f.photoPreviewUrl) previewImg.setAttribute('src', f.photoPreviewUrl);
    var photoStatus = h('p', { class: 'chip-help' }, ['']);
    var fileInput = h('input', {
      type: 'file', accept: 'image/*', capture: 'environment', id: 'cw-photo', style: 'display:none',
      onchange: function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        photoStatus.textContent = COPY.photoProcessing;
        processPhotoFile(file, function (err, blob, url) {
          photoStatus.textContent = '';
          if (err) { photoStatus.textContent = COPY.photoUploadFailed; return; }
          if (f.photoPreviewUrl) URL.revokeObjectURL(f.photoPreviewUrl);
          f.photoBlob = blob; f.photoPreviewUrl = url; f.photoPath = null;
          previewImg.setAttribute('src', url); previewImg.hidden = false;
          chooseBtn.textContent = COPY.photoRetakeButton;
        });
      }
    });
    var chooseBtn = h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { fileInput.click(); } }, [COPY.photoRetakeButton]);
    wrap.appendChild(h('div', { class: 'chip-photo' }, [fileInput, chooseBtn, photoStatus, previewImg]));

    var saveBtn = h('button', { class: 'btn chip-submit', type: 'button', onclick: function () { onSaveEdit(saveBtn); } }, [COPY.saveButton]);
    var cancelBtn = h('button', {
      class: 'btn btn--outline', type: 'button',
      onclick: function () { var ui = ensureProfileUi(); ui.editing = false; ui.editForm = null; render(); }
    }, [COPY.cancelButton]);
    wrap.appendChild(h('div', { class: 'chip-actions' }, [saveBtn, cancelBtn]));
  }

  function onSaveEdit(saveBtn) {
    var ui = ensureProfileUi();
    var f = ui.editForm;
    var errors = validateEdit(f);
    f._errors = errors;
    if (Object.keys(errors).length) { render(); focusFirstError(errors); return; }
    f._topError = null;
    saveBtn.disabled = true; saveBtn.textContent = COPY.savingButton;
    var photoStep = f.photoBlob ? API.uploadDropPhoto(f.photoBlob).then(function (p) { f.photoPath = p; return p; }) : Promise.resolve(null);
    photoStep.then(function (photoPath) {
      var changes = {
        first_name: f.first_name.trim(), last_name: f.last_name.trim(), phone: digitsOnly(f.phone),
        street: f.street.trim(), city: f.city.trim(), zip: f.zip.trim(), lat: f.lat, lng: f.lng,
        tier: f.tier, loads_wanted: f.loads_wanted, drop_notes: f.drop_notes.trim()
      };
      if (photoPath) changes.photo_path = photoPath;
      return API.update(changes, f.paid_consent);
    }).then(function (res) {
      var ui2 = ensureProfileUi();
      ui2.saving = false; ui2.editing = false; ui2.editForm = null;
      ui2.justSaved = true; ui2.addressRecheck = !!(res && res.recheck);
      STATE.customer = (res && res.customer) || STATE.customer;
      render();
    }).catch(function (err) {
      saveBtn.disabled = false; saveBtn.textContent = COPY.saveButton;
      if (err.kind === 'closed') { STATE.step = 'closed'; return render(); }
      f._topError = err.message || COPY.genericError;
      render();
    });
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
        if (meRes.customer) { STATE.customer = meRes.customer; STATE.step = 'profile'; return render(); }
        STATE.form = freshForm(); STATE.requestId = API.newRequestId(); STATE.step = 'signup'; return render();
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
