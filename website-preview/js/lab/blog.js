/* Page lab ideas for the "blog" page group — shared by blog.html and both post pages
   (tips-and-techniques-for-a-healthy-tree.html, why-young-trees-should-be-pruned.html) — preview only.
   A post page has exactly one .post with no .post-meta inside it; the blog index has one or more
   .post articles, each with a .post-meta line and an <h2><a> title. */
window.TTC_PAGE_LAB = { group: "blog", title: "Blog & posts", options: [

  { id: "2", kind: "Ergonomics", name: "2 · Bigger text + easier clicks",
    note: "Larger, more readable type; the whole article card is clickable on the list; a post page gets a clear “Back to all articles” link.",
    setup: function () {
      var articles = Array.prototype.slice.call(document.querySelectorAll(".post"));
      if (!articles.length) return;
      var teardowns = [];

      articles.forEach(function (article) {
        var titleLink = article.querySelector("h2 a");
        if (titleLink) {
          // Blog index card: make the whole card clickable (bigger tap target for a mouse or a thumb).
          article.classList.add("blog-lab-card-click");
          var onClick = function (e) {
            if (e.target.closest("a")) return; // let real links behave normally
            window.location.href = titleLink.href;
          };
          article.addEventListener("click", onClick);
          teardowns.push(function () {
            article.removeEventListener("click", onClick);
            article.classList.remove("blog-lab-card-click");
          });
        } else {
          // Single post page: add a plain-language way back that doesn't rely on the browser's Back button.
          var navBlogLink = Array.prototype.filter.call(document.querySelectorAll(".nav a"), function (a) {
            return a.textContent.trim() === "Blog";
          })[0];
          if (!navBlogLink) return;
          var back = document.createElement("a");
          back.className = "blog-lab-back";
          back.href = navBlogLink.getAttribute("href");
          back.textContent = "← Back to all articles";
          article.parentNode.insertBefore(back, article);
          teardowns.push(function () { back.remove(); });
        }
      });

      return function teardown() { teardowns.forEach(function (fn) { fn(); }); };
    }
  },

  { id: "3", kind: "Feature", name: "3 · Reading time + progress",
    note: "A “X min read” chip on every article, plus a top progress bar that fills as you read a post.",
    setup: function () {
      var articles = Array.prototype.slice.call(document.querySelectorAll(".post"));
      if (!articles.length) return;
      var chips = [];

      articles.forEach(function (article) {
        var words = (article.textContent || "").trim().split(/\s+/).filter(Boolean).length;
        var minutes = Math.max(1, Math.round(words / 200));
        var chip = document.createElement("span");
        chip.className = "blog-lab-chip";
        chip.textContent = minutes + " min read";
        var meta = article.querySelector(".post-meta");
        if (meta) meta.parentNode.insertBefore(chip, meta.nextSibling);
        else article.insertBefore(chip, article.firstChild);
        chips.push(chip);
      });

      var bar = null, fill = null, onScroll = null;
      var singlePost = articles.length === 1 && !articles[0].querySelector(".post-meta");
      if (singlePost) {
        var post = articles[0];
        bar = document.createElement("div"); bar.className = "blog-lab-progress";
        fill = document.createElement("div"); fill.className = "blog-lab-progress__fill";
        bar.appendChild(fill);
        document.body.appendChild(bar);
        onScroll = function () {
          var total = post.offsetHeight - window.innerHeight;
          var scrolled = -post.getBoundingClientRect().top;
          var pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 100;
          fill.style.width = pct + "%";
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
      }

      return function teardown() {
        chips.forEach(function (c) { c.remove(); });
        if (onScroll) {
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
        }
        if (bar) bar.remove();
      };
    }
  },

  { id: "4", kind: "Clarity", name: "4 · Obvious next step",
    note: "List entries get an explicit “Read full article →” link; a post page ends with a clear call to get an estimate or call.",
    setup: function () {
      var articles = Array.prototype.slice.call(document.querySelectorAll(".post"));
      if (!articles.length) return;
      var added = [];

      articles.forEach(function (article) {
        var titleLink = article.querySelector("h2 a");
        if (titleLink) {
          var lastP = article.querySelector("p:last-of-type");
          var readMore = document.createElement("a");
          readMore.className = "blog-lab-readmore";
          readMore.href = titleLink.getAttribute("href");
          readMore.textContent = "Read full article →";
          if (lastP) lastP.parentNode.insertBefore(readMore, lastP.nextSibling);
          else article.appendChild(readMore);
          added.push(readMore);
        } else {
          var contactLink = Array.prototype.filter.call(document.querySelectorAll(".nav a"), function (a) {
            return a.textContent.trim() === "Contact";
          })[0];
          var phoneLink = document.querySelector(".top-bar__phone") || document.querySelector('a[href^="tel:"]');
          if (!contactLink && !phoneLink) return;

          var cta = document.createElement("div");
          cta.className = "blog-lab-cta";
          var p = document.createElement("p");
          p.textContent = "Questions about your trees?";
          cta.appendChild(p);
          var row = document.createElement("div");
          row.className = "btn-row";
          if (contactLink) {
            var est = document.createElement("a");
            est.className = "btn btn--primary";
            est.href = contactLink.getAttribute("href");
            est.setAttribute("data-estimate", "");
            est.textContent = "Get a Free Estimate";
            est.addEventListener("click", function (e) {
              var jobberBtn = document.getElementById("work-request-button-5a7fcc26-6b73-4bec-a630-dd63f55352e9");
              if (jobberBtn) { e.preventDefault(); jobberBtn.click(); }
            });
            row.appendChild(est);
          }
          if (phoneLink) {
            var call = document.createElement("a");
            call.className = "btn btn--secondary";
            call.href = phoneLink.getAttribute("href");
            call.textContent = "Call Us " + phoneLink.textContent.trim();
            row.appendChild(call);
          }
          cta.appendChild(row);
          article.parentNode.insertBefore(cta, article.nextSibling);
          added.push(cta);
        }
      });

      return function teardown() { added.forEach(function (el) { el.remove(); }); };
    }
  }

] };
