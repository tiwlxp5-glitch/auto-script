import { Link } from 'react-router-dom';

function Home() {
  return (
    <>
      <title>Auto Script | AI เขียนสคริปต์วิดีโอ TikTok, Reels, ปักตะกร้า</title>
      <meta name="description" content="Auto Script ช่วยสร้างสคริปต์รีวิวสินค้า ปิดการขายง่ายขึ้นด้วย AI ฝังจิตวิทยาการขาย ไม่ต้องคิดคอนเทนต์เอง" />
      <div className="flex flex-col items-center justify-center text-center mt-6 sm:mt-12 px-2">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-snug">
        เขียนสคริปต์รีวิวสินค้า <br className="hidden sm:block" />
        <span className="text-blue-600">ให้การทำคลิปง่ายขึ้นด้วย</span>
        <span className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-0.5 rounded-xl ml-2 shadow-lg">AI</span>
      </h1>
      <p className="text-base sm:text-lg text-slate-600 max-w-xl mb-8 px-4 leading-relaxed mt-2">
        ประหยัดเวลาคิดคอนเทนต์ เพียงกรอกจุดเด่นสินค้า ระบบจะจัดโครงสร้างสคริปต์พร้อมถ่ายให้ทันที
      </p>
      <div className="flex flex-row gap-3 justify-center w-full px-4 mb-4">
        <Link to="/create" className="bg-blue-600 text-white px-5 py-2.5 sm:px-8 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-blue-700 transition-colors shadow-md whitespace-nowrap">
          เริ่มสร้างสคริปต์
        </Link>
        <Link to="/pricing" className="bg-white text-slate-700 border border-slate-300 px-5 py-2.5 sm:px-8 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap">
          ดูแพ็กเกจ
        </Link>
      </div>

      {/* Comparison Section */}
      <div className="mt-12 sm:mt-24 mb-10 w-full max-w-6xl mx-auto px-4 text-left">
        <div className="text-center mb-8">
          <h2 className="text-[1.2rem] xs:text-xl sm:text-3xl font-bold text-slate-900 mb-2 px-1 leading-snug">
            <span className="whitespace-nowrap">ทำไมสคริปต์ของเราถึง</span> <br className="sm:hidden" />
            <span className="text-blue-600 whitespace-nowrap">"ปิดการขายได้ดีกว่า"?</span>
          </h2>
          <p className="text-sm sm:text-lg text-slate-600">โจทย์: สกินแคร์ลดสิว ยุบไวใน 3 วัน หน้าไม่แห้งลอก</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* AI ทั่วไป */}
          <div className="flex-1 bg-white p-6 rounded-2xl border-2 border-dashed border-slate-200 opacity-80 hover:opacity-100 transition-opacity relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-200"></div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-slate-400 shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
              </span>
              <h3 className="font-bold text-slate-500 text-base sm:text-lg leading-tight">AI ธรรมดาทั่วไป</h3>
              <span className="ml-auto text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded whitespace-nowrap shrink-0">น่าเบื่อ / ท่องจำ</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-slate-500 italic leading-relaxed text-sm border border-slate-100">
              "สวัสดีค่ะทุกคน วันนี้จะมาแนะนำสกินแคร์ลดสิวหน้าใสตัวใหม่ล่าสุด ที่จะช่วยให้สิวของคุณยุบภายใน 3 วัน แถมหน้ายังไม่แห้งลอกอีกด้วยนะคะ เนื้อสกินแคร์ซึมไวมาก ทาแล้วสบายผิวสุดๆ สนใจสามารถกดสั่งซื้อที่ตะกร้าด้านล่างได้เลยค่ะ รีบหน่อยนะคะเดี๋ยวของหมด ขอบคุณค่ะ"
            </div>
            <ul className="mt-6 space-y-2 text-sm text-slate-500">
              <li className="flex gap-2 items-start"><span className="text-red-400 mt-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></span> <span>ไม่มีจิตวิทยาการขาย (Hook ไม่ดึงดูด)</span></li>
              <li className="flex gap-2 items-start"><span className="text-red-400 mt-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></span> <span>เป็นทางการเกินไป ไม่เหมือนคนพูดจริง</span></li>
              <li className="flex gap-2 items-start"><span className="text-red-400 mt-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></span> <span>ไม่มีบอกว่าต้องทำท่าทางยังไงตอนถ่ายทำ</span></li>
            </ul>
          </div>

          {/* VS Badge (Desktop) */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center font-black text-slate-300 border border-slate-100 z-10 text-xl">
              VS
            </div>
          </div>

          {/* Auto Script V2 */}
          <div className="flex-1 bg-white p-6 rounded-2xl border border-blue-200 shadow-md relative overflow-hidden ring-4 ring-blue-50">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-blue-500 shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
              </span>
              <h3 className="font-bold text-blue-700 text-base sm:text-lg leading-tight whitespace-nowrap">Auto Script V2</h3>
              <span className="ml-auto text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase tracking-wide whitespace-nowrap shrink-0">พร้อมถ่ายทำ 100%</span>
            </div>

            <div className="space-y-4">
              {/* Hook Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] sm:text-xs font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg> HOOK (ฮุก)</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 0:00 - 0:03</span>
                </div>
                <p className="text-slate-800 font-bold text-sm mb-3 leading-relaxed">
                  "หยุดก่อน! ใครเป็นสิวอักเสบ สิวซ้ำซาก หายแล้วก็ขึ้นใหม่ที่เดิม... ถ้าไม่อยากหน้าพังไปกว่านี้ ดูคลิปนี้ให้จบด่วน!"
                </p>
                <div className="bg-white p-2.5 rounded-lg text-xs text-slate-500 border border-slate-200 flex gap-2 items-start">
                  <span className="mt-0.5 text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></span> 
                  <span className="leading-tight"><strong className="text-slate-700">ภาพ:</strong> ทำหน้าเครียด เอามือจับรอยสิวบนหน้า แล้วซูมกล้องเข้าใกล้ๆ</span>
                </div>
              </div>

              {/* Reveal Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] sm:text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> REVEAL (เข้าเนื้อหา)</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 0:03 - 0:10</span>
                </div>
                <p className="text-slate-800 font-medium text-sm mb-3 leading-relaxed">
                  "บอกเลยว่าตั้งแต่ลองตัวนี้ ชีวิตเปลี่ยน! สิวเม็ดเป้งยุบกริบใน 3 วัน แถมหน้าไม่ลอก ไม่แสบแดงเลยสักนิด เนื้อสัมผัสใสแจ๋ว ซึมไวแบบทาปุ๊บแต่งหน้าต่อได้เลย"
                </p>
                <div className="bg-white p-2.5 rounded-lg text-xs text-slate-500 border border-slate-200 flex gap-2 items-start">
                  <span className="mt-0.5 text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></span> 
                  <span className="leading-tight"><strong className="text-slate-700">ภาพ:</strong> บีบสกินแคร์ลงบนหลังมือ ถูเบาๆ ให้ดูความซึมไว (แทรกรูป Before/After ตอนสิวยุบ)</span>
                </div>
              </div>
              
              <div className="text-center mt-3">
                <p className="inline-block text-[11px] sm:text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 leading-relaxed shadow-sm">
                  * นี่เป็นเพียงตัวอย่าง 2 ท่อนแรก <br /> จากสคริปต์แบบเต็ม 5 ท่อน
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-blue-800 font-medium">
              <li className="flex gap-2 items-start"><span className="text-blue-500 mt-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></span> <span>โครงสร้างสคริปต์สั้น กระชับ หยุดนิ้วคนดูได้จริง</span></li>
              <li className="flex gap-2 items-start"><span className="text-blue-500 mt-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></span> <span>มี Action บอกท่าทางให้ทุกท่อน เล่นตามได้เลย</span></li>
              <li className="flex gap-2 items-start"><span className="text-blue-500 mt-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></span> <span>ใช้คำกระตุ้นจิตวิทยา FOMO กระชากยอดขาย</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Engine Comparison: Standard vs Pro Deep Brain ─────────────────── */}
      <div className="mt-8 mb-12 w-full max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4 shadow-sm">
            {/* CpuChip icon (Heroicons) */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0V7m0 0h2M3 9v6m0 0v2a2 2 0 002 2h2m-4-4h2m14-2v6m0-6h2m-2 6v2a2 2 0 01-2 2h-2m0 0H9m6 0v-2M9 21H7a2 2 0 01-2-2v-2m0 0H3m4 0h2M9 9h6v6H9V9z" />
            </svg>
            เบื้องหลัง AI Engine
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-3 leading-snug">
            ทำไม Pro ถึงปิดการขาย <span className="text-purple-600">เนียนกว่า?</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
            ความต่างอยู่ที่ AI Engine ที่ทำงานอยู่เบื้องหลัง — ไม่ใช่แค่ UI ที่แตกต่างกัน
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Plus Smart Engine */}
          <div className="bg-blue-50/50 border-2 border-blue-200 rounded-3xl p-6 relative flex flex-col h-full hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                {/* Bolt icon */}
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg sm:text-xl">Plus Smart Engine</h3>
                <p className="text-sm font-semibold text-blue-600 mt-0.5">฿249 <span className="text-slate-400 font-normal">/ 60 คลิป</span></p>
              </div>
            </div>
            
            <ul className="space-y-4 text-sm text-slate-700 flex-1">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <span><strong>High-Speed Workflow:</strong> รันสคริปต์เสร็จใน 2-4 วินาที ไม่เสียเวลา เหมาะกับคนถ่ายคลิปประจำวัน</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <span><strong>Targeted Script:</strong> ระบุเพศ ช่วงวัย ของกลุ่มเป้าหมายได้ชัดเจน</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <span><strong>5 Classic Frameworks:</strong> ครบทุกสูตรขยี้ปัญหา เล่าเรื่อง และ FOMO</span>
              </li>
            </ul>
            
            <div className="mt-6 pt-5 border-t border-blue-200/60">
              <div className="bg-white rounded-xl p-3 flex justify-center items-center gap-2 border border-blue-100 shadow-sm">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="font-bold text-slate-700">ตกคลิปละ 4.1 บาท</span>
              </div>
            </div>
          </div>

          {/* Pro Deep Brain™ */}
          <div className="bg-slate-900 border-2 border-amber-400/50 rounded-3xl p-6 relative flex flex-col h-full shadow-xl hover:shadow-2xl transition-shadow overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600"></div>
            
            <div className="absolute top-0 right-6 transform -translate-y-px">
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-b-lg shadow-sm">
                ยอดนิยม
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6 mt-2">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400/20 to-purple-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-amber-400/30">
                {/* CpuChip icon */}
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0V7m0 0h2M3 9v6m0 0v2a2 2 0 002 2h2m-4-4h2m14-2v6m0-6h2m-2 6v2a2 2 0 01-2 2h-2m0 0H9m6 0v-2M9 21H7a2 2 0 01-2-2v-2m0 0H3m4 0h2M9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg sm:text-xl">Pro Deep Brain™</h3>
                <p className="text-sm font-semibold text-amber-400 mt-0.5">฿590 <span className="text-slate-400 font-normal">/ 150 คลิป</span></p>
              </div>
            </div>
            
            <ul className="space-y-4 text-sm text-slate-300 flex-1">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </div>
                <span><strong className="text-white">Neuromarketing Brain:</strong> วิเคราะห์จิตวิทยาพฤติกรรมลูกค้าเชิงลึกก่อนเขียน</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <span><strong className="text-white">Multi-Version:</strong> สร้างทีเดียว 3 มุมมอง (รีวิว / แฉตลก / เร่งด่วน)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <span><strong className="text-white">Belief-Shifting:</strong> หักล้างความเชื่อผิดๆ ของลูกค้าที่เคยไม่กล้าซื้อ</span>
              </li>
            </ul>
            
            <div className="mt-6 pt-5 border-t border-slate-700/80">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-3 flex justify-center items-center gap-2 border border-amber-500/20 shadow-inner">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="font-bold text-amber-400">ตกคลิปละ 3.9 บาท <span className="font-medium text-amber-200/80">(คุ้มค่าที่สุด)</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/pricing" className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all hover:shadow-lg w-full sm:w-auto">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0V7m0 0h2M3 9v6m0 0v2a2 2 0 002 2h2m-4-4h2m14-2v6m0-6h2m-2 6v2a2 2 0 01-2 2h-2m0 0H9m6 0v-2M9 21H7a2 2 0 01-2-2v-2m0 0H3m4 0h2M9 9h6v6H9V9z" /></svg>
            <span>ลองใช้ Pro Deep Brain™ &rarr; <span className="whitespace-nowrap">ดูแพ็กเกจ</span></span>
          </a>
        </div>
      </div>
      {/* ──────────────────────────────────────────────────────────────────── */}

      {/* Secret Sauce / Psychology Section */}
      <div className="mt-8 mb-20 w-full max-w-6xl mx-auto px-4 text-left">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-snug">
            เบื้องหลังสมองกล <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Auto Script</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-2">
            เราไม่ได้ใช้แค่พรอมต์ธรรมดา แต่เราฝัง <br className="hidden sm:block" />
            <strong className="text-slate-800 inline-block">"6 สูตรจิตวิทยาการขายระดับโลก"</strong> <br />
            ที่ Top Creator บน TikTok และ Shopee ใช้จริง <br className="hidden sm:block" />
            เพื่อให้คลิปของคุณปิดการขายได้ง่ายที่สุด
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* PAS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">PAS Formula</h3>
            <p className="text-sm text-slate-600">ขยี้ปัญหา (Problem) ให้รู้สึกอิน กระตุ้นความกลัว (Agitate) แล้วค่อยเสนอสินค้าคุณเป็นทางออก (Solution)</p>
          </div>

          {/* HSO */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hook-Story-Offer</h3>
            <p className="text-sm text-slate-600">หยุดนิ้วด้วยฮุกแรงๆ (Hook) เล่าเรื่องราวที่เกี่ยวโยง (Story) และยื่นข้อเสนอที่ปฏิเสธไม่ได้ (Offer)</p>
          </div>

          {/* BAB */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Before-After-Bridge</h3>
            <p className="text-sm text-slate-600">ฉายภาพความเจ็บปวดในอดีต (Before) ภาพฝันที่สวยงาม (After) และสินค้าคุณคือสะพานเชื่อม (Bridge)</p>
          </div>
          
          {/* FAB */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">FAB Model</h3>
            <p className="text-sm text-slate-600">ดึงฟีเจอร์เด่น (Features) เทียบข้อได้เปรียบเหนือคู่แข่ง (Advantages) และประโยชน์แท้จริงที่ลูกค้าได้ (Benefits)</p>
          </div>

          {/* Belief Shifting */}
          <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">PRO</div>
            <div className="w-12 h-12 bg-fuchsia-100 rounded-xl flex items-center justify-center text-fuchsia-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Belief Shifting</h3>
            <p className="text-sm text-slate-600">วิเคราะห์ความเชื่อผิดๆ ของลูกค้า (False Belief) และหักล้างด้วยจุดแข็งของสินค้าอย่างมีชั้นเชิง (Epiphany Bridge)</p>
          </div>

          {/* Reference Banner */}
          <div className="lg:col-span-1 md:col-span-2 bg-slate-900 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.8l7.2 14.4H4.8L12 5.8z"/></svg>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-md shadow-sm">อ้างอิงข้อมูล (References)</span>
              </div>
              <div className="text-sm sm:text-base text-slate-300 leading-relaxed space-y-2">
                <p>โมเดลจิตวิทยาทั้งหมดถูกเทรนจากข้อมูลอ้างอิงชั้นนำ อาทิ:</p>
                <ul className="pl-2 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>งานวิจัย E-commerce Psychology จาก <strong className="text-white">Nielsen Norman Group</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>โครงสร้างคลิปไวรัลของ <strong className="text-white">TikTok For Business</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>บทวิเคราะห์พฤติกรรมนักช้อปไทยบน <strong className="text-white">Shopee / Lazada</strong></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default Home;
