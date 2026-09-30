/* STYLE LAB — preview only (Joseph 2026-09-27, expanded 2026-09-27). Loaded only on the review
   preview's homepage. Adds a "Style options" button: hero photo (scrolls / stays put) and 11
   homepage looks.
   Option 1 = the standard (today's site — Full Screen hero + Bold Bands + Gentle Motion + Warm
   Welcome, all now permanent in site.css/menu.js). No class is added for it; it is exactly what
   the real site already renders on its own.
   Options 2-11 build ON TOP of that standard via one class each on <html>: fx-2 … fx-11. Each
   option's DOM/observer/listener setup is created when it's chosen and torn down when you switch
   away, so nothing keeps running in the background.
   The choice is kept in the address (?photo=fixed&look=2) so a link shows David the same look,
   and in this browser's storage so it survives a reload. */
(function () {
  var LOOKS = [
    { id: "std", name: "1 · Standard (Gentle Motion + Warm Welcome)", note: "Today's baseline: full-screen hero, gold proof strip, deep green bands, sections that fade+rise into view, count-up numbers, and warm hover touches. No changes — everything below adds ONE new thing on top of this." },
    { id: "2", name: "2 · Falling Leaves", bold: true, note: "Bold: a few brand-color leaves drift slowly down over the hero photo. Pauses off-screen and when the tab is hidden; off under reduced motion." },
    { id: "3", name: "3 · Growing Vine", bold: true, note: "Bold: a thin vine along the left edge draws itself in, with a few leaves, as you scroll down the page. Wider screens only." },
    { id: "4", name: "4 · Cursor Spotlight", bold: true, note: "Bold: hover the hero photo and a circle around your cursor reveals a second photo underneath. Desktop hover only." },
    { id: "5", name: "5 · Crew Scroll-Strip", bold: true, note: "Bold: \"Meet the Crew\" pins in place and slides sideways through its photos as you scroll past it. Wider screens only." },
    { id: "6", name: "6 · Headline Assemble", bold: true, note: "Bold: the hero headline's words fade and rise into place, one after another, right when the page loads." },
    { id: "7", name: "7 · Rotating Eyebrow", note: "The small line above the hero headline cycles through our services (Tree Pruning, Plant Health Care, ...)." },
    { id: "9", name: "9 · Real Reviews Ribbon", note: "A slow, pausable ribbon of real Google review quotes scrolls under the stats, each one linked to Google." },
    { id: "10", name: "10 · Underline Grow", note: "The small gold label above each heading draws in a thin underline the first time it scrolls into view." },
    { id: "11", name: "11 · Back-to-Top Leaf", note: "A small round leaf button appears once you've scrolled down, and takes you back to the top." }
  ];
  var PHOTOS = [
    { id: "fixed", name: "Stays put (standard)", note: "The photo holds still and the words scroll over it." },
    { id: "scroll", name: "Scrolls with the page", note: "The photo moves up with the words." }
  ];
  var FX_IDS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
  var root = document.documentElement;

  function prefersReduced() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch (e) { return false; }
  }
  function canHover() {
    try { return !!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches); }
    catch (e) { return false; }
  }
  function throttleRaf(fn) {
    var scheduled = false;
    return function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () { scheduled = false; fn(); });
    };
  }
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function read(key, fallback) {
    var q = new URLSearchParams(location.search).get(key);
    if (q) return q;
    try { return localStorage.getItem("ttc-lab5-" + key) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem("ttc-lab5-" + key, val); } catch (e) {}
    try {
      var u = new URL(location.href); u.searchParams.set(key, val);
      history.replaceState(null, "", u.toString());
    } catch (e) {}
  }

  /* ---------- Effects (options 2-11): setup returns a teardown function ---------- */

  // Option 2 — Falling Leaves: a handful of brand-color leaves drift down over the hero photo.
  // Canvas, not CSS, so it can recycle particles cheaply. Pauses when the hero is off-screen or
  // the tab is hidden; skipped entirely under reduced motion (no canvas is ever created).
  function setupFx2(scope) {
    if (prefersReduced()) return function () {};
    var hero = scope.querySelector(".hero-slides");
    if (!hero) return function () {};

    var canvas = document.createElement("canvas");
    canvas.className = "lab-leaves-canvas";
    canvas.setAttribute("aria-hidden", "true");
    hero.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) { hero.removeChild(canvas); return function () {}; }

    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var narrow = window.matchMedia("(max-width: 640px)").matches;
    var COUNT = narrow ? 9 : 16;
    var cs = getComputedStyle(document.documentElement);
    var colors = [
      (cs.getPropertyValue("--ttc-gold") || "#f0c080").trim(),
      (cs.getPropertyValue("--ttc-green") || "#4a6741").trim()
    ];
    var leaves = [];

    function resize() {
      var r = hero.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function makeLeaf() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: 6 + Math.random() * 7,
        speed: 0.35 + Math.random() * 0.5,
        drift: 0.6 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    }
    function fill() { leaves = []; for (var i = 0; i < COUNT; i++) leaves.push(makeLeaf()); }
    resize(); fill();

    var inView = true, rafId = null, lastT = null;
    function draw(ts) {
      rafId = null;
      if (document.hidden || !inView) return;
      if (lastT === null) lastT = ts;
      var dt = Math.min(48, ts - lastT); lastT = ts;
      ctx.clearRect(0, 0, w, h);
      leaves.forEach(function (leaf) {
        leaf.y += leaf.speed * (dt / 16);
        leaf.phase += 0.02 * (dt / 16);
        leaf.rot += leaf.rotSpeed * (dt / 16);
        if (leaf.y - leaf.size > h) { leaf.y = -leaf.size; leaf.x = Math.random() * w; leaf.phase = Math.random() * Math.PI * 2; }
        var x = leaf.x + Math.sin(leaf.phase) * leaf.drift * 14;
        ctx.save();
        ctx.translate(x, leaf.y);
        ctx.rotate(leaf.rot);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = leaf.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      rafId = requestAnimationFrame(draw);
    }
    function wake() { if (!rafId && !document.hidden && inView) { lastT = null; rafId = requestAnimationFrame(draw); } }

    rafId = requestAnimationFrame(draw);
    var io = null;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; wake(); }, { threshold: 0 });
      io.observe(hero);
    }
    function onVisibility() { wake(); }
    document.addEventListener("visibilitychange", onVisibility);
    var onResize = debounce(resize, 150);
    window.addEventListener("resize", onResize);

    return function teardown() {
      if (rafId) cancelAnimationFrame(rafId);
      if (io) { try { io.disconnect(); } catch (e) {} }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }

  // Option 3 — Growing Vine: an SVG vine along the left edge draws itself in as you scroll down
  // the page (stroke-dashoffset tied to scroll fraction), with a few leaves fading in as you pass
  // them. Desktop/wide screens only.
  function setupFx3() {
    if (window.matchMedia("(max-width: 1023px)").matches) return function () {};
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "lab-vine");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 46 1000");
    svg.setAttribute("preserveAspectRatio", "none");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "lab-vine__path");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("d", "M23 0 C10 120 36 240 23 360 C10 480 36 600 23 720 C10 840 36 920 23 1000");
    svg.appendChild(path);
    document.body.appendChild(svg);

    var len = 1000;
    try { len = path.getTotalLength() || 1000; } catch (e) {}
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);

    var LEAF_AT = [0.12, 0.32, 0.55, 0.78, 0.95];
    var leaves = LEAF_AT.map(function (t) {
      var pt; try { pt = path.getPointAtLength(len * t); } catch (e) { pt = { x: 23, y: 1000 * t }; }
      var leaf = document.createElementNS("http://www.w3.org/2000/svg", "path");
      leaf.setAttribute("class", "lab-vine__leaf");
      leaf.setAttribute("d", "M" + pt.x + " " + pt.y + " c6-3 12 0 14 6 -6 4 -12 2 -14 -6 z");
      svg.appendChild(leaf);
      return { el: leaf, t: t };
    });

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var frac = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      path.style.strokeDashoffset = String(len * (1 - frac));
      leaves.forEach(function (leaf) { leaf.el.classList.toggle("lab-in", frac >= leaf.t - 0.02); });
    }
    var onScroll = throttleRaf(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return function teardown() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (svg.parentNode) svg.parentNode.removeChild(svg);
    };
  }

  // Option 4 — Cursor Spotlight: hover the hero and a circular clip-path around the cursor
  // reveals a second hero photo underneath. Hover-capable pointers only.
  function setupFx4(scope) {
    if (!canHover()) return function () {};
    var hero = scope.querySelector(".hero-slides");
    var track = hero && hero.querySelector(".hero-slides__track");
    var slides = track ? Array.prototype.slice.call(track.querySelectorAll(".hero-slides__slide")) : [];
    if (!hero || slides.length < 2) return function () {};

    var activeIdx = slides.findIndex(function (s) { return s.classList.contains("is-active"); });
    if (activeIdx < 0) activeIdx = 0;
    var alt = slides[(activeIdx + 1) % slides.length];
    var bg = alt.style.backgroundImage;
    if (!bg && alt.dataset && alt.dataset.bg) bg = 'url("' + alt.dataset.bg + '")';
    if (!bg) return function () {};

    var layer = document.createElement("div");
    layer.className = "lab-spotlight";
    layer.setAttribute("aria-hidden", "true");
    layer.style.backgroundImage = bg;
    hero.appendChild(layer);

    var raf = null;
    function move(e) {
      var r = hero.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        layer.style.setProperty("--lab-x", x + "px");
        layer.style.setProperty("--lab-y", y + "px");
      });
    }
    function enter() { layer.classList.add("lab-in"); }
    function leave() { layer.classList.remove("lab-in"); }
    hero.addEventListener("mousemove", move);
    hero.addEventListener("mouseenter", enter);
    hero.addEventListener("mouseleave", leave);

    return function teardown() {
      hero.removeEventListener("mousemove", move);
      hero.removeEventListener("mouseenter", enter);
      hero.removeEventListener("mouseleave", leave);
      if (raf) cancelAnimationFrame(raf);
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    };
  }

  // Option 5 — Crew Scroll-Strip: wraps "Meet the Crew" in a sticky container and translates it
  // sideways as you scroll past, so its photos slide by like a filmstrip. Wider screens only;
  // skipped under reduced motion. Restores the section to its exact original spot on teardown.
  function setupFx5(scope) {
    if (prefersReduced() || !window.matchMedia("(min-width: 900px)").matches) return function () {};
    var crew = scope.querySelector(".crew-teaser");
    if (!crew) return function () {};
    var parent = crew.parentNode, next = crew.nextSibling;

    var wrap = document.createElement("div");
    wrap.className = "lab-strip-wrap";
    var sticky = document.createElement("div");
    sticky.className = "lab-strip-sticky";
    parent.insertBefore(wrap, crew);
    wrap.appendChild(sticky);
    sticky.appendChild(crew);
    crew.classList.add("lab-strip-track");

    var extra = 0;
    function measure() {
      extra = Math.max(0, crew.scrollWidth - sticky.clientWidth);
      wrap.style.height = (sticky.offsetHeight + extra) + "px";
    }
    function update() {
      var r = wrap.getBoundingClientRect();
      var scrolled = -r.top;
      var frac = extra > 0 ? Math.min(1, Math.max(0, scrolled / extra)) : 0;
      crew.style.transform = "translateX(" + (-frac * extra) + "px)";
    }
    measure(); update();
    var onScroll = throttleRaf(update);
    var onResize = debounce(function () { measure(); update(); }, 150);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return function teardown() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      crew.classList.remove("lab-strip-track");
      crew.style.transform = "";
      parent.insertBefore(crew, next);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    };
  }

  // Option 6 — Headline Assemble: splits the hero headline into words and fades+rises them in,
  // one after another, on setup (a one-time entrance, not scroll-linked). Skipped entirely under
  // reduced motion — the headline is never split, so nothing changes for screen readers.
  function setupFx6(scope) {
    var h1 = scope.querySelector(".hero__title");
    if (!h1 || prefersReduced()) return function () {};
    var original = h1.textContent;

    var tokens = original.split(/(\s+)/);
    h1.textContent = "";
    var words = [];
    tokens.forEach(function (tok) {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { h1.appendChild(document.createTextNode(tok)); return; }
      var span = document.createElement("span");
      span.className = "lab-word";
      span.textContent = tok;
      h1.appendChild(span);
      words.push(span);
    });

    var timers = words.map(function (span, i) {
      return setTimeout(function () { span.classList.add("lab-in"); }, 60 + i * 90);
    });

    return function teardown() {
      timers.forEach(clearTimeout);
      h1.textContent = original;
    };
  }

  // Option 7 — Rotating Eyebrow: cycles the hero eyebrow through a short list of our own services.
  var EYEBROW_WORDS = ["Tree Pruning", "Tree Removal", "Plant Health Care", "Stump Grinding", "Emergency Storm Service", "Cabling & Bracing"];
  function setupFx7(scope) {
    var eyebrow = scope.querySelector(".hero__eyebrow");
    if (!eyebrow) return function () {};
    var original = eyebrow.textContent;
    eyebrow.classList.add("lab-eyebrow-cycle");

    if (prefersReduced()) {
      eyebrow.textContent = EYEBROW_WORDS[0];
      return function () { eyebrow.textContent = original; eyebrow.classList.remove("lab-eyebrow-cycle"); };
    }

    var i = 0;
    eyebrow.textContent = EYEBROW_WORDS[0];
    var timer = setInterval(function () {
      eyebrow.classList.add("lab-fade");
      setTimeout(function () {
        i = (i + 1) % EYEBROW_WORDS.length;
        eyebrow.textContent = EYEBROW_WORDS[i];
        eyebrow.classList.remove("lab-fade");
      }, 350);
    }, 2600);

    return function teardown() {
      clearInterval(timer);
      eyebrow.classList.remove("lab-eyebrow-cycle", "lab-fade");
      eyebrow.textContent = original;
    };
  }

  // Option 8 — Scroll Progress Bar: a thin gold line at the top that fills as you scroll down.
  function setupFx8() {
    var bar = document.createElement("div");
    bar.className = "lab-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      bar.style.width = pct + "%";
    }
    var onScroll = throttleRaf(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return function teardown() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    };
  }

  // Option 9 — Real Reviews Ribbon: a slow, pausable marquee of short, verbatim Google review
  // quotes (hand-picked from content/testimonials/testimonials.json), each credited and linked to
  // Google — the same reviews already used on the /testimonials/ page.
  var REVIEW_QUOTES = [
    { text: "Their knowledge is unmatched in the valley. I wouldn’t trust anyone else with my trees.", author: "Trenton B." },
    { text: "Extraordinary professionalism from the first phone call, through the work product, to remarkable clean-up. A+", author: "Doug T." },
    { text: "The only reason my Freeman maples are in such good shape is because of David and his team.", author: "Rich G." },
    { text: "They cleaned up everything to the point of not knowing work had been done. The trees look beautiful.", author: "Jennifer H." },
    { text: "At all times the crew were respectful of our property and professional in their interactions.", author: "Vijay K." }
  ];
  var REVIEW_URL = "https://www.google.com/search?q=total+tree+care+logan+utah#lrd=0x87547e5ac48d2baf:0x867e2f9e98438ba4,1";
  function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function setupFx9(scope) {
    var stats = scope.querySelector(".stats");
    if (!stats) return function () {};
    var wrap = document.createElement("div");
    wrap.className = "lab-ribbon";
    var track = document.createElement("div");
    track.className = "lab-ribbon__track";
    REVIEW_QUOTES.concat(REVIEW_QUOTES).forEach(function (q) {
      var fig = document.createElement("figure");
      fig.className = "lab-ribbon__item";
      fig.innerHTML = "<q>" + escapeHtml(q.text) + "</q><a href=\"" + REVIEW_URL + "\" target=\"_blank\" rel=\"noopener\">" +
        escapeHtml(q.author) + " — Google review</a>";
      track.appendChild(fig);
    });
    wrap.appendChild(track);
    stats.insertAdjacentElement("afterend", wrap);
    return function teardown() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); };
  }

  // Option 10 — Underline Grow: each section's gold eyebrow label draws in an underline the first
  // time it scrolls into view.
  function setupFx10(scope) {
    var eyebrows = Array.prototype.slice.call(scope.querySelectorAll(".section .eyebrow, .promise .eyebrow"));
    if (!eyebrows.length) return function () {};
    eyebrows.forEach(function (el) { el.classList.add("lab-uline"); });

    var io = null;
    if (!prefersReduced() && window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add("lab-in"); io.unobserve(entry.target); }
        });
      }, { threshold: 0.4 });
      eyebrows.forEach(function (el) { io.observe(el); });
    } else {
      eyebrows.forEach(function (el) { el.classList.add("lab-in"); });
    }

    return function teardown() {
      if (io) { try { io.disconnect(); } catch (e) {} }
      eyebrows.forEach(function (el) { el.classList.remove("lab-uline", "lab-in"); });
    };
  }

  // Option 11 — Back-to-Top Leaf: a small round button appears once you've scrolled down and
  // smooth-scrolls back to the top (instant jump under reduced motion).
  function setupFx11() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lab-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C7 7 4 11 4 15a8 8 0 0 0 16 0c0-4-3-8-8-13zm0 3.4C15.6 9.6 18 12.7 18 15a6 6 0 0 1-12 0c0-2.3 2.4-5.4 6-9.6z"/></svg>';
    document.body.appendChild(btn);

    function update() { btn.classList.toggle("lab-in", window.scrollY > 600); }
    var onScroll = throttleRaf(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    function onClick() { window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" }); }
    btn.addEventListener("click", onClick);
    update();

    return function teardown() {
      window.removeEventListener("scroll", onScroll);
      btn.removeEventListener("click", onClick);
      if (btn.parentNode) btn.parentNode.removeChild(btn);
    };
  }

  var FX_SETUP = {
    "2": setupFx2, "3": setupFx3, "4": setupFx4, "5": setupFx5, "6": setupFx6,
    "7": setupFx7, "8": setupFx8, "9": setupFx9, "10": setupFx10, "11": setupFx11
  };
  var activeTeardown = null;

  function applyFx(look) {
    if (activeTeardown) { try { activeTeardown(); } catch (e) {} activeTeardown = null; }
    var setup = FX_SETUP[look];
    if (setup) {
      try { activeTeardown = setup(document); } catch (e) { activeTeardown = null; }
    }
  }

  function apply(look, photo) {
    FX_IDS.forEach(function (id) { root.classList.remove("fx-" + id); });
    if (FX_IDS.indexOf(look) !== -1) root.classList.add("fx-" + look);
    root.classList.toggle("hs-scroll", photo === "scroll");
    applyFx(look);
  }

  var look = read("look", "std"), photo = read("photo", "fixed");
  if (!LOOKS.some(function (l) { return l.id === look; })) look = "std";
  apply(look, photo);

  function options(name, list, current) {
    return list.map(function (o) {
      var label = o.bold ? '<span class="lab-opt__bold">Bold:</span> ' + o.name : o.name;
      return '<label class="lab-opt"><input type="radio" name="' + name + '" value="' + o.id + '"' +
        (o.id === current ? " checked" : "") + '><span class="lab-opt__text"><strong>' + label + "</strong><span>" + o.note + "</span></span></label>";
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
