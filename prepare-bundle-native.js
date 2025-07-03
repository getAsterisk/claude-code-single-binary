#!/usr/bin/env bun

/**
 * Prepare the CLI for bundling using Bun's native embedding features
 * This modifies the source to use embedded files directly
 */

import { readFileSync, writeFileSync } from 'fs';

// Read the original CLI file
const cliPath = './cli.js';
let cliContent = readFileSync(cliPath, 'utf-8');

console.log('Preparing CLI for native Bun embedding...');

// 1. Add imports for embedded files at the top of the file
const embeddedImports = `
// Embedded files using Bun's native embedding
import __embeddedYogaWasm from "./yoga.wasm" with { type: "file" };
import __embeddedRgDarwinArm64 from "./vendor/ripgrep/arm64-darwin/rg" with { type: "file" };
import __embeddedRgNodeDarwinArm64 from "./vendor/ripgrep/arm64-darwin/ripgrep.node" with { type: "file" };
import __embeddedRgLinuxArm64 from "./vendor/ripgrep/arm64-linux/rg" with { type: "file" };
import __embeddedRgNodeLinuxArm64 from "./vendor/ripgrep/arm64-linux/ripgrep.node" with { type: "file" };
import __embeddedRgDarwinX64 from "./vendor/ripgrep/x64-darwin/rg" with { type: "file" };
import __embeddedRgNodeDarwinX64 from "./vendor/ripgrep/x64-darwin/ripgrep.node" with { type: "file" };
import __embeddedRgLinuxX64 from "./vendor/ripgrep/x64-linux/rg" with { type: "file" };
import __embeddedRgNodeLinuxX64 from "./vendor/ripgrep/x64-linux/ripgrep.node" with { type: "file" };
import __embeddedRgWin32 from "./vendor/ripgrep/x64-win32/rg.exe" with { type: "file" };
import __embeddedRgNodeWin32 from "./vendor/ripgrep/x64-win32/ripgrep.node" with { type: "file" };

const __embeddedFiles = {
  'yoga.wasm': __embeddedYogaWasm,
  'vendor/ripgrep/arm64-darwin/rg': __embeddedRgDarwinArm64,
  'vendor/ripgrep/arm64-darwin/ripgrep.node': __embeddedRgNodeDarwinArm64,
  'vendor/ripgrep/arm64-linux/rg': __embeddedRgLinuxArm64,
  'vendor/ripgrep/arm64-linux/ripgrep.node': __embeddedRgNodeLinuxArm64,
  'vendor/ripgrep/x64-darwin/rg': __embeddedRgDarwinX64,
  'vendor/ripgrep/x64-darwin/ripgrep.node': __embeddedRgNodeDarwinX64,
  'vendor/ripgrep/x64-linux/rg': __embeddedRgLinuxX64,
  'vendor/ripgrep/x64-linux/ripgrep.node': __embeddedRgNodeLinuxX64,
  'vendor/ripgrep/x64-win32/rg.exe': __embeddedRgWin32,
  'vendor/ripgrep/x64-win32/ripgrep.node': __embeddedRgNodeWin32,
};

`;

// Add imports after the shebang
const shebangMatch = cliContent.match(/^#!.*\n/);
if (shebangMatch) {
  cliContent = shebangMatch[0] + embeddedImports + cliContent.substring(shebangMatch[0].length);
} else {
  cliContent = embeddedImports + cliContent;
}

// 2. Replace yoga.wasm loading
// Original: var k81=await nUA(await VP9(CP9(import.meta.url).resolve("./yoga.wasm")));
const yogaLoadPattern = /var k81=await nUA\(await VP9\(CP9\(import\.meta\.url\)\.resolve\("\.\/yoga\.wasm"\)\)\);/;
const yogaLoadReplacement = `var k81=await nUA(await Bun.file(__embeddedYogaWasm).arrayBuffer().then(buf => Buffer.from(buf)));`;

if (yogaLoadPattern.test(cliContent)) {
  cliContent = cliContent.replace(yogaLoadPattern, yogaLoadReplacement);
  console.log('✓ Replaced yoga.wasm loading with embedded version');
} else {
  console.error('Warning: Could not find yoga.wasm loading pattern');
}

// 3. Replace ripgrep path resolution
// Add check for embedded files in the ripgrep resolver
const ripgrepPattern = /let B=Db\.resolve\(et9,"vendor","ripgrep"\);/;
const ripgrepReplacement = `
if(process.env.CLAUDE_CODE_BUNDLED || typeof __embeddedFiles !== 'undefined'){
  const platform = process.platform === "win32" ? "x64-win32" : \`\${process.arch}-\${process.platform}\`;
  const rgKey = \`vendor/ripgrep/\${platform}/rg\${process.platform === "win32" ? ".exe" : ""}\`;
  if(__embeddedFiles[rgKey]) return __embeddedFiles[rgKey];
}
let B=Db.resolve(et9,"vendor","ripgrep");`;

if (ripgrepPattern.test(cliContent)) {
  cliContent = cliContent.replace(ripgrepPattern, ripgrepReplacement);
  console.log('✓ Added embedded file handling for ripgrep');
}

// 4. Replace ripgrep.node loading - fixed pattern and replacement
// Look for the pattern where B is assigned to "./ripgrep.node"
const ripgrepNodePattern = /B="\.\/ripgrep\.node"/;
const ripgrepNodeReplacement = `B=(()=>{
  const platform = process.platform === "win32" ? "x64-win32" : \`\${process.arch}-\${process.platform}\`;
  const nodeKey = \`vendor/ripgrep/\${platform}/ripgrep.node\`;
  return __embeddedFiles[nodeKey] || "./ripgrep.node";
})()`;

if (ripgrepNodePattern.test(cliContent)) {
  cliContent = cliContent.replace(ripgrepNodePattern, ripgrepNodeReplacement);
  console.log('✓ Added embedded file handling for ripgrep.node');
}

// Set bundled mode indicator
cliContent = cliContent.replace(
  /process\.env\.CLAUDE_CODE_ENTRYPOINT="cli"/,
  'process.env.CLAUDE_CODE_ENTRYPOINT="cli";process.env.CLAUDE_CODE_BUNDLED="1"'
);

// Write the modified content
const outputPath = './cli-native-bundled.js';
writeFileSync(outputPath, cliContent);

console.log(`\n✅ Created ${outputPath} ready for bundling with native embedding`);
console.log('\nNow you can run:');
console.log(`  bun build --compile --minify ./cli-native-bundled.js --outfile dist/claude-code`); 