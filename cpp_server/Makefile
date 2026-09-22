# ============================================================
# QuizFlow Battle Server — Makefile
# Requires: g++, OpenSSL, SQLite3
# 
# Build:   make
# Clean:   make clean
# Run:     ./quizflow_server [port]
# ============================================================

CXX      = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -pthread
LDFLAGS  = -pthread -lssl -lcrypto -lsqlite3

TARGET   = quizflow_server
SRCS     = main.cpp database.cpp battle_manager.cpp websocket_server.cpp
OBJS     = $(SRCS:.cpp=.o)

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c -o $@ $<

clean:
	rm -f $(OBJS) $(TARGET)

run: $(TARGET)
	./$(TARGET) 9090
