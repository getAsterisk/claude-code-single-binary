#!/usr/bin/env node

// Test script to verify file URL replacements

console.log('Testing file URL replacements...\n');

// Simulate what happens in the bundled executable
const testFilename = process.argv[1] || '.';
const testDirname = require('path').dirname(testFilename);

console.log('testFilename:', testFilename);
console.log('testDirname:', testDirname);

// Test the import.meta.url replacement
const importMetaUrlReplacement = (typeof testFilename !== 'undefined' ? 'file://' + testFilename.replace(/\\/g, '/') : 'file:///');
console.log('\nimport.meta.url replacement:', importMetaUrlReplacement);

// Check if it's a valid URL
try {
  const url = new URL(importMetaUrlReplacement);
  console.log('✓ Valid URL:', url.href);
  console.log('  Protocol:', url.protocol);
  console.log('  Pathname:', url.pathname);
} catch (error) {
  console.error('✗ Invalid URL:', error.message);
}

// Test with absolute path
console.log('\n--- Testing with absolute path ---');
const absolutePath = require('path').resolve(testFilename);
const fileUrl = 'file:///' + absolutePath.replace(/\\/g, '/');
console.log('Absolute path:', absolutePath);
console.log('File URL with 3 slashes:', fileUrl);

try {
  const url = new URL(fileUrl);
  console.log('✓ Valid URL:', url.href);
} catch (error) {
  console.error('✗ Invalid URL:', error.message);
}

// Test on Windows paths
console.log('\n--- Testing Windows path conversion ---');
const windowsPaths = [
  'C:\\Users\\Rob Banks\\Downloads\\claude-code.exe',
  '.\\claude-code.exe',
  'claude-code.exe'
];

for (const path of windowsPaths) {
  console.log(`\nTesting: ${path}`);
  
  // Test our current approach (2 slashes)
  const converted = 'file://' + path.replace(/\\/g, '/');
  console.log('Current approach (2 slashes):', converted);
  
  try {
    const url = new URL(converted);
    console.log('✓ Valid URL');
  } catch (error) {
    console.error('✗ Invalid URL:', error.message);
  }
  
  // Test proper Windows file URL
  const isAbsolute = require('path').isAbsolute(path);
  let properUrl;
  
  if (isAbsolute) {
    // For Windows absolute paths, we need three slashes
    properUrl = 'file:///' + path.replace(/\\/g, '/');
  } else {
    // Relative paths need to be resolved first
    const resolved = require('path').resolve(path);
    properUrl = 'file:///' + resolved.replace(/\\/g, '/');
  }
  
  console.log('Proper approach (3 slashes for absolute):', properUrl);
  try {
    const url = new URL(properUrl);
    console.log('✓ Valid URL');
  } catch (error) {
    console.error('✗ Invalid URL:', error.message);
  }
}

// The real issue
console.log('\n--- The Real Issue ---');
console.log('When __filename is not an absolute path, we create invalid file URLs.');
console.log('Example: if __filename is ".", then file URL becomes "file://." which is invalid.');
console.log('We need to ensure __filename is always an absolute path before creating file URLs.'); 