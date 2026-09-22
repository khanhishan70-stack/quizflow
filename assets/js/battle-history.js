/* ============================================================
   QuizFlow — Battle History (profile page)
   Renders battle history from localStorage (mock data).
   When C++ server is connected, fetches from API.
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.getSession();
  if (!session) return;

  var BH_KEY = 'quizflow_battle_history_' + session.id;

  var el = document.getElementById('battleHistory');
  if (!el) return;

  function render() {
    var history = [];
    try { history = JSON.parse(localStorage.getItem(BH_KEY) || '[]'); } catch (e) {}

    if (!history.length) {
      el.innerHTML = '<div class="empty"><div class="empty-ic">⚡</div>No battles yet — start your first 1v1!</div>';
      return;
    }

    el.innerHTML = '';
    history.forEach(function (b) {
      var row = document.createElement('div');
      row.className = 'recent-row glass-card';

      var isVictory = b.result === 'victory';
      var isDraw = b.result === 'draw';

      var ic = document.createElement('span');
      ic.className = 'recent-ic';
      ic.textContent = isVictory ? '🏆' : isDraw ? '🤝' : '😔';

      var main = document.createElement('div');
      main.className = 'recent-main';
      var title = document.createElement('b');
      title.textContent = (b.subject || 'Quiz Battle') + ' vs ' + (b.opponent || 'Opponent');
      var sub = document.createElement('span');
      sub.textContent = new Date(b.date).toLocaleDateString() + ' · ' + b.score;
      main.appendChild(title);
      main.appendChild(sub);

      var pct = document.createElement('span');
      pct.className = 'recent-pct ' + (isVictory ? 'good' : isDraw ? 'mid' : 'low');
      pct.textContent = isVictory ? '🏆 Victory' : isDraw ? '🤝 Draw' : '😔 Defeat';

      row.appendChild(ic);
      row.appendChild(main);
      row.appendChild(pct);
      el.appendChild(row);
    });
  }

  render();
})();
