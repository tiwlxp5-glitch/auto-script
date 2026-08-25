import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function History() {
  const { user, loading: authLoading } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('funny');
  const navigate = useNavigate();

  const loadHistory = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // นับจำนวนสคริปต์ที่มีชื่อสินค้าเดียวกันเพื่อแยกแยะเวอร์ชัน
      const nameCounts = {};
      data.forEach(s => {
        nameCounts[s.product_name] = (nameCounts[s.product_name] || 0) + 1;
      });
      
      const currentCounts = {};
      const processedData = [...data].reverse().map(s => {
        currentCounts[s.product_name] = (currentCounts[s.product_name] || 0) + 1;
        return { 
          ...s, 
          versionIndex: currentCounts[s.product_name],
          totalVersions: nameCounts[s.product_name]
        };
      }).reverse();

      setScripts(processedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      loadHistory(user.id);
    }
  }, [user, authLoading, navigate]);

  const toggleFavorite = async (scriptId, currentStatus) => {
    // Optimistic UI update
    setScripts(scripts.map(s => s.id === scriptId ? { ...s, is_favorite: !currentStatus } : s));
    
    await supabase
      .from('scripts')
      .update({ is_favorite: !currentStatus })
      .eq('id', scriptId);
  };

  const parseMultiVersion = (rawMultiVersion) => {
    const safeParse = (str) => {
      try { return JSON.parse(str.replace(/```json/g, '').replace(/```/g, '').trim()); } 
      catch(e) { return null; }
    };
    const funnyMatch = rawMultiVersion.match(/<VERSION_FUNNY>([\s\S]*?)<\/VERSION_FUNNY>/);
    const reviewMatch = rawMultiVersion.match(/<VERSION_REVIEW>([\s\S]*?)<\/VERSION_REVIEW>/);
    const fomoMatch = rawMultiVersion.match(/<VERSION_FOMO>([\s\S]*?)<\/VERSION_FOMO>/);
    
    return {
      funny: funnyMatch ? safeParse(funnyMatch[1]) : null,
      review: reviewMatch ? safeParse(reviewMatch[1]) : null,
      fomo: fomoMatch ? safeParse(fomoMatch[1]) : null
    };
  };

  const copyToClipboard = (scriptData) => {
    try {
      let fullText = '';
      if (scriptData?.raw_multi_version) {
        const parsedMulti = parseMultiVersion(scriptData.raw_multi_version);
        const getBlocksText = (obj, title) => {
          if (!obj?.script_blocks) return '';
          return `--- ${title} ---\n` + obj.script_blocks.map(b => b.audio_spoken).join(' ') + '\n\n';
        };
        fullText += getBlocksText(parsedMulti.funny, 'สายฮา/กวนๆ');
        fullText += getBlocksText(parsedMulti.review, 'รีวิวจริงใจ');
        fullText += getBlocksText(parsedMulti.fomo, 'เร่งด่วน (FOMO)');
        
        if (!fullText.trim()) throw new Error('No blocks');
      } else {
        if (!scriptData?.script_blocks) {
          alert('ไม่พบข้อมูลบทพูดสำหรับคัดลอก');
          return;
        }
        fullText = scriptData.script_blocks.map(b => b.audio_spoken).join(' ');
      }
      
      navigator.clipboard.writeText(fullText.trim());
      alert('คัดลอกสคริปต์เรียบร้อยแล้ว!');
    } catch {
      alert('ไม่สามารถคัดลอกได้');
    }
  };

  const exportToText = (scriptData, productName) => {
    let fullText = '';
    
    if (scriptData?.raw_multi_version) {
      const parsedMulti = parseMultiVersion(scriptData.raw_multi_version);
      const getBlocksText = (obj, title) => {
        if (!obj?.script_blocks) return '';
        return `=== ${title} ===\n` + obj.script_blocks.map(b => `[${b.phase}] ${b.audio_spoken}\n(ภาพ: ${b.visual_direction})`).join('\n\n') + '\n\n';
      };
      fullText += getBlocksText(parsedMulti.funny, 'สายฮา/กวนๆ');
      fullText += getBlocksText(parsedMulti.review, 'รีวิวจริงใจ');
      fullText += getBlocksText(parsedMulti.fomo, 'เร่งด่วน (FOMO)');
    } else {
      if (!scriptData?.script_blocks) return;
      fullText = scriptData.script_blocks.map(b => `[${b.phase}] ${b.audio_spoken}\n(ภาพ: ${b.visual_direction})`).join('\n\n');
    }

    const blob = new Blob([fullText.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Script_${productName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // กรองข้อมูล
  const filteredScripts = scripts.filter(s => {
    const matchSearch = s.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMode = filterMode === 'all' || s.mode === filterMode;
    const matchFavorite = !showFavoritesOnly || s.is_favorite;
    return matchSearch && matchMode && matchFavorite;
  });

  const uniqueModes = ['all', ...Array.from(new Set(scripts.map(s => s.mode)))];
  
  const formatModeDisplay = (modeStr) => {
    if (modeStr === 'all') return 'ทุกโหมด';
    if (modeStr === 'Pro_MultiVersion') return 'Multi-Version (3 สไตล์)';
    return modeStr;
  };

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      <button 
        onClick={() => window.history.back()}
        className="flex items-center text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        ย้อนกลับ
      </button>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-4 md:mb-0 flex items-center gap-2">
          ประวัติการสร้างสคริปต์ 
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="ค้นหาชื่อสินค้า..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto hide-scrollbar shrink-0">
            {uniqueModes.map(modeId => (
              <button
                key={modeId}
                onClick={() => setFilterMode(modeId)}
                className={`whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  filterMode === modeId ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {formatModeDisplay(modeId)}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
              showFavoritesOnly ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showFavoritesOnly 
              ? <span className="flex items-center gap-1"><svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg> เฉพาะรายการโปรด</span> 
              : <span className="flex items-center gap-1"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg> ดูรายการโปรด</span>
            }
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">กำลังโหลดข้อมูล...</div>
      ) : filteredScripts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
          <span className="mb-4 flex justify-center text-slate-300">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </span>
          <h3 className="text-xl font-bold text-slate-800 mb-2">ไม่พบสคริปต์</h3>
          <p className="text-slate-500">คุณยังไม่ได้สร้างสคริปต์ หรือไม่มีข้อมูลที่ตรงกับการค้นหา</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredScripts.map(script => (
             <div 
                key={script.id} 
                onClick={() => { setSelectedScript(script); setActiveModalTab('funny'); }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
             >
               <div className="flex-1 min-w-0 pr-4"> 
                 <h3 className="text-base font-bold text-slate-900 truncate flex items-center gap-2">
                    <span className="truncate">{script.product_name}</span>
                 </h3>
                 <div className="flex flex-wrap items-center gap-2 mt-1.5">
                   {script.totalVersions > 1 && (
                     <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap">
                       ครั้งที่ {script.versionIndex}
                     </span>
                   )}
                   <span className="text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap border border-blue-100">
                     {formatModeDisplay(script.mode)}
                   </span>
                   <span className="text-[10px] sm:text-xs text-slate-500 whitespace-nowrap">
                     {new Date(script.created_at).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}
                   </span>
                 </div>
               </div>
               
               <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(script.id, script.is_favorite); }}
                  className="p-2 -mr-2 text-2xl hover:scale-110 transition-transform shrink-0"
                  title="บันทึกเป็นรายการโปรด"
               >
                 {script.is_favorite 
                   ? <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                   : <svg className="w-6 h-6 text-slate-300 hover:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                 }
               </button>
             </div>
          ))}
        </div>
      )}

      {selectedScript && (() => {
        let parsed = null;
        let isMultiVersion = false;
        let parsedMulti = null;
        try {
          parsed = typeof selectedScript.content === 'string' ? JSON.parse(selectedScript.content) : selectedScript.content;
          if (parsed?.raw_multi_version) {
            isMultiVersion = true;
            parsedMulti = parseMultiVersion(parsed.raw_multi_version);
          }
        } catch (e) {}

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedScript(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-slate-100 flex flex-col gap-4 bg-white z-10">
                <div className="flex justify-between items-start">
                  <div className="pr-4">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedScript.product_name}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{formatModeDisplay(selectedScript.mode)}</span>
                      {selectedScript.totalVersions > 1 && (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          ครั้งที่ {selectedScript.versionIndex}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(selectedScript.created_at).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedScript(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                
                {isMultiVersion && (
                  <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto hide-scrollbar shrink-0">
                    <button 
                      onClick={() => setActiveModalTab('funny')} 
                      className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all ${activeModalTab === 'funny' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      🤣 สายฮา
                    </button>
                    <button 
                      onClick={() => setActiveModalTab('review')} 
                      className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all ${activeModalTab === 'review' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      ⭐ รีวิว
                    </button>
                    <button 
                      onClick={() => setActiveModalTab('fomo')} 
                      className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all ${activeModalTab === 'fomo' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      🔥 FOMO
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-5 overflow-y-auto flex-1 bg-slate-50 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {(() => {
                  if (isMultiVersion && parsedMulti) {
                    const renderMultiVersionBlocks = (blocks, title, emoji) => {
                      if (!blocks || !blocks.script_blocks) return <div className="text-center py-10 text-slate-400">ไม่มีข้อมูลสคริปต์ส่วนนี้</div>;
                      return (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="text-xl">{emoji}</span> {title}
                          </h4>
                          <div className="space-y-4">
                            {blocks.script_blocks.map((b, i) => (
                              <div key={i} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                                <div className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">{b.phase}</span>
                                </div>
                                <p className="mb-2 text-slate-700 text-sm">{b.audio_spoken}</p>
                                <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">🎥 ภาพ: {b.visual_direction}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    };
                    
                    if (activeModalTab === 'funny') return renderMultiVersionBlocks(parsedMulti.funny, 'สายฮา/กวนๆ', '🤣');
                    if (activeModalTab === 'review') return renderMultiVersionBlocks(parsedMulti.review, 'รีวิวจริงใจ', '⭐');
                    if (activeModalTab === 'fomo') return renderMultiVersionBlocks(parsedMulti.fomo, 'เร่งด่วน (FOMO)', '🔥');
                    return null;
                  } else if (parsed?.script_blocks) {
                    return (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        {parsed.script_blocks.map((b, i) => (
                          <div key={i} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">{b.phase}</span>
                            </div>
                            <p className="mb-2 text-slate-700">{b.audio_spoken}</p>
                            <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">🎥 ภาพ: {b.visual_direction}</p>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return <div className="text-center py-10 text-slate-400">ไม่มีข้อมูลสคริปต์</div>;
                  }
                })()}
              </div>
            
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end space-x-3 z-10">
              <button 
                onClick={() => {
                  try {
                    const parsed = typeof selectedScript.content === 'string' ? JSON.parse(selectedScript.content) : selectedScript.content;
                    const exportName = selectedScript.totalVersions > 1 ? `${selectedScript.product_name}_v${selectedScript.versionIndex}` : selectedScript.product_name;
                    exportToText(parsed, exportName);
                  } catch {
                    alert('ไม่สามารถอ่านข้อมูลสคริปต์ได้');
                  }
                }}
                className="flex-1 sm:flex-none justify-center text-sm px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> โหลด TXT
              </button>
              <button 
                onClick={() => {
                  try {
                    const parsed = typeof selectedScript.content === 'string' ? JSON.parse(selectedScript.content) : selectedScript.content;
                    copyToClipboard(parsed);
                  } catch {
                    alert('ไม่สามารถอ่านข้อมูลสคริปต์ได้');
                  }
                }}
                className="flex-1 sm:flex-none justify-center text-sm px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm shadow-blue-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg> คัดลอก
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

export default History;
