/* ============================================================
   QuizFlow — Battle Server (Node.js + WebSocket)
   Port 9090 — serves all 1v1 battle logic.
   
   Start:   node server/battle-server.js
   Connect: ws://127.0.0.1:9090
   ============================================================ */

'use strict';

const { WebSocketServer } = require('ws');
const Database = require('./database');

const PORT = process.env.PORT || 9090;
const TOTAL_QUESTIONS = 10;
const TIME_LIMIT = 30; // seconds per question

// ============================================================
// Database
// ============================================================
const db = new Database('quizflow.db');

// ============================================================
// In-memory state
// ============================================================

/** @type {Map<number, BattleRoom>} */
const battles = new Map();

/** @type {Map<number, number>}  playerId -> battleId */
const playerBattle = new Map();

/** @type {Map<number, {playerId:number, name:string, subjectId:number, ws:WebSocket}>} */
const matchQueue = new Map();

/** @type {Map<string, number>}  roomCode -> battleId */
const roomCodes = new Map();

/** @type {Map<WebSocket, number>}  ws -> playerId */
const wsToPlayer = new Map();

let nextBattleId = 1;

// ============================================================
// BattleRoom class
// ============================================================

class BattleRoom {
  constructor(battleId, roomCode, subjectId, p1) {
    this.battleId = battleId;
    this.roomCode = roomCode;
    this.subjectId = subjectId;
    this.totalQuestions = TOTAL_QUESTIONS;
    this.timeLimit = TIME_LIMIT;
    this.currentQuestion = 0;
    this.state = 'WAITING'; // WAITING|READY|STARTING|QUESTION_ACTIVE|QUESTION_FINISHED|COMPLETED
    this.questions = [];
    this.subjectName = getSubjectName(subjectId);

    this.player1 = { id: p1.id, name: p1.name, ws: p1.ws, score: 0, ready: false, hasAnswered: false, currentAnswer: -1, answerTimestamp: 0 };
    this.player2 = null;

    this.questionStartTime = 0;
    this.questionTimer = null;
    this.lastScorerId = -1;
    this.p1CorrectCount = 0;
    this.p2CorrectCount = 0;
    this.p1FastestCorrect = 999;
    this.p2FastestCorrect = 999;
  }

  getPlayer(id) {
    if (this.player1 && this.player1.id === id) return this.player1;
    if (this.player2 && this.player2.id === id) return this.player2;
    return null;
  }

  getOpponent(id) {
    if (this.player1 && this.player1.id === id) return this.player2;
    return this.player1;
  }

  bothAnswered() {
    if (!this.player1 || !this.player2) return false;
    return this.player1.hasAnswered && this.player2.hasAnswered;
  }

  resetForQuestion() {
    if (this.player1) { this.player1.hasAnswered = false; this.player1.currentAnswer = -1; this.player1.answerTimestamp = 0; }
    if (this.player2) { this.player2.hasAnswered = false; this.player2.currentAnswer = -1; this.player2.answerTimestamp = 0; }
    this.lastScorerId = -1;
  }

  clearTimer() {
    if (this.questionTimer) { clearTimeout(this.questionTimer); this.questionTimer = null; }
  }
}

// ============================================================
// Helpers
// ============================================================

function getSubjectName(id) {
  const names = {
    1: 'Digital Techniques & Microprocessors',
    2: 'Data Structures Using C',
    3: 'Object Oriented Programming using C++',
    4: 'Applied Mathematics - III',
    5: 'Employability & Communication Skills - III'
  };
  return names[id] || 'Quiz Battle';
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'QF-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function send(ws, data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function nowMs() {
  return Date.now();
}

// ============================================================
// Load questions for a subject from DB
// ============================================================

function loadQuestions(subjectId, count) {
  return db.getQuestionsForSubject(subjectId, count);
}

// ============================================================
// Send a question to both players
// ============================================================

function sendQuestion(room) {
  if (room.currentQuestion >= room.questions.length) return;

  const q = room.questions[room.currentQuestion];
  room.resetForQuestion();
  room.state = 'QUESTION_ACTIVE';
  room.questionStartTime = nowMs();

  const msg = {
    type: 'NEW_QUESTION',
    questionIndex: room.currentQuestion + 1,
    question: q.text,
    options: [q.option_a, q.option_b, q.option_c, q.option_d],
    timeLimit: room.timeLimit
  };

  send(room.player1?.ws, msg);
  send(room.player2?.ws, msg);

  // Set server-side timeout
  room.clearTimer();
  room.questionTimer = setTimeout(() => {
    handleQuestionTimeout(room);
  }, room.timeLimit * 1000 + 500); // +500ms grace period
}

// ============================================================
// Question timeout (server-authoritative)
// ============================================================

function handleQuestionTimeout(room) {
  if (room.state !== 'QUESTION_ACTIVE') return;
  room.state = 'QUESTION_FINISHED';

  const q = room.questions[room.currentQuestion];

  // Notify both players
  const msg = { type: 'QUESTION_TIMEOUT', correctIndex: q.correct_index };
  send(room.player1?.ws, msg);
  send(room.player2?.ws, msg);

  // Advance after 1.5s
  setTimeout(() => advanceQuestion(room), 1500);
}

// ============================================================
// Advance to next question or finish
// ============================================================

function advanceQuestion(room) {
  room.currentQuestion++;

  if (room.currentQuestion >= room.totalQuestions) {
    finishBattle(room);
    return;
  }

  sendQuestion(room);
}

// ============================================================
// Finish battle
// ============================================================

function finishBattle(room) {
  room.state = 'COMPLETED';
  room.clearTimer();

  let winnerId = 0;
  if (room.player1.score > room.player2.score) winnerId = room.player1.id;
  else if (room.player2.score > room.player1.score) winnerId = room.player2.id;

  // Send to player1
  send(room.player1.ws, {
    type: 'BATTLE_FINISHED',
    winner: winnerId === 0 ? 'draw' : String(winnerId),
    myScore: room.player1.score,
    oppScore: room.player2.score,
    totalQuestions: room.totalQuestions,
    correctCount: room.p1CorrectCount,
    fastestCorrect: room.p1FastestCorrect < 999 ? room.p1FastestCorrect : -1
  });

  // Send to player2 (swapped perspective)
  send(room.player2.ws, {
    type: 'BATTLE_FINISHED',
    winner: winnerId === 0 ? 'draw' : String(winnerId),
    myScore: room.player2.score,
    oppScore: room.player1.score,
    totalQuestions: room.totalQuestions,
    correctCount: room.p2CorrectCount,
    fastestCorrect: room.p2FastestCorrect < 999 ? room.p2FastestCorrect : -1
  });

  // Save to database
  try {
    db.insertBattleResult(room.battleId, winnerId,
      room.player1.id, room.player2.id,
      room.player1.score, room.player2.score);

    const r1 = winnerId === room.player1.id ? 1 : winnerId === 0 ? -1 : 0;
    const r2 = winnerId === room.player2.id ? 1 : winnerId === 0 ? -1 : 0;
    db.updateLeaderboard(room.player1.id, room.player1.name, r1);
    db.updateLeaderboard(room.player2.id, room.player2.name, r2);
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

// ============================================================
// WebSocket Server
// ============================================================

const wss = new WebSocketServer({ port: PORT });
console.log(`========================================`);
console.log(`  QuizFlow Battle Server`);
console.log(`  WebSocket: ws://127.0.0.1:${PORT}`);
console.log(`========================================`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    const playerId = wsToPlayer.get(ws);
    if (playerId) {
      wsToPlayer.delete(ws);
      handleDisconnect(playerId);
    }
  });
});

// ============================================================
// Route messages
// ============================================================

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'QUICK_MATCH':
      quickMatch(ws, msg);
      break;
    case 'CANCEL_SEARCH':
      cancelSearch(msg.playerId);
      break;
    case 'CREATE_ROOM':
      createRoom(ws, msg);
      break;
    case 'JOIN_ROOM':
      joinRoom(ws, msg);
      break;
    case 'JOIN_BATTLE':
      joinBattle(ws, msg);
      break;
    case 'PLAYER_READY':
      playerReady(msg.playerId);
      break;
    case 'SUBMIT_ANSWER':
      submitAnswer(msg);
      break;
    case 'CLAIM_VICTORY':
      claimVictory(msg.playerId);
      break;
    case 'REMATCH':
      rematch(msg.playerId);
      break;
    default:
      console.log('Unknown message:', msg.type);
  }
}

// ============================================================
// Quick Match
// ============================================================

function quickMatch(ws, msg) {
  const { playerId, name, subjectId } = msg;
  wsToPlayer.set(ws, playerId);

  // Already in battle?
  if (playerBattle.has(playerId)) return;

  // Look for existing match in queue with same subject
  for (const [qid, entry] of matchQueue) {
    if (qid !== playerId && entry.subjectId === subjectId) {
      // Match found!
      matchQueue.delete(qid);
      createBattle(
        { id: entry.playerId, name: entry.name, ws: entry.ws },
        { id: playerId, name, ws },
        subjectId
      );
      return;
    }
  }

  // No match — add to queue
  matchQueue.set(playerId, { playerId, name, subjectId, ws });
  console.log(`Player ${name} (${playerId}) queued for match, subject ${subjectId}`);
}

function cancelSearch(playerId) {
  matchQueue.delete(playerId);
}

// ============================================================
// Create battle for two quick-match players
// ============================================================

function createBattle(p1, p2, subjectId) {
  const battleId = nextBattleId++;

  const room = new BattleRoom(battleId, null, subjectId, p1);
  room.player2 = { id: p2.id, name: p2.name, ws: p2.ws, score: 0, ready: false, hasAnswered: false, currentAnswer: -1, answerTimestamp: 0 };
  room.state = 'READY';

  // Load questions from DB
  room.questions = loadQuestions(subjectId, TOTAL_QUESTIONS);
  if (room.questions.length === 0) {
    room.questions = generateMockQuestions(subjectId);
  }

  battles.set(battleId, room);
  playerBattle.set(p1.id, battleId);
  playerBattle.set(p2.id, battleId);

  send(p1.ws, { type: 'MATCH_FOUND', battleId, opponentName: p2.name, subjectName: room.subjectName });
  send(p2.ws, { type: 'MATCH_FOUND', battleId, opponentName: p1.name, subjectName: room.subjectName });

  console.log(`Match ${battleId}: ${p1.name} vs ${p2.name} (${room.subjectName})`);
}

// ============================================================
// Create Room
// ============================================================

function createRoom(ws, msg) {
  const { playerId, name, subjectId } = msg;
  wsToPlayer.set(ws, playerId);

  const code = generateRoomCode();
  const battleId = nextBattleId++;

  const room = new BattleRoom(battleId, code, subjectId, { id: playerId, name, ws });
  room.state = 'WAITING';

  // Load questions from DB
  room.questions = loadQuestions(subjectId, TOTAL_QUESTIONS);

  // If DB has no questions, use mock questions
  if (room.questions.length === 0) {
    room.questions = generateMockQuestions(subjectId);
  }

  battles.set(battleId, room);
  playerBattle.set(playerId, battleId);
  roomCodes.set(code, battleId);

  send(ws, { type: 'ROOM_CREATED', roomCode: code });
  console.log(`Room ${code} created by ${name} (battle ${battleId})`);
}

// ============================================================
// Join Room
// ============================================================

function joinRoom(ws, msg) {
  const { playerId, name, roomCode } = msg;
  wsToPlayer.set(ws, playerId);

  const code = (roomCode || '').toUpperCase().trim();
  const battleId = roomCodes.get(code);

  if (!battleId) {
    send(ws, { type: 'ERROR', message: 'Room not found.' });
    return;
  }

  const room = battles.get(battleId);
  if (!room) {
    send(ws, { type: 'ERROR', message: 'Room expired.' });
    return;
  }

  if (room.player2) {
    send(ws, { type: 'ERROR', message: 'Room is full.' });
    return;
  }

  room.player2 = { id: playerId, name, ws, score: 0, ready: false, hasAnswered: false, currentAnswer: -1, answerTimestamp: 0 };
  room.state = 'READY';
  playerBattle.set(playerId, battleId);

  // Notify both
  send(room.player1.ws, { type: 'OPPONENT_JOINED', opponentName: name });
  send(ws, { type: 'OPPONENT_JOINED', opponentName: room.player1.name, roomCode: code });

  console.log(`${name} joined room ${code}`);
}

// ============================================================
// Join existing battle (reconnect)
// ============================================================

function joinBattle(ws, msg) {
  const { battleId, playerId, name } = msg;
  wsToPlayer.set(ws, playerId);

  const room = battles.get(parseInt(battleId));
  if (!room) return;

  const player = room.getPlayer(playerId);
  if (player) {
    player.ws = ws;
    send(ws, {
      type: 'BATTLE_INFO',
      totalQuestions: room.totalQuestions,
      timeLimit: room.timeLimit,
      subjectName: room.subjectName,
      opponentName: room.getOpponent(playerId)?.name || 'Opponent',
      countdown: 0
    });
  }
}

// ============================================================
// Player Ready
// ============================================================

function playerReady(playerId) {
  const battleId = playerBattle.get(playerId);
  if (!battleId) return;

  const room = battles.get(battleId);
  if (!room) return;

  const player = room.getPlayer(playerId);
  if (!player) return;
  player.ready = true;

  // Notify opponent
  const opponent = room.getOpponent(playerId);
  if (opponent) {
    send(opponent.ws, { type: 'PLAYER_READY', playerId });
  }

  // Both ready? Start battle
  if (room.player1.ready && room.player2?.ready) {
    room.state = 'STARTING';
    room.currentQuestion = 0;

    // Tell lobby clients to open the battle game page
    send(room.player1.ws, { type: 'BATTLE_START', battleId: room.battleId });
    send(room.player2.ws, { type: 'BATTLE_START', battleId: room.battleId });

    // Send battle info with countdown
    const info1 = {
      type: 'BATTLE_INFO',
      totalQuestions: room.totalQuestions,
      timeLimit: room.timeLimit,
      subjectName: room.subjectName,
      countdown: 3,
      opponentName: room.player2.name
    };
    const info2 = {
      ...info1,
      opponentName: room.player1.name
    };

    send(room.player1.ws, info1);
    send(room.player2.ws, info2);

    console.log(`Battle ${room.battleId} starting: ${room.player1.name} vs ${room.player2.name}`);

    // Send first question after countdown
    setTimeout(() => {
      room.currentQuestion = 0;
      sendQuestion(room);
    }, 4500);
  }
}

// ============================================================
// Submit Answer (SERVER-AUTHORITATIVE)
// ============================================================

function submitAnswer(msg) {
  const { playerId, questionIndex, answer, clientTimestamp } = msg;
  const battleId = playerBattle.get(playerId);
  if (!battleId) return;

  const room = battles.get(battleId);
  if (!room || room.state !== 'QUESTION_ACTIVE') return;

  const qi = room.currentQuestion;
  if (questionIndex - 1 !== qi) return;

  const player = room.getPlayer(playerId);
  if (!player || player.hasAnswered) return;

  // Record with SERVER timestamp
  const serverTimestamp = nowMs();
  player.hasAnswered = true;
  player.currentAnswer = answer;
  player.answerTimestamp = serverTimestamp;

  // Check correctness
  const q = room.questions[qi];
  const isCorrect = (answer === q.correct_index);

  // First correct answer check
  let firstCorrect = false;
  if (isCorrect && room.lastScorerId === -1) {
    room.lastScorerId = playerId;
    player.score++;
    firstCorrect = true;

    const elapsed = (serverTimestamp - room.questionStartTime) / 1000;
    if (playerId === room.player1.id) {
      room.p1CorrectCount++;
      if (elapsed < room.p1FastestCorrect) room.p1FastestCorrect = elapsed;
    } else {
      room.p2CorrectCount++;
      if (elapsed < room.p2FastestCorrect) room.p2FastestCorrect = elapsed;
    }
  }

  // Save answer to DB
  try {
    db.insertAnswer(room.battleId, q.id || qi, playerId, answer, isCorrect, serverTimestamp);
  } catch (e) { /* ignore */ }

  // Send result to answering player
  send(player.ws, {
    type: 'ANSWER_RESULT',
    correct: isCorrect,
    firstCorrect: firstCorrect,
    myAnswer: answer,
    correctIndex: q.correct_index
  });

  // Notify opponent
  const opponent = room.getOpponent(playerId);
  if (opponent) {
    send(opponent.ws, {
      type: 'OPPONENT_ANSWERED',
      correct: isCorrect
    });
  }

  // Score update to both
  send(room.player1.ws, {
    type: 'SCORE_UPDATE',
    myScore: room.player1.score,
    oppScore: room.player2.score,
    lastScorer: room.lastScorerId
  });
  send(room.player2.ws, {
    type: 'SCORE_UPDATE',
    myScore: room.player2.score,
    oppScore: room.player1.score,
    lastScorer: room.lastScorerId
  });

  // Both answered? End question
  if (room.bothAnswered()) {
    room.state = 'QUESTION_FINISHED';
    room.clearTimer();
    setTimeout(() => advanceQuestion(room), 1500);
  }
}

// ============================================================
// Disconnect
// ============================================================

function handleDisconnect(playerId) {
  // Remove from search queue if they disconnect while searching
  matchQueue.delete(playerId);

  const battleId = playerBattle.get(playerId);
  if (!battleId) return;

  const room = battles.get(battleId);
  if (!room) return;

  const player = room.getPlayer(playerId);
  if (player) player.ws = null;

  const opponent = room.getOpponent(playerId);
  if (opponent && opponent.ws) {
    send(opponent.ws, { type: 'OPPONENT_DISCONNECTED' });
  }
}

// ============================================================
// Claim Victory
// ============================================================

function claimVictory(playerId) {
  const battleId = playerBattle.get(playerId);
  if (!battleId) return;

  const room = battles.get(battleId);
  if (!room) return;

  room.state = 'COMPLETED';
  room.clearTimer();

  send(room.player1.ws, {
    type: 'BATTLE_FINISHED',
    winner: String(playerId),
    myScore: playerId === room.player1.id ? room.player1.score : 0,
    oppScore: playerId === room.player1.id ? 0 : room.player1.score,
    totalQuestions: room.totalQuestions,
    correctCount: room.p1CorrectCount,
    fastestCorrect: room.p1FastestCorrect < 999 ? room.p1FastestCorrect : -1
  });
  if (room.player2) {
    send(room.player2.ws, {
      type: 'BATTLE_FINISHED',
      winner: String(playerId),
      myScore: playerId === room.player2.id ? room.player2.score : 0,
      oppScore: playerId === room.player2.id ? 0 : room.player2.score,
      totalQuestions: room.totalQuestions,
      correctCount: room.p2CorrectCount,
      fastestCorrect: room.p2FastestCorrect < 999 ? room.p2FastestCorrect : -1
    });
  }
}

// ============================================================
// Rematch
// ============================================================

function rematch(playerId) {
  const battleId = playerBattle.get(playerId);
  if (battleId) {
    playerBattle.delete(playerId);
    battles.delete(battleId);
  }
}

// ============================================================
// Mock questions (fallback when DB is empty)
// ============================================================

function generateMockQuestions(subjectId) {
  const oopQuestions = [
    { text: 'Which OOP concept allows a class to acquire properties and methods from another class?', option_a: 'Encapsulation', option_b: 'Inheritance', option_c: 'Abstraction', option_d: 'Polymorphism', correct_index: 1 },
    { text: 'What is the special method in a class that is automatically called when an object is created?', option_a: 'Destructor', option_b: 'Method', option_c: 'Constructor', option_d: 'Operator', correct_index: 2 },
    { text: 'Which keyword is used to create a class in C++?', option_a: 'struct', option_b: 'class', option_c: 'object', option_d: 'type', correct_index: 1 },
    { text: 'What is encapsulation in OOP?', option_a: 'Hiding data', option_b: 'Creating objects', option_c: 'Inheriting properties', option_d: 'Using functions', correct_index: 0 },
    { text: 'What is function overriding?', option_a: 'Same function in base class', option_b: 'Redefining base class function in derived class', option_c: 'Multiple functions with same name', option_d: 'None of these', correct_index: 1 },
    { text: 'What is a virtual function?', option_a: 'A function that does nothing', option_b: 'A function that can be overridden in derived class', option_c: 'A function inside main()', option_d: 'A static function', correct_index: 1 },
    { text: 'Which access specifier allows access from within the class only?', option_a: 'public', option_b: 'private', option_c: 'protected', option_d: 'friend', correct_index: 1 },
    { text: 'What is an abstract class?', option_a: 'A class with no functions', option_b: 'A class with at least one pure virtual function', option_c: 'A class with only constructors', option_d: 'A deleted class', correct_index: 1 },
    { text: 'What does polymorphism mean?', option_a: 'Many forms', option_b: 'Single form', option_c: 'No form', option_d: 'Data hiding', correct_index: 0 },
    { text: 'Which is NOT a principle of OOP?', option_a: 'Encapsulation', option_b: 'Compilation', option_c: 'Inheritance', option_d: 'Polymorphism', correct_index: 1 },
  ];

  const dsQuestions = [
    { text: 'Which data structure uses FIFO ordering?', option_a: 'Stack', option_b: 'Queue', option_c: 'Tree', option_d: 'Graph', correct_index: 1 },
    { text: 'What is the time complexity of binary search?', option_a: 'O(n)', option_b: 'O(log n)', option_c: 'O(n^2)', option_d: 'O(1)', correct_index: 1 },
    { text: 'Which data structure is used in recursion?', option_a: 'Queue', option_b: 'Tree', option_c: 'Stack', option_d: 'Array', correct_index: 2 },
    { text: 'What is a linked list?', option_a: 'Array of elements', option_b: 'Collection of nodes with pointers', option_c: 'Tree structure', option_d: 'Hash table', correct_index: 1 },
    { text: 'Which sorting algorithm has O(n log n) average case?', option_a: 'Bubble Sort', option_b: 'Selection Sort', option_c: 'Merge Sort', option_d: 'Insertion Sort', correct_index: 2 },
    { text: 'What is a binary tree?', option_a: 'Tree with 2 nodes', option_b: 'Tree where each node has at most 2 children', option_c: 'Tree with 2 levels', option_d: 'None of these', correct_index: 1 },
    { text: 'What does LIFO stand for?', option_a: 'Last In First Out', option_b: 'Last In Final Out', option_c: 'Linear Input Final Output', option_d: 'None', correct_index: 0 },
    { text: 'Which is a linear data structure?', option_a: 'Tree', option_b: 'Graph', option_c: 'Array', option_d: 'Heap', correct_index: 2 },
    { text: 'What is the worst case for quicksort?', option_a: 'O(n)', option_b: 'O(n log n)', option_c: 'O(n^2)', option_d: 'O(log n)', correct_index: 2 },
    { text: 'What is a stack?', option_a: 'FIFO structure', option_b: 'LIFO structure', option_c: 'Tree structure', option_d: 'Graph structure', correct_index: 1 },
  ];

  const dtmQuestions = [
    { text: 'What is a logic gate?', option_a: 'Software component', option_b: 'Physical circuit implementing Boolean logic', option_c: 'Type of memory', option_d: 'CPU register', correct_index: 1 },
    { text: 'How many bits in a byte?', option_a: '4', option_b: '8', option_c: '16', option_d: '32', correct_index: 1 },
    { text: 'What does CPU stand for?', option_a: 'Central Process Unit', option_b: 'Central Processing Unit', option_c: 'Computer Personal Unit', option_d: 'Central Program Utility', correct_index: 1 },
    { text: 'Which number system has base 16?', option_a: 'Binary', option_b: 'Octal', option_c: 'Hexadecimal', option_d: 'Decimal', correct_index: 2 },
    { text: 'What is the output of AND gate with inputs 1 and 0?', option_a: '1', option_b: '0', option_c: '2', option_d: 'Error', correct_index: 1 },
    { text: 'What is a flip-flop?', option_a: 'Combinational circuit', option_b: 'Sequential circuit storing 1 bit', option_c: 'Logic gate', option_d: 'Multiplexer', correct_index: 1 },
    { text: 'Which is a universal gate?', option_a: 'AND', option_b: 'OR', option_c: 'NAND', option_d: 'XOR', correct_index: 2 },
    { text: 'What is the 8085?', option_a: 'A processor', option_b: 'A memory chip', option_c: 'A bus', option_d: 'An accumulator', correct_index: 0 },
    { text: 'What does ALU stand for?', option_a: 'Array Logic Unit', option_b: 'Arithmetic Logic Unit', option_c: 'Advanced Logic Unit', option_d: 'Analog Logic Unit', correct_index: 1 },
    { text: 'Which is a sequential circuit?', option_a: 'AND gate', option_b: 'OR gate', option_c: 'Counter', option_d: 'Multiplexer', correct_index: 2 },
  ];

  const sets = { 1: dtmQuestions, 2: dsQuestions, 3: oopQuestions };
  const all = sets[subjectId] || oopQuestions;

  // Shuffle and return
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.map((q, i) => ({
    id: i + 1,
    subject_id: subjectId,
    text: q.text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_index: q.correct_index,
    difficulty: 'medium',
    explanation: ''
  }));
}

console.log('Battle server ready.');
