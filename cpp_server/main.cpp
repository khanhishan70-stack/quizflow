/* ============================================================
   QuizFlow — C++ Battle Server
   Entry point. Handles WebSocket connections, routes messages
   to BattleManager for all game logic.
   
   Build: g++ -std=c++17 -pthread -lssl -lcrypto -lsqlite3 -o quizflow_server main.cpp
   Run:   ./quizflow_server
   ============================================================ */

#include <iostream>
#include <map>
#include <sstream>
#include <mutex>
#include "models.h"
#include "database.h"
#include "battle_manager.h"
#include "websocket_server.h"

// ---- fd -> playerId mapping ----
std::map<int, int> fdToPlayer;
std::map<int, int> playerToFd;
std::mutex fdMutex;

quizflow::WebSocketServer* wsServer = nullptr;
quizflow::BattleManager* battleMgr = nullptr;

// ============================================================
// Send function: route JSON to a WebSocket fd
// ============================================================

void sendToWs(int wsFd, const std::string& json) {
    if (wsServer) wsServer->send(wsFd, json);
}

// ============================================================
// Parse incoming JSON messages
// ============================================================

// Minimal JSON field extractor (no library dependency)
static std::string getField(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\"";
    size_t pos = json.find(search);
    if (pos == std::string::npos) return "";
    pos = json.find(':', pos + search.size());
    if (pos == std::string::npos) return "";
    pos++; // skip ':'

    // Skip whitespace
    while (pos < json.size() && json[pos] == ' ') pos++;

    if (json[pos] == '"') {
        pos++; // skip opening quote
        size_t end = json.find('"', pos);
        if (end == std::string::npos) return "";
        return json.substr(pos, end - pos);
    }

    // Number or boolean
    size_t end = pos;
    while (end < json.size() && json[end] != ',' && json[end] != '}' && json[end] != ' ')
        end++;
    return json.substr(pos, end - pos);
}

static int getInt(const std::string& json, const std::string& key, int def = 0) {
    std::string val = getField(json, key);
    if (val.empty()) return def;
    try { return std::stoi(val); } catch (...) { return def; }
}

static long long getLong(const std::string& json, const std::string& key, long long def = 0) {
    std::string val = getField(json, key);
    if (val.empty()) return def;
    try { return std::stoll(val); } catch (...) { return def; }
}

// ============================================================
// Handle incoming WebSocket message
// ============================================================

void handleMessage(int fd, const std::string& data) {
    std::string type = getField(data, "type");

    if (type == "JOIN_BATTLE") {
        int playerId = getInt(data, "playerId");
        std::string name = getField(data, "name");
        int battleId = getInt(data, "battleId");

        {
            std::lock_guard<std::mutex> lock(fdMutex);
            fdToPlayer[fd] = playerId;
            playerToFd[playerId] = fd;
        }

        // Reconnect to existing battle
        auto room = battleMgr->getBattleForPlayer(playerId);
        if (!room) {
            // Try reconnect
            battleMgr->handleReconnect(playerId, fd);
        }

    } else if (type == "QUICK_MATCH") {
        int playerId = getInt(data, "playerId");
        std::string name = getField(data, "name");
        int subjectId = getInt(data, "subjectId");

        {
            std::lock_guard<std::mutex> lock(fdMutex);
            fdToPlayer[fd] = playerId;
            playerToFd[playerId] = fd;
        }

        battleMgr->quickMatch(playerId, name, subjectId, fd);

    } else if (type == "CANCEL_SEARCH") {
        int playerId = getInt(data, "playerId");
        battleMgr->cancelSearch(playerId);

    } else if (type == "CREATE_ROOM") {
        int playerId = getInt(data, "playerId");
        std::string name = getField(data, "name");
        int subjectId = getInt(data, "subjectId");

        {
            std::lock_guard<std::mutex> lock(fdMutex);
            fdToPlayer[fd] = playerId;
            playerToFd[playerId] = fd;
        }

        battleMgr->createRoom(playerId, name, subjectId, fd);

    } else if (type == "JOIN_ROOM") {
        int playerId = getInt(data, "playerId");
        std::string name = getField(data, "name");
        std::string roomCode = getField(data, "roomCode");

        {
            std::lock_guard<std::mutex> lock(fdMutex);
            fdToPlayer[fd] = playerId;
            playerToFd[playerId] = fd;
        }

        battleMgr->joinRoom(playerId, name, roomCode, fd);

    } else if (type == "PLAYER_READY") {
        int playerId = getInt(data, "playerId");
        battleMgr->playerReady(playerId);

    } else if (type == "SUBMIT_ANSWER") {
        int playerId = getInt(data, "playerId");
        int questionIndex = getInt(data, "questionIndex");
        int answer = getInt(data, "answer");
        long long clientTimestamp = getLong(data, "clientTimestamp");

        battleMgr->submitAnswer(playerId, questionIndex, answer, clientTimestamp);

    } else if (type == "CLAIM_VICTORY") {
        int playerId = getInt(data, "playerId");
        battleMgr->claimVictory(playerId);

    } else if (type == "REMATCH") {
        int playerId = getInt(data, "playerId");
        battleMgr->rematch(playerId);

    } else {
        std::cerr << "Unknown message type: " << type << std::endl;
    }
}

// ============================================================
// Main
// ============================================================

int main(int argc, char* argv[]) {
    int wsPort = 9090;
    if (argc > 1) wsPort = std::stoi(argv[1]);

    std::cout << "========================================" << std::endl;
    std::cout << "  QuizFlow Battle Server" << std::endl;
    std::cout << "  Port: " << wsPort << std::endl;
    std::cout << "========================================" << std::endl;

    // Initialize database
    quizflow::Database db;
    if (!db.open("quizflow.db")) {
        std::cerr << "Failed to open database" << std::endl;
        return 1;
    }
    if (!db.createTables()) {
        std::cerr << "Failed to create tables" << std::endl;
        return 1;
    }
    std::cout << "Database initialized." << std::endl;

    // Initialize battle manager
    battleMgr = new quizflow::BattleManager(db, sendToWs);

    // Initialize WebSocket server
    wsServer = new quizflow::WebSocketServer(wsPort);

    wsServer->onConnectCallback([](int fd) {
        std::cout << "Client connected: fd=" << fd << std::endl;
    });

    wsServer->onDisconnectCallback([](int fd) {
        std::cout << "Client disconnected: fd=" << fd << std::endl;
        int playerId = 0;
        {
            std::lock_guard<std::mutex> lock(fdMutex);
            auto it = fdToPlayer.find(fd);
            if (it != fdToPlayer.end()) {
                playerId = it->second;
                fdToPlayer.erase(it);
                playerToFd.erase(playerId);
            }
        }
        if (playerId > 0 && battleMgr) {
            battleMgr->handleDisconnect(playerId);
        }
    });

    wsServer->onMessageCallback(handleMessage);

    if (!wsServer->start()) {
        std::cerr << "Failed to start WebSocket server" << std::endl;
        return 1;
    }

    std::cout << "Server running. Press Ctrl+C to stop." << std::endl;

    // Keep running
    while (true) {
#ifdef _WIN32
        Sleep(1000);
#else
        sleep(1);
#endif
    }

    delete wsServer;
    delete battleMgr;
    return 0;
}
