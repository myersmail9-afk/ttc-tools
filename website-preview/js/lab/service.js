/* Page lab ideas for the "service" page group — shared template for all ten service detail
   pages (src/pages/our-services__*.html): back link, .svc-hero, .svc-trust, .svc-section blocks
   (signs / what's included / how it works / what to expect / best time / about cost), .svc-faq
   dl, Other Services cards, CTA band. Every option below works generically off that shared
   markup so it behaves the same on every service page. Preview only. */
(function () {
  var JOBBER_BTN_ID = "work-request-button-5a7fcc26-6b73-4bec-a630-dd63f55352e9";
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function forwardToJobber(a) {
    a.addEventListener("click", function (e) {
      var jobberBtn = document.getElementById(JOBBER_BTN_ID);
      if (jobberBtn) { e.preventDefault(); jobberBtn.click(); }
    });
  }

  window.TTC_PAGE_LAB = {
    group: "service",
    title: "Service page template",
    options: [
      {
        id: "2", kind: "Aesthetic", name: "2 · Framed & polished",
        note: "A softer framed hero photo, a centered trust badge, bigger step numbers, and an accented FAQ + testimonial for visual polish."
        // CSS-only — see css/lab/service.css
      },
      {
        id: "3", kind: "Ergonomics", name: "3 · Bigger, easier to read",
        note: "Larger body text and list spacing, bigger buttons that stack full-width on phones, and larger FAQ text — easier to scan and tap."
        // CSS-only — see css/lab/service.css
      },
      {
        id: "4", kind: "Feature", name: "4 · FAQ accordion",
        note: "The FAQ turns into a tap-to-expand accordion (first question open) instead of one long list, so it's quicker to scan.",
        setup: function () {
          var dl = document.querySelector(".svc-faq dl");
          if (!dl) return null;

          var pairs = [];
          Array.prototype.forEach.call(dl.children, function (child, i, arr) {
            if (child.tagName === "DT") {
              var next = arr[i + 1];
              pairs.push({ dt: child, dd: (next && next.tagName === "DD") ? next : null });
            }
          });
          if (!pairs.length) return null;

          var list = document.createElement("div");
          list.className = "svc-faq__list";
          var uid = "pl4-" + Math.random().toString(36).slice(2, 8);

          pairs.forEach(function (pair, i) {
            var answerId = uid + "-a" + i;
            var item = document.createElement("div");
            item.className = "svc-faq__item" + (i === 0 ? " is-open" : "");

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "svc-faq__q";
            btn.setAttribute("aria-expanded", i === 0 ? "true" : "false");
            btn.setAttribute("aria-controls", answerId);
            var labelSpan = document.createElement("span");
            labelSpan.innerHTML = pair.dt.innerHTML;
            var chev = document.createElement("span");
            chev.className = "svc-faq__chev";
            chev.setAttribute("aria-hidden", "true");
            btn.appendChild(labelSpan);
            btn.appendChild(chev);
            btn.addEventListener("click", function () {
              var open = item.classList.contains("is-open");
              item.classList.toggle("is-open", !open);
              btn.setAttribute("aria-expanded", String(!open));
            });

            var answer = document.createElement("div");
            answer.className = "svc-faq__a";
            answer.id = answerId;
            var inner = document.createElement("div");
            inner.className = "svc-faq__a-inner";
            inner.innerHTML = pair.dd ? pair.dd.innerHTML : "";
            answer.appendChild(inner);

            item.appendChild(btn);
            item.appendChild(answer);
            list.appendChild(item);
          });

          dl.style.display = "none";
          dl.insertAdjacentElement("afterend", list);

          return function teardown() {
            list.remove();
            dl.style.display = "";
          };
        }
      },
      {
        id: "5", kind: "Clarity", name: "5 · Jump nav + sticky estimate bar",
        note: "A sticky mini-nav jumps between sections and highlights where you are; on phones, “Get a Free Estimate” and “Call” pin to the bottom once you scroll.",
        setup: function () {
          var page = document.querySelector(".svc-page");
          var sections = Array.prototype.slice.call(document.querySelectorAll(".svc-section"));
          if (!page || !sections.length) return null;

          var addedIds = [];
          var navItems = sections.map(function (sec, i) {
            var h2 = sec.querySelector("h2");
            var label = h2 ? h2.textContent.trim() : ("Section " + (i + 1));
            if (!sec.id) { sec.id = "pl5-sec-" + i; addedIds.push(sec); }
            return { id: sec.id, label: label, el: sec };
          });

          var nav = document.createElement("nav");
          nav.className = "svc-jumpnav";
          nav.setAttribute("aria-label", "Jump to section");
          var row = document.createElement("div");
          row.className = "svc-jumpnav__row";
          nav.appendChild(row);

          var links = navItems.map(function (item) {
            var a = document.createElement("a");
            a.href = "#" + item.id;
            a.className = "svc-jumpnav__link";
            a.textContent = item.label;
            a.addEventListener("click", function (e) {
              e.preventDefault();
              item.el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
              try { history.replaceState(null, "", "#" + item.id); } catch (err) {}
            });
            row.appendChild(a);
            return a;
          });

          var hero = document.querySelector(".svc-hero");
          (hero || page).insertAdjacentElement("afterend", nav);

          function updateOffset() {
            var topBar = document.querySelector(".top-bar");
            var offset = (topBar && window.innerWidth < 900) ? topBar.offsetHeight : 0;
            nav.style.top = offset + "px";
          }
          updateOffset();
          window.addEventListener("resize", updateOffset, { passive: true });

          var io = null;
          if (window.IntersectionObserver) {
            io = new IntersectionObserver(function (entries) {
              entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                links.forEach(function (l) { l.classList.remove("is-active"); });
                var match = row.querySelector('a[href="#' + entry.target.id + '"]');
                if (match) match.classList.add("is-active");
              });
            }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
            sections.forEach(function (sec) { io.observe(sec); });
          }

          // Mobile sticky estimate bar, built from the hero's own buttons (same text + links).
          var bar = null, onScroll = null;
          var estSrc = hero ? hero.querySelector("[data-estimate]") : null;
          var callSrc = hero ? hero.querySelector('a[href^="tel:"]') : null;
          if (estSrc) {
            bar = document.createElement("div");
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
            onScroll = function () {
              var past = hero.getBoundingClientRect().bottom < 0;
              bar.classList.toggle("is-visible", past);
            };
            window.addEventListener("scroll", onScroll, { passive: true });
            window.addEventListener("resize", onScroll, { passive: true });
            onScroll();
          }

          return function teardown() {
            nav.remove();
            window.removeEventListener("resize", updateOffset);
            if (io) io.disconnect();
            if (bar) {
              bar.remove();
              window.removeEventListener("scroll", onScroll);
              window.removeEventListener("resize", onScroll);
            }
            addedIds.forEach(function (sec) { sec.removeAttribute("id"); });
          };
        }
      }
    ]
  };
})();
