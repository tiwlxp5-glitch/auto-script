const fs = require('fs');
const filePath = 'c:\\Auto script\\frontend\\functions\\api\\generate.js';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\(speakerTone \|\| [^}]+\}/, function(match) {
    return match.substring(0, match.length - 1) + ')}';
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Syntax fixed.");
