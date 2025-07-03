#!/usr/bin/env node

// Test script to verify the Windows file URL fix

console.log('Testing Windows file URL fix...\n');

// Simulate various scenarios that might occur in Windows executable
const testScenarios = [
  { argv1: 'C:\\Users\\Rob Banks\\Downloads\\claude-code-windows-x64-baseline.exe', desc: 'Absolute Windows path' },
  { argv1: '.\\claude-code.exe', desc: 'Relative Windows path' },
  { argv1: 'claude-code.exe', desc: 'Just filename' },
  { argv1: undefined, desc: 'No argv[1]' },
  { argv1: '.', desc: 'Just dot' }
];

for (const scenario of testScenarios) {
  console.log(`\n--- Testing: ${scenario.desc} ---`);
  console.log(`process.argv[1]: ${scenario.argv1}`);
  
  // Simulate our fix
  let __executablePath;
  if (scenario.argv1) {
    const path = require('path');
    __executablePath = path.isAbsolute(scenario.argv1) ? scenario.argv1 : path.resolve(scenario.argv1);
  } else {
    // Fallback to current working directory + a dummy filename
    __executablePath = require('path').join(process.cwd(), 'claude-code.exe');
  }
  
  console.log(`Resolved __executablePath: ${__executablePath}`);
  
  // Create file URL
  function __toFileURL(path) {
    const resolved = require('path').resolve(path);
    // On Windows, we need to handle drive letters properly
    if (process.platform === 'win32') {
      // Convert backslashes to forward slashes and ensure proper format
      return 'file:///' + resolved.replace(/\\/g, '/');
    }
    return 'file://' + resolved;
  }
  
  const fileUrl = __toFileURL(__executablePath);
  console.log(`File URL: ${fileUrl}`);
  
  // Test if it's valid
  try {
    const url = new URL(fileUrl);
    console.log('✓ Valid URL created');
    console.log(`  href: ${url.href}`);
    console.log(`  pathname: ${url.pathname}`);
  } catch (error) {
    console.error('✗ Invalid URL:', error.message);
  }
}

console.log('\n--- Summary ---');
console.log('The fix ensures that:');
console.log('1. process.argv[1] is always resolved to an absolute path');
console.log('2. If process.argv[1] is undefined, we use a fallback path');
console.log('3. File URLs are created with proper format (file:/// for Windows)');
console.log('4. All paths are normalized before creating file URLs'); 