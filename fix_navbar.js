const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Navbar.jsx', 'utf8');

if (!code.includes('>เติมเครดิต</Link>')) {
    code = code.replace(
        /(<Link\s+to="\/history"[^>]+>\s*ประวัติ\s*<\/Link>)/g,
        '$1\n              <Link to="/pricing" className="block pl-3 pr-4 py-2 text-base font-medium text-slate-600 hover:text-amber-600 hover:bg-slate-50 transition-colors">เติมเครดิต</Link>'
    );
    fs.writeFileSync('frontend/src/components/Navbar.jsx', code, 'utf8');
    console.log('Added Top Up to mobile menu');
}
