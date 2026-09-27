/* STYLE LAB — preview only (Joseph, 2026-09-27). Loaded only on the review preview's homepage.
   Adds a "Style options" button: hero photo (scrolls / stays put) and 6 homepage looks.
   Option 1 = the standard (today's site — Full Screen hero + Bold Bands, photo stays put). No
   class is added for it; it is exactly what site.css already renders on its own.
   Options 2-6 build ON TOP of that standard (never html.look-alt) via one class each on <html>:
   fx-2 … fx-6. Each option's DOM/observer/listener setup is created when it's chosen and torn
   down when you switch away, so nothing keeps running in the background.
   The choice is kept in the address (?photo=fixed&look=2) so a link shows David the same look,
   and in this browser's storage so it survives a reload. */
(function () {
  var LOOKS = [
    { id: "std", name: "1 · Standard (what we have now)", note: "Full-screen photo, gold proof strip, deep green bands, photo stays put. No changes — everything else builds on this." },
    { id: "2", name: "2 · Gentle Motion", note: "Sections fade and rise into place as you scroll to them; the stat numbers count up when they come into view." },
    { id: "3", name: "3 · Warm Welcome", note: "Credential tiles lift softly on hover, avatar circles and crew photos zoom in a touch, and links get a gold underline sweep." },
    { id: "4", name: "4 · Rooted", note: "The hero photo slowly drifts (a gentle Ken Burns zoom), and a small leaf accent line draws in under each section heading." },
    { id: "5", name: "5 · Always Ready", note: "A \"Get a Free Estimate\" pill slides in once you scroll past the hero and stays on screen." },
    { id: "6", name: "6 · Depth", note: "The gold and green bands get a soft glow that drifts slowly as you scroll; credential tiles tilt gently toward your cursor." }
  ];
  var PHOTOS = [
    { id: "fixed", name: "Stays put (standard)", note: "The photo holds still and the words scroll over it." },
    { id: "scroll", name: "Scrolls with the page", note: "The photo moves up with the words." }
  ];
  var FX_IDS = ["2", "3", "4", "5", "6"];
  var root = document.documentElement;

  function prefersReduced() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch (e) { return false; }
  }
  function canHover() {
    try { return !!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches); }
    catch (e) { return false; }
  }

  function read(key, fallback) {
    var q = new URLSearchParams(location.search).get(key);
    if (q) return q;
    try { return localStorage.getItem("ttc-lab4-" + key) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem("ttc-lab4-" + key, val); } catch (e) {}
    try {
      var u = new URL(location.href); u.searchParams.set(key, val);
      history.replaceState(null, "", u.toString());
    } catch (e) {}
  }

  /* ---------- Effects (options 2-6): setup returns a teardown function ---------- */

  // Shared: fade+rise a set of elements in as they scroll into view. Adds `itemClass` to every
  // matched element up front (CSS then hides it), then adds "lab-in" to reveal — one at a time,
  // as each is observed entering the viewport. Falls back to revealing everything immediately if
  // IntersectionObserver isn't available or motion is reduced, and force-reveals everything after
  // a timeout as a safety net, so nothing can end up stuck invisible.
  function makeReveal(scope, selector, itemClass, onEnter) {
    var els = Array.prototype.slice.call(scope.querySelectorAll(selector));
    if (!els.length) return function teardown() {};
    var io = null, fallbackId = null, revealed = false;

    function revealAll() {
      if (revealed) return;
      revealed = true;
      els.forEach(function (el) {
        el.classList.add("lab-in");
        if (onEnter) { try { onEnter(el); } catch (e) {} }
      });
    }
    function revealOne(el) {
      el.classList.add("lab-in");
      if (onEnter) { try { onEnter(el); } catch (e) {} }
    }

    els.forEach(function (el) { el.classList.add(itemClass); });

    if (!prefersReduced() && window.IntersectionObserver) {
      try {
        io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) { revealOne(entry.target); io.unobserve(entry.target); }
          });
        }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
        els.forEach(function (el) { io.observe(el); });
        fallbackId = setTimeout(revealAll, 4000);
      } catch (e) {
        io = null;
        revealAll();
      }
    } else {
      revealAll();
    }

    return function teardown() {
      if (io) { try { io.disconnect(); } catch (e) {} }
      if (fallbackId) clearTimeout(fallbackId);
      els.forEach(function (el) { el.classList.remove(itemClass, "lab-in"); });
    };
  }

  // Option 2 — scroll reveal (stats, credential tiles, crew photos) + count-up numbers.
  function countUp(el) {
    var raw = el.textContent.trim();
    var m = raw.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return; // e.g. "Free" — nothing to count, leave as-is
    var prefix = m[1], numStr = m[2].replace(/,/g, ""), suffix = m[3];
    var end = parseFloat(numStr);
    if (isNaN(end)) return;
    var decimals = (numStr.split(".")[1] || "").length;
    var dur = 900, t0 = null;
    function frame(ts) {
      try {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = end * eased;
        var text = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-US");
        el.textContent = prefix + text + suffix;
        if (p < 1) requestAnimationFrame(frame); else el.textContent = raw;
      } catch (e) { el.textContent = raw; }
    }
    try { requestAnimationFrame(frame); } catch (e) { el.textContent = raw; }
  }
  function setupFx2(scope) {
    var teardowns = [
      makeReveal(scope, ".stats .stat", "lab-fx2-item", function (el) {
        var num = el.querySelector(".stat__num");
        if (num) countUp(num);
      }),
      makeReveal(scope, ".creds-tiles .tile", "lab-fx2-item"),
      makeReveal(scope, ".crew-teaser > a", "lab-fx2-item")
    ];
    return function teardown() { teardowns.forEach(function (fn) { fn(); }); };
  }

  // Option 3 — pure CSS (hover lift, avatar/photo zoom, underline sweep). Nothing to wire up.
  function setupFx3() { return function teardown() {}; }

  // Option 4 — Ken Burns is pure CSS (site's own .is-active class already toggles by menu.js).
  // Here we just add the small leaf/line accent under each section heading and reveal it on scroll.
  function setupFx4(scope) {
    var eyebrows = Array.prototype.slice.call(scope.querySelectorAll(".section .eyebrow, .promise .eyebrow"));
    var leaves = [];
    eyebrows.forEach(function (eyebrow) {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "lab-leaf");
      svg.setAttribute("viewBox", "0 0 64 20");
      svg.setAttribute("width", "64"); svg.setAttribute("height", "20");
      svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
      svg.innerHTML =
        '<line x1="0" y1="10" x2="46" y2="10" stroke="var(--ttc-green)" stroke-width="2" stroke-linecap="round" class="lab-leaf__line"/>' +
        '<path d="M46 10c4-7 12-9 16-6-2 6-9 10-16 6z" fill="var(--ttc-gold)" class="lab-leaf__leaf"/>';
      eyebrow.parentNode.insertBefore(svg, eyebrow.nextSibling);
      leaves.push(svg);
    });
    var teardownReveal = function () {};
    if (leaves.length) {
      leaves.forEach(function (el) { el.classList.add("lab-fx4-leaf"); });
      teardownReveal = makeReveal(scope, ".lab-fx4-leaf", "lab-fx4-leaf");
    }
    return function teardown() {
      teardownReveal();
      leaves.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    };
  }

  // Option 5 — sticky "Get a Free Estimate" pill, shown once the hero scrolls out of view.
  function setupFx5(scope) {
    var hero = scope.querySelector(".hero-slides");
    var pill = document.createElement("a");
    pill.className = "lab-sticky-cta btn btn--primary";
    pill.href = "/contact/";
    pill.textContent = "Get a Free Estimate";
    document.body.appendChild(pill);

    var io = null, fallbackId = null;
    if (hero && !prefersReduced() && window.IntersectionObserver) {
      try {
        io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            pill.classList.toggle("lab-in", !entry.isIntersecting && entry.boundingClientRect.top < 0);
          });
        }, { threshold: 0 });
        io.observe(hero);
      } catch (e) { io = null; pill.classList.add("lab-in"); }
    } else {
      pill.classList.add("lab-in");
    }
    return function teardown() {
      if (io) { try { io.disconnect(); } catch (e) {} }
      if (fallbackId) clearTimeout(fallbackId);
      if (pill.parentNode) pill.parentNode.removeChild(pill);
    };
  }

  // Option 6 — a slow decorative parallax glow on the bold bands + a subtle cursor tilt on tiles.
  function setupFx6(scope) {
    var teardowns = [];

    // Parallax glow layer (aria-hidden, purely decorative — never the real content).
    var bands = Array.prototype.slice.call(scope.querySelectorAll(".cred-strip, .cred-strip + .section, .promise"));
    var layers = [];
    if (bands.length && !prefersReduced()) {
      bands.forEach(function (band, i) {
        var layer = document.createElement("div");
        layer.className = "lab-parallax-layer";
        layer.setAttribute("aria-hidden", "true");
        band.insertBefore(layer, band.firstChild);
        layers.push({ el: layer, factor: (i % 2 === 0 ? -0.05 : 0.04) });
      });
    }
    if (layers.length) {
      var ticking = false;
      function apply() {
        ticking = false;
        var y = window.scrollY || window.pageYOffset || 0;
        layers.forEach(function (l) { l.el.style.transform = "translateY(" + (y * l.factor) + "px)"; });
      }
      function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(apply); }
      }
      apply();
      window.addEventListener("scroll", onScroll, { passive: true });
      teardowns.push(function () { window.removeEventListener("scroll", onScroll); });
    }
    teardowns.push(function () { layers.forEach(function (l) { if (l.el.parentNode) l.el.parentNode.removeChild(l.el); }); });

    // Gentle cursor tilt on credential tiles (fine pointer + hover only).
    if (canHover() && !prefersReduced()) {
      var tiles = Array.prototype.slice.call(scope.querySelectorAll(".creds-tiles .tile"));
      var cleanups = tiles.map(function (tile) {
        function onMove(e) {
          var r = tile.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          tile.style.transform = "perspective(700px) rotateX(" + (py * -5) + "deg) rotateY(" + (px * 5) + "deg)";
        }
        function onLeave() { tile.style.transform = ""; }
        tile.addEventListener("mousemove", onMove);
        tile.addEventListener("mouseleave", onLeave);
        return function () {
          tile.removeEventListener("mousemove", onMove);
          tile.removeEventListener("mouseleave", onLeave);
          tile.style.transform = "";
        };
      });
      teardowns.push(function () { cleanups.forEach(function (fn) { fn(); }); });
    }

    return function teardown() { teardowns.forEach(function (fn) { fn(); }); };
  }

  var FX_SETUP = { "2": setupFx2, "3": setupFx3, "4": setupFx4, "5": setupFx5, "6": setupFx6 };
  var activeTeardown = null;

  function applyFx(look) {
    if (activeTeardown) { try { activeTeardown(); } catch (e) {} activeTeardown = null; }
    var setup = FX_SETUP[look];
    if (setup) {
      try { activeTeardown = setup(document); } catch (e) { activeTeardown = null; }
    }
  }

  function apply(look, photo) {
    var classes = ["fx-2", "fx-3", "fx-4", "fx-5", "fx-6"];
    classes.forEach(function (c) { root.classList.remove(c); });
    if (FX_IDS.indexOf(look) !== -1) root.classList.add("fx-" + look);
    root.classList.toggle("hs-scroll", photo === "scroll");
    applyFx(look);
  }

  var look = read("look", "std"), photo = read("photo", "fixed");
  if (!LOOKS.some(function (l) { return l.id === look; })) look = "std";
  apply(look, photo);

  function options(name, list, current) {
    return list.map(function (o) {
      return '<label class="lab-opt"><input type="radio" name="' + name + '" value="' + o.id + '"' +
        (o.id === current ? " checked" : "") + '><span class="lab-opt__text"><strong>' + o.name + "</strong><span>" + o.note + "</span></span></label>";
    }).join("");
  }

  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "lab-toggle"; btn.textContent = "Style options";
  btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "lab-panel");
  var panel = document.createElement("div");
  panel.className = "lab-panel"; panel.id = "lab-panel"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Style options");
  panel.innerHTML =
    "<h2>Style options</h2><p class=\"lab-note\">Preview only. Try each one, then tell Claude which you like. The page link keeps your choice.</p>" +
    "<fieldset><legend>Top photo</legend>" + options("lab-photo", PHOTOS, photo) + "</fieldset>" +
    "<fieldset><legend>Home page look</legend>" + options("lab-look", LOOKS, look) + "</fieldset>" +
    '<button type="button" class="lab-close">Close</button>';
  document.body.appendChild(panel);
  document.body.appendChild(btn);

  function setOpen(open) {
    panel.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open) { var c = panel.querySelector("input:checked"); if (c) c.focus(); } else btn.focus();
  }
  btn.addEventListener("click", function () { setOpen(panel.hidden); });
  panel.querySelector(".lab-close").addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
  panel.addEventListener("change", function (e) {
    if (e.target.name === "lab-look") { look = e.target.value; save("look", look); }
    if (e.target.name === "lab-photo") { photo = e.target.value; save("photo", photo); }
    apply(look, photo);
  });
})();
