import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateScriptWithAI } from '../lib/gemini';
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
    { id: 'สั้น', label: '10-15 วินาที (สั้น/กระชับ)' },
    { id: 'กลาง', label: '30-45 วินาที (ปานกลาง)' },
    { id: 'ยาว', label: '60 วินาทีขึ้นไป (รายละเอียดเยอะ)' }
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
      let finalDetails = productDetails;

      // 2. ถ้าเป็น Pro และมีการใส่ URL ให้ดึงข้อมูลเว็บผ่าน Jina Reader
      if (profile.tier === 'pro' && productUrl) {
        try {
          const response = await fetch(`https://r.jina.ai/${productUrl}`);
          if (response.ok) {
            const scrapedText = await response.text();
            finalDetails += `\n\n[ข้อมูลเสริมจากการสแกน URL]:\n${scrapedText.substring(0, 3000)}`; // ตัดความยาวกัน Token ทะลุ
          }
        } catch (err) {
          console.log("Failed to scrape URL", err);
        }
      }

      // 3. ส่งข้อมูลไปให้ Gemini AI
      const resultJson = await generateScriptWithAI({
        productName,
        productDetails: finalDetails,
        pricePromo,
        videoLength,
        mode,
        competitor: mode === 'เปรียบเทียบชัดๆ' ? competitor : '',
        targetAudience: profile.tier !== 'free' ? targetAudience : ''
      });
      
      setGeneratedScript(resultJson);

      // 4. หักเครดิต 1 แต้ม
      const newCredits = profile.credits - 1;
      await supabase.from('profiles').update({ credits: newCredits }).eq('id', user.id);
      setProfile({ ...profile, credits: newCredits }); // อัปเดต UI ทันที

      // 5. บันทึกประวัติ
      await supabase.from('scripts').insert({
        user_id: user.id,
        product_name: productName,
        product_details: finalDetails,
        mode: mode,
        content: JSON.stringify(resultJson)
      });

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">สร้างสคริปต์รีวิวด้วย AI</h1>
        <p className="text-slate-600">
          เหลือโควต้าการสร้าง <strong>{profile ? profile.credits : '...'}</strong> สคริปต์
        </p>
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
                <p className="text-xs text-amber-700 mt-1">AI จะวิ่งไปอ่านรายละเอียดจากลิงก์นี้ให้โดยอัตโนมัติ!</p>
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
                    <span className="block">{l.label.split(' ')[0]} {l.label.split(' ')[1]}</span>
                    <span className={`text-xs mt-0.5 ${videoLength === l.id ? 'text-blue-400' : 'text-slate-400'}`}>
                      {l.label.split(' ').slice(2).join(' ')}
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

        {/* ฝั่งขวา: ผลลัพธ์ */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <span className="text-blue-500 mr-2">🎯</span> ผลลัพธ์สคริปต์ของคุณ
            </span>
            {generatedScript && (
              <button 
                onClick={copyToClipboard}
                className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md transition-colors font-medium"
              >
                📋 ก๊อปปี้บทพูดไปใช้ได้เลย
              </button>
            )}
          </h2>
          
          <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-4 overflow-y-auto max-h-[700px] relative">
            {!generatedScript && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <span className="text-4xl mb-2">🤖</span>
                <p>สคริปต์ขั้นเทพของคุณจะแสดงที่นี่</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                <p className="animate-pulse">กำลังประมวลผลจิตวิทยาการขาย...</p>
              </div>
            )}

            {generatedScript && (
              <div className="space-y-4">
                <div className="bg-blue-100 text-blue-800 p-3 rounded-lg text-sm mb-4">
                  <strong>หมวดหมู่:</strong> {generatedScript.metadata?.primary_psychological_trigger || 'General'}
                </div>
                
                {generatedScript.script_blocks.map((block, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-1 rounded uppercase">
                        {block.phase || 'SCRIPT'}
                      </span>
                      <span className="text-xs text-slate-400">{block.timestamp}</span>
                    </div>
                    
                    <p className="text-lg font-medium text-slate-900 mb-3 leading-relaxed">
                      "{block.audio_spoken}"
                    </p>
                    
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border-l-4 border-blue-400 flex flex-col">
                      <strong className="mb-1">🎥 อิริยาบถ / ภาพประกอบ:</strong>
                      <span>{block.visual_direction}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateScript;
