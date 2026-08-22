import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center mt-12">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
        สร้างสคริปต์รีวิวสินค้า <br className="hidden sm:block" />
        <span className="text-blue-600">หยุดนิ้วคนดู ปิดการขายได้จริง</span>
      </h1>
      <p className="text-lg text-slate-600 max-w-2xl mb-10">
        ผู้ช่วย AI อัจฉริยะสำหรับนักการตลาด Affiliate TikTok และ Shopee 
        แค่ใส่รายละเอียดสินค้า เราเขียนสคริปต์สุดปังให้คุณภายใน 10 วินาที
      </p>
      <div className="flex space-x-4">
        <Link to="/create" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-md">
          เริ่มสร้างสคริปต์เลย
        </Link>
        <Link to="/pricing" className="bg-white text-slate-700 border border-slate-300 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-slate-50 transition-colors">
          ดูแพ็กเกจ
        </Link>
      </div>
    </div>
  );
}

export default Home;
