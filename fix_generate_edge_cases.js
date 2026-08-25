const fs = require('fs');

let genCode = fs.readFileSync('frontend/functions/api/generate.js', 'utf8');

// Fix 1: Remove profile.credits < 1 completely
// Looking for:
// if (profile.credits < 1) {
//   return new Response(JSON.stringify({ error: 'เครดิตไม่พอ ...' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
// }
genCode = genCode.replace(
  /if \(profile\.credits < 1\) \{[\s\S]*?status: 402[\s\S]*?\}\);[\s\S]*?\}/,
  ''
);

// Fix 2: Throw insertError
genCode = genCode.replace(
  /if \(insertError\) \{[\s\S]*?return new Response[\s\S]*?\}\);[\s\S]*?\}/,
  `if (insertError) {
      throw insertError;
    }`
);

// Fix 3: Handle creditError separately to return 500
genCode = genCode.replace(
  /if \(creditError \|\| updatedCredits === null \|\| updatedCredits < 0\) \{[\s\S]*?status: 402[\s\S]*?\}\);[\s\S]*?\}/,
  `if (creditError) {
      return new Response(JSON.stringify({ error: "Failed to deduct credits" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (updatedCredits === null || updatedCredits < 0) {
      return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }`
);

fs.writeFileSync('frontend/functions/api/generate.js', genCode, 'utf8');
console.log('generate.js fixed!');
