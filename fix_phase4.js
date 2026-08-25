const fs = require('fs');

// 1. History.jsx
let historyCode = fs.readFileSync('frontend/src/pages/History.jsx', 'utf8');
historyCode = historyCode.replace(
  /const filterButtons = \[[^\]]+\];/,
  `const filterButtons = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'PAS', label: 'ปัญหา-ผลกระทบ (PAS)' },
    { id: 'Hook-Story-Offer', label: 'ดึงความสนใจ (HSO)' },
    { id: 'BAB', label: 'เปรียบเทียบ (BAB)' },
    { id: 'FAB', label: 'คุณสมบัติ (FAB)' },
    { id: 'เปรียบเทียบกับคู่แข่ง', label: 'เปรียบเทียบกับคู่แข่ง' }
  ];`
);
fs.writeFileSync('frontend/src/pages/History.jsx', historyCode, 'utf8');

// 2. Pricing.jsx
let pricingCode = fs.readFileSync('frontend/src/pages/Pricing.jsx', 'utf8');
if (!pricingCode.includes('isRedirecting')) {
  pricingCode = pricingCode.replace(
    /const navigate = useNavigate\(\);/,
    `const navigate = useNavigate();\n  const [isRedirecting, setIsRedirecting] = useState(false);`
  );

  pricingCode = pricingCode.replace(
    /const handleCheckout = \(baseLink\) => \{/,
    `const handleCheckout = (baseLink) => {
    if (isRedirecting) return;
    setIsRedirecting(true);`
  );

  pricingCode = pricingCode.replace(
    /onClick=\{\(\) => handleCheckout\(link\)\}/g,
    `onClick={() => handleCheckout(link)} disabled={isRedirecting}`
  );
  fs.writeFileSync('frontend/src/pages/Pricing.jsx', pricingCode, 'utf8');
}

// 3. CreateScript.jsx AbortController
let createScriptCode = fs.readFileSync('frontend/src/pages/CreateScript.jsx', 'utf8');
if (!createScriptCode.includes('analyzeAbortRef')) {
  createScriptCode = createScriptCode.replace(
    /export default function CreateScript\(\) \{[\s\S]*?const \{ user, profile, loading, refreshProfile \} = useAuth\(\);/,
    `$&
  const analyzeAbortRef = React.useRef(null);
  
  React.useEffect(() => {
    return () => {
      if (analyzeAbortRef.current) analyzeAbortRef.current.abort();
    };
  }, []);`
  );

  createScriptCode = createScriptCode.replace(
    /const handleAnalyze = async \(\) => \{/,
    `const handleAnalyze = async () => {
    if (analyzeAbortRef.current) analyzeAbortRef.current.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;`
  );

  createScriptCode = createScriptCode.replace(
    /body: JSON\.stringify\(\{ urls: validUrls \}\)/,
    `body: JSON.stringify({ urls: validUrls }),
          signal: controller.signal`
  );

  fs.writeFileSync('frontend/src/pages/CreateScript.jsx', createScriptCode, 'utf8');
}

// 4. Register.jsx links
let registerCode = fs.readFileSync('frontend/src/pages/Register.jsx', 'utf8');
registerCode = registerCode.replace(
  /href="\/privacy"/g,
  'href="/legal"'
).replace(
  /href="\/terms"/g,
  'href="/legal"'
);
fs.writeFileSync('frontend/src/pages/Register.jsx', registerCode, 'utf8');

console.log('Phase 4 fixes applied');
