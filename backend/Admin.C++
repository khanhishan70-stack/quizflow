// ============================================================
// QuizFlow — Admin (inherits User)
// Privileged role: manages quizzes and questions
// ============================================================
#ifndef QUIZFLOW_ADMIN_H
#define QUIZFLOW_ADMIN_H

#include <string>
#include <vector>
#include <sstream>
#include "User.h"

class Admin : public User {
public:
    Admin() : User() {}

    Admin(int id, const std::string& name, const std::string& email,
          const std::string& password)
        : User(id, name, email, password) {}

    std::string getRole() const override { return "Admin"; }

    void display() const override {
        std::cout << id << " | " << name << " | " << email << " | Admin\n";
    }

    // ---- File storage: A|id|name|email|password ----
    std::string toLine() const {
        std::stringstream ss;
        ss << "A|" << id << "|" << name << "|" << email << "|" << password;
        return ss.str();
    }

    static Admin fromLine(const std::string& line) {
        std::stringstream ss(line);
        std::string token;
        std::vector<std::string> parts;
        while (std::getline(ss, token, '|')) parts.push_back(token);

        Admin a;
        if (parts.size() > 1) a.id = std::stoi(parts[1]);
        if (parts.size() > 2) a.name = parts[2];
        if (parts.size() > 3) a.email = parts[3];
        if (parts.size() > 4) a.password = parts[4];
        return a;
    }
};

#endif
