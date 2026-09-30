/* Page lab ideas for the "about" page group (src/pages/about-us.html). Preview only. */
window.TTC_PAGE_LAB = { group: "about", title: "About page", options: [

  // 2 · Ergonomics — every bio auto-expands (no click needed) + bigger text/targets across the section.
  { id: "2", kind: "Ergonomics", name: "2 · Bigger text, no extra taps",
    note: "Every bio opens automatically, and text, ISA logos and avatars all get bigger for easier reading.",
    setup: function () {
      var toggles = Array.prototype.slice.call(document.querySelectorAll(".team-card__toggle[aria-controls]"));
      var opened = [];
      toggles.forEach(function (btn) {
        if (btn.getAttribute("aria-expanded") !== "true") { btn.click(); opened.push(btn); }
      });
      return function teardown() {
        opened.forEach(function (btn) {
          if (btn.getAttribute("aria-expanded") === "true") btn.click();
        });
      };
    } },

  // 3 · Feature — filter chips built from each team card's own <ul class="creds"> tags (no invented facts).
  { id: "3", kind: "Feature", name: "3 · Filter the crew by credential",
    note: "Tap a credential chip above Our Team to spotlight just the crew members who hold it.",
    setup: function () {
      var grid = document.querySelector(".team-grid");
      if (!grid || !grid.parentNode) return null;
      var cards = Array.prototype.slice.call(grid.querySelectorAll(".team-card"));
      var labels = [];
      cards.forEach(function (card) {
        Array.prototype.forEach.call(card.querySelectorAll(".creds li"), function (li) {
          var t = (li.textContent || "").trim();
          if (t && labels.indexOf(t) === -1) labels.push(t);
        });
      });
      if (!labels.length) return null;

      var bar = document.createElement("div");
      bar.className = "plab-filterbar";
      bar.setAttribute("role", "group");
      bar.setAttribute("aria-label", "Filter crew by credential");

      function cardMatches(card, label) {
        if (label === null) return true;
        return Array.prototype.some.call(card.querySelectorAll(".creds li"), function (li) {
          return (li.textContent || "").trim() === label;
        });
      }
      function selectLabel(label, btn) {
        Array.prototype.forEach.call(bar.querySelectorAll(".plab-filter-chip"), function (c) {
          c.classList.remove("is-active"); c.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("is-active"); btn.setAttribute("aria-pressed", "true");
        cards.forEach(function (card) { card.classList.toggle("plab-dim", !cardMatches(card, label)); });
      }
      function mkChip(text, label, active) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "topic-chip plab-filter-chip" + (active ? " is-active" : "");
        b.textContent = text;
        b.setAttribute("aria-pressed", active ? "true" : "false");
        b.addEventListener("click", function () { selectLabel(label, b); });
        return b;
      }

      bar.appendChild(mkChip("All crew", null, true));
      labels.forEach(function (label) { bar.appendChild(mkChip(label, label, false)); });
      grid.parentNode.insertBefore(bar, grid);

      return function teardown() {
        bar.remove();
        cards.forEach(function (card) { card.classList.remove("plab-dim"); });
      };
    } },

  // 4 · Clarity — a small "Jump to" bar right under the intro, linking to the sections already on the page.
  { id: "4", kind: "Clarity", name: "4 · Jump-to section nav",
    note: "A “Jump to” bar under the intro links straight to Credentials, Our Team and Qualifications.",
    setup: function () {
      var credSection = document.getElementById("credentials");
      var qualSection = document.getElementById("other-qualifications");
      var teamGrid = document.querySelector(".team-grid");
      var teamSection = teamGrid ? teamGrid.closest("section") : null;
      var targets = [];
      if (credSection) targets.push(["Credentials", credSection]);
      if (teamSection) targets.push(["Our Team", teamSection]);
      if (qualSection) targets.push(["Qualifications", qualSection]);
      if (targets.length < 2) return null;

      var reduce = false;
      try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

      var marked = [];
      targets.forEach(function (t) {
        if (!t[1].classList.contains("plab-jump-target")) { t[1].classList.add("plab-jump-target"); marked.push(t[1]); }
      });

      var nav = document.createElement("nav");
      nav.className = "plab-jumpnav";
      nav.setAttribute("aria-label", "Jump to a section on this page");
      var label = document.createElement("span");
      label.className = "plab-jumpnav__label";
      label.textContent = "Jump to:";
      nav.appendChild(label);
      targets.forEach(function (t) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "plab-jumpnav__link";
        btn.textContent = t[0];
        btn.addEventListener("click", function () {
          t[1].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        });
        nav.appendChild(btn);
      });

      var firstSection = document.querySelector("main .section");
      var inserted = false;
      if (firstSection && firstSection.parentNode) {
        firstSection.parentNode.insertBefore(nav, firstSection.nextSibling);
        inserted = true;
      } else {
        var main = document.getElementById("main");
        if (main) { main.insertBefore(nav, main.firstChild); inserted = true; }
      }
      if (!inserted) return null;

      return function teardown() {
        nav.remove();
        marked.forEach(function (el) { el.classList.remove("plab-jump-target"); });
      };
    } }

] };
