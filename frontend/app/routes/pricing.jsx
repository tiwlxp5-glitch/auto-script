import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

function Pricing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // ลิงก์จาก Stripe ที่ลูกค้าให้มา (แบบ One-Time Payment)
  const PLUS_LINK = "https://buy.stripe.com/9B6fZi0454Tg7ZSf5Nbwk00";
  const PRO_LINK = "https://buy.stripe.com/3cIbJ2045adAgwoe1Jbwk01";

  const handleCheckout = (baseLink) => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนชำระเงินครับ!', {
        icon: <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
      });
      setIsRedirecting(false);
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
        <button onClick={() => handleCheckout(link)} disabled={isRedirecting} className={defaultClasses}>
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
          <button onClick={() => handleCheckout(link)} disabled={isRedirecting} className={defaultClasses}>
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
      <button onClick={() => handleCheckout(link)} disabled={isRedirecting} className={defaultClasses}>
        {normalText}
      </button>
    );
  };

  return (
    <>
      <title>แพ็กเกจราคา | Auto Script</title>
      <meta name="description" content="เลือกแพ็กเกจ Auto Script ที่เหมาะกับคุณ จ่ายครั้งเดียวรับโควต้าเต็มๆ คุ้มค่าที่สุดสำหรับการทำคลิปขายของ" />
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
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="text-xl text-slate-500">
            จ่ายครั้งเดียวรับโควต้าเต็มๆ
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-base font-semibold shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
            </svg>
            รองรับสแกน QR Code
          </div>
        </div>
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
            {/* Standard Speed Engine label — สร้าง Tier Differentiation */}
            <li className="flex items-start gap-2">
              {/* Bolt icon (Heroicons) */}
              <svg className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-400 text-sm">ขับเคลื่อนด้วย Standard Speed Engine</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-300 mr-3">✗</span>
              <span className="text-slate-400 line-through">ระบุกลุ่มเป้าหมาย</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-300 mr-3">✗</span>
              <span className="text-slate-400 line-through">สร้างทีเดียว 3 สไตล์ (Multi-Version)</span>
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
          <div className="mt-8 flex flex-col">
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold text-slate-400 line-through decoration-red-500/50">฿490</span>
              <span className="text-4xl font-extrabold text-slate-900">฿249</span>
            </div>
            <span className="text-sm font-medium text-blue-600 mt-2 bg-blue-50 w-fit px-2 py-1 rounded">เฉลี่ยเพียง 4.1 บาท/สคริปต์</span>
          </div>
          <ul className="mt-6 space-y-4 flex-1">
            <li className="flex items-start">
              <span className="text-blue-500 mr-3">✓</span>
              <span className="text-slate-900 font-medium">ได้โควต้า 60 สคริปต์</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-3">✓</span>
              <span className="text-slate-700">ปลดล็อกครบ 5 โหมดจิตวิทยา</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-3">✓</span>
              <span className="text-slate-900 font-semibold">ระบุกลุ่มเป้าหมาย (เพศ/อายุ)</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-300 mr-3">✗</span>
              <span className="text-slate-400 line-through">สร้างทีเดียว 3 สไตล์ (Multi-Version)</span>
            </li>
            {/* Standard Speed Engine label — สร้าง Tier Differentiation */}
            <li className="flex items-start gap-2 mt-1">
              <svg className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-500 text-sm">ขับเคลื่อนด้วย Standard Speed Engine</span>
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
          <div className="mt-8 flex flex-col">
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold text-slate-500 line-through decoration-red-500/80">฿990</span>
              <span className="text-4xl font-extrabold text-white">฿590</span>
            </div>
            <span className="text-sm font-medium text-amber-400 mt-2 bg-amber-400/10 w-fit px-2 py-1 rounded border border-amber-400/20">เฉลี่ยเพียง 3.9 บาท/สคริปต์ (คุ้มสุด)</span>
          </div>
          <ul className="mt-6 space-y-4 flex-1">
            {/* Pro Deep Brain™ — Feature ที่ 1 (จุดขายหลัก) */}
            <li className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl border border-amber-500/30 -mx-1">
              {/* CpuChip icon (Heroicons) */}
              <svg className="w-5 h-5 text-amber-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0V7m0 0h2M3 9v6m0 0v2a2 2 0 002 2h2m-4-4h2m14-2v6m0-6h2m-2 6v2a2 2 0 01-2 2h-2m0 0H9m6 0v-2M9 21H7a2 2 0 01-2-2v-2m0 0H3m4 0h2M9 9h6v6H9V9z" />
              </svg>
              <div>
                <span className="text-amber-200 font-bold text-sm">Pro Deep Brain™</span>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">AI คิดเชิงลึก ฉลาดขึ้น เข้าใจสำนวนไทย · วิเคราะห์จิตวิทยาการซื้อแบบเจาะลึก</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-3">✓</span>
              <span className="text-white font-medium">ได้โควต้า 150 สคริปต์</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-3">✓</span>
              <span className="text-slate-300">ปลดล็อกครบ 5 โหมดจิตวิทยา</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-3">✓</span>
              <span className="text-slate-300">ระบุกลุ่มเป้าหมาย (เพศ/อายุ)</span>
            </li>
            <li className="flex items-center">
              <span className="text-amber-400 mr-3 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" /></svg></span>
              <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded whitespace-nowrap text-sm sm:text-base">สร้างทีเดียว 3 สไตล์ (Multi-Version)</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-3 shrink-0 mt-0.5"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></span>
              <div className="flex flex-col">
                <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded w-fit text-sm sm:text-base">โหมด Belief-Shifting</span>
                <span className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                  วิเคราะห์ความเชื่อผิดๆ ของลูกค้า (False Belief) และหักล้างด้วยจุดแข็งของสินค้าอย่างมีชั้นเชิง (Epiphany Bridge)
                </span>
              </div>
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
    </>
  );
}

export default Pricing;
