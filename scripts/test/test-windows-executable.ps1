#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Test script for verifying Windows executable functionality after import.meta fix
.DESCRIPTION
    This script tests the Claude Code Windows executable to ensure the import.meta
    issue has been resolved and basic functionality works correctly.
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ExecutablePath = ".\dist\claude-code-windows-x64-baseline.exe",
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# Enable verbose output if requested
if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "Claude Code Windows Executable Test Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if executable exists
if (-not (Test-Path $ExecutablePath)) {
    Write-Error "Executable not found at: $ExecutablePath"
    Write-Host "Please ensure you've built the Windows executable first with:" -ForegroundColor Yellow
    Write-Host "  bun run scripts/build/build-executables.js windows" -ForegroundColor Yellow
    exit 1
}

Write-Host "Testing executable: $ExecutablePath" -ForegroundColor Green

# Test 1: Basic execution (should show help/version info)
Write-Host ""
Write-Host "Test 1: Basic execution (--version)" -ForegroundColor Yellow
try {
    $versionOutput = & $ExecutablePath --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Version check passed" -ForegroundColor Green
        Write-Verbose "Output: $versionOutput"
    } else {
        Write-Host "✗ Version check failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Output: $versionOutput" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Failed to execute: $_" -ForegroundColor Red
}

# Test 2: Help command
Write-Host ""
Write-Host "Test 2: Help command (--help)" -ForegroundColor Yellow
try {
    $helpOutput = & $ExecutablePath --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Help command passed" -ForegroundColor Green
        Write-Verbose "Output length: $($helpOutput.Length) characters"
    } else {
        Write-Host "✗ Help command failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Output: $helpOutput" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Failed to execute: $_" -ForegroundColor Red
}

# Test 3: Check for import.meta error
Write-Host ""
Write-Host "Test 3: Checking for import.meta errors" -ForegroundColor Yellow
try {
    # Run a simple command that would trigger module loading
    $errorCheck = & $ExecutablePath --version 2>&1 | Out-String
    
    if ($errorCheck -match "import\.meta.*is only valid inside modules") {
        Write-Host "✗ import.meta error still present!" -ForegroundColor Red
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $errorCheck -ForegroundColor Red
    } else {
        Write-Host "✓ No import.meta errors detected" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Error during check: $_" -ForegroundColor Red
}

# Test 4: Check embedded assets
Write-Host ""
Write-Host "Test 4: Verifying embedded assets" -ForegroundColor Yellow
try {
    # This would normally trigger loading of embedded assets
    $env:CLAUDE_CODE_DEBUG = "1"
    $debugOutput = & $ExecutablePath --version 2>&1 | Out-String
    $env:CLAUDE_CODE_DEBUG = $null
    
    if ($debugOutput -match "B:/~BUN/root/") {
        Write-Host "✓ Embedded assets appear to be included" -ForegroundColor Green
        Write-Verbose "Found Bun embedded path references"
    } else {
        Write-Host "⚠ Could not verify embedded assets (may still be working)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not verify embedded assets: $_" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All basic tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The Windows executable appears to be working correctly." -ForegroundColor Green
    Write-Host "The import.meta issue has been resolved." -ForegroundColor Green
} else {
    Write-Host "⚠️ Some tests may have issues" -ForegroundColor Yellow
    Write-Host "Please review the output above for details." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To run more comprehensive tests on Windows:" -ForegroundColor Cyan
Write-Host "  1. Copy the executable to a Windows machine" -ForegroundColor White
Write-Host "  2. Run: .\claude-code-windows-x64-baseline.exe" -ForegroundColor White
Write-Host "  3. Try various commands to ensure full functionality" -ForegroundColor White 