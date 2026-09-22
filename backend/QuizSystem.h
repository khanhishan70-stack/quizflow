// ============================================================
// QuizFlow — Core System
// Facade service: authentication, quiz engine, file persistence
// ============================================================
#ifndef QUIZFLOW_QUIZSYSTEM_H
#define QUIZFLOW_QUIZSYSTEM_H

#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <iostream>
#include <iomanip>
#include <ctime>
#include <algorithm>
#include "User.C++"
#include "Student.C++"
#include "Admin.C++"
#include "Question.C++"
#include "Quiz.C++"
#include "Result.C++"

class QuizSystem {
private:
    std::vector<Student> students;
    std::vector<Admin> admins;
    std::vector<Quiz> quizzes;
    std::vector<Result> results;
    int nextUserId;
    int nextQuizId;

    // ---- Helpers ----
    std::string getNow() const {
        std::time_t t = std::time(nullptr);
        std::tm* lt = std::localtime(&t);
        char buf[32];
        std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M", lt);
        return std::string(buf);
    }

    Student* findStudentByEmail(const std::string& email) {
        for (size_t i = 0; i < students.size(); ++i)
            if (students[i].getEmail() == email) return &students[i];
        return nullptr;
    }

    Admin* findAdminByEmail(const std::string& email) {
        for (size_t i = 0; i < admins.size(); ++i)
            if (admins[i].getEmail() == email) return &admins[i];
        return nullptr;
    }

    Quiz* findQuiz(int id) {
        for (size_t i = 0; i < quizzes.size(); ++i)
            if (quizzes[i].getId() == id) return &quizzes[i];
        return nullptr;
    }

    // ---- Persistence: users ----
    void saveUsers() const {
        std::ofstream file("users.txt");
        for (size_t i = 0; i < students.size(); ++i)
            file << students[i].toLine() << "\n";
        for (size_t i = 0; i < admins.size(); ++i)
            file << admins[i].toLine() << "\n";
    }

    void loadUsers() {
        students.clear();
        admins.clear();
        std::ifstream file("users.txt");
        std::string line;
        while (std::getline(file, line)) {
            if (line.empty()) continue;
            if (line[0] == 'S') students.push_back(Student::fromLine(line));
            else if (line[0] == 'A') admins.push_back(Admin::fromLine(line));
        }
        nextUserId = 1;
        for (size_t i = 0; i < students.size(); ++i)
            if (students[i].getId() >= nextUserId)
                nextUserId = students[i].getId() + 1;
        for (size_t i = 0; i < admins.size(); ++i)
            if (admins[i].getId() >= nextUserId)
                nextUserId = admins[i].getId() + 1;
    }

    // ---- Persistence: quizzes ----
    void saveQuizzes() const {
        std::ofstream file("quizzes.txt");
        for (size_t i = 0; i < quizzes.size(); ++i)
            file << quizzes[i].toHeader() << "\n"
                 << quizzes[i].toQuestionsBlock();
    }

    void loadQuizzes() {
        quizzes.clear();
        std::ifstream file("quizzes.txt");
        std::string line;
        while (std::getline(file, line)) {
            if (line.empty()) continue;
            if (line[0] == 'Q') {
                // Q|id|title|category|duration|count
                std::stringstream ss(line);
                std::string token;
                std::vector<std::string> parts;
                while (std::getline(ss, token, '|')) parts.push_back(token);
                Quiz q;
                if (parts.size() > 1) q = Quiz(std::stoi(parts[1]),
                    (parts.size() > 2) ? parts[2] : "",
                    (parts.size() > 3) ? parts[3] : "",
                    (parts.size() > 4) ? std::stoi(parts[4]) : 10);
                quizzes.push_back(q);
            } else if (line[0] == '#') {
                if (!quizzes.empty())
                    quizzes.back().addQuestion(Question::fromLine(line));
            }
        }
        nextQuizId = 1;
        for (size_t i = 0; i < quizzes.size(); ++i)
            if (quizzes[i].getId() >= nextQuizId)
                nextQuizId = quizzes[i].getId() + 1;
    }

    // ---- Persistence: results ----
    void saveResults() const {
        std::ofstream file("results.txt");
        for (size_t i = 0; i < results.size(); ++i)
            file << results[i].toLine() << "\n";
    }

    void loadResults() {
        results.clear();
        std::ifstream file("results.txt");
        std::string line;
        while (std::getline(file, line)) {
            if (line.empty()) continue;
            if (line[0] == 'R') results.push_back(Result::fromLine(line));
        }
    }

    // ---- Seed demo accounts on first run ----
    void seedIfEmpty() {
        if (admins.empty()) {
            admins.push_back(Admin(nextUserId++, "System Admin",
                                   "admin@quizflow.com", "admin123"));
            students.push_back(Student(nextUserId++, "Ayesha Khan",
                                       "demo@quizflow.com", "quizflow"));
        }
        if (quizzes.empty()) {
            seedDiplomaITQuizzes();
            saveQuizzes();
        }
        saveUsers();
    }

    // Diploma in IT — subject quizzes
    void seedDiplomaITQuizzes() {
        // 1. DTM — Digital Techniques and Microprocessor
        Quiz dtm(nextQuizId++, "Digital Techniques and Microprocessor (DTM)",
                 "Diploma IT", 10);
        dtm.addQuestion(Question(
            "Which number system is used inside digital electronic circuits?",
            {"Decimal", "Binary", "Octal", "Hexadecimal"}, 1,
            "Digital circuits use only 0 and 1 (Binary)."));
        dtm.addQuestion(Question(
            "Which logic gate produces an output of 1 only when all inputs are 1?",
            {"OR", "AND", "NOT", "XOR"}, 1,
            "AND gate is high only when every input is high."));
        dtm.addQuestion(Question(
            "What does ALU stand for?",
            {"Arithmetic Logic Unit", "Advanced Logic Unit",
             "Arithmetic Last Unit", "Analog Logic Unit"}, 0,
            "ALU performs arithmetic and logical operations."));
        dtm.addQuestion(Question(
            "The Intel 8085 microprocessor is a:",
            {"16-bit processor", "32-bit processor",
             "8-bit processor", "4-bit processor"}, 2,
            "8085 is an 8-bit microprocessor."));
        dtm.addQuestion(Question(
            "Which of these is a valid octal number?",
            {"235", "189", "3A5", "24B"}, 0,
            "Octal uses digits 0 to 7 only."));
        quizzes.push_back(dtm);

        // 2. DSU — Data Structures using C
        Quiz dsu(nextQuizId++, "Data Structures using C (DSU)",
                 "Diploma IT", 10);
        dsu.addQuestion(Question(
            "Which data structure works on the LIFO principle?",
            {"Queue", "Stack", "Tree", "Graph"}, 1,
            "Stack = Last In First Out."));
        dsu.addQuestion(Question(
            "Which data structure works on the FIFO principle?",
            {"Stack", "Queue", "Array", "Linked List"}, 1,
            "Queue = First In First Out."));
        dsu.addQuestion(Question(
            "Which data structure stores elements in key-value pairs?",
            {"Queue", "Stack", "Hash Table", "Array"}, 2,
            "Hash tables map keys to values."));
        dsu.addQuestion(Question(
            "The time complexity of binary search in the worst case is:",
            {"O(n)", "O(log n)", "O(n log n)", "O(1)"}, 1,
            "Binary search halves the search space each step."));
        dsu.addQuestion(Question(
            "In C, array indexing starts from:",
            {"1", "0", "-1", "2"}, 1,
            "C arrays are zero-indexed."));
        quizzes.push_back(dsu);

        // 3. OOP — Object Oriented Programming using C++
        Quiz oop(nextQuizId++, "Object Oriented Programming using C++ (OOP)",
                 "Diploma IT", 10);
        oop.addQuestion(Question(
            "Which OOP concept allows a class to acquire properties from another class?",
            {"Encapsulation", "Inheritance", "Abstraction", "Polymorphism"}, 1,
            "Inheritance lets a child class reuse a parent class."));
        oop.addQuestion(Question(
            "Which OOP feature bundles data and the methods that operate on it?",
            {"Inheritance", "Encapsulation", "Overloading", "Recursion"}, 1,
            "Encapsulation binds data and functions together."));
        oop.addQuestion(Question(
            "Which of the following is NOT an object-oriented language?",
            {"C++", "Java", "C", "Python"}, 2,
            "C is a procedural language."));
        oop.addQuestion(Question(
            "Which keyword is used to define a class in C++?",
            {"struct", "class", "object", "public"}, 1,
            "class is the keyword for a class."));
        oop.addQuestion(Question(
            "A constructor in C++ is used to:",
            {"Destroy an object", "Initialize an object",
             "Copy an object", "Delete an object"}, 1,
            "Constructors initialize objects."));
        quizzes.push_back(oop);

        // 4. AMT — Applied Multimedia Techniques
        Quiz amt(nextQuizId++, "Applied Multimedia Techniques (AMT)",
                 "Diploma IT", 10);
        amt.addQuestion(Question(
            "Which of the following is a raster image format?",
            {"BMP", "WAV", "MP3", "TXT"}, 0,
            "BMP stores images as a grid of pixels."));
        amt.addQuestion(Question(
            "Which file format is commonly used for audio?",
            {"JPEG", "MP3", "PNG", "GIF"}, 1,
            "MP3 is a compressed audio format."));
        amt.addQuestion(Question(
            "What does GIF stand for?",
            {"Graphics Interchange Format", "Graphical Image File",
             "General Image Format", "Great Internet File"}, 0,
            "GIF is a bitmap image format."));
        amt.addQuestion(Question(
            "Multimedia is a combination of text, graphics, audio, video and:",
            {"Animation", "Keyboard", "Processor", "Compiler"}, 0,
            "Animation is part of multimedia."));
        amt.addQuestion(Question(
            "Which application is used for editing videos?",
            {"MS Word", "Adobe Premiere Pro", "Notepad", "Calculator"}, 1,
            "Adobe Premiere Pro is a video editor."));
        quizzes.push_back(amt);

        // 5. EIC — Essence of Indian Constitution
        Quiz eic(nextQuizId++, "Essence of Indian Constitution (EIC)",
                 "Diploma IT", 8);
        eic.addQuestion(Question(
            "Who is known as the 'Father of the Indian Constitution'?",
            {"Mahatma Gandhi", "Jawaharlal Nehru",
             "Dr. B. R. Ambedkar", "Sardar Patel"}, 2,
            "Dr. B. R. Ambedkar was the Chairman of the Drafting Committee."));
        eic.addQuestion(Question(
            "The Indian Constitution was adopted on:",
            {"15 August 1947", "26 January 1950",
             "26 November 1949", "2 October 1950"}, 2,
            "Adopted on 26 November 1949, enforced on 26 January 1950."));
        eic.addQuestion(Question(
            "How many Fundamental Rights are guaranteed by the Indian Constitution?",
            {"5", "6", "7", "8"}, 1,
            "There are six Fundamental Rights."));
        eic.addQuestion(Question(
            "The Preamble of the Indian Constitution begins with the words:",
            {"We, the Parliament of India", "We, the People of India",
             "We, the Citizens of India", "We, the Nation of India"}, 1,
            "The Preamble starts with 'We, the People of India'."));
        eic.addQuestion(Question(
            "Right to Equality is guaranteed under which Article?",
            {"Article 14", "Article 19", "Article 21", "Article 32"}, 0,
            "Article 14 guarantees equality before law."));
        quizzes.push_back(eic);
    }

public:
    QuizSystem() : nextUserId(1), nextQuizId(1) {}

    void loadAll() {
        loadUsers();
        loadQuizzes();
        loadResults();
        seedIfEmpty();
    }

    void saveAll() {
        saveUsers();
        saveQuizzes();
        saveResults();
    }

    // ================= AUTHENTICATION =================
    bool registerStudent(const std::string& name, const std::string& email,
                         const std::string& password) {
        if (findStudentByEmail(email) || findAdminByEmail(email)) {
            std::cout << "  [!] Email already registered.\n";
            return false;
        }
        students.push_back(Student(nextUserId++, name, email, password));
        saveUsers();
        std::cout << "  [✓] Registration successful! Please log in.\n";
        return true;
    }

    // Polymorphic login: returns either Student* or Admin*
    User* login(const std::string& email, const std::string& password) {
        Admin* a = findAdminByEmail(email);
        if (a && a->checkPassword(password)) return a;

        Student* s = findStudentByEmail(email);
        if (s && s->checkPassword(password)) return s;

        return nullptr;
    }

    // ================= ADMIN OPERATIONS =================
    void addQuiz(const std::string& title, const std::string& category,
                 int durationMinutes) {
        quizzes.push_back(Quiz(nextQuizId++, title, category, durationMinutes));
        saveQuizzes();
        std::cout << "  [✓] Quiz added with ID "
                  << quizzes.back().getId() << ".\n";
    }

    bool addQuestionToQuiz(int quizId, const Question& q) {
        Quiz* quiz = findQuiz(quizId);
        if (!quiz) {
            std::cout << "  [!] Quiz not found.\n";
            return false;
        }
        quiz->addQuestion(q);
        saveQuizzes();
        std::cout << "  [✓] Question added.\n";
        return true;
    }

    void listQuizzes() const {
        if (quizzes.empty()) {
            std::cout << "  No quizzes available.\n";
            return;
        }
        for (size_t i = 0; i < quizzes.size(); ++i)
            quizzes[i].display();
    }

    // ================= STUDENT OPERATIONS =================
    void takeQuiz(Student& student) {
        if (quizzes.empty()) {
            std::cout << "  No quizzes available yet.\n";
            return;
        }

        std::cout << "\nAvailable quizzes:\n";
        listQuizzes();
        std::cout << "\nEnter quiz ID to attempt (0 to cancel): ";
        int id;
        std::cin >> id;
        if (id == 0) return;

        Quiz* quiz = findQuiz(id);
        if (!quiz) {
            std::cout << "  [!] Invalid quiz ID.\n";
            return;
        }

        size_t total = quiz->getQuestionCount();
        if (total == 0) {
            std::cout << "  [!] This quiz has no questions.\n";
            return;
        }

        std::cout << "\n===== " << quiz->getTitle() << " =====\n"
                  << "Total questions: " << total << "\n"
                  << "Answer A/B/C/D. Enter 0 to skip a question.\n\n";

        int score = 0;
        for (size_t i = 0; i < total; ++i) {
            Question q = quiz->getQuestion(i);
            std::cout << "Question " << i + 1 << " / " << total << "\n";
            q.display();

            char choice;
            std::cout << "\n  Your answer (A/B/C/D or 0): ";
            std::cin >> choice;

            if (choice == '0') {
                std::cout << "  Skipped.\n";
                continue;
            }

            int idx = (choice >= 'a' && choice <= 'd') ? choice - 'a'
                    : (choice >= 'A' && choice <= 'D') ? choice - 'A' : -1;

            if (idx < 0 || idx >= 4) {
                std::cout << "  [!] Invalid choice. Skipping.\n";
                continue;
            }

            if (q.isCorrect(idx)) {
                score++;
                std::cout << "  [✓] Correct!\n";
            } else {
                std::cout << "  [✗] Wrong. Correct answer: "
                          << (char)('A' + q.getCorrectIndex()) << ".\n";
            }
            if (!q.getExplanation().empty())
                std::cout << "  ℹ " << q.getExplanation() << "\n";
            std::cout << "  " << std::string(46, '-') << "\n";
        }

        double percent = (double)score / total * 100.0;
        std::cout << "\n===== RESULT =====\n"
                  << "Score: " << score << " / " << total
                  << "  (" << std::fixed << std::setprecision(1)
                  << percent << "%)\n";

        results.push_back(Result(student.getId(), quiz->getId(),
                                 student.getName(), quiz->getTitle(),
                                 score, (int)total, getNow()));
        student.recordAttempt(score, (int)total);
        saveAll();

        std::cout << (percent >= 60 ? "  [✓] Good job!\n"
                                    : "  Keep practicing!\n");
    }

    void showMyResults(int studentId) const {
        std::cout << "\nRecent results:\n";
        bool found = false;
        for (size_t i = 0; i < results.size(); ++i) {
            if (results[i].getStudentId() == studentId) {
                results[i].display();
                found = true;
            }
        }
        if (!found) std::cout << "  No results yet. Try a quiz!\n";
    }

    void showLeaderboard() const {
        std::vector<Student> sorted = students;
        std::sort(sorted.begin(), sorted.end(),
                  [](const Student& a, const Student& b) {
                      if (a.getBestScore() != b.getBestScore())
                          return a.getBestScore() > b.getBestScore();
                      return a.getTotalAttempts() > b.getTotalAttempts();
                  });

        std::cout << "\n===== LEADERBOARD =====\n"
                  << "Rank | Name | Best % | Avg % | Attempts\n"
                  << std::string(48, '-') << "\n";
        for (size_t i = 0; i < sorted.size(); ++i) {
            const Student& s = sorted[i];
            std::cout << "  " << i + 1 << ".  "
                      << std::left << std::setw(18) << s.getName()
                      << std::right << std::setw(5) << s.getBestScore() << "%  "
                      << std::setw(6) << std::fixed << std::setprecision(1)
                      << s.getAverageScore() << "%  "
                      << std::setw(3) << s.getTotalAttempts() << "\n";
        }
    }

    // ================= ADMIN ANALYTICS =================
    void showStats() const {
        int questionCount = 0;
        for (size_t i = 0; i < quizzes.size(); ++i)
            questionCount += (int)quizzes[i].getQuestionCount();

        std::cout << "\n===== SYSTEM STATS =====\n";
        std::cout << "  Students : " << students.size() << "\n";
        std::cout << "  Admins   : " << admins.size() << "\n";
        std::cout << "  Quizzes  : " << quizzes.size() << "\n";
        std::cout << "  Questions: " << questionCount << "\n";
        std::cout << "  Attempts : " << results.size() << "\n";
    }

    void showQuizPerformance() const {
        std::cout << "\n===== QUIZ PERFORMANCE =====\n";
        for (size_t i = 0; i < quizzes.size(); ++i) {
            const Quiz& quiz = quizzes[i];
            int attempts = 0;
            double totalPercent = 0;
            for (size_t j = 0; j < results.size(); ++j) {
                if (results[j].getQuizId() == quiz.getId()) {
                    attempts++;
                    totalPercent += results[j].getPercent();
                }
            }
            double avg = attempts ? totalPercent / attempts : 0.0;
            std::cout << "  " << quiz.getTitle()
                      << " | attempts: " << attempts
                      << " | avg: " << std::fixed << std::setprecision(1)
                      << avg << "%\n";
        }
    }
};

#endif
