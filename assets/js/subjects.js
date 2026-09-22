/* ============================================================
   QuizFlow — Subjects chooser page
   Lists every subject as a card; clicking one starts its quiz.
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.getSession();

  /* ---------- Auth-aware nav ---------- */
  function initNav() {
    var cta = document.getElementById('navCta');
    var avatar = document.getElementById('navAvatar');

    if (session) {
      cta.textContent = 'Dashboard';
      cta.href = session.role === 'Admin' ? 'admin.html' : 'dashboard.html';
      if (avatar) {
        avatar.classList.remove('hidden');
        avatar.textContent = (session.name || 'S')
          .split(' ')
          .map(function (w) { return w[0]; })
          .slice(0, 2)
          .join('')
          .toUpperCase();
      }
    }
  }

  /* ---------- Navbar scroll + burger ---------- */
  function initNavbar() {
    var nav = document.getElementById('navbar');
    var burger = document.getElementById('navBurger');
    var links = document.getElementById('navLinks');

    function onScroll() {
      if (!nav) return;
      nav.classList.toggle('scrolled', window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (burger && links) {
      burger.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          links.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* ---------- Subject cards ---------- */
  function renderSubjects(quizzes) {
    var grid = document.getElementById('subjGrid');
    grid.innerHTML = '';

    var startTarget = session ? 'syllabus.html?id=' : 'login.html';

    quizzes.forEach(function (q, i) {
      var card = document.createElement('article');
      card.className = 'subj-card glass-card';
      card.style.animation = 'fade-up .6s var(--ease) ' + (i * 0.07) + 's both';

      var top = document.createElement('div');
      top.className = 'subj-top';

      var emoji = document.createElement('span');
      emoji.className = 'subj-emoji';
      emoji.textContent = q.icon || '📘';

      var code = document.createElement('span');
      code.className = 'subj-code';
      code.textContent = q.short || q.category;

      top.appendChild(emoji);
      top.appendChild(code);

      var h = document.createElement('h3');
      h.textContent = q.category;

      var meta = document.createElement('p');
      meta.className = 'subj-meta';
      meta.innerHTML =
        '<span>' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>' +
        q.questionCount + ' questions' +
        '</span>' +
        '<span>' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/></svg>' +
        'Pick your quiz' +
        '</span>';

      var btn = document.createElement('a');
      btn.className = 'btn btn-ghost';
      btn.href = startTarget + q.id;
      btn.innerHTML = (session ? 'Open Syllabus' : 'Sign in to Continue') +
        ' <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

      card.appendChild(top);
      card.appendChild(h);
      card.appendChild(meta);
      card.appendChild(btn);
      grid.appendChild(card);
    });
  }

  function boot() {
    [initNav, initNavbar].forEach(function (fn) {
      try { fn(); } catch (e) { /* non-critical */ }
    });

    window.QuizFlowAPI.getQuizzes()
      .then(renderSubjects)
      .catch(function () {
        document.getElementById('subjGrid').innerHTML =
          '<p class="text-400">Could not load subjects. Please refresh.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
