const fs = require('fs');

let genCode = fs.readFileSync('frontend/functions/api/generate.js', 'utf8');

// safeParseJson
genCode = genCode.replace(
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

// Add vars
genCode = genCode.replace(
  /const \{ request, env \} = context;/,
  `const { request, env } = context;
  let creditDeducted = false;
  let userIdForRefund = null;`
);

// Remove old < 1 check
genCode = genCode.replace(
  /if \(profile\.credits < 1\) \{[\s\S]*?status: 402[\s\S]*?\}\);[\s\S]*?\}/,
  ''
);

// Upfront deduction
genCode = genCode.replace(
  /let finalDetails = productDetails;/,
  `userIdForRefund = user.id;
    const { data: updatedCredits, error: creditError } = await supabaseAdmin.rpc('increment_credits', {
      p_user_id: user.id,
      p_amount: -1
    });
    if (creditError) {
      return new Response(JSON.stringify({ error: "Failed to deduct credits" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (updatedCredits === null || updatedCredits < 0) {
      return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }
    creditDeducted = true;
    let remainingCredits = updatedCredits;

    let finalDetails = productDetails;`
);

// Jina Limits
genCode = genCode.replace(
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

genCode = genCode.replace(
  /const jinaRes = await fetch\(\`https:\/\/r\.jina\.ai\/\$\{url\}\`, \{\s*headers: \{ 'Accept': 'text\/plain', 'X-Return-Format': 'markdown' \}\s*\}\);/,
  `const jinaRes = await fetch(\`https://r.jina.ai/\${encodeURI(url)}\`, {
              headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
              signal: AbortSignal.timeout(8000)
            });`
);

// Gemini parse
genCode = genCode.replace(
  /const resultJson = JSON\.parse\(response\.text\);/,
  `const resultJson = safeParseJson(response.text);`
);

// Throw insertError
genCode = genCode.replace(
  /if \(insertError\) \{[\s\S]*?return new Response[\s\S]*?\}\);[\s\S]*?\}/,
  `if (insertError) {
      throw new Error('Failed to save script history');
    }`
);

// Remove old deduction
genCode = genCode.replace(
  /\/\/ 7\. หักเครดิต[\s\S]*?(?=\/\/ 8\.)/,
  ``
);

// Inject to MAIN catch block
// Original main catch looks like:
//  } catch (err) {
//    console.error("Generate API Error:", err);
//    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), { 
genCode = genCode.replace(
  /\} catch \(err\) \{\s*console\.error\("Generate API Error:", err\);/,
  `} catch (err) {
    if (creditDeducted && userIdForRefund) {
      console.error("Execution failed after deduction. Issuing compensatory refund:", err);
      try {
        await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
      } catch (refundErr) {}
    }
    console.error("Generate API Error:", err);`
);

fs.writeFileSync('frontend/functions/api/generate.js', genCode, 'utf8');
console.log('generate.js rebuilt successfully!');
