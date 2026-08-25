const fs = require('fs');

let mainCode = fs.readFileSync('frontend/src/main.jsx', 'utf8');

if (!mainCode.includes('ErrorBoundary')) {
  mainCode = mainCode.replace(
    /import App from '\.\/App\.jsx'/,
    `import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'`
  );

  mainCode = mainCode.replace(
    /<BrowserRouter>\s*<App \/>\s*<\/BrowserRouter>/,
    `<ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>`
  );

  fs.writeFileSync('frontend/src/main.jsx', mainCode, 'utf8');
  console.log('main.jsx wrapped with ErrorBoundary and AuthProvider');
}
