# Claude Code Shell Bypass Test Script
# Tests if Windows executables work WITHOUT any POSIX shell

Write-Host "Claude Code Shell Bypass Test" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Clear any existing SHELL environment variable
$env:SHELL = $null
Write-Host "Cleared SHELL environment variable" -ForegroundColor Yellow
Write-Host "Current SHELL value: $(if($env:SHELL){'$env:SHELL'}else{'<not set>'})" -ForegroundColor Gray
Write-Host ""

# Function to test executable
function Test-ExecutableWithoutShell {
    param(
        [string]$ExePath,
        [string]$Name
    )
    
    Write-Host "[TEST] $Name" -ForegroundColor Yellow
    Write-Host ("-" * 50) -ForegroundColor Gray
    
    if (Test-Path $ExePath) {
        Write-Host "Testing: $ExePath" -ForegroundColor Green
        
        # Test 1: Version check
        try {
            $output = & $ExePath --version 2>&1 | Out-String
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ SUCCESS: Version check passed!" -ForegroundColor Green
                Write-Host "Output: $output" -ForegroundColor Gray
            } else {
                Write-Host "✗ FAILED: Version check failed with exit code $LASTEXITCODE" -ForegroundColor Red
                Write-Host "Output: $output" -ForegroundColor Gray
            }
        } catch {
            Write-Host "✗ ERROR: $_" -ForegroundColor Red
        }
        
        # Test 2: Simple command
        Write-Host "`nTesting simple command execution..." -ForegroundColor Cyan
        try {
            $testCommand = "console.log('Shell bypass is working!')"
            $result = "JavaScript($testCommand)" | & $ExePath 2>&1 | Out-String
            if ($result -match "Shell bypass is working") {
                Write-Host "✓ SUCCESS: Command execution works!" -ForegroundColor Green
            } else {
                Write-Host "Output: $result" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "✗ Command execution error: $_" -ForegroundColor Red
        }
        
    } else {
        Write-Host "✗ ERROR: Executable not found at $ExePath" -ForegroundColor Red
    }
    Write-Host ""
}

# Test all executables
$executables = @(
    @{ Path = "dist\claude-code-windows-x64.exe"; Name = "Standard x64" },
    @{ Path = "dist\claude-code-windows-x64-baseline.exe"; Name = "Baseline x64" },
    @{ Path = "dist\claude-code-windows-x64-modern.exe"; Name = "Modern x64" }
)

Write-Host "Testing executables WITHOUT any POSIX shell..." -ForegroundColor Cyan
Write-Host ""

foreach ($exe in $executables) {
    Test-ExecutableWithoutShell -ExePath $exe.Path -Name $exe.Name
}

# Check if Git Bash is installed
Write-Host "System Shell Check" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

$gitBashPaths = @(
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files (x86)\Git\bin\bash.exe"
)

$foundGitBash = $false
foreach ($path in $gitBashPaths) {
    if (Test-Path $path) {
        Write-Host "Found Git Bash at: $path" -ForegroundColor Yellow
        $foundGitBash = $true
    }
}

if (-not $foundGitBash) {
    Write-Host "✓ No Git Bash found - this is a clean test!" -ForegroundColor Green
} else {
    Write-Host "Note: Git Bash is installed but SHELL variable was cleared" -ForegroundColor Yellow
}

# Check WSL
try {
    $wslCheck = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wslCheck) {
        Write-Host "WSL is available on this system" -ForegroundColor Yellow
    } else {
        Write-Host "✓ WSL is not available - clean Windows environment" -ForegroundColor Green
    }
} catch {
    Write-Host "✓ WSL is not available - clean Windows environment" -ForegroundColor Green
}

Write-Host ""
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host @"

The POSIX shell bypass is successful if:
✓ All executables show version numbers
✓ No "No suitable shell found" errors appear
✓ Commands execute without requiring Git Bash/WSL

The executables now automatically use:
- cmd.exe on Windows
- /bin/sh on Unix-like systems

This means Claude Code can run on ANY Windows system,
even without Git Bash, WSL, MSYS2, or Cygwin!

"@ -ForegroundColor Green

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 