import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center mt-12 px-2">
      <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-snug">
        เขียนสคริปต์รีวิวสินค้า <br className="hidden sm:block" />
        <span className="text-blue-600">ให้การทำคลิปง่ายขึ้นด้วย AI</span>
      </h1>
      <p className="text-base sm:text-lg text-slate-600 max-w-xl mb-8 px-4 leading-relaxed">
        ประหยัดเวลาคิดคอนเทนต์ เพียงกรอกจุดเด่นสินค้า ระบบจะจัดโครงสร้างสคริปต์พร้อมถ่ายให้ทันที
      </p>
      <div className="flex flex-row gap-3 justify-center w-full px-4">
        <Link to="/create" className="bg-blue-600 text-white px-5 py-2.5 sm:px-8 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-blue-700 transition-colors shadow-md whitespace-nowrap">
          เริ่มสร้างสคริปต์
        </Link>
        <Link to="/pricing" className="bg-white text-slate-700 border border-slate-300 px-5 py-2.5 sm:px-8 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap">
          ดูแพ็กเกจ
        </Link>
      </div>

      {/* Comparison Section */}
      <div className="mt-24 mb-16 w-full max-w-6xl mx-auto px-4 text-left">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 px-2">
            ทำไมสคริปต์ของเราถึง <br className="sm:hidden" />
            <span className="text-blue-600">"ปิดการขายได้ดีกว่า"?</span>
          </h2>
          <p className="text-sm sm:text-lg text-slate-600">โจทย์: เซรั่มลดสิวยุบไวใน 3 วัน หน้าไม่แห้งลอก</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* AI ทั่วไป */}
          <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-300"></div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">🤖</span>
              <h3 className="font-bold text-slate-700 text-lg">AI ธรรมดาทั่วไป</h3>
              <span className="ml-auto text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">ธรรมดา / น่าเบื่อ</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-slate-600 italic leading-relaxed text-sm">
              "สวัสดีค่ะทุกคน วันนี้จะมาแนะนำเซรั่มลดสิวหน้าใสตัวใหม่ล่าสุด ที่จะช่วยให้สิวของคุณยุบภายใน 3 วัน แถมหน้ายังไม่แห้งลอกอีกด้วยนะคะ เนื้อเซรั่มซึมไวมาก ทาแล้วสบายผิวสุดๆ สนใจสามารถกดสั่งซื้อที่ตะกร้าด้านล่างได้เลยค่ะ รีบหน่อยนะคะเดี๋ยวของหมด ขอบคุณค่ะ"
            </div>
            <ul className="mt-6 space-y-2 text-sm text-slate-500">
              <li className="flex gap-2"><span>❌</span> ไม่มีจิตวิทยาการขาย (Hook ไม่ดึงดูด)</li>
              <li className="flex gap-2"><span>❌</span> เป็นทางการเกินไป ไม่เหมือนคนพูดจริง</li>
              <li className="flex gap-2"><span>❌</span> ไม่มีบอกว่าต้องทำท่าทางยังไงตอนถ่ายทำ</li>
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
              <span className="text-2xl">✨</span>
              <h3 className="font-bold text-blue-700 text-lg">Auto Script V2</h3>
              <span className="ml-auto text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase tracking-wide">พร้อมถ่ายทำ 100%</span>
            </div>

            <div className="space-y-4">
              {/* Hook Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded">🪝 HOOK</span>
                  <span className="text-xs text-slate-400">⏱️ 0:00 - 0:03</span>
                </div>
                <p className="text-slate-800 font-medium text-sm mb-3">
                  "ใครเป็นสิวซ้ำซาก หายแล้วก็ขึ้นใหม่... หยุดเลื่อนคลิปนี้ด่วน!"
                </p>
                <div className="bg-white p-2 rounded-lg text-xs text-slate-500 border border-slate-100 flex gap-2">
                  <span>🎬 <strong className="text-slate-600">ภาพ:</strong> ทำหน้าช็อก ชี้ไปที่สิวบนหน้า</span>
                </div>
              </div>

              {/* Reveal Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">✨ REVEAL</span>
                  <span className="text-xs text-slate-400">⏱️ 0:03 - 0:10</span>
                </div>
                <p className="text-slate-800 font-medium text-sm mb-3">
                  "ตั้งแต่ลองตัวนี้ สิวยุบกริบใน 3 วัน แถมหน้าไม่ลอกสักนิด! ซึมไวสุดๆ"
                </p>
                <div className="bg-white p-2 rounded-lg text-xs text-slate-500 border border-slate-100 flex gap-2">
                  <span>🎬 <strong className="text-slate-600">ภาพ:</strong> หยดเซรั่มลงบนมือให้ดูเนื้อสัมผัสใสๆ</span>
                </div>
              </div>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-blue-800 font-medium">
              <li className="flex gap-2"><span>✅</span> โครงสร้างสคริปต์สั้น กระชับ หยุดนิ้วคนดูได้จริง</li>
              <li className="flex gap-2"><span>✅</span> มี Action บอกท่าทางให้ทุกท่อน เล่นตามได้เลย</li>
              <li className="flex gap-2"><span>✅</span> ใช้คำกระตุ้นจิตวิทยา FOMO กระชากยอดขาย</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
