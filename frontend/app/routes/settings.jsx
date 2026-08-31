import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { translateError } from '../utils/translateError';

function Settings() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // Brand Voice State
  const [brandVoice, setBrandVoice] = useState({
    creator_name: '',
    catchphrase: '',
    target_audience: '',
    custom_tone: '',
    is_brand_voice_enabled: false
  });
  const [isSavingBrandVoice, setIsSavingBrandVoice] = useState(false);

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

    if (profile) {
      setBrandVoice({
        creator_name: profile.creator_name || '',
        catchphrase: profile.catchphrase || '',
        target_audience: profile.target_audience || '',
        custom_tone: profile.custom_tone || '',
        is_brand_voice_enabled: profile.is_brand_voice_enabled || false
      });
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
      toast.error('เกิดข้อผิดพลาดในการบันทึกชื่อ', {
        icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      });
    } else {
      toast.success('บันทึกชื่อเรียบร้อยแล้ว!', {
        icon: <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      });
      refreshProfile();
    }
  };

  const handleUpdateBrandVoice = async (e) => {
    e.preventDefault();
    setIsSavingBrandVoice(true);
    
    const payload = {
      creator_name: brandVoice.creator_name.substring(0, 50),
      catchphrase: brandVoice.catchphrase.substring(0, 100),
      target_audience: brandVoice.target_audience.substring(0, 100),
      custom_tone: brandVoice.custom_tone.substring(0, 50),
      is_brand_voice_enabled: brandVoice.is_brand_voice_enabled
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);
      
    setIsSavingBrandVoice(false);
    if (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก Brand Voice Memory', {
        icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      });
    } else {
      toast.success('บันทึกสไตล์ของช่องเรียบร้อยแล้ว!', {
        icon: <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      });
      refreshProfile();
    }
  };

  const handleManageSubscription = async () => {
    if (!profile?.stripe_customer_id) {
      toast('คุณยังไม่ได้สมัครแพ็กเกจใดๆ ครับ (คุณใช้งานแพ็กเกจฟรีอยู่)', {
        icon: <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      });
      return;
    }
    
    setIsLoadingPortal(true);
    try {
      // ดึง Token เซสชันปัจจุบันเพื่อส่งยืนยันตัวตนกับ Backend API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง', {
          icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        });
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
        toast.error('ไม่สามารถสร้างลิงก์จัดการแพ็กเกจได้: ' + translateError(data.error || 'Unknown error'), {
          icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe', {
        icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      });
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
        toast.success('ลบบัญชีเรียบร้อยแล้ว หวังว่าจะได้พบกันใหม่นะครับ!', {
          icon: <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        });
        navigate('/');
      } else {
        const errData = await res.text();
        toast.error('ไม่สามารถลบบัญชีได้: ' + translateError(errData), {
          icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        });
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการลบบัญชี', {
        icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      });
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
              maxLength={50}
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

      {/* 2. Brand Voice Memory */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
            ตั้งค่าตัวตนและสไตล์ของช่อง (Brand Voice)
          </h2>
          {(profile.tier === 'pro' || profile.tier === 'plus' || profile.trial_pro_remaining > 0) && (
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold w-fit">✨ Pro / Plus Feature</span>
          )}
        </div>
        <p className="text-sm text-slate-600 mb-6">
          ช่วยให้ AI จำตัวตนของคุณได้อัตโนมัติ โดยไม่ต้องพิมพ์บอกใหม่ทุกครั้งที่สร้างสคริปต์
        </p>

        <form onSubmit={handleUpdateBrandVoice}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">คำเรียกแทนตัวเอง (เช่น แม่กิ๊ฟ, เจ้หนิง)</label>
              <input 
                type="text" 
                value={brandVoice.creator_name} 
                onChange={(e) => setBrandVoice({...brandVoice, creator_name: e.target.value})}
                placeholder="คำเรียกแทนตัวเอง"
                maxLength={50}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">กลุ่มเป้าหมายของช่อง (เช่น วัยรุ่น, คุณแม่)</label>
              <input 
                type="text" 
                value={brandVoice.target_audience} 
                onChange={(e) => setBrandVoice({...brandVoice, target_audience: e.target.value})}
                placeholder="ใครคือคนดูหลักของคุณ?"
                maxLength={100}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">คำติดปาก / คำเปิด-ปิดคลิป</label>
              <input 
                type="text" 
                value={brandVoice.catchphrase} 
                onChange={(e) => setBrandVoice({...brandVoice, catchphrase: e.target.value})}
                placeholder="เช่น อุ๊ยคุณน้า, ของดีบอกต่อ"
                maxLength={100}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">สไตล์น้ำเสียง (Custom Tone)</label>
              <input 
                type="text" 
                value={brandVoice.custom_tone} 
                onChange={(e) => setBrandVoice({...brandVoice, custom_tone: e.target.value})}
                placeholder="เช่น เพื่อนสาวเม้าท์มอย, ตลกโบ๊ะบ๊ะ"
                maxLength={50}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
            <div>
              <p className="font-semibold text-orange-900">เปิดใช้งาน Brand Voice Memory</p>
              <p className="text-xs text-orange-700 mt-1">หากเปิด AI จะดึงข้อมูลนี้ไปผสมในสคริปต์ทุกครั้ง</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={brandVoice.is_brand_voice_enabled}
                onChange={(e) => setBrandVoice({...brandVoice, is_brand_voice_enabled: e.target.checked})}
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isSavingBrandVoice}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {isSavingBrandVoice ? 'กำลังบันทึก...' : 'บันทึก Brand Voice'}
          </button>
        </form>
      </div>

      {/* 3. แพ็กเกจปัจจุบัน */}
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
                <p className="text-sm text-orange-500 mb-1 whitespace-nowrap">สิทธิ์ทดลอง Pro ฟรี</p>
                <p className="text-xl font-bold text-orange-700">{Math.min(profile.credits, profile.trial_pro_remaining)} ครั้ง</p>
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
