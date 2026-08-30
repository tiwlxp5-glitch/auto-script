const fs = require('fs');
let code = fs.readFileSync('frontend/functions/api/__tests__/helpers/mockDb.js', 'utf8');

const replacement = `
        if (functionName === 'increment_credits') {
          // Normalize both prefixed (p_user_id) and legacy (user_id) argument conventions
          const userId = args.p_user_id ?? args.user_id;
          const amount = args.p_amount ?? args.amount ?? 0;
        
          if (!userId) {
            return { data: null, error: { message: 'Missing user identifier for increment_credits' } };
          }
        
          const profile = db.profiles.get(userId);
          if (!profile) {
            return { data: null, error: { message: \`Profile not found for user \${userId}\` } };
          }
        
          const currentCredits = profile.credits ?? 0;
          
          // Guard against insufficient balance on deduction
          if (amount < 0 && currentCredits < Math.abs(amount)) {
            return { data: -1, error: { message: 'Insufficient credits' } };
          }
        
          const newCredits = Math.max(0, currentCredits + amount);
          profile.credits = newCredits;
          profile.updated_at = new Date().toISOString();
          db.profiles.set(userId, profile);
        
          return { data: newCredits, error: null };
        }
`;

code = code.replace(
  /if \(functionName === 'increment_credits'\) \{[\s\S]*?return \{ data: newCredits, error: null \};\s*\}/,
  replacement.trim()
);

fs.writeFileSync('frontend/functions/api/__tests__/helpers/mockDb.js', code);
console.log("mockDb.js updated");
