const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/CreateScript.jsx', 'utf8');

// 1. Add import
if (!code.includes('containsProfanity')) {
  code = code.replace(
    /import \{ scanForBannedWords, highlightBannedWords \} from '\.\.\/lib\/bannedWords';/,
    "import { scanForBannedWords, highlightBannedWords } from '../lib/bannedWords';\nimport { containsProfanity } from '../lib/profanityWords';"
  );
}

// 2. Add profanity check in handleGenerate
const profanityCheckCode = `
    // 0. Profanity Check (Strict Ban)
    const allInputs = \`\${productName} \${productDetails} \${competitor} \${targetAudience}\`;
    if (containsProfanity(allInputs)) {
      setError('ไม่อนุญาตให้ใช้คำหยาบคาย! เว็บ Auto Script ห้ามใช้คำหยาบเด็ดขาด กรุณาแก้ไขข้อมูลของคุณ');
      return;
    }
`;

code = code.replace(
  /const handleGenerate = async \(e\) => \{\s*e\.preventDefault\(\);/,
  "const handleGenerate = async (e) => {\n    e.preventDefault();\n" + profanityCheckCode
);

fs.writeFileSync('frontend/src/pages/CreateScript.jsx', code);
console.log("CreateScript.jsx updated with profanity filter");
