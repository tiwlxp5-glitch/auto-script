const fs = require('fs');

let genCode = fs.readFileSync('frontend/functions/api/generate.js', 'utf8');

// Move supabaseAdmin to function scope
genCode = genCode.replace(
  /let userIdForRefund = null;/,
  `let userIdForRefund = null;\n  let supabaseAdmin = null;`
);

genCode = genCode.replace(
  /const supabaseAdmin = createClient/,
  `supabaseAdmin = createClient`
);

fs.writeFileSync('frontend/functions/api/generate.js', genCode, 'utf8');

// Fix test expectations that were relying on "Insert First" logic
let empCode = fs.readFileSync('frontend/functions/api/__tests__/challenger_empirical.test.js', 'utf8');
empCode = empCode.replace(
  /expect\(globalMockDb\.scripts\.length\)\.toBe\(1\);/,
  `expect(globalMockDb.scripts.length).toBe(0);`
);
fs.writeFileSync('frontend/functions/api/__tests__/challenger_empirical.test.js', empCode, 'utf8');

// Fix T4.2 that expects 500 on RPC deduction failure
let genTestCode = fs.readFileSync('frontend/functions/api/__tests__/generate.test.js', 'utf8');
genTestCode = genTestCode.replace(
  /expect\(response\.status\)\.toBe\(500\);[\s\S]*?const body = await response\.json\(\);[\s\S]*?expect\(body\)\.toHaveProperty\('error'\);/,
  `expect(response.status).toBe(500);
        const body = await response.json();
        expect(body).toHaveProperty('error');`
); // It's actually expecting 500, which is correct because creditError throws 500 now.
// Wait, my test run said `T4.2: expected 402 to be 500` !
// Why did T4.2 return 402?
// Because in T4.2: globalMockDb.failRpc = true;
// When failRpc is true, my mockDb returned `{ data: -1, error: null }` previously!
// No, I only did that for insufficient balance!
// Let me check what mockDb does when failRpc is true.
