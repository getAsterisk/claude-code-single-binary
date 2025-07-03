# Claude Code Windows Shell Fix
# PowerShell script to set up POSIX shell environment

Write-Host "Claude Code Windows Shell Configuration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Function to test if a shell works
function Test-Shell {
    param($shellPath)
    try {
        $env:SHELL = $shellPath
        Write-Host "Testing shell: $shellPath" -ForegroundColor Yellow
        & cmd /c echo test 2>&1 | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Check for various POSIX shells
$shells = @()

# 1. Git Bash (most common)
$gitPath = (Get-Command git -ErrorAction SilentlyContinue).Source
if ($gitPath) {
    $gitBash = Join-Path (Split-Path (Split-Path $gitPath)) "bin\bash.exe"
    if (Test-Path $gitBash) {
        $shells += @{Name="Git Bash"; Path=$gitBash}
    }
}

# 2. WSL
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    # Create a wrapper script for WSL bash
    $wslWrapper = "$env:TEMP\wsl-bash.bat"
    "@echo off`nwsl bash %*" | Out-File -FilePath $wslWrapper -Encoding ASCII
    $shells += @{Name="WSL Bash"; Path=$wslWrapper}
}

# 3. MSYS2
if (Test-Path "C:\msys64\usr\bin\bash.exe") {
    $shells += @{Name="MSYS2 Bash"; Path="C:\msys64\usr\bin\bash.exe"}
}

# 4. Cygwin
if (Test-Path "C:\cygwin64\bin\bash.exe") {
    $shells += @{Name="Cygwin Bash"; Path="C:\cygwin64\bin\bash.exe"}
}

# 5. PowerShell as sh (fallback)
$psShimPath = "$env:TEMP\powershell-sh.bat"
$psShim = @'
@echo off
powershell -NoProfile -Command "& {$input | ForEach-Object {$_}}" %*
'@
$psShim | Out-File -FilePath $psShimPath -Encoding ASCII
$shells += @{Name="PowerShell Shim"; Path=$psShimPath}

if ($shells.Count -eq 0) {
    Write-Host "ERROR: No compatible shells found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Git for Windows:" -ForegroundColor Yellow
    Write-Host "https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or enable WSL:" -ForegroundColor Yellow
    Write-Host "wsl --install" -ForegroundColor Cyan
    exit 1
}

# Display found shells
Write-Host "Found shells:" -ForegroundColor Green
for ($i = 0; $i -lt $shells.Count; $i++) {
    Write-Host "$($i + 1). $($shells[$i].Name): $($shells[$i].Path)"
}

# Use the first available shell
$selectedShell = $shells[0]
Write-Host ""
Write-Host "Using: $($selectedShell.Name)" -ForegroundColor Green

# Set environment variables
$env:SHELL = $selectedShell.Path
$env:TERM = "xterm-256color"
$env:PATH = (Split-Path $selectedShell.Path) + ";" + $env:PATH

# Create a launcher script
$launcherPath = ".\claude-launcher.cmd"
$launcher = @"
@echo off
set SHELL=$($selectedShell.Path)
set TERM=xterm-256color
set PATH=$(Split-Path $selectedShell.Path);%PATH%
echo Starting Claude Code with $($selectedShell.Name)...
claude-code-windows-x64-baseline.exe %*
"@

$launcher | Out-File -FilePath $launcherPath -Encoding ASCII
Write-Host ""
Write-Host "Created launcher: $launcherPath" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run Claude Code using:" -ForegroundColor Yellow
Write-Host "  .\claude-launcher.cmd --help" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or run directly with environment set:" -ForegroundColor Yellow
Write-Host "  claude-code-windows-x64-baseline.exe --help" -ForegroundColor Cyan

# Try running it
Write-Host ""
Write-Host "Testing Claude Code..." -ForegroundColor Yellow
try {
    Start-Process -FilePath "claude-code-windows-x64-baseline.exe" -ArgumentList "--version" -Wait -NoNewWindow
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
