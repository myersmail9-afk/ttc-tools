/* Page lab ideas for the "services" page group — src/pages/our-services.html
   (the "All Our Services" quick list + arborist intro + service card grid).
   Four preview-only options layered on top of the standard page. Each setup() returns a
   teardown() that fully undoes its DOM changes; CSS-only options omit setup(). */
(function () {
  var JOBBER_BTN_ID = "work-request-button-5a7fcc26-6b73-4bec-a630-dd63f55352e9";

  function forwardToJobber(a, sourceEl) {
    a.addEventListener("click", function (e) {
      var jobberBtn = document.getElementById(JOBBER_BTN_ID);
      if (jobberBtn) { e.preventDefault(); jobberBtn.click(); }
    });
  }

  // Groups the existing card names into simple categories for the Feature filter. This is only a
  // UI grouping of service names already on the page — no new facts, prices, or claims.
  var CATEGORY_MAP = {
    "Tree Pruning": "Pruning & Removal",
    "Tree Removal": "Pruning & Removal",
    "Shrub and Hedge Pruning": "Pruning & Removal",
    "Cabling and Bracing": "Pruning & Removal",
    "Plant Health Care": "Health & Diagnosis",
    "Fruit Tree Spraying": "Health & Diagnosis",
    "Air-Spade Root Work": "Health & Diagnosis",
    "Stump Grinding": "Cleanup",
    "Wood Chips/Mulch": "Cleanup",
    "Emergency and Storm Service": "Emergency",
    "Tree Consulting": "Consulting"
  };

  window.TTC_PAGE_LAB = {
    group: "services",
    title: "All Our Services",
    options: [
      {
        id: "2", kind: "Aesthetic", name: "2 · Polished cards",
        note: "Card photos zoom slightly on hover, a green accent line marks the active card, and the quick-list links get a small dot marker."
        // CSS-only — see css/lab/services.css
      },
      {
        id: "3", kind: "Ergonomics", name: "3 · Bigger, easier targets",
        note: "Bigger tap targets in the quick list and card buttons, larger type throughout, for easier tapping and scanning."
        // CSS-only — see css/lab/services.css
      },
      {
        id: "4", kind: "Feature", name: "4 · Filter by service type",
        note: "Filter chips above the grid narrow the 11 service cards down to Pruning & Removal, Health & Diagnosis, Cleanup, Emergency, or Consulting.",
        setup: function () {
          var grid = document.querySelector(".svc-grid");
          if (!grid) return null;
          var cards = Array.prototype.slice.call(grid.querySelectorAll(".svc-card"));
          if (!cards.length) return null;

          var cats = [];
          cards.forEach(function (card) {
            var h3 = card.querySelector("h3");
            var name = h3 ? h3.textContent.trim() : "";
            var cat = CATEGORY_MAP[name] || "More Services";
            card.setAttribute("data-pl-cat", cat);
            if (cats.indexOf(cat) === -1) cats.push(cat);
          });

          var bar = document.createElement("div");
          bar.className = "svc-filterbar";
          bar.setAttribute("role", "group");
          bar.setAttribute("aria-label", "Filter services by type");

          var allBtns = [];
          function applyFilter(cat) {
            cards.forEach(function (card) {
              var match = cat === "all" || card.getAttribute("data-pl-cat") === cat;
              card.style.display = match ? "" : "none";
            });
          }
          function makeBtn(label, cat) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "svc-filterchip";
            b.textContent = label;
            var active = cat === "all";
            b.setAttribute("aria-pressed", active ? "true" : "false");
            if (active) b.classList.add("is-active");
            b.addEventListener("click", function () {
              allBtns.forEach(function (x) { x.classList.remove("is-active"); x.setAttribute("aria-pressed", "false"); });
              b.classList.add("is-active");
              b.setAttribute("aria-pressed", "true");
              applyFilter(cat);
            });
            allBtns.push(b);
            return b;
          }

          bar.appendChild(makeBtn("All Services", "all"));
          cats.forEach(function (cat) { bar.appendChild(makeBtn(cat, cat)); });
          grid.parentNode.insertBefore(bar, grid);

          return function teardown() {
            bar.remove();
            cards.forEach(function (card) {
              card.style.display = "";
              card.removeAttribute("data-pl-cat");
            });
          };
        }
      },
      {
        id: "5", kind: "Clarity", name: "5 · Sticky estimate bar",
        note: "Once you scroll past the quick list, a slim bar pins “Get a Free Estimate” and “Call Us” to the bottom of the screen.",
        setup: function () {
          var quick = document.querySelector(".svc-quick");
          var estSrc = document.querySelector(".svc-card [data-estimate]");
          if (!quick || !estSrc) return null;
          var callSrc = document.querySelector(".svc-card a[href^=\"tel:\"]");

          var bar = document.createElement("div");
          bar.className = "svc-stickybar";

          var estA = document.createElement("a");
          estA.className = "btn btn--primary";
          estA.href = estSrc.getAttribute("href");
          estA.setAttribute("data-estimate", "");
          estA.textContent = estSrc.textContent.trim();
          forwardToJobber(estA);
          bar.appendChild(estA);

          if (callSrc) {
            var callA = document.createElement("a");
            callA.className = "btn btn--secondary";
            callA.href = callSrc.getAttribute("href");
            callA.textContent = callSrc.textContent.trim();
            bar.appendChild(callA);
          }
          document.body.appendChild(bar);

          function toggle() {
            var top = quick.getBoundingClientRect().bottom;
            bar.classList.toggle("is-visible", top < 0);
          }
          window.addEventListener("scroll", toggle, { passive: true });
          window.addEventListener("resize", toggle, { passive: true });
          toggle();

          return function teardown() {
            window.removeEventListener("scroll", toggle);
            window.removeEventListener("resize", toggle);
            bar.remove();
          };
        }
      }
    ]
  };
})();
