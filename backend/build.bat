@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
cl /nologo /EHsc /std:c++17 main.cpp /Fe:quizflow.exe
