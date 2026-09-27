// Mobile hamburger + dropdown toggles + Jobber estimate trigger. No dependencies.
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

  // Dropdown toggle buttons: tap-to-open on mobile (nav slide-down), Escape closes on desktop too.
  document.querySelectorAll(".has-dropdown > .dropdown-toggle").forEach(function (toggle) {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      var li = toggle.parentElement;
      var open = li.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      // Close sibling dropdowns.
      document.querySelectorAll(".has-dropdown.is-open").forEach(function (other) {
        if (other !== li) {
          other.classList.remove("is-open");
          var otherToggle = other.querySelector(".dropdown-toggle");
          if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
        }
      });
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
