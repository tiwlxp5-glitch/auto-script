import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { scanForBannedWords, highlightBannedWords } from '../lib/bannedWords';
import { containsProfanity } from '../lib/profanityWords';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function CreateScript() {
  const { user, profile, setProfile, loading } = useAuth();
  const analyzeAbortRef = useRef(null);
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [pricePromo, setPricePromo] = useState('');
  const [videoLength, setVideoLength] = useState('สั้น');
  const [mode, setMode] = useState('ป้ายยาตรงๆ');
  
  // Premium fields
  const [competitor, setCompetitor] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productUrls, setProductUrls] = useState(['']); // รองรับหลายลิงก์
  
  // Streaming Terminal States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [terminalText, setTerminalText] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  
  const [generatedScript, setGeneratedScript] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMode, setGeneratingMode] = useState(null);
  const [bannedWarnings, setBannedWarnings] = useState([]);
  const [error, setError] = useState(null);
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
    }
  ];

  const lengths = [
    { id: 'สั้น', time: '10-15 วิ', desc: '(สั้น/กระชับ)' },
    { id: 'กลาง', time: '30-45 วิ', desc: '(ปานกลาง)' },
    { id: 'ยาว', time: '60 วิ+', desc: '(ละเอียด)' }
  ];

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    return () => {
      if (analyzeAbortRef.current) {
        analyzeAbortRef.current.abort();
      }
    };
  }, []);

  const effectiveTier = profile ? (profile.tier === 'free' && profile.trial_pro_remaining > 0 ? 'pro' : profile.tier) : 'free';


  const handleGenerate = async (e, isMultiVersion = false) => {
    if (e) e.preventDefault();

    // 0. Profanity Check (Strict Ban)
    const allInputs = `${productName} ${productDetails} ${competitor} ${targetAudience}`;
    if (containsProfanity(allInputs)) {
      setError('ไม่อนุญาตให้ใช้คำหยาบคาย! เว็บ Auto Script ห้ามใช้คำหยาบเด็ดขาด กรุณาแก้ไขข้อมูลของคุณ');
      return;
    }

    
    if (!user) {
      alert("Error: ไม่พบข้อมูล User (ยังไม่ได้ล็อกอิน)");
      return;
    }
    
    if (!profile) {
      alert("Error: ยังโหลดข้อมูลโควต้าไม่เสร็จ หรือโหลดไม่พบ");
      return;
    }
    
    // 1. เช็คโควต้าเครดิต
    const cost = isMultiVersion ? 2 : 1;
    if (profile.credits < cost) {
      alert(`โควต้าเครดิตของคุณไม่พอ (ต้องการ ${cost} เครดิต, มี ${profile.credits} เครดิต) กรุณาอัปเกรดแพ็กเกจ`);
      navigate('/pricing');
      return;
    }
    
    setIsGenerating(true);
    setGeneratingMode(isMultiVersion ? 'multi' : 'single');
    setError(null);
    setGeneratedScript(null);
    setBannedWarnings([]);

    // FIX FE-02: AbortController + 60s timeout
    // Analogy: Like setting a 60-second kitchen timer when making a call.
    // If the line is silent for too long (mobile tunnel / Wi-Fi drop),
    // we hang up gracefully instead of holding the phone forever.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // ดึง JWT Token ปัจจุบันของผู้ใช้เพื่อส่งไปยืนยันตัวตนที่ Backend
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        clearTimeout(timeoutId);
        throw new Error('กรุณาล็อกอินใหม่');
      }
      
      const payload = {
        productName,
        productDetails,
        pricePromo,
        videoLength,
        mode,
        competitor: mode === 'เปรียบเทียบชัดๆ' ? competitor : '',
        targetAudience: effectiveTier !== 'free' ? targetAudience : '',
        isMultiVersion: isMultiVersion
      };

      // ยิงข้อมูลไปให้ Backend พร้อม signal สำหรับ abort
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to generate script");
      }


      let finalScriptData = responseData.script;
      const newCredits = responseData.credits_remaining;
      
      let allText = '';
      
      if (finalScriptData.raw_multi_version) {
        // Parse the 3 XML tags
        const raw = finalScriptData.raw_multi_version;
        const funnyMatch = raw.match(/<VERSION_FUNNY>([\s\S]*?)<\/VERSION_FUNNY>/);
        const reviewMatch = raw.match(/<VERSION_REVIEW>([\s\S]*?)<\/VERSION_REVIEW>/);
        const fomoMatch = raw.match(/<VERSION_FOMO>([\s\S]*?)<\/VERSION_FOMO>/);
        
        const safeParse = (str) => {
          try { return JSON.parse(str.replace(/```json/g, '').replace(/```/g, '').trim()); } 
          catch(e) { return null; }
        };

        finalScriptData = {
          isMulti: true,
          funny: funnyMatch ? safeParse(funnyMatch[1]) : null,
          review: reviewMatch ? safeParse(reviewMatch[1]) : null,
          fomo: fomoMatch ? safeParse(fomoMatch[1]) : null
        };
        
        // Combine text for banned word scan
        const getBlocks = (scriptObj) => scriptObj?.script_blocks?.map(b => b.audio_spoken).join(' ') || '';
        allText = getBlocks(finalScriptData.funny) + ' ' + getBlocks(finalScriptData.review) + ' ' + getBlocks(finalScriptData.fomo);
        
      } else {
        allText = finalScriptData.script_blocks?.map(b => b.audio_spoken).join(' ') || '';
      }

      // สแกนหาคำต้องห้ามในบทพูดทั้งหมด
      const warnings = scanForBannedWords(allText);
      
      // ลบ warnings ที่ซ้ำซาก
      const uniqueWarnings = Array.from(new Set(warnings.map(a => a.word)))
        .map(word => warnings.find(a => a.word === word));
        
      setBannedWarnings(uniqueWarnings);
      setGeneratedScript(finalScriptData);
      
      // อัปเดตเครดิตในหน้าเว็บให้ตรงกับที่ Backend หักไป
      setProfile(prev => prev ? { 
        ...prev, 
        credits: newCredits,
        ...(responseData.trial_pro_remaining !== undefined && { trial_pro_remaining: responseData.trial_pro_remaining })
      } : prev);
      window.dispatchEvent(new Event('profileUpdated'));

    } catch (err) {
      console.error(err);
      // FIX FE-02: Show specific message for network timeout/drop
      if (err.name === 'AbortError') {
        setError('การเชื่อมต่อใช้เวลานานเกินไป (60 วินาที) กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ครับ');
      } else {
        setError(err.message || "เกิดข้อผิดพลาดในการสร้างสคริปต์ กรุณาลองใหม่อีกครั้งครับ");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
      setGeneratingMode(null);
    }
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
                <span>🎁 ทดลองใช้ Pro ฟรี (เหลือ {profile.trial_pro_remaining} ครั้ง)</span>
              </div>
            )}
          </div>
          <div className="inline-flex items-center bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
            เหลือโควต้าการสร้าง <strong className="mx-1.5 text-blue-900 font-black">{profile ? profile.credits : '...'}</strong> สคริปต์
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ฝั่งซ้าย: ฟอร์ม */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <form onSubmit={handleGenerate} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
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
                {modes.map((m) => (
                  <label 
                    key={m.id} 
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                      mode === m.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={m.id}
                      checked={mode === m.id}
                      onChange={(e) => setMode(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex items-start gap-3 w-full">
                      <div className="mt-0.5 shrink-0">
                        {m.icon}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-900">{m.name}</span>
                        <span className="block text-sm text-slate-500 mt-0.5 leading-snug">{m.description}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ช่องกรอกคู่แข่ง จะโผล่มาเมื่อเลือกโหมดเปรียบเทียบ */}
            {mode === 'เปรียบเทียบชัดๆ' && (
              <div className="animate-fade-in-up">
                <label className="block text-sm font-medium text-slate-700 mb-2">คู่แข่ง / สินค้าที่นำมาเปรียบเทียบ</label>
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
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 min-h-[400px] shadow-sm">
              <div className="mb-4 text-blue-600 flex justify-center">
                <svg className="w-12 h-12 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>
              </div>
              <p className="text-lg font-medium text-slate-700 animate-pulse">กำลังสวมวิญญาณแม่ค้าตัวท็อป...</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm h-full">
              {/* Header */}
              <div className="bg-white border-b border-slate-200 flex flex-col sticky top-0 z-10">
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></span> สคริปต์พร้อมถ่าย
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      ความยาวประมาณ: {generatedScript.isMulti ? generatedScript[activeTab]?.metadata?.estimated_duration_seconds : generatedScript.metadata?.estimated_duration_seconds} วินาที
                    </p>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg> <span>คัดลอกทั้งหมด</span>
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
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866Zm-4.34 7.964a.75.75 0 0 1-1.061-1.06 5.236 5.236 0 0 1 3.73-1.538 5.236 5.236 0 0 1 3.695 1.538.75.75 0 1 1-1.061 1.06 3.736 3.736 0 0 0-2.639-1.098 3.736 3.736 0 0 0-2.664 1.098Z" clipRule="evenodd" />
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

      {/* Modern AI Analysis Loading Modal */}
      {showTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center animate-pulse">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 className="font-bold text-amber-900">AI กำลังวิเคราะห์ข้อมูลสินค้า</h3>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {isAnalyzing ? (
                      <svg className="animate-spin h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : terminalText.includes('Error') ? (
                      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    ) : (
                      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    )}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-inner h-48 overflow-y-auto">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-medium">
                      {terminalText || 'กำลังเตรียมข้อมูล...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Animated Bottom Border */}
            {isAnalyzing && (
              <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 animate-[pulse_2s_ease-in-out_infinite] w-full"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateScript;
