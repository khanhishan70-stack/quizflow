#ifndef QUIZFLOW_MODELS_H
#define QUIZFLOW_MODELS_H

#include <string>
#include <vector>
#include <chrono>
#include <optional>

namespace quizflow {

// ============================================================
// Enums
// ============================================================

enum class BattleState {
    WAITING,
    READY,
    STARTING,
    QUESTION_ACTIVE,
    QUESTION_FINISHED,
    NEXT_QUESTION,
    COMPLETED,
    CANCELLED
};

enum class PlayerState {
    DISCONNECTED,
    CONNECTED,
    READY,
    ANSWERED_CORRECT,
    ANSWERED_WRONG,
    TIMEOUT
};

// ============================================================
// User / Player
// ============================================================

struct Player {
    int id = 0;
    std::string name;
    std::string email;
    int score = 0;
    int ready = 0;           // 0 = not ready, 1 = ready
    PlayerState state = PlayerState::CONNECTED;
    int wsFd = -1;           // WebSocket file descriptor

    // Current question answer
    int currentAnswer = -1;
    long long answerTimestamp = 0;  // ms since epoch
    bool hasAnswered = false;

    void resetForQuestion() {
        currentAnswer = -1;
        answerTimestamp = 0;
        hasAnswered = false;
    }
};

// ============================================================
// Question
// ============================================================

struct Question {
    int id = 0;
    int subjectId = 0;
    int chapterId = 0;
    std::string text;
    std::string options[4];
    int correctIndex = 0;
    std::string difficulty;
    std::string explanation;
};

// ============================================================
// Battle Room
// ============================================================

struct BattleRoom {
    int battleId = 0;
    std::string roomCode;
    int subjectId = 0;
    int totalQuestions = 10;
    int timeLimit = 30;       // seconds per question
    int currentQuestion = 0;  // 0-indexed
    BattleState state = BattleState::WAITING;
    std::string subjectName;

    Player player1;
    Player player2;

    std::vector<Question> questions;

    // Question timestamps (server authoritative)
    long long questionStartTime = 0;

    // Stats per player per battle
    int p1CorrectCount = 0;
    int p2CorrectCount = 0;
    double p1FastestCorrect = 999.0;
    double p2FastestCorrect = 999.0;

    // Who scored on current question (-1 = nobody)
    int lastScorerId = -1;

    bool hasPlayer(int playerId) const {
        return player1.id == playerId || player2.id == playerId;
    }

    Player& getPlayer(int playerId) {
        if (player1.id == playerId) return player1;
        return player2;
    }

    const Player& getOpponent(int playerId) const {
        if (player1.id == playerId) return player2;
        return player1;
    }

    int getOpponentFd(int playerId) const {
        if (player1.id == playerId) return player2.wsFd;
        return player1.wsFd;
    }
};

// ============================================================
// Battle History Record (for database)
// ============================================================

struct BattleResult {
    int resultId = 0;
    int battleId = 0;
    int winnerId = 0;        // 0 = draw
    int player1Id = 0;
    int player2Id = 0;
    int player1Score = 0;
    int player2Score = 0;
    std::string completedAt;
};

struct LeaderboardEntry {
    int playerId = 0;
    std::string playerName;
    int wins = 0;
    int losses = 0;
    int draws = 0;
    int totalPoints = 0;
    int totalBattles = 0;
    double winRate = 0.0;
};

} // namespace quizflow

#endif // QUIZFLOW_MODELS_H
