/* ============================================================
   QuizFlow — Battle Game (real-time 1v1)
   Communicates with C++ WebSocket server (port 9090).
   All timing/scoring determined server-side.
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.requireAuth('login.html');
  if (!session) return;

  var params = new URLSearchParams(window.location.search);
  var battleId = params.get('battle');
  if (!battleId) { window.location.href = 'battle.html'; return; }

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };

  var dom = {
    barSubject: $('barSubject'),
    barQ: $('barQ'),
    timerNum: $('timerNum'),
    timerArc: $('timerArc'),
    p1Name: $('p1Name'), p1Avatar: $('p1Avatar'), p1Score: $('p1Score'), p1Card: $('p1Card'),
    p2Name: $('p2Name'), p2Avatar: $('p2Avatar'), p2Score: $('p2Score'), p2Card: $('p2Card'),
    oppStatus: $('oppStatus'), oppStatusText: $('oppStatusText'),
    qCard: $('qCard'), qLabel: $('qLabel'), qText: $('qText'),
    qTimerMobile: $('qTimerMobile'),
    ansGrid: $('ansGrid'),
    ansFeedback: $('ansFeedback'), ansFbIcon: $('ansFbIcon'), ansFbText: $('ansFbText'),
    countdownOverlay: $('countdownOverlay'), countdownNum: $('countdownNum'),
    scorePop: $('scorePop'), scorePopText: $('scorePopText'),
    disconnectOverlay: $('disconnectOverlay'), disconnectTitle: $('disconnectTitle'), disconnectMsg: $('disconnectMsg'),
    resultOverlay: $('resultOverlay'), resultBadge: $('resultBadge'), resultTitle: $('resultTitle'), resultSub: $('resultSub'),
    rp1Avatar: $('rp1Avatar'), rp1Name: $('rp1Name'), rp1Score: $('rp1Score'),
    rp2Avatar: $('rp2Avatar'), rp2Name: $('rp2Name'), rp2Score: $('rp2Score'),
    rsQ: $('rsQ'), rsCorrect: $('rsCorrect'), rsAcc: $('rsAcc'), rsFast: $('rsFast'),
    ansCards: dom ? dom.ansCards : null
  };

  var ansBtns = dom.ansGrid.querySelectorAll('.ans-card');

  /* ---------- State ---------- */
  var ws = null;
  var myId = session.id;
  var myName = session.name || 'Player';
  var myInitials = myName.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  var opponentName = 'Opponent';
  var opponentInitials = 'OP';

  var state = {
    currentQ: 0,
    totalQ: 10,
    myScore: 0,
    oppScore: 0,
    answered: false,
    questionActive: false,
    timerInterval: null,
    timeLeft: 30,
    totalTime: 30,
    correctCount: 0,
    fastestCorrect: Infinity
  };

  /* ---------- Timer circumference ---------- */
  var TIMER_R = 16;
  var CIRCUM = 2 * Math.PI * TIMER_R; // ~100.53

  /* ---------- Init ---------- */
  function init() {
    dom.p1Name.textContent = myName;
    dom.p1Avatar.textContent = myInitials;
    dom.p2Name.textContent = opponentName;
    dom.p2Avatar.textContent = opponentInitials;

    dom.rp1Name.textContent = myName;
    dom.rp1Avatar.textContent = myInitials;
    dom.rp2Name.textContent = opponentName;
    dom.rp2Avatar.textContent = opponentInitials;

    ansBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { submitAnswer(parseInt(btn.getAttribute('data-idx'), 10)); });
    });

    connectWS();
  }

  /* ---------- WebSocket ---------- */
  function connectWS() {
    var wsUrl;
    if (window.QuizFlowConfig && window.QuizFlowConfig.BATTLE_SERVER) {
      wsUrl = window.QuizFlowConfig.BATTLE_SERVER;
    } else {
      var host = window.location.hostname;
      wsUrl = 'ws://' + (host && host !== '' ? host : 'localhost') + ':9090';
    }
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      showDisconnect('Server Error', 'Could not connect to battle server.');
      return;
    }

    ws.onopen = function () {
      send({ type: 'JOIN_BATTLE', battleId: battleId, playerId: myId, name: myName });
    };

    ws.onmessage = function (evt) {
      var msg;
      try { msg = JSON.parse(evt.data); } catch (e) { return; }
      handleMessage(msg);
    };

    ws.onclose = function () {
      if (!state.questionActive && dom.resultOverlay.classList.contains('hidden')) {
        showDisconnect('Connection Lost', 'Disconnected from battle server.');
      }
    };

    ws.onerror = function () {
      showDisconnect('Server Error', 'Could not connect to battle server.');
    };
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /* ---------- Handle server messages ---------- */
  function handleMessage(msg) {
    switch (msg.type) {

      case 'BATTLE_INFO':
        state.totalQ = msg.totalQuestions || 10;
        state.totalTime = msg.timeLimit || 30;
        opponentName = msg.opponentName || 'Opponent';
        opponentInitials = opponentName.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
        dom.p2Name.textContent = opponentName;
        dom.p2Avatar.textContent = opponentInitials;
        dom.barSubject.textContent = (msg.subjectName || 'Quiz') + ' Battle';
        dom.rp2Name.textContent = opponentName;
        dom.rp2Avatar.textContent = opponentInitials;
        startCountdown(msg.countdown || 3);
        break;

      case 'NEW_QUESTION':
        onNewQuestion(msg);
        break;

      case 'ANSWER_RESULT':
        onAnswerResult(msg);
        break;

      case 'OPPONENT_ANSWERED':
        onOpponentAnswered(msg);
        break;

      case 'QUESTION_TIMEOUT':
        onQuestionTimeout(msg);
        break;

      case 'SCORE_UPDATE':
        onScoreUpdate(msg);
        break;

      case 'BATTLE_FINISHED':
        onBattleFinished(msg);
        break;

      case 'OPPONENT_DISCONNECTED':
        showDisconnect('Opponent Disconnected', 'Your opponent has left the battle.');
        break;

      case 'OPPONENT_RECONNECTED':
        dom.disconnectOverlay.classList.add('hidden');
        break;

      default:
        break;
    }
  }

  /* ---------- Countdown ---------- */
  function startCountdown(secs) {
    dom.countdownOverlay.classList.remove('hidden');
    var n = secs;
    dom.countdownNum.textContent = n;
    var iv = setInterval(function () {
      n--;
      if (n <= 0) {
        clearInterval(iv);
        dom.countdownOverlay.classList.add('hidden');
        return;
      }
      dom.countdownNum.textContent = n;
      dom.countdownNum.style.animation = 'none';
      void dom.countdownNum.offsetWidth;
      dom.countdownNum.style.animation = 'countdown-pop .7s var(--ease) both';
    }, 1000);
  }

  /* ---------- New Question ---------- */
  function onNewQuestion(msg) {
    state.currentQ = msg.questionIndex || (state.currentQ + 1);
    state.answered = false;
    state.questionActive = true;

    dom.barQ.textContent = 'Q ' + state.currentQ + ' / ' + state.totalQ;
    dom.qLabel.textContent = 'QUESTION ' + String(state.currentQ).padStart(2, '0') + ' / ' + state.totalQ;
    dom.qText.textContent = msg.question || 'Loading...';

    var options = msg.options || [];
    ansBtns.forEach(function (btn, i) {
      btn.className = 'ans-card glass-card';
      btn.querySelector('.ans-text').textContent = options[i] || '—';
      btn.querySelector('.ans-result').textContent = '';
      btn.querySelector('.ans-result').style.opacity = '0';
    });

    dom.ansFeedback.classList.add('hidden');
    dom.oppStatus.classList.add('hidden');

    startTimer(msg.timeLimit || state.totalTime);
  }

  /* ---------- Timer ---------- */
  function startTimer(secs) {
    clearTimer();
    state.timeLeft = secs;
    dom.timerNum.textContent = secs;
    dom.qTimerMobile.textContent = secs;
    dom.timerArc.style.strokeDashoffset = '0';

    state.timerInterval = setInterval(function () {
      state.timeLeft--;
      if (state.timeLeft < 0) state.timeLeft = 0;
      dom.timerNum.textContent = state.timeLeft;
      dom.qTimerMobile.textContent = state.timeLeft;

      var pct = 1 - (state.timeLeft / secs);
      dom.timerArc.style.strokeDashoffset = (pct * CIRCUM).toFixed(2);

      if (state.timeLeft <= 5) {
        dom.timerNum.style.color = '#f87171';
      } else {
        dom.timerNum.style.color = '#fff';
      }

      if (state.timeLeft <= 0) {
        clearTimer();
      }
    }, 1000);
  }

  function clearTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  /* ---------- Submit Answer ---------- */
  function submitAnswer(idx) {
    if (state.answered || !state.questionActive) return;
    state.answered = true;

    ansBtns.forEach(function (btn) {
      btn.classList.add('disabled');
    });
    ansBtns[idx].classList.add('selected');

    dom.ansFeedback.classList.remove('hidden', 'correct-fb', 'incorrect-fb', 'timeout-fb');
    dom.ansFeedback.classList.add('correct-fb');
    dom.ansFbIcon.textContent = '⏳';
    dom.ansFbText.textContent = 'Answer submitted...';

    send({
      type: 'SUBMIT_ANSWER',
      battleId: battleId,
      playerId: myId,
      questionIndex: state.currentQ,
      answer: idx,
      clientTimestamp: Date.now()
    });
  }

  /* ---------- Answer Result (from server) ---------- */
  function onAnswerResult(msg) {
    var isCorrect = msg.correct;
    var myIdx = msg.myAnswer;

    if (isCorrect) {
      state.correctCount++;
      ansBtns[myIdx].classList.remove('selected');
      ansBtns[myIdx].classList.add('correct');
      ansBtns[myIdx].querySelector('.ans-result').textContent = '✓';
      ansBtns[myIdx].querySelector('.ans-result').style.opacity = '1';

      dom.ansFeedback.className = 'ans-feedback correct-fb';
      dom.ansFbIcon.textContent = '✓';
      dom.ansFbText.textContent = msg.firstCorrect ? 'You answered correctly first! +1 POINT' : '✓ CORRECT';

      if (msg.firstCorrect) {
        showScorePop('+1');
      }
    } else {
      ansBtns[myIdx].classList.remove('selected');
      ansBtns[myIdx].classList.add('incorrect');
      ansBtns[myIdx].querySelector('.ans-result').textContent = '✕';
      ansBtns[myIdx].querySelector('.ans-result').style.opacity = '1';

      dom.ansFeedback.className = 'ans-feedback incorrect-fb';
      dom.ansFbIcon.textContent = '✕';
      dom.ansFbText.textContent = '✕ INCORRECT';
    }

    /* Show correct answer */
    if (msg.correctIndex !== undefined) {
      ansBtns[msg.correctIndex].classList.add('show-correct');
    }

    /* Disable all */
    ansBtns.forEach(function (btn) {
      if (!btn.classList.contains('correct') && !btn.classList.contains('incorrect')) {
        btn.classList.add('disabled');
      }
    });

    state.questionActive = false;
  }

  /* ---------- Opponent answered ---------- */
  function onOpponentAnswered(msg) {
    dom.oppStatus.classList.remove('hidden');
    if (msg.correct) {
      dom.oppStatusText.textContent = 'Opponent answered correctly!';
      dom.oppStatus.className = 'opp-status';
    } else {
      dom.oppStatusText.textContent = 'Opponent answered incorrectly!';
    }
  }

  /* ---------- Question Timeout ---------- */
  function onQuestionTimeout(msg) {
    state.questionActive = false;
    clearTimer();

    dom.ansFeedback.classList.remove('hidden', 'correct-fb', 'incorrect-fb');
    dom.ansFeedback.classList.add('timeout-fb');
    dom.ansFbIcon.textContent = '⏱';
    dom.ansFbText.textContent = 'Time\'s up!';

    ansBtns.forEach(function (btn) { btn.classList.add('disabled'); });

    if (msg.correctIndex !== undefined) {
      ansBtns[msg.correctIndex].classList.add('show-correct');
    }
  }

  /* ---------- Score Update ---------- */
  function onScoreUpdate(msg) {
    var oldMy = state.myScore;
    var oldOpp = state.oppScore;

    state.myScore = msg.myScore;
    state.oppScore = msg.oppScore;

    animateScore(dom.p1Score, oldMy, state.myScore);
    animateScore(dom.p2Score, oldOpp, state.oppScore);

    dom.p1Card.classList.toggle('leading', state.myScore > state.oppScore);
    dom.p2Card.classList.toggle('leading', state.oppScore > state.myScore);

    if (msg.lastScorer === myId) {
      showScorePop('+1');
    }
  }

  function animateScore(el, from, to) {
    el.textContent = to;
    el.classList.add('pop');
    setTimeout(function () { el.classList.remove('pop'); }, 300);
  }

  function showScorePop(text) {
    dom.scorePopText.textContent = text;
    dom.scorePop.classList.remove('hidden');
    dom.scorePop.style.animation = 'none';
    void dom.scorePop.offsetWidth;
    dom.scorePop.style.animation = '';
    setTimeout(function () { dom.scorePop.classList.add('hidden'); }, 1200);
  }

  /* ---------- Battle Finished ---------- */
  function onBattleFinished(msg) {
    clearTimer();
    state.questionActive = false;

    var myFinalScore = msg.myScore !== undefined ? msg.myScore : state.myScore;
    var oppFinalScore = msg.oppScore !== undefined ? msg.oppScore : state.oppScore;

    dom.rp1Score.textContent = myFinalScore;
    dom.rp2Score.textContent = oppFinalScore;

    var correctCount = msg.correctCount || state.correctCount;
    var totalQ = msg.totalQuestions || state.totalQ;
    var accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    var fastest = msg.fastestCorrect !== undefined ? msg.fastestCorrect : state.fastestCorrect;

    dom.rsQ.textContent = totalQ;
    dom.rsCorrect.textContent = correctCount;
    dom.rsAcc.textContent = accuracy + '%';
    dom.rsFast.textContent = fastest === Infinity ? '—' : fastest.toFixed(1) + 's';

    if (msg.winner === 'draw') {
      dom.resultBadge.textContent = '🤝';
      dom.resultTitle.textContent = 'DRAW';
      dom.resultTitle.className = 'result-title draw-title';
      dom.resultSub.textContent = 'An evenly matched battle!';
    } else if (msg.winner === myId || msg.winner === myName) {
      dom.resultBadge.textContent = '🏆';
      dom.resultTitle.textContent = 'VICTORY!';
      dom.resultTitle.className = 'result-title';
      dom.resultSub.textContent = 'You won the battle!';
    } else {
      dom.resultBadge.textContent = '😔';
      dom.resultTitle.textContent = 'DEFEAT';
      dom.resultTitle.className = 'result-title defeat-title';
      dom.resultSub.textContent = 'Better luck next time!';
    }

    dom.resultOverlay.classList.remove('hidden');
  }

  /* ---------- Disconnect ---------- */
  function showDisconnect(title, msg) {
    dom.disconnectTitle.textContent = title;
    dom.disconnectMsg.textContent = msg;
    dom.disconnectOverlay.classList.remove('hidden');
  }

  $('claimVictoryBtn').addEventListener('click', function () {
    send({ type: 'CLAIM_VICTORY', battleId: battleId, playerId: myId });
    window.location.href = 'dashboard.html';
  });

  $('backDashBtn').addEventListener('click', function () {
    window.location.href = 'dashboard.html';
  });

  /* ---------- Rematch ---------- */
  $('rematchBtn').addEventListener('click', function () {
    send({ type: 'REMATCH', battleId: battleId, playerId: myId });
    window.location.href = 'battle.html';
  });

  $('resultDashBtn').addEventListener('click', function () {
    window.location.href = 'dashboard.html';
  });

  /* ---------- Boot ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
