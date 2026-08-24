import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Settings() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name);
    } else if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [user, profile]);

  useEffect(() => {
    // เช็คว่ากลับมาจากการจ่ายเงินสำเร็จหรือไม่
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      setShowToast(true);
      refreshProfile();
      // ลบ query param ออกจาก URL เพื่อไม่ให้โชว์ซ้ำตอนกดรีเฟรช
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // ปิดแจ้งเตือนอัตโนมัติหลังจาก 5 วินาที
      setTimeout(() => setShowToast(false), 5000);
    }
  }, [refreshProfile]);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName }
    });
    
    setIsSaving(false);
    if (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกชื่อ');
    } else {
      alert('บันทึกชื่อเรียบร้อยแล้ว!');
      refreshProfile();
    }
  };

  const handleManageSubscription = async () => {
    if (!profile?.stripe_customer_id) {
      alert("คุณยังไม่ได้สมัครแพ็กเกจใดๆ ครับ (คุณใช้งานแพ็กเกจฟรีอยู่)");
      return;
    }
    
    setIsLoadingPortal(true);
    try {
      // ดึง Token เซสชันปัจจุบันเพื่อส่งยืนยันตัวตนกับ Backend API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        navigate('/login');
        return;
      }

      // เรียก Cloudflare Function พร้อม Authorization Header ป้องกันช่องโหว่ IDOR
      const res = await fetch('/api/create-portal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // เด้งไปเว็บ Stripe
      } else {
        alert("ไม่สามารถสร้างลิงก์จัดการแพ็กเกจได้: " + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm("⚠️ คำเตือน: คุณต้องการลบบัญชีใช่หรือไม่? ประวัติสคริปต์ทั้งหมดจะถูกลบถาวร!");
    if (!confirm1) return;
    
    const confirm2 = window.confirm("คุณแน่ใจ 100% ใช่ไหมครับ? การกระทำนี้ไม่สามารถย้อนกลับได้");
    if (!confirm2) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        }
      });
      
      if (res.ok) {
        await supabase.auth.signOut();
        alert("ลบบัญชีเรียบร้อยแล้ว หวังว่าจะได้พบกันใหม่นะครับ!");
        navigate('/');
      } else {
        const errData = await res.text();
        alert("ไม่สามารถลบบัญชีได้: " + errData);
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการลบบัญชี");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user || !profile) {
    return <div className="text-center py-20 text-slate-500">กำลังโหลดข้อมูลบัญชี...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-4 md:right-8 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-[bounce_1s_ease-in-out]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <h4 className="font-bold">ชำระเงินสำเร็จ! 🎉</h4>
            <p className="text-sm text-green-100">อัปเกรดแพ็กเกจและเติมเครดิตเรียบร้อยแล้ว</p>
          </div>
        </div>
      )}

      <button 
        onClick={() => navigate('/create')}
        className="flex items-center text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        กลับไปหน้าสร้างสคริปต์
      </button>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">บัญชีผู้ใช้และการตั้งค่า</h1>

      {/* 1. เปลี่ยนชื่อ */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">ข้อมูลส่วนตัว</h2>
        <form onSubmit={handleUpdateName}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">อีเมล (ไม่สามารถเปลี่ยนได้)</label>
            <input 
              type="text" 
              disabled 
              value={user.email} 
              className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อที่แสดง (Display Name)</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="กรอกชื่อของคุณ"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกชื่อ'}
          </button>
        </form>
      </div>

      {/* 2. แพ็กเกจปัจจุบัน */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">แพ็กเกจของคุณ</h2>
        <div className="flex flex-col md:flex-row items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto text-center sm:text-left">
            <div>
              <p className="text-sm text-slate-500 mb-1 whitespace-nowrap">แผนปัจจุบัน (Plan)</p>
              <p className="text-2xl font-bold uppercase text-blue-600">{profile.tier}</p>
            </div>
            
            {profile.tier === 'free' && profile.trial_pro_remaining > 0 && (
              <div className="border-l border-slate-200 pl-4">
                <p className="text-sm text-purple-500 mb-1 whitespace-nowrap">สิทธิ์ทดลอง Pro ฟรี</p>
                <p className="text-xl font-bold text-purple-700">{profile.trial_pro_remaining} ครั้ง</p>
              </div>
            )}
          </div>
          <div className="text-center sm:text-right w-full md:w-auto">
            <p className="text-sm text-slate-500 mb-1 whitespace-nowrap">เครดิตคงเหลือ</p>
            <p className="text-2xl font-semibold">{profile.credits}</p>
            {profile.tier === 'free' && profile.last_free_reset && (
              <p className="text-xs text-slate-400 mt-1">
                รอบเติมเครดิตฟรีรอบถัดไป: {new Date(new Date(profile.last_free_reset).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH')}
              </p>
            )}
          </div>
        </div>
        
        <p className="text-sm text-slate-600 mb-4">
          หากคุณต้องการเปลี่ยนบัตรเครดิต, ดูประวัติการชำระเงิน, หรือยกเลิกบริการ สามารถเข้าไปจัดการได้ที่ระบบของ Stripe โดยตรงครับ
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => navigate('/pricing')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 w-full sm:w-auto text-center"
          >
            ดูแพ็กเกจและอัปเกรด
          </button>

          {profile.tier !== 'free' && profile.stripe_customer_id && (
            <button 
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 w-full sm:w-auto text-center"
            >
              {isLoadingPortal ? 'กำลังติดต่อ Stripe...' : 'จัดการการตัดบัตร / ยกเลิก'}
            </button>
          )}
        </div>
      </div>

      {/* 3. ลบบัญชี */}
      <div className="bg-red-50 p-6 rounded-xl border border-red-100">
        <h2 className="text-xl font-semibold text-red-700 mb-2">ลบบัญชี (Danger Zone)</h2>
        <p className="text-sm text-red-600 mb-4">
          การลบบัญชีจะทำให้ข้อมูลทั้งหมด (รวมถึงสคริปต์ที่คุณเคยสร้างไว้) หายไปอย่างถาวรและไม่สามารถกู้คืนได้
        </p>
        <button 
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'กำลังลบข้อมูล...' : 'ลบบัญชีของฉันอย่างถาวร'}
        </button>
      </div>
    </div>
  );
}

export default Settings;
