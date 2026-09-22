/* ============================================================
   QuizFlow — Landing page interactions
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.getSession();

  /* ---------- Auth-aware nav ---------- */
  function initNav() {
    var cta = document.getElementById('navCta');
    var avatar = document.getElementById('navAvatar');
    var explore = document.getElementById('heroExplore');

    if (session) {
      cta.textContent = 'Dashboard';
      cta.href = session.role === 'Admin' ? 'admin.html' : 'dashboard.html';
      if (avatar) {
        avatar.classList.remove('hidden');
        avatar.textContent = session.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
      }
      if (explore) explore.href = session.role === 'Admin' ? 'admin.html' : 'dashboard.html';
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

  /* ---------- Animated counters ---------- */
  function animateCounters() {
    var els = document.querySelectorAll('.counter');
    if (!els.length) return;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduce) { el.textContent = target.toLocaleString(); return; }
      var start = null;
      var duration = 1400;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          run(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Boot ---------- */
  function boot() {
    [initNav, initNavbar, animateCounters].forEach(function (fn) {
      try { fn(); } catch (e) { /* non-critical */ }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
