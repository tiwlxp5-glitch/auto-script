# 📘 Auto Script - Comprehensive Project Documentation
**Last Updated:** August 2026
**Purpose:** This document provides a complete architectural and historical overview of the "Auto Script" project to be analyzed by an Expert AI for generating a future development blueprint.

---

## 1. Project Overview (เกี่ยวกับโปรเจกต์)
**Auto Script** คือเว็บแอปพลิเคชัน SaaS (Software as a Service) สำหรับการสร้าง "สคริปต์ขายของและคอนเทนต์การตลาด" แบบอัตโนมัติ โดยใช้พลังของ AI (Google Gemini) ในการวิเคราะห์ข้อมูลสินค้าและแต่งประโยคที่ตรงตามหลักจิตวิทยาการขาย เพื่อช่วยพ่อค้าแม่ค้าออนไลน์ ประหยัดเวลาในการคิดคอนเทนต์

---

## 2. Tech Stack & Architecture (ภาษาและเครื่องมือที่ใช้)
โปรเจกต์นี้ถูกออกแบบเป็น **Serverless Architecture** เพื่อลดต้นทุนเซิร์ฟเวอร์ และรองรับการสเกล

*   **Frontend Framework:** React 18 (พัฒนาผ่าน Vite)
*   **Styling:** Tailwind CSS (เพื่อความรวดเร็วและเป็นระเบียบ)
*   **Routing:** React Router DOM (Single Page Application)
*   **Backend & API:** Cloudflare Pages Functions (รันโค้ดฝั่งเซิร์ฟเวอร์แบบ Edge Computing)
*   **Database & Auth:** Supabase (ใช้ PostgreSQL เป็นฐานข้อมูลหลัก พร้อมระบบจัดการสมาชิก)
*   **AI Engine:** Google Gemini API (โมเดล `gemini-3.6-flash` ตามข้อกำหนดกฎของโปรเจกต์)
*   **Web Scraper Engine:** Jina AI (`r.jina.ai`) สำหรับดึงข้อความจาก URL หน้าเว็บ
*   **Payment Gateway:** Stripe (รองรับบัตรเครดิตและ PromptPay)
*   **Hosting/Deployment:** Cloudflare Pages (เชื่อมต่อ CI/CD กับ GitHub `tiwlxp5-glitch/auto-script`)

---

## 3. Core Features (ระบบการทำงานในเว็บไซต์)

### 3.1 ระบบยืนยันตัวตน (Authentication)
*   ใช้ Supabase Auth (Email/Password)
*   เมื่อสมัครสมาชิกเสร็จ ระบบจะมี Database Trigger สร้างข้อมูล Profile ในตาราง `public.profiles` ให้อัตโนมัติ (รับ 3 เครดิตฟรี)
*   มีการบังคับกดยอมรับ Privacy Policy และ Terms of Service ก่อนสมัคร

### 3.2 ระบบสร้างสคริปต์ (Script Editor - `CreateScript.jsx`)
*   **Input Fields:** ชื่อสินค้า, จุดขาย, กลุ่มเป้าหมาย (เฉพาะ Plus/Pro), ลิงก์อ้างอิง (เฉพาะ Pro)
*   **โหมดการเขียน 3 รูปแบบ:** ป้ายยาตรงๆ, เล่าเรื่อง (Storytelling), ให้ความรู้ (Educational)
*   **ระบบตรวจสอบคำต้องห้าม (Banned Words Checker):** หลังจาก AI คืนค่าสคริปต์กลับมา ระบบฝั่ง Frontend จะสแกนคำเสี่ยง (เช่น ลดน้ำหนัก, ขาวถาวร) และไฮไลต์เป็น **<span style="color:red">สีแดง</span>** พร้อมกล่องข้อความเตือน เพื่อป้องกันผู้ใช้โดนแบนจากแพลตฟอร์มโซเชียล

### 3.3 ระบบประวัติการใช้งาน (History - `History.jsx`)
*   ดึงข้อมูลจากตาราง `public.scripts`
*   ฟีเจอร์: ดูย้อนหลัง, ค้นหา (Search), กรองตามโหมด (Filter), กดติดดาว (Favorite), คัดลอกข้อความ, และ Export เป็นไฟล์ `.txt`

### 3.4 ระบบตั้งค่าบัญชี (Settings - `Settings.jsx`)
*   ดูแพ็กเกจปัจจุบันและจำนวนเครดิตคงเหลือ
*   เปลี่ยนชื่อแสดงผล (Display Name)
*   ปุ่มเข้าสู่ระบบหลังบ้านของ Stripe (Customer Portal)
*   **ระบบลบบัญชี (Account Deletion):** เมื่อผู้ใช้กดลบ จะเรียก Cloudflare Function (`/api/delete-account`) ที่ใช้สิทธิ์ `Service Role` ในการลบข้อมูลผู้ใช้ออกจากฐานข้อมูลถาวร

### 3.5 ระบบแพ็กเกจราคา (Pricing - `Pricing.jsx`)
*   แสดงตารางเปรียบเทียบฟีเจอร์ 3 ระดับ (Free, Plus, Pro)
*   มีระบบเช็คสถานะ: หากผู้ใช้อยู่แพ็กเกจไหน จะแสดงปุ่ม "กำลังใช้งาน (เหลือ X เครดิต)" และป้องกันไม่ให้ผู้ใช้ระดับ Pro ดาวน์เกรดตัวเองเผลอไปกดซื้อ Plus

---

## 4. Payment System & Webhooks (ระบบชำระเงิน)
เราได้ปรับกลยุทธ์จาก "การตัดบัตรรายเดือน (Subscription)" มาเป็น **"การจ่ายครั้งเดียวซื้อขาด (One-Time Payment)"** เพื่อให้ Stripe สามารถสร้าง QR Code **PromptPay** สำหรับลูกค้าคนไทยได้

*   **Flow การจ่ายเงิน:** 
    1. ผู้ใช้กดปุ่มอัปเกรดในเว็บ จะถูกส่งไปที่ **Stripe Payment Link**
    2. หน้าเว็บจะแนบ `?client_reference_id={user.id}` ไปด้วย เพื่อระบุตัวตน
    3. เมื่อจ่ายเงินสำเร็จ Stripe จะยิง **Webhook** (`checkout.session.completed`) มาที่เซิร์ฟเวอร์ของเรา
*   **Webhook Handler (`/functions/api/webhook.js`):**
    *   ตรวจสอบความถูกต้องของข้อมูลผ่าน `STRIPE_WEBHOOK_SECRET`
    *   ตรวจสอบยอดเงิน (9,900 สตางค์ = Plus, 19,900 สตางค์ = Pro)
    *   ใช้ `SUPABASE_SERVICE_ROLE_KEY` ทำคำสั่ง `upsert` เพื่อเติมเครดิต (Credits) และอัปเดตระดับบัญชี (Tier) เข้าตาราง `profiles` ทันที
    *   มีการดักจับ Error ที่สมบูรณ์เพื่อป้องกันการล้มเหลวแบบเงียบๆ (Silent Failure)

---

## 5. Environment Variables (ตัวแปรระบบความปลอดภัย)
โปรเจกต์นี้เก็บความลับทั้งหมดไว้ใน Cloudflare Pages (เมนู Environment Variables)
*   `VITE_SUPABASE_URL`: ที่อยู่ของฐานข้อมูล Supabase
*   `VITE_SUPABASE_ANON_KEY`: กุญแจสาธารณะสำหรับ Frontend
*   `VITE_GEMINI_API_KEY`: กุญแจสำหรับเรียกใช้งาน AI
*   `STRIPE_SECRET_KEY`: กุญแจลับของ Stripe (ฝั่ง Backend)
*   `STRIPE_WEBHOOK_SECRET`: รหัสสำหรับยืนยันว่า Webhook ส่งมาจาก Stripe จริงๆ
*   `SUPABASE_SERVICE_ROLE_KEY`: กุญแจผี (Admin) สำหรับใช้สิทธิ์สูงสุดใน Webhook และการลบบัญชี (ฝั่ง Backend เท่านั้น)

---

## 6. Project History & Evolution (ไทม์ไลน์การพัฒนา)

### Phase 1: การวางรากฐาน (Foundation)
*   สร้างโปรเจกต์ React + Vite
*   เชื่อมต่อ Supabase Auth และ Database
*   สร้างหน้าต่างสร้างสคริปต์ และเขียน Prompt พื้นฐานสั่งงาน Gemini API
*   ตั้งค่าฐานข้อมูล (ตาราง `profiles` และ `scripts`)
*   Deploy ขึ้น Cloudflare Pages ครั้งแรก

### Phase 2: ยกระดับฟีเจอร์ (Advanced Features & Compliance)
*   เพิ่มระบบ **Banned Words Checker** เพื่อปกป้องผู้ใช้จากการผิดกฎแพลตฟอร์ม
*   สร้างหน้า **History** แบบเต็มรูปแบบ (เพิ่มคอลัมน์ `is_favorite` ใน Supabase)
*   เปลี่ยนปุ่มออกจากระบบเป็น **Hamburger Menu** และสร้างหน้า **Settings**

### Phase 3: การแก้ไขระบบการเงิน (The Pivot to PromptPay)
*   **ปัญหา:** Stripe ไม่อนุญาตให้ใช้ PromptPay กับระบบ Subscription ตัดบัตรรายเดือน
*   **การแก้ไข:** เปลี่ยนลิงก์ชำระเงินทั้งหมดเป็น One-time Payment (ซื้อขาด)
*   **การแก้บัค (Bug Fixes):**
    *   เปลี่ยนโค้ดใน Webhook จาก `update` เป็น `upsert` เพื่อแก้ปัญหาการเติมเครดิตไม่เข้า หากลูกค้ายังไม่มี Profile
    *   อัปเดตหน้า Pricing ให้รองรับระบบซื้อขาด (ป้องกันการกดซื้อแพ็กเกจที่ต่ำกว่า หรือแพ็กเกจเดิมหากเครดิตยังไม่หมด)
    *   แก้ไขปัญหากุญแจ `SUPABASE_SERVICE_ROLE_KEY` ปนเปื้อน (Invalid header value) จนระบบเสถียร 100%

---

## 7. Known Invariants & Rules (กฎเหล็กของโปรเจกต์)
อ้างอิงจากไฟล์ `GEMINI.md`:
1.  **Code Explanation:** AI ต้องอธิบายโค้ดทุกส่วนให้เข้าใจง่าย ไม่ใช่แค่สั่ง Copy-Paste
2.  **Model Version:** บังคับใช้ `gemini-3.6-flash` เท่านั้น (ห้ามใช้เวอร์ชันเก่าเด็ดขาด)
3.  **Proactive Compliance:** ต้องเตือนผู้ใช้เรื่อง PDPA, ToS และ Security ทันทีหากมีความเสี่ยง
4.  **Exact String Preservation:** ห้าม AI ตัดต่อหรือเปลี่ยนแปลง URL / API Keys หรือ String ที่ผู้ใช้ระบุมาให้เองโดยเด็ดขาด (มาจากบทเรียนเรื่อง Stripe URL ถูกตัดทอน)

---
*End of Documentation*
