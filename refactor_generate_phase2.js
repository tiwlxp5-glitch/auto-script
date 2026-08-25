const fs = require('fs');

let code = fs.readFileSync('frontend/functions/api/generate.js', 'utf8');

// 1. Add safeParseJson before onRequestPost
if (!code.includes('safeParseJson')) {
  code = code.replace(
    /export async function onRequestPost/,
    `function safeParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('AI_EMPTY_RESPONSE');
  }
  let cleaned = rawText.trim();
  if (cleaned.startsWith('\`\`\`json')) {
    cleaned = cleaned.replace(/^\`\`\`json\\s*/i, '').replace(/\\s*\`\`\`$/, '');
  } else if (cleaned.startsWith('\`\`\`')) {
    cleaned = cleaned.replace(/^\`\`\`\\s*/, '').replace(/\\s*\`\`\`$/, '');
  }
  return JSON.parse(cleaned);
}

export async function onRequestPost`
  );
}

// 2. Remove old credit check (< 1)
code = code.replace(
  /if \(profile\.credits < 1\) \{[\s\S]*?\}\n/,
  ''
);

// 3. Update Jina logic
code = code.replace(
  /const urlsToScrape = \[\];[\s\S]*?if \(effectiveTier === 'pro' && urlsToScrape\.length > 0\) \{/,
  `let rawUrlsToScrape = [];
    if (productUrls && Array.isArray(productUrls)) {
      rawUrlsToScrape.push(...productUrls.filter(u => u.trim() !== ''));
    } else if (productUrl) {
      rawUrlsToScrape.push(productUrl);
    }
    const urlsToScrape = rawUrlsToScrape.slice(0, 3);

    if (effectiveTier === 'pro' && urlsToScrape.length > 0) {`
);

code = code.replace(
  /const jinaRes = await fetch\(\`https:\/\/r\.jina\.ai\/\$\{url\}\`, \{\s*headers: \{ 'Accept': 'text\/plain', 'X-Return-Format': 'markdown' \}\s*\}\);/,
  `const jinaRes = await fetch(\`https://r.jina.ai/\${encodeURI(url)}\`, {
              headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
              signal: AbortSignal.timeout(8000)
            });`
);

// 4. Move credit deduction UP (before Jina logic)
code = code.replace(
  /let finalDetails = productDetails;/,
  `const { data: updatedCredits, error: creditError } = await supabaseAdmin.rpc('increment_credits', {
      p_user_id: user.id,
      p_amount: -1
    });

    if (creditError || updatedCredits === null || updatedCredits < 0) {
      return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }
    let creditDeducted = true;
    let remainingCredits = updatedCredits;

    let finalDetails = productDetails;`
);

// 5. Replace JSON.parse
code = code.replace(
  /const resultJson = JSON\.parse\(response\.text\);/,
  `const resultJson = safeParseJson(response.text);`
);

// 6. Remove old credit deduction at the bottom
code = code.replace(
  /\/\/ 7\. หักเครดิต[\s\S]*?const remainingCredits = typeof updatedCredits === 'number' \? updatedCredits : \(profile\.credits - 1\);/,
  `// 7. Credit already deducted upfront.`
);

// 7. Compensatory refund on catch
code = code.replace(
  /catch \(err\) \{/,
  `catch (err) {
    if (typeof creditDeducted !== 'undefined' && creditDeducted) {
      console.error("Execution failed after deduction. Issuing compensatory refund:", err);
      try {
        await supabaseAdmin.rpc('increment_credits', { p_user_id: user.id, p_amount: 1 });
      } catch (refundErr) {
        console.error("Refund failed:", refundErr);
      }
    }`
);

fs.writeFileSync('frontend/functions/api/generate.js', code, 'utf8');
console.log('generate.js refactored');
