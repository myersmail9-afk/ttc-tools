/* Page lab ideas for the "testimonials" page group — preview only. Page: src/pages/testimonials.html
   (topic chips incl. multi-topic "Just for Fun", 32 Google-linked review quotes). None of these
   options touch .topic-chip click handling or [data-topic] filtering — they only read the DOM
   menu.js already filters, or add listeners alongside (never in place of) menu.js's own. */
window.TTC_PAGE_LAB = { group: "testimonials", title: "Testimonials", options: [
  {
    id: "2", kind: "Ergonomics", name: "2 · Sticky Topic Filter",
    note: "On tablet/desktop, the topic chips stay in view while you scroll the reviews, so switching topics never means scrolling back to the top.",
    // CSS-only (see testimonials.css) — no setup needed.
  },
  {
    id: "3", kind: "Clarity", name: "3 · Clear Filter Feedback",
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
