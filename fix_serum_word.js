const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/Home.jsx', 'utf8');

// Replace all instances of เซรั่ม with สกินแคร์ (ไม่มีวรรณยุกต์ซ้อน ไม่บั๊ก)
code = code.replaceAll('เซรั่ม', 'สกินแคร์');

// Also update the product name in example to match
code = code.replace(
  'โจทย์: สกินแคร์ลดสิวยุบไวใน 3 วัน หน้าไม่แห้งลอก',
  'โจทย์: สกินแคร์ลดสิว ยุบไวใน 3 วัน หน้าไม่แห้งลอก'
);

fs.writeFileSync('frontend/src/pages/Home.jsx', code, 'utf8');
console.log('Fixed!');
