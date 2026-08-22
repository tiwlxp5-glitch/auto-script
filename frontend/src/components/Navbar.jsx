import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Navbar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
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

    return () => subscription.unsubscribe();
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
    <nav className="bg-white shadow-sm border-b border-slate-200">
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
                <Link to="/pricing" className="flex items-center space-x-1 bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-full font-semibold text-sm transition-colors cursor-pointer">
                  <span>💎</span>
                  <span>{profile ? profile.credits : '...'} เครดิต</span>
                </Link>
                
                <Link to="/create" className="text-slate-600 hover:text-blue-600 px-3 py-2 font-medium hidden sm:block">
                  สร้างสคริปต์
                </Link>
                <button 
                  onClick={handleLogout}
                  className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  ออก
                </button>
              </>
            ) : (
              <>
                <Link to="/pricing" className="text-slate-600 hover:text-blue-600 px-3 py-2 font-medium">
                  ราคาแพ็กเกจ
                </Link>
                <Link to="/login" className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                  เข้าสู่ระบบ
                </Link>
                <Link to="/register" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors">
                  เริ่มใช้งานฟรี
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
