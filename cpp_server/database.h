#ifndef QUIZFLOW_DATABASE_H
#define QUIZFLOW_DATABASE_H

#include <string>
#include <vector>
#include <sqlite3.h>
#include "models.h"

namespace quizflow {

// ============================================================
// Database — SQLite wrapper for battle operations
// ============================================================

class Database {
private:
    sqlite3* db;
    bool exec(const std::string& sql);
    bool execWithId(const std::string& sql, int& outId);

public:
    Database();
    ~Database();

    bool open(const std::string& dbPath = "quizflow.db");
    void close();

    // ---- Schema ----
    bool createTables();

    // ---- Users ----
    bool getUserById(int id, Player& out);
    bool getUserByEmail(const std::string& email, std::string& outHash, int& outId, std::string& outName);

    // ---- Questions ----
    std::vector<Question> getQuestionsForSubject(int subjectId, int count);
    bool getQuestionById(int id, Question& out);

    // ---- Battle Rooms ----
    int createBattleRoom(const std::string& roomCode, int subjectId, int totalQ, int timeLimit);
    bool updateBattleRoom(int battleId, int currentQ, int state);
    bool getBattleRoom(int battleId, BattleRoom& out);
    bool getBattleRoomByCode(const std::string& code, BattleRoom& out);

    // ---- Battle Players ----
    bool addPlayerToBattle(int battleId, int playerId, int score, int ready);
    bool updatePlayerScore(int battleId, int playerId, int score);
    bool updatePlayerReady(int battleId, int playerId, int ready);

    // ---- Battle Answers ----
    bool insertAnswer(int battleId, int questionId, int playerId, int answer,
                       bool isCorrect, long long submittedAt);

    // ---- Battle Results ----
    bool insertBattleResult(int battleId, int winnerId, int p1Id, int p2Id,
                             int p1Score, int p2Score);
    std::vector<BattleResult> getBattleHistory(int playerId, int limit = 20);

    // ---- Leaderboard ----
    std::vector<LeaderboardEntry> getLeaderboard(int limit = 50);
    bool updateLeaderboard(int playerId, int result); // result: 1=win, 0=loss, -1=draw, points
};

} // namespace quizflow

#endif // QUIZFLOW_DATABASE_H
