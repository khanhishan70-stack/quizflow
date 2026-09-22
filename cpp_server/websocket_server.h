#ifndef QUIZFLOW_WEBSOCKET_SERVER_H
#define QUIZFLOW_WEBSOCKET_SERVER_H

#include <string>
#include <vector>
#include <functional>
#include <map>
#include <thread>
#include <mutex>
#include <atomic>

namespace quizflow {

// ============================================================
// Minimal WebSocket server (RFC 6455)
// Uses raw POSIX sockets — no external library dependency.
// ============================================================

struct WsMessage {
    int fd;
    std::string data;
};

using WsHandler = std::function<void(int fd, const std::string& data)>;
using WsConnectHandler = std::function<void(int fd)>;
using WsDisconnectHandler = std::function<void(int fd)>;

class WebSocketServer {
private:
    int serverFd;
    int port;
    std::atomic<bool> running;
    std::thread acceptThread;
    std::thread pollThread;

    WsHandler onMessage;
    WsConnectHandler onConnect;
    WsDisconnectHandler onDisconnect;

    std::map<int, bool> clientFds; // fd -> upgraded
    std::mutex clientsMutex;

    void acceptClients();
    void pollClients();
    bool doHandshake(int fd);
    std::string readFrame(int fd);
    void sendFrame(int fd, const std::string& data);

public:
    WebSocketServer(int port);
    ~WebSocketServer();

    bool start();
    void stop();
    void send(int fd, const std::string& data);
    void broadcast(const std::string& data);

    void onMessageCallback(WsHandler handler);
    void onConnectCallback(WsConnectHandler handler);
    void onDisconnectCallback(WsDisconnectHandler handler);
};

} // namespace quizflow

#endif // QUIZFLOW_WEBSOCKET_SERVER_H
