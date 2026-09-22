/* ============================================================
   QuizFlow — SQLite Database (Node.js)
   Uses better-sqlite3 for synchronous operations.
   ============================================================ */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');

class QuizFlowDB {
  constructor(dbPath) {
    this.db = new Database(path.join(__dirname, '..', dbPath));
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.createTables();
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'Student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS battle_rooms (
        battle_id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT UNIQUE NOT NULL,
        subject_id INTEGER NOT NULL,
        total_questions INTEGER DEFAULT 10,
        time_limit INTEGER DEFAULT 30,
        current_question INTEGER DEFAULT 0,
        state INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS battle_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        battle_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        score INTEGER DEFAULT 0,
        ready INTEGER DEFAULT 0,
        FOREIGN KEY (battle_id) REFERENCES battle_rooms(battle_id)
      );

      CREATE TABLE IF NOT EXISTS battle_answers (
        answer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        battle_id INTEGER NOT NULL,
        question_id INTEGER,
        question_index INTEGER,
        player_id INTEGER NOT NULL,
        answer INTEGER,
        is_correct INTEGER DEFAULT 0,
        submitted_at BIGINT,
        FOREIGN KEY (battle_id) REFERENCES battle_rooms(battle_id)
      );

      CREATE TABLE IF NOT EXISTS battle_results (
        result_id INTEGER PRIMARY KEY AUTOINCREMENT,
        battle_id INTEGER NOT NULL,
        winner_id INTEGER DEFAULT 0,
        player1_id INTEGER,
        player2_id INTEGER,
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (battle_id) REFERENCES battle_rooms(battle_id)
      );

      CREATE TABLE IF NOT EXISTS leaderboard (
        player_id INTEGER PRIMARY KEY,
        player_name TEXT,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        total_battles INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        chapter_id INTEGER,
        qid TEXT,
        text TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_index INTEGER DEFAULT 0,
        difficulty TEXT DEFAULT 'medium',
        explanation TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_answers_battle ON battle_answers(battle_id);
      CREATE INDEX IF NOT EXISTS idx_results_p1 ON battle_results(player1_id);
      CREATE INDEX IF NOT EXISTS idx_results_p2 ON battle_results(player2_id);
      CREATE INDEX IF NOT EXISTS idx_qs_subject ON questions(subject_id);
    `);
  }

  // ---- Questions ----
  getQuestionsForSubject(subjectId, count) {
    const stmt = this.db.prepare(`
      SELECT id, subject_id, chapter_id, text, option_a, option_b, option_c, option_d, correct_index, difficulty, explanation
      FROM questions WHERE subject_id = ? ORDER BY RANDOM() LIMIT ?
    `);
    return stmt.all(subjectId, count);
  }

  // ---- Battle Results ----
  insertBattleResult(battleId, winnerId, p1Id, p2Id, p1Score, p2Score) {
    const stmt = this.db.prepare(`
      INSERT INTO battle_results (battle_id, winner_id, player1_id, player2_id, player1_score, player2_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(battleId, winnerId, p1Id, p2Id, p1Score, p2Score);
  }

  getBattleHistory(playerId, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT * FROM battle_results
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY completed_at DESC LIMIT ?
    `);
    return stmt.all(playerId, playerId, limit);
  }

  // ---- Answers ----
  insertAnswer(battleId, questionId, playerId, answer, isCorrect, timestamp) {
    const stmt = this.db.prepare(`
      INSERT INTO battle_answers (battle_id, question_id, player_id, answer, is_correct, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(battleId, questionId, playerId, answer, isCorrect ? 1 : 0, timestamp);
  }

  // ---- Leaderboard ----
  updateLeaderboard(playerId, playerName, result) {
    // result: 1=win, 0=loss, -1=draw
    const existing = this.db.prepare('SELECT player_id FROM leaderboard WHERE player_id = ?').get(playerId);

    if (!existing) {
      this.db.prepare(`
        INSERT INTO leaderboard (player_id, player_name, wins, losses, draws, total_points, total_battles)
        VALUES (?, ?, ?, ?, ?, 1, 1)
      `).run(playerId, playerName,
        result === 1 ? 1 : 0,
        result === 0 ? 1 : 0,
        result === -1 ? 1 : 0
      );
    } else {
      const field = result === 1 ? 'wins' : result === 0 ? 'losses' : 'draws';
      this.db.prepare(`
        UPDATE leaderboard SET ${field} = ${field} + 1, total_points = total_points + 1, total_battles = total_battles + 1
        WHERE player_id = ?
      `).run(playerId);
    }
  }

  getLeaderboard(limit = 50) {
    return this.db.prepare(`
      SELECT *, CASE WHEN total_battles > 0 THEN ROUND(CAST(wins AS FLOAT) / total_battles * 100, 1) ELSE 0 END as win_rate
      FROM leaderboard ORDER BY wins DESC, total_points DESC LIMIT ?
    `).all(limit);
  }

  close() {
    this.db.close();
  }
}

module.exports = QuizFlowDB;
