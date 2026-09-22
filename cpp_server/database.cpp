#include "database.h"
#include <iostream>
#include <sstream>

namespace quizflow {

// ============================================================
// Helpers
// ============================================================

Database::Database() : db(nullptr) {}
Database::~Database() { close(); }

bool Database::open(const std::string& dbPath) {
    int rc = sqlite3_open(dbPath.c_str(), &db);
    if (rc != SQLITE_OK) {
        std::cerr << "Cannot open database: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }
    sqlite3_exec(db, "PRAGMA journal_mode=WAL;", nullptr, nullptr, nullptr);
    sqlite3_exec(db, "PRAGMA foreign_keys=ON;", nullptr, nullptr, nullptr);
    return true;
}

void Database::close() {
    if (db) { sqlite3_close(db); db = nullptr; }
}

bool Database::exec(const std::string& sql) {
    char* errMsg = nullptr;
    int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << (errMsg ? errMsg : "unknown") << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    return true;
}

bool Database::execWithId(const std::string& sql, int& outId) {
    char* errMsg = nullptr;
    int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << (errMsg ? errMsg : "unknown") << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    outId = (int)sqlite3_last_insert_rowid(db);
    return true;
}

// ============================================================
// Schema
// ============================================================

bool Database::createTables() {
    std::string sql = R"(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'Student',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS quizzes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            subject_id INTEGER NOT NULL,
            category TEXT,
            icon TEXT,
            question_count INTEGER DEFAULT 20,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    )";
    return exec(sql);
}

// ============================================================
// Users
// ============================================================

bool Database::getUserById(int id, Player& out) {
    std::string sql = "SELECT id, name, email FROM users WHERE id=" + std::to_string(id) + ";";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return false;
    bool found = false;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        out.id = sqlite3_column_int(stmt, 0);
        out.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        out.email = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        found = true;
    }
    sqlite3_finalize(stmt);
    return found;
}

bool Database::getUserByEmail(const std::string& email, std::string& outHash, int& outId, std::string& outName) {
    std::string sql = "SELECT id, name, password_hash FROM users WHERE email='" + email + "';";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return false;
    bool found = false;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        outId = sqlite3_column_int(stmt, 0);
        outName = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        outHash = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        found = true;
    }
    sqlite3_finalize(stmt);
    return found;
}

// ============================================================
// Questions
// ============================================================

std::vector<Question> Database::getQuestionsForSubject(int subjectId, int count) {
    std::vector<Question> result;
    std::string sql = "SELECT id, subject_id, chapter_id, qid, text, "
                      "option_a, option_b, option_c, option_d, correct_index, difficulty, explanation "
                      "FROM questions WHERE subject_id=" + std::to_string(subjectId) +
                      " ORDER BY RANDOM() LIMIT " + std::to_string(count) + ";";

    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return result;

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Question q;
        q.id = sqlite3_column_int(stmt, 0);
        q.subjectId = sqlite3_column_int(stmt, 1);
        q.chapterId = sqlite3_column_int(stmt, 2);
        q.text = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        q.options[0] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
        q.options[1] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        q.options[2] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
        q.options[3] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8));
        q.correctIndex = sqlite3_column_int(stmt, 9);
        q.difficulty = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 10));
        result.push_back(q);
    }
    sqlite3_finalize(stmt);
    return result;
}

bool Database::getQuestionById(int id, Question& out) {
    std::string sql = "SELECT id, subject_id, chapter_id, text, "
                      "option_a, option_b, option_c, option_d, correct_index "
                      "FROM questions WHERE id=" + std::to_string(id) + ";";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return false;
    bool found = false;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        out.id = sqlite3_column_int(stmt, 0);
        out.subjectId = sqlite3_column_int(stmt, 1);
        out.chapterId = sqlite3_column_int(stmt, 2);
        out.text = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        out.options[0] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        out.options[1] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
        out.options[2] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        out.options[3] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
        out.correctIndex = sqlite3_column_int(stmt, 8);
        found = true;
    }
    sqlite3_finalize(stmt);
    return found;
}

// ============================================================
// Battle Rooms
// ============================================================

int Database::createBattleRoom(const std::string& roomCode, int subjectId, int totalQ, int timeLimit) {
    std::string sql = "INSERT INTO battle_rooms (room_code, subject_id, total_questions, time_limit, state) "
                      "VALUES ('" + roomCode + "', " + std::to_string(subjectId) + ", " +
                      std::to_string(totalQ) + ", " + std::to_string(timeLimit) + ", 0);";
    int id = -1;
    execWithId(sql, id);
    return id;
}

bool Database::updateBattleRoom(int battleId, int currentQ, int state) {
    std::string sql = "UPDATE battle_rooms SET current_question=" + std::to_string(currentQ) +
                      ", state=" + std::to_string(state) +
                      " WHERE battle_id=" + std::to_string(battleId) + ";";
    return exec(sql);
}

bool Database::getBattleRoom(int battleId, BattleRoom& out) {
    std::string sql = "SELECT battle_id, room_code, subject_id, total_questions, "
                      "time_limit, current_question, state "
                      "FROM battle_rooms WHERE battle_id=" + std::to_string(battleId) + ";";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return false;
    bool found = false;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        out.battleId = sqlite3_column_int(stmt, 0);
        out.roomCode = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        out.subjectId = sqlite3_column_int(stmt, 2);
        out.totalQuestions = sqlite3_column_int(stmt, 3);
        out.timeLimit = sqlite3_column_int(stmt, 4);
        out.currentQuestion = sqlite3_column_int(stmt, 5);
        out.state = static_cast<BattleState>(sqlite3_column_int(stmt, 6));
        found = true;
    }
    sqlite3_finalize(stmt);
    return found;
}

bool Database::getBattleRoomByCode(const std::string& code, BattleRoom& out) {
    std::string sql = "SELECT battle_id, room_code, subject_id, total_questions, "
                      "time_limit, current_question, state "
                      "FROM battle_rooms WHERE room_code='" + code + "';";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return false;
    bool found = false;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        out.battleId = sqlite3_column_int(stmt, 0);
        out.roomCode = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        out.subjectId = sqlite3_column_int(stmt, 2);
        out.totalQuestions = sqlite3_column_int(stmt, 3);
        out.timeLimit = sqlite3_column_int(stmt, 4);
        out.currentQuestion = sqlite3_column_int(stmt, 5);
        out.state = static_cast<BattleState>(sqlite3_column_int(stmt, 6));
        found = true;
    }
    sqlite3_finalize(stmt);
    return found;
}

// ============================================================
// Battle Players
// ============================================================

bool Database::addPlayerToBattle(int battleId, int playerId, int score, int ready) {
    std::string sql = "INSERT INTO battle_players (battle_id, player_id, score, ready) VALUES (" +
                      std::to_string(battleId) + ", " + std::to_string(playerId) + ", " +
                      std::to_string(score) + ", " + std::to_string(ready) + ");";
    return exec(sql);
}

bool Database::updatePlayerScore(int battleId, int playerId, int score) {
    std::string sql = "UPDATE battle_players SET score=" + std::to_string(score) +
                      " WHERE battle_id=" + std::to_string(battleId) +
                      " AND player_id=" + std::to_string(playerId) + ";";
    return exec(sql);
}

bool Database::updatePlayerReady(int battleId, int playerId, int ready) {
    std::string sql = "UPDATE battle_players SET ready=" + std::to_string(ready) +
                      " WHERE battle_id=" + std::to_string(battleId) +
                      " AND player_id=" + std::to_string(playerId) + ";";
    return exec(sql);
}

// ============================================================
// Battle Answers
// ============================================================

bool Database::insertAnswer(int battleId, int questionId, int playerId, int answer,
                             bool isCorrect, long long submittedAt) {
    std::string sql = "INSERT INTO battle_answers (battle_id, question_id, player_id, answer, is_correct, submitted_at) "
                      "VALUES (" + std::to_string(battleId) + ", " + std::to_string(questionId) + ", " +
                      std::to_string(playerId) + ", " + std::to_string(answer) + ", " +
                      (isCorrect ? "1" : "0") + ", " + std::to_string(submittedAt) + ");";
    return exec(sql);
}

// ============================================================
// Battle Results
// ============================================================

bool Database::insertBattleResult(int battleId, int winnerId, int p1Id, int p2Id,
                                   int p1Score, int p2Score) {
    std::string sql = "INSERT INTO battle_results (battle_id, winner_id, player1_id, player2_id, "
                      "player1_score, player2_score) VALUES (" +
                      std::to_string(battleId) + ", " + std::to_string(winnerId) + ", " +
                      std::to_string(p1Id) + ", " + std::to_string(p2Id) + ", " +
                      std::to_string(p1Score) + ", " + std::to_string(p2Score) + ");";
    return exec(sql);
}

std::vector<BattleResult> Database::getBattleHistory(int playerId, int limit) {
    std::vector<BattleResult> results;
    std::string sql = "SELECT result_id, battle_id, winner_id, player1_id, player2_id, "
                      "player1_score, player2_score, completed_at "
                      "FROM battle_results WHERE player1_id=" + std::to_string(playerId) +
                      " OR player2_id=" + std::to_string(playerId) +
                      " ORDER BY completed_at DESC LIMIT " + std::to_string(limit) + ";";

    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return results;

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        BattleResult r;
        r.resultId = sqlite3_column_int(stmt, 0);
        r.battleId = sqlite3_column_int(stmt, 1);
        r.winnerId = sqlite3_column_int(stmt, 2);
        r.player1Id = sqlite3_column_int(stmt, 3);
        r.player2Id = sqlite3_column_int(stmt, 4);
        r.player1Score = sqlite3_column_int(stmt, 5);
        r.player2Score = sqlite3_column_int(stmt, 6);
        r.completedAt = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
        results.push_back(r);
    }
    sqlite3_finalize(stmt);
    return results;
}

// ============================================================
// Leaderboard
// ============================================================

std::vector<LeaderboardEntry> Database::getLeaderboard(int limit) {
    std::vector<LeaderboardEntry> entries;
    std::string sql = "SELECT player_id, player_name, wins, losses, draws, "
                      "total_points, total_battles FROM leaderboard "
                      "ORDER BY wins DESC, total_points DESC LIMIT " + std::to_string(limit) + ";";

    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return entries;

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        LeaderboardEntry e;
        e.playerId = sqlite3_column_int(stmt, 0);
        e.playerName = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        e.wins = sqlite3_column_int(stmt, 2);
        e.losses = sqlite3_column_int(stmt, 3);
        e.draws = sqlite3_column_int(stmt, 4);
        e.totalPoints = sqlite3_column_int(stmt, 5);
        e.totalBattles = sqlite3_column_int(stmt, 6);
        e.winRate = e.totalBattles > 0 ? (double)e.wins / e.totalBattles * 100.0 : 0.0;
        entries.push_back(e);
    }
    sqlite3_finalize(stmt);
    return entries;
}

bool Database::updateLeaderboard(int playerId, int result) {
    // First try to get existing entry
    std::string checkSql = "SELECT player_id FROM leaderboard WHERE player_id=" + std::to_string(playerId) + ";";
    sqlite3_stmt* stmt;
    bool exists = false;
    if (sqlite3_prepare_v2(db, checkSql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
        exists = (sqlite3_step(stmt) == SQLITE_ROW);
        sqlite3_finalize(stmt);
    }

    std::string sql;
    if (!exists) {
        sql = "INSERT INTO leaderboard (player_id, wins, losses, draws, total_points, total_battles) VALUES (" +
              std::to_string(playerId) + ", " +
              (result == 1 ? "1" : "0") + ", " +
              (result == 0 ? "1" : "0") + ", " +
              (result == -1 ? "1" : "0") + ", 1, 1);";
    } else {
        sql = "UPDATE leaderboard SET " +
              (result == 1 ? "wins=wins+1" : result == 0 ? "losses=losses+1" : "draws=draws+1") +
              ", total_points=total_points+1, total_battles=total_battles+1 " +
              "WHERE player_id=" + std::to_string(playerId) + ";";
    }
    return exec(sql);
}

} // namespace quizflow
