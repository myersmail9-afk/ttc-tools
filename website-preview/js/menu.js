// Mobile hamburger + tap-to-open dropdowns on touch. No dependencies.
(function () {
  var hamburger = document.getElementById("hamburger");
  var nav = document.getElementById("site-nav");
  if (hamburger && nav) {
    hamburger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.querySelectorAll(".has-dropdown > .dropdown-toggle").forEach(function (toggle) {
    toggle.addEventListener("click", function (e) {
      if (window.innerWidth < 900) {
        e.preventDefault();
        toggle.parentElement.classList.toggle("is-open");
      }
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
