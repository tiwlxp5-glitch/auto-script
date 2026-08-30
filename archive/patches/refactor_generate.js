const fs = require('fs');

let code = fs.readFileSync('frontend/functions/api/generate.js', 'utf8');

if (!code.includes('safeParseJson')) {
  code = code.replace(
    /const \{ GoogleGenAI \} = require\('@google\/genai'\);/,
    `const { GoogleGenAI } = require('@google/genai');

function safeParseJson(rawText) {
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
}`
  );
}

// 2. Jina AI timeout & limit
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

// 3. Move Credit Deduction UP
// Remove the check for profile.credits < 1
code = code.replace(
  /if \(profile\.credits < 1\) \{[\s\S]*?\}\n/,
  ''
);

// Remove old deduction completely (we can replace the whole block)
code = code.replace(
  /\/\/ 7\. หักเครดิต[\s\S]*?const remainingCredits = typeof updatedCredits === 'number' \? updatedCredits : \(profile\.credits - 1\);/g,
  ''
);

// Actually, wait, let me use more robust replacements.
// Let's replace the whole try block.
