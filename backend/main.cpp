// ============================================================
// QuizFlow — Main entry point (console UI)
// Build:  g++ -std=c++17 main.cpp -o quizflow
// ============================================================
#include <iostream>
#include <string>
#include <limits>
#include "QuizSystem.h"

using namespace std;

void clearScreen() {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
}

void pauseScreen() {
    cout << "\nPress Enter to continue...";
    cin.ignore(numeric_limits<streamsize>::max(), '\n');
    cin.get();
}

void showMainMenu() {
    cout << "\n========================================\n"
         << "        QUIZFLOW  (Quiz Management)\n"
         << "========================================\n"
         << "  1. Register\n"
         << "  2. Login\n"
         << "  3. Exit\n"
         << "========================================\n"
         << "  Choose: ";
}

void showStudentMenu() {
    cout << "\n-------- STUDENT MENU --------\n"
         << "  1. Take a Quiz\n"
         << "  2. My Results\n"
         << "  3. Leaderboard\n"
         << "  4. Available Quizzes\n"
         << "  5. Logout\n"
         << "  Choose: ";
}

void showAdminMenu() {
    cout << "\n-------- ADMIN MENU --------\n"
         << "  1. Add Quiz\n"
         << "  2. Add Question to Quiz\n"
         << "  3. List Quizzes\n"
         << "  4. System Stats\n"
         << "  5. Quiz Performance\n"
         << "  6. Leaderboard\n"
         << "  7. Logout\n"
         << "  Choose: ";
}

void runStudentSession(QuizSystem& system, Student& student) {
    int choice;
    while (true) {
        showStudentMenu();
        cin >> choice;

        switch (choice) {
            case 1:
                system.takeQuiz(student);
                break;
            case 2:
                system.showMyResults(student.getId());
                break;
            case 3:
                system.showLeaderboard();
                break;
            case 4:
                cout << "\nAvailable quizzes:\n";
                system.listQuizzes();
                break;
            case 5:
                return;
            default:
                cout << "  [!] Invalid option.\n";
        }
        pauseScreen();
    }
}

void runAdminSession(QuizSystem& system) {
    int choice;
    while (true) {
        showAdminMenu();
        cin >> choice;

        switch (choice) {
            case 1: {
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                string title, category;
                int duration;
                cout << "  Quiz title: ";
                getline(cin, title);
                cout << "  Category: ";
                getline(cin, category);
                cout << "  Duration (minutes): ";
                cin >> duration;
                system.addQuiz(title, category, duration);
                break;
            }
            case 2: {
                system.listQuizzes();
                int id;
                cout << "\n  Quiz ID: ";
                cin >> id;
                cin.ignore(numeric_limits<streamsize>::max(), '\n');

                string text;
                cout << "  Question text: ";
                getline(cin, text);

                vector<string> options(4);
                for (int i = 0; i < 4; ++i) {
                    cout << "  Option " << char('A' + i) << ": ";
                    getline(cin, options[i]);
                }
                int correct;
                cout << "  Correct option (1-4): ";
                cin >> correct;
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                correct = (correct >= 1 && correct <= 4) ? correct - 1 : 0;

                string expl;
                cout << "  Explanation (optional): ";
                getline(cin, expl);

                system.addQuestionToQuiz(id,
                    Question(text, options, correct, expl));
                break;
            }
            case 3:
                cout << "\nAvailable quizzes:\n";
                system.listQuizzes();
                break;
            case 4:
                system.showStats();
                break;
            case 5:
                system.showQuizPerformance();
                break;
            case 6:
                system.showLeaderboard();
                break;
            case 7:
                return;
            default:
                cout << "  [!] Invalid option.\n";
        }
        pauseScreen();
    }
}

int main() {
    QuizSystem system;
    system.loadAll();

    int choice;
    while (true) {
        clearScreen();
        showMainMenu();
        cin >> choice;

        if (choice == 3) {
            cout << "\n  Goodbye! Thanks for using QuizFlow.\n";
            break;
        }

        if (choice == 1) {
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            string name, email, password;
            cout << "\n-- Registration --\n";
            cout << "  Full name : ";
            getline(cin, name);
            cout << "  Email     : ";
            getline(cin, email);
            cout << "  Password  : ";
            getline(cin, password);
            system.registerStudent(name, email, password);
            pauseScreen();
        } else if (choice == 2) {
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            string email, password;
            cout << "\n-- Login --\n";
            cout << "  Email    : ";
            getline(cin, email);
            cout << "  Password : ";
            getline(cin, password);

            User* user = system.login(email, password);
            if (!user) {
                cout << "\n  [!] Invalid email or password.\n";
                pauseScreen();
                continue;
            }

            // Polymorphic dispatch based on runtime role
            if (user->getRole() == "Student") {
                Student* s = dynamic_cast<Student*>(user);
                clearScreen();
                cout << "\n  Welcome back, " << s->getName() << "! 🧠\n"
                     << "  Average score: " << s->getAverageScore() << "%\n"
                     << "  Current streak: " << s->getCurrentStreak() << "\n";
                runStudentSession(system, *s);
            } else if (user->getRole() == "Admin") {
                Admin* a = dynamic_cast<Admin*>(user);
                clearScreen();
                cout << "\n  Welcome, Administrator " << a->getName() << "!\n";
                runAdminSession(system);
            }
        } else {
            cout << "  [!] Invalid option.\n";
            pauseScreen();
        }
    }

    system.saveAll();
    return 0;
}
