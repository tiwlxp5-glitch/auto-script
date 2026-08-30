const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Navbar.jsx', 'utf8');
code = code.replace(/import \{ useAuth \} from '\.\.\/context\/AuthContext'; from 'react-router-dom';/g, "import { useAuth } from '../context/AuthContext';");
fs.writeFileSync('frontend/src/components/Navbar.jsx', code, 'utf8');
