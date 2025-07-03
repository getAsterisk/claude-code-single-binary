@echo off
REM Test script for ripgrep functionality in Claude Code Windows executables
REM Run this in your Windows UTM emulation to test if ripgrep is working

echo Claude Code Ripgrep Test Script
echo ==============================
echo.

REM Set debug mode for more verbose output
set DEBUG=1
set CLAUDE_DEBUG=1

REM Test each executable variant
echo Testing Windows x64 executables...
echo.

REM Test 1: Standard x64 executable
echo [TEST 1] Testing claude-code-windows-x64.exe
echo -----------------------------------------
if exist "dist\claude-code-windows-x64.exe" (
    echo Running: dist\claude-code-windows-x64.exe --version
    dist\claude-code-windows-x64.exe --version
    echo.
    echo Running ripgrep test: Bash(rg --version)
    echo Bash(rg --version) | dist\claude-code-windows-x64.exe
    echo Exit code: %ERRORLEVEL%
) else (
    echo ERROR: claude-code-windows-x64.exe not found in dist\
)
echo.

REM Test 2: Baseline x64 executable
echo [TEST 2] Testing claude-code-windows-x64-baseline.exe
echo ----------------------------------------------------
if exist "dist\claude-code-windows-x64-baseline.exe" (
    echo Running: dist\claude-code-windows-x64-baseline.exe --version
    dist\claude-code-windows-x64-baseline.exe --version
    echo.
    echo Running ripgrep test: Bash(rg --version)
    echo Bash(rg --version) | dist\claude-code-windows-x64-baseline.exe
    echo Exit code: %ERRORLEVEL%
) else (
    echo ERROR: claude-code-windows-x64-baseline.exe not found in dist\
)
echo.

REM Test 3: Modern x64 executable
echo [TEST 3] Testing claude-code-windows-x64-modern.exe
echo --------------------------------------------------
if exist "dist\claude-code-windows-x64-modern.exe" (
    echo Running: dist\claude-code-windows-x64-modern.exe --version
    dist\claude-code-windows-x64-modern.exe --version
    echo.
    echo Running ripgrep test: Bash(rg --version)
    echo Bash(rg --version) | dist\claude-code-windows-x64-modern.exe
    echo Exit code: %ERRORLEVEL%
) else (
    echo ERROR: claude-code-windows-x64-modern.exe not found in dist\
)
echo.

REM Test with shell wrapper if needed
echo [TEST 4] Testing with shell wrapper
echo -----------------------------------
if exist "windows-shell-wrapper.cmd" (
    echo Running with shell wrapper...
    call windows-shell-wrapper.cmd
) else (
    echo Shell wrapper not found, skipping...
)
echo.

REM Test with quick-fix-shell if needed
echo [TEST 5] Testing with quick-fix-shell
echo -------------------------------------
if exist "quick-fix-shell.bat" (
    echo Running with quick-fix-shell...
    cd dist
    ..\quick-fix-shell.bat
    cd ..
) else (
    echo Quick-fix-shell not found, skipping...
)
echo.

REM Summary
echo ==============================
echo Test Summary:
echo.
echo If you see "ripgrep X.X.X" output above, ripgrep is working!
echo If you see "undefined is not an object" errors, the issue persists.
echo.
echo Additional debugging steps:
echo 1. Check Windows Event Viewer for crash details
echo 2. Run with PowerShell: .\scripts\debug\debug-arm64.ps1
echo 3. Try the launcher: .\scripts\fixes\launcher-arm64.cmd
echo.
pause 