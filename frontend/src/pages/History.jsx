import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function History() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setScripts(data);
    }
    setLoading(false);
  };

  const toggleFavorite = async (scriptId, currentStatus) => {
    // Optimistic UI update
    setScripts(scripts.map(s => s.id === scriptId ? { ...s, is_favorite: !currentStatus } : s));
    
    await supabase
      .from('scripts')
      .update({ is_favorite: !currentStatus })
      .eq('id', scriptId);
  };

  const copyToClipboard = (scriptData) => {
    try {
      const fullText = scriptData.script_blocks.map(b => b.audio_spoken).join(' ');
      navigator.clipboard.writeText(fullText);
      alert('คัดลอกสคริปต์เรียบร้อยแล้ว!');
    } catch (err) {
      alert('ไม่สามารถคัดลอกได้');
    }
  };

  const exportToText = (scriptData, productName) => {
    const fullText = scriptData.script_blocks.map(b => `[${b.phase}] ${b.audio_spoken}\n(ภาพ: ${b.visual_direction})`).join('\n\n');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
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
            {[
              { id: 'all', label: 'ทุกโหมด' },
              { id: 'ป้ายยาตรงๆ', label: 'ป้ายยาตรงๆ' },
              { id: 'ขยี้ปัญหา', label: 'ขยี้ปัญหา' },
              { id: 'เปรียบเทียบชัดๆ', label: 'เปรียบเทียบชัดๆ' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setFilterMode(m.id)}
                className={`whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  filterMode === m.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {m.label}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredScripts.map(script => (
            <div key={script.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{script.product_name}</h3>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">{script.mode}</span>
                    <span className="text-slate-500">{new Date(script.created_at).toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
                <button 
                  onClick={() => toggleFavorite(script.id, script.is_favorite)}
                  className="text-2xl hover:scale-110 transition-transform"
                  title="บันทึกเป็นรายการโปรด"
                >
                  {script.is_favorite 
                    ? <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    : <svg className="w-6 h-6 text-slate-300 hover:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                  }
                </button>
              </div>
              
              <div className="p-5 flex-1 bg-slate-50">
                <p className="text-sm text-slate-600 line-clamp-4 italic">
                  "{(() => {
                    try {
                      const parsed = typeof script.content === 'string' ? JSON.parse(script.content) : script.content;
                      return parsed?.script_blocks?.[0]?.audio_spoken || 'ไม่มีข้อมูล';
                    } catch (e) {
                      return 'ไม่มีข้อมูล';
                    }
                  })()}"
                </p>
              </div>
              
              <div className="p-4 bg-white border-t border-slate-100 flex justify-end space-x-2">
                <button 
                  onClick={() => {
                    const parsed = typeof script.content === 'string' ? JSON.parse(script.content) : script.content;
                    exportToText(parsed, script.product_name)
                  }}
                  className="text-sm px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> โหลด TXT
                </button>
                <button 
                  onClick={() => {
                    const parsed = typeof script.content === 'string' ? JSON.parse(script.content) : script.content;
                    copyToClipboard(parsed)
                  }}
                  className="text-sm px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg> คัดลอก
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default History;
