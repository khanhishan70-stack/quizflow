// ============================================================
// QuizFlow — C++ OOP Backend
// Base class: User (abstract) -> Student, Admin
// ============================================================
#ifndef QUIZFLOW_USER_H
#define QUIZFLOW_USER_H

#include <string>
#include <iostream>

class User {
protected:
    int id;
    std::string name;
    std::string email;
    std::string password;   // plain for demo only

public:
    User() : id(0), name(""), email(""), password("") {}

    User(int id, const std::string& name, const std::string& email,
         const std::string& password)
        : id(id), name(name), email(email), password(password) {}

    virtual ~User() {}

    int getId() const { return id; }
    std::string getName() const { return name; }
    std::string getEmail() const { return email; }

    // Pure virtual -> polymorphic role detection
    virtual std::string getRole() const = 0;

    bool checkPassword(const std::string& pw) const { return password == pw; }

    void setName(const std::string& n) { name = n; }

    virtual void display() const {
        std::cout << id << " | " << name << " | " << email
                  << " | " << getRole() << std::endl;
    }
};

#endif
