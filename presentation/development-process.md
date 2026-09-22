# QuizFlow — Development Process (Step by Step)

## Step 1 — Planning & Design
**What:** Decide features, pages, database schema
**How:** Paper/diagrams → designed 8 database tables (users, questions, battles, leaderboard...)
**Used:** No code — SQLite schema design

## Step 2 — C++ OOP Core Engine (`backend/`)
**What:** Build the brain — registration, login, quiz logic, results, leaderboard
**Language:** C++17
**Used:** Class hierarchy — `User` (abstract) → `Student`, `Admin`; `Question`, `Quiz`, `Result`, `QuizSystem` (facade)
**Persistence:** Flat text files (`users.txt`, `quizzes.txt`) → later replaced by SQLite
**Build:** MSVC via `build.bat` → `quizflow.exe`

## Step 3 — SQLite Database
**What:** Store everything properly
**Language:** SQL
**Used:** 8 tables in `quizflow.db`, WAL mode, foreign keys ON
**Tool:** better-sqlite3

## Step 4 — Frontend UI (14 pages)
**What:** All the pages users see
**Language:** HTML5 + CSS3 + Vanilla JavaScript
**Used:** No frameworks — pure JS in `window.QuizFlowAPI` / `window.QuizFlowAuth`
**Tools:** Canvas API (particle background), SVG (icons, timer rings), CSS glassmorphism theme
**Storage:** `localStorage` (mock API during development)

## Step 5 — Battle Mode — Node.js Server (`server/`)
**What:** Real-time 1v1 battles
**Language:** JavaScript (Node.js)
**Used:** `ws` (WebSocket) + `better-sqlite3`, runs on port 9090
**Flow:** Browser ↔ WebSocket ↔ Database

## Step 6 — C++ WebSocket Server (`cpp_server/`)
**What:** Second battle server to prove OOP at network level
**Language:** C++17 + POSIX sockets + OpenSSL + SQLite3
**Used:** RFC 6455 implemented from scratch (raw TCP), `BattleManager`, `Database`, domain structs
**Build:** `make` (g++)

## Step 7 — Features Polish
**What:** Add the "wow" features
**Used:** Animated timer ring, score popups, countdown, matchmaking, room codes, achievements, streaks, leaderboard podium

## Step 8 — Testing & Demo
**What:** Run everything end-to-end
**Commands:**
- `node server/battle-server.js` — start battle server
- `backend/quizflow.exe` — C++ console demo
- Open 2 browsers for a live battle test

## Summary of Languages Used

| Part | Language |
|---|---|
| Frontend pages | HTML, CSS, JavaScript |
| Core engine | C++ (OOP) |
| Battle server | Node.js (JS) |
| Alt battle server | C++ (sockets) |
| Database | SQLite (SQL) |