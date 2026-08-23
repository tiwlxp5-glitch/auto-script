import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ตรงนี้จะถูกแทนที่ด้วยหน้า (Pages) ต่างๆ อัตโนมัติ */}
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-slate-400 text-sm border-t border-slate-200 mt-auto bg-white">
        <p className="mb-2">© 2026 Auto Script. All rights reserved.</p>
        <div className="flex justify-center gap-4">
          <Link to="/legal" className="hover:text-blue-500 transition-colors">เงื่อนไขการให้บริการ (Terms)</Link>
          <Link to="/legal" className="hover:text-blue-500 transition-colors">นโยบายความเป็นส่วนตัว (PDPA)</Link>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
