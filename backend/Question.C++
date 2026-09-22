// ============================================================
// QuizFlow — Question model
// Encapsulation: text, 4 options, correct answer, explanation
// ============================================================
#ifndef QUIZFLOW_QUESTION_H
#define QUIZFLOW_QUESTION_H

#include <string>
#include <vector>
#include <sstream>
#include <iostream>

class Question {
private:
    std::string text;
    std::vector<std::string> options;   // exactly 4
    int correctIndex;                   // 0..3
    std::string explanation;

public:
    Question()
        : text(""), correctIndex(0), explanation("") {}

    Question(const std::string& text,
             const std::vector<std::string>& options,
             int correctIndex,
             const std::string& explanation = "")
        : text(text), options(options), correctIndex(correctIndex),
          explanation(explanation) {}

    std::string getText() const { return text; }
    std::vector<std::string> getOptions() const { return options; }
    int getCorrectIndex() const { return correctIndex; }
    std::string getExplanation() const { return explanation; }

    bool isCorrect(int choice) const { return choice == correctIndex; }

    void display() const {
        std::cout << "\n  " << text << "\n\n";
        const char* letters = "ABCD";
        for (size_t i = 0; i < options.size(); ++i) {
            std::cout << "     " << letters[i] << ". " << options[i] << "\n";
        }
    }

    // ---- File storage (| separated, '#' prefix for questions) ----
    std::string toLine() const {
        std::stringstream ss;
        ss << "#|" << text;
        for (size_t i = 0; i < options.size(); ++i) ss << "|" << options[i];
        ss << "|" << correctIndex << "|" << explanation;
        return ss.str();
    }

    static Question fromLine(const std::string& line) {
        std::stringstream ss(line);
        std::string token;
        std::vector<std::string> parts;
        while (std::getline(ss, token, '|')) parts.push_back(token);
        // parts: [0]=#, [1]=text, [2..5]=options, [6]=correct, [7]=explanation
        std::string text = (parts.size() > 1) ? parts[1] : "";
        std::vector<std::string> opts;
        for (size_t i = 2; i <= 5 && i < parts.size(); ++i) opts.push_back(parts[i]);
        while (opts.size() < 4) opts.push_back("");
        int correct = (parts.size() > 6) ? std::stoi(parts[6]) : 0;
        std::string expl = (parts.size() > 7) ? parts[7] : "";
        return Question(text, opts, correct, expl);
    }
};

#endif
