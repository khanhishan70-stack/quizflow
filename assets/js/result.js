/* ============================================================
   QuizFlow — Result page
   Single attempt (?id=) or history list (?mode=list)
   GET /api/results/:id  |  GET /api/results
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.requireAuth('login.html');
  if (!session) return;
  if (session.role === 'Admin') {
    window.location.replace('admin.html');
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var attemptId = parseInt(params.get('id'), 10);
  var isList = params.get('mode') === 'list';
  var backTarget = 'dashboard.html';

  var els = {
    loading: document.getElementById('resultLoading'),
    single: document.getElementById('singleView'),
    list: document.getElementById('listView'),
    cat: document.getElementById('resCat'),
    title: document.getElementById('resTitle'),
    badge: document.getElementById('resBadge'),
    stats: document.getElementById('resStats'),
    ringFill: document.getElementById('ringFill'),
    scorePct: document.getElementById('scorePct'),
    strengths: document.getElementById('strengths'),
    weaknesses: document.getElementById('weaknesses'),
    reviewSummary: document.getElementById('reviewSummary'),
    reviewList: document.getElementById('reviewList'),
    historyList: document.getElementById('historyList'),
    back: document.getElementById('backLink'),
    logout: document.getElementById('logoutBtn')
  };

  function fmtTime(sec) {
    sec = Math.max(0, sec || 0);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function badgeFor(percent) {
    if (percent >= 85) return { text: 'Outstanding', cls: 'excellent', icon: 'trophy' };
    if (percent >= 70) return { text: 'Great Job', cls: 'pass', icon: 'check' };
    if (percent >= 50) return { text: 'Passed', cls: 'average', icon: 'flag' };
    return { text: 'Keep Practising', cls: 'fail', icon: 'target' };
  }

  function buildStats(a) {
    var stat = [
      { ic: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>', v: a.score + ' / ' + a.total, l: 'Correct' },
      { ic: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', v: fmtTime(a.timeTaken), l: 'Time taken' },
      { ic: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', v: a.category, l: 'Category' },
      { ic: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>', v: fmtDate(a.date), l: 'Taken on' }
    ];
    els.stats.innerHTML = stat.map(function (s) {
      return '<div class="rstat"><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + s.ic + '</svg></span><span>' + s.l + ': <b>' + s.v + '</b></span></div>';
    }).join('');
  }

  function animateRing(percent) {
    var C = 2 * Math.PI * 78;
    els.ringFill.style.strokeDasharray = C;
    els.ringFill.style.strokeDashoffset = C;
    var target = C - (C * percent) / 100;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        els.ringFill.style.strokeDashoffset = target;
      });
    });
    var start = null;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1200, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      els.scorePct.textContent = Math.round(eased * percent) + '%';
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function perfBars() {
    els.strengths.innerHTML = '';
    els.weaknesses.innerHTML = '';
    window.QuizFlowAPI.getCategorySummary(session.id).then(function (cats) {
      var rows = cats.slice(0, 4);
      var good = rows.filter(function (c) { return c.percent >= 60; }).slice(0, 3);
      var weak = rows.filter(function (c) { return c.percent < 60; }).slice(0, 3);

      var render = function (parent, rows, cls) {
        parent.innerHTML = rows.map(function (c) {
          return '<div class="perf-bar-row">' +
            '<div class="perf-bar-top"><span class="name">' + c.category + '</span><span class="pct">' + c.percent + '%</span></div>' +
            '<div class="perf-track"><div class="perf-fill ' + cls + '" data-w="' + c.percent + '"></div></div>' +
          '</div>';
        }).join('') || '<p class="perf-none">Not enough data yet.</p>';
        setTimeout(function () {
          parent.querySelectorAll('.perf-fill').forEach(function (f) { f.style.width = f.dataset.w + '%'; });
        }, 60);
      };

      render(els.strengths, good, 'good');
      render(els.weaknesses, weak, 'weak');

      if (!good.length && !weak.length) {
        els.strengths.innerHTML = '<p class="perf-none">Play a few quizzes to see your strengths.</p>';
      }
      if (good.length && !weak.length) {
        els.weaknesses.innerHTML = '<p class="perf-none">No weak areas — impressive!</p>';
      }
    }).catch(function () {});
  }

  function renderReview(a) {
    var correct = a.details.filter(function (d) { return d.correct; }).length;
    els.reviewSummary.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<span>You answered <b>' + correct + '</b> of <b>' + a.details.length + '</b> correctly. Green rows are correct answers, red rows are what you picked.</span>';

    els.reviewList.innerHTML = a.details.map(function (d, i) {
      var marks = ['A', 'B', 'C', 'D'];
      var opts = d.options.map(function (opt, oi) {
        var cls = 'review-opt';
        var mark = '';
        if (oi === d.correctIndex) { cls += ' correct'; mark = '<span class="r-mark">Correct</span>'; }
        else if (oi === d.chosen) { cls += ' wrong'; mark = '<span class="r-mark">Your pick</span>'; }
        return '<div class="' + cls + '"><span class="r-letter">' + marks[oi] + '</span><span>' + opt + '</span>' + mark + '</div>';
      }).join('');

      var idxCls = d.correct ? 'good' : 'wrong';
      var exp = d.explanation
        ? '<div class="review-explain"><b>Explanation:</b> ' + d.explanation + '</div>'
        : '';

      return '<div class="glass-card review-item">' +
        '<div class="q-top"><span class="q-idx ' + idxCls + '">' + (i + 1) + '</span><span class="q-text">' + d.question + '</span></div>' +
        '<div class="review-opts">' + opts + '</div>' + exp +
      '</div>';
    }).join('');
  }

  function loadSingle(id) {
    window.QuizFlowAPI.getResult(id).then(function (a) {
      if (a.userId !== session.id) {
        window.location.replace('result.html?mode=list');
        return;
      }
      var b = badgeFor(a.percent);

      els.cat.textContent = a.category;
      els.title.textContent = a.quizTitle;
      els.badge.className = 'result-badge ' + b.cls;
      els.badge.textContent = b.text;

      els.back.setAttribute('href', 'result.html?mode=list');
      backTarget = 'result.html?mode=list';

      els.loading.classList.add('hidden');
      els.single.classList.remove('hidden');

      buildStats(a);
      renderReview(a);
      perfBars();
      animateRing(a.percent);
    }).catch(function (err) {
      els.loading.innerHTML = '<p>😕 ' + (err && err.message ? err.message : 'Result not found.') + '</p>' +
        '<a class="btn btn-ghost mt-3" href="result.html?mode=list">View all results</a>';
    });
  }

  function loadList() {
    window.QuizFlowAPI.getResults(session.id).then(function (results) {
      backTarget = 'dashboard.html';
      els.loading.classList.add('hidden');
      els.list.classList.remove('hidden');

      if (!results.length) {
        els.historyList.innerHTML =
          '<div class="glass-card result-empty">' +
            '<div class="big">📭</div>' +
            '<h3>No results yet</h3>' +
            '<p class="mt-1">Take a quiz to start building your record.</p>' +
            '<a class="btn btn-primary mt-3" href="dashboard.html#quizzes">Browse Quizzes</a>' +
          '</div>';
        return;
      }

      els.historyList.innerHTML = results.map(function (r) {
        var cls = r.percent >= 70 ? 'good' : (r.percent >= 50 ? 'avg' : 'bad');
        var catEmoji = window.QuizFlow.EMOJI[r.category] || '🧪';
        return '<a class="glass-card hist-row" href="result.html?id=' + r.id + '">' +
          '<div class="hist-cat">' + catEmoji + '</div>' +
          '<div class="hist-meta"><b>' + r.quizTitle + '</b><span>' + r.category + ' · ' + fmtDate(r.date) + '</span></div>' +
          '<div class="hist-side">' +
            '<div class="hist-score"><div class="p ' + cls + '">' + r.percent + '%</div><div class="s">' + r.score + '/' + r.total + ' correct</div></div>' +
            '<span class="btn btn-ghost btn-sm">View</span>' +
          '</div>' +
        '</a>';
      }).join('');
    }).catch(function (err) {
      els.loading.innerHTML = '<p>😕 ' + (err && err.message ? err.message : 'Could not load results.') + '</p>';
    });
  }

  if (isList) loadList();
  else if (attemptId) loadSingle(attemptId);
  else loadList();

  els.logout.addEventListener('click', function () {
    window.QuizFlowAuth.logout();
  });
  els.back.addEventListener('click', function () {
    window.location.href = backTarget;
  });
})();
