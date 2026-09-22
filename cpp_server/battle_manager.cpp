#include "battle_manager.h"
#include <algorithm>
#include <chrono>
#include <random>
#include <sstream>
#include <thread>

namespace quizflow {

// ============================================================
// Constructor
// ============================================================

BattleManager::BattleManager(Database& db, SendFn sendFn)
    : db(db), sendTo(sendFn) {}

// ============================================================
// Helpers
// ============================================================

std::string BattleManager::generateRoomCode() {
    static const char chars[] = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 31);
    std::string code = "QF-";
    for (int i = 0; i < 4; i++) code += chars[dis(gen)];
    return code;
}

std::string BattleManager::escapeJson(const std::string& s) {
    std::string out;
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': break;
            default:   out += c;
        }
    }
    return out;
}

std::string BattleManager::buildJson(const std::map<std::string, std::string>& fields) {
    std::string json = "{";
    bool first = true;
    for (auto& [k, v] : fields) {
        if (!first) json += ",";
        json += "\"" + k + "\":" + v;
        first = false;
    }
    json += "}";
    return json;
}

long long BattleManager::nowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
}

void BattleManager::sendToPlayer(int playerId, const std::string& json) {
    auto it = battles.find(playerBattleMap[playerId]);
    if (it == battles.end()) return;
    Player& p = it->second->getPlayer(playerId);
    if (p.wsFd >= 0) sendTo(p.wsFd, json);
}

void BattleManager::sendToBoth(BattleRoom& room, const std::string& json) {
    if (room.player1.wsFd >= 0) sendTo(room.player1.wsFd, json);
    if (room.player2.wsFd >= 0) sendTo(room.player2.wsFd, json);
}

// ============================================================
// Quick Match
// ============================================================

void BattleManager::quickMatch(int playerId, const std::string& name, int subjectId, int wsFd) {
    std::lock_guard<std::mutex> lock(mutex);

    // Already in a battle?
    if (playerBattleMap.count(playerId)) return;

    // Add to queue
    matchQueue.push_back({playerId, name, subjectId, wsFd});

    // Look for a match (same subject)
    for (int i = 0; i < (int)matchQueue.size(); i++) {
        auto& entry = matchQueue[i];
        if (entry.playerId != playerId && entry.subjectId == subjectId) {
            // Match found! Create battle
            QueueEntry opponent = entry;
            matchQueue.erase(matchQueue.begin() + i);

            // Remove both from queue (conceptually)
            for (int j = (int)matchQueue.size() - 1; j >= 0; j--) {
                if (matchQueue[j].playerId == playerId) {
                    matchQueue.erase(matchQueue.begin() + j);
                    break;
                }
            }

            // Create battle room
            std::string code = generateRoomCode();
            int battleId = db.createBattleRoom(code, subjectId, 10, 30);

            auto room = std::make_shared<BattleRoom>();
            room->battleId = battleId;
            room->roomCode = code;
            room->subjectId = subjectId;
            room->totalQuestions = 10;
            room->timeLimit = 30;
            room->currentQuestion = 0;
            room->state = BattleState::READY;

            room->player1.id = playerId;
            room->player1.name = name;
            room->player1.wsFd = wsFd;
            room->player2.id = opponent.playerId;
            room->player2.name = opponent.name;
            room->player2.wsFd = opponent.wsFd;

            // Load questions from database
            room->questions = db.getQuestionsForSubject(subjectId, 10);

            // Load subject name
            if (room->questions.size() > 0) {
                // Default subject names
                std::map<int, std::string> subNames = {
                    {1, "Digital Techniques & Microprocessors"},
                    {2, "Data Structures Using C"},
                    {3, "Object Oriented Programming using C++"},
                    {4, "Applied Mathematics - III"},
                    {5, "Employability & Communication Skills - III"}
                };
                auto it = subNames.find(subjectId);
                room->subjectName = it != subNames.end() ? it->second : "Quiz Battle";
            }

            db.addPlayerToBattle(battleId, playerId, 0, 0);
            db.addPlayerToBattle(battleId, opponent.playerId, 0, 0);

            battles[battleId] = room;
            playerBattleMap[playerId] = battleId;
            playerBattleMap[opponent.playerId] = battleId;
            roomCodeMap[code] = battleId;

            // Notify both players
            std::string myName = name;
            std::string oppName = opponent.name;
            std::string subject = room->subjectName;

            std::string msg1 = buildJson({
                {"type", "\"MATCH_FOUND\""},
                {"opponentName", "\"" + escapeJson(oppName) + "\""},
                {"subjectName", "\"" + escapeJson(subject) + "\""}
            });
            std::string msg2 = buildJson({
                {"type", "\"MATCH_FOUND\""},
                {"opponentName", "\"" + escapeJson(myName) + "\""},
                {"subjectName", "\"" + escapeJson(subject) + "\""}
            });
            sendTo(wsFd, msg1);
            sendTo(opponent.wsFd, msg2);

            return;
        }
    }

    // No match found — wait
}

void BattleManager::cancelSearch(int playerId) {
    std::lock_guard<std::mutex> lock(mutex);
    matchQueue.erase(
        std::remove_if(matchQueue.begin(), matchQueue.end(),
            [playerId](const QueueEntry& e) { return e.playerId == playerId; }),
        matchQueue.end()
    );
}

// ============================================================
// Room Management
// ============================================================

int BattleManager::createRoom(int playerId, const std::string& name, int subjectId, int wsFd) {
    std::lock_guard<std::mutex> lock(mutex);

    std::string code = generateRoomCode();
    int battleId = db.createBattleRoom(code, subjectId, 10, 30);

    auto room = std::make_shared<BattleRoom>();
    room->battleId = battleId;
    room->roomCode = code;
    room->subjectId = subjectId;
    room->totalQuestions = 10;
    room->timeLimit = 30;
    room->state = BattleState::WAITING;
    room->player1.id = playerId;
    room->player1.name = name;
    room->player1.wsFd = wsFd;

    // Load questions
    room->questions = db.getQuestionsForSubject(subjectId, 10);

    std::map<int, std::string> subNames = {
        {1, "Digital Techniques & Microprocessors"},
        {2, "Data Structures Using C"},
        {3, "Object Oriented Programming using C++"},
        {4, "Applied Mathematics - III"},
        {5, "Employability & Communication Skills - III"}
    };
    auto it = subNames.find(subjectId);
    room->subjectName = it != subNames.end() ? it->second : "Quiz Battle";

    db.addPlayerToBattle(battleId, playerId, 0, 0);

    battles[battleId] = room;
    playerBattleMap[playerId] = battleId;
    roomCodeMap[code] = battleId;

    sendTo(wsFd, buildJson({
        {"type", "\"ROOM_CREATED\""},
        {"roomCode", "\"" + code + "\""}
    }));

    return battleId;
}

int BattleManager::joinRoom(int playerId, const std::string& name, const std::string& roomCode, int wsFd) {
    std::lock_guard<std::mutex> lock(mutex);

    auto it = roomCodeMap.find(roomCode);
    if (it == roomCodeMap.end()) {
        sendTo(wsFd, buildJson({{"type", "\"ERROR\""}, {"message", "\"Room not found.\""}}));
        return -1;
    }

    int battleId = it->second;
    auto room = battles[battleId];

    if (room->player2.id != 0) {
        sendTo(wsFd, buildJson({{"type", "\"ERROR\""}, {"message", "\"Room is full.\""}}));
        return -1;
    }

    room->player2.id = playerId;
    room->player2.name = name;
    room->player2.wsFd = wsFd;
    room->state = BattleState::READY;

    db.addPlayerToBattle(battleId, playerId, 0, 0);
    playerBattleMap[playerId] = battleId;

    // Notify both
    sendTo(room->player1.wsFd, buildJson({
        {"type", "\"OPPONENT_JOINED\""},
        {"opponentName", "\"" + escapeJson(name) + "\""}
    }));
    sendTo(wsFd, buildJson({
        {"type", "\"OPPONENT_JOINED\""},
        {"opponentName", "\"" + escapeJson(room->player1.name) + "\""},
        {"roomCode", "\"" + roomCode + "\""}
    }));

    return battleId;
}

// ============================================================
// Player Ready
// ============================================================

void BattleManager::playerReady(int playerId) {
    std::lock_guard<std::mutex> lock(mutex);

    auto it = playerBattleMap.find(playerId);
    if (it == playerBattleMap.end()) return;

    auto room = battles[it->second];
    Player& p = room->getPlayer(playerId);
    p.ready = 1;
    db.updatePlayerReady(room->battleId, playerId, 1);

    // Notify opponent
    int oppId = room->getOpponent(playerId).id;
    sendToPlayer(oppId, buildJson({
        {"type", "\"PLAYER_READY\""},
        {"playerId", std::to_string(playerId)}
    }));

    // Both ready? Start battle
    if (room->player1.ready && room->player2.ready) {
        room->state = BattleState::STARTING;
        room->currentQuestion = 0;

        // Send battle info to both
        std::string info = buildJson({
            {"type", "\"BATTLE_INFO\""},
            {"totalQuestions", std::to_string(room->totalQuestions)},
            {"timeLimit", std::to_string(room->timeLimit)},
            {"subjectName", "\"" + escapeJson(room->subjectName) + "\""},
            {"countdown", "3"}
        });
        sendToPlayer(room->player1.id, info +
            ",\"opponentName\":\"" + escapeJson(room->player2.name) + "\"}");
        sendToPlayer(room->player2.id, info +
            ",\"opponentName\":\"" + escapeJson(room->player1.name) + "\"}");

        // After countdown, send first question
        room->state = BattleState::QUESTION_ACTIVE;
        room->currentQuestion = 0;
        room->questionStartTime = nowMs() + 3000; // +3s for countdown

        // Send question after 3s delay
        std::thread([this, battleId = room->battleId]() {
            std::this_thread::sleep_for(std::chrono::seconds(3));
            std::lock_guard<std::mutex> l(mutex);
            auto r = battles.find(battleId);
            if (r == battles.end()) return;
            if (r->second->state == BattleState::QUESTION_ACTIVE ||
                r->second->state == BattleState::STARTING) {
                r->second->questionStartTime = nowMs();
                sendQuestion(*r->second);
            }
        }).detach();
    }
}

// ============================================================
// Send Question
// ============================================================

void sendQuestion(BattleRoom& room) {
    if (room.currentQuestion >= (int)room.questions.size()) return;

    Question& q = room.questions[room.currentQuestion];

    std::string qJson = buildJson({
        {"type", "\"NEW_QUESTION\""},
        {"questionIndex", std::to_string(room.currentQuestion + 1)},
        {"question", "\"" + q.text + "\""},
        {"options", "[\"" + q.options[0] + "\",\"" + q.options[1] + "\",\"" +
                    q.options[2] + "\",\"" + q.options[3] + "\"]"},
        {"timeLimit", std::to_string(room.timeLimit)}
    });

    // Send to both players
    if (room.player1.wsFd >= 0)
        sendTo(room.player1.wsFd, qJson);
    if (room.player2.wsFd >= 0)
        sendTo(room.player2.wsFd, qJson);

    room.player1.resetForQuestion();
    room.player2.resetForQuestion();
    room.lastScorerId = -1;
}

// ============================================================
// Submit Answer (server-authoritative)
// ============================================================

void BattleManager::submitAnswer(int playerId, int questionIndex, int answer, long long clientTimestamp) {
    std::lock_guard<std::mutex> lock(mutex);

    auto it = playerBattleMap.find(playerId);
    if (it == playerBattleMap.end()) return;

    auto room = battles[it->second];

    // Validate question index
    int qi = room->currentQuestion;
    if (questionIndex - 1 != qi) return; // wrong question

    // Validate not already answered
    Player& p = room->getPlayer(playerId);
    if (p.hasAnswered) return;

    // Record answer with SERVER timestamp
    long long serverTimestamp = nowMs();
    p.currentAnswer = answer;
    p.answerTimestamp = serverTimestamp;
    p.hasAnswered = true;

    // Check correctness
    Question& q = room->questions[qi];
    bool isCorrect = (answer == q.correctIndex);

    // Store in database
    db.insertAnswer(room->battleId, q.id, playerId, answer, isCorrect, serverTimestamp);

    // Check if this is the first correct answer
    bool firstCorrect = false;
    if (isCorrect) {
        if (room->lastScorerId == -1) {
            // First correct answer on this question
            room->lastScorerId = playerId;
            p.score++;
            firstCorrect = true;

            if (playerId == room->player1.id) {
                room->p1CorrectCount++;
                double elapsed = (serverTimestamp - room->questionStartTime) / 1000.0;
                if (elapsed < room->p1FastestCorrect) room->p1FastestCorrect = elapsed;
            } else {
                room->p2CorrectCount++;
                double elapsed = (serverTimestamp - room->questionStartTime) / 1000.0;
                if (elapsed < room->p2FastestCorrect) room->p2FastestCorrect = elapsed;
            }
        }
        // Second player answered correctly but not first — no point
    }

    db.updatePlayerScore(room->battleId, playerId, p.score);

    // Send answer result to the answering player
    std::string resultJson = buildJson({
        {"type", "\"ANSWER_RESULT\""},
        {"correct", isCorrect ? "true" : "false"},
        {"firstCorrect", firstCorrect ? "true" : "false"},
        {"myAnswer", std::to_string(answer)},
        {"correctIndex", std::to_string(q.correctIndex)}
    });
    sendToPlayer(playerId, resultJson);

    // Notify opponent
    int oppId = room->getOpponent(playerId).id;
    sendToPlayer(oppId, buildJson({
        {"type", "\"OPPONENT_ANSWERED\""},
        {"correct", isCorrect ? "true" : "false"}
    }));

    // Score update
    std::string scoreJson = buildJson({
        {"type", "\"SCORE_UPDATE\""},
        {"myScore", std::to_string(room->player1.score)},
        {"oppScore", std::to_string(room->player2.score)},
        {"lastScorer", std::to_string(room->lastScorerId)}
    });

    // Send score to both (with correct perspective)
    std::string score1 = scoreJson;
    // Both players see the same scores

    // If both players answered, end question
    if (room->player1.hasAnswered && room->player2.hasAnswered) {
        room->state = BattleState::QUESTION_FINISHED;
        sendToBoth(*room, scoreJson);
        // Move to next question after brief delay
        std::thread([this, battleId = room->battleId]() {
            std::this_thread::sleep_for(std::chrono::milliseconds(1500));
            std::lock_guard<std::mutex> l(mutex);
            auto r = battles.find(battleId);
            if (r == battles.end()) return;
            advanceQuestion(*r->second);
        }).detach();
    } else {
        sendToBoth(*room, scoreJson);
    }
}

// ============================================================
// Question Timeout
// ============================================================

void BattleManager::onQuestionTimeout(int battleId) {
    std::lock_guard<std::mutex> lock(mutex);

    auto it = battles.find(battleId);
    if (it == battles.end()) return;
    auto room = it->second;

    if (room->state != BattleState::QUESTION_ACTIVE) return;

    room->state = BattleState::QUESTION_FINISHED;
    Question& q = room->questions[room->currentQuestion];

    // Notify players
    std::string timeoutJson = buildJson({
        {"type", "\"QUESTION_TIMEOUT\""},
        {"correctIndex", std::to_string(q.correctIndex)}
    });
    sendToBoth(*room, timeoutJson);

    // Advance after delay
    std::thread([this, bid = battleId]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(1500));
        std::lock_guard<std::mutex> l(mutex);
        auto r = battles.find(bid);
        if (r == battles.end()) return;
        advanceQuestion(*r->second);
    }).detach();
}

// ============================================================
// Advance to next question or finish
// ============================================================

void advanceQuestion(BattleRoom& room) {
    room.currentQuestion++;

    if (room.currentQuestion >= room.totalQuestions) {
        // Battle finished
        room.state = BattleState::COMPLETED;

        int winnerId = 0;
        if (room.player1.score > room.player2.score) {
            winnerId = room.player1.id;
        } else if (room.player2.score > room.player1.score) {
            winnerId = room.player2.id;
        }
        // 0 = draw

        // Determine winner string for frontend
        std::string winnerStr;
        if (winnerId == 0) winnerStr = "\"draw\"";
        else winnerStr = std::to_string(winnerId);

        int correctCount1 = room.p1CorrectCount;
        int correctCount2 = room.p2CorrectCount;
        double fastest = room.p1FastestCorrect < room.p2FastestCorrect ?
                         room.p1FastestCorrect : room.p2FastestCorrect;

        std::string finishJson = buildJson({
            {"type", "\"BATTLE_FINISHED\""},
            {"winner", winnerStr},
            {"myScore", std::to_string(room.player1.score)},
            {"oppScore", std::to_string(room.player2.score)},
            {"totalQuestions", std::to_string(room.totalQuestions)},
            {"correctCount", std::to_string(correctCount1)},
            {"fastestCorrect", std::to_string(fastest)}
        });

        // Send to player1
        if (room.player1.wsFd >= 0)
            sendTo(room.player1.wsFd, finishJson);

        // Send to player2 with swapped scores
        std::string finishJson2 = buildJson({
            {"type", "\"BATTLE_FINISHED\""},
            {"winner", winnerStr},
            {"myScore", std::to_string(room.player2.score)},
            {"oppScore", std::to_string(room.player1.score)},
            {"totalQuestions", std::to_string(room.totalQuestions)},
            {"correctCount", std::to_string(correctCount2)},
            {"fastestCorrect", std::to_string(room.p2FastestCorrect)}
        });
        if (room.player2.wsFd >= 0)
            sendTo(room.player2.wsFd, finishJson2);

        // Save to database
        db.insertBattleResult(room.battleId, winnerId,
                              room.player1.id, room.player2.id,
                              room.player1.score, room.player2.score);

        // Update leaderboard
        int result1 = winnerId == room.player1.id ? 1 : winnerId == 0 ? -1 : 0;
        int result2 = winnerId == room.player2.id ? 1 : winnerId == 0 ? -1 : 0;
        db.updateLeaderboard(room.player1.id, result1);
        db.updateLeaderboard(room.player2.id, result2);

        return;
    }

    room.state = BattleState::QUESTION_ACTIVE;
    room.questionStartTime = nowMs();
    room.lastScorerId = -1;
    room.player1.resetForQuestion();
    room.player2.resetForQuestion();

    sendQuestion(room);
}

// ============================================================
// Disconnect handling
// ============================================================

void BattleManager::handleDisconnect(int playerId) {
    std::lock_guard<std::mutex> lock(mutex);
    auto it = playerBattleMap.find(playerId);
    if (it == playerBattleMap.end()) return;

    auto room = battles[it->second];
    Player& p = room->getPlayer(playerId);
    p.wsFd = -1;
    p.state = PlayerState::DISCONNECTED;

    int oppId = room->getOpponent(playerId).id;
    sendToPlayer(oppId, buildJson({{"type", "\"OPPONENT_DISCONNECTED\""}}));
}

void BattleManager::handleReconnect(int playerId, int wsFd) {
    std::lock_guard<std::mutex> lock(mutex);
    auto it = playerBattleMap.find(playerId);
    if (it == playerBattleMap.end()) return;

    auto room = battles[it->second];
    Player& p = room->getPlayer(playerId);
    p.wsFd = wsFd;
    p.state = PlayerState::CONNECTED;

    int oppId = room->getOpponent(playerId).id;
    sendToPlayer(oppId, buildJson({{"type", "\"OPPONENT_RECONNECTED\""}}));
}

// ============================================================
// Claim Victory
// ============================================================

void BattleManager::claimVictory(int playerId) {
    std::lock_guard<std::mutex> lock(mutex);
    auto it = playerBattleMap.find(playerId);
    if (it == playerBattleMap.end()) return;

    auto room = battles[it->second];
    room->state = BattleState::COMPLETED;
    room->player1.score = room->player1.id == playerId ? room->player1.score : 0;
    room->player2.score = room->player2.id == playerId ? room->player2.score : 0;

    std::string winnerStr = std::to_string(playerId);
    std::string finishJson = buildJson({
        {"type", "\"BATTLE_FINISHED\""},
        {"winner", winnerStr},
        {"myScore", std::to_string(playerId == room->player1.id ? room->player1.score : room->player2.score)},
        {"oppScore", std::to_string(playerId == room->player1.id ? room->player2.score : room->player1.score)},
        {"totalQuestions", std::to_string(room->totalQuestions)},
        {"correctCount", std::to_string(playerId == room->player1.id ? room->p1CorrectCount : room->p2CorrectCount)},
        {"fastestCorrect", std::to_string(playerId == room->player1.id ? room->p1FastestCorrect : room->p2FastestCorrect)}
    });
    sendToBoth(*room, finishJson);

    db.insertBattleResult(room->battleId, playerId,
                          room->player1.id, room->player2.id,
                          room->player1.score, room->player2.score);
}

// ============================================================
// Rematch
// ============================================================

void BattleManager::rematch(int playerId) {
    std::lock_guard<std::mutex> lock(mutex);
    // Remove from current battle
    auto it = playerBattleMap.find(playerId);
    if (it != playerBattleMap.end()) {
        int battleId = it->second;
        playerBattleMap.erase(it);
        battles.erase(battleId);
    }
}

// ============================================================
// Getters
// ============================================================

std::shared_ptr<BattleRoom> BattleManager::getBattle(int battleId) {
    std::lock_guard<std::mutex> lock(mutex);
    auto it = battles.find(battleId);
    return it != battles.end() ? it->second : nullptr;
}

std::shared_ptr<BattleRoom> BattleManager::getBattleForPlayer(int playerId) {
    std::lock_guard<std::mutex> lock(mutex);
    auto it = playerBattleMap.find(playerId);
    if (it == playerBattleMap.end()) return nullptr;
    auto bit = battles.find(it->second);
    return bit != battles.end() ? bit->second : nullptr;
}

} // namespace quizflow
