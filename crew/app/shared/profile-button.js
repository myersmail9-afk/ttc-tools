/* TTC crew app — the profile button, top right, on every page.
   The first piece of the shared kit (apps/_STACK.md, DESIGN layer): one file, included by every page,
   instead of the same avatar block copied into eight. It injects itself into `.topbar` and works out
   its own path to pages/me/ from where this script was loaded, so it does not care how deep the page is.
   Depends on nothing. If TTCRecords is absent or nobody is signed in it still renders, as a quiet
   outline that leads to the sign-in. */
(function () {
  'use strict';
  var me = document.currentScript && document.currentScript.src;
  // .../shared/profile-button.js -> .../   (the app root)
  var ROOT = me ? me.replace(/shared\/profile-button\.js.*$/, '') : '';
  var HREF = ROOT + 'pages/me/';

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }

  function style() {
    if (document.getElementById('ttc-pb-style')) return;
    var s = document.createElement('style'); s.id = 'ttc-pb-style';
    s.textContent =
      '.ttc-pb{flex:0 0 auto;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;' +
        'font-size:12px;font-weight:800;letter-spacing:.02em;text-decoration:none;overflow:hidden;' +
        'background:rgba(241,238,231,.14);color:#f1eee7;border:1.5px solid rgba(241,238,231,.35);' +
        'margin-left:2px}' +
      '.ttc-pb:active{opacity:.75}' +
      '.ttc-pb img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.ttc-pb.is-out{background:transparent;border-style:dashed;border-color:rgba(241,238,231,.4)}' +
      '.ttc-pb svg{width:17px;height:17px}' +
      '.topbar .topbar-title{margin-right:0}';
    document.head.appendChild(s);
  }

  function personIcon() {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    [ 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' ].forEach(function (d) {
      var p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); s.appendChild(p);
    });
    var c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '7'); c.setAttribute('r', '4'); s.appendChild(c);
    return s;
  }

  function paint(a, person) {
    while (a.firstChild) a.removeChild(a.firstChild);
    if (!person) {
      a.classList.add('is-out'); a.title = 'Sign in';
      a.setAttribute('aria-label', 'Sign in'); a.appendChild(personIcon()); return;
    }
    a.classList.remove('is-out');
    var name = person.display_name || person.name || '';
    a.title = name + (person.role ? ' · ' + person.role : '');
    a.setAttribute('aria-label', 'Your profile, ' + name);
    if (person.photo) {
      var img = document.createElement('img'); img.src = person.photo; img.alt = ''; a.appendChild(img);
    } else {
      var ini = initials(name);
      if (ini) a.appendChild(document.createTextNode(ini)); else a.appendChild(personIcon());
    }
  }

  function mount() {
    var bar = document.querySelector('.topbar');
    if (!bar || bar.querySelector('.ttc-pb')) return;
    style();
    var a = document.createElement('a');
    a.className = 'ttc-pb'; a.href = HREF;
    bar.appendChild(a);                       // always last, so it sits top right
    paint(a, null);

    if (!window.TTCRecords) return;
    var apply = function () {
      try { paint(a, TTCRecords.person && TTCRecords.person()); } catch (e) {}
    };
    try {
      if (TTCRecords.ready) TTCRecords.ready().then(apply, function () {}); else apply();
      if (TTCRecords.on) TTCRecords.on('auth', apply);
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
