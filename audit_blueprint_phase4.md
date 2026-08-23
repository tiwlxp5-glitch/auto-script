# 📘 Auto Script: Master Audit Report & Phase 4 Blueprint

**Status:** 🔴 **DO NOT SHIP (NOT PRODUCTION READY)**  
**Auditor:** Elite Engineering AI (Security & Architecture Focus)  
**Date:** August 2026  

---

## 1. Executive Summary (สรุปภาพรวม)
จากการนำเอกสาร `PROJECT_DOCUMENTATION.md` และซอร์สโค้ดปัจจุบันมาวิเคราะห์ภายใต้มาตรฐานความปลอดภัยและสถาปัตยกรรมระดับ Production พบว่าโครงสร้างพื้นฐาน (Serverless) และ Business Logic มีความทันสมัยและตอบโจทย์ตลาดไทยได้ดีเยี่ยม 

อย่างไรก็ตาม **ระบบปัจจุบันยังไม่พร้อมนำไปใช้งานจริง (Not Production Ready)** เนื่องจากพบ **ช่องโหว่ด้านความปลอดภัยระดับวิกฤต (Critical Security Vulnerabilities)** ที่อาจทำให้โปรเจกต์สูญเสียรายได้และถูกขโมยทรัพยากร (API Keys) ได้อย่างง่ายดาย

---

## 2. จุดแข็งของโปรเจกต์ (Strengths)
* **✅ Modern Edge Architecture:** การเลือกใช้ Cloudflare Pages + Functions คู่กับ Supabase เป็นสถาปัตยกรรมที่ประหยัดต้นทุนมาก (Scale to Zero) และตอบสนองรวดเร็ว
* **✅ Payment Pivot Strategy:** การเปลี่ยนจาก Subscription มาเป็น One-Time Payment เพื่อให้รองรับ **PromptPay** ถือเป็นการแก้ปัญหา Business Logic ที่เข้ากับพฤติกรรมลูกค้าคนไทยได้ดีมาก
* **✅ Banned Words Checker:** เป็น UX/Feature ที่ปกป้องลูกค้าจากการโดนแบนบนโซเชียลมีเดีย ช่วยเพิ่ม Value ให้กับตัวโปรดักส์
* **✅ Secure IDOR Prevention:** ใน API ลบบัญชี (`/api/delete-account.js`) มีการตรวจสอบ Token (`getUser`) เพื่อยืนยันตัวตนก่อนลบ ทำให้ผู้ใช้ไม่สามารถแฮ็กไปลบบัญชีคนอื่นได้

---

## 3. จุดอ่อนและช่องโหว่ร้ายแรง (Vulnerabilities & Weaknesses)

### 🔴 1. VITE_GEMINI_API_KEY ถูกเปิดเผยบน Frontend (CRITICAL)
* **ปัญหา:** ตัวแปรที่ขึ้นต้นด้วย `VITE_` จะถูกฝังเข้าไปในไฟล์ JavaScript ของหน้าเว็บเบราว์เซอร์ 
* **หลักฐาน:** พบในไฟล์ `src/lib/gemini.js` มีการเรียก `import.meta.env.VITE_GEMINI_API_KEY`
* **ผลกระทบ:** แฮกเกอร์เพียงแค่กด F12 ก็สามารถคัดลอก API Key ของโปรเจกต์ไปใช้งานฟรีๆ ได้จนโควต้าทะลุ หรือคุณต้องจ่ายค่า API มหาศาล

### 🔴 2. การตัดโควต้าเครดิตเกิดขึ้นที่ Client-Side (CRITICAL)
* **ปัญหา:** โค้ดส่วนหน้าเว็บ (`CreateScript.jsx`) เป็นตัวสั่งอัปเดตเครดิตลบหนึ่ง (`update({ credits: newCredits })`) 
* **หลักฐาน:** พบใน `src/pages/CreateScript.jsx` 
* **ผลกระทบ:** ผู้ใช้สามารถบล็อก Request นี้ด้วยเครื่องมือทั่วไป หรือแก้โค้ดชั่วคราว (Client-Side Manipulation) เพื่อเสกเครดิตให้ตัวเองเป็น 9999 หรือปั่นสคริปต์ได้ฟรีตลอดชีพแบบไร้ขีดจำกัด (Broken Access Control)

### 🟠 3. ช่องโหว่ Webhook Idempotency (HIGH)
* **ปัญหา:** ระบบ Webhook ของ Stripe การันตีการส่งแบบ "At-least-once" ซึ่งหมายความว่า 1 การชำระเงินอาจมีการยิง Webhook มาซ้ำ 2-3 ครั้งหากเครือข่ายมีปัญหา
* **หลักฐาน:** ใน `functions/api/webhook.js` ไม่มีการบันทึก `event.id` ที่เคยประมวลผลไปแล้ว
* **ผลกระทบ:** หาก Stripe ยิงซ้ำ โค้ดจะเอาเครดิตใหม่ไปบวกเพิ่มซ้ำๆ ทำให้ลูกค้าได้เครดิตเกินจริง (เช่น จ่าย 99 บาทแต่ได้เครดิต 60 -> 120 -> 180)

### 🟡 4. Jina AI Scraping ติดปัญหา CORS และ IP Blocking (MEDIUM)
* **ปัญหา:** การยิง Request ไปที่ `https://r.jina.ai/` จากฝั่ง Client โดยตรง มีความเสี่ยงที่จะโดนบล็อก IP จากหน้าเว็บ หรือเจอปัญหา CORS Policy
* **ผลกระทบ:** ผู้ใช้ระดับ Pro อาจใช้งานฟีเจอร์สแกน URL ไม่ได้

---

## 4. Master Blueprint: แผนการพัฒนา Phase 4 (Security & Backend Migration)

> **คำแนะนำ:** ห้ามเปิดตัวโปรเจกต์ (Launch) จนกว่าจะแก้ไข Blueprint ลำดับ SEC-01 สำเร็จ

### [SEC-01] ย้ายระบบ AI และการตัดเครดิตไปที่ Backend (MUST FIX)
* **Priority:** 1 🔴 CRITICAL
* **Category:** Security / Architecture
* **Problem:** ระบบปัจจุบันให้เบราว์เซอร์ของผู้ใช้คุยกับ Gemini API โดยตรง และให้ผู้ใช้หักเครดิตตัวเอง
* **Recommended Solution:**
  1. สร้าง Cloudflare Function ใหม่ชื่อ `/functions/api/generate.js`
  2. ย้ายโค้ดทั้งหมดจาก `src/lib/gemini.js` ไปไว้ใน Function นี้ (ใช้ `env.GEMINI_API_KEY` แทน `VITE_`)
  3. ใน Function นี้: เช็ค Token ผู้ใช้ -> ดึงข้อมูลเครดิตปัจจุบันจาก Supabase -> ถ้ามีเครดิต > 0 ให้สั่งรัน Gemini -> หักเครดิตออก 1 -> คืนค่า JSON กลับไปให้ Frontend
  4. ตั้งค่า RLS (Row Level Security) ใน Supabase เพื่อป้องกันไม่ให้ผู้ใช้อัปเดตคอลัมน์ `credits` ของตัวเองจากหน้าเว็บโดยตรง
* **Affected Files:**
  - `src/lib/gemini.js` [DELETE]
  - `src/pages/CreateScript.jsx` [MODIFY]
  - `functions/api/generate.js` [NEW]

### [PAY-01] สร้างระบบป้องกัน Webhook ซ้ำซ้อน (Stripe Idempotency)
* **Priority:** 2 🟠 HIGH
* **Category:** Payment
* **Problem:** ขาดการป้องกัน Webhook Duplicate Events และมีโค้ดเก่าตกค้างจากระบบ Subscription
* **Recommended Solution:**
  1. สร้างตาราง `webhook_events` ใน Supabase ที่มีคอลัมน์ `id` (Primary Key, เก็บ stripe event_id)
  2. ใน `webhook.js` ก่อนจะรันโค้ดบวกเครดิต ให้เช็คก่อนว่ามี `event.id` นี้ในฐานข้อมูลหรือยัง ถ้ามีแล้วให้ Return 200 ข้ามไปเลย
  3. ลบ Logic ของ `invoice.payment_succeeded` และ `customer.subscription.deleted` ออกให้หมด เนื่องจากโปรเจกต์หันมาใช้ระบบ One-Time Payment แล้ว ป้องกันความสับสน
* **Affected Files:**
  - `functions/api/webhook.js` [MODIFY]
  - Supabase Database [SCHEMA UPDATE]

### [ARCH-01] ย้าย Web Scraper (Jina AI) ไปที่ Backend
* **Priority:** 3 🟡 MEDIUM
* **Category:** Reliability
* **Problem:** ดึงข้อมูลผ่านเบราว์เซอร์อาจพังจาก CORS
* **Recommended Solution:** ย้ายการเรียก `https://r.jina.ai` เข้าไปทำงานใน `/functions/api/generate.js` ควบคู่กันไปเลย การยิงผ่าน Server จะมีความเสถียรกว่ามากและซ่อนกลไกการทำงานจากคู่แข่งได้
* **Affected Files:**
  - `src/pages/CreateScript.jsx` [MODIFY]
  - `functions/api/generate.js` [MODIFY]

---

## 5. สรุปสิ่งที่ AI Developer ต้องทำในรอบถัดไป (Developer Handoff)

เมื่อเริ่มทำงานในรอบถัดไป โปรดปฏิบัติตามคำสั่งนี้:
1. สร้างไฟล์ `functions/api/generate.js` เพื่อทำหน้าที่เป็นตัวกลาง (Proxy) ระหว่างหน้าเว็บและ Google Gemini
2. ย้าย `import.meta.env.VITE_GEMINI_API_KEY` ออก เปลี่ยนไปใช้ Secret `env.GEMINI_API_KEY` ใน Cloudflare แทน
3. เปลี่ยน `CreateScript.jsx` ให้ส่ง Request มาที่ `/api/generate` แทนการเรียก Gemini ตรงๆ
4. นำการหักโควต้าเครดิต (Credit Deduction) มาทำบน Backend อย่างรัดกุม 
5. แก้ไข `webhook.js` ให้รองรับ Idempotency และทำความสะอาดโค้ด Subscription เก่าทิ้ง
6. ห้ามแก้ไขหรือเปลี่ยน Prompt และกติกา `gemini-3.6-flash` ตามกฎที่มีใน `GEMINI.md` เด็ดขาด
