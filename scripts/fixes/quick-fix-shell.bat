@echo off
REM Quick fix for "No suitable shell found" error

echo Quick Shell Fix for Claude Code
echo ==============================
echo.

REM Try common shell locations in order of preference

REM 1. Git Bash (most common and reliable)
if exist "C:\Program Files\Git\bin\bash.exe" (
    set "SHELL=C:\Program Files\Git\bin\bash.exe"
    echo Found Git Bash
    goto :run
)

if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    set "SHELL=C:\Program Files (x86)\Git\bin\bash.exe"
    echo Found Git Bash (x86)
    goto :run
)

REM 2. Git usr/bin/bash (alternative location)
if exist "C:\Program Files\Git\usr\bin\bash.exe" (
    set "SHELL=C:\Program Files\Git\usr\bin\bash.exe"
    echo Found Git Bash (usr/bin)
    goto :run
)

REM 3. Create a simple cmd wrapper as fallback
echo No Git Bash found. Creating CMD wrapper...
echo @cmd /c %%* > "%TEMP%\sh.bat"
set "SHELL=%TEMP%\sh.bat"

:run
echo.
echo Setting SHELL=%SHELL%
echo.
echo Starting Claude Code...
echo.

REM Set additional environment variables
set TERM=xterm-256color

REM Run the baseline executable with all arguments
claude-code-windows-x64-baseline.exe %*

REM Check if it failed due to shell
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================
    echo If you still see the shell error, please install Git for Windows:
    echo https://git-scm.com/download/win
    echo.
    echo Git Bash provides the POSIX shell that Claude Code needs.
    echo ============================================
)
