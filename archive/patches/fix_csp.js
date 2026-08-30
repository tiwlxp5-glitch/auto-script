const fs = require('fs');
const filePath = 'frontend/public/_headers';

let content = fs.readFileSync(filePath, 'utf8');

// Replace script-src
content = content.replace(
    /script-src 'self' https:\/\/js\.stripe\.com/g,
    "script-src 'self' https://js.stripe.com https://static.cloudflareinsights.com"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('CSP updated successfully.');
