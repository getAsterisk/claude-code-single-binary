# Claude Code Ripgrep Test Script for Windows
# Run this in PowerShell on your Windows UTM emulation

Write-Host "Claude Code Ripgrep Test Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Enable debug mode
$env:DEBUG = "1"
$env:CLAUDE_DEBUG = "1"

# Function to test an executable
function Test-ClaudeCodeExecutable {
    param(
        [string]$ExePath,
        [string]$TestName
    )
    
    Write-Host "`n[$TestName]" -ForegroundColor Yellow
    Write-Host ("-" * 50) -ForegroundColor Gray
    
    if (Test-Path $ExePath) {
        # Test 1: Version check
        Write-Host "Running: $ExePath --version" -ForegroundColor Green
        try {
            & $ExePath --version 2>&1 | Out-Host
            Write-Host "Version check: SUCCESS" -ForegroundColor Green
        } catch {
            Write-Host "Version check: FAILED - $_" -ForegroundColor Red
        }
        
        # Test 2: Ripgrep command
        Write-Host "`nTesting ripgrep command..." -ForegroundColor Green
        try {
            $rgCommand = "Bash(rg --version)"
            Write-Host "Sending command: $rgCommand" -ForegroundColor Gray
            
            # Method 1: Using pipeline
            $result = $rgCommand | & $ExePath 2>&1
            Write-Host $result
            
            if ($result -match "ripgrep \d+\.\d+\.\d+") {
                Write-Host "Ripgrep test: SUCCESS - Found version: $($Matches[0])" -ForegroundColor Green
            } elseif ($result -match "undefined.*includes") {
                Write-Host "Ripgrep test: FAILED - $.includes error detected" -ForegroundColor Red
            } else {
                Write-Host "Ripgrep test: UNKNOWN - Output: $result" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Ripgrep test: FAILED - $_" -ForegroundColor Red
            Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Test 3: Direct ripgrep path check
        Write-Host "`nChecking embedded ripgrep..." -ForegroundColor Green
        try {
            $checkCommand = 'console.log("Platform:", process.platform, "Arch:", process.arch)'
            Write-Host "Checking platform detection..." -ForegroundColor Gray
            "JavaScript($checkCommand)" | & $ExePath 2>&1 | Out-Host
        } catch {
            Write-Host "Platform check failed: $_" -ForegroundColor Red
        }
        
    } else {
        Write-Host "ERROR: Executable not found at $ExePath" -ForegroundColor Red
    }
}

# Test all variants
$executables = @(
    @{ Path = "dist\claude-code-windows-x64.exe"; Name = "Standard x64" },
    @{ Path = "dist\claude-code-windows-x64-baseline.exe"; Name = "Baseline x64" },
    @{ Path = "dist\claude-code-windows-x64-modern.exe"; Name = "Modern x64" }
)

foreach ($exe in $executables) {
    Test-ClaudeCodeExecutable -ExePath $exe.Path -TestName $exe.Name
}

# Additional diagnostic information
Write-Host "`n`nAdditional Diagnostics" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# Check system information
Write-Host "`nSystem Information:" -ForegroundColor Yellow
Write-Host "OS: $([System.Environment]::OSVersion.VersionString)"
Write-Host "Architecture: $env:PROCESSOR_ARCHITECTURE"
Write-Host "Is 64-bit OS: $([System.Environment]::Is64BitOperatingSystem)"
Write-Host "Is 64-bit Process: $([System.Environment]::Is64BitProcess)"

# Check for recent errors in Event Log
Write-Host "`nChecking Event Log for recent Claude Code errors..." -ForegroundColor Yellow
try {
    $recentErrors = Get-EventLog -LogName Application -Newest 50 -ErrorAction SilentlyContinue | 
        Where-Object { $_.Message -like "*claude-code*" -or $_.Source -like "*Application Error*" } |
        Select-Object -First 5
    
    if ($recentErrors) {
        Write-Host "Found recent errors:" -ForegroundColor Red
        $recentErrors | Format-Table TimeGenerated, Source, Message -AutoSize
    } else {
        Write-Host "No recent Claude Code errors in Event Log" -ForegroundColor Green
    }
} catch {
    Write-Host "Could not access Event Log: $_" -ForegroundColor Yellow
}

Write-Host "`n`nTest Summary" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host @"

If you see "ripgrep X.X.X" output above, the issue is FIXED!
If you still see "undefined is not an object (evaluating '$.includes')", the issue persists.

Next steps if the issue persists:
1. Share the output of this test script
2. Run the ARM64 debug script: .\scripts\debug\debug-arm64.ps1
3. Try using Wine in WSL2 if available
4. Consider using the Node.js version instead

"@ -ForegroundColor Yellow

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 