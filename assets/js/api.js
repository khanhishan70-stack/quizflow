/* ============================================================
   QuizFlow — Mock API layer
   Mirrors the future C++ OOP backend endpoints:
     POST /api/login      →  login()
     POST /api/register   →  register()
     GET  /api/dashboard  →  getDashboard()
     GET  /api/quizzes    →  getQuizzes()
     GET  /api/quiz/:id   →  getQuiz(id)
     POST /api/quiz/:id/submit → submitQuiz()
     GET  /api/results    →  getResults()
     GET  /api/leaderboard→  getLeaderboard()
   Admin: /api/admin/*    →  getAdminStats, CRUD quiz/question
   Data is stored in localStorage so the whole app runs in the
   browser today. Swap these bodies for fetch() to the C++ server
   later — the signatures stay the same.
   ============================================================ */

(function () {
  'use strict';

  var DB_KEY = 'quizflow_db_v3';
  var LATENCY = 260;

  function delay(value) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(value); }, LATENCY);
    });
  }

  /* ----------------------------------------------------------
     Seed data
     ---------------------------------------------------------- */
  function buildSeed() {
    var now = new Date();
    function daysAgo(n) {
      var d = new Date(now);
      d.setDate(d.getDate() - n);
      return d.toISOString();
    }

    var users = [
      { id: 1, name: 'System Admin', email: 'admin@quizflow.com', password: 'admin123', role: 'Admin' },
      { id: 2, name: 'Ayesha Khan', email: 'demo@quizflow.com', password: 'quizflow', role: 'Student' },
      { id: 3, name: 'Rohan Mehta', email: 'rohan@quizflow.com', password: 'demo', role: 'Student' },
      { id: 4, name: 'Sneha Iyer', email: 'sneha@quizflow.com', password: 'demo', role: 'Student' },
      { id: 5, name: 'Arjun Nair', email: 'arjun@quizflow.com', password: 'demo', role: 'Student' },
      { id: 6, name: 'Priya Sharma', email: 'priya@quizflow.com', password: 'demo', role: 'Student' },
      { id: 7, name: 'Kabir Singh', email: 'kabir@quizflow.com', password: 'demo', role: 'Student' },
      { id: 8, name: 'Meera Patel', email: 'meera@quizflow.com', password: 'demo', role: 'Student' }
    ];

    var quizzes = [
      {
        id: 1,
        title: 'DTM — Digital Techniques & Microprocessor',
        short: 'DTM',
        category: 'Digital Techniques & Microprocessor',
        icon: '🔌',
        duration: 5,
        questions: [
          { text: 'Which number system uses only 0 and 1?', options: ['Binary', 'Octal', 'Decimal', 'Hexadecimal'], correctIndex: 0, explanation: 'Binary has two digits: 0 and 1.' },
          { text: 'One nibble is equal to:', options: ['2 bits', '4 bits', '8 bits', '16 bits'], correctIndex: 1, explanation: 'A nibble is half a byte = 4 bits.' },
          { text: 'Which logic gate outputs 1 only when ALL inputs are 1?', options: ['OR', 'NAND', 'AND', 'XOR'], correctIndex: 2, explanation: 'AND outputs high only if every input is high.' },
          { text: 'Which gate is known as a universal gate?', options: ['AND', 'OR', 'NAND', 'XOR'], correctIndex: 2, explanation: 'NAND alone can build any logic circuit.' },
          { text: 'The binary equivalent of decimal 5 is:', options: ['100', '110', '101', '111'], correctIndex: 2, explanation: '5 = 4 + 1 → 101.' },
          { text: 'A flip-flop can store how many bits?', options: ['1 bit', '4 bits', '8 bits', '16 bits'], correctIndex: 0, explanation: 'A flip-flop stores a single bit.' },
          { text: 'Which flip-flop has no invalid state?', options: ['SR flip-flop', 'D flip-flop', 'T flip-flop', 'JK flip-flop'], correctIndex: 3, explanation: 'The JK flip-flop resolves the SR race condition.' },
          { text: 'The 8085 microprocessor is a:', options: ['8-bit processor', '16-bit processor', '32-bit processor', '64-bit processor'], correctIndex: 0, explanation: 'The 8085 is an 8-bit microprocessor.' },
          { text: 'Which register holds the address of the next instruction in 8085?', options: ['Accumulator', 'Program Counter', 'Stack Pointer', 'Flag register'], correctIndex: 1, explanation: 'The Program Counter points to the next instruction.' },
          { text: 'The decimal equivalent of binary 1101 is:', options: ['11', '12', '13', '15'], correctIndex: 2, explanation: '8 + 4 + 0 + 1 = 13.' },
          { text: 'Which gate produces the complement of its input?', options: ['AND', 'OR', 'NOT', 'XOR'], correctIndex: 2, explanation: 'NOT inverts a single input.' },
          { text: 'A full adder adds how many input bits?', options: ['Two', 'Three', 'Four', 'Eight'], correctIndex: 1, explanation: 'It adds two bits plus a carry-in.' },
          { text: 'Which counter can count both up and down?', options: ['Ripple counter', 'Ring counter', 'Up-down counter', 'Modulo counter'], correctIndex: 2, explanation: 'Up-down counters can increment or decrement.' },
          { text: 'In the 8085, arithmetic operations are performed in the:', options: ['Stack Pointer', 'Accumulator', 'Instruction register', 'Status register'], correctIndex: 1, explanation: 'The accumulator holds operands and results.' },
          { text: 'Which memory type is volatile?', options: ['ROM', 'PROM', 'RAM', 'EPROM'], correctIndex: 2, explanation: 'RAM loses data when power is removed.' }
        ]
      },
      {
        id: 2,
        title: 'DSU — Data Structures using C',
        short: 'DSU',
        category: 'Data Structures using C',
        icon: '🧮',
        duration: 5,
        questions: [
          { text: 'Which data structure works on the LIFO principle?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correctIndex: 1, explanation: 'Stack = Last In First Out.' },
          { text: 'Which data structure works on the FIFO principle?', options: ['Stack', 'Queue', 'Array', 'Linked List'], correctIndex: 1, explanation: 'Queue = First In First Out.' },
          { text: 'The time complexity of binary search in the worst case is:', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], correctIndex: 1, explanation: 'Binary search halves the search space each step.' },
          { text: 'Which data structure stores elements in key-value pairs?', options: ['Queue', 'Stack', 'Hash Table', 'Array'], correctIndex: 2, explanation: 'Hash tables map keys to values.' },
          { text: 'The worst-case time complexity of insertion sort is:', options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'], correctIndex: 2, explanation: 'Insertion sort is O(n^2) in the worst case.' },
          { text: 'A binary tree in which every node has at most two children is called:', options: ['Binary tree', 'Heap', 'Graph', 'Linked list'], correctIndex: 0, explanation: 'Binary trees have at most two children per node.' },
          { text: 'Which traversal visits nodes in left, root, right order?', options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'], correctIndex: 1, explanation: 'In-order traversal = left, root, right.' },
          { text: 'The number of comparisons in the best case of bubble sort is:', options: ['O(1)', 'O(n)', 'O(n^2)', 'O(log n)'], correctIndex: 1, explanation: 'In the best case (sorted), only O(n) comparisons are made.' },
          { text: 'A queue that allows insertion at both ends is called a:', options: ['Priority queue', 'Circular queue', 'Deque', 'Stack'], correctIndex: 2, explanation: 'A deque allows insertion/deletion at both ends.' },
          { text: 'The maximum number of nodes in a binary tree of height h is:', options: ['h', '2^h', '2^(h+1) - 1', 'h^2'], correctIndex: 2, explanation: 'A perfect binary tree of height h has 2^(h+1) - 1 nodes.' },
          { text: 'Which algorithm uses a divide-and-conquer approach?', options: ['Bubble sort', 'Merge sort', 'Insertion sort', 'Selection sort'], correctIndex: 1, explanation: 'Merge sort divides and conquers recursively.' },
          { text: 'The height of an empty tree is:', options: ['0', '1', '-1', 'Undefined'], correctIndex: 2, explanation: 'By convention an empty tree has height -1.' },
          { text: 'A stack overflow occurs when:', options: ['Stack is empty', 'Stack is full', 'Queue is full', 'Tree is empty'], correctIndex: 1, explanation: 'Pushing onto a full stack causes overflow.' },
          { text: 'Linked list nodes contain:', options: ['Only data', 'Data and a pointer', 'Only a pointer', 'Index numbers'], correctIndex: 1, explanation: 'Each node stores data and a reference to the next node.' },
          { text: 'Which structure is best for implementing a recursion stack?', options: ['Queue', 'Array', 'Stack', 'Heap'], correctIndex: 2, explanation: 'Recursion uses an implicit stack.' }
        ]
      },
      {
        id: 3,
        title: 'OOP — Object Oriented Programming using C++',
        short: 'OOP',
        category: 'Object Oriented Programming using C++',
        icon: '💻',
        duration: 5,
        questions: [
          { text: 'Which OOP concept allows a class to acquire properties from another class?', options: ['Encapsulation', 'Inheritance', 'Abstraction', 'Polymorphism'], correctIndex: 1, explanation: 'Inheritance lets a child class reuse a parent class.' },
          { text: 'Which OOP feature bundles data and the methods that operate on it?', options: ['Inheritance', 'Encapsulation', 'Overloading', 'Recursion'], correctIndex: 1, explanation: 'Encapsulation binds data and functions together.' },
          { text: 'Which keyword is used to define a class in C++?', options: ['struct', 'class', 'object', 'public'], correctIndex: 1, explanation: 'class is the keyword for a class.' },
          { text: 'A constructor in C++ is used to:', options: ['Destroy an object', 'Initialize an object', 'Copy an object', 'Delete an object'], correctIndex: 1, explanation: 'Constructors initialize objects.' },
          { text: 'Which of the following is NOT an object-oriented language?', options: ['C++', 'Java', 'C', 'Python'], correctIndex: 2, explanation: 'C is a procedural language.' },
          { text: 'Polymorphism in C++ can be achieved using:', options: ['Functions and overloading', 'Virtual functions', 'Both overloading and virtual functions', 'Only inheritance'], correctIndex: 2, explanation: 'Compile-time (overloading) and run-time (virtual) polymorphism both exist.' },
          { text: 'What is an object in OOP?', options: ['A variable', 'An instance of a class', 'A function', 'A file'], correctIndex: 1, explanation: 'An object is an instance of a class.' },
          { text: 'The member functions declared inside a class are by default:', options: ['private', 'public', 'protected', 'global'], correctIndex: 0, explanation: 'Class members are private by default in C++.' },
          { text: 'Which specifier makes a member accessible only within the same class?', options: ['public', 'protected', 'private', 'static'], correctIndex: 2, explanation: 'private members are only accessible inside the class.' },
          { text: 'What is the size of an empty class in C++?', options: ['0 bytes', '1 byte', '4 bytes', '8 bytes'], correctIndex: 1, explanation: 'An empty class occupies at least 1 byte.' },
          { text: 'A virtual function is used to achieve:', options: ['Encapsulation', 'Compile-time polymorphism', 'Run-time polymorphism', 'Data hiding'], correctIndex: 2, explanation: 'Virtual functions enable dynamic dispatch at runtime.' },
          { text: 'Which access specifier allows a derived class to access members?', options: ['private', 'protected', 'static', 'const'], correctIndex: 1, explanation: 'protected members are accessible in derived classes.' },
          { text: 'The destructor of a class is called when:', options: ['The class is defined', 'An object goes out of scope', 'A function returns', 'The program starts'], correctIndex: 1, explanation: 'Destructors clean up when objects are destroyed.' },
          { text: 'What does the "friend" keyword do in C++?', options: ['Makes a class public', 'Grants access to private members', 'Creates a new class', 'Deletes an object'], correctIndex: 1, explanation: 'A friend function/class can access private members.' },
          { text: 'Which operator can be overloaded in C++?', options: ['+', '::', '.', 'sizeof'], correctIndex: 0, explanation: '+ is overloadable; scope resolution and dot are not.' },
          { text: 'An abstract class in C++ contains:', options: ['Only data members', 'At least one pure virtual function', 'Only static functions', 'No functions'], correctIndex: 1, explanation: 'Abstract classes have at least one pure virtual function.' },
          { text: 'A pure virtual function is declared using:', options: ['= 0', '= null', 'virtual 0', 'pure'], correctIndex: 0, explanation: 'e.g. virtual void draw() = 0;' },
          { text: 'Which of these is an example of multiple inheritance?', options: ['A class with two base classes', 'A class with one base class', 'A base class with two children', 'Nested classes'], correctIndex: 0, explanation: 'Multiple inheritance means one class inherits from more than one base.' },
          { text: 'The "this" pointer refers to:', options: ['The class itself', 'The calling object', 'A static object', 'The parent object'], correctIndex: 1, explanation: 'this points to the object that invoked the member function.' },
          { text: 'Static data members of a class are:', options: ['Per object', 'Shared across all objects', 'Always public', 'Always private'], correctIndex: 1, explanation: 'Static members belong to the class, shared by all objects.' }
        ]
      },
      {
        id: 4,
        title: 'AMT — Applied Multimedia Techniques',
        short: 'AMT',
        category: 'Applied Multimedia Techniques',
        icon: '🎬',
        duration: 5,
        questions: [
          { text: 'Which of these is NOT a multimedia element?', options: ['Text', 'Audio', 'Video', 'Database'], correctIndex: 3, explanation: 'Multimedia combines text, graphics, audio, video and animation.' },
          { text: 'JPEG is a compressed format used for:', options: ['Images', 'Audio', 'Video', 'Text'], correctIndex: 0, explanation: 'JPEG is a lossy image format.' },
          { text: 'Which file format is commonly used for animated graphics?', options: ['JPEG', 'PNG', 'GIF', 'BMP'], correctIndex: 2, explanation: 'GIF supports simple animations.' },
          { text: 'MP3 is a file format for:', options: ['Images', 'Audio', 'Video', 'Documents'], correctIndex: 1, explanation: 'MP3 is a compressed audio format.' },
          { text: 'Which audio format is uncompressed?', options: ['WAV', 'MP3', 'AAC', 'OGG'], correctIndex: 0, explanation: 'WAV stores raw, uncompressed audio.' },
          { text: 'Which HTML5 element is used to embed video?', options: ['<video>', '<movie>', '<media>', '<stream>'], correctIndex: 0, explanation: 'HTML5 introduced the <video> element.' },
          { text: 'Which standard is used for video compression?', options: ['ZIP', 'MPEG', 'WAV', 'TXT'], correctIndex: 1, explanation: 'MPEG defines video compression standards.' },
          { text: 'Converting analog audio into digital form is called:', options: ['Encoding', 'Sampling', 'Compressing', 'Filtering'], correctIndex: 1, explanation: 'Sampling converts a continuous signal to discrete values.' },
          { text: 'The smallest unit of a digital image is a:', options: ['Pixel', 'Vector', 'Bitmap', 'Dot'], correctIndex: 0, explanation: 'A pixel is the smallest addressable image element.' },
          { text: 'Which image format supports transparency?', options: ['JPEG', 'GIF', 'PNG', 'BMP'], correctIndex: 2, explanation: 'PNG supports alpha-channel transparency.' },
          { text: 'Which of these is a lossy compression format?', options: ['JPEG', 'PNG', 'ZIP', 'TIFF'], correctIndex: 0, explanation: 'JPEG discards data to reduce file size.' },
          { text: 'Streaming media means:', options: ['Downloading fully before playing', 'Playing while the data downloads', 'Compressing media', 'Editing media live'], correctIndex: 1, explanation: 'Streaming plays content as it is received.' },
          { text: 'Which software is commonly used to edit videos?', options: ['MS Word', 'Adobe Premiere Pro', 'Notepad', 'Paint'], correctIndex: 1, explanation: 'Premiere Pro is a professional video editor.' },
          { text: 'Animation that automatically creates in-between frames is called:', options: ['Keyframing', 'Tweening', 'Rendering', 'Masking'], correctIndex: 1, explanation: 'Tweening interpolates frames between keyframes.' },
          { text: 'A 24-bit color depth supports about:', options: ['256 colors', '65,536 colors', '16.7 million colors', '4 billion colors'], correctIndex: 2, explanation: '24-bit = 2^24 ≈ 16.7 million colors.' }
        ]
      },
      {
        id: 5,
        title: 'EIC — Essence of Indian Constitution',
        short: 'EIC',
        category: 'Essence of Indian Constitution',
        icon: '📜',
        duration: 5,
        questions: [
          { text: 'The Indian Constitution was adopted on:', options: ['15 August 1947', '26 January 1950', '26 November 1949', '2 October 1949'], correctIndex: 2, explanation: 'Adopted on 26 November 1949.' },
          { text: 'Who was the Chairman of the Drafting Committee?', options: ['Jawaharlal Nehru', 'Sardar Patel', 'Rajendra Prasad', 'Dr. B. R. Ambedkar'], correctIndex: 3, explanation: 'Dr. B. R. Ambedkar chaired the Drafting Committee.' },
          { text: 'The Constitution of India came into force on:', options: ['26 January 1950', '15 August 1947', '26 November 1949', '2 October 1950'], correctIndex: 0, explanation: 'It became effective on 26 January 1950 (Republic Day).' },
          { text: 'The Preamble declares India to be a:', options: ['Sovereign Democratic Republic', 'Socialist Republic', 'Secular Republic', 'Sovereign Socialist Secular Democratic Republic'], correctIndex: 3, explanation: 'The full description includes all four words.' },
          { text: 'How many Fundamental Rights are currently guaranteed?', options: ['Five', 'Six', 'Seven', 'Eight'], correctIndex: 1, explanation: 'Six rights remain after the 44th Amendment removed property rights.' },
          { text: 'Which Article abolishes untouchability?', options: ['Article 14', 'Article 17', 'Article 21', 'Article 32'], correctIndex: 1, explanation: 'Article 17 abolishes untouchability.' },
          { text: 'The Supreme Court is considered the guardian of the:', options: ['Parliament', 'President', 'Constitution', 'Judiciary'], correctIndex: 2, explanation: 'It protects the Constitution through judicial review.' },
          { text: 'The Directive Principles of State Policy are borrowed from:', options: ['USA', 'UK', 'Ireland', 'France'], correctIndex: 2, explanation: 'The DPSP concept comes from Ireland.' },
          { text: 'The Fundamental Rights in the Constitution are borrowed from:', options: ['USA', 'Britain', 'Japan', 'Russia'], correctIndex: 0, explanation: 'Fundamental Rights are inspired by the US Bill of Rights.' },
          { text: 'The minimum age to become the President of India is:', options: ['25', '30', '32', '35'], correctIndex: 3, explanation: 'A candidate must be at least 35 years old.' },
          { text: 'Fundamental Rights are covered under which Part of the Constitution?', options: ['Part I', 'Part II', 'Part III', 'Part IV'], correctIndex: 2, explanation: 'Part III contains Articles 12–35.' },
          { text: 'The Preamble of the Constitution begins with:', options: ['We, the People of India', 'In the name of God', 'The Parliament of India', 'All citizens of India'], correctIndex: 0, explanation: 'It begins "WE, THE PEOPLE OF INDIA".' },
          { text: 'Who has the power to amend the Constitution?', options: ['The President', 'The Parliament', 'The Supreme Court', 'The Cabinet'], correctIndex: 1, explanation: 'Parliament can amend under Article 368.' },
          { text: 'The concept of Judicial Review is borrowed from:', options: ['USA', 'Canada', 'Australia', 'Ireland'], correctIndex: 0, explanation: 'Judicial review follows the US model.' },
          { text: 'Which schedule lists the official languages of India?', options: ['Seventh Schedule', 'Eighth Schedule', 'Ninth Schedule', 'Tenth Schedule'], correctIndex: 1, explanation: 'The Eighth Schedule lists recognized languages.' }
        ]
      }
    ];

    var attempts = [
      { id: 1, userId: 2, userName: 'Ayesha Khan', quizId: 3, quizTitle: 'OOP — Object Oriented Programming using C++', category: 'Object Oriented Programming using C++', score: 14, total: 20, percent: 70, timeTaken: 240, date: daysAgo(1) },
      { id: 2, userId: 2, userName: 'Ayesha Khan', quizId: 2, quizTitle: 'DSU — Data Structures using C', category: 'Data Structures using C', score: 12, total: 15, percent: 80, timeTaken: 210, date: daysAgo(3) },
      { id: 3, userId: 3, userName: 'Rohan Mehta', quizId: 1, quizTitle: 'DTM — Digital Techniques & Microprocessor', category: 'Digital Techniques & Microprocessor', score: 13, total: 15, percent: 87, timeTaken: 200, date: daysAgo(2) },
      { id: 4, userId: 4, userName: 'Sneha Iyer', quizId: 3, quizTitle: 'OOP — Object Oriented Programming using C++', category: 'Object Oriented Programming using C++', score: 17, total: 20, percent: 85, timeTaken: 230, date: daysAgo(1) },
      { id: 5, userId: 5, userName: 'Arjun Nair', quizId: 4, quizTitle: 'AMT — Applied Multimedia Techniques', category: 'Applied Multimedia Techniques', score: 12, total: 15, percent: 80, timeTaken: 180, date: daysAgo(1) },
      { id: 6, userId: 6, userName: 'Priya Sharma', quizId: 5, quizTitle: 'EIC — Essence of Indian Constitution', category: 'Essence of Indian Constitution', score: 13, total: 15, percent: 87, timeTaken: 190, date: daysAgo(2) },
      { id: 7, userId: 7, userName: 'Kabir Singh', quizId: 1, quizTitle: 'DTM — Digital Techniques & Microprocessor', category: 'Digital Techniques & Microprocessor', score: 14, total: 15, percent: 93, timeTaken: 170, date: daysAgo(3) },
      { id: 8, userId: 8, userName: 'Meera Patel', quizId: 2, quizTitle: 'DSU — Data Structures using C', category: 'Data Structures using C', score: 11, total: 15, percent: 73, timeTaken: 220, date: daysAgo(4) }
    ];

    return {
      users: users,
      quizzes: quizzes,
      attempts: attempts,
      nextUserId: 9,
      nextQuizId: 6,
      nextAttemptId: 9
    };
  }

  /* ----------------------------------------------------------
     Storage helpers
     ---------------------------------------------------------- */
  function loadDB() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to seed */ }
    var db = buildSeed();
    saveDB(db);
    return db;
  }

  function saveDB(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* storage full / private mode */ }
  }

  function sanitize(user) {
    if (!user) return null;
    var copy = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    return copy;
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ----------------------------------------------------------
     Syllabus data — chapters, topics and question banks per
     subject. Each question is tagged with a chapter (topic) and
     a difficulty so the generator can build a custom quiz.
     ---------------------------------------------------------- */
  function q(text, options, correctIndex, explanation, topic, difficulty) {
    return {
      text: text,
      options: options,
      correctIndex: correctIndex,
      explanation: explanation,
      topic: topic,
      difficulty: difficulty
    };
  }

  var SUBJECTS = {
    1: {
      id: 1, short: 'DTM', category: 'Digital Techniques & Microprocessor', icon: '🔌',
      description: 'Number systems, logic gates, combinational & sequential circuits and the 8085 microprocessor.',
      chapters: [
        { id: 'c1', title: 'Number System and Codes', topics: ['Binary, Octal, Decimal & Hexadecimal', 'Number System Conversions', "BCD, Gray & Excess-3 Codes", "1's & 2's Complement", 'Signed Number Representation'] },
        { id: 'c2', title: 'Logic Gates and Boolean Algebra', topics: ['Basic & Universal Logic Gates', 'Boolean Laws & De Morgan\'s Theorems', 'SOP & POS Forms', 'K-Map Simplification'] },
        { id: 'c3', title: 'Combinational Logic Circuits', topics: ['Half & Full Adder/Subtractor', 'BCD Adder', 'Encoder, Decoder & 7-Segment Display', 'Multiplexer & Demultiplexer'] },
        { id: 'c4', title: 'Sequential Logic Circuits', topics: ['SR, D, JK & T Flip-flops', 'Triggering & Master-Slave', 'Shift Registers', 'Ripple, Synchronous & Decade Counters'] },
        { id: 'c5', title: '8085 Microprocessor', topics: ['8085 Architecture & Registers', 'Pin Diagram, Buses & Memory', 'Instruction Set & Addressing Modes', 'Interrupts, Timing & Programming'] }
      ],
      bank: [
        q('Which number system uses only the digits 0 and 1?', ['Binary', 'Octal', 'Decimal', 'Hexadecimal'], 0, 'Binary has exactly two digits: 0 and 1.', 'c1', 'easy'),
        q('The decimal equivalent of binary 1010 is:', ['8', '9', '10', '12'], 2, '1010 = 8 + 0 + 2 + 0 = 10.', 'c1', 'easy'),
        q('A group of 8 bits is called a:', ['Nibble', 'Byte', 'Word', 'Block'], 1, 'A byte is exactly 8 bits.', 'c1', 'easy'),
        q("The 1's complement of 1010 is:", ['0101', '0110', '1011', '1101'], 0, "Flip every bit: 1010 -> 0101.", 'c1', 'medium'),
        q('Which code represents each decimal digit using 4 bits?', ['BCD', 'Gray code', 'Octal code', 'ASCII'], 0, 'BCD uses 4 bits per decimal digit.', 'c1', 'medium'),
        q("The 2's complement of 1100 (4-bit) is:", ['0011', '0100', '1100', '0111'], 1, "Invert to 0011 then add 1 -> 0100.", 'c1', 'hard'),
        q('Which logic gate outputs 1 only when ALL inputs are 1?', ['OR', 'NAND', 'AND', 'XOR'], 2, 'AND is high only when every input is high.', 'c2', 'easy'),
        q('Which gate is known as a universal gate?', ['AND', 'OR', 'NAND', 'XOR'], 2, 'NAND alone can build any logic circuit.', 'c2', 'easy'),
        q('A NOT gate is also called an:', ['Inverter', 'Buffer', 'Half-adder', 'Multiplexer'], 0, 'NOT complements its input.', 'c2', 'easy'),
        q("De Morgan's law states that (A.B)' equals:", ["A' + B'", "A' . B'", 'A + B', 'A . B'], 0, "(A.B)' = A' + B'.", 'c2', 'medium'),
        q('Which law states that A + A = A?', ['Idempotent law', 'Distributive law', 'Commutative law', 'Absorption law'], 0, 'Idempotent law: A + A = A.', 'c2', 'medium'),
        q('The Boolean expression for XOR is:', ["A'B + AB'", 'A + B', 'AB', "A'B'"], 0, 'XOR is true when the inputs differ.', 'c2', 'hard'),
        q('A half adder adds two bits and produces:', ['Sum and carry', 'Difference and borrow', 'Product', 'Quotient'], 0, 'Half adder gives sum and carry output.', 'c3', 'easy'),
        q('Which circuit adds two bits plus a carry-in?', ['Full adder', 'Half adder', 'Decoder', 'Demultiplexer'], 0, 'A full adder has 3 inputs.', 'c3', 'easy'),
        q('A multiplexer with n select lines has up to how many inputs?', ['2^n', 'n', 'n^2', '2n'], 0, 'MUX selects 1 of 2^n inputs.', 'c3', 'medium'),
        q('A decoder with 3 inputs produces how many outputs?', ['8', '4', '16', '6'], 0, '3-to-8 decoder: 2^3 = 8 outputs.', 'c3', 'medium'),
        q('IC 7447 is a:', ['BCD to 7-segment decoder', 'Multiplexer', 'Shift register', 'Counter'], 0, 'IC 7447 drives 7-segment displays.', 'c3', 'hard'),
        q('A demultiplexer has:', ['1 input and multiple outputs', 'Multiple inputs and 1 output', 'Equal inputs and outputs', 'No select line'], 0, 'DEMUX routes one input to many.', 'c3', 'hard'),
        q('A flip-flop can store how many bits?', ['1 bit', '2 bits', '4 bits', '8 bits'], 0, 'A flip-flop is a 1-bit memory element.', 'c4', 'easy'),
        q('Which flip-flop has no invalid state?', ['JK', 'SR', 'D', 'T'], 0, 'JK flip-flop eliminates the SR invalid state.', 'c4', 'easy'),
        q('The SR flip-flop has an invalid state when both S and R are:', ['1', '0', 'Low', 'High-Z'], 0, 'S = R = 1 causes an undefined state.', 'c4', 'medium'),
        q('A 4-bit ripple counter counts from:', ['0 to 15', '0 to 31', '1 to 16', '0 to 7'], 0, '4 bits -> 16 states, 0 to 15.', 'c4', 'medium'),
        q('The master-slave configuration avoids:', ['Race around condition', 'Setup time violation', 'Hold time violation', 'Clock skew'], 0, 'Master-slave prevents toggling race.', 'c4', 'hard'),
        q('Which counter can count both up and down?', ['Up-down counter', 'Ripple counter', 'Ring counter', 'Modulo counter'], 0, 'Up-down counter has control for direction.', 'c4', 'hard'),
        q('The 8085 microprocessor is an ______ bit processor.', ['8', '16', '32', '64'], 0, 'The 8085 has 8 data lines.', 'c5', 'easy'),
        q('Which register holds the address of the next instruction?', ['Program Counter', 'Accumulator', 'Stack Pointer', 'Flag register'], 0, 'The PC points to the next instruction.', 'c5', 'easy'),
        q('How many address lines does the 8085 have?', ['8', '16', '24', '32'], 1, '16 address lines -> 64 KB address space.', 'c5', 'medium'),
        q('Which interrupt has the highest priority in 8085?', ['TRAP', 'RST 7.5', 'RST 6.5', 'INTR'], 0, 'TRAP is non-maskable and highest priority.', 'c5', 'medium'),
        q('The instruction "MVI A, 25H" uses which addressing mode?', ['Immediate', 'Direct', 'Register', 'Register indirect'], 0, 'Data 25H is given in the instruction itself.', 'c5', 'hard'),
        q('How many flags does the 8085 have?', ['4', '5', '6', '8'], 1, 'Flags: S, Z, AC, P, CY (5 flags).', 'c5', 'hard')
      ]
    },
    2: {
      id: 2, short: 'DSU', category: 'Data Structures using C', icon: '🧮',
      description: 'Arrays, linked lists, stacks, queues, trees and sorting algorithms implemented in C.',
      chapters: [
        { id: 'c1', title: 'Introduction to Data Structures', topics: ['Data Types & Abstract Data Types', 'Algorithms & Complexity', 'Time & Space Trade-offs', 'Recursion'] },
        { id: 'c2', title: 'Arrays and Strings', topics: ['One Dimensional Arrays', 'Two Dimensional Arrays & Matrices', 'Strings & String Operations'] },
        { id: 'c3', title: 'Stacks and Queues', topics: ['Stack Operations & Applications', 'Queue Operations', 'Circular Queue & Deque'] },
        { id: 'c4', title: 'Linked Lists', topics: ['Singly Linked List', 'Doubly & Circular Linked Lists', 'Insertion, Deletion & Traversal'] },
        { id: 'c5', title: 'Trees', topics: ['Binary Trees & Binary Search Trees', 'Tree Traversals', 'Expression Trees & Tree Height'] },
        { id: 'c6', title: 'Sorting and Searching', topics: ['Bubble, Insertion & Selection Sort', 'Merge & Quick Sort', 'Linear & Binary Search'] }
      ],
      bank: [
        q('Time complexity of an algorithm measures:', ['Running time vs input size', 'Memory used', 'Number of variables', 'Code length'], 0, 'It describes how runtime grows with input.', 'c1', 'easy'),
        q('An Abstract Data Type specifies:', ['Data and the operations on it', 'Only data types', 'Only functions', 'Memory addresses'], 0, 'ADT defines data plus allowed operations.', 'c1', 'easy'),
        q('Big-O notation describes the:', ['Upper bound of growth', 'Average case only', 'Exact runtime', 'Lower bound'], 0, 'Big-O gives the worst-case growth rate.', 'c1', 'medium'),
        q('Recursion is a technique where a function:', ['Calls itself', 'Calls another program', 'Loops infinitely', 'Returns nothing'], 0, 'A recursive function invokes itself with a smaller input.', 'c1', 'medium'),
        q('Space complexity counts:', ['Memory used by the algorithm', 'File size', 'Network bandwidth', 'CPU speed'], 0, 'It measures extra memory needed.', 'c1', 'hard'),
        q('If an algorithm is O(n) and input doubles, the time:', ['Roughly doubles', 'Quadruples', 'Stays same', 'Triples'], 0, 'O(n) means linear growth.', 'c1', 'hard'),
        q('Arrays store elements at:', ['Contiguous memory locations', 'Random locations', 'Linked nodes', 'Stacks'], 0, 'Array elements are adjacent in memory.', 'c2', 'easy'),
        q('Array indexing in C starts from:', ['0', '1', '-1', 'Depends on compiler'], 0, 'C arrays are zero-indexed.', 'c2', 'easy'),
        q('A C string is always terminated by:', ["'\\0'", "'\\n'", "'.'", "' '"], 0, 'C strings end with a null character.', 'c2', 'easy'),
        q('Inserting at the beginning of an array takes:', ['O(n)', 'O(1)', 'O(log n)', 'O(n^2)'], 0, 'All elements must shift right.', 'c2', 'medium'),
        q('Accessing an array element by index takes:', ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'], 0, 'Direct indexing is constant time.', 'c2', 'medium'),
        q('If int a[5] is declared, a[5] is:', ['Out of bounds', 'The 5th element', '0', 'Undefined'], 0, 'Valid indices are 0 to 4.', 'c2', 'hard'),
        q('Which data structure works on the LIFO principle?', ['Stack', 'Queue', 'Tree', 'Array'], 0, 'Stack = Last In First Out.', 'c3', 'easy'),
        q('Which data structure works on the FIFO principle?', ['Queue', 'Stack', 'Heap', 'Linked list'], 0, 'Queue = First In First Out.', 'c3', 'easy'),
        q('Popping from an empty stack causes:', ['Stack underflow', 'Stack overflow', 'Null access', 'Deadlock'], 0, 'Underflow = pop from empty stack.', 'c3', 'medium'),
        q('A circular queue mainly helps to:', ['Reuse freed slots', 'Speed sorting', 'Store strings', 'Save memory'], 0, 'Circular queue recycles empty positions.', 'c3', 'medium'),
        q('Postfix expression evaluation uses a:', ['Stack', 'Queue', 'Tree', 'Hash table'], 0, 'Push operands, pop and compute.', 'c3', 'hard'),
        q('A deque allows operations at:', ['Both ends', 'Only front', 'Only rear', 'Middle only'], 0, 'Deque = double-ended queue.', 'c3', 'hard'),
        q('Each node in a singly linked list contains:', ['Data and a next pointer', 'Only data', 'Two pointers', 'An index'], 0, 'A node stores data plus next reference.', 'c4', 'easy'),
        q('Which linked list allows traversal in both directions?', ['Doubly linked list', 'Singly linked list', 'Circular singly list', 'Static list'], 0, 'Doubly linked nodes have prev and next.', 'c4', 'easy'),
        q('Insertion at the head of a singly linked list is:', ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'], 0, 'Only the head pointer changes.', 'c4', 'medium'),
        q('In a circular linked list, the last node points to:', ['The first node', 'NULL', 'Itself', 'The middle node'], 0, 'Tail links back to head.', 'c4', 'medium'),
        q('Deleting from a singly linked list needs:', ['Previous pointer', 'Next pointer only', 'Index', 'Array copy'], 0, 'You must relink the previous node.', 'c4', 'hard'),
        q('Main advantage of linked list over array:', ['Dynamic size', 'Faster access', 'Cache friendly', 'Less memory'], 0, 'Lists grow and shrink at runtime.', 'c4', 'hard'),
        q('In-order traversal of a BST gives:', ['Sorted order', 'Reverse order', 'Level order', 'Random order'], 0, 'Left, root, right = ascending.', 'c5', 'easy'),
        q('Max nodes in a binary tree of height h:', ['2^h - 1', 'h', '2^h', 'h^2'], 0, 'Perfect binary tree has 2^h - 1 nodes.', 'c5', 'easy'),
        q('A full binary tree has:', ['0 or 2 children per node', 'Exactly 1 child', '3 children', 'Any number'], 0, 'Every node has 0 or 2 children.', 'c5', 'medium'),
        q('Height of an empty tree is:', ['0', '1', '-1', 'Undefined'], 2, 'Convention: empty tree height is -1.', 'c5', 'medium'),
        q('BST search worst case is:', ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'], 0, 'Skewed tree degrades to O(n).', 'c5', 'hard'),
        q('Post-order traversal is used for:', ['Expression evaluation', 'Sorted output', 'Level display', 'Graph search'], 0, 'Left, right, root = expression evaluation.', 'c5', 'hard'),
        q('Linear search worst case is:', ['O(n)', 'O(1)', 'O(log n)', 'O(n log n)'], 0, 'Every element may be checked.', 'c6', 'easy'),
        q('Binary search requires the array to be:', ['Sorted', 'Unsorted', 'Large', 'Circular'], 0, 'Only works on sorted data.', 'c6', 'easy'),
        q('Merge sort has time complexity:', ['O(n log n)', 'O(n)', 'O(n^2)', 'O(log n)'], 0, 'Always O(n log n).', 'c6', 'medium'),
        q('Bubble sort worst case is:', ['O(n^2)', 'O(n)', 'O(n log n)', 'O(log n)'], 0, 'Nested loops give O(n^2).', 'c6', 'medium'),
        q('Quick sort worst case is:', ['O(n^2)', 'O(n log n)', 'O(n)', 'O(log n)'], 0, 'Bad pivot causes O(n^2).', 'c6', 'hard'),
        q('Which sort is stable?', ['Merge sort', 'Quick sort', 'Heap sort', 'Selection sort'], 0, 'Merge sort preserves equal-key order.', 'c6', 'hard')
      ]
    },
    3: {
      id: 3, short: 'OOP', category: 'Object Oriented Programming using C++', icon: '💻',
      description: 'Principles of OOP, classes, objects, inheritance, polymorphism and file handling in C++.',
      chapters: [
        { id: 'c1', title: 'Principles of Object Oriented Programming', topics: ['POP vs OOP', 'Encapsulation, Abstraction, Inheritance, Polymorphism', 'Structure of a C++ Program, Tokens'] },
        { id: 'c2', title: 'Classes and Objects', topics: ['Class Specification & Access Specifiers', 'Member Functions & Static Members', 'Array of Objects & Friend Functions'] },
        { id: 'c3', title: 'Inheritance: Extending Classes', topics: ['Derived Classes & Visibility Modes', 'Types of Inheritance', 'Virtual Base Class & Abstract Class'] },
        { id: 'c4', title: 'Pointers and Polymorphism in C++', topics: ['Pointers & the This Pointer', 'Function & Operator Overloading', 'Virtual Functions'] },
        { id: 'c5', title: 'Working with Files', topics: ['File Streams & Opening Files', 'Reading & Writing to Files', 'File Modes & EOF Detection'] }
      ],
      bank: [
        q('Which keyword defines a class in C++?', ['class', 'struct', 'object', 'public'], 0, 'The class keyword defines a class.', 'c1', 'easy'),
        q('Which language is NOT object-oriented?', ['C', 'C++', 'Java', 'Python'], 0, 'C is a procedural language.', 'c1', 'easy'),
        q('C++ supports which programming styles?', ['Both procedural and OOP', 'Only procedural', 'Only OOP', 'Functional only'], 0, 'C++ is multi-paradigm.', 'c1', 'medium'),
        q('The scope resolution operator in C++ is:', ['::', '->', '.', ':::'], 0, ':: accesses global or class members.', 'c1', 'medium'),
        q('new and delete operators are used for:', ['Dynamic memory management', 'File handling', 'Loop control', 'Error handling'], 0, 'new allocates, delete frees memory.', 'c1', 'hard'),
        q('Encapsulation means:', ['Binding data and functions together', 'Hiding all data', 'Using global variables', 'Copying objects'], 0, 'Encapsulation bundles data with its methods.', 'c1', 'hard'),
        q('An object is:', ['An instance of a class', 'A variable type', 'A function', 'A header file'], 0, 'Objects are created from class definitions.', 'c2', 'easy'),
        q('Class members are ______ by default in C++.', ['private', 'public', 'protected', 'global'], 0, 'Default access in a class is private.', 'c2', 'easy'),
        q('Static data members are shared by:', ['All objects of the class', 'Only the first object', 'No object', 'The base class only'], 0, 'Static members exist once for the whole class.', 'c2', 'medium'),
        q('A friend function can access:', ['Private members of the class', 'Only public members', 'Only static members', 'Nothing'], 0, 'Friend functions are granted private access.', 'c2', 'medium'),
        q('An empty class in C++ occupies:', ['1 byte', '0 bytes', '4 bytes', '8 bytes'], 0, '1 byte ensures unique addresses.', 'c2', 'hard'),
        q('An array of objects means:', ['Objects of same class in an array', 'One object with arrays', 'Arrays inside arrays', 'Pointer to array'], 0, 'Like int arr[5] but with class objects.', 'c2', 'hard'),
        q('Inheritance lets a class:', ['Acquire properties of another class', 'Delete another class', 'Copy a file', 'Run faster'], 0, 'Inheritance reuses and extends a base class.', 'c3', 'easy'),
        q('Single inheritance means:', ['One base, one derived class', 'Two base classes', 'No base class', 'Three derived classes'], 0, 'One parent, one child.', 'c3', 'easy'),
        q('Constructors are:', ['Not inherited', 'Always inherited', 'Virtual functions', 'Static members'], 0, 'Constructors cannot be inherited.', 'c3', 'medium'),
        q('Protected members are accessible in:', ['Derived classes', 'Only the same class', 'All functions', 'Main only'], 0, 'Protected = visible in class and derived classes.', 'c3', 'medium'),
        q('Diamond problem arises in:', ['Multiple inheritance', 'Single inheritance', 'Multilevel inheritance', 'Hierarchical inheritance'], 0, 'Two base paths to same ancestor cause ambiguity.', 'c3', 'hard'),
        q('A virtual base class solves:', ['Ambiguity in multiple inheritance', 'Memory leaks', 'Slow code', 'Syntax errors'], 0, 'Virtual base avoids duplicate base sub-objects.', 'c3', 'hard'),
        q('Run-time polymorphism uses:', ['Virtual functions', 'Macros', 'Global variables', 'Goto'], 0, 'Virtual functions enable dynamic dispatch.', 'c4', 'easy'),
        q('Function overloading is:', ['Compile-time polymorphism', 'Run-time polymorphism', 'Inheritance', 'Encapsulation'], 0, 'Overloading is resolved at compile time.', 'c4', 'easy'),
        q('The this pointer refers to:', ['The current object', 'The base class', 'NULL', 'The stack'], 0, 'this points to the invoking object.', 'c4', 'medium'),
        q('Operator overloading lets you:', ['Redefine operators for user types', 'Delete operators', 'Create keywords', 'Overload main()'], 0, 'Operators can be redefined for classes.', 'c4', 'medium'),
        q('A pure virtual function makes a class:', ['Abstract', 'Concrete', 'Static', 'Virtual'], 0, 'Abstract classes cannot be instantiated.', 'c4', 'hard'),
        q('A base class pointer can refer to:', ['A derived class object', 'Only base objects', 'Nothing', 'A file'], 0, 'Base pointers can point to derived objects.', 'c4', 'hard'),
        q('File I/O in C++ uses the header:', ['fstream', 'iostream', 'stdio.h', 'file.h'], 0, 'fstream provides file stream classes.', 'c5', 'easy'),
        q('ofstream is used for:', ['Writing to files', 'Reading files', 'Both', 'Neither'], 0, 'ofstream = output file stream.', 'c5', 'easy'),
        q('The function to check end-of-file is:', ['eof()', 'end()', 'close()', 'fail()'], 0, 'eof() returns true at end of file.', 'c5', 'medium'),
        q('ios::app opens a file in:', ['Append mode', 'Read mode', 'Write mode', 'Truncate mode'], 0, 'App mode adds data at end.', 'c5', 'medium'),
        q('fstream supports:', ['Both reading and writing', 'Only reading', 'Only writing', 'Neither'], 0, 'fstream = file stream for both directions.', 'c5', 'hard'),
        q('getline() reads:', ['An entire line of text', 'A single character', 'A word', 'An integer'], 0, 'getline reads until newline.', 'c5', 'hard')
      ]
    },
    4: {
      id: 4, short: 'AMT', category: 'Applied Multimedia Techniques', icon: '🎬',
      description: 'Multimedia fundamentals, text and images, audio, video and animation, and authoring tools.',
      chapters: [
        { id: 'c1', title: 'Multimedia Fundamentals', topics: ['Definition & Elements of Multimedia', 'Multimedia Applications', 'System Requirements'] },
        { id: 'c2', title: 'Text and Images', topics: ['Text & Fonts', 'Image Formats: BMP, JPEG, GIF, PNG', 'Color Models: RGB, CMYK, HSV'] },
        { id: 'c3', title: 'Audio', topics: ['Audio Sampling & Quantization', 'Audio File Formats', 'Audio Compression & Editing'] },
        { id: 'c4', title: 'Video and Animation', topics: ['Video Standards & Frame Rates', 'Video Compression & Codecs', '2D & 3D Animation'] },
        { id: 'c5', title: 'Authoring Tools and Applications', topics: ['Multimedia Authoring Tools', 'Hypermedia & Links', 'Streaming Media & Delivery'] }
      ],
      bank: [
        q('Multimedia combines which elements?', ['Text, audio, image and video', 'Only text', 'Only audio', 'Only images'], 0, 'Multimedia mixes multiple media types.', 'c1', 'easy'),
        q('An example of a multimedia application is:', ['E-learning', 'Calculator', 'Notepad', 'File manager'], 0, 'E-learning uses text, audio, video together.', 'c1', 'easy'),
        q('Analog signals are:', ['Continuous', 'Discrete', 'Digital', 'Binary'], 0, 'Analog varies continuously.', 'c1', 'medium'),
        q('Digital signals are:', ['Discrete', 'Continuous', 'Analog', 'Infinite'], 0, 'Digital takes separate values.', 'c1', 'medium'),
        q('Bitmap images are resolution:', ['Dependent', 'Independent', 'Constant', 'Unlimited'], 0, 'Bitmaps lose quality when scaled.', 'c1', 'hard'),
        q('Multimedia files generally require:', ['Large storage and bandwidth', 'Very little memory', 'No processing', 'Text only'], 0, 'Media files are large.', 'c1', 'hard'),
        q('A pixel is:', ['The smallest unit of a digital image', 'A color', 'A video', 'A sound'], 0, 'Pixel = picture element.', 'c2', 'easy'),
        q('RGB stands for:', ['Red Green Blue', 'Red Gray Black', 'Round Green Blue', 'Red Great Blue'], 0, 'RGB is the additive color model.', 'c2', 'easy'),
        q('An 8-bit image can display how many colors?', ['256', '16', '65536', '128'], 0, '2^8 = 256.', 'c2', 'medium'),
        q('Vector graphics are built from:', ['Mathematical shapes', 'Pixels', 'Photographs', 'Scans'], 0, 'Vectors use points, lines, curves.', 'c2', 'medium'),
        q('PNG is preferred over JPEG when:', ['Transparency is needed', 'File must be tiny', 'Audio is included', '3D is needed'], 0, 'PNG supports alpha transparency.', 'c2', 'hard'),
        q('Image resolution is measured in:', ['DPI or PPI', 'FPS', 'kHz', 'dB'], 0, 'Dots or pixels per inch.', 'c2', 'hard'),
        q('CD-quality audio sampling rate is:', ['44.1 kHz', '22 kHz', '11 kHz', '96 kHz'], 0, 'Standard CD audio = 44.1 kHz.', 'c3', 'easy'),
        q('Converting analog audio to digital involves:', ['Sampling and quantizing', 'Filtering only', 'Amplifying only', 'Mixing only'], 0, 'ADC samples and quantizes.', 'c3', 'easy'),
        q('MP3 is a ______ audio format.', ['Lossy compressed', 'Lossless', 'Uncompressed', 'Text'], 0, 'MP3 discards some data.', 'c3', 'medium'),
        q('Which is a lossless audio format?', ['WAV', 'MP3', 'AAC', 'OGG'], 0, 'WAV stores raw PCM audio.', 'c3', 'medium'),
        q('The Nyquist theorem requires sampling at least:', ['Twice the highest frequency', 'Equal to frequency', 'Half the frequency', 'Four times'], 0, 'Sample >= 2x the max signal frequency.', 'c3', 'hard'),
        q('Audio bit rate is measured in:', ['Bits per second', 'Pixels per inch', 'Frames per second', 'Hertz'], 0, 'Bit rate = bits per second.', 'c3', 'hard'),
        q('Standard video frame rates include:', ['24 and 30 fps', '1 fps', '1000 fps', '0.5 fps'], 0, 'Film 24 fps, TV 30/60 fps.', 'c4', 'easy'),
        q('H.264 is a:', ['Video codec', 'Audio player', 'Image editor', 'Font'], 0, 'H.264 is a widely used video codec.', 'c4', 'easy'),
        q('Chroma subsampling reduces:', ['Color information', 'Frame rate', 'Resolution', 'Brightness'], 0, 'Stores less color detail than luminance.', 'c4', 'medium'),
        q('AVI and MKV are examples of:', ['Container formats', 'Codecs', 'Audio formats', 'Image formats'], 0, 'Containers hold audio and video streams.', 'c4', 'medium'),
        q('Interlaced scanning displays:', ['Every other line per field', 'All lines at once', 'No lines', 'Odd frames only'], 0, 'Interlacing alternates field lines.', 'c4', 'hard'),
        q('Frame rate directly affects:', ['Video smoothness', 'Color depth', 'Resolution', 'Aspect ratio'], 0, 'Higher fps = smoother motion.', 'c4', 'hard'),
        q('Hypermedia combines hypertext with:', ['Multimedia elements', 'Spreadsheets', 'Databases', 'Command lines'], 0, 'Hypermedia links media-rich docs.', 'c5', 'easy'),
        q('VR stands for:', ['Virtual Reality', 'Video Rendering', 'Visual Range', 'Variable Rate'], 0, 'VR immerses users in virtual worlds.', 'c5', 'easy'),
        q('Bit rate is measured in:', ['Bits per second', 'Pixels per inch', 'Frames per second', 'Samples per second'], 0, 'Bit rate = bits per second.', 'c5', 'medium'),
        q('An authoring tool is used to:', ['Create interactive multimedia', 'Compile code', 'Edit text only', 'Manage databases'], 0, 'Authoring tools build interactive apps.', 'c5', 'medium'),
        q('MIDI files store:', ['Musical note instructions', 'Recorded audio', 'Video frames', 'Images'], 0, 'MIDI saves instructions, not waveforms.', 'c5', 'hard'),
        q('Streaming media plays:', ['While downloading', 'After full download', 'Offline only', 'From a CD'], 0, 'Streaming plays in real-time.', 'c5', 'hard')
      ]
    },
    5: {
      id: 5, short: 'EIC', category: 'Essence of Indian Constitution', icon: '📜',
      description: 'The making of the Constitution, Preamble, Fundamental Rights, Directive Principles and the structure of government.',
      chapters: [
        { id: 'c1', title: 'Making of the Indian Constitution', topics: ['Constituent Assembly & Its Working', 'Drafting Committee', 'Adoption & Salient Features'] },
        { id: 'c2', title: 'Preamble and Fundamental Rights', topics: ['Preamble & Its Ideals', 'Fundamental Rights (Articles 12-35)', 'Writs & Right to Constitutional Remedies'] },
        { id: 'c3', title: 'Directive Principles and Fundamental Duties', topics: ['DPSP (Articles 36-51)', 'Fundamental Duties (Part IV-A)', 'FRs vs DPSP'] },
        { id: 'c4', title: 'Union Government', topics: ['President, Vice-President & Prime Minister', 'Council of Ministers', 'Parliament: Lok Sabha & Rajya Sabha'] },
        { id: 'c5', title: 'State Government and Judiciary', topics: ['Governor & Chief Minister', 'State Legislature', 'Supreme Court & High Courts'] }
      ],
      bank: [
        q('The Constitution of India was adopted on:', ['26 November 1949', '26 January 1950', '15 August 1947', '2 October 1950'], 0, 'Adopted 26 Nov 1949, in force 26 Jan 1950.', 'c1', 'easy'),
        q('The Constitution came into force on:', ['26 January 1950', '26 November 1949', '15 August 1947', '1 April 1950'], 0, 'Republic Day, 26 Jan 1950.', 'c1', 'easy'),
        q('Chairman of the Drafting Committee:', ['Dr. B. R. Ambedkar', 'Jawaharlal Nehru', 'Sardar Patel', 'Rajendra Prasad'], 0, 'Ambedkar chaired the Drafting Committee.', 'c1', 'medium'),
        q('Parliamentary system borrowed from:', ['Britain', 'USA', 'Ireland', 'Canada'], 0, 'India adopted the British model.', 'c1', 'medium'),
        q('Preamble amended by:', ['42nd Amendment', '44th Amendment', '1st Amendment', '73rd Amendment'], 0, '42nd Amendment added socialist, secular, integrity.', 'c1', 'hard'),
        q('Signatories to the Constitution numbered:', ['284', '300', '389', '250'], 0, '284 members signed.', 'c1', 'hard'),
        q('Preamble declares India to be:', ['Sovereign Socialist Secular Democratic Republic', 'Communist state', 'Monarchy', 'Theocracy'], 0, 'The Preamble lists these ideals.', 'c2', 'easy'),
        q('Right to Equality is under Article:', ['14', '15', '19', '21'], 0, 'Article 14 ensures equality before law.', 'c2', 'easy'),
        q('Article abolishes untouchability:', ['17', '15', '19', '25'], 0, 'Article 17 abolishes untouchability.', 'c2', 'medium'),
        q('Right to Religion is in Articles:', ['25 to 28', '14 to 18', '19 to 22', '32 to 35'], 0, 'Articles 25-28 protect religious freedom.', 'c2', 'medium'),
        q('Right to Education via:', ['86th Amendment', '42nd Amendment', '44th Amendment', '61st Amendment'], 0, '86th Amendment added Article 21A.', 'c2', 'hard'),
        q('Fundamental Rights are in:', ['Part III', 'Part II', 'Part IV', 'Part V'], 0, 'Part III (Articles 12-35).', 'c2', 'hard'),
        q('DPSP are in:', ['Part IV', 'Part III', 'Part V', 'Part II'], 0, 'Part IV = Articles 36-51.', 'c3', 'easy'),
        q('DPSP borrowed from:', ['Ireland', 'USA', 'Japan', 'Germany'], 0, 'From the Irish Constitution.', 'c3', 'easy'),
        q('DPSP are:', ['Not enforceable by courts', 'Fully enforceable', 'Criminal laws', 'Tax laws'], 0, 'DPSP guide policy but cannot be enforced.', 'c3', 'medium'),
        q('Uniform Civil Code is a:', ['Directive Principle', 'Fundamental Right', 'Fundamental Duty', 'Writ'], 0, 'Article 44 is a DPSP.', 'c3', 'medium'),
        q('Article 39A relates to:', ['Equal justice and free legal aid', 'Freedom of speech', 'Property rights', 'Citizenship'], 0, '39A ensures justice for the poor.', 'c3', 'hard'),
        q('Fundamental Duties added by:', ['42nd Amendment', '44th Amendment', '1st Amendment', '61st Amendment'], 0, '42nd Amendment inserted Part IV-A.', 'c3', 'hard'),
        q('India has a ______ form of government.', ['Parliamentary', 'Presidential', 'Monarchy', 'Direct democracy'], 0, 'Westminster parliamentary model.', 'c4', 'easy'),
        q('Head of the Indian state:', ['President', 'Prime Minister', 'Chief Justice', 'Speaker'], 0, 'The President is head of state.', 'c4', 'easy'),
        q('Lok Sabha elected for:', ['5 years', '4 years', '6 years', '3 years'], 0, 'Five-year terms.', 'c4', 'medium'),
        q('Executive head of government:', ['Prime Minister', 'President', 'Vice-President', 'Governor'], 0, 'The PM heads the executive.', 'c4', 'medium'),
        q('President elected by:', ['Electoral college', 'Direct vote', 'Supreme Court', 'State legislatures'], 0, 'An electoral college elects the President.', 'c4', 'hard'),
        q('Two houses of Parliament are:', ['Lok Sabha and Rajya Sabha', 'Senate and House', 'Upper and Lower', 'National and State'], 0, 'Lok Sabha (lower) and Rajya Sabha (upper).', 'c4', 'hard'),
        q('Head of a state government:', ['Chief Minister', 'Governor', 'President', 'Prime Minister'], 0, 'CM is the elected head.', 'c5', 'easy'),
        q('Supreme Court headed by:', ['Chief Justice of India', 'President', 'Prime Minister', 'Governor'], 0, 'The CJI leads the Supreme Court.', 'c5', 'easy'),
        q('Governor is appointed by:', ['President', 'Chief Minister', 'Prime Minister', 'State Legislature'], 0, 'The President appoints governors.', 'c5', 'medium'),
        q('High Court headed by:', ['Chief Justice of the High Court', 'Governor', 'President', 'District Judge'], 0, 'The Chief Justice leads each HC.', 'c5', 'medium'),
        q('Writs can be issued by:', ['Supreme Court and High Courts', 'Only Parliament', 'Only the President', 'District Courts'], 0, 'Both SC and HCs can issue writs.', 'c5', 'hard'),
        q('Writ petition filed under:', ['Article 32', 'Article 14', 'Article 19', 'Article 21'], 0, 'Article 32 is the right to constitutional remedies.', 'c5', 'hard')
      ]
    }
  };

  /* ----------------------------------------------------------
     Quiz generator — picks questions from the selected chapters
     at the chosen difficulty and "difficulty" count, like a
     lightweight AI that builds a custom paper.
     ---------------------------------------------------------- */
  var GEN_KEY = 'quizflow_gen_v3';
  var DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function loadGen() {
    try { return JSON.parse(localStorage.getItem(GEN_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveGen(map) {
    try { localStorage.setItem(GEN_KEY, JSON.stringify(map)); } catch (e) { /* ignore */ }
  }

  function buildGeneratedQuiz(subjectId, topics, count, difficulty) {
    var subj = SUBJECTS[subjectId];
    if (!subj) throw new Error('Subject not found.');

    var topicSet = {};
    (topics && topics.length ? topics : subj.chapters.map(function (c) { return c.id; }))
      .forEach(function (t) { topicSet[t] = true; });

    var inSelection = subj.bank.filter(function (x) { return topicSet[x.topic]; });
    var preferred = inSelection.filter(function (x) { return x.difficulty === difficulty; });

    var pool = shuffle(preferred.concat(shuffle(inSelection.filter(function (x) { return x.difficulty !== difficulty; }))));
    if (pool.length < count) {
      var rest = subj.bank.filter(function (x) { return !topicSet[x.topic]; });
      pool = pool.concat(shuffle(rest));
    }
    var picked = pool.slice(0, count);

    var seconds = Math.max(120, picked.length * 20);
    return {
      baseQuizId: subj.id,
      title: subj.short + ' · ' + (DIFF_LABEL[difficulty] || 'Mixed') + ' · AI Generated',
      category: subj.category,
      icon: subj.icon,
      difficulty: DIFF_LABEL[difficulty] || 'Mixed',
      duration: Math.round(seconds / 60),
      questions: picked.map(function (x) {
        return {
          text: x.text,
          options: x.options,
          correctIndex: x.correctIndex,
          explanation: x.explanation
        };
      })
    };
  }

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  var api = {
    /* Sync check: does a user with this id still exist in the store?
       Used by auth guards to detect stale sessions after reseeds. */
    hasUser: function (id) {
      var db = loadDB();
      for (var i = 0; i < db.users.length; i++) {
        if (db.users[i].id === id) return true;
      }
      return false;
    },

    /* POST /api/login */
    login: function (email, password) {
      var db = loadDB();
      var found = null;
      for (var i = 0; i < db.users.length; i++) {
        var u = db.users[i];
        if (u.email.toLowerCase() === email.toLowerCase().trim()) {
          found = u;
          break;
        }
      }
      if (!found || found.password !== password) {
        return delay(null).then(function () {
          throw new Error('Invalid email or password.');
        });
      }
      return delay(sanitize(found));
    },

    /* POST /api/register */
    register: function (name, email, password) {
      var db = loadDB();
      var exists = db.users.some(function (u) {
        return u.email.toLowerCase() === email.toLowerCase().trim();
      });
      if (exists) {
        return delay(null).then(function () {
          throw new Error('This email is already registered.');
        });
      }
      var user = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: 'Student'
      };
      db.users.push(user);
      saveDB(db);
      return delay(sanitize(user));
    },

    /* GET /api/dashboard */
    getDashboard: function (userId) {
      var db = loadDB();
      var user = null;
      for (var i = 0; i < db.users.length; i++) {
        if (db.users[i].id === userId) { user = db.users[i]; break; }
      }
      if (!user) {
        return delay(null).then(function () { throw new Error('User not found.'); });
      }

      var mine = db.attempts.filter(function (a) { return a.userId === userId; });
      var completedQuizzes = mine.length;
      var totalPercent = mine.reduce(function (sum, a) { return sum + a.percent; }, 0);
      var averageScore = mine.length ? Math.round(totalPercent / mine.length) : 0;
      var totalPoints = mine.reduce(function (sum, a) { return sum + a.score * 10; }, 0);

      /* Continue learning: most recent quiz below 100% */
      var bestByQuiz = {};
      mine.forEach(function (a) {
        if (!bestByQuiz[a.quizId] || a.percent > bestByQuiz[a.quizId].percent) {
          bestByQuiz[a.quizId] = a;
        }
      });
      var continueQuiz = null;
      Object.keys(bestByQuiz).forEach(function (k) {
        var a = bestByQuiz[k];
        if (a.percent < 100) {
          if (!continueQuiz || new Date(a.date) > new Date(continueQuiz.date)) continueQuiz = a;
        }
      });

      return delay({
        user: sanitize(user),
        stats: {
          completedQuizzes: completedQuizzes,
          averageScore: averageScore,
          currentStreak: Math.min(mine.length, 12),
          totalPoints: totalPoints
        },
        continueQuiz: continueQuiz,
        recentResults: mine.slice(0, 5).reverse(),
        quizzes: db.quizzes.map(function (q) {
          return {
            id: q.id,
            title: q.title,
            short: q.short,
            category: q.category,
            icon: q.icon,
            duration: q.duration,
            questionCount: q.questions.length
          };
        })
      });
    },

    /* GET /api/quizzes */
    getQuizzes: function () {
      var db = loadDB();
      return delay(db.quizzes.map(function (q) {
        return {
          id: q.id,
          title: q.title,
          short: q.short,
          category: q.category,
          icon: q.icon,
          duration: q.duration,
          questionCount: q.questions.length
        };
      }));
    },

    /* GET /api/quiz/:id  (serves questions, as the C++ engine would) */
    getQuiz: function (id) {
      var db = loadDB();
      var quiz = null;
      for (var i = 0; i < db.quizzes.length; i++) {
        if (db.quizzes[i].id === id) { quiz = db.quizzes[i]; break; }
      }
      if (!quiz) {
        return delay(null).then(function () { throw new Error('Quiz not found.'); });
      }
      return delay({
        id: quiz.id,
        title: quiz.title,
        category: quiz.category,
        icon: quiz.icon,
        duration: quiz.duration,
        questions: quiz.questions
      });
    },

    /* GET /api/syllabus/:subjectId  (chapters + topics + per-difficulty counts) */
    getSyllabus: function (subjectId) {
      var subj = SUBJECTS[subjectId];
      if (!subj) return delay(null).then(function () { throw new Error('Subject not found.'); });
      return delay({
        id: subj.id,
        short: subj.short,
        category: subj.category,
        icon: subj.icon,
        description: subj.description,
        chapters: subj.chapters.map(function (c) {
          var qs = subj.bank.filter(function (x) { return x.topic === c.id; });
          return {
            id: c.id,
            title: c.title,
            topics: c.topics,
            count: qs.length,
            easy: qs.filter(function (x) { return x.difficulty === 'easy'; }).length,
            medium: qs.filter(function (x) { return x.difficulty === 'medium'; }).length,
            hard: qs.filter(function (x) { return x.difficulty === 'hard'; }).length,
            questions: qs.map(function (q, i) {
              return { qid: c.id + '_' + i, text: q.text, options: q.options, correctIndex: q.correctIndex, difficulty: q.difficulty, explanation: q.explanation };
            })
          };
        })
      });
    },

    /* POST /api/generate — AI-style quiz builder.
       opts: { topics: [chapter ids], count, difficulty } */
    generateQuiz: function (subjectId, opts) {
      opts = opts || {};
      try {
        var quiz = buildGeneratedQuiz(subjectId, opts.topics, opts.count, opts.difficulty);
      } catch (e) {
        return delay(null).then(function () { throw e; });
      }
      var token = 'g' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      var gen = loadGen();
      gen[token] = quiz;
      saveGen(gen);
      return delay({
        token: token,
        title: quiz.title,
        count: quiz.questions.length,
        duration: quiz.duration
      });
    },

    /* GET /api/generate/:token — fetch a generated quiz to attempt it */
    getGeneratedQuiz: function (token) {
      var gen = loadGen();
      if (!gen[token]) return delay(null).then(function () { throw new Error('Generated quiz not found. It may have expired.'); });
      return delay(gen[token]);
    },

    /* POST /api/generate/:token/submit — grade and store a generated attempt */
    submitGeneratedQuiz: function (userId, token, answers, timeTaken) {
      var gen = loadGen();
      var quiz = gen[token];
      var db = loadDB();
      var user = null;
      for (var j = 0; j < db.users.length; j++) {
        if (db.users[j].id === userId) { user = db.users[j]; break; }
      }
      if (!quiz || !user) {
        return delay(null).then(function () { throw new Error('Submission failed.'); });
      }

      var score = 0;
      var details = quiz.questions.map(function (q, idx) {
        var chosen = (answers && answers[idx] !== undefined) ? answers[idx] : -1;
        var correct = chosen === q.correctIndex;
        if (correct) score++;
        return {
          question: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          chosen: chosen,
          correct: correct
        };
      });

      var attempt = {
        id: db.nextAttemptId++,
        userId: userId,
        userName: user.name,
        quizId: quiz.baseQuizId,
        quizTitle: quiz.title,
        category: quiz.category,
        difficulty: quiz.difficulty || '',
        score: score,
        total: quiz.questions.length,
        percent: Math.round((score / quiz.questions.length) * 100),
        timeTaken: timeTaken || 0,
        date: new Date().toISOString(),
        details: details
      };
      db.attempts.push(attempt);
      saveDB(db);

      delete gen[token];
      saveGen(gen);
      return delay(attempt);
    },

    /* POST /api/quiz/:id/submit */
    submitQuiz: function (userId, quizId, answers, timeTaken) {
      var db = loadDB();
      var quiz = null;
      for (var i = 0; i < db.quizzes.length; i++) {
        if (db.quizzes[i].id === quizId) { quiz = db.quizzes[i]; break; }
      }
      var user = null;
      for (var j = 0; j < db.users.length; j++) {
        if (db.users[j].id === userId) { user = db.users[j]; break; }
      }
      if (!quiz || !user) {
        return delay(null).then(function () { throw new Error('Submission failed.'); });
      }

      var score = 0;
      var details = quiz.questions.map(function (q, idx) {
        var chosen = (answers && answers[idx] !== undefined) ? answers[idx] : -1;
        var correct = chosen === q.correctIndex;
        if (correct) score++;
        return {
          question: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          chosen: chosen,
          correct: correct
        };
      });

      var attempt = {
        id: db.nextAttemptId++,
        userId: userId,
        userName: user.name,
        quizId: quiz.id,
        quizTitle: quiz.title,
        category: quiz.category,
        score: score,
        total: quiz.questions.length,
        percent: Math.round((score / quiz.questions.length) * 100),
        timeTaken: timeTaken || 0,
        date: new Date().toISOString(),
        details: details
      };
      db.attempts.push(attempt);
      saveDB(db);
      return delay(attempt);
    },

    /* GET /api/results */
    getResults: function (userId) {
      var db = loadDB();
      var mine = db.attempts.filter(function (a) { return a.userId === userId; });
      return delay(mine.slice().reverse().map(function (a) {
        return {
          id: a.id,
          quizId: a.quizId,
          quizTitle: a.quizTitle,
          category: a.category,
          score: a.score,
          total: a.total,
          percent: a.percent,
          timeTaken: a.timeTaken,
          time: fmtTime(a.timeTaken || 0),
          date: a.date
        };
      }));
    },

    /* GET /api/results/:id */
    getResult: function (id) {
      var db = loadDB();
      var attempt = null;
      for (var i = 0; i < db.attempts.length; i++) {
        if (db.attempts[i].id === id) { attempt = db.attempts[i]; break; }
      }
      if (!attempt) {
        return delay(null).then(function () { throw new Error('Result not found.'); });
      }
      return delay(attempt);
    },

    /* GET /api/leaderboard */
    getLeaderboard: function () {
      var db = loadDB();
      var rows = {};
      db.attempts.forEach(function (a) {
        if (!rows[a.userId]) {
          rows[a.userId] = { userId: a.userId, name: a.userName, attempts: 0, totalScore: 0, totalQ: 0, percentSum: 0, points: 0 };
        }
        var r = rows[a.userId];
        r.attempts++;
        r.totalScore += a.score;
        r.totalQ += a.total;
        r.percentSum += a.percent;
        r.points += a.score * 10;
      });
      var list = Object.keys(rows).map(function (k) { return rows[k]; });
      list.sort(function (a, b) {
        return b.points - a.points || b.totalScore - a.totalScore;
      });
      return delay(list.map(function (r, i) {
        return {
          rank: i + 1,
          name: r.name,
          initials: r.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(),
          score: Math.round(r.percentSum / r.attempts),
          quizzes: r.attempts,
          points: r.points
        };
      }));
    },

    /* GET /api/results/summary — strengths & weaknesses by category */
    getCategorySummary: function (userId) {
      var db = loadDB();
      var mine = db.attempts.filter(function (a) { return a.userId === userId; });
      var byCat = {};
      mine.forEach(function (a) {
        if (!byCat[a.category]) byCat[a.category] = { sum: 0, count: 0 };
        byCat[a.category].sum += a.percent;
        byCat[a.category].count++;
      });
      var cats = Object.keys(byCat).map(function (c) {
        return { category: c, percent: Math.round(byCat[c].sum / byCat[c].count) };
      });
      cats.sort(function (a, b) { return b.percent - a.percent; });
      return delay({
        strengths: cats.filter(function (c) { return c.percent >= 70; }).slice(0, 3),
        weaknesses: cats.filter(function (c) { return c.percent < 70; }).slice(0, 3)
      });
    },

    /* ============ ADMIN ============ */

    /* GET /api/admin/stats */
    getAdminStats: function () {
      var db = loadDB();
      var questionCount = db.quizzes.reduce(function (sum, q) { return sum + q.questions.length; }, 0);
      var students = db.users.filter(function (u) { return u.role === 'Student'; });
      return delay({
        totalStudents: students.length,
        totalQuizzes: db.quizzes.length,
        totalQuestions: questionCount,
        totalAttempts: db.attempts.length
      });
    },

    /* GET /api/admin/students */
    getStudents: function () {
      var db = loadDB();
      var students = db.users.filter(function (u) { return u.role === 'Student'; });
      return delay(students.map(function (s) {
        var mine = db.attempts.filter(function (a) { return a.userId === s.id; });
        var avg = mine.length ? Math.round(mine.reduce(function (x, a) { return x + a.percent; }, 0) / mine.length) : 0;
        var points = mine.reduce(function (x, a) { return x + a.score * 10; }, 0);
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          attempts: mine.length,
          avgScore: avg,
          points: points
        };
      }));
    },

    /* GET /api/admin/analytics */
    getAnalytics: function () {
      var db = loadDB();
      return delay(db.quizzes.map(function (q) {
        var atts = db.attempts.filter(function (a) { return a.quizId === q.id; });
        var avg = atts.length ? Math.round(atts.reduce(function (s, a) { return s + a.percent; }, 0) / atts.length) : 0;
        return {
          quizId: q.id,
          title: q.title,
          short: q.short,
          attempts: atts.length,
          avgScore: avg
        };
      }).sort(function (a, b) { return b.attempts - a.attempts; }));
    },

    /* POST /api/admin/quizzes */
    createQuiz: function (data) {
      var db = loadDB();
      var quiz = {
        id: db.nextQuizId++,
        title: data.title,
        short: data.short || data.title.slice(0, 12),
        category: data.category,
        icon: data.icon || '📘',
        duration: data.duration || 10,
        questions: []
      };
      db.quizzes.push(quiz);
      saveDB(db);
      return delay(quiz.id);
    },

    /* PUT /api/admin/quizzes/:id */
    updateQuiz: function (id, patch) {
      var db = loadDB();
      var quiz = null;
      for (var i = 0; i < db.quizzes.length; i++) {
        if (db.quizzes[i].id === id) { quiz = db.quizzes[i]; break; }
      }
      if (!quiz) return delay(null).then(function () { throw new Error('Quiz not found.'); });
      if (patch.title) quiz.title = patch.title;
      if (patch.category) quiz.category = patch.category;
      if (patch.icon) quiz.icon = patch.icon;
      if (patch.duration) quiz.duration = patch.duration;
      saveDB(db);
      return delay(quiz.id);
    },

    /* DELETE /api/admin/quizzes/:id */
    deleteQuiz: function (id) {
      var db = loadDB();
      db.quizzes = db.quizzes.filter(function (q) { return q.id !== id; });
      db.attempts = db.attempts.filter(function (a) { return a.quizId !== id; });
      saveDB(db);
      return delay(true);
    },

    /* POST /api/admin/quizzes/:id/questions */
    addQuestion: function (quizId, q) {
      var db = loadDB();
      var quiz = null;
      for (var i = 0; i < db.quizzes.length; i++) {
        if (db.quizzes[i].id === quizId) { quiz = db.quizzes[i]; break; }
      }
      if (!quiz) return delay(null).then(function () { throw new Error('Quiz not found.'); });
      quiz.questions.push({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || ''
      });
      saveDB(db);
      return delay(true);
    },

    /* PUT /api/admin/quizzes/:id/questions/:idx */
    updateQuestion: function (quizId, idx, q) {
      var db = loadDB();
      var quiz = null;
      for (var i = 0; i < db.quizzes.length; i++) {
        if (db.quizzes[i].id === quizId) { quiz = db.quizzes[i]; break; }
      }
      if (!quiz || !quiz.questions[idx]) return delay(null).then(function () { throw new Error('Question not found.'); });
      quiz.questions[idx] = {
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || ''
      };
      saveDB(db);
      return delay(true);
    },

    /* DELETE /api/admin/quizzes/:id/questions/:idx */
    deleteQuestion: function (quizId, idx) {
      var db = loadDB();
      var quiz = null;
      for (var i = 0; i < db.quizzes.length; i++) {
        if (db.quizzes[i].id === quizId) { quiz = db.quizzes[i]; break; }
      }
      if (!quiz || !quiz.questions[idx]) return delay(null).then(function () { throw new Error('Question not found.'); });
      quiz.questions.splice(idx, 1);
      saveDB(db);
      return delay(true);
    },

    _reset: function () {
      try { localStorage.removeItem(DB_KEY); } catch (e) {}
      return loadDB();
    }
  };

  window.QuizFlowAPI = api;

  window.QuizFlow = {
    EMOJI: {
      'Digital Techniques & Microprocessor': '🔌',
      'Data Structures using C': '🧮',
      'Object Oriented Programming using C++': '💻',
      'Applied Multimedia Techniques': '🎬',
      'Essence of Indian Constitution': '📜',
      'Programming': '💻',
      'Mathematics': '🔢'
    }
  };
})();
