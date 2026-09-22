/* ============================================================
   QuizFlow — Leaderboard page
   GET /api/leaderboard → podium + ranking table
   Public page (guests can view), highlights current user.
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.getSession();

  var els = {
    loading: document.getElementById('lbLoading'),
    content: document.getElementById('lbContent'),
    podium: document.getElementById('podium'),
    rows: document.getElementById('lbRows'),
    brand: document.getElementById('brandLink'),
    avatar: document.getElementById('navAvatar'),
    cta: document.getElementById('navCta'),
    burger: document.getElementById('navBurger'),
    links: document.getElementById('navLinks'),
    navbar: document.getElementById('navbar')
  };

  function initials(name) {
    return name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  }

  function homeFor(u) {
    if (!u) return 'index.html';
    return u.role === 'Admin' ? 'admin.html' : 'dashboard.html';
  }

  /* ---------- Auth-aware nav ---------- */
  function initNav() {
    var home = homeFor(session);
    els.brand.href = home;
    els.cta.href = home;
    if (session) {
      els.cta.textContent = session.role === 'Admin' ? 'Admin Panel' : 'Dashboard';
      els.avatar.classList.remove('hidden');
      els.avatar.textContent = initials(session.name);
      els.avatar.href = home;
    }

    function onScroll() { els.navbar.classList.toggle('scrolled', window.scrollY > 24); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    els.burger.addEventListener('click', function () {
      var open = els.links.classList.toggle('open');
      els.burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    els.links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        els.links.classList.remove('open');
        els.burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Podium ---------- */
  var POD_META = {
    1: { title: 'Champion', medal: '🥇', cls: 'rank-1' },
    2: { title: 'Runner Up', medal: '🥈', cls: 'rank-2' },
    3: { title: 'Third Place', medal: '🥉', cls: 'rank-3' }
  };

  function renderPodium(top3) {
    if (!top3.length) return;
    els.podium.innerHTML = top3.map(function (p) {
      var m = POD_META[p.rank];
      return '<div class="podium-card glass-card ' + m.cls + '">' +
        '<div class="pod-rank">' + m.title + '</div>' +
        '<div class="pod-avatar">' + p.initials + '</div>' +
        '<div class="pod-name">' + p.name + '</div>' +
        '<div class="pod-meta">Avg ' + p.score + '% · ' + p.quizzes + ' quiz' + (p.quizzes === 1 ? '' : 'zes') + '</div>' +
        '<div class="pod-points">' + m.medal + ' ' + p.points.toLocaleString() + ' pts</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- Table ---------- */
  function renderTable(list) {
    if (!list.length) {
      els.rows.innerHTML = '<div class="lb-empty"><div class="big">🏆</div><p>No rankings yet — be the first to play.</p></div>';
      return;
    }

    var medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

    els.rows.innerHTML = list.map(function (p) {
      var me = session && p.name.toLowerCase() === session.name.toLowerCase();
      var medal = medals[p.rank] || p.rank;
      return '<div class="lb-row' + (me ? ' me' : '') + '">' +
        '<div class="lb-rank"><span class="lb-medal">' + medal + '</span></div>' +
        '<div class="lb-user"><span class="lb-avatar">' + p.initials + '</span>' +
          '<span class="lb-name">' + p.name + (me ? '<span class="you-tag">· You</span>' : '') + '</span></div>' +
        '<div class="lb-score">' + p.score + '%</div>' +
        '<div class="lb-quizzes">' + p.quizzes + '</div>' +
        '<div class="lb-points">' + p.points.toLocaleString() + '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- Boot ---------- */
  initNav();

  window.QuizFlowAPI.getLeaderboard().then(function (list) {
    els.loading.classList.add('hidden');
    els.content.classList.remove('hidden');
    renderPodium(list.slice(0, 3));
    renderTable(list);
  }).catch(function (err) {
    els.loading.innerHTML = '<p>😕 ' + (err && err.message ? err.message : 'Could not load the leaderboard.') + '</p>';
  });
})();
