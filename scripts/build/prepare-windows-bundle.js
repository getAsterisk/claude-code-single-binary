#!/usr/bin/env bun

/**
 * Prepare the CLI for Windows executable bundling
 * This script:
 * 1. Applies all standard native bundle preparations
 * 2. Then adds Windows-specific import.meta fixes on top
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

console.log('Preparing Windows bundle with native embedding + import.meta fixes...');

// Create a temporary directory for the Windows build
const tempDir = join(projectRoot, '.windows-build-temp');
if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

/**
 * Apply all native bundle preparations first
 */
function applyNativeBundlePreparations(cliContent) {
  console.log('Applying native bundle preparations...');
  
  // 1. Build list of embedded imports based on what files actually exist
  const embeddedImports = [];
  const embeddedFilesMapping = [];

  // Define all possible ripgrep files
  const ripgrepFiles = [
    { path: './vendor/ripgrep/arm64-darwin/rg', var: '__embeddedRgDarwinArm64' },
    { path: './vendor/ripgrep/arm64-darwin/ripgrep.node', var: '__embeddedRgNodeDarwinArm64' },
    { path: './vendor/ripgrep/arm64-linux/rg', var: '__embeddedRgLinuxArm64' },
    { path: './vendor/ripgrep/arm64-linux/ripgrep.node', var: '__embeddedRgNodeLinuxArm64' },
    { path: './vendor/ripgrep/x64-darwin/rg', var: '__embeddedRgDarwinX64' },
    { path: './vendor/ripgrep/x64-darwin/ripgrep.node', var: '__embeddedRgNodeDarwinX64' },
    { path: './vendor/ripgrep/x64-linux/rg', var: '__embeddedRgLinuxX64' },
    { path: './vendor/ripgrep/x64-linux/ripgrep.node', var: '__embeddedRgNodeLinuxX64' },
    { path: './vendor/ripgrep/x64-win32/rg.exe', var: '__embeddedRgWin32' },
    { path: './vendor/ripgrep/x64-win32/ripgrep.node', var: '__embeddedRgNodeWin32' },
  ];

  // Always include yoga.wasm
  if (existsSync(join(projectRoot, 'yoga.wasm'))) {
    embeddedImports.push('import __embeddedYogaWasm from "./yoga.wasm" with { type: "file" };');
    embeddedFilesMapping.push("  'yoga.wasm': __embeddedYogaWasm,");
  } else {
    console.error('Warning: yoga.wasm not found');
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
// Embedded files using Bun's native embedding
${embeddedImports.join('\n')}

const __embeddedFiles = {
${embeddedFilesMapping.join('\n')}
};

// Safe platform detection helper
function __getSafePlatform() {
  try {
    const p = typeof process !== 'undefined' ? process : {};
    const arch = (p.arch || 'x64').toString();
    const platform = (p.platform || 'win32').toString();
    return { arch, platform };
  } catch (e) {
    return { arch: 'x64', platform: 'win32' };
  }
}

`;

  // Add imports after the shebang
  const shebangMatch = cliContent.match(/^#!.*\n/);
  if (shebangMatch) {
    cliContent = shebangMatch[0] + embeddedCode + cliContent.substring(shebangMatch[0].length);
  } else {
    cliContent = embeddedCode + cliContent;
  }

  // 2. Replace yoga.wasm loading - handle top-level await properly
  const yogaLoadPattern = /var k81=await nUA\(await VP9\(CP9\(import\.meta\.url\)\.resolve\("\.\/yoga\.wasm"\)\)\);/;
  const yogaLoadReplacement = `var k81=await(async()=>{return await nUA(await Bun.file(__embeddedYogaWasm).arrayBuffer())})();`;

  if (yogaLoadPattern.test(cliContent)) {
    cliContent = cliContent.replace(yogaLoadPattern, yogaLoadReplacement);
    console.log('✓ Replaced yoga.wasm loading with embedded version');
  } else {
    // Try a more general pattern
    const generalYogaPattern = /var\s+(\w+)\s*=\s*await\s+nUA\s*\(\s*await\s+VP9\s*\([^)]+\.resolve\s*\(\s*["']\.\/yoga\.wasm["']\s*\)\s*\)\s*\)/;
    if (generalYogaPattern.test(cliContent)) {
      cliContent = cliContent.replace(generalYogaPattern, (match, varName) => {
        return `var ${varName}=await(async()=>{return await nUA(await Bun.file(__embeddedYogaWasm).arrayBuffer())})()`;
      });
      console.log('✓ Replaced yoga.wasm loading with embedded version (general pattern)');
    }
  }

  // 3. Replace ripgrep path resolution
  const ripgrepPattern = /let B=Db\.resolve\(et9,"vendor","ripgrep"\);/;
  const ripgrepReplacement = `
if(process.env.CLAUDE_CODE_BUNDLED || typeof __embeddedFiles !== 'undefined'){
  try {
    const safePlatform = __getSafePlatform();
    const platform = safePlatform.platform === "win32" ? "x64-win32" : (safePlatform.arch + "-" + safePlatform.platform);
    const rgKey = "vendor/ripgrep/" + platform + "/rg" + (safePlatform.platform === "win32" ? ".exe" : "");
    if(typeof __embeddedFiles !== 'undefined' && __embeddedFiles && __embeddedFiles[rgKey]) {
      return __embeddedFiles[rgKey];
    }
  } catch(e) {
    if(typeof console !== 'undefined' && console.error) {
      console.error("Error loading embedded ripgrep:", e);
    }
  }
}
let B=Db.resolve(et9,"vendor","ripgrep");`;

  if (ripgrepPattern.test(cliContent)) {
    cliContent = cliContent.replace(ripgrepPattern, ripgrepReplacement);
    console.log('✓ Added embedded file handling for ripgrep');
  }

  // 4. Replace ripgrep.node loading
  const ripgrepNodePattern = /if\(typeof Bun!=="undefined"&&Bun\.embeddedFiles\?\.length>0\)B="\.\/ripgrep\.node";else/;
  const ripgrepNodeReplacement = `if(typeof Bun!=="undefined"&&Bun.embeddedFiles?.length>0)B=(()=>{
  const platform = process.platform === "win32" ? "x64-win32" : \`\${process.arch}-\${process.platform}\`;
  const nodeKey = \`vendor/ripgrep/\${platform}/ripgrep.node\`;
  return __embeddedFiles[nodeKey] || "./ripgrep.node";
})();else`;

  if (ripgrepNodePattern.test(cliContent)) {
    cliContent = cliContent.replace(ripgrepNodePattern, ripgrepNodeReplacement);
    console.log('✓ Added embedded file handling for ripgrep.node');
  } else {
    // Fallback to simpler pattern
    const simplePattern = /B="\.\/ripgrep\.node"/;
    if (simplePattern.test(cliContent)) {
      cliContent = cliContent.replace(simplePattern, `B=(()=>{
        const platform = process.platform === "win32" ? "x64-win32" : \`\${process.arch}-\${process.platform}\`;
        const nodeKey = \`vendor/ripgrep/\${platform}/ripgrep.node\`;
        return __embeddedFiles[nodeKey] || "./ripgrep.node";
      })()`);
      console.log('✓ Added embedded file handling for ripgrep.node (fallback pattern)');
    }
  }

  // Set bundled mode indicator
  cliContent = cliContent.replace(
    /process\.env\.CLAUDE_CODE_ENTRYPOINT="cli"/,
    'process.env.CLAUDE_CODE_ENTRYPOINT="cli";process.env.CLAUDE_CODE_BUNDLED="1"'
  );

  // 5. Bypass POSIX shell requirement check
  const shellCheckPattern = /let J=W\.find\(\(F\)=>F&&cw0\(F\)\);if\(!J\)\{let F="No suitable shell found\. Claude CLI requires a Posix shell environment\. Please ensure you have a valid shell installed and the SHELL environment variable set\.";throw h1\(new Error\(F\)\),new Error\(F\)\}/;
  const shellCheckReplacement = `let J=W.find((F)=>F&&cw0(F));if(!J){J=process.platform==="win32"?"cmd.exe":"/bin/sh"}`;

  if (shellCheckPattern.test(cliContent)) {
    cliContent = cliContent.replace(shellCheckPattern, shellCheckReplacement);
    console.log('✓ Bypassed POSIX shell requirement check');
  } else {
    // Alternative pattern
    const altPattern = /if\(!J\)\{let F="No suitable shell found\. Claude CLI requires a Posix shell environment\. Please ensure you have a valid shell installed and the SHELL environment variable set\.";throw h1\(new Error\(F\)\),new Error\(F\)\}/;
    const altReplacement = 'if(!J){J=process.platform==="win32"?"cmd.exe":"/bin/sh"}';
    
    if (altPattern.test(cliContent)) {
      cliContent = cliContent.replace(altPattern, altReplacement);
      console.log('✓ Bypassed POSIX shell requirement check (alternative method)');
    }
  }

  return cliContent;
}

/**
 * Apply Windows-specific import.meta fixes on top of native preparations
 */
function applyWindowsImportMetaFixes(content) {
  console.log('Applying Windows-specific import.meta fixes...');
  
  // Add Windows compatibility header
  const windowsCompatHeader = `
// Windows executable compatibility - import.meta fixes
const __isWindowsExecutable = true;
const __executablePath = process.argv[1] || __filename || '.';
const __executableDir = require('path').dirname(__executablePath);

// Override import.meta polyfill
if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = __executablePath;
  globalThis.__dirname = __executableDir;
}

`;

  // Add after embedded files code but before the rest
  const embeddedFilesEndPattern = /}\s*\n\s*\/\/ Safe platform detection helper/;
  if (embeddedFilesEndPattern.test(content)) {
    content = content.replace(embeddedFilesEndPattern, (match) => {
      return `}\n${windowsCompatHeader}// Safe platform detection helper`;
    });
  }

  // Pattern to match various import.meta.url usages
  const importMetaPatterns = [
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
  
  for (const { pattern, replacement } of importMetaPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      console.log(`✓ Replaced import.meta pattern: ${pattern.source}`);
    }
  }

  // Mark as Windows executable build
  content = content.replace(
    /process\.env\.CLAUDE_CODE_BUNDLED="1"/,
    'process.env.CLAUDE_CODE_BUNDLED="1";process.env.CLAUDE_CODE_WINDOWS_EXECUTABLE="1"'
  );

  return content;
}

/**
 * Process the SDK file to make it Windows-compatible
 */
function processSdkFile() {
  const sdkPath = join(projectRoot, 'sdk.mjs');
  const sdkContent = readFileSync(sdkPath, 'utf-8');
  
  console.log('Processing sdk.mjs for Windows compatibility...');
  
  // Add a compatibility wrapper at the beginning
  const compatWrapper = `// Windows executable compatibility wrapper
const __windowsCompat = (() => {
  if (typeof __filename === 'undefined' && typeof process !== 'undefined') {
    globalThis.__filename = process.argv[1] || '.';
    globalThis.__dirname = require('path').dirname(globalThis.__filename);
  }
})();

`;
  
  let modifiedSdk = compatWrapper + sdkContent;
  
  // Apply import.meta replacements
  modifiedSdk = modifiedSdk.replace(/import\.meta\.url/g, 
    `(typeof __filename !== 'undefined' ? 'file://' + __filename.replace(/\\\\/g, '/') : 'file:///')`);
  
  modifiedSdk = modifiedSdk.replace(/fileURLToPath\s*\(\s*import\.meta\.url\s*\)/g,
    `(typeof __filename !== 'undefined' ? __filename : process.argv[1] || '.')`);
  
  // Write to temp directory
  const tempSdkPath = join(tempDir, 'sdk.mjs');
  writeFileSync(tempSdkPath, modifiedSdk);
  console.log('✓ Created Windows-compatible sdk.mjs');
  
  return tempSdkPath;
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
    // Read the original CLI file
    const cliPath = join(projectRoot, 'cli.js');
    let cliContent = readFileSync(cliPath, 'utf-8');
    
    // Step 1: Apply all native bundle preparations
    cliContent = applyNativeBundlePreparations(cliContent);
    
    // Step 2: Apply Windows-specific import.meta fixes
    cliContent = applyWindowsImportMetaFixes(cliContent);
    
    // Write the final Windows CLI
    const tempCliPath = join(tempDir, 'cli-windows.js');
    writeFileSync(tempCliPath, cliContent);
    console.log('✓ Created Windows-compatible cli.js with all patches');
    
    // Process SDK file
    processSdkFile();
    
    // Copy other required files
    copyRequiredFiles();
    
    console.log('\n✅ Windows bundle preparation complete!');
    console.log(`\nTemporary build directory: ${tempDir}`);
    console.log(`Main CLI file: ${tempCliPath}`);
    console.log('\nThis build includes:');
    console.log('  - All native bundle preparations (yoga.wasm, ripgrep embedding)');
    console.log('  - Windows-specific import.meta fixes');
    console.log('  - POSIX shell bypass');
    console.log('\nNow you can build the Windows executable with:');
    console.log(`  cd ${tempDir}`);
    console.log('  bun build --compile --minify --target=bun-windows-x64 ./cli-windows.js --outfile ../dist/claude-code-windows.exe');
    
  } catch (error) {
    console.error('❌ Error preparing Windows bundle:', error);
    process.exit(1);
  }
}

main(); 