const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Check if we need to add the import
  if (!code.includes("import { useAuth }")) {
    code = code.replace(/import { useNavigate/g, "import { useAuth } from '../context/AuthContext';\nimport { useNavigate");
  }

  // Check if the component body lacks the useAuth call
  if (!code.includes("useAuth()")) {
    // Insert at the top of the function
    const funcMatch = code.match(/function (CreateScript|History)\(\) \{/);
    if (funcMatch) {
      code = code.replace(
        funcMatch[0],
        `${funcMatch[0]}\n  const { user, profile, loading, refreshProfile } = useAuth();`
      );
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
}

fixFile('frontend/src/pages/CreateScript.jsx');
fixFile('frontend/src/pages/History.jsx');
console.log('Fixed useAuth calls!');
