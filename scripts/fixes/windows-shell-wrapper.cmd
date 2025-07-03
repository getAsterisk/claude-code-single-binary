@echo off
REM Claude Code Windows Shell Wrapper
REM Sets up environment to provide POSIX shell compatibility

echo Claude Code Windows Shell Setup
echo ==============================
echo.

REM Method 1: Check for Git Bash (most common POSIX shell on Windows)
where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "delims=" %%i in ('where git') do set GIT_PATH=%%~dpi
    set SHELL=%GIT_PATH%..\bin\bash.exe
    if exist "%SHELL%" (
        echo Found Git Bash at: %SHELL%
        goto :run_claude
    )
)

REM Method 2: Check for WSL bash
where wsl >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Found WSL. Setting up bash through WSL...
    set SHELL=wsl.exe bash
    goto :run_claude
)

REM Method 3: Check for MSYS2/MinGW bash
if exist "C:\msys64\usr\bin\bash.exe" (
    set SHELL=C:\msys64\usr\bin\bash.exe
    echo Found MSYS2 bash at: %SHELL%
    goto :run_claude
)

REM Method 4: Check for Cygwin bash
if exist "C:\cygwin64\bin\bash.exe" (
    set SHELL=C:\cygwin64\bin\bash.exe
    echo Found Cygwin bash at: %SHELL%
    goto :run_claude
)

REM No POSIX shell found - provide instructions
echo ERROR: No POSIX shell found!
echo.
echo Claude Code requires a POSIX-compatible shell. Please install one of:
echo.
echo 1. Git for Windows (recommended - includes Git Bash)
echo    Download: https://git-scm.com/download/win
echo.
echo 2. Windows Subsystem for Linux (WSL)
echo    Install: wsl --install (in PowerShell as Admin)
echo.
echo 3. MSYS2
echo    Download: https://www.msys2.org/
echo.
echo After installation, run this wrapper again.
pause
exit /b 1

:run_claude
echo.
echo Starting Claude Code with SHELL=%SHELL%
echo.

REM Set additional environment variables that might be needed
set PATH=%GIT_PATH%..\bin;%PATH%
set TERM=xterm-256color

REM Run Claude Code with the baseline executable
claude-code-windows-x64-baseline.exe %*
