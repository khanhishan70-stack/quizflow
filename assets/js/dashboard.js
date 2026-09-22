/* ============================================================
   QuizFlow — Student dashboard
   Loads GET /api/dashboard via QuizFlowAPI and renders the UI.
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.requireAuth('login.html');
  if (!session) return;
  if (session.role === 'Admin') {
    window.location.replace('admin.html');
    return;
  }

  var firstName = (session.name || 'Student').split(' ')[0];
  var initials = (session.name || 'S')
    .split(' ')
    .map(function (w) { return w[0]; })
    .slice(0, 2)
    .join('')
    .toUpperCase();

  /* ---------- Personalization ---------- */
  var hour = new Date().getHours();
  var greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  var greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = greeting + ', ' + firstName + ' 👋';
  var subEl = document.getElementById('greetingSub');
  if (subEl) subEl.textContent = 'Ready to challenge yourself today?';

  document.getElementById('sideName').textContent = session.name;
  document.getElementById('sideAvatar').textContent = initials;
  document.getElementById('headerAvatar').textContent = initials;

  /* ---------- Sidebar (mobile) ---------- */
  function initSidebar() {
    var burger = document.getElementById('navBurger');
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);

    function setOpen(open) {
      sidebar.classList.toggle('open', open);
      backdrop.classList.toggle('show', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    burger.addEventListener('click', function () {
      setOpen(!sidebar.classList.contains('open'));
    });
    backdrop.addEventListener('click', function () { setOpen(false); });
    sidebar.querySelectorAll('.side-link').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
  }

  /* ---------- Logout ---------- */
  document.getElementById('logoutBtn').addEventListener('click', function () {
    window.QuizFlowAuth.logout('login.html');
  });

  /* ---------- Animated counters ---------- */
  function animateCounter(el, target) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = target.toLocaleString(); return; }
    var start = null;
    var duration = 1100;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Render ---------- */
  function renderContinue(continueQuiz, totalQuizzes) {
    var card = document.getElementById('continueCard');
    if (!continueQuiz) {
      var btn = document.getElementById('continueBtn');
      if (btn) btn.href = 'dashboard.html#quizzes';
      document.getElementById('continueTitle').textContent = 'Ready to start?';
      document.getElementById('continueSub').textContent = 'Pick a quiz below and begin your first attempt.';
      document.getElementById('continuePct').textContent = '0%';
      document.getElementById('continuePct2').textContent = '0%';
      document.getElementById('continueBar').style.width = '0%';
      document.getElementById('continueQ').textContent = '0 / ' + totalQuizzes + ' quizzes';
      return;
    }
    card.style.display = 'flex';
    document.getElementById('continueTitle').textContent = continueQuiz.quizTitle;
    document.getElementById('continueSub').textContent = 'Category: ' + continueQuiz.category + ' · Best attempt';
    document.getElementById('continuePct').textContent = continueQuiz.percent + '%';
    document.getElementById('continuePct2').textContent = continueQuiz.percent + '%';
    document.getElementById('continueQ').textContent = continueQuiz.score + ' / ' + continueQuiz.total + ' correct';
    document.getElementById('continueBar').style.width = continueQuiz.percent + '%';
    document.getElementById('continueBtn').href = 'quiz.html?id=' + continueQuiz.quizId;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.getElementById('continueBar').style.width = '0%';
        requestAnimationFrame(function () {
          document.getElementById('continueBar').style.width = continueQuiz.percent + '%';
        });
      });
    });
  }

  function renderQuizzes(quizzes) {
    var grid = document.getElementById('quizGrid');
    grid.innerHTML = '';
    quizzes.forEach(function (q) {
      var card = document.createElement('article');
      card.className = 'quiz-card glass-card';

      var emoji = document.createElement('span');
      emoji.className = 'quiz-emoji';
      emoji.textContent = q.icon;

      var h = document.createElement('h3');
      h.textContent = q.title;

      var meta = document.createElement('p');
      meta.className = 'quiz-meta';
      meta.textContent = q.category + ' · ' + q.questionCount + ' Q · ' + q.duration + ' min';

      var btn = document.createElement('a');
      btn.className = 'btn btn-ghost';
      btn.href = 'syllabus.html?id=' + q.id;
      btn.innerHTML = 'Open Syllabus <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

      card.appendChild(emoji);
      card.appendChild(h);
      card.appendChild(meta);
      card.appendChild(btn);
      grid.appendChild(card);
    });
  }

  function renderRecent(results) {
    var list = document.getElementById('recentList');
    if (!results.length) {
      list.innerHTML = '<div class="empty"><div class="empty-ic">🎯</div>No attempts yet — start your first quiz!</div>';
      return;
    }
    list.innerHTML = '';
    results.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'recent-row glass-card';

      var ic = document.createElement('span');
      ic.className = 'recent-ic';
      ic.textContent = '📝';

      var main = document.createElement('div');
      main.className = 'recent-main';
      var b = document.createElement('b');
      b.textContent = r.quizTitle;
      var s = document.createElement('span');
      s.textContent = new Date(r.date).toLocaleDateString() + ' · ' + r.time;
      main.appendChild(b);
      main.appendChild(s);

      var pct = document.createElement('span');
      pct.className = 'recent-pct ' + (r.percent >= 70 ? 'good' : r.percent >= 40 ? 'mid' : 'low');
      pct.textContent = r.percent + '%';

      var view = document.createElement('a');
      view.className = 'btn btn-ghost btn-sm';
      view.href = 'result.html?id=' + r.id;
      view.textContent = 'Review';

      row.appendChild(ic);
      row.appendChild(main);
      row.appendChild(pct);
      row.appendChild(view);
      list.appendChild(row);
    });
  }

  /* ---------- Load data ---------- */
  function boot() {
    initSidebar();

    var loading = document.getElementById('quizGrid').querySelector('.empty');
    var stats = { completedQuizzes: 0, averageScore: 0, currentStreak: 0, totalPoints: 0 };

    window.QuizFlowAPI.getDashboard(session.id).then(function (data) {
      stats = data.stats;
      animateCounter(document.getElementById('statCompleted'), stats.completedQuizzes);
      animateCounter(document.getElementById('statAvg'), stats.averageScore);
      animateCounter(document.getElementById('statStreak'), stats.currentStreak);
      animateCounter(document.getElementById('statPoints'), stats.totalPoints);

      renderContinue(data.continueQuiz, data.quizzes.length);
      renderQuizzes(data.quizzes);
      renderRecent(data.recentResults);
    }).catch(function () {
      if (loading) loading.textContent = 'Could not load dashboard data.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
