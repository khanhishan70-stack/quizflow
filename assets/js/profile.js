/* ============================================================
   QuizFlow — Profile page
   Standalone profile view with avatar upload, stats,
   progress, achievements, and recent activity.
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.requireAuth('login.html');
  if (!session) return;

  var firstName = (session.name || 'Student').split(' ')[0];
  var initials = (session.name || 'S')
    .split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();

  /* ---------- Nav ---------- */
  document.getElementById('sideName').textContent = session.name;
  document.getElementById('sideAvatar').textContent = initials;
  document.getElementById('profileName').textContent = session.name;

  /* ---------- Sidebar (mobile) ---------- */
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
  burger.addEventListener('click', function () { setOpen(!sidebar.classList.contains('open')); });
  backdrop.addEventListener('click', function () { setOpen(false); });
  sidebar.querySelectorAll('.side-link').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });

  /* ---------- Logout ---------- */
  document.getElementById('logoutBtn').addEventListener('click', function () {
    window.QuizFlowAuth.logout('login.html');
  });

  /* ---------- Avatar upload ---------- */
  var avatarFileInput = document.getElementById('avatarFile');
  var avatarImgEl = document.getElementById('avatarImg');
  var AVATAR_KEY = 'quizflow_avatar_' + session.id;

  function loadAvatar() {
    var saved = localStorage.getItem(AVATAR_KEY);
    if (saved && avatarImgEl) {
      avatarImgEl.innerHTML = '<img src="' + saved + '" alt="Profile photo" />';
    }
  }
  loadAvatar();

  var avatarUploadEl = document.getElementById('avatarUpload');
  if (avatarUploadEl && avatarFileInput) {
    avatarUploadEl.addEventListener('click', function () { avatarFileInput.click(); });
    avatarFileInput.addEventListener('change', function () {
      var file = avatarFileInput.files && avatarFileInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB.'); return; }
      var reader = new FileReader();
      reader.onload = function () {
        localStorage.setItem(AVATAR_KEY, reader.result);
        avatarImgEl.innerHTML = '<img src="' + reader.result + '" alt="Profile photo" />';
      };
      reader.readAsDataURL(file);
    });
  }

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

  /* ---------- Progress bars ---------- */
  var SUBJECTS_MAP = {
    1: { name: 'Digital Techniques & Microprocessors', short: 'DTM' },
    2: { name: 'Data Structures Using C', short: 'DSU' },
    3: { name: 'Object Oriented Programming using C++', short: 'OOP' },
    4: { name: 'Applied Mathematics - III', short: 'AMT' },
    5: { name: 'Employability & Communication Skills - III', short: 'EIC' }
  };

  function renderProgress(results) {
    var el = document.getElementById('progressList');
    var subjectScores = {};

    results.forEach(function (r) {
      var sub = SUBJECTS_MAP[r.subjectId];
      if (!sub) return;
      if (!subjectScores[sub.short]) subjectScores[sub.short] = { total: 0, count: 0 };
      subjectScores[sub.short].total += r.percent;
      subjectScores[sub.short].count += 1;
    });

    var entries = Object.keys(subjectScores);
    if (!entries.length) {
      el.innerHTML = '<div class="empty-sm">Complete quizzes to see your progress.</div>';
      return;
    }

    el.innerHTML = '';
    entries.forEach(function (key) {
      var avg = Math.round(subjectScores[key].total / subjectScores[key].count);
      var item = document.createElement('div');
      item.className = 'progress-item';
      item.innerHTML =
        '<div class="prog-row"><span>' + SUBJECTS_MAP[key].name + '</span><b>' + avg + '%</b></div>' +
        '<div class="progress-track"><div class="progress-bar" style="width:' + avg + '%"></div></div>';
      el.appendChild(item);
    });
  }

  /* ---------- Achievements ---------- */
  function renderAchievements(stats, results) {
    var el = document.getElementById('achievementList');
    var items = [];

    if (stats.completedQuizzes >= 1)
      items.push({ icon: '🎯', title: 'First Step', desc: 'Completed your first quiz' });
    if (stats.completedQuizzes >= 5)
      items.push({ icon: '📝', title: 'Quiz Taker', desc: 'Completed 5 quizzes' });
    if (stats.completedQuizzes >= 20)
      items.push({ icon: '🥇', title: 'Quiz Master', desc: 'Completed 20 quizzes' });
    if (stats.currentStreak >= 3)
      items.push({ icon: '🔥', title: '3 Day Streak', desc: 'Practiced for 3 days' });
    if (stats.currentStreak >= 7)
      items.push({ icon: '🔥', title: '7 Day Streak', desc: 'Practiced for 7 days' });
    if (stats.averageScore >= 80)
      items.push({ icon: '⚡', title: 'Fast Learner', desc: 'Avg score above 80%' });
    if (stats.averageScore >= 90)
      items.push({ icon: '🏆', title: 'Top Performer', desc: 'Avg score above 90%' });
    if (stats.totalPoints >= 500)
      items.push({ icon: '💎', title: 'Point Collector', desc: 'Earned 500+ XP points' });

    if (!items.length) {
      items.push({ icon: '🚀', title: 'Getting Started', desc: 'Complete quizzes to earn achievements' });
    }

    el.innerHTML = '';
    items.forEach(function (a) {
      var div = document.createElement('div');
      div.className = 'achieve-item';
      div.innerHTML =
        '<span class="achieve-ic">' + a.icon + '</span>' +
        '<div><b>' + a.title + '</b><span>' + a.desc + '</span></div>';
      el.appendChild(div);
    });
  }

  /* ---------- Recent activity ---------- */
  function renderRecent(results) {
    var el = document.getElementById('recentList');
    if (!results.length) {
      el.innerHTML = '<div class="empty"><div class="empty-ic">🎯</div>No attempts yet — start your first quiz!</div>';
      return;
    }
    el.innerHTML = '';
    results.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'recent-row glass-card';
      row.innerHTML =
        '<span class="recent-ic">📝</span>' +
        '<div class="recent-main"><b>' + r.quizTitle + '</b><span>' + new Date(r.date).toLocaleDateString() + ' · ' + r.time + '</span></div>' +
        '<span class="recent-pct ' + (r.percent >= 70 ? 'good' : r.percent >= 40 ? 'mid' : 'low') + '">' + r.percent + '%</span>';
      el.appendChild(row);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    var stats = { completedQuizzes: 0, averageScore: 0, currentStreak: 0, totalPoints: 0 };

    window.QuizFlowAPI.getDashboard(session.id).then(function (data) {
      stats = data.stats;

      animateCounter(document.getElementById('statCompleted'), stats.completedQuizzes);
      animateCounter(document.getElementById('statAvg'), stats.averageScore);
      animateCounter(document.getElementById('statStreak'), stats.currentStreak);
      animateCounter(document.getElementById('statPoints'), stats.totalPoints);

      renderProgress(data.recentResults);
      renderAchievements(stats, data.recentResults);
      renderRecent(data.recentResults);
    }).catch(function () {
      document.getElementById('progressList').innerHTML = '<div class="empty-sm">Could not load data.</div>';
      document.getElementById('achievementList').innerHTML = '<div class="empty-sm">Could not load data.</div>';
      document.getElementById('recentList').innerHTML = '<div class="empty"><div class="empty-ic">⚠️</div>Could not load activity.</div>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
