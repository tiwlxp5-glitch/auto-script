import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { scanForBannedWords, highlightBannedWords } from '../lib/bannedWords';
import { useNavigate } from 'react-router-dom';

function CreateScript() {
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [pricePromo, setPricePromo] = useState('');
  const [videoLength, setVideoLength] = useState('สั้น');
  const [mode, setMode] = useState('ป้ายยาตรงๆ');
  
  // Premium fields
  const [competitor, setCompetitor] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productUrl, setProductUrl] = useState('');
  
  const [generatedScript, setGeneratedScript] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bannedWarnings, setBannedWarnings] = useState([]);
  const [error, setError] = useState(null);
  
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  
  const navigate = useNavigate();

  const modes = [
    { id: 'ป้ายยาตรงๆ', name: 'ป้ายยาตรงๆ', description: 'โชว์ความว้าวของสินค้าแบบตื่นเต้น' },
    { id: 'ขยี้ปัญหา', name: 'ขยี้ปัญหา', description: 'เริ่มด้วยปัญหาที่น่ารำคาญ ขยี้ให้เจ็บ' },
    { id: 'เปรียบเทียบชัดๆ', name: 'เปรียบเทียบชัดๆ', description: 'โจมตีข้อเสียของทั่วไป ชูจุดเด่นเรา' }
  ];

  const lengths = [
    { id: 'สั้น', time: '10-15 วิ', desc: '(สั้น/กระชับ)' },
    { id: 'กลาง', time: '30-45 วิ', desc: '(ปานกลาง)' },
    { id: 'ยาว', time: '60 วิ+', desc: '(ละเอียด)' }
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        navigate('/login');
      }
    });
  }, [navigate]);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, tier')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error.message);
        // Fallback or retry logic can be added here
      }
      
      if (data) {
        setProfile(data);
      } else {
        // ถ้าไม่มีข้อมูลในตาราง profile เลย ให้จำลองไปก่อนเพื่อให้กดสร้างได้
        setProfile({ credits: 0, tier: 'free' });
      }
    } catch (err) {
      console.error("Fetch profile exception:", err);
      setProfile({ credits: 0, tier: 'free' });
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert("Error: ไม่พบข้อมูล User (ยังไม่ได้ล็อกอิน)");
      return;
    }
    
    if (!profile) {
      alert("Error: ยังโหลดข้อมูลโควต้าไม่เสร็จ หรือโหลดไม่พบ");
      return;
    }
    
    // 1. เช็คโควต้าเครดิต
    if (profile.credits <= 0) {
      alert(`โควต้าเครดิตของคุณหมดแล้วครับ (เหลือ ${profile.credits} เครดิต) กรุณาอัปเกรดแพ็กเกจ`);
      navigate('/pricing');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setGeneratedScript(null);

    try {
      // ดึง JWT Token ปัจจุบันของผู้ใช้เพื่อส่งไปยืนยันตัวตนที่ Backend
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        productName,
        productDetails,
        pricePromo,
        videoLength,
        mode,
        competitor: mode === 'เปรียบเทียบชัดๆ' ? competitor : '',
        targetAudience: profile.tier !== 'free' ? targetAudience : '',
        productUrl: profile.tier === 'pro' ? productUrl : ''
      };

      // ยิงข้อมูลไปให้ Backend (Cloudflare Function) จัดการรวดเดียว
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to generate script");
      }

      const resultJson = responseData.script;
      const newCredits = responseData.credits_remaining;
      
      // สแกนหาคำต้องห้ามในบทพูดทั้งหมด
      const allText = resultJson.script_blocks.map(b => b.audio_spoken).join(' ');
      const warnings = scanForBannedWords(allText);
      
      // ลบ warnings ที่ซ้ำซาก
      const uniqueWarnings = Array.from(new Set(warnings.map(a => a.word)))
        .map(word => warnings.find(a => a.word === word));
        
      setBannedWarnings(uniqueWarnings);
      setGeneratedScript(resultJson);
      
      // อัปเดตเครดิตในหน้าเว็บให้ตรงกับที่ Backend หักไป
      setProfile({ ...profile, credits: newCredits });
      window.dispatchEvent(new Event('profileUpdated'));

    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการสร้างสคริปต์ กรุณาลองใหม่อีกครั้งครับ");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedScript) return;
    const textToCopy = generatedScript.script_blocks
      .map(block => block.audio_spoken)
      .join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    alert('คัดลอกสคริปต์เรียบร้อยแล้ว!');
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
            
            {/* ฟีเจอร์ Pro: ดูดข้อมูลจากลิงก์ */}
            {profile?.tier === 'pro' && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center">
                  <span className="mr-2">👑</span> แปะลิงก์สินค้า (Pro Feature)
                </label>
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="https://shopee.co.th/..."
                />
                <p className="text-[11px] sm:text-xs text-amber-700 mt-1.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis">AI จะดึงข้อมูลจุดเด่นจากลิงก์นี้ให้อัตโนมัติ!</p>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">จุดเด่นสินค้า (ถ้ามีลิงก์ข้างบนไม่ต้องพิมพ์ยาวก็ได้)</label>
              <textarea
                required={!productUrl} // ถ้าไม่มี URL ต้องพิมพ์จุดเด่น
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

            {/* ฟีเจอร์ Plus/Pro: กลุ่มเป้าหมาย */}
            {profile?.tier !== 'free' && (
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
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-slate-900">{m.name}</span>
                      <span className="block text-sm text-slate-500">{m.description}</span>
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

            <button
              type="submit"
              disabled={isGenerating || !user || !profile}
              className={`w-full py-3 rounded-lg text-white font-medium transition-all ${
                isGenerating 
                  ? 'bg-blue-400 cursor-wait' 
                  : (!user || !profile)
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '🚀 AI กำลังสแกนข้อมูลและร่างสคริปต์...' : (!profile ? '⏳ กำลังโหลดข้อมูลบัญชี...' : '✨ สร้างสคริปต์เลย (หัก 1 เครดิต)')}
            </button>
          </form>
        </div>

        {/* ฝั่งขวา: ผลลัพธ์ (Premium Teleprompter Cards) */}
        <div className="flex flex-col h-full">
          {!generatedScript && !isGenerating ? (
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">พร้อมสร้างสคริปต์ไวรัล</h3>
              <p className="text-slate-500 max-w-sm">กรอกข้อมูลด้านซ้ายแล้วกดสร้างสคริปต์ AI จะเขียนสคริปต์ป้ายยาให้คุณภายใน 5 วินาที</p>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 min-h-[400px] shadow-sm">
              <div className="animate-spin text-4xl mb-4 text-blue-600">🌀</div>
              <p className="text-lg font-medium text-slate-700 animate-pulse">กำลังสวมวิญญาณแม่ค้าตัวท็อป...</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm h-full">
              {/* Header */}
              <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-blue-600">📝</span> สคริปต์พร้อมถ่าย
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ความยาวประมาณ: {generatedScript.metadata?.estimated_duration_seconds} วินาที
                  </p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <span>📋</span> คัดลอกทั้งหมด
                </button>
              </div>

              {/* Banned Words Warning */}
              {bannedWarnings && bannedWarnings.length > 0 && (
                <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <h4 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                    <span>⚠️</span> ระวังคำสุ่มเสี่ยงโดนแบน (ปรับแก้ก่อนถ่าย)
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
                {generatedScript.script_blocks.map((block, index) => {
                  let phaseIcon = "💬";
                  let phaseColor = "bg-slate-100 text-slate-600";
                  if (block.phase === "Hook") { phaseIcon = "🪝"; phaseColor = "bg-rose-100 text-rose-700"; }
                  if (block.phase === "Agitation") { phaseIcon = "🔥"; phaseColor = "bg-orange-100 text-orange-700"; }
                  if (block.phase === "Reveal") { phaseIcon = "✨"; phaseColor = "bg-blue-100 text-blue-700"; }
                  if (block.phase === "FOMO") { phaseIcon = "⏰"; phaseColor = "bg-amber-100 text-amber-700"; }
                  if (block.phase === "CTA") { phaseIcon = "🛒"; phaseColor = "bg-emerald-100 text-emerald-700"; }

                  return (
                    <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative group transition-all hover:shadow-md">
                      <div className="absolute -left-3 top-5 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                        {index + 1}
                      </div>
                      
                      <div className="flex justify-between items-start mb-3 ml-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${phaseColor}`}>
                            {phaseIcon} {block.phase}
                          </span>
                          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            ⏱️ {block.timestamp}
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
                            <span className="text-sm shrink-0">🎬</span>
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
