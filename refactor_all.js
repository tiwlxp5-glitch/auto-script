const fs = require('fs');

// 1. generate.js
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

// Remove old < 1 credit check
genCode = genCode.replace(
  /if \(profile\.credits < 1\) \{\s*return new Response[^\}]+\}\s*\}/,
  ''
);

// Upfront deduction
genCode = genCode.replace(
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

// Jina limits
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

// Remove old deduction
// Be precise to match from `// 7.` up to the next `// 8.`
genCode = genCode.replace(
  /\/\/ 7\. หักเครดิต[\s\S]*?(?=\/\/ 8\.)/,
  ``
);

// Catch block refund
genCode = genCode.replace(
  /catch \(err\) \{/,
  `catch (err) {
    if (typeof creditDeducted !== 'undefined' && creditDeducted) {
      console.error("Execution failed after deduction. Issuing compensatory refund:", err);
      try {
        await supabaseAdmin.rpc('increment_credits', { p_user_id: user.id, p_amount: 1 });
      } catch(refundErr) {}
    }`
);
fs.writeFileSync('frontend/functions/api/generate.js', genCode, 'utf8');

// 2. webhook.js
let whCode = fs.readFileSync('frontend/functions/api/webhook.js', 'utf8');
whCode = whCode.replace(
  /let userId = session\.client_reference_id;\s*if \(\!userId\) \{\s*return new Response\(JSON\.stringify\(\{ error: "Missing client_reference_id" \}\), \{ status: 400 \}\);\s*\}/,
  `let userId = session.client_reference_id;
    if (!userId && (session.customer_details?.email || session.customer_email)) {
      const customerEmail = session.customer_details?.email || session.customer_email;
      const { data: userRecord } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .single();
      if (userRecord?.id) userId = userRecord.id;
    }
    if (!userId) {
      await supabase.from('webhook_events').delete().eq('id', event.id);
      return new Response(JSON.stringify({ error: "Missing customer identification" }), { status: 400 });
    }`
);

whCode = whCode.replace(
  /let tier = 'plus';\s*let addCredits = 60;\s*if \(amountPaid >= 59000\) \{\s*tier = 'pro';\s*addCredits = 150;\s*\}/,
  `let addCredits = amountPaid >= 59000 ? 150 : 60;
    const { data: existingProfile } = await supabase.from('profiles').select('tier').eq('id', userId).single();
    const currentTier = existingProfile?.tier;
    const targetTier = (currentTier === 'pro' || amountPaid >= 59000) ? 'pro' : 'plus';
    let tier = targetTier; // Keep tier variable for upsert`
);
fs.writeFileSync('frontend/functions/api/webhook.js', whCode, 'utf8');

// 3. analyze.js
let analyzeCode = fs.readFileSync('frontend/functions/api/analyze.js', 'utf8');
analyzeCode = analyzeCode.replace(
  /if \(creditError \|\| newCredits === null\) \{/,
  `if (creditError || newCredits === null || newCredits < 0) {`
);
analyzeCode = analyzeCode.replace(
  /\/\/ Restore the credit optimistically in case of empty product result[\s\S]*?if \(dbProfile\) \{\s*await supabaseAdmin\s*\.from\('profiles'\)\s*\.update\(\{ credits: dbProfile\.credits \+ 1 \}\)\s*\.eq\('id', user\.id\);\s*\}/,
  `// Restore the credit optimistically
      await supabaseAdmin.rpc('increment_credits', { p_user_id: user.id, p_amount: 1 });`
);
// jina limit in analyze.js
analyzeCode = analyzeCode.replace(
  /const urlsToScrape = \[\];[\s\S]*?if \(urlsToScrape\.length > 0\) \{/,
  `let rawUrlsToScrape = [];
    if (body.productUrls && Array.isArray(body.productUrls)) {
      rawUrlsToScrape.push(...body.productUrls.filter(u => u.trim() !== ''));
    } else if (body.productUrl) {
      rawUrlsToScrape.push(body.productUrl);
    }
    const urlsToScrape = rawUrlsToScrape.slice(0, 3);
    if (urlsToScrape.length > 0) {`
);
analyzeCode = analyzeCode.replace(
  /const jinaRes = await fetch\(\`https:\/\/r\.jina\.ai\/\$\{url\}\`, \{\s*headers: \{ 'Accept': 'text\/plain', 'X-Return-Format': 'markdown' \}\s*\}\);/,
  `const jinaRes = await fetch(\`https://r.jina.ai/\${encodeURI(url)}\`, {
              headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
              signal: AbortSignal.timeout(8000)
            });`
);
fs.writeFileSync('frontend/functions/api/analyze.js', analyzeCode, 'utf8');

// 4. delete-account.js
let deleteCode = fs.readFileSync('frontend/functions/api/delete-account.js', 'utf8');
if (!deleteCode.includes("import Stripe")) {
  deleteCode = deleteCode.replace(
    /import \{ createClient \} from '@supabase\/supabase-js';/,
    `import { createClient } from '@supabase/supabase-js';\nimport Stripe from 'stripe';`
  );
}
deleteCode = deleteCode.replace(
  /\/\/ Delete the user from Supabase Auth/,
  `// Check for associated Stripe Customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_customer_id && env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        await stripe.customers.del(profile.stripe_customer_id);
      } catch (stripeErr) {}
    }

    // Delete the user from Supabase Auth`
);
fs.writeFileSync('frontend/functions/api/delete-account.js', deleteCode, 'utf8');

console.log('All backend files refactored');
