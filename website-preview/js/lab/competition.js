/* Page lab ideas for the "competition" page group (competition-tree-climbing.html) — preview only. */
window.TTC_PAGE_LAB = { group: "competition", title: "Competition Tree Climbing", options: [

  { id: "2", kind: "Aesthetic", name: "2 · Trophy-style results",
    note: "The results list becomes a row of badge cards, and David's heading gets a gold underline accent.",
    // CSS-only — see css/lab/competition.css.
  },

  { id: "3", kind: "Ergonomics", name: "3 · Results at a glance, up top",
    note: "David's 2025 placements are repeated in a large, easy-to-read box right after the intro, so the headline results don't require reading two paragraphs first.",
    setup: function () {
      var prose = document.querySelector(".prose");
      var h2 = prose && prose.querySelector("h2");
      var ul = prose && prose.querySelector("ul");
      if (!prose || !h2 || !ul) return;

      var box = document.createElement("div");
      box.className = "comp-lab-summary";
      var heading = document.createElement("h3");
      heading.textContent = "2025 results at a glance";
      box.appendChild(heading);
      box.appendChild(ul.cloneNode(true));
      prose.insertBefore(box, prose.firstChild);

      return function teardown() { box.remove(); };
    }
  },

  { id: "4", kind: "Feature", name: "4 · Results podium",
    note: "A visual 1st / 2nd / 3rd podium built from David's own results list — a fun, quick way to see how he placed.",
    setup: function () {
      var prose = document.querySelector(".prose");
      var ul = prose && prose.querySelector("ul");
      if (!prose || !ul) return;

      var groups = { "1st": [], "2nd": [], "3rd": [] };
      Array.prototype.forEach.call(ul.querySelectorAll("li"), function (li) {
        var text = li.textContent.trim();
        var m = text.match(/^(1st|2nd|3rd)\s+(.*)$/i);
        if (!m) return;
        var rank = m[1].toLowerCase();
        var rest = m[2]
          .replace(/^overall\s+in\s+the\s+/i, "")
          .replace(/^in\s+the\s+/i, "")
          .replace(/^in\s+/i, "");
        rest = rest.charAt(0).toUpperCase() + rest.slice(1);
        if (groups[rank]) groups[rank].push(rest);
      });
      if (!groups["1st"].length && !groups["2nd"].length && !groups["3rd"].length) return;

      function makeCol(rankLabel, cls, items) {
        if (!items.length) return null;
        var col = document.createElement("div");
        col.className = "comp-lab-podium__col comp-lab-podium__col--" + cls;
        var bar = document.createElement("div");
        bar.className = "comp-lab-podium__bar";
        var rankEl = document.createElement("span");
        rankEl.className = "comp-lab-podium__rank";
        rankEl.textContent = rankLabel;
        bar.appendChild(rankEl);
        col.appendChild(bar);
        var label = document.createElement("div");
        label.className = "comp-lab-podium__label";
        var list = document.createElement("ul");
        items.forEach(function (t) {
          var li = document.createElement("li");
          li.textContent = t;
          list.appendChild(li);
        });
        label.appendChild(list);
        col.appendChild(label);
        return col;
      }

      var podium = document.createElement("div");
      podium.className = "comp-lab-podium";
      var row = document.createElement("div");
      row.className = "comp-lab-podium__row";
      [["2nd", "silver", "2"], ["1st", "gold", "1"], ["3rd", "bronze", "3"]].forEach(function (spec) {
        var col = makeCol(spec[2], spec[1], groups[spec[0]]);
        if (col) row.appendChild(col);
      });
      podium.appendChild(row);
      ul.parentNode.insertBefore(podium, ul.nextSibling);

      return function teardown() { podium.remove(); };
    }
  }

] };
