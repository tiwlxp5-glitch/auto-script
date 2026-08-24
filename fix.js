const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/CreateScript.jsx', 'utf8');

// 1. Move deduction to top
code = code.replace(
  /(\/\/ Check credits before making request\r?\n\s*if \(profile\.credits < 1\) \{\r?\n\s*setError\('.*?'\);\r?\n\s*return;\r?\n\s*\})/,
  "$1\n\n    // Optimistically deduct 1 credit for UI\n    if (profile) {\n      setProfile(prev => ({ ...prev, credits: Math.max(0, prev.credits - 1) }));\n    }"
);

// 2. Revert in error block
code = code.replace(
  /(\/\/ Revert optimistic deduction if AI failed to find product\r?\n\s*if \(profile\)) profile\.credits \+= 1;/,
  "$1 {\n          setProfile(prev => ({ ...prev, credits: prev.credits + 1 }));\n        }"
);

// 3. Remove from bottom
code = code.replace(
  /\r?\n\s*\/\/ Update credit balance in UI\r?\n\s*if \(profile\) \{\r?\n\s*\/\/ Optimistically deduct 1 credit for analysis\r?\n\s*profile\.credits = Math\.max\(0, profile\.credits - 1\);\r?\n\s*\}/,
  ""
);

// 4. Revert in catch
code = code.replace(
  /(\} catch \(err\) \{\r?\n\s*setTerminalText)/,
  "} catch (err) {\n      if (profile) {\n        setProfile(prev => ({ ...prev, credits: prev.credits + 1 }));\n      }\n      setTerminalText"
);

fs.writeFileSync('frontend/src/pages/CreateScript.jsx', code);
console.log("Done");
