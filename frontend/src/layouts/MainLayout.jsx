import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ตรงนี้จะถูกแทนที่ด้วยหน้า (Pages) ต่างๆ อัตโนมัติ */}
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
