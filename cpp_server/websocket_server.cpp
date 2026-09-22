#include "websocket_server.h"
#include <iostream>
#include <cstring>
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <openssl/sha.h>
#include <openssl/bio.h>
#include <openssl/buffer.h>

// Platform-specific includes
#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #pragma comment(lib, "ws2_32.lib")
    typedef int socklen_t;
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <unistd.h>
    #include <fcntl.h>
    #include <poll.h>
#endif

namespace quizflow {

// ============================================================
// SHA-1 + Base64 for WebSocket handshake
// ============================================================

static const std::string WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

static std::string base64Encode(const unsigned char* data, size_t len) {
    BIO* b64 = BIO_new(BIO_f_base64());
    BIO* bMem = BIO_new(BIO_s_mem());
    b64 = BIO_push(b64, bMem);
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
    BIO_write(b64, data, (int)len);
    BIO_flush(b64);
    BUF_MEM* bptr;
    BIO_get_mem_ptr(b64, &bptr);
    std::string result(bptr->data, bptr->length);
    BIO_free_all(b64);
    return result;
}

static std::string computeAcceptKey(const std::string& key) {
    std::string combined = key + WS_MAGIC;
    unsigned char hash[SHA_DIGEST_LENGTH];
    SHA1(reinterpret_cast<const unsigned char*>(combined.c_str()), combined.size(), hash);
    return base64Encode(hash, SHA_DIGEST_LENGTH);
}

// ============================================================
// Constructor / Destructor
// ============================================================

WebSocketServer::WebSocketServer(int port)
    : serverFd(-1), port(port), running(false) {}

WebSocketServer::~WebSocketServer() { stop(); }

// ============================================================
// Start / Stop
// ============================================================

bool WebSocketServer::start() {
#ifdef _WIN32
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed" << std::endl;
        return false;
    }
#endif

    serverFd = socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) {
        std::cerr << "Cannot create socket" << std::endl;
        return false;
    }

    int opt = 1;
    setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(port);

    if (bind(serverFd, (sockaddr*)&addr, sizeof(addr)) < 0) {
        std::cerr << "Cannot bind to port " << port << std::endl;
        return false;
    }

    if (listen(serverFd, 16) < 0) {
        std::cerr << "Cannot listen" << std::endl;
        return false;
    }

    running = true;
    acceptThread = std::thread(&WebSocketServer::acceptClients, this);
    pollThread = std::thread(&WebSocketServer::pollClients, this);

    std::cout << "WebSocket server listening on port " << port << std::endl;
    return true;
}

void WebSocketServer::stop() {
    running = false;
#ifdef _WIN32
    if (serverFd >= 0) closesocket(serverFd);
    WSACleanup();
#else
    if (serverFd >= 0) close(serverFd);
#endif
    if (acceptThread.joinable()) acceptThread.join();
    if (pollThread.joinable()) pollThread.join();
}

// ============================================================
// Accept clients
// ============================================================

void WebSocketServer::acceptClients() {
    while (running) {
        sockaddr_in clientAddr{};
        socklen_t clientLen = sizeof(clientAddr);
        int clientFd = accept(serverFd, (sockaddr*)&clientAddr, &clientLen);
        if (clientFd < 0) continue;

        // Set non-blocking
#ifdef _WIN32
        unsigned long mode = 1;
        ioctlsocket(clientFd, FIONBIO, &mode);
#else
        int flags = fcntl(clientFd, F_GETFL, 0);
        fcntl(clientFd, F_SETFL, flags | O_NONBLOCK);
#endif

        {
            std::lock_guard<std::mutex> lock(clientsMutex);
            clientFds[clientFd] = false; // not yet upgraded
        }

        if (onConnect) onConnect(clientFd);
    }
}

// ============================================================
// Poll clients for data
// ============================================================

void WebSocketServer::pollClients() {
    while (running) {
        std::vector<int> fds;
        {
            std::lock_guard<std::mutex> lock(clientsMutex);
            for (auto& [fd, upgraded] : clientFds) {
                fds.push_back(fd);
            }
        }

        if (fds.empty()) {
#ifdef _WIN32
            Sleep(10);
#else
            usleep(10000);
#endif
            continue;
        }

        std::vector<pollfd> pollFds;
        for (int fd : fds) {
            pollfd pfd;
            pfd.fd = fd;
            pfd.events = POLLIN;
            pollFds.push_back(pfd);
        }

        int ret = poll(pollFds.data(), pollFds.size(), 50);
        if (ret <= 0) continue;

        for (auto& pfd : pollFds) {
            if (pfd.revents & POLLIN) {
                // Check if needs handshake
                bool upgraded = false;
                {
                    std::lock_guard<std::mutex> lock(clientsMutex);
                    auto it = clientFds.find(pfd.fd);
                    if (it != clientFds.end()) upgraded = it->second;
                }

                if (!upgraded) {
                    if (doHandshake(pfd.fd)) {
                        std::lock_guard<std::mutex> lock(clientsMutex);
                        clientFds[pfd.fd] = true;
                    }
                } else {
                    std::string data = readFrame(pfd.fd);
                    if (data.empty()) {
                        // Disconnect
                        {
                            std::lock_guard<std::mutex> lock(clientsMutex);
                            clientFds.erase(pfd.fd);
                        }
#ifdef _WIN32
                        closesocket(pfd.fd);
#else
                        close(pfd.fd);
#endif
                        if (onDisconnect) onDisconnect(pfd.fd);
                    } else {
                        if (onMessage) onMessage(pfd.fd, data);
                    }
                }
            } else if (pfd.revents & (POLLHUP | POLLERR)) {
                {
                    std::lock_guard<std::mutex> lock(clientsMutex);
                    clientFds.erase(pfd.fd);
                }
#ifdef _WIN32
                closesocket(pfd.fd);
#else
                close(pfd.fd);
#endif
                if (onDisconnect) onDisconnect(pfd.fd);
            }
        }
    }
}

// ============================================================
// WebSocket handshake
// ============================================================

bool WebSocketServer::doHandshake(int fd) {
    char buf[4096];
    int n = recv(fd, buf, sizeof(buf) - 1, 0);
    if (n <= 0) return false;
    buf[n] = '\0';

    std::string request(buf);
    if (request.find("Upgrade: websocket") == std::string::npos &&
        request.find("Upgrade: WebSocket") == std::string::npos) {
        return false;
    }

    // Extract Sec-WebSocket-Key
    std::string key;
    size_t keyPos = request.find("Sec-WebSocket-Key: ");
    if (keyPos != std::string::npos) {
        keyPos += 19;
        size_t end = request.find("\r\n", keyPos);
        key = request.substr(keyPos, end - keyPos);
    } else {
        return false;
    }

    std::string acceptKey = computeAcceptKey(key);
    std::string response =
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: " + acceptKey + "\r\n"
        "\r\n";

    send(fd, response.c_str(), response.size(), 0);
    return true;
}

// ============================================================
// Read WebSocket frame
// ============================================================

std::string WebSocketServer::readFrame(int fd) {
    unsigned char header[2];
    int n = recv(fd, (char*)header, 2, 0);
    if (n <= 0) return "";

    int opcode = header[0] & 0x0F;
    bool masked = header[1] & 0x80;
    uint64_t payloadLen = header[1] & 0x7F;

    if (payloadLen == 126) {
        unsigned char ext[2];
        if (recv(fd, (char*)ext, 2, 0) != 2) return "";
        payloadLen = (ext[0] << 8) | ext[1];
    } else if (payloadLen == 127) {
        unsigned char ext[8];
        if (recv(fd, (char*)ext, 8, 0) != 8) return "";
        payloadLen = 0;
        for (int i = 0; i < 8; i++)
            payloadLen = (payloadLen << 8) | ext[i];
    }

    unsigned char mask[4] = {};
    if (masked) {
        if (recv(fd, (char*)mask, 4, 0) != 4) return "";
    }

    if (payloadLen > 1024 * 1024) return ""; // too large

    std::string payload(payloadLen, '\0');
    size_t totalRead = 0;
    while (totalRead < payloadLen) {
        int r = recv(fd, &payload[totalRead], (int)(payloadLen - totalRead), 0);
        if (r <= 0) return "";
        totalRead += r;
    }

    if (masked) {
        for (size_t i = 0; i < payloadLen; i++)
            payload[i] ^= mask[i % 4];
    }

    // Close frame
    if (opcode == 0x08) return "";

    return payload;
}

// ============================================================
// Send WebSocket frame
// ============================================================

void WebSocketServer::sendFrame(int fd, const std::string& data) {
    std::string frame;
    frame += (char)0x81; // FIN + text opcode

    size_t len = data.size();
    if (len < 126) {
        frame += (char)(len & 0x7F);
    } else if (len < 65536) {
        frame += (char)126;
        frame += (char)((len >> 8) & 0xFF);
        frame += (char)(len & 0xFF);
    } else {
        frame += (char)127;
        for (int i = 7; i >= 0; i--)
            frame += (char)((len >> (i * 8)) & 0xFF);
    }

    frame += data;
    ::send(fd, frame.c_str(), frame.size(), 0);
}

// ============================================================
// Public send
// ============================================================

void WebSocketServer::send(int fd, const std::string& data) {
    sendFrame(fd, data);
}

void WebSocketServer::broadcast(const std::string& data) {
    std::lock_guard<std::mutex> lock(clientsMutex);
    for (auto& [fd, upgraded] : clientFds) {
        if (upgraded) sendFrame(fd, data);
    }
}

// ============================================================
// Callbacks
// ============================================================

void WebSocketServer::onMessageCallback(WsHandler handler) { onMessage = handler; }
void WebSocketServer::onConnectCallback(WsConnectHandler handler) { onConnect = handler; }
void WebSocketServer::onDisconnectCallback(WsDisconnectHandler handler) { onDisconnect = handler; }

} // namespace quizflow
