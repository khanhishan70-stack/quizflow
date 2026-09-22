#ifndef QUIZFLOW_BATTLE_MANAGER_H
#define QUIZFLOW_BATTLE_MANAGER_H

#include <map>
#include <memory>
#include <string>
#include <vector>
#include <mutex>
#include <functional>
#include "models.h"
#include "database.h"

namespace quizflow {

// ============================================================
// Callback to send WebSocket message to a player
// ============================================================

using SendFn = std::function<void(int wsFd, const std::string& json)>;

// ============================================================
// BattleManager — manages all active battle rooms
// ============================================================

class BattleManager {
private:
    Database& db;
    SendFn sendTo;
    std::mutex mutex;

    // Active battles: battleId -> BattleRoom
    std::map<int, std::shared_ptr<BattleRoom>> battles;

    // Player to battle mapping: playerId -> battleId
    std::map<int, int> playerBattleMap;

    // Matchmaking queue: playerId -> Player info
    struct QueueEntry {
        int playerId;
        std::string name;
        int subjectId;
        int wsFd;
    };
    std::vector<QueueEntry> matchQueue;

    // Room code -> battleId
    std::map<std::string, int> roomCodeMap;

    // Helpers
    std::string generateRoomCode();
    std::string buildJson(const std::map<std::string, std::string>& fields);
    std::string escapeJson(const std::string& s);
    long long nowMs();
    void sendToPlayer(int playerId, const std::string& json);
    void sendToBoth(BattleRoom& room, const std::string& json);

public:
    BattleManager(Database& db, SendFn sendFn);

    // ---- Matchmaking ----
    void quickMatch(int playerId, const std::string& name, int subjectId, int wsFd);
    void cancelSearch(int playerId);

    // ---- Room Management ----
    int createRoom(int playerId, const std::string& name, int subjectId, int wsFd);
    int joinRoom(int playerId, const std::string& name, const std::string& roomCode, int wsFd);

    // ---- Battle Flow ----
    void playerReady(int playerId);
    void submitAnswer(int playerId, int questionIndex, int answer, long long clientTimestamp);
    void handleDisconnect(int playerId);
    void handleReconnect(int playerId, int wsFd);
    void claimVictory(int playerId);
    void rematch(int playerId);

    // ---- Question Timer ----
    void startQuestionTimer(int battleId);
    void onQuestionTimeout(int battleId);

    // ---- Getters ----
    std::shared_ptr<BattleRoom> getBattle(int battleId);
    std::shared_ptr<BattleRoom> getBattleForPlayer(int playerId);
};

} // namespace quizflow

#endif // QUIZFLOW_BATTLE_MANAGER_H
