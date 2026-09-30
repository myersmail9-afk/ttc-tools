/* Page lab ideas for the "faq" page group (frequently-asked-questions.html) — preview only. */
window.TTC_PAGE_LAB = { group: "faq", title: "FAQ page", options: [

  { id: "2", kind: "Aesthetic", name: "2 · Card-style questions",
    note: "Each question becomes its own soft card instead of a plain divider line.",
    // CSS-only — see css/lab/faq.css.
  },

  { id: "3", kind: "Ergonomics", name: "3 · Collapsed + Open all",
    note: "Questions start collapsed (except the first) with bigger tap targets and an Open all / Close all button, so the page isn't a wall of text.",
    setup: function () {
      var faq = document.querySelector(".faq");
      if (!faq) return;
      var details = Array.prototype.slice.call(faq.querySelectorAll("details"));
      if (!details.length) return;
      var wasOpen = details.map(function (d) { return d.hasAttribute("open"); });
      details.forEach(function (d, i) { if (i > 0) d.removeAttribute("open"); });

      var bar = document.createElement("div");
      bar.className = "faq-lab-bar";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "faq-lab-toggle";
      btn.textContent = "Open all questions";
      var expanded = false;
      btn.addEventListener("click", function () {
        expanded = !expanded;
        details.forEach(function (d) {
          if (expanded) d.setAttribute("open", ""); else d.removeAttribute("open");
        });
        btn.textContent = expanded ? "Close all questions" : "Open all questions";
      });
      bar.appendChild(btn);
      faq.parentNode.insertBefore(bar, faq);

      return function teardown() {
        bar.remove();
        details.forEach(function (d, i) {
          if (wasOpen[i]) d.setAttribute("open", ""); else d.removeAttribute("open");
        });
      };
    }
  },

  { id: "4", kind: "Feature", name: "4 · Search the questions",
    note: "A search box filters the list live as you type, so a specific question is one keystroke away.",
    setup: function () {
      var faq = document.querySelector(".faq");
      if (!faq) return;
      var details = Array.prototype.slice.call(faq.querySelectorAll("details"));
      if (!details.length) return;

      var wrap = document.createElement("div");
      wrap.className = "faq-lab-search";
      var label = document.createElement("label");
      label.setAttribute("for", "faq-lab-input");
      label.textContent = "Search questions";
      var input = document.createElement("input");
      input.type = "text";
      input.id = "faq-lab-input";
      input.placeholder = "Try “estimate” or “winter”";
      input.autocomplete = "off";
      wrap.appendChild(label);
      wrap.appendChild(input);
      faq.parentNode.insertBefore(wrap, faq);

      var empty = document.createElement("p");
      empty.className = "faq-lab-empty";
      empty.hidden = true;
      empty.textContent = "No questions match. Try a different word, or call our office at (435) 752-1884.";
      faq.parentNode.insertBefore(empty, faq.nextSibling);

      function onInput() {
        var q = input.value.trim().toLowerCase();
        var any = false;
        details.forEach(function (d) {
          var match = !q || d.textContent.toLowerCase().indexOf(q) !== -1;
          d.style.display = match ? "" : "none";
          if (match) any = true;
        });
        empty.hidden = any;
      }
      input.addEventListener("input", onInput);

      return function teardown() {
        input.removeEventListener("input", onInput);
        wrap.remove();
        empty.remove();
        details.forEach(function (d) { d.style.display = ""; });
      };
    }
  },

  { id: "5", kind: "Clarity", name: "5 · Jump to a question",
    note: "A quick-jump list of every question sits at the top, so you can scan and go straight to the one you need.",
    setup: function () {
      var faq = document.querySelector(".faq");
      if (!faq) return;
      var details = Array.prototype.slice.call(faq.querySelectorAll("details"));
      if (!details.length) return;

      var addedIds = [];
      var nav = document.createElement("nav");
      nav.className = "faq-lab-toc";
      nav.setAttribute("aria-label", "Jump to a question");
      var list = document.createElement("ol");
      details.forEach(function (d, i) {
        var summary = d.querySelector("summary");
        if (!summary) return;
        if (!d.id) { d.id = "faq-lab-q" + (i + 1); addedIds.push(d.id); }
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + d.id;
        a.textContent = summary.textContent;
        a.addEventListener("click", function (e) {
          e.preventDefault();
          d.setAttribute("open", "");
          var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          d.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        });
        li.appendChild(a);
        list.appendChild(li);
      });
      nav.appendChild(list);
      faq.parentNode.insertBefore(nav, faq);

      return function teardown() {
        nav.remove();
        addedIds.forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.removeAttribute("id");
        });
      };
    }
  }

] };
