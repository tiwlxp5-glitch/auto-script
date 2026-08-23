import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import CreateScript from './pages/CreateScript';
import Login from './pages/Login';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';
import History from './pages/History';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* หน้า Home จะแสดงข้างใน MainLayout ตรงตำแหน่ง Outlet */}
        <Route index element={<Home />} />
        
        {/* หน้าสร้างสคริปต์ */}
        <Route path="create" element={<CreateScript />} />
        
        {/* หน้าแสดงแพ็กเกจราคา */}
        <Route path="pricing" element={<Pricing />} />
        
        {/* หน้าตั้งค่าบัญชี */}
        <Route path="settings" element={<Settings />} />
        
        {/* หน้าประวัติ */}
        <Route path="history" element={<History />} />
        
        {/* หน้าเข้าสู่ระบบและสมัครสมาชิก */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>
    </Routes>
  );
}

export default App;
