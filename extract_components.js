const fs = require('fs');

const blueprint = fs.readFileSync('QA_AUDIT_BLUEPRINT.md', 'utf8');

// 1. Extract and write ErrorBoundary.jsx
const errorBoundaryMatch = blueprint.match(/\/\/ File: frontend\/src\/components\/ErrorBoundary\.jsx\r?\n([\s\S]*?)\`\`\`/);
if (errorBoundaryMatch) {
  let content = errorBoundaryMatch[1].trim();
  fs.writeFileSync('frontend/src/components/ErrorBoundary.jsx', content, 'utf8');
  console.log('ErrorBoundary.jsx created');
} else {
  console.log('ErrorBoundary.jsx not found in blueprint');
}

// 2. Extract and write AuthContext.jsx
const authContextMatch = blueprint.match(/\/\/ File: frontend\/src\/context\/AuthContext\.jsx\r?\n([\s\S]*?)\`\`\`/);
if (authContextMatch) {
  let content = authContextMatch[1].trim();
  fs.mkdirSync('frontend/src/context', { recursive: true });
  fs.writeFileSync('frontend/src/context/AuthContext.jsx', content, 'utf8');
  console.log('AuthContext.jsx created');
} else {
  console.log('AuthContext.jsx not found in blueprint');
}
