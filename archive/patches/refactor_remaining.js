const fs = require('fs');

function refactorToUseAuth(filePath, componentName) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  if (code.includes('useAuth()')) {
    console.log(`${componentName} already uses useAuth`);
    return;
  }

  // 1. Add import
  if (!code.includes("import { useAuth }")) {
    code = code.replace(/import { useNavigate/g, "import { useAuth } from '../context/AuthContext';\nimport { useNavigate");
    if (!code.includes("import { useAuth }")) { // fallback for Navbar
        code = code.replace(/import \{ Link, useNavigate \}/g, "import { Link, useNavigate } from 'react-router-dom';\nimport { useAuth } from '../context/AuthContext';");
    }
  }

  // 2. Replace state definitions
  const funcRegex = new RegExp(`function ${componentName}\\(\\) \\{`);
  code = code.replace(
    funcRegex,
    `function ${componentName}() {\n  const { user, profile } = useAuth();`
  );
  
  code = code.replace(/const \[user, setUser\] = useState\(null\);\s*/, '');
  code = code.replace(/const \[profile, setProfile\] = useState\(null\);\s*/, '');

  // 3. Remove useEffect that fetches session
  if (componentName === 'Navbar') {
    code = code.replace(/useEffect\(\(\) => \{[\s\S]*?supabase\.auth\.onAuthStateChange[\s\S]*?return \(\) => \{[\s\S]*?\}\s*\}, \[\]\);\s*/, '');
  } else if (componentName === 'Settings' || componentName === 'Pricing') {
     code = code.replace(/useEffect\(\(\) => \{[\s\S]*?fetchProfile\(session\.user\.id\);[\s\S]*?\}\s*\}, \[navigate\]\);\s*/, '');
     code = code.replace(/const fetchProfile = async \(userId\) => \{[\s\S]*?\}\s*\} catch \(error\) \{[\s\S]*?\}\s*\};\s*/, '');
  }

  // 4. Update navigate dependencies for Settings
  if (componentName === 'Settings') {
      code = code.replace(/useEffect\(\(\) => \{[\s\S]*?fetchProfile\(session\.user\.id\);[\s\S]*?\}\s*\}, \[navigate\]\);/, `useEffect(() => {\n    if (!user) navigate('/login');\n  }, [user, navigate]);`);
      
      // Settings sets local states based on profile
      code = code.replace(/setDisplayName\(data\.display_name \|\| ''\);/, '');
      
      const newUseEffect = `
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
    }
  }, [profile]);
      `;
      code = code.replace(/const navigate = useNavigate\(\);/, `const navigate = useNavigate();\n${newUseEffect}`);
  }

  // 5. Update navigate dependencies for Pricing
  if (componentName === 'Pricing') {
       code = code.replace(/useEffect\(\(\) => \{[\s\S]*?fetchProfile\(session\.user\.id\);[\s\S]*?\}\s*\}, \[navigate\]\);/, `useEffect(() => {\n    if (!user) navigate('/login');\n  }, [user, navigate]);`);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Refactored ${componentName}`);
}

refactorToUseAuth('frontend/src/components/Navbar.jsx', 'Navbar');
refactorToUseAuth('frontend/src/pages/Pricing.jsx', 'Pricing');
refactorToUseAuth('frontend/src/pages/Settings.jsx', 'Settings');
