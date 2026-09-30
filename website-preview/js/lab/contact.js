/* Page lab ideas for the "contact" page group (src/pages/contact.html). Preview only. */
window.TTC_PAGE_LAB = { group: "contact", title: "Contact page", options: [

  // 2 · Aesthetic — CSS-only: card surface + zebra-striped hours table.
  { id: "2", kind: "Aesthetic", name: "2 · Card panel & tidy hours table",
    note: "Both columns sit on a card surface, and the hours table gets a striped, easier-to-scan look." },

  // 3 · Ergonomics — CSS-only: bigger tap targets and text for the phone link, hours and Call Us button.
  { id: "3", kind: "Ergonomics", name: "3 · Bigger targets, easier scanning",
    note: "The phone number, hours table and Call Us button all get bigger, easier-to-tap and easier-to-read." },

  // 4 · Feature — a floating "Call" pill that appears once the real phone link scrolls out of view.
  { id: "4", kind: "Feature", name: "4 · Floating call button",
    note: "Once you scroll past the phone number, a small call button follows so it's always one tap away.",
    setup: function () {
      var phoneLink = document.querySelector(".contact-details a[href^=\"tel:\"]");
      if (!phoneLink) return null;
      var numberText = (phoneLink.textContent || "").trim();

      var fab = document.createElement("a");
      fab.href = phoneLink.getAttribute("href");
      fab.className = "plab-callfab";
      fab.innerHTML =
        '<span class="plab-callfab__full">Call ' + numberText + "</span>" +
        '<span class="plab-callfab__short">Call</span>';
      document.body.appendChild(fab);

      var ticking = false;
      function update() {
        ticking = false;
        var rect = phoneLink.getBoundingClientRect();
        var stillVisible = rect.top < window.innerHeight && rect.bottom > 0;
        fab.classList.toggle("is-visible", !stillVisible);
      }
      function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      update();

      return function teardown() {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        fab.remove();
      };
    } },

  // 5 · Clarity — visually separates the estimate-request path from the "not a tree service" path.
  { id: "5", kind: "Clarity", name: "5 · Two clear paths",
    note: "The “Not a tree service request?” block becomes its own clearly separate box, so it's obvious which path is yours.",
    setup: function () {
      var details = document.querySelector(".contact-details");
      if (!details) return null;
      var heading = Array.prototype.filter.call(details.querySelectorAll("h3"), function (h) {
        return /not a tree service/i.test(h.textContent || "");
      })[0];
      if (!heading || !heading.parentNode) return null;

      var wrap = document.createElement("div");
      wrap.className = "plab-altpath";
      heading.parentNode.insertBefore(wrap, heading);
      var node = heading;
      var toMove = [];
      while (node) { toMove.push(node); node = node.nextElementSibling; }
      toMove.forEach(function (n) { wrap.appendChild(n); });

      return function teardown() {
        var parent = wrap.parentNode;
        if (!parent) return;
        while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap);
        parent.removeChild(wrap);
      };
    } }

] };
