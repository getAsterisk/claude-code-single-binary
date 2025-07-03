Write-Host "Windows ARM64 x64 Binary Diagnostics" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check system info
Write-Host "System Information:" -ForegroundColor Yellow
$arch = (Get-WmiObject Win32_Processor).Architecture
$archName = switch($arch) {
    0 {"x86"}
    5 {"ARM"}
    9 {"x64"}
    12 {"ARM64"}
    default {"Unknown"}
}
Write-Host "Processor Architecture: $archName ($arch)"
Write-Host "OS Architecture: $env:PROCESSOR_ARCHITECTURE"
Write-Host "WOW64: $env:PROCESSOR_ARCHITEW6432"
Write-Host ""

# Test binary execution
Write-Host "Testing Binary Execution:" -ForegroundColor Yellow
$exePath = ".\dist\claude-code-windows-x64.exe"

try {
    Write-Host "1. Direct execution test..."
    $proc = Start-Process -FilePath $exePath -ArgumentList "--version" -Wait -PassThru -NoNewWindow
    Write-Host "   Exit code: $($proc.ExitCode)" -ForegroundColor $(if($proc.ExitCode -eq 0){"Green"}else{"Red"})
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Check for missing dependencies
Write-Host ""
Write-Host "2. Checking dependencies with dumpbin (if available)..."
try {
    & where.exe dumpbin.exe 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        & dumpbin.exe /dependents $exePath
    } else {
        Write-Host "   dumpbin not found - install Visual Studio tools for detailed analysis"
    }
} catch {
    Write-Host "   Could not run dependency check"
}

# Check Windows Event Log
Write-Host ""
Write-Host "3. Checking Application Event Log for errors..." -ForegroundColor Yellow
$events = Get-EventLog -LogName Application -Newest 20 | Where-Object {
    $_.Source -like "*WER*" -or $_.Source -like "*Application Error*" -or $_.Message -like "*claude-code*"
}
if ($events) {
    $events | Format-Table TimeGenerated, Source, Message -AutoSize
} else {
    Write-Host "   No recent application errors found"
}

# Try with compatibility settings
Write-Host ""
Write-Host "4. Testing with ProcessorArchitecture override..." -ForegroundColor Yellow
$env:PROCESSOR_ARCHITECTURE = "AMD64"
try {
    $proc = Start-Process -FilePath $exePath -ArgumentList "--help" -Wait -PassThru -NoNewWindow
    Write-Host "   Exit code: $($proc.ExitCode)" -ForegroundColor $(if($proc.ExitCode -eq 0){"Green"}else{"Red"})
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}
$env:PROCESSOR_ARCHITECTURE = $null

Write-Host ""
Write-Host "Diagnostics complete. Copy this output for troubleshooting." -ForegroundColor Green
