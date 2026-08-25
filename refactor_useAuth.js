const fs = require('fs');

const files = [
  'frontend/src/pages/CreateScript.jsx',
  'frontend/src/pages/History.jsx',
  'frontend/src/pages/Pricing.jsx',
  'frontend/src/components/Navbar.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // Inject import if missing
  if (!code.includes('useAuth')) {
    code = code.replace(
      /import React[\s\S]*?;/,
      `$&
import { useAuth } from '../context/AuthContext';`
    );
  }

  if (file.includes('CreateScript.jsx')) {
    // Remove local state
    code = code.replace(/const \[user, setUser\] = useState\(null\);\s*const \[profile, setProfile\] = useState\(null\);/, '');
    code = code.replace(/const \{ user, profile, loading, refreshProfile \} = useAuth\(\);/, '');
    
    // Insert useAuth
    code = code.replace(/export default function CreateScript\(\) \{/, `export default function CreateScript() {\n  const { user, profile, loading, refreshProfile } = useAuth();`);

    // Remove useEffect for auth
    code = code.replace(/useEffect\(\(\) => \{\s*supabase\.auth\.getSession\(\)[\s\S]*?\}, \[navigate\]\);/g, `useEffect(() => {\n    if (!loading && !user) navigate('/login');\n  }, [user, loading, navigate]);`);

    // Remove fetchProfile
    code = code.replace(/const fetchProfile = async \(userId\) => \{[\s\S]*?\}\s*\} catch \(error\) \{[\s\S]*?\}\s*\};\s*/g, '');

  }
  
  if (file.includes('History.jsx')) {
    code = code.replace(/const \[user, setUser\] = useState\(null\);\s*const \[profile, setProfile\] = useState\(null\);/, '');
    code = code.replace(/const \{ user, profile, loading, refreshProfile \} = useAuth\(\);/, '');
    
    code = code.replace(/export default function History\(\) \{/, `export default function History() {\n  const { user, profile, loading, refreshProfile } = useAuth();`);

    code = code.replace(/useEffect\(\(\) => \{\s*supabase\.auth\.getSession\(\)[\s\S]*?\}, \[navigate\]\);/g, `useEffect(() => {\n    if (!loading && !user) navigate('/login');\n    else if (user) fetchHistory(user.id);\n  }, [user, loading, navigate]);`);

    code = code.replace(/const fetchProfile = async \(userId\) => \{[\s\S]*?\}\s*\} catch \(error\) \{[\s\S]*?\}\s*\};\s*/g, '');
  }

  fs.writeFileSync(file, code, 'utf8');
});

console.log('Components refactored to useAuth()');
