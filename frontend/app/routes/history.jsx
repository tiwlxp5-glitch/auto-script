import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

function History() {
  const { user, profile, loading: authLoading } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('funny');
  // ── Bulk Delete State ──────────────────────────────────────────
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
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

  // ── Bulk Delete Helpers ──────────────────────────────────────────
  const toggleSelectId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredScriptsForDelete.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredScriptsForDelete.map(s => s.id)));
    }
  };

  const exitDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmMessage = selectedIds.size > 1
      ? `⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการลบสคริปต์ที่เลือกทั้งหมด (${selectedIds.size} รายการ)?\n\nการดำเนินการนี้ไม่สามารถกู้คืนได้`
      : `คุณแน่ใจหรือไม่ว่าต้องการลบสคริปต์ที่เลือก?\n\nการดำเนินการนี้ไม่สามารถกู้คืนได้`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    const idsToDelete = [...selectedIds];
    const { error } = await supabase
      .from('scripts')
      .delete()
      .in('id', idsToDelete)
      .eq('user_id', user.id); // Safety: RLS + extra guard
    if (!error) {
      setScripts(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      exitDeleteMode();
    }
    setIsDeleting(false);
  };

  // ── Tier Retention Label ─────────────────────────────────────────
  const getRetentionLabel = () => {
    const tier = profile?.tier || 'free';
    if (tier === 'pro') return null; // Pro = เก็บตลอดกาล ไม่ต้องแสดง Banner
    if (tier === 'plus') return { days: 30, color: 'blue' };
    return { days: 3, color: 'amber' };
  };
  const retentionInfo = getRetentionLabel();



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
          toast.error('ไม่พบข้อมูลบทพูดสำหรับคัดลอก', {
            icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          });
          return;
        }
        fullText = scriptData.script_blocks.map(b => b.audio_spoken).join(' ');
      }
      
      navigator.clipboard.writeText(fullText.trim());
      toast.success('คัดลอกสคริปต์เรียบร้อยแล้ว!', {
        icon: <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      });
    } catch {
      toast.error('ไม่สามารถคัดลอกได้', {
        icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      });
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

  // รายการที่ลบได้ (ไม่ใช่รายการโปรด) ใช้ใน Delete Mode
  const filteredScriptsForDelete = filteredScripts.filter(s => !s.is_favorite);
  const allDeleteSelected = filteredScriptsForDelete.length > 0 && selectedIds.size === filteredScriptsForDelete.length;

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

      {/* ── Retention Banner ─────────────────────────────────────── */}
      {retentionInfo && (
        <div className={`flex items-start gap-3 mb-5 p-3.5 rounded-xl border text-sm ${
          retentionInfo.color === 'amber'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            สคริปต์ที่ไม่ได้บันทึกเป็นรายการโปรด จะถูกลบอัตโนมัติหลังจาก <strong>{retentionInfo.days} วัน</strong>{' '}
            {retentionInfo.color === 'amber' && (
              <span>— <a href="/pricing" className="underline font-medium">อัปเกรดแพลน</a> เพื่อเก็บนานขึ้น</span>
            )}
          </span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-4 md:mb-0 flex items-center gap-2">
          ประวัติการสร้างสคริปต์ 
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {!isDeleteMode && (
            <>
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
              {/* ปุ่ม "เลือกลบ" */}
              {scripts.length > 0 && (
                <button
                  onClick={() => setIsDeleteMode(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  เลือกลบ
                </button>
              )}
            </>
          )}

          {/* ── Delete Mode Toolbar ──────────────────────────────── */}
          {isDeleteMode && (
            <div className="flex items-center justify-between w-full flex-wrap gap-3">
              {/* Select All Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={allDeleteSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 cursor-pointer accent-rose-600 shrink-0"
                />
                เลือกทั้งหมด ({filteredScriptsForDelete.length})
              </label>

              <div className="flex items-center gap-2 shrink-0">
                {/* Delete Button */}
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0 || isDeleting}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>{isDeleting ? 'กำลังลบ...' : `ลบที่เลือก${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}</span>
                </button>

                {/* Cancel Button */}
                <button
                  onClick={exitDeleteMode}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>ยกเลิก</span>
                </button>
              </div>
            </div>
          )}
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
          {filteredScripts.map(script => {
            const isSelected = selectedIds.has(script.id);
            const isDeletable = !script.is_favorite;
            return (
             <div 
                key={script.id} 
                onClick={() => {
                  if (isDeleteMode) {
                    if (isDeletable) toggleSelectId(script.id);
                  } else {
                    setSelectedScript(script); setActiveModalTab('funny');
                  }
                }}
                className={`bg-white rounded-xl shadow-sm border p-4 transition-all cursor-pointer flex items-center gap-3 ${
                  isDeleteMode && isSelected
                    ? 'border-rose-300 bg-rose-50 shadow-rose-100'
                    : isDeleteMode && !isDeletable
                    ? 'border-slate-100 opacity-50 cursor-not-allowed'
                    : 'border-slate-200 hover:shadow-md'
                }`}
             >
               {/* Checkbox in Delete Mode */}
               {isDeleteMode && (
                 <div className="shrink-0" onClick={e => e.stopPropagation()}>
                   {isDeletable ? (
                     <input
                       type="checkbox"
                       checked={isSelected}
                       onChange={() => toggleSelectId(script.id)}
                       className="w-5 h-5 rounded border-slate-300 cursor-pointer accent-rose-600"
                     />
                   ) : (
                     <div className="w-5 h-5 flex items-center justify-center" title="รายการโปรด — ไม่สามารถลบได้">
                       <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                         <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                       </svg>
                     </div>
                   )}
                 </div>
               )}

               <div className="flex-1 min-w-0 pr-2"> 
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
               
               {/* ปุ่มดาว (ซ่อนตอน Delete Mode) */}
               {!isDeleteMode && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(script.id, script.is_favorite); }}
                    className="p-2 -mr-2 hover:scale-110 transition-transform shrink-0"
                    title="บันทึกเป็นรายการโปรด"
                 >
                   {script.is_favorite 
                     ? <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                     : <svg className="w-6 h-6 text-slate-300 hover:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                   }
                 </button>
               )}
             </div>
            );
          })}
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
                      className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeModalTab === 'funny' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-500">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866ZM7.65 15.385a.75.75 0 0 1 1.06-.062 3.736 3.736 0 0 0 2.665 1.099h1.25a3.736 3.736 0 0 0 2.665-1.099.75.75 0 1 1 1.06 1.06 5.236 5.236 0 0 1-3.725 1.539h-1.25a5.236 5.236 0 0 1-3.725-1.539.75.75 0 0 1-.061-1.06Z" clipRule="evenodd" />
                      </svg>
                      สายฮา
                    </button>
                    <button 
                      onClick={() => setActiveModalTab('review')} 
                      className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeModalTab === 'review' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                      รีวิว
                    </button>
                    <button 
                      onClick={() => setActiveModalTab('fomo')} 
                      className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeModalTab === 'fomo' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-rose-500">
                        <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clipRule="evenodd" />
                      </svg>
                      FOMO
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-5 overflow-y-auto flex-1 bg-slate-50 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {(() => {
                  if (isMultiVersion && parsedMulti) {
                    const renderMultiVersionBlocks = (blocks, title, icon) => {
                      if (!blocks || !blocks.script_blocks) return <div className="text-center py-10 text-slate-400">ไม่มีข้อมูลสคริปต์ส่วนนี้</div>;
                      return (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                            {icon} {title}
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
                    
                    if (activeModalTab === 'funny') return renderMultiVersionBlocks(parsedMulti.funny, 'สายฮา/กวนๆ', <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-500"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866ZM7.65 15.385a.75.75 0 0 1 1.06-.062 3.736 3.736 0 0 0 2.665 1.099h1.25a3.736 3.736 0 0 0 2.665-1.099.75.75 0 1 1 1.06 1.06 5.236 5.236 0 0 1-3.725 1.539h-1.25a5.236 5.236 0 0 1-3.725-1.539.75.75 0 0 1-.061-1.06Z" clipRule="evenodd" /></svg>);
                    if (activeModalTab === 'review') return renderMultiVersionBlocks(parsedMulti.review, 'รีวิวจริงใจ', <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" /></svg>);
                    if (activeModalTab === 'fomo') return renderMultiVersionBlocks(parsedMulti.fomo, 'เร่งด่วน (FOMO)', <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-500"><path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clipRule="evenodd" /></svg>);
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
                    toast.error('ไม่สามารถอ่านข้อมูลสคริปต์ได้', {
                      icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    });
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
                    toast.error('ไม่สามารถอ่านข้อมูลสคริปต์ได้', {
                      icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    });
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
