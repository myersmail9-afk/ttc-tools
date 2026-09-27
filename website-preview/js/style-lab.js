/* STYLE LAB — preview only (Joseph, 2026-09-27). Loaded only on the review preview's homepage.
   Adds a "Style options" button: hero photo (scrolls / stays put) and 4 homepage looks.
   The choice is kept in the address (?photo=fixed&look=2) so a link shows David the same look,
   and in this browser's storage so it survives a reload. */
(function () {
  var LOOKS = [
    { id: "std", name: "Full Screen + Bold Bands (standard)", note: "The look you picked: full-screen photo, gold proof strip, deep green bands." },
    { id: "0", name: "Before today", note: "The earlier look, for comparison." },
    { id: "1", name: "Full Screen only", note: "Full-screen photo, the rest as before." },
    { id: "2", name: "Editorial", note: "Left-aligned headline, big plain numbers, thin lines instead of shadows." },
    { id: "3", name: "Bold Bands only", note: "Gold strip and green bands, normal-height photo." }
  ];
  var PHOTOS = [
    { id: "fixed", name: "Stays put (standard)", note: "The photo holds still and the words scroll over it." },
    { id: "scroll", name: "Scrolls with the page", note: "The photo moves up with the words." }
  ];
  var root = document.documentElement;

  function read(key, fallback) {
    var q = new URLSearchParams(location.search).get(key);
    if (q) return q;
    try { return localStorage.getItem("ttc-lab3-" + key) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem("ttc-lab3-" + key, val); } catch (e) {}
    try {
      var u = new URL(location.href); u.searchParams.set(key, val);
      history.replaceState(null, "", u.toString());
    } catch (e) {}
  }
  function apply(look, photo) {
    ["look-alt", "look-1", "look-2", "look-3"].forEach(function (c) { root.classList.remove(c); });
    if (look !== "std") root.classList.add("look-alt");        // switch off the standard look
    if (look === "1" || look === "2" || look === "3") root.classList.add("look-" + look);
    root.classList.toggle("hs-scroll", photo === "scroll");
  }

  var look = read("look", "std"), photo = read("photo", "fixed");
  if (!LOOKS.some(function (l) { return l.id === look; })) look = "std";
  apply(look, photo);

  function options(name, list, current) {
    return list.map(function (o) {
      return '<label class="lab-opt"><input type="radio" name="' + name + '" value="' + o.id + '"' +
        (o.id === current ? " checked" : "") + '><span class="lab-opt__text"><strong>' + o.name + "</strong><span>" + o.note + "</span></span></label>";
    }).join("");
  }

  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "lab-toggle"; btn.textContent = "Style options";
  btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "lab-panel");
  var panel = document.createElement("div");
  panel.className = "lab-panel"; panel.id = "lab-panel"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Style options");
  panel.innerHTML =
    "<h2>Style options</h2><p class=\"lab-note\">Preview only. Try each one, then tell Claude which you like. The page link keeps your choice.</p>" +
    "<fieldset><legend>Top photo</legend>" + options("lab-photo", PHOTOS, photo) + "</fieldset>" +
    "<fieldset><legend>Home page look</legend>" + options("lab-look", LOOKS, look) + "</fieldset>" +
    '<button type="button" class="lab-close">Close</button>';
  document.body.appendChild(panel);
  document.body.appendChild(btn);

  function setOpen(open) {
    panel.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open) { var c = panel.querySelector("input:checked"); if (c) c.focus(); } else btn.focus();
  }
  btn.addEventListener("click", function () { setOpen(panel.hidden); });
  panel.querySelector(".lab-close").addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
  panel.addEventListener("change", function (e) {
    if (e.target.name === "lab-look") { look = e.target.value; save("look", look); }
    if (e.target.name === "lab-photo") { photo = e.target.value; save("photo", photo); }
    apply(look, photo);
  });
})();
