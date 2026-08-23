import { Link } from 'react-router-dom';

function Home() {
  return (
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
          <p className="text-sm sm:text-lg text-slate-600">โจทย์: เซรั่มลดสิวยุบไวใน 3 วัน หน้าไม่แห้งลอก</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* AI ทั่วไป */}
          <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-300"></div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-slate-500 shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
              </span>
              <h3 className="font-bold text-slate-700 text-base sm:text-lg leading-tight">AI ธรรมดาทั่วไป</h3>
              <span className="ml-auto text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded whitespace-nowrap shrink-0">ธรรมดา / น่าเบื่อ</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-slate-600 italic leading-relaxed text-sm">
              "สวัสดีค่ะทุกคน วันนี้จะมาแนะนำเซรั่มลดสิวหน้าใสตัวใหม่ล่าสุด ที่จะช่วยให้สิวของคุณยุบภายใน 3 วัน แถมหน้ายังไม่แห้งลอกอีกด้วยนะคะ เนื้อเซรั่มซึมไวมาก ทาแล้วสบายผิวสุดๆ สนใจสามารถกดสั่งซื้อที่ตะกร้าด้านล่างได้เลยค่ะ รีบหน่อยนะคะเดี๋ยวของหมด ขอบคุณค่ะ"
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
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg> HOOK</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 0:00 - 0:03</span>
                </div>
                <p className="text-slate-800 font-medium text-sm mb-3">
                  "ใครเป็นสิวซ้ำซาก หายแล้วก็ขึ้นใหม่... หยุดเลื่อนคลิปนี้ด่วน!"
                </p>
                <div className="bg-white p-2 rounded-lg text-xs text-slate-500 border border-slate-100 flex gap-2 items-start">
                  <span className="mt-0.5 text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></span> 
                  <span><strong className="text-slate-600">ภาพ:</strong> ทำหน้าช็อก ชี้ไปที่สิวบนหน้า</span>
                </div>
              </div>

              {/* Reveal Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> REVEAL</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 0:03 - 0:10</span>
                </div>
                <p className="text-slate-800 font-medium text-sm mb-3">
                  "ตั้งแต่ลองตัวนี้ สิวยุบกริบใน 3 วัน แถมหน้าไม่ลอกสักนิด! ซึมไวสุดๆ"
                </p>
                <div className="bg-white p-2 rounded-lg text-xs text-slate-500 border border-slate-100 flex gap-2 items-start">
                  <span className="mt-0.5 text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></span> 
                  <span><strong className="text-slate-600">ภาพ:</strong> หยดเซรั่มลงบนมือให้ดูเนื้อสัมผัสใสๆ</span>
                </div>
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
    </div>
  );
}

export default Home;
