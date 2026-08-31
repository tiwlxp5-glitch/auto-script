import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FeedbackModal from './FeedbackModal';

function Navbar() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  // ปิดเมนูอัตโนมัติเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // ดักการคลิกพื้นที่อื่นบนจอเพื่อปิดเมนู
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      refreshProfile();
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [refreshProfile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getCreditBadgeStyle = () => {
    if (!profile) return { wrapper: 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300', icon: 'text-slate-400' };
    switch (profile.tier) {
      case 'pro':
        return { wrapper: 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-700 hover:border-orange-300', icon: 'text-orange-500' };
      case 'plus':
        return { wrapper: 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 text-blue-700 hover:border-blue-300', icon: 'text-blue-500' };
      case 'free':
      default:
        return { wrapper: 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 text-slate-600 hover:border-slate-300', icon: 'text-slate-400' };
    }
  };

  const badgeStyle = getCreditBadgeStyle();

  return (
    <>
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
                  <Link to="/pricing" className={`group flex items-center border hover:shadow-md px-4 py-1.5 rounded-full font-bold text-sm transition-all cursor-pointer shadow-sm ${badgeStyle.wrapper}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform ${badgeStyle.icon}`}>
                      <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
                    </svg>
                    <span>{profile ? profile.credits : '...'} เครดิต</span>
                  </Link>
                  
                  <Link to="/history" className="text-slate-600 hover:text-blue-600 px-3 py-2 font-medium hidden sm:block">
                    ประวัติ
                  </Link>
                  <Link to="/create" className="text-slate-600 hover:text-blue-600 px-3 py-2 font-medium hidden sm:block">
                    สร้างสคริปต์
                  </Link>
  
                  {/* Hamburger / Profile Menu */}
                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      aria-label="เมนูหลัก"
                      aria-expanded={isMenuOpen}
                      aria-controls="main-nav-dropdown"
                      className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {/* SVG Hamburger Icon */}
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
  
                    {/* Dropdown Box */}
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                        <Link 
                          to="/create" 
                          className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 sm:hidden"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg> สร้างสคริปต์
                        </Link>
                        <Link 
                          to="/history" 
                          className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 sm:hidden"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg> ประวัติสคริปต์
                        </Link>
                        <Link 
                          to="/pricing" 
                          className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600 sm:hidden"
                        >
                          <svg className="w-4 h-4 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> เติมเครดิต
                        </Link>
                        
                        <button 
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsFeedbackOpen(true);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 font-medium"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg> ส่งคำติชม
                        </button>
  
                        {profile?.role === 'admin' && (
                          <Link 
                            to="/admin" 
                            className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Admin
                          </Link>
                        )}
  
                        <Link 
                          to="/settings" 
                          className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> ตั้งค่าบัญชี
                        </Link>
                        <button 
                          onClick={() => {
                            handleLogout();
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg> ออกจากระบบ
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
      
      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
}

export default Navbar;
