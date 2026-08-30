const fs = require('fs');

// 1. Fix mockDb.js
let mockDbCode = fs.readFileSync('frontend/functions/api/__tests__/helpers/mockDb.js', 'utf8');
mockDbCode = mockDbCode.replace(
  /if \(amount < 0 && currentCredits < Math\.abs\(amount\)\) \{[\s\S]*?return \{ data: -1, error: \{ message: 'Insufficient credits' \} \};[\s\S]*?\}/,
  `if (amount < 0 && currentCredits < Math.abs(amount)) {
      return { data: -1, error: null };
    }`
);
fs.writeFileSync('frontend/functions/api/__tests__/helpers/mockDb.js', mockDbCode, 'utf8');

// 2. Fix generate.js to throw exactly Error("Failed to save script history")
let genCode = fs.readFileSync('frontend/functions/api/generate.js', 'utf8');
genCode = genCode.replace(
  /if \(insertError\) \{\s*throw insertError;\s*\}/,
  `if (insertError) {
      throw new Error('Failed to save script history');
    }`
);
fs.writeFileSync('frontend/functions/api/generate.js', genCode, 'utf8');

console.log('Fixed mockDb and generate.js');
