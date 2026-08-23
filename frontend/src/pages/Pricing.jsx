import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function Pricing() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  // ลิงก์จาก Stripe ที่ลูกค้าให้มา (แบบ One-Time Payment)
  const PLUS_LINK = "https://buy.stripe.com/test_5kQ3cxbsb0JD6Xr0by0ZW03";
  const PRO_LINK = "https://buy.stripe.com/test_5kQdRb2VF63X5TnbUg0ZW02";

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        if (data) setProfile(data);
      }
    });
  }, []);

  const handleCheckout = (baseLink) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนชำระเงินครับ!");
      navigate('/login');
      return;
    }
    // แนบ user.id ไปกับลิงก์ Stripe เพื่อให้ Webhook รู้ว่าใครเป็นคนจ่ายเงิน
    const checkoutUrl = `${baseLink}?client_reference_id=${user.id}`;
    window.location.href = checkoutUrl;
  };

  const renderButton = (tierName, link, defaultClasses, normalText) => {
    const isFree = tierName === 'free';
    
    // 1. ยังไม่ล็อกอิน
    if (!user) {
      if (isFree) {
        return (
          <button onClick={() => navigate('/register')} className="mt-8 block w-full bg-slate-100 text-slate-900 hover:bg-slate-200 py-3 px-4 rounded-xl font-bold text-center transition-colors">
            สมัครสมาชิกฟรี
          </button>
        );
      }
      return (
        <button onClick={() => handleCheckout(link)} className={defaultClasses}>
          {normalText}
        </button>
      );
    }

    // 2. ล็อกอินแล้ว ดึงข้อมูลแพ็กเกจ
    const currentTier = profile?.tier || 'free';
    const credits = profile?.credits || 0;

    // ถ้าเป็นแพ็กเกจที่ใช้อยู่ปัจจุบัน
    if (currentTier === tierName) {
      if (isFree || credits > 0) {
        return (
          <button disabled className="mt-8 block w-full bg-slate-100 text-slate-500 py-3 px-2 sm:px-4 rounded-xl font-bold text-center cursor-not-allowed border border-slate-300 whitespace-nowrap text-sm sm:text-base">
            กำลังใช้งาน ({credits} เครดิต)
          </button>
        );
      } else {
        // เครดิตหมด ให้เติมเงินได้
        return (
          <button onClick={() => handleCheckout(link)} className={defaultClasses}>
            เติมโควต้าแพ็กเกจนี้
          </button>
        );
      }
    }

    // ถ้าเป็นแพ็กเกจฟรี แต่ใช้ Plus/Pro อยู่
    if (isFree) {
      return (
        <button disabled className="mt-8 block w-full bg-slate-100 text-slate-400 py-3 px-4 rounded-xl font-bold text-center cursor-not-allowed">
          แพ็กเกจเริ่มต้น
        </button>
      );
    }

    // ถ้ายูสเซอร์อยู่ระดับ Pro แต่ปุ่มนี้คือ Plus (ป้องกันการดาวน์เกรด)
    if (currentTier === 'pro' && tierName === 'plus') {
      return (
        <button disabled className="mt-8 block w-full bg-slate-100 text-slate-400 py-3 px-4 rounded-xl font-bold text-center cursor-not-allowed border border-slate-200">
          คุณอยู่ในระดับ Pro แล้ว
        </button>
      );
    }

    // กรณีปกติ (กดอัปเกรด ไปแพ็กอื่น)
    return (
      <button onClick={() => handleCheckout(link)} className={defaultClasses}>
        {normalText}
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <button 
        onClick={() => window.history.back()}
        className="flex items-center text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors mx-auto sm:mx-0"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        ย้อนกลับ
      </button>
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          เลือกแพ็กเกจที่เหมาะกับยอดขายของคุณ
        </h2>
        <p className="mt-4 text-xl text-slate-500">
          จ่ายครั้งเดียวรับโควต้าเต็มๆ ไม่มีตัดบัตรรายเดือน (รองรับสแกน QR Code)
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Tier 1: Free */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col">
          <h3 className="text-2xl font-semibold text-slate-900">Free</h3>
          <p className="mt-4 text-slate-500 flex-1">สายฟรีทดลองใช้งาน เหมาะสำหรับเริ่มต้น</p>
          <p className="mt-8">
            <span className="text-4xl font-extrabold text-slate-900">฿0</span>
          </p>
          <ul className="mt-6 space-y-4 flex-1">
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              <span className="text-slate-700">3 สคริปต์ (ฟรีเริ่มต้น)</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              <span className="text-slate-700">ใช้งานได้เฉพาะโหมด "ป้ายยาตรงๆ"</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-300 mr-3">✗</span>
              <span className="text-slate-400 line-through">ระบุกลุ่มเป้าหมาย</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-300 mr-3">✗</span>
              <span className="text-slate-400 line-through">แปะลิงก์สินค้า (AI ดูดข้อมูล)</span>
            </li>
          </ul>
          {renderButton('free', null, '', '')}
        </div>

        {/* Tier 2: Plus */}
        <div className="bg-blue-50 border-2 border-blue-500 rounded-2xl shadow-md p-8 flex flex-col relative transform lg:-translate-y-4">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="bg-blue-600 text-white text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full">
              ยอดนิยม
            </span>
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">Plus</h3>
          <p className="mt-4 text-slate-500 flex-1">สำหรับพ่อค้าแม่ค้าพาร์ทไทม์ ปลดล็อกฟีเจอร์คุ้มค่า</p>
          <p className="mt-8">
            <span className="text-4xl font-extrabold text-slate-900">฿99</span>
            <span className="text-base font-medium text-slate-500"> /ครั้ง</span>
          </p>
          <ul className="mt-6 space-y-4 flex-1">
            <li className="flex items-start">
              <span className="text-blue-500 mr-3">✓</span>
              <span className="text-slate-900 font-medium">ได้โควต้า 60 สคริปต์</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-3">✓</span>
              <span className="text-slate-700">ปลดล็อกครบ 3 โหมดการขาย</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-3">✓</span>
              <span className="text-slate-900 font-semibold">ระบุกลุ่มเป้าหมาย (เพศ/อายุ)</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-300 mr-3">✗</span>
              <span className="text-slate-400 line-through">แปะลิงก์สินค้า (AI ดูดข้อมูล)</span>
            </li>
          </ul>
          {renderButton(
            'plus', 
            PLUS_LINK, 
            "mt-8 block w-full bg-blue-600 text-white hover:bg-blue-700 py-3 px-4 rounded-xl font-bold text-center transition-all shadow-lg hover:shadow-blue-500/30",
            "อัปเกรดเป็น Plus"
          )}
        </div>

        {/* Tier 3: Pro */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-8 flex flex-col relative">
          <div className="absolute top-0 right-4 transform -translate-y-1/2">
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-2 rounded">
              ฟีเจอร์ครบสุด
            </span>
          </div>
          <h3 className="text-2xl font-semibold text-white">Pro</h3>
          <p className="mt-4 text-slate-400 flex-1">สายเอเจนซี่ อินฟลูเอนเซอร์มืออาชีพ จัดเต็มทุกฟีเจอร์</p>
          <p className="mt-8">
            <span className="text-4xl font-extrabold text-white">฿199</span>
            <span className="text-base font-medium text-slate-400"> /ครั้ง</span>
          </p>
          <ul className="mt-6 space-y-4 flex-1">
            <li className="flex items-start">
              <span className="text-amber-400 mr-3">✓</span>
              <span className="text-white font-medium">ได้โควต้า 150 สคริปต์</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-3">✓</span>
              <span className="text-slate-300">ปลดล็อกครบ 3 โหมดการขาย</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-3">✓</span>
              <span className="text-slate-300">ระบุกลุ่มเป้าหมาย (เพศ/อายุ)</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-3 shrink-0">🔥</span>
              <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded whitespace-nowrap text-sm sm:text-base">แปะลิงก์ (AI ดูดข้อมูล)</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-3">🧠</span>
              <span className="text-slate-300">ใช้สมองกล AI จิตวิทยาขั้นสูงสุด</span>
            </li>
          </ul>
          {renderButton(
            'pro', 
            PRO_LINK, 
            "mt-8 block w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 hover:from-amber-500 hover:to-orange-600 py-3 px-4 rounded-xl font-extrabold text-center transition-all shadow-lg hover:shadow-orange-500/20",
            "อัปเกรดเป็น Pro"
          )}
        </div>
      </div>
    </div>
  );
}

export default Pricing;
