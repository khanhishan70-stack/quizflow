/* ============================================================
   QuizFlow — Quiz attempt
   GET /api/quiz/:id → attempt → POST /api/quiz/:id/submit
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
  var genToken = params.get('gen');
  var quizId = parseInt(params.get('id'), 10);
  if (!genToken && !quizId) {
    window.location.replace('dashboard.html');
    return;
  }

  var state = {
    quiz: null,
    questions: [],
    answers: [],
    index: 0
  };

  var timerId = null;
  var elapsed = 0;
  var maxSeconds = 0;

  var els = {
    loading: document.getElementById('quizLoading'),
    stage: document.getElementById('quizStage'),
    title: document.getElementById('quizTitle'),
    cat: document.getElementById('quizCat'),
    qCount: document.getElementById('qCount'),
    qNum: document.getElementById('qNum'),
    qText: document.getElementById('qText'),
    options: document.getElementById('quizOptions'),
    dots: document.getElementById('progressDots'),
    prev: document.getElementById('prevBtn'),
    next: document.getElementById('nextBtn'),
    submit: document.getElementById('submitBtn'),
    timerText: document.getElementById('timerText'),
    timerBox: document.getElementById('quizTimer')
  };

  /* ---------- Timer ---------- */
  function fmt(sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function startTimer() {
    maxSeconds = (state.quiz.duration || 10) * 60;
    elapsed = 0;
    els.timerText.textContent = fmt(maxSeconds);
    timerId = setInterval(function () {
      elapsed++;
      var remaining = maxSeconds - elapsed;
      els.timerText.textContent = fmt(remaining);
      if (remaining <= 60) els.timerBox.classList.add('low');
      if (remaining <= 0) {
        clearInterval(timerId);
        submit(true);
      }
    }, 1000);
  }

  /* ---------- Rendering ---------- */
  function renderDots() {
    els.dots.innerHTML = '';
    state.questions.forEach(function (q, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'pdot' +
        (state.answers[i] !== undefined ? ' answered' : '') +
        (i === state.index ? ' current' : '');
      dot.textContent = i + 1;
      dot.setAttribute('aria-label', 'Go to question ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); });
      els.dots.appendChild(dot);
    });
  }

  function renderQuestion() {
    var q = state.questions[state.index];
    var n = state.index + 1;

    els.qNum.textContent = 'Q' + n;
    els.qText.textContent = q.text;
    els.qCount.textContent = 'Question ' + n + ' / ' + state.questions.length;

    els.options.innerHTML = '';
    q.options.forEach(function (opt, oi) {
      var label = document.createElement('label');
      label.className = 'quiz-option';

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'answer';
      input.value = oi;
      input.checked = state.answers[state.index] === oi;
      input.addEventListener('change', function () {
        state.answers[state.index] = parseInt(input.value, 10);
        renderDots();
        if (state.index < state.questions.length - 1) {
          setTimeout(function () { goTo(state.index + 1); }, 220);
        }
      });

      var letter = document.createElement('span');
      letter.className = 'quiz-opt-letter';
      letter.textContent = String.fromCharCode(65 + oi);

      var text = document.createElement('span');
      text.className = 'quiz-opt-text';
      text.textContent = opt;

      var check = document.createElement('span');
      check.className = 'opt-check';
      check.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

      label.appendChild(input);
      label.appendChild(letter);
      label.appendChild(text);
      label.appendChild(check);
      els.options.appendChild(label);
    });

    els.prev.disabled = state.index === 0;
    var isLast = state.index === state.questions.length - 1;
    els.next.classList.toggle('hidden', isLast);
    els.submit.classList.toggle('hidden', !isLast);
    els.submit.textContent = 'Submit Quiz';
  }

  function goTo(i) {
    if (i < 0 || i >= state.questions.length) return;
    state.index = i;
    renderDots();
    renderQuestion();
  }

  /* ---------- Submit ---------- */
  function submit(force) {
    if (timerId) clearInterval(timerId);

    var unanswered = state.answers.length < state.questions.length;
    if (!force && unanswered) {
      var ok = window.confirm(
        'You have unanswered questions. Submit anyway?'
      );
      if (!ok) return;
    }

    els.submit.disabled = true;
    els.submit.textContent = 'Submitting…';
    timerId = null;
    var submitCall = genToken
      ? window.QuizFlowAPI.submitGeneratedQuiz(session.id, genToken, state.answers, elapsed)
      : window.QuizFlowAPI.submitQuiz(session.id, quizId, state.answers, elapsed);
    submitCall
      .then(function (attempt) {
        window.location.href = 'result.html?id=' + attempt.id;
      })
      .catch(function (err) {
        els.submit.disabled = false;
        els.submit.textContent = 'Submit Quiz';
        window.alert(err && err.message ? err.message : 'Submission failed.');
      });
  }

  /* ---------- Boot ---------- */
  var loadCall = genToken
    ? window.QuizFlowAPI.getGeneratedQuiz(genToken)
    : window.QuizFlowAPI.getQuiz(quizId);

  loadCall.then(function (quiz) {
    state.quiz = quiz;
    state.questions = quiz.questions;
    state.answers = new Array(quiz.questions.length).fill(undefined);

    els.title.textContent = quiz.title;
    els.cat.textContent = quiz.category +
      (quiz.difficulty ? ' · ' + quiz.difficulty : '') +
      ' · ' + quiz.duration + ' min';

    els.loading.classList.add('hidden');
    els.stage.classList.remove('hidden');

    renderDots();
    renderQuestion();
    startTimer();

    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') goTo(state.index - 1);
      if (e.key === 'ArrowRight') goTo(state.index + 1);
    });
  }).catch(function (err) {
    els.loading.innerHTML = '<p>😕 ' + (err && err.message ? err.message : 'Could not load quiz.') + '</p>' +
      '<a class="btn btn-ghost mt-3" href="dashboard.html">Back to Dashboard</a>';
  });

  els.prev.addEventListener('click', function () { goTo(state.index - 1); });
  els.next.addEventListener('click', function () { goTo(state.index + 1); });
  els.submit.addEventListener('click', function () { submit(false); });

  window.addEventListener('beforeunload', function (e) {
    if (timerId && state.questions.length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
})();
