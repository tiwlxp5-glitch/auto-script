import { Link } from 'react-router-dom';

function Legal() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          กลับหน้าหลัก
        </Link>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-700 leading-relaxed space-y-8">
        
        {/* Header */}
        <div className="text-center border-b border-slate-100 pb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">นโยบายและข้อตกลงการใช้งาน</h1>
          <p className="text-slate-500">ปรับปรุงล่าสุด: สิงหาคม 2569</p>
        </div>

        {/* Section 1: Terms of Service */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-blue-600 pl-3">1. เงื่อนไขการให้บริการ (Terms of Service)</h2>
          <p>
            เว็บไซต์ Auto Script ให้บริการระบบปัญญาประดิษฐ์ (AI) ในการสร้างสรรค์สคริปต์วิดีโอ 
            โดยเมื่อท่านสมัครสมาชิกและชำระเงิน ถือว่าท่านได้ยอมรับข้อตกลงดังต่อไปนี้:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>เครดิตการใช้งานไม่สามารถแลกเปลี่ยนหรือทอนเป็นเงินสดได้</li>
            <li>ห้ามนำระบบไปใช้สร้างเนื้อหาที่ผิดกฎหมาย ละเมิดลิขสิทธิ์ หรือสร้างความเกลียดชัง</li>
            <li>ผู้ให้บริการขอสงวนสิทธิ์ในการระงับบัญชี หากพบการใช้งานที่ผิดวัตถุประสงค์ (เช่น ใช้บอทโจมตีระบบ)</li>
          </ul>
        </section>

        {/* Section 2: Refund Policy */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-rose-500 pl-3">2. นโยบายการคืนเงิน (Refund Policy)</h2>
          <p>
            เนื่องจากบริการของเราเป็นสินค้าดิจิทัลและเปิดให้ใช้งานทันที (Digital Goods) 
            <strong> ทางเราขอสงวนสิทธิ์ "ไม่รับคืนเงินทุกกรณี (No Refund)" </strong> 
            หลังจากที่ระบบได้ทำการเติมเครดิตเข้าบัญชีของท่านเรียบร้อยแล้ว
          </p>
          <p>
            *หากท่านพบปัญหาเครดิตไม่เข้า หรือระบบขัดข้อง สามารถติดต่อฝ่ายสนับสนุนเพื่อขอรับเครดิตชดเชยได้
          </p>
        </section>

        {/* Section 3: Privacy Policy (PDPA) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-emerald-500 pl-3">3. นโยบายความเป็นส่วนตัว (PDPA / Privacy Policy)</h2>
          <p>
            เราให้ความสำคัญกับข้อมูลส่วนบุคคลของท่าน และปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) อย่างเคร่งครัด:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>ข้อมูลที่จัดเก็บ:</strong> อีเมล, รหัสผ่าน (เข้ารหัสความปลอดภัย), ข้อมูลการสั่งซื้อ (เชื่อมโยงผ่าน Stripe) และประวัติการสร้างสคริปต์</li>
            <li><strong>วัตถุประสงค์:</strong> เพื่อใช้ในการยืนยันตัวตน เติมเครดิต และปรับปรุงคุณภาพ AI เท่านั้น</li>
            <li><strong>การเปิดเผยข้อมูล:</strong> เราไม่มีนโยบายขายหรือแชร์ข้อมูลของท่านให้บุคคลที่สามเด็ดขาด (ยกเว้นระบบชำระเงินที่ต้องทำงานร่วมกับ Stripe)</li>
            <li><strong>การลบบัญชี:</strong> ท่านสามารถกดปุ่ม "ลบบัญชีและข้อมูลทั้งหมด" ได้ด้วยตนเองที่หน้าตั้งค่า ข้อมูลจะถูกลบออกจากฐานข้อมูลอย่างถาวร</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="mt-8 pt-8 border-t border-slate-100 text-sm text-slate-500">
          <p>หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อทีมงานได้ตลอดเวลา</p>
        </section>

      </div>
    </div>
  );
}

export default Legal;
