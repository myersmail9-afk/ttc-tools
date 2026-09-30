/* Page lab ideas for the "testimonials" page group — preview only. Page: src/pages/testimonials.html
   (topic chips incl. multi-topic "Just for Fun", 32 Google-linked review quotes). None of these
   options touch .topic-chip click handling or [data-topic] filtering — they only read the DOM
   menu.js already filters, or add listeners alongside (never in place of) menu.js's own. */
window.TTC_PAGE_LAB = { group: "testimonials", title: "Testimonials", options: [
  {
    id: "2", kind: "Aesthetic", name: "2 · Quote Mark Cards",
    note: "A large soft quotation mark behind each review, with a gentle lift on hover — makes the grid read as quotes, not just text blocks.",
    // CSS-only (see testimonials.css) — no setup needed.
  },
  {
    id: "3", kind: "Ergonomics", name: "3 · Sticky Topic Filter",
    note: "On tablet/desktop, the topic chips stay in view while you scroll the reviews, so switching topics never means scrolling back to the top.",
    // CSS-only (see testimonials.css) — no setup needed.
  },
  {
    id: "4", kind: "Feature", name: "4 · Featured Quote + Star Rating",
    note: "A spotlight banner up top shows the page's own star rating and rotates through the (currently filtered) reviews every few seconds, with dots to jump around — pauses on hover/focus and under reduced motion.",
    setup: function () {
      var grid = document.querySelector(".testimonial-grid");
      var lead = document.querySelector(".lead");
      if (!grid || !lead) return null;
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      var spot = document.createElement("div");
      spot.className = "pl-spot";
      spot.innerHTML =
        '<div class="pl-spot__rating"><span class="pl-spot__star" aria-hidden="true">★</span>' +
        '<span class="pl-spot__ratingline"></span></div>' +
        '<blockquote class="pl-spot__quote"><p></p></blockquote>' +
        '<p class="pl-spot__by"></p>' +
        '<div class="pl-spot__dots"></div>';
      lead.insertAdjacentElement("afterend", spot);

      // Reuse the exact rating sentence already on the page (never invent a number).
      var m = (lead.textContent || "").match(/(\d+(?:\.\d+)?)\s*stars from\s*(\d+)\s*Google reviews/i);
      spot.querySelector(".pl-spot__ratingline").textContent =
        m ? (m[1] + " out of 5 — " + m[2] + " Google reviews") : (lead.textContent || "").trim();

      var quoteP = spot.querySelector(".pl-spot__quote p");
      var byP = spot.querySelector(".pl-spot__by");
      var dotsWrap = spot.querySelector(".pl-spot__dots");
      var cards = [];
      var idx = 0;
      var timer = null;

      function collect() {
        cards = Array.prototype.slice.call(grid.querySelectorAll(".testimonial")).filter(function (c) { return !c.hidden; });
        dotsWrap.innerHTML = "";
        cards.forEach(function (_, i) {
          var d = document.createElement("button");
          d.type = "button";
          d.className = "pl-spot__dot";
          d.setAttribute("aria-label", "Show quote " + (i + 1) + " of " + cards.length);
          dotsWrap.appendChild(d);
        });
      }

      function render() {
        if (!cards.length) { spot.hidden = true; return; }
        spot.hidden = false;
        idx = ((idx % cards.length) + cards.length) % cards.length;
        var card = cards[idx];
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

      function onDotClick(e) {
        var i = Array.prototype.indexOf.call(dotsWrap.children, e.target);
        if (i > -1) { idx = i; render(); stop(); start(); }
      }
      dotsWrap.addEventListener("click", onDotClick);

      // Stay in sync with whichever topic chip is active (menu.js owns the actual filtering;
      // this only re-reads the result after menu.js's own click handler has run).
      var chips = Array.prototype.slice.call(document.querySelectorAll(".topic-chip"));
      function onFilterChange() { idx = 0; collect(); render(); start(); }
      chips.forEach(function (c) { c.addEventListener("click", onFilterChange); });

      return function teardown() {
        stop();
        dotsWrap.removeEventListener("click", onDotClick);
        chips.forEach(function (c) { c.removeEventListener("click", onFilterChange); });
        if (spot.parentNode) spot.parentNode.removeChild(spot);
      };
    }
  },
  {
    id: "5", kind: "Clarity", name: "5 · Clear Filter Feedback",
    note: "A live “Showing X of Y” line plus a checkmark on the active topic chip, so it's always obvious what you're looking at and how many reviews matched.",
    setup: function () {
      var chipsWrap = document.querySelector(".topic-chips");
      var grid = document.querySelector(".testimonial-grid");
      if (!chipsWrap || !grid) return null;
      var total = grid.querySelectorAll(".testimonial").length;
      var countEl = document.createElement("p");
      countEl.className = "pl-tcount";
      countEl.setAttribute("aria-live", "polite");
      chipsWrap.insertAdjacentElement("afterend", countEl);

      function refresh() {
        var visible = grid.querySelectorAll(".testimonial:not([hidden])").length;
        countEl.textContent = "Showing " + visible + " of " + total + (total === 1 ? " testimonial" : " testimonials");
      }
      var chips = Array.prototype.slice.call(chipsWrap.querySelectorAll(".topic-chip"));
      chips.forEach(function (c) { c.addEventListener("click", refresh); });
      refresh();

      return function teardown() {
        chips.forEach(function (c) { c.removeEventListener("click", refresh); });
        if (countEl.parentNode) countEl.parentNode.removeChild(countEl);
      };
    }
  }
] };
