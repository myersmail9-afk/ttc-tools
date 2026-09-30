/* Page lab ideas for the "signup" page group (fruit-tree-spray-sign-up.html) — preview only. */
window.TTC_PAGE_LAB = { group: "signup", title: "Fruit Tree Spray Sign-Up", options: [

  { id: "2", kind: "Aesthetic", name: "2 · Tier cards",
    note: "The four protection levels become a row of pricing-style cards instead of a plain bullet list, with the top tier highlighted.",
    // CSS-only — see css/lab/signup.css.
  },

  { id: "3", kind: "Ergonomics", name: "3 · Sticky sign-up bar",
    note: "Once you scroll past the hero, the Sign Up and Call buttons stay pinned at the top so you never have to scroll back up to act.",
    setup: function () {
      var hero = document.querySelector(".svc-hero");
      var primary = hero && hero.querySelector("a.btn--primary[data-estimate]");
      var secondary = hero && hero.querySelector("a.btn--secondary");
      if (!hero || !primary) return;

      var bar = document.createElement("div");
      bar.className = "signup-lab-stickybar";
      var inner = document.createElement("div");
      inner.className = "signup-lab-stickybar__inner";

      var p2 = primary.cloneNode(true);
      p2.addEventListener("click", function (e) {
        var jobberBtn = document.getElementById("work-request-button-5a7fcc26-6b73-4bec-a630-dd63f55352e9");
        if (jobberBtn) { e.preventDefault(); jobberBtn.click(); }
      });
      inner.appendChild(p2);
      if (secondary) inner.appendChild(secondary.cloneNode(true));

      bar.appendChild(inner);
      bar.hidden = true;
      document.body.appendChild(bar);

      var onScroll = function () { bar.hidden = hero.getBoundingClientRect().bottom > 0; };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);

      return function teardown() {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        bar.remove();
      };
    }
  },

  { id: "4", kind: "Feature", name: "4 · Compare tiers side-by-side",
    note: "A toggle switches the tier list into a side-by-side comparison view, same wording, easier to weigh against each other.",
    setup: function () {
      var sections = Array.prototype.slice.call(document.querySelectorAll(".svc-section"));
      var section = sections.filter(function (s) {
        var h2 = s.querySelector("h2");
        return h2 && /level of protection/i.test(h2.textContent);
      })[0];
      var ul = section && section.querySelector("ul");
      if (!section || !ul) return;
      var items = Array.prototype.slice.call(ul.querySelectorAll("li"));
      if (!items.length) return;

      var toggleWrap = document.createElement("div");
      toggleWrap.className = "signup-lab-toggle";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "signup-lab-toggle__btn";
      btn.textContent = "Compare tiers side-by-side";
      btn.setAttribute("aria-pressed", "false");
      toggleWrap.appendChild(btn);
      ul.parentNode.insertBefore(toggleWrap, ul);

      var compare = document.createElement("div");
      compare.className = "signup-lab-compare";
      compare.hidden = true;
      items.forEach(function (li) {
        var strong = li.querySelector("strong");
        var card = document.createElement("div");
        card.className = "signup-lab-compare__card";
        var h4 = document.createElement("h4");
        h4.textContent = strong ? strong.textContent.replace(/\.\s*$/, "") : li.textContent.trim();
        card.appendChild(h4);
        var p = document.createElement("p");
        var full = li.textContent.trim();
        if (strong) full = full.slice(strong.textContent.length).trim();
        p.textContent = full;
        card.appendChild(p);
        compare.appendChild(card);
      });
      ul.parentNode.insertBefore(compare, ul.nextSibling);

      var on = false;
      btn.addEventListener("click", function () {
        on = !on;
        ul.hidden = on;
        compare.hidden = !on;
        btn.setAttribute("aria-pressed", String(on));
        btn.textContent = on ? "Show as a list" : "Compare tiers side-by-side";
      });

      return function teardown() {
        toggleWrap.remove();
        compare.remove();
        ul.hidden = false;
      };
    }
  },

  { id: "5", kind: "Clarity", name: "5 · Three quick steps, up top",
    note: "The “How to Sign Up” steps are repeated right after the hero, so it's clear what happens before you read all the detail sections.",
    setup: function () {
      var hero = document.querySelector(".svc-hero");
      var steps = document.querySelector(".svc-steps");
      if (!hero || !steps) return;

      var box = document.createElement("div");
      box.className = "signup-lab-quickbox";
      var heading = document.createElement("h3");
      heading.textContent = "Three quick steps";
      box.appendChild(heading);
      box.appendChild(steps.cloneNode(true));
      hero.parentNode.insertBefore(box, hero.nextSibling);

      return function teardown() { box.remove(); };
    }
  }

] };
