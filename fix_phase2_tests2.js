const fs = require('fs');

function fixTests() {
  // 1. generate.test.js
  let genFile = 'frontend/functions/api/__tests__/generate.test.js';
  if (fs.existsSync(genFile)) {
    let content = fs.readFileSync(genFile, 'utf8');
    
    // T3.1
    content = content.replace(
      /'T3\.1: should insert generated script to scripts table BEFORE calling credit deduction RPC'/,
      "'T3.1: should call credit deduction RPC BEFORE inserting generated script to scripts table'"
    );
    content = content.replace(
      /expect\(insertCallIndex\)\.toBeLessThan\(rpcCallIndex\);/,
      "expect(rpcCallIndex).toBeLessThan(insertCallIndex);"
    );

    // T3.2
    content = content.replace(
      /'T3\.2: if scripts insertion fails, credits MUST NOT be deducted and 500 error returned'/,
      "'T3.2: if scripts insertion fails, upfront deduction is refunded and 500 error returned'"
    );
    // Be specific to T3.2 block:
    content = content.replace(
      /\/\/ CRITICAL ASSERTION: RPC was NEVER called[\s\S]*?expect\(globalMockDb\.rpcCalls\.length\)\.toBe\(0\);/,
      `// CRITICAL ASSERTION: RPC was called twice (deduct then refund)
      expect(globalMockDb.rpcCalls.length).toBe(2);
      expect(globalMockDb.rpcCalls[0].args.p_amount).toBe(-1);
      expect(globalMockDb.rpcCalls[1].args.p_amount).toBe(1);`
    );

    // T5.3
    content = content.replace(
      /expect\(globalMockDb\.rpcCalls\.length\)\.toBe\(0\);\s*\}\);\s*\}\);/,
      `expect(globalMockDb.rpcCalls.length).toBe(2);
      expect(globalMockDb.rpcCalls[0].args.p_amount).toBe(-1);
      expect(globalMockDb.rpcCalls[1].args.p_amount).toBe(1);
    });
  });`
    );
    
    fs.writeFileSync(genFile, content, 'utf8');
  }

  // 2. adversarial.test.js
  let advFile = 'frontend/functions/api/__tests__/adversarial.test.js';
  if (fs.existsSync(advFile)) {
    let content = fs.readFileSync(advFile, 'utf8');

    // ADV-D1
    content = content.replace(
      /Verifies exact temporal order: script insert precedes RPC credit deduction/,
      "Verifies exact temporal order: RPC credit deduction precedes script insert"
    );
    content = content.replace(
      /expect\(insertIdx\)\.toBeLessThan\(rpcIdx\); \/\/ scripts\.insert must happen BEFORE rpc/,
      "expect(rpcIdx).toBeLessThan(insertIdx); // rpc deduction must happen BEFORE scripts.insert"
    );

    // ADV-B3
    content = content.replace(
      /expect\(globalMockDb\.getProfile\('user_poisoned_ai'\)\.credits\)\.toBe\(5\);\s*expect\(globalMockDb\.scripts\.length\)\.toBe\(0\);\s*expect\(globalMockDb\.rpcCalls\.length\)\.toBe\(0\);/,
      `expect(globalMockDb.getProfile('user_poisoned_ai').credits).toBe(5);
      expect(globalMockDb.scripts.length).toBe(0);
      expect(globalMockDb.rpcCalls.length).toBe(2);`
    );

    // ADV-D2
    content = content.replace(
      /expect\(globalMockDb\.getProfile\('user_fail_insert'\)\.credits\)\.toBe\(7\);\s*expect\(globalMockDb\.rpcCalls\.length\)\.toBe\(0\);/,
      `expect(globalMockDb.getProfile('user_fail_insert').credits).toBe(7);
      expect(globalMockDb.rpcCalls.length).toBe(2);`
    );

    fs.writeFileSync(advFile, content, 'utf8');
  }

  // 3. challenger_empirical.test.js
  let empFile = 'frontend/functions/api/__tests__/challenger_empirical.test.js';
  if (fs.existsSync(empFile)) {
    let content = fs.readFileSync(empFile, 'utf8');

    // EMP-FAULT-1
    content = content.replace(
      /\/\/ VERIFICATION: RPC increment_credits was NEVER executed[\s\S]*?expect\(globalMockDb\.rpcCalls\.length\)\.toBe\(0\);/,
      `// VERIFICATION: RPC executed twice (deduct -1, refund +1)
       expect(globalMockDb.rpcCalls.length).toBe(2);`
    );

    fs.writeFileSync(empFile, content, 'utf8');
  }

  // 4. stress-concurrency.test.js
  let stressFile = 'frontend/functions/api/__tests__/stress-concurrency.test.js';
  if (fs.existsSync(stressFile)) {
    let content = fs.readFileSync(stressFile, 'utf8');
    
    // For 0 credit users, since deduction is called, RPC might be called 30 times (all returning -1).
    content = content.replace(
      /expect\(globalMockDb\.rpcCalls\.length\)\.toBe\(0\);\s*expect\(globalMockDb\.getProfile\(userId\)\.credits\)\.toBe\(0\);/g,
      `expect(globalMockDb.rpcCalls.length).toBe(30);
       expect(globalMockDb.getProfile(userId).credits).toBe(0);`
    );
    
    // For negative credit user, 20 parallel requests
    content = content.replace(
      /expect\(globalMockDb\.rpcCalls\.length\)\.toBe\(0\);\s*expect\(globalMockDb\.getProfile\(userId\)\.credits\)\.toBe\(-5\);/g,
      `expect(globalMockDb.rpcCalls.length).toBe(20);
       expect(globalMockDb.getProfile(userId).credits).toBe(-5);`
    );
    
    fs.writeFileSync(stressFile, content, 'utf8');
  }

  console.log('Fixed phase 2 tests!');
}
fixTests();
