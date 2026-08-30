import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';
import { useScriptGeneration } from '../context/ScriptGenerationContext';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGenerating, generationProgress, generatedScript, error, clearResult } = useScriptGeneration();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });

    if (location.hash && location.hash.includes('type=recovery')) {
      navigate('/reset-password');
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [location, navigate]);

  const renderFloatingWidget = () => {
    if (!isGenerating && !generatedScript && !error) return null;
    
    if (isGenerating) {
      return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 sm:gap-4 border border-slate-700/50 w-[92%] sm:w-auto sm:min-w-[320px] max-w-md">
          <svg className="w-5 h-5 text-blue-400 animate-spin shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">AI กำลังร่างสคริปต์...</div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-blue-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${generationProgress}%` }}></div>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-400 shrink-0 w-8 text-right">{generationProgress}%</span>
        </div>
      );
    }

    if (error) {
      return (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up bg-red-50 text-red-600 px-5 py-3 rounded-full shadow-xl flex items-center gap-3 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors w-[92%] sm:w-auto max-w-md" 
          onClick={clearResult}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm font-medium truncate">เกิดข้อผิดพลาด (คลิกเพื่อปิด)</span>
        </div>
      );
    }

    if (generatedScript) {
      return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up flex gap-2 w-[92%] sm:w-auto justify-center max-w-md">
          <button 
            onClick={() => {
              clearResult(); // clear state
              navigate('/history'); // redirect to history
            }}
            className="bg-green-500 text-white px-5 py-3 rounded-full shadow-xl flex items-center justify-center gap-2 border border-green-400 hover:bg-green-600 transition-colors group cursor-pointer flex-1 sm:flex-none"
          >
            <svg className="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="text-sm font-bold group-hover:scale-105 transition-transform whitespace-nowrap">สคริปต์เสร็จแล้ว! ดูเลย</span>
          </button>
          <button onClick={clearResult} className="bg-white text-slate-400 p-3 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors shrink-0">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <Outlet />
      </main>

      <footer className="w-full text-center py-6 text-slate-400 text-sm border-t border-slate-200 mt-auto bg-white flex flex-col gap-2 relative z-40">
        <p>© 2026 Auto Script. All rights reserved.</p>
        <div className="flex justify-center flex-wrap gap-x-4 gap-y-2">
          <Link to="/legal" className="hover:text-blue-500 transition-colors">เงื่อนไขการให้บริการ (Terms)</Link>
          <Link to="/legal" className="hover:text-blue-500 transition-colors">นโยบายความเป็นส่วนตัว (PDPA)</Link>
          <a href="https://lin.ee/x0yVB1kk" target="_blank" rel="noopener noreferrer" className="hover:text-[#00B900] transition-colors font-medium">ติดต่อฝ่ายสนับสนุน (LINE)</a>
        </div>
      </footer>
      
      {/* Floating Widget (Mini-Player for Generation) */}
      {renderFloatingWidget()}
    </div>
  );
}

export default MainLayout;
