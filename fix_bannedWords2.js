const fs = require('fs');

let code = fs.readFileSync('frontend/src/lib/bannedWords.js', 'utf8');

if (!code.includes('escapeHtml')) {
  code = code.replace(
    'export function highlightBannedWords(text, foundWarnings) {',
    `export function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function highlightBannedWords(text, foundWarnings) {`
  );

  code = code.replace(
    /if \(!text \|\| foundWarnings\.length === 0\) return text;\s*let highlightedText = text;/,
    `if (!text) return text;
  
  let safeText = escapeHtml(text);
  if (!foundWarnings || foundWarnings.length === 0) return safeText;
  
  let highlightedText = safeText;`
  );

  code = code.replace(
    /const replacement = \`<span class="bg-red-500 text-white px-1 rounded mx-0\.5 cursor-help" title="\$\{warning\.reason\}">\$\{warning\.word\}<\/span>\`;\s*\/\/[^\n]*\s*highlightedText = highlightedText\.split\(warning\.word\)\.join\(replacement\);/m,
    `const safeWord = escapeHtml(warning.word);
    const safeReason = escapeHtml(warning.reason);
    const replacement = \`<span class="bg-red-500 text-white px-1 rounded mx-0.5 cursor-help" title="\${safeReason}">\${safeWord}</span>\`;
    highlightedText = highlightedText.split(warning.word).join(replacement);`
  );

  fs.writeFileSync('frontend/src/lib/bannedWords.js', code, 'utf8');
  console.log('escapeHtml applied!');
}
