// ============================================================
// QuizFlow — Result model
// Stores a single quiz attempt outcome for a student
// ============================================================
#ifndef QUIZFLOW_RESULT_H
#define QUIZFLOW_RESULT_H

#include <string>
#include <vector>
#include <sstream>
#include <iostream>

class Result {
private:
    int studentId;
    int quizId;
    std::string studentName;
    std::string quizTitle;
    int score;
    int total;
    double percent;
    std::string dateTime;

public:
    Result()
        : studentId(0), quizId(0), score(0), total(0), percent(0.0) {}

    Result(int studentId, int quizId,
           const std::string& studentName, const std::string& quizTitle,
           int score, int total, const std::string& dateTime)
        : studentId(studentId), quizId(quizId), studentName(studentName),
          quizTitle(quizTitle), score(score), total(total),
          percent((total > 0) ? (double)score / total * 100.0 : 0.0),
          dateTime(dateTime) {}

    int getStudentId() const { return studentId; }
    int getQuizId() const { return quizId; }
    std::string getQuizTitle() const { return quizTitle; }
    int getScore() const { return score; }
    int getTotal() const { return total; }
    double getPercent() const { return percent; }
    std::string getDateTime() const { return dateTime; }

    void display() const {
        std::cout << "  " << quizTitle << " | " << score << "/" << total
                  << " (" << percent << "%) | " << dateTime << "\n";
    }

    // ---- File storage: R|studentId|quizId|student|quiz|score|total|percent|date ----
    std::string toLine() const {
        std::stringstream ss;
        ss << "R|" << studentId << "|" << quizId << "|" << studentName
           << "|" << quizTitle << "|" << score << "|" << total
           << "|" << percent << "|" << dateTime;
        return ss.str();
    }

    static Result fromLine(const std::string& line) {
        std::stringstream ss(line);
        std::string token;
        std::vector<std::string> parts;
        while (std::getline(ss, token, '|')) parts.push_back(token);

        Result r;
        if (parts.size() > 1) r.studentId = std::stoi(parts[1]);
        if (parts.size() > 2) r.quizId = std::stoi(parts[2]);
        if (parts.size() > 3) r.studentName = parts[3];
        if (parts.size() > 4) r.quizTitle = parts[4];
        if (parts.size() > 5) r.score = std::stoi(parts[5]);
        if (parts.size() > 6) r.total = std::stoi(parts[6]);
        if (parts.size() > 7) r.percent = std::stod(parts[7]);
        if (parts.size() > 8) r.dateTime = parts[8];
        return r;
    }
};

#endif
