const fs = require('fs');

let code = fs.readFileSync('frontend/src/lib/bannedWords.js', 'utf8');

code = code.replace(
  /highlightedText = highlightedText\.split\(warning\.word\)\.join\(replacement\);/g,
  'highlightedText = highlightedText.split(safeWord).join(replacement);'
);

fs.writeFileSync('frontend/src/lib/bannedWords.js', code, 'utf8');
