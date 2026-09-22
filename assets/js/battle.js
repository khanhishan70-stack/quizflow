/* ============================================================
   QuizFlow — Battle Lobby
   Handles: subject pick, quick match, room create/join,
   WebSocket connection to C++ battle server.
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.requireAuth('login.html');
  if (!session) return;

  var initials = (session.name || 'S')
    .split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();

  /* ---------- Nav ---------- */
  document.getElementById('sideName').textContent = session.name;
  document.getElementById('sideAvatar').textContent = initials;

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
  document.getElementById('logoutBtn').addEventListener('click', function () {
    window.QuizFlowAuth.logout('login.html');
  });

  /* ---------- State ---------- */
  var selectedSubject = 3; // default OOP
  var ws = null;
  var roomCode = null;

  /* ---------- Views ---------- */
  var views = {
    lobby: document.getElementById('lobbyView'),
    search: document.getElementById('searchView'),
    match: document.getElementById('matchView'),
    room: document.getElementById('roomView'),
    join: document.getElementById('joinView')
  };

  function showView(name) {
    Object.keys(views).forEach(function (k) {
      views[k].classList.toggle('hidden', k !== name);
    });
  }

  /* ---------- Subject picker ---------- */
  document.getElementById('subjectPills').addEventListener('click', function (e) {
    var btn = e.target.closest('.pill');
    if (!btn) return;
    document.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    selectedSubject = parseInt(btn.getAttribute('data-sid'), 10);
  });

  /* ---------- WebSocket ---------- */
  function getWsUrl() {
    if (window.QuizFlowConfig && window.QuizFlowConfig.BATTLE_SERVER) {
      return window.QuizFlowConfig.BATTLE_SERVER;
    }
    var host = window.location.hostname;
    return 'ws://' + (host && host !== '' ? host : 'localhost') + ':9090';
  }

  function connectWS(onOpen) {
    var wsUrl = getWsUrl();
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      showView('lobby');
      alert('Could not connect to battle server. Make sure the battle server is running.');
      return;
    }

    ws.onopen = function () {
      if (onOpen) onOpen();
    };

    ws.onmessage = function (evt) {
      var msg;
      try { msg = JSON.parse(evt.data); } catch (e) { return; }
      handleMessage(msg);
    };

    ws.onclose = function () {
      ws = null;
    };

    ws.onerror = function () {
      showView('lobby');
      alert('Could not connect to battle server. Make sure the C++ server is running on port 9090.');
    };
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /* ---------- Messages from server ---------- */
  function handleMessage(msg) {
    switch (msg.type) {

      case 'MATCH_FOUND':
        showMatch(msg);
        break;

      case 'ROOM_CREATED':
        roomCode = msg.roomCode;
        showRoom(msg.roomCode);
        break;

      case 'OPPONENT_JOINED':
        showOpponentJoined(msg);
        break;

      case 'PLAYER_READY':
        handleReady(msg);
        break;

      case 'BATTLE_START':
        window.location.href = 'battle-game.html?battle=' + msg.battleId;
        break;

      case 'ERROR':
        alert(msg.message || 'An error occurred.');
        showView('lobby');
        break;

      default:
        break;
    }
  }

  /* ---------- Quick Match ---------- */
  document.getElementById('quickMatchBtn').addEventListener('click', function () {
    showView('search');
    connectWS(function () {
      send({ type: 'QUICK_MATCH', playerId: session.id, name: session.name, subjectId: selectedSubject });
    });
  });

  document.getElementById('cancelSearchBtn').addEventListener('click', function () {
    send({ type: 'CANCEL_SEARCH', playerId: session.id });
    if (ws) ws.close();
    showView('lobby');
  });

  /* ---------- Create Room ---------- */
  document.getElementById('createRoomBtn').addEventListener('click', function () {
    connectWS(function () {
      send({ type: 'CREATE_ROOM', playerId: session.id, name: session.name, subjectId: selectedSubject });
    });
  });

  function showRoom(code) {
    showView('room');
    document.getElementById('roomCode').textContent = code;
    document.getElementById('roomP1Name').textContent = session.name;
    roomCode = code;
    iAmReady = false;
    oppReady = false;
    var rb = document.getElementById('roomReadyBtn');
    rb.textContent = 'READY';
    rb.disabled = false;
    document.getElementById('roomP1Ready').classList.remove('active');
    document.getElementById('roomP2Ready').classList.remove('active');
  }

  document.getElementById('copyCodeBtn').addEventListener('click', function () {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).then(function () {
        document.getElementById('copyCodeBtn').textContent = 'Copied!';
        setTimeout(function () {
          document.getElementById('copyCodeBtn').innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Code';
        }, 1500);
      });
    }
  });

  function showOpponentJoined(msg) {
    var p2Card = document.getElementById('roomP2');
    p2Card.classList.remove('empty');
    p2Card.innerHTML =
      '<span class="room-p-avatar">' + (msg.opponentName || 'P2').charAt(0).toUpperCase() + '</span>' +
      '<span>' + (msg.opponentName || 'Opponent') + '</span>' +
      '<span class="room-p-status">●</span>';
  }
  document.getElementById('joinRoomBtn').addEventListener('click', function () {
    showView('join');
  });

  document.getElementById('backToLobbyBtn').addEventListener('click', function () {
    showView('lobby');
  });

  document.getElementById('joinCodeBtn').addEventListener('click', function () {
    var code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
    if (!code || code.length < 4) {
      alert('Please enter a valid room code.');
      return;
    }
    connectWS(function () {
      send({ type: 'JOIN_ROOM', playerId: session.id, name: session.name, roomCode: code });
    });
  });

  /* ---------- Match Found ---------- */
  function showMatch(msg) {
    showView('match');
    document.getElementById('matchP1Name').textContent = session.name;
    document.getElementById('matchP1Avatar').textContent = initials;
    document.getElementById('matchP2Name').textContent = msg.opponentName || 'Opponent';
    document.getElementById('matchP2Avatar').textContent = (msg.opponentName || 'O').charAt(0).toUpperCase();
    document.getElementById('matchSubject').textContent = msg.subjectName || 'Quiz Battle';
  }

  /* ---------- Ready ---------- */
  var iAmReady = false;
  var oppReady = false;

  document.getElementById('readyBtn').addEventListener('click', function () {
    if (iAmReady) return;
    iAmReady = true;
    document.getElementById('readyBtn').textContent = 'READY ✓';
    document.getElementById('readyBtn').disabled = true;
    document.getElementById('p1Ready').classList.add('active');
    send({ type: 'PLAYER_READY', playerId: session.id });
  });

  document.getElementById('roomReadyBtn').addEventListener('click', function () {
    if (iAmReady) return;
    iAmReady = true;
    document.getElementById('roomReadyBtn').textContent = 'READY ✓';
    document.getElementById('roomReadyBtn').disabled = true;
    document.getElementById('roomP1Ready').classList.add('active');
    send({ type: 'PLAYER_READY', playerId: session.id });
  });

  function handleReady(msg) {
    if (msg.playerId !== session.id) {
      oppReady = true;
      document.getElementById('p2Ready').classList.add('active');
      document.getElementById('roomP2Ready').classList.add('active');
    }
  }

})();
