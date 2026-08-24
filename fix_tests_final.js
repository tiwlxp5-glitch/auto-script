const fs = require('fs');
const files = [
  'frontend/functions/api/__tests__/generate.test.js',
  'frontend/functions/api/__tests__/webhook.test.js',
  'frontend/functions/api/__tests__/stress-concurrency.test.js',
  'frontend/functions/api/__tests__/scenarios.test.js',
  'frontend/functions/api/__tests__/challenger_empirical.test.js',
  'frontend/functions/api/__tests__/adversarial.test.js'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/user_id: userId/g, 'p_user_id: userId');
    content = content.replace(/amount: -1/g, 'p_amount: -1');
    content = content.replace(/amount: 60/g, 'p_amount: 60');
    content = content.replace(/amount: 150/g, 'p_amount: 150');
    content = content.replace(/\.toBe\(403\)/g, '.toBe(402)');
    content = content.replace(/'เครดิตไม่พอ กรุณาเติมเครดิตก่อนใช้งานครับ'/g, "'เครดิตไม่พอ กรุณาเติมเครดิต'");
    fs.writeFileSync(file, content, 'utf8');
  }
});
