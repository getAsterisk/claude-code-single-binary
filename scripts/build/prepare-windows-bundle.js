#!/usr/bin/env bun

/**
 * Prepare the CLI for Windows executable bundling
 * This script handles the import.meta issues that occur when Bun compiles ES modules
 * to Windows executables by replacing them with runtime-compatible alternatives
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

console.log('Preparing Windows bundle with import.meta fixes...');

// Create a temporary directory for the Windows build
const tempDir = join(projectRoot, '.windows-build-temp');
if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

/**
 * Replace import.meta.url references with a runtime-compatible alternative
 * In the bundled executable context, we use a global __filename equivalent
 */
function replaceImportMetaUrl(content, isMainCli = false) {
  // Define a runtime-compatible __filename for bundled context
  const bundledFilename = isMainCli ? 
    'process.argv[1] || __filename' : 
    '__filename';
    
  // Pattern to match various import.meta.url usages
  const patterns = [
    // Direct import.meta.url usage
    {
      pattern: /import\.meta\.url/g,
      replacement: `(typeof __filename !== 'undefined' ? 'file://' + __filename.replace(/\\\\/g, '/') : 'file:///')`
    },
    // fileURLToPath(import.meta.url) pattern
    {
      pattern: /fileURLToPath\s*\(\s*import\.meta\.url\s*\)/g,
      replacement: `(typeof __filename !== 'undefined' ? __filename : process.argv[1] || '.')`
    },
    // Variable assignments with import.meta.url
    {
      pattern: /var\s+(\w+)\s*=\s*\w+\s*\(\s*import\.meta\.url\s*\)/g,
      replacement: (match, varName) => `var ${varName} = (typeof __filename !== 'undefined' ? __filename : process.argv[1] || '.')`
    },
    // dirname(fileURLToPath(import.meta.url)) pattern
    {
      pattern: /\w+\s*\(\s*\w+\s*\(\s*import\.meta\.url\s*\)\s*\)/g,
      replacement: `(typeof __dirname !== 'undefined' ? __dirname : process.cwd())`
    }
  ];
  
  let modifiedContent = content;
  for (const { pattern, replacement } of patterns) {
    modifiedContent = modifiedContent.replace(pattern, replacement);
  }
  
  return modifiedContent;
}

/**
 * Process the SDK file to make it Windows-compatible
 */
function processSdkFile() {
  const sdkPath = join(projectRoot, 'sdk.mjs');
  const sdkContent = readFileSync(sdkPath, 'utf-8');
  
  console.log('Processing sdk.mjs for Windows compatibility...');
  
  // Replace import.meta.url references
  let modifiedSdk = replaceImportMetaUrl(sdkContent, false);
  
  // Add a compatibility wrapper at the beginning
  const compatWrapper = `// Windows executable compatibility wrapper
const __windowsCompat = (() => {
  if (typeof __filename === 'undefined' && typeof process !== 'undefined') {
    globalThis.__filename = process.argv[1] || '.';
    globalThis.__dirname = require('path').dirname(globalThis.__filename);
  }
})();

`;
  
  modifiedSdk = compatWrapper + modifiedSdk;
  
  // Write to temp directory
  const tempSdkPath = join(tempDir, 'sdk.mjs');
  writeFileSync(tempSdkPath, modifiedSdk);
  console.log('✓ Created Windows-compatible sdk.mjs');
  
  return tempSdkPath;
}

/**
 * Process the CLI file with comprehensive Windows fixes
 */
function processCliFile() {
  const cliPath = join(projectRoot, 'cli.js');
  let cliContent = readFileSync(cliPath, 'utf-8');
  
  console.log('Processing cli.js for Windows compatibility...');
  
  // First, apply all the native bundle preparations
  const embeddedImports = [];
  const embeddedFilesMapping = [];
  
  // Define all possible ripgrep files
  const ripgrepFiles = [
    { path: './vendor/ripgrep/x64-win32/rg.exe', var: '__embeddedRgWin32' },
    { path: './vendor/ripgrep/x64-win32/ripgrep.node', var: '__embeddedRgNodeWin32' },
  ];
  
  // Always include yoga.wasm
  if (existsSync(join(projectRoot, 'yoga.wasm'))) {
    embeddedImports.push('import __embeddedYogaWasm from "./yoga.wasm" with { type: "file" };');
    embeddedFilesMapping.push("  'yoga.wasm': __embeddedYogaWasm,");
  }
  
  // Only import ripgrep files that exist
  for (const file of ripgrepFiles) {
    const fullPath = join(projectRoot, file.path);
    if (existsSync(fullPath)) {
      embeddedImports.push(`import ${file.var} from "${file.path}" with { type: "file" };`);
      const key = file.path.replace('./', '');
      embeddedFilesMapping.push(`  '${key}': ${file.var},`);
    }
  }
  
  const embeddedCode = `
// Windows executable compatibility
const __isWindowsExecutable = true;
const __executablePath = process.argv[1] || __filename || '.';
const __executableDir = require('path').dirname(__executablePath);

// Embedded files using Bun's native embedding
${embeddedImports.join('\n')}

const __embeddedFiles = {
${embeddedFilesMapping.join('\n')}
};

// Override import.meta polyfill
if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = __executablePath;
  globalThis.__dirname = __executableDir;
}

`;
  
  // Add imports after the shebang
  const shebangMatch = cliContent.match(/^#!.*\n/);
  if (shebangMatch) {
    cliContent = shebangMatch[0] + embeddedCode + cliContent.substring(shebangMatch[0].length);
  } else {
    cliContent = embeddedCode + cliContent;
  }
  
  // Replace all import.meta.url references
  cliContent = replaceImportMetaUrl(cliContent, true);
  
  // Handle yoga.wasm loading
  const yogaPatterns = [
    /var\s+(\w+)\s*=\s*await\s+\w+\s*\(\s*await\s+\w+\s*\(\s*\w+\s*\(\s*import\.meta\.url\s*\)\.resolve\s*\(\s*["']\.\/yoga\.wasm["']\s*\)\s*\)\s*\)/g,
    /await\s+\w+\s*\(\s*await\s+\w+\s*\(\s*\w+\s*\(\s*import\.meta\.url\s*\)\.resolve\s*\(\s*["']\.\/yoga\.wasm["']\s*\)\s*\)\s*\)/g
  ];
  
  for (const pattern of yogaPatterns) {
    cliContent = cliContent.replace(pattern, (match) => {
      const varMatch = match.match(/var\s+(\w+)\s*=/);
      const varName = varMatch ? varMatch[1] : null;
      const replacement = `await(async()=>{
        if(typeof __embeddedYogaWasm !== 'undefined') {
          return await nUA(await Bun.file(__embeddedYogaWasm).arrayBuffer());
        } else {
          const yogaPath = require('path').join(__executableDir, 'yoga.wasm');
          const fs = require('fs');
          return await nUA(fs.readFileSync(yogaPath).buffer);
        }
      })()`;
      return varName ? `var ${varName}=${replacement}` : replacement;
    });
  }
  
  // Handle ripgrep path resolution for Windows
  const ripgrepResolvePattern = /let\s+B\s*=\s*\w+\.resolve\s*\(\s*\w+\s*,\s*"vendor"\s*,\s*"ripgrep"\s*\)/g;
  cliContent = cliContent.replace(ripgrepResolvePattern, (match) => {
    return `${match};
    // Windows executable override
    if(__isWindowsExecutable && typeof __embeddedFiles !== 'undefined') {
      const rgKey = "vendor/ripgrep/x64-win32/rg.exe";
      if(__embeddedFiles[rgKey]) {
        return __embeddedFiles[rgKey];
      }
    }`;
  });
  
  // Handle ripgrep.node loading
  const ripgrepNodePattern = /B\s*=\s*["']\.\/ripgrep\.node["']/g;
  cliContent = cliContent.replace(ripgrepNodePattern, `B=(() => {
    if(__isWindowsExecutable && typeof __embeddedFiles !== 'undefined') {
      const nodeKey = "vendor/ripgrep/x64-win32/ripgrep.node";
      if(__embeddedFiles[nodeKey]) {
        return __embeddedFiles[nodeKey];
      }
    }
    return "./ripgrep.node";
  })()`);
  
  // Bypass POSIX shell requirement for Windows
  const shellCheckPattern = /let\s+J\s*=\s*\w+\.find\s*\(\s*\([^)]+\)\s*=>\s*[^}]+\);\s*if\s*\(\s*!\s*J\s*\)\s*\{[^}]+throw[^}]+\}/g;
  cliContent = cliContent.replace(shellCheckPattern, (match) => {
    const varMatch = match.match(/let\s+(\w+)/);
    const varName = varMatch ? varMatch[1] : 'J';
    return `${match.split(';')[0]};if(!${varName}){${varName}="cmd.exe"}`;
  });
  
  // Set bundled mode indicator
  cliContent = cliContent.replace(
    /process\.env\.CLAUDE_CODE_ENTRYPOINT\s*=\s*["']cli["']/,
    'process.env.CLAUDE_CODE_ENTRYPOINT="cli";process.env.CLAUDE_CODE_BUNDLED="1";process.env.CLAUDE_CODE_WINDOWS_EXECUTABLE="1"'
  );
  
  // Write to temp directory
  const tempCliPath = join(tempDir, 'cli-windows.js');
  writeFileSync(tempCliPath, cliContent);
  console.log('✓ Created Windows-compatible cli.js');
  
  return tempCliPath;
}

/**
 * Copy other necessary files to temp directory
 */
function copyRequiredFiles() {
  const filesToCopy = ['package.json', 'sdk.d.ts', 'yoga.wasm'];
  
  for (const file of filesToCopy) {
    const srcPath = join(projectRoot, file);
    if (existsSync(srcPath)) {
      const destPath = join(tempDir, file);
      copyFileSync(srcPath, destPath);
      console.log(`✓ Copied ${file}`);
    }
  }
  
  // Copy vendor directory structure
  const vendorSrc = join(projectRoot, 'vendor');
  const vendorDest = join(tempDir, 'vendor');
  
  if (existsSync(vendorSrc)) {
    copyDirectoryRecursive(vendorSrc, vendorDest);
    console.log('✓ Copied vendor directory');
  }
}

/**
 * Recursively copy directory
 */
function copyDirectoryRecursive(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Import required for directory operations
import { readdirSync } from 'fs';

// Main execution
async function main() {
  try {
    // Process files
    processSdkFile();
    const cliPath = processCliFile();
    copyRequiredFiles();
    
    console.log('\n✅ Windows bundle preparation complete!');
    console.log(`\nTemporary build directory: ${tempDir}`);
    console.log(`Main CLI file: ${cliPath}`);
    console.log('\nNow you can build the Windows executable with:');
    console.log(`  cd ${tempDir}`);
    console.log('  bun build --compile --minify --target=bun-windows-x64 ./cli-windows.js --outfile ../claude-code-windows.exe');
    
  } catch (error) {
    console.error('❌ Error preparing Windows bundle:', error);
    process.exit(1);
  }
}

main(); 