@echo off
REM Test script for POSIX shell bypass in Claude Code Windows executables
REM Run this on Windows WITHOUT Git Bash or any POSIX shell installed

echo Claude Code Shell Bypass Test
echo =============================
echo.

REM Clear any existing SHELL variable
set SHELL=

REM Test without any shell environment
echo Testing Windows executables WITHOUT POSIX shell...
echo.

REM Test 1: Standard executable
echo [TEST 1] claude-code-windows-x64.exe
echo -------------------------------------
if exist "dist\claude-code-windows-x64.exe" (
    echo Running without SHELL variable set...
    dist\claude-code-windows-x64.exe --version
    if %ERRORLEVEL% EQU 0 (
        echo SUCCESS: Executable works without POSIX shell!
    ) else (
        echo FAILED: Exit code %ERRORLEVEL%
    )
) else (
    echo ERROR: Executable not found
)
echo.

REM Test 2: Baseline executable
echo [TEST 2] claude-code-windows-x64-baseline.exe
echo ----------------------------------------------
if exist "dist\claude-code-windows-x64-baseline.exe" (
    echo Running without SHELL variable set...
    dist\claude-code-windows-x64-baseline.exe --version
    if %ERRORLEVEL% EQU 0 (
        echo SUCCESS: Baseline executable works without POSIX shell!
    ) else (
        echo FAILED: Exit code %ERRORLEVEL%
    )
) else (
    echo ERROR: Executable not found
)
echo.

REM Test 3: Modern executable
echo [TEST 3] claude-code-windows-x64-modern.exe
echo --------------------------------------------
if exist "dist\claude-code-windows-x64-modern.exe" (
    echo Running without SHELL variable set...
    dist\claude-code-windows-x64-modern.exe --version
    if %ERRORLEVEL% EQU 0 (
        echo SUCCESS: Modern executable works without POSIX shell!
    ) else (
        echo FAILED: Exit code %ERRORLEVEL%
    )
) else (
    echo ERROR: Executable not found
)
echo.

REM Test 4: Try a simple command
echo [TEST 4] Testing simple command execution
echo -----------------------------------------
echo Running: echo Hello from Claude Code | dist\claude-code-windows-x64-baseline.exe
echo Hello from Claude Code | dist\claude-code-windows-x64-baseline.exe
echo.

REM Summary
echo =============================
echo Test Summary:
echo.
echo If you see version numbers above, the shell bypass is working!
echo The executables should run WITHOUT requiring:
echo - Git Bash
echo - WSL
echo - MSYS2
echo - Cygwin
echo - Or any other POSIX shell
echo.
echo The executables now use cmd.exe on Windows automatically.
echo.
pause 