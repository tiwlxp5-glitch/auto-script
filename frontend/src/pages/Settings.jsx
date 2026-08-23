import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function Settings() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      setDisplayName(session.user.user_metadata?.full_name || '');
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (data) setProfile(data);
    };
    
    loadUser();
  }, [navigate]);

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
    }
  };

  const handleManageSubscription = async () => {
    if (!profile?.stripe_customer_id) {
      alert("คุณยังไม่ได้สมัครแพ็กเกจใดๆ ครับ (คุณใช้งานแพ็กเกจฟรีอยู่)");
      return;
    }
    
    setIsLoadingPortal(true);
    try {
      // เรียก Cloudflare Function
      const res = await fetch('/api/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.stripe_customer_id })
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
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลบบัญชี");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user || !profile) {
    return <div className="text-center py-20 text-slate-500">กำลังโหลดข้อมูลบัญชี...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">ตั้งค่าบัญชี (Settings)</h1>

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
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">แผนปัจจุบัน (Current Plan)</p>
            <p className="text-2xl font-bold uppercase text-blue-600">{profile.tier}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 mb-1">เครดิตคงเหลือ</p>
            <p className="text-xl font-semibold">{profile.credits} 💎</p>
          </div>
        </div>
        
        <p className="text-sm text-slate-600 mb-4">
          หากคุณต้องการเปลี่ยนบัตรเครดิต, ดูประวัติการชำระเงิน, หรือยกเลิกบริการ สามารถเข้าไปจัดการได้ที่ระบบของ Stripe โดยตรงครับ
        </p>
        
        <button 
          onClick={handleManageSubscription}
          disabled={isLoadingPortal}
          className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 w-full sm:w-auto"
        >
          {isLoadingPortal ? 'กำลังติดต่อ Stripe...' : '💳 จัดการแพ็กเกจ / ยกเลิกบริการ'}
        </button>
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
          {isDeleting ? 'กำลังลบข้อมูล...' : '🗑️ ลบบัญชีของฉันอย่างถาวร'}
        </button>
      </div>
    </div>
  );
}

export default Settings;
