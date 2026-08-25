const fs = require('fs');

let legalCode = fs.readFileSync('frontend/src/pages/Legal.jsx', 'utf8');

if (!legalCode.includes('useNavigate')) {
  legalCode = legalCode.replace(
    /import \{ Link \} from 'react-router-dom';/,
    `import { Link, useNavigate } from 'react-router-dom';`
  );

  legalCode = legalCode.replace(
    /function Legal\(\) \{/,
    `function Legal() {\n  const navigate = useNavigate();\n\n  const handleBack = (e) => {\n    e.preventDefault();\n    if (window.history.state && window.history.state.idx > 0) {\n      navigate(-1);\n    } else {\n      navigate('/');\n    }\n  };`
  );

  legalCode = legalCode.replace(
    /<Link to="\/" className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium">/,
    `<a href="#" onClick={handleBack} className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium">`
  );
  
  legalCode = legalCode.replace(
    /กลับหน้าหลัก\s*<\/Link>/,
    `ย้อนกลับ\n        </a>`
  );
  
  fs.writeFileSync('frontend/src/pages/Legal.jsx', legalCode, 'utf8');
}

// And remove target="_blank" from Register so it stays in the same tab and state is preserved in history
let registerCode = fs.readFileSync('frontend/src/pages/Register.jsx', 'utf8');
registerCode = registerCode.replace(/ target="_blank" rel="noopener noreferrer"/g, '');
fs.writeFileSync('frontend/src/pages/Register.jsx', registerCode, 'utf8');

console.log('Fixed back button logic');
