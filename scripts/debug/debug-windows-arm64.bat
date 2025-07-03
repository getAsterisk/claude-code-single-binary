@echo off
echo Testing Windows x64 binary execution on ARM64...
echo.

REM Test 1: Check if the binary starts at all
echo Test 1: Checking if binary is recognized...
claude-code-windows-x64.exe --version 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error code: %ERRORLEVEL%
    echo Binary failed to execute
) else (
    echo Binary executed successfully
)
echo.

REM Test 2: Try with compatibility mode
echo Test 2: Running with explicit x64 emulation...
%SystemRoot%\SysWOW64\cmd.exe /c claude-code-windows-x64.exe --version 2>&1
echo.

REM Test 3: Check Windows Event Log for errors
echo Test 3: Checking for crash dumps...
wmic process where "name='claude-code-windows-x64.exe'" get ProcessId,Name,Status 2>&1
echo.

REM Test 4: Try running with debugging
echo Test 4: Running with Windows debugging...
set DEBUG=1
claude-code-windows-x64.exe --help 2>&1
echo.

echo Press any key to check Event Viewer for application errors...
pause
eventvwr.msc
