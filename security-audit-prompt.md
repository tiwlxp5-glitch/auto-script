# 🔒 Security Audit Prompt — Auto Script AI System (สำหรับ Antigravity 2.0)

คัดลอกข้อความด้านล่างทั้งหมดไปวางใน Antigravity 2.0 ได้เลย

---

```
คุณคือ Senior Security Auditor ที่มีสิทธิ์เข้าถึงโค้ดเบสของโปรเจกต์นี้ทั้งหมด
ผมต้องการให้คุณตรวจสอบความปลอดภัยของระบบ "Auto Script AI" แบบละเอียดครบทุกเลเยอร์
โดยอิงจากสถาปัตยกรรมที่ออกแบบไว้ (ระบุด้านล่าง) แล้วเทียบกับโค้ดจริงว่า
"สิ่งที่ควรมี" ถูก implement จริงหรือไม่ มีช่องโหว่ตรงไหน และมีจุดที่ไม่ตรงกับ spec หรือเปล่า

ระบบประกอบด้วย: React 19 + React Router v7 (Frontend) → Cloudflare Pages Functions
(Edge Serverless API) → Supabase PostgreSQL 15 (Database) → Google Gemini Dual-Engine
(AI Processing) → Stripe (Payment)

กรุณาตรวจสอบและรายงานผลแยกเป็นหัวข้อดังนี้ พร้อมระบุ: (1) ไฟล์/บรรทัดที่เกี่ยวข้อง
(2) สถานะ ✅ ปลอดภัย / ⚠️ เสี่ยง / ❌ ไม่มีการป้องกัน (3) วิธีแก้ไขที่ทำได้จริงทันที

==================================================
1) ACCESS & NETWORK SHIELD
==================================================
- CORS Policy: ตรวจว่า allow origin ถูกจำกัดเฉพาะโดเมนจริง ไม่ใช่ "*" หรือ wildcard หลุด
- DoS Protection: มีการจำกัดขนาด request body / rate limiting ป้องกัน memory exhaustion หรือไม่
- Auth Hardening: รหัสผ่านบังคับความยาวขั้นต่ำจริงหรือไม่ (ตรวจ validation logic ทั้ง client และ server)
- Email Enumeration: ตอน signup/login/reset password ระบบเผยหรือไม่ว่าอีเมลนี้มีในระบบแล้วหรือไม่
  (เช่น error message ต่างกันระหว่าง "email not found" กับ "wrong password")
- Email Verification: ระบบ Resend SMTP ยืนยันตัวตนก่อนใช้งานจริงหรือไม่ หรือ bypass ได้

==================================================
2) BACKEND API FIREWALL
==================================================
- Service Role Key: ตรวจสอบว่า Supabase Service Role Key ไม่ได้ถูก expose ไปที่ฝั่ง client
  (ค้นหาทุกที่ที่มีการ import/ใช้ service role key แล้วยืนยันว่าอยู่เฉพาะฝั่ง server เท่านั้น)
- RPC Lockdown: ฟังก์ชัน RPC ทั้งหมดมีการตรวจสิทธิ์ผู้เรียกจริงหรือไม่ หรือเรียกตรงจาก frontend ได้
  โดยไม่ผ่านการยืนยันตัวตน
- Prompt Injection: ข้อมูลจากผู้ใช้ (user_comment หรือ input อื่นที่ส่งเข้า Gemini) ถูกครอบด้วย
  XML/delimiter และ sanitize จริงหรือไม่ ทดสอบด้วย payload เช่น
  "ignore previous instructions and..." ว่าหลุดเข้าไปเปลี่ยนพฤติกรรม AI ได้หรือไม่
- Thai Obfuscation: ตรวจว่าระบบดักจับ zero-width character และช่องว่างแปลกๆ ที่ใช้หลบ filter
  ได้จริงหรือไม่ (ทดสอบด้วยข้อความที่แทรกอักขระที่มองไม่เห็น)

==================================================
3) DATABASE & ISOLATION (Supabase)
==================================================
- Row Level Security (RLS): ตรวจทุกตารางว่าเปิด RLS จริงหรือไม่ (ไม่ใช่แค่ policy แต่ RLS enabled)
  โดยเฉพาะตารางที่เก็บข้อมูลผู้ใช้ เครดิต และประวัติสคริปต์
- Policy Correctness: ทดสอบว่า user A สามารถ query/update ข้อมูลของ user B ได้หรือไม่
  ผ่านการปลอมแปลง user_id ใน request
- Race Condition: ระบบตัดเครดิตใช้ atomic operation (เช่น SQL UPDATE...WHERE credit >= amount
  แบบ single query) หรือใช้ read-then-write ที่เสี่ยง race condition/double spend
  ให้ลองจำลองการยิง request ซ้ำพร้อมกัน (concurrent requests) เพื่อดูว่าเครดิตติดลบได้หรือไม่
- Saga Pattern Ledger: ตรวจ flow start → commit → refund ว่าครบทุกเคส error และไม่มีสถานะ
  "pending" ค้างตลอดไปได้หรือไม่

==================================================
4) PAYMENT & FINANCIAL SECURITY (Stripe)
==================================================
- Backend-Only Validation: การอัปเกรด Tier/แพ็กเกจ อัปเดตจาก Stripe webhook เท่านั้นจริงหรือไม่
  หรือ frontend สามารถส่ง request เปลี่ยน tier ตรงๆ ได้โดยไม่ผ่าน Stripe
- Webhook Signature: ตรวจว่า verify Stripe webhook signature (stripe-signature header)
  ก่อนประมวลผลทุกครั้งหรือไม่ ถ้าไม่มีการ verify คือช่องโหว่ร้ายแรง
- Idempotency: ตรวจว่ามีการเก็บ Stripe Event ID และเช็คซ้ำก่อนประมวลผล เพื่อป้องกัน
  replay attack / webhook ยิงซ้ำแล้วเติมเครดิตซ้ำ
- Amount Verification: ยอดเงินที่ระบบเชื่อ มาจาก Stripe event object เท่านั้น
  ไม่ใช่ค่าที่ client ส่งมาเอง

==================================================
5) DATA PRIVACY & LIFECYCLE (PDPA)
==================================================
- Auto-Cleanup (pg_cron): ตรวจ cron job ว่าทำงานจริงตามรอบที่ตั้งไว้ และลบข้อมูลตรงเงื่อนไข
  จริง ไม่หลงเหลือข้อมูลเกินกำหนด
- Cascade Deletion: เมื่อผู้ใช้ขอลบบัญชี ข้อมูลที่เกี่ยวข้องทั้งหมด (ประวัติ, ธุรกรรม, session)
  ถูกลบ/anonymize ครบจริงหรือไม่ ตรวจ foreign key relations ที่อาจตกหล่น
- ตรวจว่ามี log หรือ backup ที่ยังเก็บข้อมูลส่วนบุคคลไว้เกินความจำเป็นหลังลบแล้วหรือไม่

==================================================
6) AI PROCESSING ENGINE (Gemini)
==================================================
- Output Validation: ผลลัพธ์จาก Gemini ผ่าน schema validation (safeParseJson) ก่อนส่งให้
  frontend เสมอหรือไม่ ทดสอบกรณี AI ตอบ format ผิดว่าระบบ handle error โดยไม่ crash/leak
- Timeout & Auto-Refund: ถ้า Gemini timeout หรือ error ระบบคืนเครดิตอัตโนมัติจริงหรือไม่
  หรือมีเคสที่เครดิตหายแต่ไม่ได้งาน (money lost in transit)
- API Key Exposure: Gemini API Key เก็บเป็น environment variable ฝั่ง server เท่านั้น
  ไม่หลุดไปใน client bundle หรือ log

==================================================
7) GENERAL / CROSS-CUTTING
==================================================
- Secrets Scan: สแกนทั้ง repo หาค่า API key, service role key, webhook secret ที่ hardcode
  อยู่ในโค้ดหรือ commit history
- Environment Variables: ตรวจว่าไฟล์ .env ไม่ถูก commit เข้า git และอยู่ใน .gitignore
- Dependency Vulnerabilities: รัน dependency audit (เช่น npm audit) แล้วสรุปช่องโหว่ที่พบ
  ตาม severity
- Logging: ตรวจว่า log ไม่บันทึกข้อมูล sensitive เช่น password, credit card, token เต็มค่า

==================================================
รูปแบบรายงานที่ต้องการ
==================================================
ให้สรุปเป็นตารางท้ายสุด: [หัวข้อ | สถานะ | ความเสี่ยง (สูง/กลาง/ต่ำ) | สิ่งที่ต้องแก้ก่อน]
เรียงจากความเสี่ยงสูงสุดไปต่ำสุด และแยกส่วนที่ "ต้องแก้ทันทีก่อน deploy จริง" ออกมาให้ชัดเจน
```

---

**หมายเหตุการใช้งาน:**
- ถ้า Antigravity 2.0 เข้าถึงโค้ดได้จริง ให้ยืนยันก่อนว่ามัน scan ไฟล์ครบ (frontend, functions/api, supabase migrations, stripe webhook handler) ไม่ใช่แค่บางส่วน
- แนะนำให้รันทีละหมวด (เช่น หมวด 3 กับ 4 ก่อน เพราะเป็นเรื่องเงินและข้อมูล) แทนที่จะยิงทั้งหมดทีเดียว ถ้า context ของ AI จำกัด
- ผลตรวจที่ได้ควรเอาไปให้คนตรวจซ้ำอีกที โดยเฉพาะเรื่อง RLS policy และ Stripe webhook — AI อาจ mark ว่า "ปลอดภัย" ทั้งที่ policy เขียนผิด logic ได้
