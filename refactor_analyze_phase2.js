const fs = require('fs');

let code = fs.readFileSync('frontend/functions/api/analyze.js', 'utf8');

// 1. Fix zero-credit gate check
code = code.replace(
  /if \(creditError \|\| newCredits === null\) \{/,
  `if (creditError || newCredits === null || newCredits < 0) {`
);

// 2. Replace in-memory refund with atomic RPC
// Old code:
/*
      // Restore the credit optimistically in case of empty product result
      const { data: dbProfile } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (dbProfile) {
        await supabaseAdmin
          .from('profiles')
          .update({ credits: dbProfile.credits + 1 })
          .eq('id', user.id);
      }
*/
code = code.replace(
  /\/\/ Restore the credit optimistically[\s\S]*?\}\s*\}/,
  `// Restore the credit optimistically in case of empty product result
      await supabaseAdmin.rpc('increment_credits', { p_user_id: user.id, p_amount: 1 });`
);

// 3. Jina timeout
code = code.replace(
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

code = code.replace(
  /const jinaRes = await fetch\(\`https:\/\/r\.jina\.ai\/\$\{url\}\`, \{\s*headers: \{ 'Accept': 'text\/plain', 'X-Return-Format': 'markdown' \}\s*\}\);/,
  `const jinaRes = await fetch(\`https://r.jina.ai/\${encodeURI(url)}\`, {
              headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
              signal: AbortSignal.timeout(8000)
            });`
);

fs.writeFileSync('frontend/functions/api/analyze.js', code, 'utf8');
console.log('analyze.js refactored');
