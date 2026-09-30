/* Page lab ideas for the "contact" page group (src/pages/contact.html). Preview only.
   2026-09-30: fresh round — the first four ideas (card panels + striped hours, bigger targets,
   floating call button, two clear paths) are now the standard (site.css "Contact page standard",
   menu.js, contact.html). These four are layered ON TOP of that standard: same form, same phone
   links, same .call-fab and .contact-altpath box — never hidden, never reordered. */
(function () {
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  window.TTC_PAGE_LAB = {
    group: "contact",
    title: "Contact page",
    options: [
      {
        id: "2", kind: "Aesthetic", name: "2 · Icon-accented details",
        note: "A warm green-to-gold divider on each card, plus small icon badges on the address, phone, and email lines."
        // CSS-only — see css/lab/contact.css
      },
      {
        id: "3", kind: "Ergonomics", name: "3 · “Prefer to talk?” call-first banner",
        note: "A big, high-contrast call button sits above the form for visitors who'd rather phone than type — common for our older homeowner callers.",
        setup: function () {
          var wrap = document.querySelector(".contact-request");
          var telLink = document.querySelector(".contact-details a[href^='tel:']");
          if (!wrap || !telLink) return null;

          var fabLabel = document.querySelector(".call-fab .call-fab__full");
          var labelText = fabLabel ? fabLabel.textContent.trim() : telLink.textContent.trim();

          var banner = document.createElement("div");
          banner.className = "pl3-callfirst";
          var a = document.createElement("a");
          a.className = "btn btn--primary pl3-callfirst__btn";
          a.href = telLink.getAttribute("href");
          a.textContent = "Prefer to talk? " + labelText;
          var p = document.createElement("p");
          p.className = "pl3-callfirst__or";
          p.textContent = "Or fill out the quick form below.";
          banner.appendChild(a);
          banner.appendChild(p);
          wrap.insertBefore(banner, wrap.firstChild);

          return function teardown() {
            banner.remove();
          };
        }
      },
      {
        id: "4", kind: "Feature", name: "4 · Live open / closed status",
        note: "A colored pill under “Phone Hours” reads the hours table and shows whether we're open right now, updating on its own.",
        setup: function () {
          var h2s = Array.prototype.slice.call(document.querySelectorAll(".contact-details h2"));
          var hoursHeading = h2s.filter(function (h) { return /phone hours/i.test(h.textContent); })[0];
          var table = document.querySelector(".contact-details .hours");
          if (!hoursHeading || !table) return null;

          var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

          function parseTime(s) {
            var m = s.trim().toLowerCase().match(/(\d+):?(\d*)\s*(am|pm)/);
            if (!m) return null;
            var h = parseInt(m[1], 10);
            var min = m[2] ? parseInt(m[2], 10) : 0;
            if (m[3] === "pm" && h !== 12) h += 12;
            if (m[3] === "am" && h === 12) h = 0;
            return h * 60 + min;
          }
          function fmt(mins) {
            var h = Math.floor(mins / 60), m = mins % 60;
            var ap = h >= 12 ? "pm" : "am";
            var h12 = h % 12; if (h12 === 0) h12 = 12;
            return h12 + ":" + (m < 10 ? "0" : "") + m + ap;
          }

          var schedule = Array.prototype.slice.call(table.querySelectorAll("tr")).map(function (tr) {
            var tds = tr.querySelectorAll("td");
            if (tds.length < 2) return null;
            var day = tds[0].textContent.trim();
            var timeText = tds[1].textContent.trim();
            if (/closed/i.test(timeText)) return { day: day, closed: true };
            var parts = timeText.split(/[–‒-]/);
            if (parts.length < 2) return { day: day, closed: true };
            var start = parseTime(parts[0]), end = parseTime(parts[1]);
            if (start == null || end == null) return { day: day, closed: true };
            return { day: day, closed: false, start: start, end: end };
          }).filter(Boolean);
          if (!schedule.length) return null;

          function rowFor(name) {
            return schedule.filter(function (r) { return r.day === name; })[0] || null;
          }
          function nextOpen(now) {
            for (var i = 0; i < 8; i++) {
              var d = new Date(now.getTime());
              d.setDate(d.getDate() + i);
              var row = rowFor(dayNames[d.getDay()]);
              if (!row || row.closed) continue;
              if (i === 0) {
                var minsNow = now.getHours() * 60 + now.getMinutes();
                if (minsNow < row.start) return { sameDay: true, start: row.start };
                continue;
              }
              return { dayName: dayNames[d.getDay()], start: row.start };
            }
            return null;
          }

          var pill = document.createElement("div");
          pill.className = "pl4-status";
          hoursHeading.insertAdjacentElement("afterend", pill);

          function update() {
            var now = new Date();
            var today = rowFor(dayNames[now.getDay()]);
            var minsNow = now.getHours() * 60 + now.getMinutes();
            var open = !!(today && !today.closed && minsNow >= today.start && minsNow < today.end);
            if (open) {
              pill.textContent = "Open now — closes at " + fmt(today.end);
            } else {
              var ni = nextOpen(now);
              var text = "Closed now";
              if (ni) text += ni.sameDay ? (" — opens today at " + fmt(ni.start)) : (" — opens " + ni.dayName + " at " + fmt(ni.start));
              pill.textContent = text;
            }
            pill.classList.toggle("is-open", open);
            pill.classList.toggle("is-closed", !open);
          }
          update();
          var timer = setInterval(update, 60000);

          return function teardown() {
            clearInterval(timer);
            pill.remove();
          };
        }
      }
    ]
  };
})();
