// ============================================================
// QuizFlow — Student (inherits User)
// Tracks attempts, average score, best score, streak
// ============================================================
#ifndef QUIZFLOW_STUDENT_H
#define QUIZFLOW_STUDENT_H

#include <string>
#include <vector>
#include <sstream>
#include "User.h"

class Student : public User {
private:
    int totalAttempts;
    int totalPoints;   // sum of points earned (score/total ratio * 100)
    int bestScore;     // best percentage
    int currentStreak; // consecutive quizzes attempted

public:
    Student()
        : User(), totalAttempts(0), totalPoints(0), bestScore(0),
          currentStreak(0) {}

    Student(int id, const std::string& name, const std::string& email,
            const std::string& password)
        : User(id, name, email, password), totalAttempts(0),
          totalPoints(0), bestScore(0), currentStreak(0) {}

    std::string getRole() const override { return "Student"; }

    void recordAttempt(int score, int total) {
        int percent = (total > 0) ? (score * 100) / total : 0;
        totalAttempts++;
        totalPoints += percent;
        if (percent > bestScore) bestScore = percent;
        currentStreak++;
    }

    int getTotalAttempts() const { return totalAttempts; }
    double getAverageScore() const {
        return (totalAttempts > 0) ? (double)totalPoints / totalAttempts : 0.0;
    }
    int getBestScore() const { return bestScore; }
    int getCurrentStreak() const { return currentStreak; }

    void display() const override {
        std::cout << id << " | " << name << " | " << email
                  << " | Avg: " << getAverageScore() << "%"
                  << " | Best: " << bestScore << "%"
                  << " | Attempts: " << totalAttempts << "\n";
    }

    // ---- File storage: S|id|name|email|password|attempts|points|best|streak ----
    std::string toLine() const {
        std::stringstream ss;
        ss << "S|" << id << "|" << name << "|" << email << "|" << password
           << "|" << totalAttempts << "|" << totalPoints
           << "|" << bestScore << "|" << currentStreak;
        return ss.str();
    }

    static Student fromLine(const std::string& line) {
        std::stringstream ss(line);
        std::string token;
        std::vector<std::string> parts;
        while (std::getline(ss, token, '|')) parts.push_back(token);

        Student s;
        if (parts.size() > 1) s.id = std::stoi(parts[1]);
        if (parts.size() > 2) s.name = parts[2];
        if (parts.size() > 3) s.email = parts[3];
        if (parts.size() > 4) s.password = parts[4];
        if (parts.size() > 5) s.totalAttempts = std::stoi(parts[5]);
        if (parts.size() > 6) s.totalPoints = std::stoi(parts[6]);
        if (parts.size() > 7) s.bestScore = std::stoi(parts[7]);
        if (parts.size() > 8) s.currentStreak = std::stoi(parts[8]);
        return s;
    }
};

#endif
