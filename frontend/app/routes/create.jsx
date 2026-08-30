import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { scanForBannedWords, highlightBannedWords } from '../lib/bannedWords';
import { containsProfanity } from '../lib/profanityWords';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useScriptGeneration } from '../context/ScriptGenerationContext';

function CreateScript() {
  const { user, profile, loading } = useAuth();
  const { 
    isGenerating, 
    generatingMode, 
    generatedScript, 
    usedProBrain, 
    bannedWarnings, 
    generateScript 
  } = useScriptGeneration();
  
  const errorRef = useRef(null);
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [pricePromo, setPricePromo] = useState('');
  const [videoLength, setVideoLength] = useState('สั้น');
  const [speakerTone, setSpeakerTone] = useState('ผู้หญิง');
  const [mode, setMode] = useState('ขยี้ปัญหา (PAS Formula)');
  
  // Premium fields
  const [competitor, setCompetitor] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productUrls, setProductUrls] = useState(['']); // รองรับหลายลิงก์
  const [falseBelief, setFalseBelief] = useState('');
  const [mechanism, setMechanism] = useState('');
  
  const [formError, setFormError] = useState(null);
  const [activeTab, setActiveTab] = useState('funny');
  
  const navigate = useNavigate();

  const modes = [
    { 
      id: 'ขยี้ปัญหา (PAS Formula)', 
      name: 'ขยี้ปัญหา (สูตร PAS)', 
      description: 'เริ่มด้วยปัญหา จี้จุดเจ็บ แล้วจบด้วยสินค้า',
      icon: <div className="p-1.5 bg-rose-50 rounded-md text-rose-500 shadow-sm border border-rose-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
    },
    { 
      id: 'นักเล่าเรื่อง (Hook-Story-Offer)', 
      name: 'นักเล่าเรื่อง (สูตร HSO)', 
      description: 'เล่าประสบการณ์จริง สร้างความอิน เนียนป้ายยา',
      icon: <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-500 shadow-sm border border-indigo-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>
    },
    { 
      id: 'โชว์การเปลี่ยนแปลง (BAB Formula)', 
      name: 'โชว์การเปลี่ยนแปลง (สูตร BAB)', 
      description: 'เทียบอดีตที่ลำบาก กับปัจจุบันที่ชีวิตดีขึ้น',
      icon: <div className="p-1.5 bg-amber-50 rounded-md text-amber-500 shadow-sm border border-amber-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg></div>
    },
    { 
      id: 'สายสเปค/ฟังก์ชัน (FAB Formula)', 
      name: 'สายฟังก์ชัน (สูตร FAB)', 
      description: 'เปลี่ยนสเปคจุกจิก ให้เป็นประโยชน์ที่อยากได้',
      icon: <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-500 shadow-sm border border-emerald-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg></div>
    },
    { 
      id: 'เปรียบเทียบชัดๆ', 
      name: 'เปรียบเทียบชัดๆ', 
      description: 'โจมตีข้อเสียของแบรนด์ทั่วไป ชูจุดเด่นเรา',
      icon: <div className="p-1.5 bg-cyan-50 rounded-md text-cyan-600 shadow-sm border border-cyan-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg></div>
    },
    { 
      id: 'โครงสร้างเจาะลึก', 
      name: 'โครงสร้างเจาะลึก', 
      description: 'เจาะลึก เปลี่ยนความเชื่อผิดๆ ด้วยหลักจิตวิทยา',
      isProOnly: true,
      icon: <div className="p-1.5 bg-purple-50 rounded-md text-purple-600 shadow-sm border border-purple-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg></div>
    }
  ];

  const lengths = [
    { id: 'สั้น', time: '10-15 วิ', desc: '(สั้น/กระชับ)' },
    { id: 'กลาง', time: '30-45 วิ', desc: '(ปานกลาง)' },
    { id: 'ยาว', time: '60 วิ+', desc: '(ละเอียด)' }
  ];

  const tones = [
    { id: 'ผู้หญิง', label: 'ผู้หญิง', desc: '(ค่ะ, คะ, ฉัน)', icon: <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> },
    { id: 'ผู้ชาย', label: 'ผู้ชาย', desc: '(ครับ, ผม)', icon: <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> }
  ];

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  const effectiveTier = profile ? (profile.tier === 'free' && profile.trial_pro_remaining > 0 ? 'pro' : profile.tier) : 'free';

  const scrollToError = () => {
    setTimeout(() => {
      if (errorRef.current) {
        const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleGenerate = async (e, isMultiVersion = false) => {
    if (e) e.preventDefault();

    setFormError(null); // Clear form error before validation

    // Validate required fields
    if (!productName.trim()) {
      setFormError('กรุณากรอก "ชื่อสินค้า" ก่อนสร้างสคริปต์ครับ');
      scrollToError();
      return;
    }

    if (!productDetails.trim()) {
      setFormError('กรุณากรอก "รายละเอียดสินค้า" เพื่อให้ AI เขียนสคริปต์ได้ตรงใจครับ');
      scrollToError();
      return;
    }

    if (mode === 'โครงสร้างเจาะลึก') {
      if (!falseBelief.trim() || !mechanism.trim()) {
        setFormError('โหมดโครงสร้างเจาะลึก: กรุณากรอก "ความเชื่อผิดๆ" และ "กลไก/ความลับ" ให้ครบถ้วนครับ');
        scrollToError();
        return;
      }
    }

    // 0. Harsh Comparative Words Check (Competitor)
    if (mode === 'เปรียบเทียบชัดๆ' && competitor) {
      const harshWords = ["กาก", "ห่วย", "แย่", "ขยะ", "สวะ", "หลอกลวง", "หมา"];
      if (harshWords.some(w => competitor.includes(w))) {
        setFormError('ไม่อนุญาตให้ใช้คำพาดพิงคู่แข่งรุนแรง (เช่น กาก, ห่วย, แย่) โปรดใช้คำที่สุภาพขึ้น เช่น "แบรนด์ทั่วไป" หรือ "แบบเก่า" เพื่อความเป็นมืออาชีพ');
        scrollToError();
        return;
      }
    }

    // 0.5 Profanity Check (Strict Ban)
    const allInputs = `${productName} ${productDetails} ${competitor} ${targetAudience}`;
    if (containsProfanity(allInputs)) {
      setFormError('ไม่อนุญาตให้ใช้คำหยาบคาย! เว็บ Auto Script ห้ามใช้คำหยาบเด็ดขาด กรุณาแก้ไขข้อมูลของคุณ');
      scrollToError();
      return;
    }

    
    if (!user) {
      setFormError("Error: ไม่พบข้อมูล User (ยังไม่ได้ล็อกอิน)");
      return;
    }
    
    if (!profile) {
      setFormError("Error: ยังโหลดข้อมูลโควต้าไม่เสร็จ หรือโหลดไม่พบ");
      return;
    }
    
    // 1. เช็คโควต้าเครดิต
    const cost = isMultiVersion ? 2 : 1;
    if (profile.credits < cost) {
      alert(`โควต้าเครดิตของคุณไม่พอ (ต้องการ ${cost} เครดิต, มี ${profile.credits} เครดิต) กรุณาอัปเกรดแพ็กเกจ`);
      navigate('/pricing');
      return;
    }
    
    // 2. Setup payload and run generator
    const isProBrain = effectiveTier === 'pro' && mode === 'โครงสร้างเจาะลึก' && !isMultiVersion;
    const payload = {
      productName,
      productDetails,
      pricePromo,
      videoLength,
      speakerTone,
      mode,
      competitor: mode === 'เปรียบเทียบชัดๆ' ? competitor : '',
      falseBelief: mode === 'โครงสร้างเจาะลึก' ? falseBelief : '',
      mechanism: mode === 'โครงสร้างเจาะลึก' ? mechanism : '',
      targetAudience: effectiveTier !== 'free' ? targetAudience : '',
      isMultiVersion: isMultiVersion
    };

    // Note: error handling and progress are now fully managed by the global context.
    // So we just fire and forget here (or await it, doesn't matter).
    // The Floating Mini-Player handles the UI feedback.
    generateScript(payload, isMultiVersion, isProBrain);
  };

  const copyToClipboard = () => {
    if (!generatedScript) return;
    const textToCopy = (generatedScript.isMulti ? generatedScript[activeTab]?.script_blocks : generatedScript.script_blocks)
      ?.map(block => block.audio_spoken)
      ?.join('\n\n');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      alert('คัดลอกสคริปต์เรียบร้อยแล้ว!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3 sm:flex-nowrap">
            <h1 className="text-[1.35rem] sm:text-3xl font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">สร้างสคริปต์รีวิวด้วย AI</h1>
            {profile && (
              <div className={`flex items-center space-x-1.5 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide rounded-full border shadow-sm whitespace-nowrap shrink-0 ${
                profile.tier === 'pro' 
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-700' :
                profile.tier === 'plus' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' :
                'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                {profile.tier === 'pro' ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span>Pro Plan</span>
                  </>
                ) : profile.tier === 'plus' ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <span>Plus Plan</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    <span>Free Plan</span>
                  </>
                )}
              </div>
            )}
            
            {profile && profile.tier === 'free' && profile.trial_pro_remaining > 0 && (
              <div className="flex items-center space-x-1.5 px-3 py-1 text-[10px] sm:text-xs font-bold tracking-wide rounded-full border shadow-sm whitespace-nowrap shrink-0 bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-200 text-purple-700 animate-pulse">
                <span>🎁 ทดลองใช้ Pro ฟรี (เหลือ {Math.min(profile.credits, profile.trial_pro_remaining)} ครั้ง)</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
            <div className="inline-flex items-center bg-white border border-slate-200 text-slate-600 px-3.5 py-1.5 rounded-lg text-sm shadow-sm">
              <span className="mr-2">โควต้าการสร้าง</span>
              <span className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-2 py-0.5 rounded text-xs shadow-inner">
                {profile ? profile.credits : '...'} สคริปต์
              </span>
            </div>

            {/* ─── AI Brain Indicator ─────────────────────────────────── */}
            {profile && (
              effectiveTier === 'pro' ? (
                /* Pro: Pro Deep Brain™ Premium Badge */
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-50 to-purple-50 border border-amber-300/60 shadow-sm text-amber-800 whitespace-nowrap">
                  {/* Sparkles icon (Heroicons) */}
                  <svg className="w-4 h-4 text-purple-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z" clipRule="evenodd" />
                  </svg>
                  <span>AI Engine: <strong className="text-purple-700">Pro Deep Brain™</strong></span>
                  <span className="text-[10px] font-normal text-amber-600 hidden sm:inline">วิเคราะห์จิตวิทยาเชิงลึก</span>
                </div>
              ) : (
                /* Free/Plus: Standard Fast Engine + Upgrade CTA */
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm bg-slate-50 border border-slate-200 text-slate-500 whitespace-nowrap">
                  {/* Bolt icon (Heroicons) */}
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>AI Engine: Standard Fast Engine</span>
                  <a href="/pricing" className="ml-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 transition-colors hidden sm:inline underline underline-offset-2">
                    อัปเกรด Pro Brain →
                  </a>
                </div>
              )
            )}
            {/* ────────────────────────────────────────────────────────── */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ฝั่งซ้าย: ฟอร์ม */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <form onSubmit={handleGenerate} className="space-y-6">
            {formError && (
              <div ref={errorRef} className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {formError}
              </div>
            )}
            
            {effectiveTier === 'pro' && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg mb-6">
                <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="mr-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className="hidden"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21h18M4 18l3-12 5 7 5-7 3 12H4z"></path></svg></span> ข้อมูลเบื้องต้น
                  </div>
                </label>
                <p className="text-xs text-amber-700">สามารถใส่รายละเอียดสินค้าในช่องด้านล่าง เพื่อให้ AI วิเคราะห์ข้อมูลเชิงลึกได้แม่นยำยิ่งขึ้น</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อสินค้า</label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="เช่น เซรั่มหน้าใส แบรนด์ XYZ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">รายละเอียดสินค้า (จุดขายที่อยากให้เน้นเป็นพิเศษ)</label>
              <textarea
                required
                rows="3"
                value={productDetails}
                onChange={(e) => setProductDetails(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="เช่น คุมมัน 12 ชั่วโมง, ซึมไวใน 3 วิ"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ราคา/โปรโมชั่น</label>
              <input
                type="text"
                value={pricePromo}
                onChange={(e) => setPricePromo(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="เช่น ลดเหลือ 99.- 1แถม1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">ความยาวคลิป (Video Length)</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
                {lengths.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setVideoLength(l.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                      videoLength === l.id 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    <span className="block whitespace-nowrap">{l.time}</span>
                    <span className={`text-[10px] sm:text-xs mt-0.5 whitespace-nowrap ${videoLength === l.id ? 'text-blue-400' : 'text-slate-400'}`}>
                      {l.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">โทนผู้พูด (Speaker Tone)</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                {tones.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSpeakerTone(t.id)}
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                      speakerTone === t.id 
                        ? (t.id === 'ผู้หญิง' ? 'bg-pink-50 text-pink-600 shadow-sm ring-1 ring-pink-200 scale-[1.02]' : 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200 scale-[1.02]')
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {t.icon}
                      <span className="block whitespace-nowrap">{t.label}</span>
                    </div>
                    <span className={`text-[10px] sm:text-xs mt-0.5 whitespace-nowrap ${speakerTone === t.id ? (t.id === 'ผู้หญิง' ? 'text-pink-400' : 'text-blue-400') : 'text-slate-400'}`}>
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {effectiveTier !== 'free' && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center">
                  <span className="mr-2">🎯</span> กลุ่มเป้าหมาย (Plus/Pro Feature)
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="เช่น พนักงานออฟฟิศปวดหลัง, แม่ลูกอ่อน"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">สไตล์การนำเสนอ (Mode)</label>
              <div className="space-y-3">
                {modes.map((m) => {
                  const isDisabled = m.isProOnly && effectiveTier !== 'pro';
                  return (
                  <label 
                    key={m.id} 
                    className={`flex items-start p-3 border rounded-lg transition-all ${
                      isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'
                    } ${
                      mode === m.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={m.id}
                      checked={mode === m.id}
                      disabled={isDisabled}
                      onChange={(e) => setMode(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 disabled:bg-slate-200"
                    />
                    <div className="ml-3 flex items-start gap-3 w-full">
                      <div className="mt-0.5 shrink-0">
                        {m.icon}
                      </div>
                      <div className="w-full">
                        <span className="block text-sm font-bold text-slate-900 flex justify-between items-center">
                          {m.name}
                          {m.isProOnly && <span className="text-[10px] bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">PRO</span>}
                        </span>
                        <span className="block text-sm text-slate-500 mt-0.5 leading-snug">{m.description}</span>
                      </div>
                    </div>
                  </label>
                  );
                })}
              </div>
            </div>

            {/* ช่องกรอกคู่แข่ง จะโผล่มาเมื่อเลือกโหมดเปรียบเทียบ */}
            {mode === 'เปรียบเทียบชัดๆ' && (
              <div className="animate-fade-in-up">
                <label className="block text-sm font-medium text-slate-700 mb-1">คู่แข่ง / สินค้าที่นำมาเปรียบเทียบ</label>
                <p className="text-[11px] sm:text-xs text-amber-600 mb-2 font-medium">
                  * กรุณาหลีกเลี่ยงการใช้คำพาดพิงรุนแรง (เช่น กาก, ห่วย, แย่) ระบบมีการตรวจจับคำหยาบเช่นเดียวกับช่องข้อมูลสินค้า
                </p>
                <input
                  type="text"
                  required
                  value={competitor}
                  onChange={(e) => setCompetitor(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="เช่น เซรั่มทั่วไปตามท้องตลาด"
                />
              </div>
            )}

            {/* ช่องกรอกพิเศษ สำหรับโหมดโครงสร้างเจาะลึก */}
            {mode === 'โครงสร้างเจาะลึก' && (
              <div className="animate-fade-in-up p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg></span>
                  <label className="block text-sm font-bold text-purple-900">ข้อมูลเจาะลึก (โหมดเปลี่ยนความเชื่อ)</label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">1. ความเชื่อผิดๆ ของลูกค้า (False Belief)</label>
                  <p className="text-[11px] sm:text-xs text-slate-500 mb-2">สิ่งที่ลูกค้ามักจะเข้าใจผิด และเป็นข้ออ้างที่ไม่ยอมซื้อสินค้าของเรา</p>
                  <textarea
                    required
                    rows="2"
                    value={falseBelief}
                    onChange={(e) => setFalseBelief(e.target.value)}
                    className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm"
                    placeholder="เช่น คิดว่าลดน้ำหนักต้องอดข้าวเย็น, คิดว่าสิวอุดตันต้องบีบออก"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">2. กลไก/ความลับที่ลบล้างความเชื่อนั้น (Mechanism)</label>
                  <p className="text-[11px] sm:text-xs text-slate-500 mb-2">จุดแข็ง นวัตกรรม หรือหลักการทำงานของสินค้า ที่พิสูจน์ว่าความเชื่อเดิมนั้นผิด</p>
                  <textarea
                    required
                    rows="2"
                    value={mechanism}
                    onChange={(e) => setMechanism(e.target.value)}
                    className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm"
                    placeholder="เช่น ใช้สารสกัด X ที่ดูดซึมตอนหลับ, หรือมีนวัตกรรมดันหัวสิวให้แห้งเอง"
                  ></textarea>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                onClick={(e) => handleGenerate(e, false)}
                disabled={isGenerating || !user || !profile}
                className={`w-full py-3 rounded-lg text-white font-medium transition-all flex flex-col items-center justify-center gap-1 leading-tight ${
                  isGenerating 
                    ? 'bg-blue-400 cursor-wait' 
                    : (!user || !profile)
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {generatingMode === 'single' ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> 
                    <span>AI กำลังร่างสคริปต์...</span>
                  </div>
                ) : (!profile ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                    <span>กำลังโหลดข้อมูลบัญชี...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> 
                    <span>สร้างสคริปต์ปกติ (หัก 1 เครดิต)</span>
                  </div>
                ))}
              </button>

              {effectiveTier === 'pro' && (
                <button
                  type="button"
                  onClick={(e) => handleGenerate(e, true)}
                  disabled={isGenerating || !user || !profile}
                  className={`w-full py-2.5 rounded-lg text-white font-bold transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm border leading-tight ${
                    isGenerating 
                      ? 'bg-amber-400 cursor-wait border-transparent' 
                      : (!user || !profile)
                        ? 'bg-slate-400 cursor-not-allowed border-transparent'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-amber-600/20'
                  }`}
                >
                  {generatingMode === 'multi' ? (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> 
                      <span>AI กำลังร่างสคริปต์ 3 สไตล์...</span>
                    </div>
                  ) : (!profile ? (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                      <span>กำลังโหลดข้อมูลบัญชี...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-1.5 text-[15px]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-200">
                          <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
                        </svg>
                        <span>สร้างทีเดียว 3 สไตล์</span>
                      </div>
                      <span className="text-[11px] font-normal opacity-90">(Pro • หัก 2 เครดิต)</span>
                    </>
                  ))}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ฝั่งขวา: ผลลัพธ์ (Premium Teleprompter Cards) */}
        <div className="flex flex-col h-full">
          {!generatedScript && !isGenerating ? (
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-blue-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">พร้อมสร้างสคริปต์ไวรัล</h3>
              <p className="text-slate-500 max-w-sm">กรอกข้อมูลด้านซ้ายแล้วกดสร้างสคริปต์ AI จะเขียนสคริปต์ป้ายยาให้คุณภายใน 5 วินาที</p>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col p-6 md:p-12 min-h-[400px] shadow-sm justify-center">
              {/* Progress Bar & Percent */}
              <div className="mb-8 w-full max-w-sm mx-auto">
                <div className="flex justify-between items-end mb-2">
                  {/* Dynamic label: Pro Brain mode gets special text */}
                  {effectiveTier === 'pro' && mode === 'โครงสร้างเจาะลึก' ? (
                    <span className="text-sm font-bold text-purple-700 bg-gradient-to-r from-amber-50 to-purple-50 px-3 py-1 rounded-full border border-purple-200/60 flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0V7m0 0h2M3 9v6m0 0v2a2 2 0 002 2h2m-4-4h2m14-2v6m0-6h2m-2 6v2a2 2 0 01-2 2h-2m0 0H9m6 0v-2M9 21H7a2 2 0 01-2-2v-2m0 0H3m4 0h2M9 9h6v6H9V9z" /></svg>
                      Pro Brain กำลังวิเคราะห์พฤติกรรมลูกค้า...
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100/50 flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      AI กำลังคิดสคริปต์
                    </span>
                  )}
                  <span className="text-2xl font-black text-slate-800 tracking-tight">
                    {generationProgress}%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ease-out relative ${
                      effectiveTier === 'pro' && mode === 'โครงสร้างเจาะลึก'
                        ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600' // Pro Brain: ทอง→ม่วง
                        : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'  // Standard: น้ำเงิน
                    }`}
                    style={{ width: `${generationProgress}%` }}
                  >
                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)' }}></div>
                  </div>
                </div>
              </div>

              {/* Timeline Steps (Mobile Optimized Vertical) */}
              <div className="w-full max-w-sm mx-auto pl-2">
                <div className="relative border-l-2 border-slate-100 ml-4 space-y-7 pb-2">
                  
                  {/* Step 1 */}
                  <div className="relative pl-8">
                    <div className={`absolute -left-[17px] top-0.5 flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white shadow-sm transition-colors duration-300 ${generationProgress >= 0 ? (generationProgress < 25 ? 'bg-blue-500 text-white animate-bounce' : 'bg-emerald-500 text-white') : 'bg-slate-200 text-slate-400'}`}>
                      {generationProgress >= 25 ? (
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      ) : (
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      )}
                    </div>
                    <div>
                       <p className={`text-sm font-bold ${generationProgress >= 0 ? 'text-slate-800' : 'text-slate-400'}`}>วิเคราะห์ข้อมูลสินค้า</p>
                       <p className="text-xs text-slate-500">กำลังสกัดจุดเด่นและกลุ่มเป้าหมาย...</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative pl-8">
                    <div className={`absolute -left-[17px] top-0.5 flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white shadow-sm transition-colors duration-300 ${generationProgress >= 25 ? (generationProgress < 60 ? 'bg-amber-500 text-white animate-bounce' : 'bg-emerald-500 text-white') : 'bg-slate-200 text-slate-400'}`}>
                      {generationProgress >= 60 ? (
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      ) : (
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                      )}
                    </div>
                    <div>
                       <p className={`text-sm font-bold ${generationProgress >= 25 ? 'text-slate-800' : 'text-slate-400'}`}>วางโครงสร้างจิตวิทยา</p>
                       <p className="text-xs text-slate-500">เรียบเรียงสูตร {mode.split(' ')[0]}...</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative pl-8">
                    <div className={`absolute -left-[17px] top-0.5 flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white shadow-sm transition-colors duration-300 ${generationProgress >= 60 ? (generationProgress < 85 ? 'bg-purple-500 text-white animate-bounce' : 'bg-emerald-500 text-white') : 'bg-slate-200 text-slate-400'}`}>
                      {generationProgress >= 85 ? (
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      ) : (
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                      )}
                    </div>
                    <div>
                       <p className={`text-sm font-bold ${generationProgress >= 60 ? 'text-slate-800' : 'text-slate-400'}`}>สวมวิญญาณนักขาย</p>
                       <p className="text-xs text-slate-500">ปรับโทนเสียงเป็น{speakerTone}แบบธรรมชาติ...</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative pl-8">
                    <div className={`absolute -left-[17px] top-0.5 flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white shadow-sm transition-colors duration-300 ${generationProgress >= 85 ? (generationProgress >= 100 ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white animate-bounce') : 'bg-slate-200 text-slate-400'}`}>
                      {generationProgress >= 100 ? (
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      ) : (
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                      )}
                    </div>
                    <div>
                       <p className={`text-sm font-bold ${generationProgress >= 85 ? 'text-slate-800' : 'text-slate-400'}`}>ตรวจสอบความเรียบร้อย</p>
                       <p className="text-xs text-slate-500">สแกนคำต้องห้าม & จัดรูปแบบ...</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm h-full">
              {/* Header */}
              <div className="bg-white border-b border-slate-200 flex flex-col sticky top-0 z-10">
                <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></span> สคริปต์พร้อมถ่าย
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      ความยาวประมาณ: {generatedScript.isMulti ? generatedScript[activeTab]?.metadata?.estimated_duration_seconds : generatedScript.metadata?.estimated_duration_seconds} วินาที
                    </p>

                    {/* ─── Result Badge: Pro Deep Brain™ (เฉพาะ Belief-Shifting mode) ─── */}
                    {usedProBrain && (
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-amber-50 to-purple-50 border border-amber-300/50 text-purple-700 shadow-sm">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {/* Sparkles icon (Heroicons) */}
                          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z" clipRule="evenodd" />
                          </svg>
                          <span>Generated by Pro Deep Brain™</span>
                        </div>
                        <span className="font-normal text-purple-500 hidden sm:inline">·</span>
                        <span className="font-normal text-purple-500">เจาะลึกจิตวิทยา + ภาษาพูดระดับสูง</span>
                      </div>
                    )}
                    {/* ──────────────────────────────────────────────────────────── */}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg> <span className="whitespace-nowrap">คัดลอกทั้งหมด</span>
                  </button>
                </div>
                
                {/* Tabs for Multi-Version */}
                {generatedScript.isMulti && (
                  <div className="flex px-2 pb-2 gap-2 bg-slate-50">
                    <button 
                      onClick={() => setActiveTab('funny')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'funny' ? 'bg-amber-100 text-amber-800 border-b-2 border-amber-500' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-500">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866ZM7.65 15.385a.75.75 0 0 1 1.06-.062 3.736 3.736 0 0 0 2.665 1.099h1.25a3.736 3.736 0 0 0 2.665-1.099.75.75 0 1 1 1.06 1.06 5.236 5.236 0 0 1-3.725 1.539h-1.25a5.236 5.236 0 0 1-3.725-1.539.75.75 0 0 1-.061-1.06Z" clipRule="evenodd" />
                      </svg>
                      <span>สายฮา/กวนๆ</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('review')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'review' ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                      <span>รีวิวจริงใจ</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('fomo')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'fomo' ? 'bg-rose-100 text-rose-800 border-b-2 border-rose-500' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-500">
                        <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clipRule="evenodd" />
                      </svg>
                      <span>เร่งด่วน (FOMO)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Banned Words Warning */}
              {bannedWarnings && bannedWarnings.length > 0 && (
                <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <h4 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> <span>ระวังคำสุ่มเสี่ยงโดนแบน (ปรับแก้ก่อนถ่าย)</span>
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {bannedWarnings.map((w, idx) => (
                      <li key={idx}><strong>{w.word}</strong>: {w.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Script Cards (Teleprompter) */}
              <div className="p-4 space-y-4 overflow-y-auto flex-1 max-h-[700px]">
                {(generatedScript.isMulti ? generatedScript[activeTab]?.script_blocks : generatedScript.script_blocks)?.map((block, index) => {
                  let phaseIcon = <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>;
                  let phaseColor = "bg-slate-100 text-slate-600";
                  if (block.phase === "Hook") { phaseIcon = <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>; phaseColor = "bg-rose-100 text-rose-700"; }
                  if (block.phase === "Agitation") { phaseIcon = <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"></path></svg>; phaseColor = "bg-orange-100 text-orange-700"; }
                  if (block.phase === "Reveal") { phaseIcon = <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>; phaseColor = "bg-blue-100 text-blue-700"; }
                  if (block.phase === "FOMO") { phaseIcon = <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>; phaseColor = "bg-amber-100 text-amber-700"; }
                  if (block.phase === "CTA") { phaseIcon = <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>; phaseColor = "bg-emerald-100 text-emerald-700"; }

                  return (
                    <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative group transition-all hover:shadow-md">
                      <div className="absolute -left-3 top-5 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                        {index + 1}
                      </div>
                      
                      <div className="flex justify-between items-start mb-3 ml-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${phaseColor}`}>
                            {phaseIcon} {block.phase}
                          </span>
                          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> {block.timestamp}
                          </span>
                        </div>
                      </div>

                      <div className="ml-2">
                        <p 
                          className="text-xl font-medium text-slate-800 leading-relaxed mb-4"
                          dangerouslySetInnerHTML={{ __html: `"${highlightBannedWords(block.audio_spoken, bannedWarnings)}"` }}
                        />
                        
                        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-50">
                          <div className="flex-1 bg-blue-50/50 rounded-xl p-3 flex items-start gap-2 border border-blue-100/50">
                            <span className="text-blue-500 shrink-0 mt-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></span>
                            <div className="text-xs text-slate-600">
                              <strong className="block text-slate-700 mb-0.5">ภาพ/การกระทำ:</strong>
                              {block.visual_direction}
                            </div>
                          </div>
                          
                          <div className="flex-1 bg-purple-50/50 rounded-xl p-3 flex items-start gap-2 border border-purple-100/50">
                            <span className="text-sm shrink-0">🎭</span>
                            <div className="text-xs text-slate-600">
                              <strong className="block text-slate-700 mb-0.5">อารมณ์:</strong>
                              {block.subtext_emotion}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

export default CreateScript;
