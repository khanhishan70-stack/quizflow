/* ============================================================
   QuizFlow — Admin dashboard
   GET/POST/PUT/DELETE /api/admin/*
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.requireAuth('login.html');
  if (!session) return;
  if (session.role !== 'Admin') {
    window.location.replace('dashboard.html');
    return;
  }

  var state = {
    tab: 'overview',
    editingQuizId: null,
    editingQuestionIdx: null,
    quizzes: []
  };

  var els = {
    sidebar: document.getElementById('sidebar'),
    backdrop: document.getElementById('sidebarBackdrop'),
    burger: document.getElementById('navBurger'),
    sideLinks: document.querySelectorAll('.side-menu .side-link'),
    tabs: document.querySelectorAll('.tab'),
    newQuizBtn: document.getElementById('newQuizBtn'),
    newQuizBtn2: document.getElementById('newQuizBtn2'),
    adminStats: document.getElementById('adminStats'),
    miniTop: document.getElementById('miniTop'),
    miniAvg: document.getElementById('miniAvg'),
    quizGrid: document.getElementById('adminQuizGrid'),
    studentRows: document.getElementById('studentRows'),
    analyticsList: document.getElementById('analyticsList'),
    title: document.getElementById('adminTitle'),
    sub: document.getElementById('adminSub'),
    sideAvatar: document.getElementById('sideAvatar'),
    sideName: document.getElementById('sideName'),
    logout: document.getElementById('logoutBtn'),

    quizModal: document.getElementById('quizModal'),
    quizModalTitle: document.getElementById('quizModalTitle'),
    quizForm: document.getElementById('quizForm'),
    quizSaveBtn: document.getElementById('quizSaveBtn'),
    qTitle: document.getElementById('qTitle'),
    qShort: document.getElementById('qShort'),
    qCat: document.getElementById('qCat'),
    qIcon: document.getElementById('qIcon'),
    qDur: document.getElementById('qDur'),
    questionSection: document.getElementById('questionSection'),
    questionSectionTitle: document.getElementById('questionSectionTitle'),
    questionList: document.getElementById('questionList'),
    manageQuestionsBtn: document.getElementById('manageQuestionsBtn'),
    addQuestionBtn: document.getElementById('addQuestionBtn'),

    questionModal: document.getElementById('questionModal'),
    questionModalTitle: document.getElementById('questionModalTitle'),
    questionForm: document.getElementById('questionForm'),
    questionSaveBtn: document.getElementById('questionSaveBtn'),
    qsText: document.getElementById('qsText'),
    qsOptA: document.getElementById('qsOptA'),
    qsOptB: document.getElementById('qsOptB'),
    qsOptC: document.getElementById('qsOptC'),
    qsOptD: document.getElementById('qsOptD'),
    qsCorrect: document.getElementById('qsCorrect'),
    qsExpl: document.getElementById('qsExpl')
  };

  var CAT_ICONS = window.QuizFlow.EMOJI;

  function initials(name) {
    return name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  }

  /* ---------- Tabs ---------- */
  function switchTab(tab) {
    state.tab = tab;

    els.sideLinks.forEach(function (l) {
      l.classList.toggle('active', l.getAttribute('data-tab') === tab);
    });
    els.tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'panel-' + tab);
    });

    var meta = {
      overview: ['Admin Overview', 'Platform management & insights.'],
      quizzes: ['Manage Quizzes', 'Create, edit and maintain quiz content.'],
      students: ['Students', 'Enrolled learners and their progress.'],
      analytics: ['Analytics', 'Quiz performance across the platform.']
    }[tab];

    els.title.textContent = meta[0];
    els.sub.textContent = meta[1];
    els.newQuizBtn.classList.toggle('hidden', tab !== 'quizzes' && tab !== 'overview');

    closeSidebar();

    if (tab === 'quizzes') loadQuizzes();
    if (tab === 'students') loadStudents();
    if (tab === 'analytics') loadAnalytics();
  }

  /* ---------- Sidebar (mobile) ---------- */
  function openSidebar() {
    els.sidebar.classList.add('open');
    els.backdrop.classList.add('show');
  }
  function closeSidebar() {
    els.sidebar.classList.remove('open');
    els.backdrop.classList.remove('show');
  }

  /* ---------- Stats (overview) ---------- */
  var STATS = [
    { key: 'totalStudents', label: 'Students', ic: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', cls: '' },
    { key: 'totalQuizzes', label: 'Quizzes', ic: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', cls: 'blue' },
    { key: 'totalQuestions', label: 'Questions', ic: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/>', cls: 'cy' },
    { key: 'totalAttempts', label: 'Total Attempts', ic: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>', cls: '' }
  ];

  function loadOverview() {
    window.QuizFlowAPI.getAdminStats().then(function (s) {
      els.adminStats.innerHTML = STATS.map(function (st) {
        return '<div class="stat-card glass-card">' +
          '<span class="stat-icon ' + st.cls + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + st.ic + '</svg></span>' +
          '<div><strong><span class="counter" data-count="' + s[st.key] + '">0</span></strong><span class="stat-label">' + st.label + '</span></div>' +
        '</div>';
      }).join('');
      animateCounters();
    });

    window.QuizFlowAPI.getAnalytics().then(function (rows) {
      var maxAtt = Math.max.apply(null, rows.map(function (r) { return r.attempts; }).concat([1]));
      var top = rows.slice().sort(function (a, b) { return b.attempts - a.attempts; }).slice(0, 4);
      els.miniTop.innerHTML = top.map(function (r) {
        return '<div class="mini-row"><span class="mini-name">' + r.title + '</span>' +
          '<div class="mini-track"><div class="mini-fill" data-w="' + (r.attempts / maxAtt) * 100 + '"></div></div>' +
          '<span class="mini-val">' + r.attempts + '</span></div>';
      }).join('') || '<p class="perf-none">No attempts yet.</p>';

      var withAtt = rows.filter(function (r) { return r.attempts > 0; });
      var avg = withAtt.slice().sort(function (a, b) { return b.avgScore - a.avgScore; }).slice(0, 4);
      els.miniAvg.innerHTML = avg.map(function (r) {
        return '<div class="mini-row"><span class="mini-name">' + r.title + '</span>' +
          '<div class="mini-track"><div class="mini-fill" data-w="' + r.avgScore + '"></div></div>' +
          '<span class="mini-val">' + r.avgScore + '%</span></div>';
      }).join('') || '<p class="perf-none">No attempts yet.</p>';

      setTimeout(function () {
        document.querySelectorAll('.mini-fill').forEach(function (f) { f.style.width = f.dataset.w + '%'; });
      }, 80);
    }).catch(function () {});
  }

  /* ---------- Counters ---------- */
  function animateCounters() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('#adminStats .counter').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduce) { el.textContent = target.toLocaleString(); return; }
      var start = null;
      var duration = 1000;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- Quizzes ---------- */
  function loadQuizzes() {
    window.QuizFlowAPI.getQuizzes().then(function (list) {
      state.quizzes = list;
      if (!list.length) {
        els.quizGrid.innerHTML = '<div class="glass-card admin-empty" style="grid-column:1/-1;">' +
          '<div class="big">📚</div><p>No quizzes yet. Create your first one!</p></div>';
        return;
      }
      els.quizGrid.innerHTML = list.map(function (q) {
        return '<div class="glass-card quiz-card admin-quiz">' +
          '<div class="top"><span class="quiz-emoji">' + q.icon + '</span>' +
          '<span class="badge badge-purple">' + q.category + '</span></div>' +
          '<h3>' + q.title + '</h3>' +
          '<p class="quiz-meta">' + q.questionCount + ' questions · ' + q.duration + ' min</p>' +
          '<div class="admin-quiz-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="questions" data-id="' + q.id + '">Questions</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="' + q.id + '">Edit</button>' +
            '<button type="button" class="btn btn-danger-soft btn-sm" data-action="delete" data-id="' + q.id + '">Delete</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }).catch(function (err) {
      els.quizGrid.innerHTML = '<div class="admin-empty"><p>' + (err.message || 'Failed to load quizzes.') + '</p></div>';
    });
  }

  /* ---------- Quiz modal ---------- */
  function openQuizModal(mode) {
    els.quizForm.reset();
    els.qDur.value = 10;

    if (mode === 'edit') {
      var q = state.quizzes.filter(function (x) { return x.id === state.editingQuizId; })[0];
      if (!q) return;
      els.quizModalTitle.textContent = 'Edit Quiz';
      els.quizSaveBtn.textContent = 'Save Changes';
      els.qTitle.value = q.title;
      els.qShort.value = q.short;
      els.qCat.value = q.category;
      if (q.icon) els.qIcon.value = q.icon;
      els.qDur.value = q.duration;
      els.questionSection.classList.remove('hidden');
      els.manageQuestionsBtn.classList.remove('hidden');
      els.questionSectionTitle.textContent = 'Questions · ' + q.questionCount;
      renderQuestions();
    } else {
      state.editingQuizId = null;
      state.editingQuestionIdx = null;
      els.quizModalTitle.textContent = 'New Quiz';
      els.quizSaveBtn.textContent = 'Create Quiz';
      els.questionSection.classList.add('hidden');
      els.manageQuestionsBtn.classList.add('hidden');
    }
    els.quizModal.classList.add('open');
    els.quizModal.setAttribute('aria-hidden', 'false');
    setTimeout(function () { els.qTitle.focus(); }, 60);
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.getElementById(id).setAttribute('aria-hidden', 'true');
  }

  function saveQuiz(e) {
    e.preventDefault();
    var data = {
      title: els.qTitle.value.trim(),
      short: els.qShort.value.trim() || els.qTitle.value.trim().slice(0, 12),
      category: els.qCat.value,
      icon: els.qIcon.value,
      duration: parseInt(els.qDur.value, 10) || 10
    };
    if (!data.title) { els.qTitle.focus(); return; }

    els.quizSaveBtn.disabled = true;
    var p = state.editingQuizId
      ? window.QuizFlowAPI.updateQuiz(state.editingQuizId, data)
      : window.QuizFlowAPI.createQuiz(data);

    p.then(function () {
      if (!state.editingQuizId) {
        els.quizModal.classList.remove('open');
        els.quizModal.setAttribute('aria-hidden', 'true');
      }
      els.quizSaveBtn.disabled = false;
      return window.QuizFlowAPI.getQuizzes();
    }).then(function (list) {
      state.quizzes = list;
      if (state.editingQuizId) {
        var q = state.quizzes.filter(function (x) { return x.id === state.editingQuizId; })[0];
        if (q) els.questionSectionTitle.textContent = 'Questions · ' + q.questionCount;
      }
      loadQuizzes();
    }).catch(function (err) {
      els.quizSaveBtn.disabled = false;
      window.alert(err && err.message ? err.message : 'Save failed.');
    });
  }

  function deleteQuiz(id) {
    var q = state.quizzes.filter(function (x) { return x.id === id; })[0];
    var name = q ? q.title : 'this quiz';
    if (!window.confirm('Delete "' + name + '"? This removes its questions and results.')) return;
    window.QuizFlowAPI.deleteQuiz(id).then(function () { loadQuizzes(); });
  }

  /* ---------- Questions ---------- */
  function renderQuestions() {
    window.QuizFlowAPI.getQuiz(state.editingQuizId).then(function (quiz) {
      els.questionSectionTitle.textContent = 'Questions · ' + quiz.questions.length;
      if (!quiz.questions.length) {
        els.questionList.innerHTML = '<p class="perf-none text-center">No questions yet. Add your first one.</p>';
        return;
      }
      els.questionList.innerHTML = quiz.questions.map(function (q, i) {
        return '<div class="question-row">' +
          '<span class="qnum">' + (i + 1) + '</span>' +
          '<span class="qtext">' + q.text + '</span>' +
          '<span class="qcount">' + q.options.length + ' options</span>' +
          '<span class="qa">' +
            '<button type="button" class="btn-icon-xs" data-qa="edit" data-idx="' + i + '" title="Edit" aria-label="Edit question">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</button>' +
            '<button type="button" class="btn-icon-xs danger" data-qa="delete" data-idx="' + i + '" title="Delete" aria-label="Delete question">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
            '</button>' +
          '</span>' +
        '</div>';
      }).join('');
    });
  }

  function openQuestionModal(idx) {
    state.editingQuestionIdx = idx;
    els.questionForm.reset();
    els.qsCorrect.value = '0';

    if (idx !== null) {
      window.QuizFlowAPI.getQuiz(state.editingQuizId).then(function (quiz) {
        var q = quiz.questions[idx];
        if (!q) return;
        els.questionModalTitle.textContent = 'Edit Question #' + (idx + 1);
        els.questionSaveBtn.textContent = 'Save Question';
        els.qsText.value = q.text;
        ['qsOptA', 'qsOptB', 'qsOptC', 'qsOptD'].forEach(function (id, i) {
          document.getElementById(id).value = q.options[i] || '';
        });
        els.qsCorrect.value = String(q.correctIndex);
        els.qsExpl.value = q.explanation || '';
        els.questionModal.classList.add('open');
        els.questionModal.setAttribute('aria-hidden', 'false');
        setTimeout(function () { els.qsText.focus(); }, 60);
      });
    } else {
      els.questionModalTitle.textContent = 'Add Question';
      els.questionSaveBtn.textContent = 'Save Question';
      els.questionModal.classList.add('open');
      els.questionModal.setAttribute('aria-hidden', 'false');
      setTimeout(function () { els.qsText.focus(); }, 60);
    }
  }

  function saveQuestion(e) {
    e.preventDefault();
    var text = els.qsText.value.trim();
    var options = [els.qsOptA.value.trim(), els.qsOptB.value.trim(), els.qsOptC.value.trim(), els.qsOptD.value.trim()]
      .filter(function (o) { return o.length > 0; });
    if (!text) { els.qsText.focus(); return; }
    if (options.length < 2) {
      window.alert('Please fill in at least two options.');
      return;
    }
    var correctIndex = parseInt(els.qsCorrect.value, 10);
    if (correctIndex > options.length - 1) correctIndex = options.length - 1;

    var q = {
      text: text,
      options: options,
      correctIndex: correctIndex,
      explanation: els.qsExpl.value.trim()
    };

    els.questionSaveBtn.disabled = true;
    var p = state.editingQuestionIdx !== null
      ? window.QuizFlowAPI.updateQuestion(state.editingQuizId, state.editingQuestionIdx, q)
      : window.QuizFlowAPI.addQuestion(state.editingQuizId, q);

    p.then(function () {
      els.questionSaveBtn.disabled = false;
      els.questionModal.classList.remove('open');
      els.questionModal.setAttribute('aria-hidden', 'true');
      renderQuestions();
    }).catch(function (err) {
      els.questionSaveBtn.disabled = false;
      window.alert(err && err.message ? err.message : 'Save failed.');
    });
  }

  function deleteQuestion(idx) {
    if (!window.confirm('Delete this question?')) return;
    window.QuizFlowAPI.deleteQuestion(state.editingQuizId, idx).then(function () { renderQuestions(); });
  }

  /* ---------- Students ---------- */
  function loadStudents() {
    window.QuizFlowAPI.getStudents().then(function (rows) {
      if (!rows.length) {
        els.studentRows.innerHTML = '<tr><td colspan="4" class="text-500">No students yet.</td></tr>';
        return;
      }
      els.studentRows.innerHTML = rows.map(function (s) {
        var avgCls = s.avgScore >= 70 ? 'badge badge-green' : (s.avgScore >= 50 ? 'badge badge-amber' : 'badge badge-red');
        return '<tr>' +
          '<td><div class="student-cell"><span class="student-avatar">' + initials(s.name) + '</span>' +
            '<div><span class="nm">' + s.name + '</span><span class="em">' + s.email + '</span></div></div></td>' +
          '<td class="mono">' + s.attempts + '</td>' +
          '<td><span class="' + avgCls + ' avg-badge">' + s.avgScore + '%</span></td>' +
          '<td class="mono bold text-primary">' + s.points.toLocaleString() + '</td>' +
        '</tr>';
      }).join('');
    }).catch(function (err) {
      els.studentRows.innerHTML = '<tr><td colspan="4" class="text-500">' + (err.message || 'Failed.') + '</td></tr>';
    });
  }

  /* ---------- Analytics ---------- */
  function loadAnalytics() {
    window.QuizFlowAPI.getAnalytics().then(function (rows) {
      var maxAtt = Math.max.apply(null, rows.map(function (r) { return r.attempts; }).concat([1]));
      if (!rows.length) {
        els.analyticsList.innerHTML = '<div class="glass-card admin-empty"><div class="big">📈</div><p>No quiz activity yet.</p></div>';
        return;
      }
      els.analyticsList.innerHTML = rows.map(function (r) {
        return '<div class="glass-card analytics-item">' +
          '<div class="analytics-top">' +
            '<div><div class="analytics-title">' + r.title + '</div>' +
            '<div class="analytics-sub">' + r.attempts + ' attempt' + (r.attempts === 1 ? '' : 's') + '</div></div>' +
            '<div class="analytics-nums">Avg <b>' + r.avgScore + '%</b></div>' +
          '</div>' +
          '<div class="analytics-track attempts"><div class="analytics-fill" data-w="' + (r.attempts / maxAtt) * 100 + '"></div></div>' +
        '</div>';
      }).join('');
      setTimeout(function () {
        els.analyticsList.querySelectorAll('.analytics-fill').forEach(function (f) { f.style.width = f.dataset.w + '%'; });
      }, 80);
    }).catch(function (err) {
      els.analyticsList.innerHTML = '<div class="admin-empty"><p>' + (err.message || 'Failed.') + '</p></div>';
    });
  }

  /* ---------- Events ---------- */
  els.tabs.forEach(function (t) {
    t.addEventListener('click', function () { switchTab(t.getAttribute('data-tab')); });
  });
  els.sideLinks.forEach(function (l) {
    l.addEventListener('click', function () { switchTab(l.getAttribute('data-tab')); });
  });

  els.burger.addEventListener('click', function () { openSidebar(); });
  els.backdrop.addEventListener('click', closeSidebar);

  els.newQuizBtn.addEventListener('click', function () {
    state.editingQuizId = null;
    openQuizModal('create');
  });
  els.newQuizBtn2.addEventListener('click', function () {
    state.editingQuizId = null;
    openQuizModal('create');
  });
  els.quizForm.addEventListener('submit', saveQuiz);
  els.questionForm.addEventListener('submit', saveQuestion);

  els.manageQuestionsBtn.addEventListener('click', function () { renderQuestions(); });
  els.addQuestionBtn.addEventListener('click', function () { openQuestionModal(null); });

  els.quizGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-id'), 10);
    var action = btn.getAttribute('data-action');
    if (action === 'questions') {
      state.editingQuizId = id;
      openQuizModal('edit');
    } else if (action === 'edit') {
      state.editingQuizId = id;
      openQuizModal('edit');
    } else if (action === 'delete') {
      deleteQuiz(id);
    }
  });

  els.questionList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-qa]');
    if (!btn) return;
    var idx = parseInt(btn.getAttribute('data-idx'), 10);
    if (btn.getAttribute('data-qa') === 'edit') openQuestionModal(idx);
    else deleteQuestion(idx);
  });

  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { closeModal(btn.getAttribute('data-close')); });
  });
  document.querySelectorAll('.modal-overlay').forEach(function (ov) {
    ov.addEventListener('click', function (e) {
      if (e.target === ov) closeModal(ov.id);
    });
  });

  els.logout.addEventListener('click', function () { window.QuizFlowAuth.logout(); });

  /* ---------- Boot ---------- */
  els.sideAvatar.textContent = initials(session.name);
  els.sideName.textContent = session.name;

  switchTab('overview');
  loadOverview();
})();
