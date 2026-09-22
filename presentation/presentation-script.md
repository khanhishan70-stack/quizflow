# QuizFlow — Presentation Script (What to Say)

Timing guide: ~12–15 minutes total. Each slide ≈ 45–60 seconds.
Replace [Your Name], [Guide Name], etc. before presenting.

---

## Slide 1 — Title
**Say:**
> "Good morning everyone. My name is [Your Name], and today I'll be presenting my project, **QuizFlow — The Future of Learning**. It's a full-stack quiz platform powered by a C++ Object-Oriented Programming engine. This project is for my [course name] course under the guidance of [Guide Name]."

---

## Slide 2 — Problem Statement
**Say:**
> "Let me start with a problem we've all faced. Traditional studying is passive — we read, we memorize, but we don't get instant feedback. When you revise from a textbook, you can't tell if you actually understood the topic until the exam. Also, there's no motivation — no streaks, no scores, no competition. Students learn much faster when learning feels like a game. That's the gap QuizFlow fills."

---

## Slide 3 — Objectives
**Say:**
> "So we set four main objectives. First, build a complete quiz platform for Diploma in IT students. Second, cover five subjects with a range of difficulties and time limits. Third, add a real-time battle mode where students compete 1v1. And most importantly, the entire core is built using **pure Object-Oriented Programming** in C++ — so this project demonstrates inheritance, polymorphism, encapsulation, and abstraction in a real, working system."

---

## Slide 4 — Introduction
**Say:**
> "QuizFlow has two main ways to practice. **Solo quizzes** — you pick a subject, choose the chapters, pick difficulty, and solve a timed quiz. And **Battle mode** — real-time one-versus-one, either against a friend using a room code or against a random player. On top of that we have a global leaderboard, personal profiles with streaks and achievements, and a full admin panel."

---

## Slide 5 — Tech Stack
**Say:**
> "The stack is deliberately rich. The **frontend** is pure HTML, CSS, and vanilla JavaScript — no frameworks — with a modern glassmorphism design. Then we have **three backends**. Backend number one is a C++17 console application that demonstrates all the OOP concepts. Backend two is a Node.js WebSocket server that powers live battles. And backend three is actually another **C++ server** — a WebSocket server that I wrote from scratch using raw TCP sockets. All data lives in a SQLite database."

---

## Slide 6 — System Architecture
**Say:**
> "Here's how the pieces connect. The browser talks to the Node.js battle server over WebSockets on port 9090, which reads and writes the SQLite database in real time. Alongside that, the C++ console application acts as the OOP engine — you can register, log in, take quizzes, and see the leaderboard all through a proper class hierarchy. And as an alternative, the C++ WebSocket server can also power battles directly, proving the protocol was implemented in two independent ways."

---

## Slide 7 — OOP Concepts (MOST IMPORTANT)
**Say:**
> "This is the heart of the project, so let me explain it slowly. We have an abstract class **User** — it's abstract because it has a pure virtual method, `getRole()`. **Student** and **Admin** both inherit from User and provide their own implementations. That's **inheritance** and **polymorphism** — the base class pointer calls the right method at runtime. **Encapsulation** — the Question class hides its options and correct answer behind methods like `isCorrect()`. **Composition** — a Quiz *has a* collection of Question objects. And the **QuizSystem** class is a facade — one single interface that controls registration, quizzes, results, and the leaderboard, so the main program stays clean."

*(Point at the diagram while explaining.)*

---

## Slide 8 — C++ Battle Server
**Say:**
> "One of the hardest parts was the C++ WebSocket server. Most people use a library — we implemented the **RFC 6455 protocol from scratch** over raw TCP sockets. That means doing the handshake, framing messages, handling masking — all manually. The battle logic lives in a `BattleManager` class, the database access in a `Database` class, and the domain objects — Player, BattleRoom, BattleResult — are clean structures. It proves the OOP design works even at the network level."

---

## Slide 9 — Database Design
**Say:**
> "Everything is stored in SQLite with eight tables. `users` for accounts, `questions` for the question bank, then room, player, and answer tables for live battles, plus results and a leaderboard table. We use WAL mode, which lets reads and writes happen safely even during concurrent battles."

---

## Slide 10 — Key Features
**Say:**
> "Let me summarize what the user actually experiences. A complete solo quiz flow with detailed results and answer review, real-time battles with live score and an animated timer ring, an admin panel for creating and editing quizzes without touching the database, and a profile with streaks and achievements."

---

## Slide 11 — Live Demo
**Say:**
> "Now let me show you it working. First I'll run the C++ console application — register, log in, and take a quiz. [DEMO]. Then I'll start the Node.js battle server, open two browser windows, and we'll play a head-to-head battle. [DEMO]. Then we'll quickly create a quiz in the admin panel and look at the database tables."

---

## Slide 12 — Challenges
**Say:**
> "This project taught me a lot, mostly by breaking things. Writing the WebSocket server from raw TCP sockets was challenging — frame fragmentation and masking were tricky. Keeping two players' screens perfectly in sync in real time, and keeping SQLite consistent under concurrent writes in WAL mode, both took careful debugging."

---

## Slide 13 — Results & Achievements
**Say:**
> "The results speak for themselves — the landing page shows over 1,200 students, 24 quizzes, more than 5,800 attempts, and a 92% success rate. The battle system handles room codes, matchmaking, and disconnections, and admins can manage everything without touching the database directly."

---

## Slide 14 — Future Scope
**Say:**
> "If I continue this project, the next steps would be a mobile app, AI-generated questions so the content never runs out, bigger multiplayer tournaments instead of just 1v1, and deploying it to the cloud so anyone can use it — not just on localhost."

---

## Slide 15 — Thank You / Q&A
**Say:**
> "To wrap up — QuizFlow shows how Object-Oriented Programming in C++ can power a real, modern, full-stack application. Thank you for listening, and I'm happy to take any questions."

---

## Presentation Tips
1. **Practice the demo 3+ times** before the day — battles can fail if the server isn't started. Start the server *before* your presentation slot.
2. Spend the most time on **Slide 7 (OOP)** — that's what the panel grades.
3. Keep each slide under 60 seconds; total should be ~12–15 minutes.
4. If the live browser demo fails, be honest: "let me show you the code" and open the C++ source files.
5. When asked "what did YOU write?", point to: `backend/` (all C++ classes), `cpp_server/` (WebSocket server), and the HTML/JS pages.