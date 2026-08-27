import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // ดักจับ Event จาก Supabase ถ้าระบบพบว่าเป็นการคลิกลิงก์ Reset Password จากอีเมล
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });

    // สำรอง: เผื่อกรณีที่ Supabase ยังไม่ทันลบ hash ออกจาก URL
    if (location.hash && location.hash.includes('type=recovery')) {
      navigate('/reset-password');
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ตรงนี้จะถูกแทนที่ด้วยหน้า (Pages) ต่างๆ อัตโนมัติ */}
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-slate-400 text-sm border-t border-slate-200 mt-auto bg-white flex flex-col gap-2">
        <p>© 2026 Auto Script. All rights reserved.</p>
        <div className="flex justify-center flex-wrap gap-x-4 gap-y-2">
          <Link to="/legal" className="hover:text-blue-500 transition-colors">เงื่อนไขการให้บริการ (Terms)</Link>
          <Link to="/legal" className="hover:text-blue-500 transition-colors">นโยบายความเป็นส่วนตัว (PDPA)</Link>
          <a href="https://lin.ee/x0yVB1kk" target="_blank" rel="noopener noreferrer" className="hover:text-[#00B900] transition-colors font-medium">ติดต่อฝ่ายสนับสนุน (LINE)</a>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
