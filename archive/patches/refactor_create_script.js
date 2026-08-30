const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/CreateScript.jsx', 'utf8');

// 1. Add activeTab state
code = code.replace(
  "const [error, setError] = useState(null);",
  "const [error, setError] = useState(null);\n  const [activeTab, setActiveTab] = useState('funny');"
);

// 2. Remove analyze functions and URL states
code = code.replace("const [productUrls, setProductUrls] = useState(['']);", "");
code = code.replace("const [isAnalyzing, setIsAnalyzing] = useState(false);", "");
code = code.replace("const [terminalText, setTerminalText] = useState('');", "");
code = code.replace("const [showTerminal, setShowTerminal] = useState(false);", "");
code = code.replace("const analyzeAbortRef = useRef(null);", "");

code = code.replace(`    return () => {
      if (analyzeAbortRef.current) {
        analyzeAbortRef.current.abort();
      }
    };`, "");

// 3. Update handleGenerate signature & logic
code = code.replace(
  "const handleGenerate = async (e) => {",
  "const handleGenerate = async (e, isMultiVersion = false) => {"
);
code = code.replace("e.preventDefault();", "if (e) e.preventDefault();");

code = code.replace(
  `if (profile.credits <= 0) {
      alert(\`โควต้าเครดิตของคุณหมดแล้วครับ (เหลือ \${profile.credits} เครดิต) กรุณาอัปเกรดแพ็กเกจ\`);`,
  `const cost = isMultiVersion ? 2 : 1;
    if (profile.credits < cost) {
      alert(\`โควต้าเครดิตของคุณไม่พอ (ต้องการ \${cost} เครดิต, มี \${profile.credits} เครดิต) กรุณาอัปเกรดแพ็กเกจ\`);`
);

code = code.replace(
  "setGeneratedScript(null);",
  "setGeneratedScript(null);\n    setBannedWarnings([]);"
);

code = code.replace(
  "productUrls: effectiveTier === 'pro' ? productUrls.filter(url => url.trim() !== '') : []",
  "isMultiVersion: isMultiVersion"
);

// 4. Update XML Parsing logic in handleGenerate
const oldParsing = `      const resultJson = responseData.script;
      const newCredits = responseData.credits_remaining;
      
      // สแกนหาคำต้องห้ามในบทพูดทั้งหมด
      const allText = resultJson.script_blocks.map(b => b.audio_spoken).join(' ');
      const warnings = scanForBannedWords(allText);
      
      // ลบ warnings ที่ซ้ำซาก
      const uniqueWarnings = Array.from(new Set(warnings.map(a => a.word)))
        .map(word => warnings.find(a => a.word === word));
        
      setBannedWarnings(uniqueWarnings);
      setGeneratedScript(resultJson);`;

const newParsing = `      let finalScriptData = responseData.script;
      const newCredits = responseData.credits_remaining;
      
      let allText = '';
      
      if (finalScriptData.raw_multi_version) {
        const raw = finalScriptData.raw_multi_version;
        const funnyMatch = raw.match(/<VERSION_FUNNY>([\\s\\S]*?)<\\/VERSION_FUNNY>/);
        const reviewMatch = raw.match(/<VERSION_REVIEW>([\\s\\S]*?)<\\/VERSION_REVIEW>/);
        const fomoMatch = raw.match(/<VERSION_FOMO>([\\s\\S]*?)<\\/VERSION_FOMO>/);
        
        const safeParse = (str) => {
          try { return JSON.parse(str.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim()); } 
          catch(e) { return null; }
        };

        finalScriptData = {
          isMulti: true,
          funny: funnyMatch ? safeParse(funnyMatch[1]) : null,
          review: reviewMatch ? safeParse(reviewMatch[1]) : null,
          fomo: fomoMatch ? safeParse(fomoMatch[1]) : null
        };
        
        const getBlocks = (scriptObj) => scriptObj?.script_blocks?.map(b => b.audio_spoken).join(' ') || '';
        allText = getBlocks(finalScriptData.funny) + ' ' + getBlocks(finalScriptData.review) + ' ' + getBlocks(finalScriptData.fomo);
      } else {
        allText = finalScriptData.script_blocks?.map(b => b.audio_spoken).join(' ') || '';
      }

      const warnings = scanForBannedWords(allText);
      
      const uniqueWarnings = Array.from(new Set(warnings.map(a => a.word)))
        .map(word => warnings.find(a => a.word === word));
        
      setBannedWarnings(uniqueWarnings);
      setGeneratedScript(finalScriptData);`;

code = code.replace(oldParsing, newParsing);

// 5. Delete unused methods: handleAddUrl, handleRemoveUrl, handleUpdateUrl, handleAnalyze
const startIndex = code.indexOf("const handleAddUrl = () => {");
const endIndex = code.indexOf("const copyToClipboard = () => {");
if (startIndex !== -1 && endIndex !== -1) {
    code = code.slice(0, startIndex) + code.slice(endIndex);
}

// 6. Delete URL input UI
const urlUIStart = code.indexOf("{effectiveTier === 'pro' && (");
// Find the closing div of this block which is before the `<div><label>ชื่อสินค้า</label>`
const urlUIEnd = code.indexOf("<div>\\n              <label className=\"block text-sm font-medium text-slate-700 mb-2\">ชื่อสินค้า</label>");

if (urlUIStart !== -1 && urlUIEnd !== -1) {
    const urlUIReplacement = `
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
              <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อสินค้า</label>`;
    
    // Replace by slicing
    const actualEnd = urlUIEnd + `<div>\n              <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อสินค้า</label>`.length;
    
    const chunkToRemove = code.substring(urlUIStart, actualEnd);
    code = code.replace(chunkToRemove, urlUIReplacement);
} else {
    // Alternative replacement string if regex matching was slightly off
    const urlUIBlock = code.substring(code.indexOf("{effectiveTier === 'pro' && ("), code.indexOf("<div>\n              <label className=\"block text-sm font-medium text-slate-700 mb-2\">ชื่อสินค้า</label>"));
    if(urlUIBlock.length > 50) {
        code = code.replace(urlUIBlock, `
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
            
            `);
    }
}

// 7. Update Submit Buttons
const oldButtons = `<button
              type="submit"
              disabled={isGenerating || !user || !profile}
              className={\`w-full py-3 rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2 \${
                isGenerating 
                  ? 'bg-blue-400 cursor-wait' 
                  : (!user || !profile)
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
              }\`}
            >
              {isGenerating ? (
                <><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> AI กำลังสแกนข้อมูลและร่างสคริปต์...</>
              ) : (!profile ? (
                <><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> กำลังโหลดข้อมูลบัญชี...</>
              ) : (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> สร้างสคริปต์เลย (หัก 1 เครดิต)</>
              ))}
            </button>`;

const newButtons = `<div className="flex flex-col gap-3">
              <button
                type="submit"
                onClick={(e) => handleGenerate(e, false)}
                disabled={isGenerating || !user || !profile}
                className={\`w-full py-3 rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2 \${
                  isGenerating 
                    ? 'bg-blue-400 cursor-wait' 
                    : (!user || !profile)
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                }\`}
              >
                {isGenerating ? (
                  <><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> AI กำลังร่างสคริปต์...</>
                ) : (!profile ? (
                  <><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> กำลังโหลดข้อมูล...</>
                ) : (
                  <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> สร้างสคริปต์ปกติ (หัก 1 เครดิต)</>
                ))}
              </button>

              {effectiveTier === 'pro' && (
                <button
                  type="button"
                  onClick={(e) => handleGenerate(e, true)}
                  disabled={isGenerating || !user || !profile}
                  className={\`w-full py-3 rounded-lg text-white font-bold transition-all flex items-center justify-center gap-2 shadow-sm border \${
                    isGenerating 
                      ? 'bg-amber-400 cursor-wait border-transparent' 
                      : (!user || !profile)
                        ? 'bg-slate-400 cursor-not-allowed border-transparent'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-amber-600/20'
                  }\`}
                >
                  {isGenerating ? (
                    <><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> AI กำลังร่างสคริปต์ 3 สไตล์...</>
                  ) : (!profile ? (
                    <><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> กำลังโหลดข้อมูลบัญชี...</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> ✨ สร้างทีเดียว 3 สไตล์ (Pro • หัก 2 เครดิต)</>
                  ))}
                </button>
              )}
            </div>`;

code = code.replace(oldButtons, newButtons);

// 8. Update Script Results UI (Header & Tabs)
const oldHeader = `<div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></span> สคริปต์พร้อมถ่าย
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ความยาวประมาณ: {generatedScript.metadata?.estimated_duration_seconds} วินาที
                  </p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg> <span>คัดลอกทั้งหมด</span>
                </button>
              </div>`;

const newHeader = `<div className="bg-white border-b border-slate-200 flex flex-col sticky top-0 z-10">
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
                    onClick={() => {
                      const textToCopy = (generatedScript.isMulti ? generatedScript[activeTab]?.script_blocks : generatedScript.script_blocks)
                        ?.map(block => block.audio_spoken)
                        ?.join('\\n\\n');
                      if (textToCopy) {
                        navigator.clipboard.writeText(textToCopy);
                        alert('คัดลอกสคริปต์เรียบร้อยแล้ว!');
                      }
                    }}
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
                      className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 \${activeTab === 'funny' ? 'bg-amber-100 text-amber-800 border-b-2 border-amber-500' : 'text-slate-500 hover:bg-slate-100'}\`}
                    >
                      🤣 สายฮา/กวนๆ
                    </button>
                    <button 
                      onClick={() => setActiveTab('review')}
                      className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 \${activeTab === 'review' ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-100'}\`}
                    >
                      💎 รีวิวจริงใจ
                    </button>
                    <button 
                      onClick={() => setActiveTab('fomo')}
                      className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 \${activeTab === 'fomo' ? 'bg-rose-100 text-rose-800 border-b-2 border-rose-500' : 'text-slate-500 hover:bg-slate-100'}\`}
                    >
                      🔥 เร่งด่วน (FOMO)
                    </button>
                  </div>
                )}
              </div>`;

code = code.replace(oldHeader, newHeader);

// 9. Update Rendering Map Loop
code = code.replace(
  "{generatedScript.script_blocks.map((block, index) => {",
  "{(generatedScript.isMulti ? generatedScript[activeTab]?.script_blocks : generatedScript.script_blocks)?.map((block, index) => {"
);

fs.writeFileSync('frontend/src/pages/CreateScript.jsx', code, 'utf8');
console.log("Refactoring complete");
