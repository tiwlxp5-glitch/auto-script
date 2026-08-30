const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/History.jsx', 'utf8');

code = code.replace(
  /const \{ user, profile, loading, refreshProfile \} = useAuth\(\);/,
  `const { user, profile, loading: authLoading, refreshProfile } = useAuth();`
);

code = code.replace(
  /if \(!loading && !user\)/g,
  `if (!authLoading && !user)`
);

code = code.replace(
  /\[user, loading, navigate\]/g,
  `[user, authLoading, navigate]`
);

fs.writeFileSync('frontend/src/pages/History.jsx', code, 'utf8');
console.log('History.jsx fixed!');
