-- ============================================================
-- QuizFlow Battle Database Schema
-- SQLite — created by C++ server on first run
-- ============================================================

-- Users table (already exists in localStorage mock,
-- but C++ server needs its own copy)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'Student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject_id INTEGER NOT NULL,
    category TEXT,
    icon TEXT,
    question_count INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Questions (shared with quiz system)
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

-- Battle rooms
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

-- Players in a battle
CREATE TABLE IF NOT EXISTS battle_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    ready INTEGER DEFAULT 0,
    FOREIGN KEY (battle_id) REFERENCES battle_rooms(battle_id)
);

-- Individual answers per question
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

-- Battle results (final)
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

-- Leaderboard (aggregate stats per player)
CREATE TABLE IF NOT EXISTS leaderboard (
    player_id INTEGER PRIMARY KEY,
    player_name TEXT,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    total_battles INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_battle_players_battle ON battle_players(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_battle ON battle_answers(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_results_p1 ON battle_results(player1_id);
CREATE INDEX IF NOT EXISTS idx_battle_results_p2 ON battle_results(player2_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_wins ON leaderboard(wins DESC);
