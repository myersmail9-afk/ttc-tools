// Mobile hamburger + dropdown toggles + Jobber estimate trigger. No dependencies.

// Round-2 flag: set false to stop rendering the "Photo N of M · Label" text on the hero slideshow.
var SHOW_PHOTO_LABEL = true;

(function () {
  var hamburger = document.getElementById("hamburger");
  var nav = document.getElementById("site-nav");

  function closeNav() {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (hamburger) hamburger.setAttribute("aria-expanded", "false");
  }

  if (hamburger && nav) {
    hamburger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close on outside click.
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || e.target === hamburger || hamburger.contains(e.target)) return;
      closeNav();
    });

    // Close on any nav link click (mobile panel shouldn't stay open after navigating).
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { closeNav(); });
    });
  }

  // Escape closes the mobile panel and any open dropdown.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (nav && nav.classList.contains("is-open")) closeNav();
    document.querySelectorAll(".has-dropdown.is-open").forEach(function (li) {
      li.classList.remove("is-open");
      var toggle = li.querySelector(".dropdown-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Dropdown toggle buttons: click/tap-only (desktop AND mobile), one open at a time.
  document.querySelectorAll(".has-dropdown > .dropdown-toggle").forEach(function (toggle) {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var li = toggle.parentElement;
      var open = li.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      // Close sibling dropdowns (only one open at a time).
      document.querySelectorAll(".has-dropdown.is-open").forEach(function (other) {
        if (other !== li) {
          other.classList.remove("is-open");
          var otherToggle = other.querySelector(".dropdown-toggle");
          if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
        }
      });
    });
  });

  // Close any open dropdown on outside click.
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".has-dropdown.is-open").forEach(function (li) {
      if (li.contains(e.target)) return;
      li.classList.remove("is-open");
      var toggle = li.querySelector(".dropdown-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Jobber estimate trigger: every [data-estimate] opens the Jobber dialog via its hidden button.
  document.querySelectorAll("[data-estimate]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var jobberBtn = document.getElementById("work-request-button-5a7fcc26-6b73-4bec-a630-dd63f55352e9");
      if (jobberBtn) {
        e.preventDefault();
        jobberBtn.click();
      }
      // else: no-JS / missing-embed fallback — let the link's href do its job.
    });
  });
})();

// Google reviews strip: gentle auto-advance, pauses on hover/touch, off when the user prefers reduced motion.
(function () {
  var strip = document.querySelector("[data-autorotate]");
  if (!strip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var paused = false, t;
  ["mouseenter", "touchstart", "focusin"].forEach(function (e) { strip.addEventListener(e, function () { paused = true; }, { passive: true }); });
  ["mouseleave", "touchend", "focusout"].forEach(function (e) { strip.addEventListener(e, function () { paused = false; }, { passive: true }); });
  function step() {
    if (!paused) {
      var card = strip.querySelector(".greview"); if (!card) return;
      var w = card.getBoundingClientRect().width + 18;
      var atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
      strip.scrollTo({ left: atEnd ? 0 : strip.scrollLeft + w, behavior: "smooth" });
    }
    t = setTimeout(step, 6000);
  }
  t = setTimeout(step, 6000);
})();

// Team cards: "Read more" at the bottom of the card opens the rest of the bio above it.
// Works for every card that has a toggle, including single-paragraph bios (build renders the
// toggle for those too) — this is attribute-selector based, not conditioned on bio length.
document.querySelectorAll(".team-card__toggle[aria-controls]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var more = document.getElementById(btn.getAttribute("aria-controls"));
    var open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    more.hidden = !open;
    btn.textContent = open ? "Read less" : "Read more";
    btn.closest(".team-card").classList.toggle("is-open", open);
  });
});

// About deep link: #slug in the URL scrolls the matching team card into view and opens its
// Read more if it has one and it's closed. Runs on load and on hashchange.
(function () {
  function openFromHash() {
    var hash = window.location.hash.replace("#", "");
    if (!hash) return;
    var card = document.getElementById(hash);
    if (!card || !card.classList.contains("team-card")) return;
    var toggle = card.querySelector(".team-card__toggle[aria-controls]");
    if (toggle && toggle.getAttribute("aria-expanded") !== "true") toggle.click();
    // Jump instantly, then again once photos above the card have loaded and shifted the layout.
    card.scrollIntoView({ block: "start", behavior: "auto" });
    setTimeout(function () { card.scrollIntoView({ block: "start", behavior: "auto" }); }, 350);
  }
  window.addEventListener("hashchange", openFromHash);
  if (document.readyState === "complete") openFromHash();
  else window.addEventListener("load", openFromHash);
})();

// ============================================================
// Hero slideshow — crossfade, arrows/dots/pause, swipe, keyboard, reduced-motion aware.
// ============================================================
(function () {
  var hero = document.querySelector("[data-hero]");
  if (!hero) return;
  var track = hero.querySelector(".hero-slides__track");
  var slides = track ? Array.prototype.slice.call(track.querySelectorAll(".hero-slides__slide")) : [];
  if (!slides.length) return;

  var dotsWrap = hero.querySelector(".hero-slides__dots");
  var prevBtn = hero.querySelector(".hero-slides__prev");
  var nextBtn = hero.querySelector(".hero-slides__next");
  var pauseBtn = hero.querySelector(".hero-slides__pause");
  var labelEl = hero.querySelector(".hero-slides__label");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var INTERVAL = 10000; // 10 seconds per photo (Joseph 2026-09-27)
  var index = 0, timer = null, isPaused = false;

  // Perf pass (2026-09-27): the build only inlines slide 0's background-image (and preloads it);
  // every other slide carries its photo in data-bg so it isn't fetched until needed. applyBg() turns
  // a data-bg into the real background-image the first time a slide is shown, so the slideshow still
  // looks and behaves exactly the same — the browser just isn't downloading all 8 photos on load.
  function applyBg(slide) {
    if (slide && slide.dataset && slide.dataset.bg && !slide.style.backgroundImage) {
      slide.style.backgroundImage = "url(" + slide.dataset.bg + ")";
    }
  }

  // Each page load starts on the next photo in the list (random if this browser blocks storage).
  try {
    var last = parseInt(localStorage.getItem("ttc-hero-start"), 10);
    index = isNaN(last) ? 0 : (last + 1) % slides.length;
    localStorage.setItem("ttc-hero-start", String(index));
  } catch (e) { index = Math.floor(Math.random() * slides.length); }
  applyBg(slides[index]); // the slide that's about to show needs its real photo right away

  // The rest can wait until the page has otherwise finished loading — plenty of time before the
  // 10-second slideshow interval ever reaches them.
  if (document.readyState === "complete") {
    slides.forEach(applyBg);
  } else {
    window.addEventListener("load", function () { slides.forEach(applyBg); });
  }

  var dots = slides.map(function (slide, i) {
    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero-slides__dot";
    dot.setAttribute("aria-label", "Go to photo " + (i + 1));
    dot.addEventListener("click", function () { goTo(i); restart(); });
    if (dotsWrap) dotsWrap.appendChild(dot);
    return dot;
  });

  function updateLabel() {
    if (!labelEl) return;
    if (!SHOW_PHOTO_LABEL) { labelEl.textContent = ""; return; }
    var label = slides[index].getAttribute("data-label") || "";
    labelEl.textContent = "Photo " + (index + 1) + " of " + slides.length + (label ? " · " + label : "");
  }

  function render() {
    slides.forEach(function (s, i) { s.classList.toggle("is-active", i === index); });
    dots.forEach(function (d, i) { d.classList.toggle("is-active", i === index); });
    updateLabel();
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    applyBg(slides[index]); // make sure the incoming slide has its photo even if window "load" hasn't fired yet
    render();
  }
  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() {
    if (reduceMotion || isPaused) return;
    stop();
    timer = setInterval(next, INTERVAL);
  }
  function restart() { if (!isPaused) start(); }

  if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });
  if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });
  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      isPaused = !isPaused;
      if (isPaused) { stop(); } else { start(); }
      pauseBtn.textContent = isPaused ? "▶" : "❘❘";
      pauseBtn.setAttribute("aria-label", isPaused ? "Play slideshow" : "Pause slideshow");
    });
  }

  // Keyboard: left/right arrows when a control inside the hero has focus (bubbles up).
  hero.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { prev(); restart(); }
    else if (e.key === "ArrowRight") { next(); restart(); }
  });

  // Swipe on touch.
  var touchStartX = null;
  hero.addEventListener("touchstart", function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  hero.addEventListener("touchend", function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); restart(); }
    touchStartX = null;
  }, { passive: true });

  render();
  start();
})();

// ============================================================
// Gallery lightbox — one <dialog> built by JS, opened from .gallery-item clicks.
// ============================================================
(function () {
  var galleryLinks = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));
  if (!galleryLinks.length) return;

  var dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.innerHTML =
    '<span class="lightbox__counter"></span>' +
    '<button type="button" class="lightbox__close" aria-label="Close">✕</button>' +
    '<button type="button" class="lightbox__prev" aria-label="Previous photo">‹</button>' +
    '<img class="lightbox__img" src="" alt="">' +
    '<button type="button" class="lightbox__next" aria-label="Next photo">›</button>';
  document.body.appendChild(dialog);

  var imgEl = dialog.querySelector(".lightbox__img");
  var counterEl = dialog.querySelector(".lightbox__counter");
  var closeBtn = dialog.querySelector(".lightbox__close");
  var prevBtn = dialog.querySelector(".lightbox__prev");
  var nextBtn = dialog.querySelector(".lightbox__next");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) imgEl.style.transition = "opacity .2s ease";

  var current = 0;
  var lastFocused = null;
  var idleTimer = null;

  function srcFor(link) { return link.getAttribute("href"); }
  function altFor(link) {
    var img = link.querySelector("img");
    return img ? (img.getAttribute("alt") || "") : "";
  }
  function preload(i) {
    if (i < 0 || i >= galleryLinks.length) return;
    var im = new Image();
    im.src = srcFor(galleryLinks[i]);
  }

  function show(i) {
    current = (i + galleryLinks.length) % galleryLinks.length;
    var link = galleryLinks[current];
    if (!reduceMotion) {
      imgEl.style.opacity = "0";
      imgEl.onload = function () { imgEl.style.opacity = "1"; };
    }
    imgEl.src = srcFor(link);
    imgEl.alt = altFor(link);
    counterEl.textContent = (current + 1) + " / " + galleryLinks.length;
    preload(current + 1);
    preload(current - 1);
    wake();
  }

  function wake() {
    dialog.classList.remove("is-idle");
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { dialog.classList.add("is-idle"); }, 2000);
  }

  function open(i, triggerEl) {
    lastFocused = triggerEl || document.activeElement;
    show(i);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function requestClose() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  // Single place that runs on every close path (✕, backdrop, swipe-down, Escape via native dialog).
  dialog.addEventListener("close", function () {
    document.body.style.overflow = "";
    if (idleTimer) clearTimeout(idleTimer);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  });

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  galleryLinks.forEach(function (link, i) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      open(i, link);
    });
  });

  closeBtn.addEventListener("click", requestClose);
  prevBtn.addEventListener("click", function () { prev(); });
  nextBtn.addEventListener("click", function () { next(); });

  // Click on the backdrop (event target is the dialog itself, not its content) closes.
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) requestClose();
  });

  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") prev();
    else if (e.key === "ArrowRight") next();
    else if (e.key === "Escape") { e.preventDefault(); requestClose(); }
  });
  // Chrome can ignore the native Escape on a dialog opened without a fresh user gesture, so close it ourselves.
  dialog.addEventListener("cancel", function (e) {
    e.preventDefault(); requestClose();
  });

  dialog.addEventListener("mousemove", wake);
  dialog.addEventListener("pointermove", wake);

  // Swipe L/R (next/prev) and swipe down (close) via pointer events.
  var pointerStartX = null, pointerStartY = null, pointerId = null;
  dialog.addEventListener("pointerdown", function (e) {
    pointerId = e.pointerId;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
  });
  dialog.addEventListener("pointerup", function (e) {
    if (pointerStartX === null || e.pointerId !== pointerId) return;
    var dx = e.clientX - pointerStartX;
    var dy = e.clientY - pointerStartY;
    if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) {
      requestClose();
    } else if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
    pointerStartX = null; pointerStartY = null; pointerId = null;
  });
})();

// ============================================================
// Testimonial topic filter — chips filter the grid, keep focus, announce count.
// ============================================================
(function () {
  var chipsWrap = document.querySelector(".topic-chips");
  if (!chipsWrap) return;
  var chips = Array.prototype.slice.call(chipsWrap.querySelectorAll(".topic-chip"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".testimonial-grid .testimonial"));
  var countEl = document.querySelector(".testimonial-count");

  function apply(topic) {
    var count = 0;
    cards.forEach(function (card) {
      // data-topic may list more than one topic, space-separated (e.g. "crew fun")
      var match = topic === "all" || (" " + card.getAttribute("data-topic") + " ").indexOf(" " + topic + " ") !== -1;
      card.hidden = !match;
      if (match) count++;
    });
    if (countEl) countEl.textContent = "Showing " + count + (count === 1 ? " testimonial" : " testimonials");
  }

  chips.forEach(function (chip) {
    chip.setAttribute("aria-pressed", chip.classList.contains("is-active") ? "true" : "false");
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("is-active"); c.setAttribute("aria-pressed", "false"); });
      chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", "true");
      apply(chip.getAttribute("data-topic"));
      chip.focus();
    });
  });

  apply("all");
})();

// ============================================================
// Homepage standard: Gentle Motion — sections fade + rise into view as you scroll to them; the
// stat numbers count up from 0 the moment they come into view (Joseph 2026-09-27, promoted from
// the preview's Style Lab). Adds "js-reveal" to <html> the moment this runs — site.css only hides
// ".reveal-item" when that flag is present, so content is never hidden if this script doesn't run.
// Respects prefers-reduced-motion (reveals everything immediately, no animation).
// ============================================================
(function () {
  if (!document.body.classList.contains("page-home")) return;

  function prefersReduced() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch (e) { return false; }
  }

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

  // Adds "reveal-item" to every match up front (CSS then hides it, but only once "js-reveal" is on
  // <html> — see site.css), then adds "is-revealed" to reveal — one at a time, as each is observed
  // entering the viewport. Falls back to revealing everything immediately if IntersectionObserver
  // isn't available or motion is reduced, and force-reveals everything after a timeout as a safety
  // net, so nothing can end up stuck invisible.
  function makeReveal(selector, onEnter) {
    var els = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (!els.length) return;
    els.forEach(function (el) { el.classList.add("reveal-item"); });

    function revealOne(el) {
      el.classList.add("is-revealed");
      if (onEnter) { try { onEnter(el); } catch (e) {} }
    }
    function revealAll() { els.forEach(revealOne); }

    if (!prefersReduced() && window.IntersectionObserver) {
      try {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) { revealOne(entry.target); io.unobserve(entry.target); }
          });
        }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
        els.forEach(function (el) { io.observe(el); });
        setTimeout(revealAll, 4000);
      } catch (e) { revealAll(); }
    } else {
      revealAll();
    }
  }

  document.documentElement.classList.add("js-reveal");
  makeReveal(".stats .stat", function (el) {
    var num = el.querySelector(".stat__num");
    if (num) countUp(num);
  });
  makeReveal(".creds-tiles .tile");
  makeReveal(".crew-teaser > a");
})();

// Phone first screen: measure the green top bar + white header so the homepage hero can fill exactly the rest
// of the screen (CSS var --chrome-h, used in site.css). Joseph 2026-09-27.
(function () {
  if (!document.body.classList.contains("page-home")) return;
  function setChrome() {
    var t = document.querySelector(".top-bar"), h = document.querySelector(".site-header");
    var v = (t ? t.offsetHeight : 0) + (h ? h.offsetHeight : 0);
    document.documentElement.style.setProperty("--chrome-h", v + "px");
  }
  setChrome();
  window.addEventListener("resize", setChrome, { passive: true });
  window.addEventListener("load", setChrome);
})();


// Scroll progress bar (standard, Joseph 2026-09-30): thin gold line at the top that fills as you scroll.
(function () {
  var bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var ticking = false;
  function update() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = "scaleX(" + p + ")";
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", update);
  update();
})();

/* Contact page: floating call button appears once the phone number in Contact Details scrolls out of
   view (Joseph, 2026-09-30, promoted from the preview Style options). */
(function(){ var fab=document.querySelector("[data-call-fab]"); var phone=document.querySelector(".contact-details > p a[href^='tel:']"); if(!fab||!phone) return; var ticking=false; function update(){ ticking=false; var r=phone.getBoundingClientRect(); var seen=r.top<window.innerHeight&&r.bottom>0; fab.classList.toggle("is-visible",!seen); } function onScroll(){ if(!ticking){ticking=true;requestAnimationFrame(update);} } window.addEventListener("scroll",onScroll,{passive:true}); window.addEventListener("resize",onScroll,{passive:true}); update(); })();

/* Testimonials page: "Featured Quote + Star Rating" spotlight banner above the topic chips. Rotates
   through the (topic-filtered) reviews every 6s, reusing the page's own rating sentence and each
   card's real quote/author/link — never invents a number. Pauses on hover/focus, no auto-advance
   under prefers-reduced-motion, and stays in sync with the topic-chip filter above (Joseph,
   2026-09-30, promoted from the preview Style options). Only runs when the page has a testimonial
   grid and a lead paragraph, so it never touches any other page. */
(function () {
  var grid = document.querySelector(".testimonial-grid");
  var lead = document.querySelector(".lead");
  if (!grid || !lead) return;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var spot = document.createElement("div");
  spot.className = "testimonial-spotlight";
  spot.innerHTML =
    '<div class="testimonial-spotlight__rating"><span class="testimonial-spotlight__star" aria-hidden="true">★</span>' +
    '<span class="testimonial-spotlight__ratingline"></span></div>' +
    '<blockquote class="testimonial-spotlight__quote"><p></p></blockquote>' +
    '<p class="testimonial-spotlight__by"></p>' +
    '<div class="testimonial-spotlight__dots"></div>';
  lead.insertAdjacentElement("afterend", spot);

  // Reuse the exact rating sentence already on the page (never invent a number).
  var m = (lead.textContent || "").match(/(\d+(?:\.\d+)?)\s*stars from\s*(\d+)\s*Google reviews/i);
  spot.querySelector(".testimonial-spotlight__ratingline").textContent =
    m ? (m[1] + " out of 5 — " + m[2] + " Google reviews") : (lead.textContent || "").trim();

  var quoteP = spot.querySelector(".testimonial-spotlight__quote p");
  var byP = spot.querySelector(".testimonial-spotlight__by");
  var dotsWrap = spot.querySelector(".testimonial-spotlight__dots");
  var cards = [];
  var idx = 0;
  var timer = null;

  function collect() {
    // Reads whichever cards the topic-chip filter above has left visible; never filters on its own.
    cards = Array.prototype.slice.call(grid.querySelectorAll(".testimonial")).filter(function (c) { return !c.hidden; });
    dotsWrap.innerHTML = "";
    cards.forEach(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "testimonial-spotlight__dot";
      d.setAttribute("aria-label", "Show quote " + (i + 1) + " of " + cards.length);
      dotsWrap.appendChild(d);
    });
  }

  function render() {
    if (!cards.length) { spot.hidden = true; return; }
    spot.hidden = false;
    idx = ((idx % cards.length) + cards.length) % cards.length;
    var card = cards[idx];
    // Reads the review text from the blockquote only, so a card's star row (if any) is never quoted.
    var textEl = card.querySelector("blockquote p");
    quoteP.textContent = textEl ? textEl.textContent : "";
    byP.innerHTML = "";
    var cap = card.querySelector("figcaption");
    var link = cap ? cap.querySelector("a") : null;
    if (link) {
      var a = document.createElement("a");
      a.href = link.href; a.target = "_blank"; a.rel = "noopener";
      a.textContent = link.textContent.replace(/\s*Google review\s*$/, "").trim();
      byP.appendChild(a);
      var srcEl = cap.querySelector(".testimonial__src");
      if (srcEl) {
        byP.appendChild(document.createTextNode(" "));
        var badge = document.createElement("span");
        badge.className = "testimonial__src";
        badge.textContent = srcEl.textContent;
        byP.appendChild(badge);
      }
    } else if (cap) {
      byP.textContent = cap.textContent;
    }
    Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
      d.classList.toggle("is-active", i === idx);
    });
  }

  function next() { idx++; render(); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() { if (!reduceMotion && cards.length > 1) { stop(); timer = setInterval(next, 6000); } }

  collect();
  render();
  start();

  spot.addEventListener("mouseenter", stop);
  spot.addEventListener("mouseleave", start);
  spot.addEventListener("focusin", stop);
  spot.addEventListener("focusout", start);

  dotsWrap.addEventListener("click", function (e) {
    var i = Array.prototype.indexOf.call(dotsWrap.children, e.target);
    if (i > -1) { idx = i; render(); stop(); start(); }
  });

  // Stay in sync with whichever topic chip is active (the topic-chip filter above owns the actual
  // filtering; this only re-reads the result after that click handler has run).
  var chips = Array.prototype.slice.call(document.querySelectorAll(".topic-chip"));
  chips.forEach(function (c) {
    c.addEventListener("click", function () { idx = 0; collect(); render(); start(); });
  });
})();

/* Gallery: "Back to the top" button once you're past the first screenful of photos (Joseph, 2026-09-30,
   promoted from the preview Style options). */
(function(){ if(!document.querySelector(".gallery-grid")) return; var reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches; var btn=document.createElement("button"); btn.type="button"; btn.className="back-top"; btn.textContent="Back to the top ↑"; btn.hidden=true; document.body.appendChild(btn); btn.addEventListener("click",function(){ if(reduce) window.scrollTo(0,0); else window.scrollTo({top:0,behavior:"smooth"}); }); function onScroll(){ btn.hidden=window.scrollY<700; } window.addEventListener("scroll",onScroll,{passive:true}); onScroll(); })();

/* Homepage: sticky mini-header (Call + Free Estimate fade in once you're past the hero; 900px+ via CSS)
   and the magnetic "Get a Free Estimate" button (hover-capable pointers only). Joseph, 2026-09-30,
   promoted from the homepage preview Style options. */
(function(){
  if(!document.body.classList.contains("page-home")) return;
  var header=document.querySelector(".site-header"), inner=header&&header.querySelector(".site-header__inner");
  var hero=document.querySelector(".hero-slides")||document.querySelector(".hero");
  var est=document.querySelector(".hero .btn-row .btn--primary");
  var tel=document.querySelector(".hero .btn-row a[href^='tel:']");
  if(header&&inner&&hero&&est&&tel){
    var quick=document.createElement("div"); quick.className="mini-quick";
    var c=document.createElement("a"); c.className="mini-quick__call"; c.href=tel.getAttribute("href"); c.textContent="Call";
    var e=document.createElement("a"); e.className="mini-quick__est"; e.href=est.getAttribute("href"); e.textContent="Free Estimate";
    e.addEventListener("click",function(ev){ var j=document.getElementById("work-request-button-5a7fcc26-6b73-4bec-a630-dd63f55352e9"); if(j){ ev.preventDefault(); j.click(); } });
    quick.appendChild(c); quick.appendChild(e); inner.appendChild(quick);
    if(window.IntersectionObserver){ new IntersectionObserver(function(en){ header.classList.toggle("is-condensed",!en[0].isIntersecting); },{rootMargin:"-72px 0px 0px 0px"}).observe(hero); }
  }
  var hover=false; try{ hover=matchMedia("(hover: hover) and (pointer: fine)").matches; }catch(x){}
  if(est&&hover&&!matchMedia("(prefers-reduced-motion: reduce)").matches){
    est.classList.add("btn-magnetic"); var raf=null;
    est.addEventListener("mousemove",function(ev){ var r=est.getBoundingClientRect(); var x=ev.clientX-(r.left+r.width/2), y=ev.clientY-(r.top+r.height/2); if(raf) return; raf=requestAnimationFrame(function(){ raf=null; var m=10; est.style.transform="translate("+Math.max(-m,Math.min(m,x*.25)).toFixed(1)+"px,"+Math.max(-m,Math.min(m,y*.35)).toFixed(1)+"px)"; }); });
    est.addEventListener("mouseleave",function(){ if(raf) cancelAnimationFrame(raf); raf=null; est.style.transform=""; });
  }
})();
