// ============================================================
// QuizFlow — Quiz model
// Composition: Quiz HAS-A vector of Question objects
// ============================================================
#ifndef QUIZFLOW_QUIZ_H
#define QUIZFLOW_QUIZ_H

#include <string>
#include <vector>
#include <sstream>
#include <iostream>
#include "Question.h"

class Quiz {
private:
    int id;
    std::string title;
    std::string category;
    int durationMinutes;
    std::vector<Question> questions;

public:
    Quiz()
        : id(0), title(""), category(""), durationMinutes(10) {}

    Quiz(int id, const std::string& title,
         const std::string& category, int durationMinutes = 10)
        : id(id), title(title), category(category),
          durationMinutes(durationMinutes) {}

    int getId() const { return id; }
    std::string getTitle() const { return title; }
    std::string getCategory() const { return category; }
    int getDurationMinutes() const { return durationMinutes; }
    size_t getQuestionCount() const { return questions.size(); }

    void setTitle(const std::string& t) { title = t; }
    void setCategory(const std::string& c) { category = c; }

    void addQuestion(const Question& q) { questions.push_back(q); }

    Question getQuestion(int index) const { return questions[index]; }

    void display() const {
        std::cout << "  [" << id << "] " << title
                  << "  (" << category << ")"
                  << "  " << questions.size() << " questions\n";
    }

    void displayFull() const {
        std::cout << "\n" << title << " — " << category << "\n"
                  << "Duration: " << durationMinutes << " min\n"
                  << "Questions: " << questions.size() << "\n";
        for (size_t i = 0; i < questions.size(); ++i) {
            std::cout << "\nQ" << i + 1 << ". ";
            questions[i].display();
        }
    }

    // ---- File storage ----
    std::string toHeader() const {
        std::stringstream ss;
        ss << "Q|" << id << "|" << title << "|" << category
           << "|" << durationMinutes << "|" << questions.size();
        return ss.str();
    }

    std::string toQuestionsBlock() const {
        std::stringstream ss;
        for (size_t i = 0; i < questions.size(); ++i)
            ss << questions[i].toLine() << "\n";
        return ss.str();
    }
};

#endif
