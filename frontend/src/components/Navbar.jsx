import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Navbar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // เช็คว่ามีใครล็อกอินอยู่ไหมตอนโหลดหน้าเว็บ
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    // ดักฟังการเปลี่ยนแปลง (เช่น ตอนล็อกอิน หรือ ล็อกเอาท์)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    const handleProfileUpdate = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) fetchProfile(session.user.id);
      });
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('credits, tier')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-blue-600">Auto Script</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/pricing" className="flex items-center bg-amber-100 text-amber-800 hover:bg-amber-200 px-4 py-1.5 rounded-full font-bold text-sm transition-colors cursor-pointer shadow-sm border border-amber-200">
                  <span>{profile ? profile.credits : '...'} เครดิต</span>
                </Link>
                
                <Link to="/history" className="text-slate-600 hover:text-blue-600 px-3 py-2 font-medium hidden sm:block">
                  ประวัติ
                </Link>
                <Link to="/create" className="text-slate-600 hover:text-blue-600 px-3 py-2 font-medium hidden sm:block">
                  สร้างสคริปต์
                </Link>

                {/* Hamburger / Profile Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors focus:outline-none"
                  >
                    {/* SVG Hamburger Icon */}
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  {/* Dropdown Box */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                      <Link 
                        to="/history" 
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 sm:hidden"
                      >
                        🗂️ ประวัติสคริปต์
                      </Link>
                      <Link 
                        to="/settings" 
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        ⚙️ ตั้งค่าบัญชี
                      </Link>
                      <button 
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleLogout();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        🚪 ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 sm:gap-4">
                <Link to="/pricing" className="hidden sm:block text-slate-600 hover:text-blue-600 px-3 py-2 font-medium">
                  แพ็กเกจ
                </Link>
                <Link to="/login" className="text-slate-600 hover:text-blue-600 px-2 py-2 text-sm sm:text-base font-medium whitespace-nowrap">
                  เข้าสู่ระบบ
                </Link>
                <Link to="/register" className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors whitespace-nowrap">
                  เริ่มใช้ฟรี
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
