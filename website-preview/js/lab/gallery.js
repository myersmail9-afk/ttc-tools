/* Page lab ideas for the "gallery" page group — preview only. Page: src/pages/gallery.html
   (109-photo justified-row grid, .gallery-item <a> wraps each thumb, lightbox lives in menu.js).
   2026-09-30: fresh round — Warm Frame Hover + Back to the top are now the standard (site.css,
   menu.js). These four ideas layer on top of that standard; none of them touch .gallery-item's
   href/data-index/DOM order, and none reuse the retired Always-On Zoom Cue or Photo of the Day
   ideas (kept in working/retired/lab-2026-09-30/ for reference only). */
(function () {
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  window.TTC_PAGE_LAB = {
    group: "gallery",
    title: "Gallery",
    options: [
      {
        id: "2", kind: "Aesthetic", name: "2 · Editorial black & white",
        note: "Photos sit in soft black & white and bloom into color on hover/focus, on top of the standard lift + gradient — a gallery-wall feel."
        // CSS-only — see css/lab/gallery.css
      },
      {
        id: "3", kind: "Ergonomics", name: "3 · Bigger photos, steadier lightbox controls",
        note: "Larger thumbnails with more breathing room, a plain-language tap hint above the grid, and lightbox next/prev/close buttons that stay visible instead of fading out.",
        setup: function () {
          var grid = document.querySelector(".gallery-grid");
          if (!grid) return null;
          var hint = document.createElement("p");
          hint.className = "pl3-hint";
          hint.textContent = "Tap any photo to see it full-size. Use the arrows or swipe to move between photos.";
          grid.parentNode.insertBefore(hint, grid);
          return function teardown() {
            hint.remove();
          };
        }
      },
      {
        id: "4", kind: "Feature", name: "4 · Slideshow mode",
        note: "A play button inside the lightbox auto-advances through the photos every few seconds, hands-free — click again (or Pause) to stop.",
        setup: function () {
          if (reduceMotion) return null; // no auto-advancing motion when reduced motion is on
          var dialog = document.querySelector("dialog.lightbox");
          var nextBtn = dialog ? dialog.querySelector(".lightbox__next") : null;
          var closeBtn = dialog ? dialog.querySelector(".lightbox__close") : null;
          if (!dialog || !nextBtn || !closeBtn) return null;

          var playBtn = document.createElement("button");
          playBtn.type = "button";
          playBtn.className = "pl4-play";
          playBtn.setAttribute("aria-label", "Play slideshow");
          playBtn.textContent = "▶";
          dialog.insertBefore(playBtn, closeBtn);

          var timer = null;
          function stop() {
            if (timer) { clearInterval(timer); timer = null; }
            playBtn.textContent = "▶";
            playBtn.setAttribute("aria-label", "Play slideshow");
            playBtn.classList.remove("is-playing");
          }
          function start() {
            timer = setInterval(function () { nextBtn.click(); }, 3000);
            playBtn.textContent = "❚❚";
            playBtn.setAttribute("aria-label", "Pause slideshow");
            playBtn.classList.add("is-playing");
          }
          function onPlayClick() { if (timer) stop(); else start(); }
          playBtn.addEventListener("click", onPlayClick);
          dialog.addEventListener("close", stop);

          return function teardown() {
            stop();
            dialog.removeEventListener("close", stop);
            playBtn.removeEventListener("click", onPlayClick);
            if (playBtn.parentNode) playBtn.parentNode.removeChild(playBtn);
          };
        }
      },
      {
        id: "5", kind: "Clarity", name: "5 · Visible captions in the lightbox",
        note: "Each enlarged photo shows its own caption at the bottom — pulled from the same description already on the page — so it's clear what you're looking at.",
        setup: function () {
          var dialog = document.querySelector("dialog.lightbox");
          var imgEl = dialog ? dialog.querySelector(".lightbox__img") : null;
          if (!dialog || !imgEl) return null;

          var caption = document.createElement("div");
          caption.className = "pl5-caption";
          dialog.appendChild(caption);

          function sync() {
            var text = imgEl.getAttribute("alt") || "";
            caption.textContent = text;
            caption.hidden = !text;
          }
          sync();

          var mo = null;
          if (window.MutationObserver) {
            mo = new MutationObserver(sync);
            mo.observe(imgEl, { attributes: true, attributeFilter: ["alt"] });
          }

          return function teardown() {
            if (mo) mo.disconnect();
            if (caption.parentNode) caption.parentNode.removeChild(caption);
          };
        }
      }
    ]
  };
})();
