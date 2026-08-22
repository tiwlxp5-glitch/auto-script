import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateScriptWithAI } from '../lib/gemini';
import { useNavigate } from 'react-router-dom';

function CreateScript() {
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [mode, setMode] = useState('ป้ายยาตรงๆ');
  
  const [generatedScript, setGeneratedScript] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();

  const modes = [
    { id: 'ป้ายยาตรงๆ', name: 'ป้ายยาตรงๆ', description: 'โชว์ความว้าวของสินค้าแบบตื่นเต้น' },
    { id: 'ขยี้ปัญหา', name: 'ขยี้ปัญหา', description: 'เริ่มด้วยปัญหาที่น่ารำคาญ ขยี้ให้เจ็บ' },
    { id: 'เปรียบเทียบชัดๆ', name: 'เปรียบเทียบชัดๆ', description: 'โจมตีข้อเสียของทั่วไป ชูจุดเด่นเรา' }
  ];

  // เช็คว่าผู้ใช้ล็อกอินหรือยัง
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        // ถ้ายังไม่ล็อกอิน บังคับไปหน้าล็อกอิน
        navigate('/login');
      }
    });
  }, [navigate]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setIsGenerating(true);
    setError(null);
    setGeneratedScript(null);

    try {
      // 1. ส่งข้อมูลไปให้ Gemini AI คิดสคริปต์
      const resultJson = await generateScriptWithAI(productName, productDetails, mode);
      setGeneratedScript(resultJson);

      // 2. บันทึกลงตู้เอกสาร Scripts (Supabase) เพื่อเก็บประวัติ
      await supabase.from('scripts').insert({
        user_id: user.id,
        product_name: productName,
        product_details: productDetails,
        mode: mode,
        content: JSON.stringify(resultJson) // เก็บ JSON ทั้งก้อนไว้ในรูปข้อความ
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
    // ดึงเฉพาะคำพูดออกมาต่อกันเพื่อให้ก๊อปปี้ง่าย
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
        <p className="text-slate-600">กรอกข้อมูลให้ครบถ้วน AI จะสร้างสคริปต์ที่โดนใจที่สุดพร้อมคำแนะนำภาพ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ฝั่งซ้าย: ฟอร์มกรอกข้อมูล */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <form onSubmit={handleGenerate} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
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
              <label className="block text-sm font-medium text-slate-700 mb-2">จุดเด่น / รายละเอียดสินค้า</label>
              <textarea
                required
                rows="4"
                value={productDetails}
                onChange={(e) => setProductDetails(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="เช่น คุมมัน 12 ชั่วโมง, เนื้อซึมไวใน 3 วิ, คนเป็นสิวใช้ได้"
              ></textarea>
            </div>

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

            <button
              type="submit"
              disabled={isGenerating || !user}
              className={`w-full py-3 rounded-lg text-white font-medium transition-all ${
                isGenerating ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '🚀 AI กำลังร่ายมนตร์สร้างสคริปต์...' : '✨ สร้างสคริปต์เลย'}
            </button>
          </form>
        </div>

        {/* ฝั่งขวา: พื้นที่แสดงผลลัพธ์ */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <span className="text-blue-500 mr-2">🎯</span> ผลลัพธ์สคริปต์ของคุณ
            </span>
            {generatedScript && (
              <button 
                onClick={copyToClipboard}
                className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md transition-colors"
              >
                📋 ก๊อปปี้บทพูด
              </button>
            )}
          </h2>
          
          <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-4 overflow-y-auto max-h-[600px] relative">
            {!generatedScript && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <span className="text-4xl mb-2">🤖</span>
                <p>สคริปต์ขั้นเทพของคุณจะแสดงที่นี่</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                <p className="animate-pulse">กำลังวิเคราะห์จิตวิทยาการขาย...</p>
              </div>
            )}

            {generatedScript && (
              <div className="space-y-4">
                <div className="bg-blue-100 text-blue-800 p-3 rounded-lg text-sm mb-4">
                  <strong>กลุ่มเป้าหมาย:</strong> {generatedScript.metadata.target_audience_persona}
                </div>
                
                {generatedScript.script_blocks.map((block, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded">
                        {block.timestamp} | {block.phase}
                      </span>
                      <span className="text-xs text-slate-400">อารมณ์: {block.subtext_emotion}</span>
                    </div>
                    
                    <p className="text-lg font-medium text-slate-900 mb-3 leading-relaxed">
                      "{block.audio_spoken}"
                    </p>
                    
                    <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded border-l-4 border-slate-300">
                      <strong>🎥 ภาพประกอบ:</strong> {block.visual_direction}
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
