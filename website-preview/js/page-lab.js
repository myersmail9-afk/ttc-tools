/* PAGE LAB — preview only (Joseph 2026-09-30). Builds the "Style options" panel on each preview page (not the
   homepage). A page's ideas come from js/lab/<group>.js, which runs first and sets:
     window.TTC_PAGE_LAB = { group: "about", title: "About page", options: [
       { id: "2", kind: "Aesthetic" | "Ergonomics" | "Feature" | "Clarity", name: "…", note: "…",
         setup: function () { ...; return function teardown() {...}; } }   // setup is optional (CSS-only options)
     ] };
   Choosing option N sets html.pl-N (CSS in css/lab/<group>.css) and runs its setup; switching away tears it down.
   Option 1 is always "Standard — the page as it is now". Choice is kept in ?pl=N and localStorage per page group. */
(function () {
  var cfg = window.TTC_PAGE_LAB || { group: "page", options: [] };
  var root = document.documentElement;
  var KEY = "ttc-plab1-" + cfg.group;
  var opts = [{ id: "1", kind: "Standard", name: "1 · Standard", note: "The page exactly as it is now." }].concat(cfg.options || []);
  var teardown = null;

  function read() {
    try { var q = new URLSearchParams(location.search).get("pl"); if (q) return q; } catch (e) {}
    try { return localStorage.getItem(KEY) || "1"; } catch (e) { return "1"; }
  }
  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    try { var u = new URL(location.href); u.searchParams.set("pl", v); history.replaceState(null, "", u.toString()); } catch (e) {}
  }
  function apply(id) {
    if (teardown) { try { teardown(); } catch (e) {} teardown = null; }
    opts.forEach(function (o) { root.classList.remove("pl-" + o.id); });
    var o = opts.filter(function (x) { return x.id === id; })[0] || opts[0];
    if (o.id !== "1") root.classList.add("pl-" + o.id);
    if (typeof o.setup === "function") { try { teardown = o.setup() || null; } catch (e) { teardown = null; } }
    return o.id;
  }

  var current = apply(read());
  if (opts.length < 2) return;   // no ideas registered for this page yet

  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "plab-toggle"; btn.textContent = "Style options";
  btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "plab-panel");
  var panel = document.createElement("div");
  panel.className = "plab-panel"; panel.id = "plab-panel"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Style options");
  panel.innerHTML = "<h2>Style options" + (cfg.title ? ": " + cfg.title : "") + "</h2>" +
    '<p class="plab-note">Preview only. Option 1 is the page as it is now. Try the others, then tell Claude which to add to the standard.</p>' +
    opts.map(function (o) {
      return '<label class="plab-opt"><input type="radio" name="plab" value="' + o.id + '"' + (o.id === current ? " checked" : "") +
        '><span class="plab-opt__text"><em class="plab-opt__kind">' + o.kind + "</em><strong>" + o.name + "</strong><span>" + o.note + "</span></span></label>";
    }).join("") + '<button type="button" class="plab-close">Close</button>';
  document.body.appendChild(panel); document.body.appendChild(btn);

  function setOpen(open) { panel.hidden = !open; btn.setAttribute("aria-expanded", String(open)); (open ? panel.querySelector("input:checked") : btn).focus(); }
  btn.addEventListener("click", function () { setOpen(panel.hidden); });
  panel.querySelector(".plab-close").addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
  panel.addEventListener("change", function (e) { if (e.target.name === "plab") { current = apply(e.target.value); save(current); } });
})();
