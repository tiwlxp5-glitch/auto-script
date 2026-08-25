const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/CreateScript.jsx', 'utf8');

// Inject the ALLOWED_ROOT_DOMAINS and isValidPlatformUrl at the top of the file
if (!code.includes('isValidPlatformUrl')) {
  code = code.replace(
    /import \{ useAuth \} from '\.\.\/context\/AuthContext';/,
    `import { useAuth } from '../context/AuthContext';\n
const ALLOWED_ROOT_DOMAINS = [
  'shopee.co.th',
  'shopee.com',
  'lazada.co.th',
  'lazada.com',
  'tiktok.com',
  'facebook.com',
  'fb.watch',
  'instagram.com',
  'line.me',
  'lin.ee'
];

function isValidPlatformUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_ROOT_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
  } catch (err) {
    return false;
  }
}`
  );
  
  if (code.indexOf('isValidPlatformUrl') === -1) {
      // fallback if useAuth is not imported yet (Phase 3 AuthContext might not be done yet)
      code = code.replace(
          /import React[\s\S]*?;/,
          `$&
const ALLOWED_ROOT_DOMAINS = [
  'shopee.co.th',
  'shopee.com',
  'lazada.co.th',
  'lazada.com',
  'tiktok.com',
  'facebook.com',
  'fb.watch',
  'instagram.com',
  'line.me',
  'lin.ee'
];

function isValidPlatformUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_ROOT_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
  } catch (err) {
    return false;
  }
}`
      );
  }

  // Replace the weak includes check with isValidPlatformUrl
  code = code.replace(
    /const allowedDomains = \['shopee'[^;]+;[\s\S]*?for \(let url of validUrls\) \{[\s\S]*?const lowerUrl = url\.toLowerCase\(\);[\s\S]*?const isAllowed = allowedDomains\.some\(domain => lowerUrl\.includes\(domain\)\);/m,
    `for (let url of validUrls) {
        const isAllowed = isValidPlatformUrl(url);`
  );

  fs.writeFileSync('frontend/src/pages/CreateScript.jsx', code, 'utf8');
  console.log('CreateScript SSRF logic fixed');
} else {
  console.log('CreateScript already has isValidPlatformUrl');
}
