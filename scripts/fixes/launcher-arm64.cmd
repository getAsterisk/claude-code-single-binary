@echo off
REM Windows ARM64 Compatibility Launcher for Claude Code
REM This script tries various methods to run x64 binaries on ARM64

echo Claude Code ARM64 Launcher
echo =========================
echo.

REM Method 1: Direct execution
echo Attempting direct execution...
claude-code-windows-x64.exe %*
if %ERRORLEVEL% EQU 0 goto :success

REM Method 2: Force x64 cmd.exe
echo Direct execution failed. Trying x64 emulation layer...
if exist "%SystemRoot%\SysWOW64\cmd.exe" (
    %SystemRoot%\SysWOW64\cmd.exe /c claude-code-windows-x64.exe %*
    if %ERRORLEVEL% EQU 0 goto :success
)

REM Method 3: Set compatibility environment
echo x64 emulation failed. Trying compatibility environment...
set PROCESSOR_ARCHITECTURE=AMD64
set PROCESSOR_ARCHITEW6432=AMD64
claude-code-windows-x64.exe %*
if %ERRORLEVEL% EQU 0 goto :success

REM Method 4: Try the baseline variant (might have better compatibility)
echo Standard binary failed. Trying baseline variant...
if exist "claude-code-windows-x64-baseline.exe" (
    claude-code-windows-x64-baseline.exe %*
    if %ERRORLEVEL% EQU 0 goto :success
)

REM All methods failed
echo.
echo ERROR: Unable to run Claude Code on Windows ARM64
echo.
echo This is likely because:
echo 1. Bun runtime doesn't support Windows ARM64 x64 emulation
echo 2. Native modules (ripgrep.node) are incompatible
echo.
echo Alternatives:
echo - Use Wine on macOS/Linux in UTM instead
echo - Install Node.js ARM64 and use: npm install -g @anthropic-ai/claude-code
echo - Wait for native Windows ARM64 support
echo.
pause
exit /b 1

:success
exit /b 0
