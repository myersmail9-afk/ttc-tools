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
  var PROFILE_HREF = ROOT + 'pages/me/';

  function contextPersonId() {
    try { return new URLSearchParams(location.search).get('person') || ''; } catch (e) { return ''; }
  }

  function storedPerson() {
    try {
      var session = JSON.parse(localStorage.getItem('ttc-crew-session:v1') || 'null');
      return session && session.person || null;
    } catch (e) { return null; }
  }

  function rosterPerson(id) {
    if (!id) return null;
    var people = window.TTC_PEOPLE || [];
    for (var i = 0; i < people.length; i++) {
      if (people[i].person_id === id) return {
        id: id,
        name: people[i].display_name || '',
        display_name: people[i].display_name || '',
        role: people[i].role || ''
      };
    }
    return null;
  }

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }

  function style() {
    if (document.getElementById('ttc-pb-style')) return;
    var s = document.createElement('style'); s.id = 'ttc-pb-style';
    s.textContent =
      '.ttc-pb{flex:0 0 auto;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;' +
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

  function paint(a, person, isContextPerson) {
    while (a.firstChild) a.removeChild(a.firstChild);
    if (!person) {
      a.classList.add('is-out'); a.title = isContextPerson ? 'Open profile' : 'Sign in or open your profile';
      a.setAttribute('aria-label', a.title); a.appendChild(personIcon()); return;
    }
    a.classList.remove('is-out');
    var name = person.display_name || person.name || '';
    a.title = name + (person.role ? ' · ' + person.role : '');
    a.setAttribute('aria-label', isContextPerson ? name + ' profile' : 'Your profile, ' + name);
    if (person.photo) {
      var img = document.createElement('img'); img.src = person.photo; img.alt = ''; a.appendChild(img);
    } else {
      var ini = initials(name);
      if (ini) a.appendChild(document.createTextNode(ini)); else a.appendChild(personIcon());
    }
  }

  function mountOne(bar) {
    if (!bar || bar.querySelector('.ttc-pb')) return;
    style();
    var a = document.createElement('a');
    var targetId = contextPersonId();
    a.className = 'ttc-pb';
    a.href = PROFILE_HREF + (targetId ? '?person=' + encodeURIComponent(targetId) : '');
    bar.appendChild(a);                       // always last, so it sits top right
    paint(a, targetId ? rosterPerson(targetId) : storedPerson(), !!targetId);

    var apply = function () {
      try {
        var self = window.TTCRecords && TTCRecords.person && TTCRecords.person();
        var context = targetId && rosterPerson(targetId);
        paint(a, context || self || storedPerson(), !!targetId);
      } catch (e) {}
    };
    if (!window.TTCRecords) return;
    try {
      if (TTCRecords.ready) TTCRecords.ready().then(apply, function () {}); else apply();
      if (TTCRecords.on) {
        TTCRecords.on('signin', apply);
        TTCRecords.on('signout', apply);
        TTCRecords.on('auth', apply);
      }
    } catch (e) {}
  }

  function mount() {
    var bars = document.querySelectorAll('.topbar');
    for (var i = 0; i < bars.length; i++) mountOne(bars[i]);
  }

  function start() {
    mount();
    // The app home builds category top bars after route changes. Keep the shared control present
    // whenever a new top bar is rendered instead of requiring every page to remember to add it.
    if (window.MutationObserver && document.body) {
      new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
