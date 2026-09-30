/* STYLE LAB — preview only (Joseph 2026-09-27, recycled 2026-09-30). Loaded only on the review
   preview's homepage. Adds a "Style options" button: hero photo (scrolls / stays put) and 11
   homepage looks.
   Option 1 = the standard (today's site — Full Screen hero + Bold Bands + photo stays put + Gentle
   Motion reveal/count-up + Warm Welcome hovers + a gold scroll-progress bar on every page), all now
   permanent in site.css/menu.js. No class is added for it; it is exactly what the real site already
   renders on its own.
   Options 2-11 build ON TOP of that standard via one class each on <html>: fx-2 … fx-11. Each
   option's DOM/observer/listener setup is created when it's chosen and torn down when you switch
   away, so nothing keeps running in the background.
   2026-09-30 (Joseph: "Recycle and generate new 2-11 ideas... be creative"): the old options 2-11
   (Falling Leaves, Growing Vine, Cursor Spotlight, Crew Scroll-Strip, Headline Assemble, Rotating
   Eyebrow, the old Scroll Progress Bar — now the sitewide standard — Real Reviews Ribbon, Underline
   Grow, Back-to-Top Leaf) are gone, replaced by 10 new one-feature-each options.
   The choice is kept in the address (?photo=fixed&look=2) so a link shows David the same look,
   and in this browser's storage so it survives a reload. */
(function () {
  var LOOKS = [
    { id: "std", name: "1 · Standard (Gentle Motion + Warm Welcome)", note: "Today's baseline: full-screen hero, gold proof strip, deep green bands, sections that fade+rise into view, count-up numbers, a gold scroll-progress bar, and warm hover touches. No changes — everything below adds ONE new thing on top of this." },
    { id: "3", name: "3 · Click-to-Call Pill", note: "On phones, a round call button appears in the corner once you've scrolled down, so the number is always one tap away. Phones only." },
    { id: "4", name: "4 · Trust Ticker", note: "A slim line inside the credibility strip quietly rotates through facts already on this page — jobs completed, Google stars, ISA arborists on staff." },
    { id: "5", name: "5 · Seasonal Tree-Care Note", note: "A short note below the hero pulls this month's real tip straight from our FAQ or service pages (winter pruning, spray-season timing) and links to that page. No invented facts." },
    { id: "6", name: "6 · Photo Tiles Breathe", note: "Crew photos gently scale and drift inside their frame as they scroll through the middle of the screen, like a slow breath. Off under reduced motion." },
    { id: "7", name: "7 · Growth Rings", bold: true, note: "Bold: faint tree-ring circles draw in behind each stat number the moment it scrolls into view and counts up." },
    { id: "8", name: "8 · Hero Underline Draw", bold: true, note: "Bold: a solid gold bar draws in under the hero headline a beat after the page loads." },
    { id: "10", name: "10 · Diagonal Dividers", bold: true, note: "Bold: the bands below the credibility strip meet at a soft diagonal cut instead of a straight line, all the way down the page." },
    { id: "11", name: "11 · Day-to-Dusk Hero Tint", bold: true, note: "Bold: the hero photo gets a soft dawn / day / dusk / night color wash based on the clock on your own device right now." }
  ];
  var PHOTOS = [
    { id: "fixed", name: "Stays put (standard)", note: "The photo holds still and the words scroll over it." },
    { id: "scroll", name: "Scrolls with the page", note: "The photo moves up with the words." }
  ];
  var FX_IDS = ["3", "4", "5", "6", "7", "8", "10", "11"];
  var root = document.documentElement;
  var SVG_NS = "http://www.w3.org/2000/svg";

  function noop() {}

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
    try { return localStorage.getItem("ttc-lab6-" + key) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem("ttc-lab6-" + key, val); } catch (e) {}
    try {
      var u = new URL(location.href); u.searchParams.set(key, val);
      history.replaceState(null, "", u.toString());
    } catch (e) {}
  }

  /* ---------- Effects (options 2-11): setup returns a teardown function ---------- */

  // Option 3 — Click-to-Call Pill: on phones, a round call button appears in the corner once
  // you've scrolled a little, so the number is always one tap away. style-lab.css hides it above
  // 680px, so this is a quiet no-op on tablets/desktop.
  function setupFx3(scope) {
    var btn = document.createElement("a");
    btn.href = "tel:+14357521884";
    btn.className = "lab-call-pill";
    btn.setAttribute("aria-label", "Call Total Tree Care");
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.7 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.3 21 3 13.7 3 4.6c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.2 2.2z"/></svg>';
    document.body.appendChild(btn);

    function update() { btn.classList.toggle("lab-in", window.scrollY > 500); }
    var onScroll = throttleRaf(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return function teardown() {
      window.removeEventListener("scroll", onScroll);
      if (btn.parentNode) btn.parentNode.removeChild(btn);
    };
  }

  // Option 4 — Trust Ticker: a slim line inside the (already-dark-on-standard) credibility strip
  // that quietly crossfades through facts already on this page — read live from the credibility
  // strip and the stats grid, never hardcoded, so it can never say something the page doesn't.
  // Appended INSIDE .cred-strip (not as a new sibling) so it never breaks the
  // ".cred-strip + .section" dark-band rule in site.css.
  function setupFx4(scope) {
    var credStrip = scope.querySelector(".cred-strip");
    if (!credStrip) return noop;
    var items = Array.prototype.slice.call(credStrip.querySelectorAll(".cred")).map(function (el) { return el.textContent.trim(); });
    Array.prototype.slice.call(scope.querySelectorAll(".stats .stat")).forEach(function (el) {
      var num = el.querySelector(".stat__num"), label = el.querySelector(".stat__label");
      var text = (num ? num.textContent.trim() : "") + " " + (label ? label.textContent.trim() : "");
      text = text.trim();
      if (text) items.push(text);
    });
    items = items.filter(Boolean);
    if (!items.length) return noop;

    var bar = document.createElement("div");
    bar.className = "lab-ticker";
    bar.setAttribute("aria-hidden", "true"); // decorative echo — every fact here is already accessible in .cred-strip / .stats
    var span = document.createElement("span");
    span.className = "lab-ticker__text";
    bar.appendChild(span);
    credStrip.appendChild(bar);

    var i = -1, timer = null, inView = true;
    function next() {
      i = (i + 1) % items.length;
      span.classList.remove("lab-in");
      setTimeout(function () {
        span.textContent = items[i];
        void span.offsetWidth; // restart the transition
        span.classList.add("lab-in");
      }, prefersReduced() ? 0 : 220);
    }
    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { if (!document.hidden && inView) next(); schedule(); }, 3200);
    }
    next();
    if (prefersReduced()) {
      // static: show the first fact, never cycle.
    } else {
      schedule();
    }

    var io = null;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; }, { threshold: 0 });
      io.observe(bar);
    }

    return function teardown() {
      if (timer) clearTimeout(timer);
      if (io) { try { io.disconnect(); } catch (e) {} }
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    };
  }

  // Option 5 — Seasonal Tree-Care Note: a short note between the hero and the credibility strip,
  // picking one of three real, already-published tips by the visitor's current month (no invented
  // facts — each sentence is drawn from the matching page's own copy) and linking to that page.
  // Inserted BEFORE .cred-strip so its own next-sibling relationship (and the dark-band rule that
  // depends on it) is untouched.
  var SEASON_TIPS = [
    { months: [11, 12, 1, 2], text: "Winter is an ideal time for tree work — the trees are dormant, so it's easier to see their structure and spot problems.", href: "/frequently-asked-questions/", label: "Read our winter-work FAQ" },
    { months: [3, 4, 5, 6, 7, 8], text: "Fruit tree spray season runs from around March, as trees come out of dormancy, through the growing season.", href: "/our-services/fruit-tree-spraying/", label: "See the spray program" },
    { months: [9, 10], text: "Fruit trees are pruned every year, any time after the leaves drop, through the winter.", href: "/our-services/tree-pruning/", label: "See tree pruning" }
  ];
  function setupFx5(scope) {
    var credStrip = scope.querySelector(".cred-strip");
    if (!credStrip) return noop;
    var month = new Date().getMonth() + 1;
    var tip = SEASON_TIPS.filter(function (t) { return t.months.indexOf(month) !== -1; })[0] || SEASON_TIPS[0];

    var bar = document.createElement("div");
    bar.className = "lab-season";
    var inner = document.createElement("div");
    inner.className = "lab-season__inner";
    inner.innerHTML =
      '<span class="lab-season__text">' + tip.text.replace(/&/g, "&amp;").replace(/</g, "&lt;") + " " +
      '<a href="' + tip.href + '">' + tip.label + "</a></span>" +
      '<button type="button" class="lab-season__close" aria-label="Dismiss">×</button>';
    bar.appendChild(inner);
    credStrip.parentNode.insertBefore(bar, credStrip);

    var closeBtn = inner.querySelector(".lab-season__close");
    function onClose() { if (bar.parentNode) bar.parentNode.removeChild(bar); }
    closeBtn.addEventListener("click", onClose);
    requestAnimationFrame(function () { bar.classList.add("lab-in"); });

    return function teardown() {
      closeBtn.removeEventListener("click", onClose);
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    };
  }

  // Option 6 — Photo Tiles Breathe: crew photos gently scale + drift inside their own frame as
  // they pass through the middle of the screen (a subtle parallax "breathing" feel), computed only
  // for tiles currently in view and paused while the tab is hidden. Skipped entirely under reduced
  // motion — the DOM is never restructured, so nothing changes for screen readers.
  function setupFx6(scope) {
    if (prefersReduced()) return noop;
    var imgs = Array.prototype.slice.call(scope.querySelectorAll(".crew-teaser img"));
    if (!imgs.length) return noop;

    var tiles = imgs.map(function (img) {
      var frame = document.createElement("div");
      frame.className = "lab-tile-frame";
      img.parentNode.insertBefore(frame, img);
      frame.appendChild(img);
      img.classList.add("lab-tile-img");
      return { frame: frame, img: img, inView: false };
    });

    var io = null;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var t = tiles.filter(function (x) { return x.frame === entry.target; })[0];
          if (t) t.inView = entry.isIntersecting;
        });
        wake();
      }, { threshold: [0, .25, .5, .75, 1] });
      tiles.forEach(function (t) { io.observe(t.frame); });
    } else {
      tiles.forEach(function (t) { t.inView = true; });
    }

    var rafId = null;
    function update() {
      rafId = null;
      if (document.hidden) return;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      tiles.forEach(function (t) {
        if (!t.inView) return;
        var r = t.frame.getBoundingClientRect();
        var center = r.top + r.height / 2;
        var prog = 1 - Math.min(1, Math.abs(center - vh / 2) / (vh / 2 || 1));
        var scale = 1 + prog * 0.05;
        var ty = (0.5 - prog) * 6;
        t.img.style.transform = "scale(" + scale.toFixed(3) + ") translateY(" + ty.toFixed(2) + "px)";
      });
    }
    function wake() { if (!rafId) rafId = requestAnimationFrame(update); }
    var onScroll = wake, onResize = debounce(wake, 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", wake);
    wake();

    return function teardown() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", wake);
      if (rafId) cancelAnimationFrame(rafId);
      if (io) { try { io.disconnect(); } catch (e) {} }
      tiles.forEach(function (t) {
        t.img.style.transform = "";
        t.img.classList.remove("lab-tile-img");
        t.frame.parentNode.insertBefore(t.img, t.frame);
        if (t.frame.parentNode) t.frame.parentNode.removeChild(t.frame);
      });
    };
  }

  // Option 7 — Growth Rings: faint concentric "tree ring" circles draw in behind each stat number
  // the moment its card scrolls into view — the same moment site.css/menu.js's own count-up fires,
  // so the rings and the number land together without this file touching that standard code.
  function setupFx7(scope) {
    var stats = Array.prototype.slice.call(scope.querySelectorAll(".stats .stat"));
    if (!stats.length) return noop;
    var reduced = prefersReduced();

    var items = stats.map(function (stat) {
      var svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("class", "lab-rings");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("aria-hidden", "true");
      [16, 26, 36].forEach(function (r, i) {
        var c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", "50"); c.setAttribute("cy", "50"); c.setAttribute("r", String(r));
        c.setAttribute("class", "lab-ring lab-ring--" + i);
        var circumference = 2 * Math.PI * r;
        c.style.strokeDasharray = String(circumference);
        c.style.strokeDashoffset = String(circumference);
        svg.appendChild(c);
      });
      stat.classList.add("lab-has-rings");
      stat.insertBefore(svg, stat.firstChild);
      return { stat: stat, svg: svg, done: false };
    });

    if (reduced) {
      items.forEach(function (it) { it.svg.classList.add("lab-in"); });
      return function teardown() {
        items.forEach(function (it) {
          it.stat.classList.remove("lab-has-rings");
          if (it.svg.parentNode) it.svg.parentNode.removeChild(it.svg);
        });
      };
    }

    var io = null;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var it = items.filter(function (x) { return x.stat === entry.target; })[0];
          if (it && entry.isIntersecting && !it.done) { it.done = true; it.svg.classList.add("lab-in"); io.unobserve(entry.target); }
        });
      }, { threshold: .4 });
      items.forEach(function (it) { io.observe(it.stat); });
    } else {
      items.forEach(function (it) { it.svg.classList.add("lab-in"); });
    }

    return function teardown() {
      if (io) { try { io.disconnect(); } catch (e) {} }
      items.forEach(function (it) {
        it.stat.classList.remove("lab-has-rings");
        if (it.svg.parentNode) it.svg.parentNode.removeChild(it.svg);
      });
    };
  }

  // Option 8 — Hero Underline Draw: a solid gold bar draws in under the hero headline a beat after
  // the page loads (a one-time entrance, not scroll-linked). No DOM split — just a class, so
  // there's nothing for screen readers or the printed page to notice.
  function setupFx8(scope) {
    var h1 = scope.querySelector(".hero__title");
    if (!h1) return noop;
    h1.classList.add("lab-underline-draw");
    var timer = null;
    if (prefersReduced()) {
      h1.classList.add("lab-in");
    } else {
      timer = setTimeout(function () { h1.classList.add("lab-in"); }, 300);
    }
    return function teardown() {
      if (timer) clearTimeout(timer);
      h1.classList.remove("lab-underline-draw", "lab-in");
    };
  }

  // Option 10 — Diagonal Dividers: the bands from the stats section down meet at a soft diagonal
  // cut instead of a straight line. Pure CSS clip-path on each section's own background, so the
  // colors on either side of every cut are always correct with no color-matching logic needed.
  // Skips the hero and the credibility strip (the hero's own "stays put" photo uses its own
  // clip-path — this never touches it) — a static shape, so there's no motion to reduce.
  function setupFx10(scope) {
    var main = scope.querySelector("main");
    if (!main) return noop;
    var sections = Array.prototype.slice.call(main.children).filter(function (el) { return el.tagName === "SECTION"; });
    if (sections.length < 3) return noop;
    var targets = sections.slice(2);
    targets.forEach(function (el) { el.classList.add("lab-diagonal"); });
    return function teardown() {
      targets.forEach(function (el) { el.classList.remove("lab-diagonal"); });
    };
  }

  // Option 11 — Day-to-Dusk Hero Tint: the hero photo gets a soft color wash based on the visitor's
  // own local hour, read once when the look is chosen (not a live clock — no ticking timer to
  // maintain or to pause/resume).
  function setupFx11(scope) {
    var hero = scope.querySelector(".hero-slides");
    if (!hero) return noop;
    var h = new Date().getHours();
    var cls = (h >= 5 && h < 8) ? "lab-tint-dawn" : (h >= 8 && h < 17) ? "lab-tint-day" : (h >= 17 && h < 20) ? "lab-tint-dusk" : "lab-tint-night";
    hero.classList.add("lab-tint", cls);
    return function teardown() {
      hero.classList.remove("lab-tint", "lab-tint-dawn", "lab-tint-day", "lab-tint-dusk", "lab-tint-night");
    };
  }

  var FX_SETUP = {
    "3": setupFx3, "4": setupFx4, "5": setupFx5, "6": setupFx6,
    "7": setupFx7, "8": setupFx8, "10": setupFx10, "11": setupFx11
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
