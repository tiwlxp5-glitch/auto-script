import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { lazyWithRetry } from './utils/lazyWithRetry';

// ─── Eager (โหลดทันที) ────────────────────────────────────────────
// หน้าที่ทุกคนเข้าถึงก่อนล็อกอิน โหลดทันทีเพื่อประสบการณ์ที่เร็ว
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// ─── Lazy with Auto-Retry (Fixes FE-01: ChunkLoadError) ──────────
// เปรียบเหมือนร้านอาหาร "สั่งแล้วทำ" — ไม่เตรียมทุกจานล่วงหน้า
// ช่วยลดขนาด Bundle แรกจาก ~551KB เหลือ ~200KB
// lazyWithRetry: ถ้าไฟล์ Bundle เวอร์ชั่นเก่าหาไม่เจอ (404 หลัง Deploy ใหม่)
// จะรีเฟรชหน้าอัตโนมัติ 1 ครั้งเพื่อดึง Bundle ใหม่ แทนที่จะแสดงหน้าจอ Error
const CreateScript = lazyWithRetry(() => import('./pages/CreateScript'));
const Pricing      = lazyWithRetry(() => import('./pages/Pricing'));
const Settings     = lazyWithRetry(() => import('./pages/Settings'));
const History      = lazyWithRetry(() => import('./pages/History'));
const Legal        = lazyWithRetry(() => import('./pages/Legal'));


// ─── Loading Spinner ──────────────────────────────────────────────
// แสดงระหว่างที่ React กำลังโหลด Chunk ของหน้านั้น (~0.2-0.5 วิ)
// ป้องกันหน้าจอขาวระหว่างรอ
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="animate-spin h-10 w-10 text-amber-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm text-slate-500 font-medium">กำลังโหลด...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    // Suspense คือ "ห้องรอ" — ขณะที่ React โหลด Chunk หน้าที่ขอ
    // จะแสดง PageLoader แทน แล้ว swap ออกเมื่อพร้อม
    <Suspense fallback={<PageLoader />}>
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

          {/* หน้านโยบายเงื่อนไข (Legal) */}
          <Route path="legal" element={<Legal />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
