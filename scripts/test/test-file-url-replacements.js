#!/usr/bin/env node

// Test script to verify file URL replacements

console.log('Testing file URL replacements...\n');

// Simulate what happens in the bundled executable
const __filename = process.argv[1] || '.';
const __dirname = require('path').dirname(__filename);

console.log('__filename:', __filename);
console.log('__dirname:', __dirname);

// Test our replacements
const replacements = {
  'import.meta.url': `(typeof __filename !== 'undefined' ? 'file://' + __filename.replace(/\\\\/g, '/') : 'file:///')`,
  'fileURLToPath(import.meta.url)': `(typeof __filename !== 'undefined' ? __filename : process.argv[1] || '.')`,
};

// Test the import.meta.url replacement
const importMetaUrlReplacement = (typeof __filename !== 'undefined' ? 'file://' + __filename.replace(/\\/g, '/') : 'file:///');
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
const absolutePath = require('path').resolve(__filename);
const fileUrl = 'file://' + absolutePath.replace(/\\/g, '/');
console.log('Absolute path:', absolutePath);
console.log('File URL:', fileUrl);

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
  const converted = 'file://' + path.replace(/\\/g, '/');
  console.log('Converted:', converted);
  
  try {
    const url = new URL(converted);
    console.log('✓ Valid URL');
  } catch (error) {
    console.error('✗ Invalid URL:', error.message);
  }
} 