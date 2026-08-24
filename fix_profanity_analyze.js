const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/CreateScript.jsx', 'utf8');

const profanityCheckCode = `
    // Profanity Check (Strict Ban)
    const allInputs = \`\${productUrls.join(' ')}\`;
    if (containsProfanity(allInputs)) {
      setError('ไม่อนุญาตให้ใช้คำหยาบคาย! เว็บ Auto Script ห้ามใช้คำหยาบเด็ดขาด');
      return;
    }
`;

code = code.replace(
  /const handleAnalyze = async \(\) => \{\s*const validUrls = productUrls\.filter\(u => u\.trim\(\) !== ''\);/,
  "const handleAnalyze = async () => {\n" + profanityCheckCode + "\n    const validUrls = productUrls.filter(u => u.trim() !== '');"
);

fs.writeFileSync('frontend/src/pages/CreateScript.jsx', code);
console.log("handleAnalyze updated");
