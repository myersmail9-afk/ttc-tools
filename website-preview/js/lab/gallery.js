/* Page lab ideas for the "gallery" page group — preview only. Page: src/pages/gallery.html
   (109-photo justified-row grid, .gallery-item <a> wraps each thumb, lightbox lives in menu.js).
   Each option is additive/CSS-first and fully tears down; none of them touch .gallery-item's
   href/data-index, so the lightbox's click handlers and photo order are never disturbed. */
window.TTC_PAGE_LAB = { group: "gallery", title: "Gallery", options: [
  {
    id: "2", kind: "Aesthetic", name: "2 · Warm Frame Hover",
    note: "Photos lift with a soft shadow and a gentle bottom gradient + view cue on hover/focus.",
    // CSS-only (see gallery.css) — no setup needed.
  },
  {
    id: "3", kind: "Ergonomics", name: "3 · Always-On Zoom Cue",
    note: "A small always-visible zoom badge on every photo, plus more breathing room between photos — clearer that everything is tappable, even without hovering.",
    // CSS-only (see gallery.css) — no setup needed.
  },
  {
    id: "4", kind: "Feature", name: "4 · Photo of the Day",
    note: "One photo is spotlighted at the top of the grid each day — enlarged, badged, and ringed in gold — so the page feels alive on a repeat visit.",
    setup: function () {
      var items = Array.prototype.slice.call(document.querySelectorAll(".gallery-grid .gallery-item"));
      if (!items.length) return null;
      function dayOfYear(d) {
        var start = new Date(d.getFullYear(), 0, 0);
        return Math.floor((d - start) / 86400000);
      }
      var idx = dayOfYear(new Date()) % items.length;
      var el = items[idx];
      el.classList.add("pl-spotlight");
      var badge = document.createElement("span");
      badge.className = "pl-spotlight__badge";
      badge.textContent = "Photo of the Day";
      badge.setAttribute("aria-hidden", "true");
      el.appendChild(badge);
      return function teardown() {
        el.classList.remove("pl-spotlight");
        if (badge.parentNode) badge.parentNode.removeChild(badge);
      };
    }
  },
  {
    id: "5", kind: "Clarity", name: "5 · Back to Top",
    note: "A small “Back to top” button appears once you've scrolled past the first screenful of the 109 photos, so getting back up doesn't mean a long scroll or swipe.",
    setup: function () {
      var grid = document.querySelector(".gallery-grid");
      if (!grid) return null;
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pl-backtop";
      btn.textContent = "Back to top ↑";
      btn.setAttribute("aria-label", "Back to top of the gallery");
      btn.hidden = true;
      document.body.appendChild(btn);

      function onScroll() {
        btn.hidden = window.scrollY < 700;
      }
      function toTop() {
        if (reduceMotion) window.scrollTo(0, 0);
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }
      btn.addEventListener("click", toTop);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      return function teardown() {
        window.removeEventListener("scroll", onScroll);
        btn.removeEventListener("click", toTop);
        if (btn.parentNode) btn.parentNode.removeChild(btn);
      };
    }
  }
] };
