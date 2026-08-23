# Handoff Report — worker_m1

**Milestone**: M1 — Fix IDOR & Missing Authentication in `create-portal.js` and update `Settings.jsx`  
**Date**: 2026-08-24T02:24:00+07:00  
**Status**: COMPLETED  

---

## 1. Observation

Direct code observations before changes:
1. `frontend/functions/api/create-portal.js`:
   - Lines 5-9 previously read: `const { customerId } = await request.json(); if (!customerId) { return new Response(JSON.stringify({ error: 'Missing customerId' }), { status: 400 }); }`.
   - The endpoint had no authentication check (`request.headers.get('Authorization')` was never called).
   - Any external user or automated script could supply an arbitrary `customerId` (e.g., another customer's Stripe ID) and obtain an active Stripe Customer Portal session URL, resulting in an Insecure Direct Object Reference (IDOR) vulnerability.
2. `frontend/src/pages/Settings.jsx`:
   - Lines 91-95 previously invoked `fetch('/api/create-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: profile.stripe_customer_id }) })`.
   - The request lacked the `Authorization: Bearer <token>` header required for authenticating the user with the Cloudflare backend.

Tool Commands & Results:
- `npm run lint` (`oxlint`): Ran successfully across 21 files, reported **0 errors**.
- `npm run build` (`vite build`): Built production bundle in 248ms with **0 errors**.
- `node .agents/worker_m1/verify_m1.mjs`: Ran 5 distinct positive and negative test cases against `create-portal.js` logic with **5/5 passing**.

---

## 2. Logic Chain

### Step 1: Authentication Enforcement (The Gatekeeper)
- *Analogy*: Before entering a restricted bank vault, an identity card (JWT Token) must be presented and verified against the central registry (Supabase Auth).
- In `create-portal.js`, we inspect `request.headers.get('Authorization')`.
- If missing or not starting with `Bearer `, the function immediately rejects the request with HTTP `401 Unauthorized` (`{ error: 'Unauthorized' }`).
- The JWT token is validated against Supabase Auth via `supabaseAdmin.auth.getUser(token)`. If the token is invalid or expired, HTTP `401` is returned.

### Step 2: IDOR Elimination via Database Single-Source-of-Truth
- *Analogy*: Instead of letting a customer declare "My account number is 12345", the system looks up the authenticated user's account number directly from the secure central database ledger (`profiles.stripe_customer_id`).
- Using the authenticated `user.id`, we query `public.profiles` using `supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', user.id).single()`.
- If the user does not have a linked Stripe customer ID (e.g., a free tier user), the API returns HTTP `400 Bad Request` with `{ error: 'No Stripe customer found for this account' }`.
- Any client payload containing `customerId` is completely ignored, eliminating any possibility of IDOR exploitation.

### Step 3: Stripe Billing Portal Session Generation
- Using the server-retrieved `profile.stripe_customer_id`, we call `stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: ... })`.
- The resulting Stripe portal URL is returned to the client (`{ url: session.url }`) with HTTP `200 OK`.

### Step 4: Frontend Caller Integration (`Settings.jsx`)
- In `frontend/src/pages/Settings.jsx`, `handleManageSubscription` retrieves the current session using `await supabase.auth.getSession()`.
- It passes the `Authorization: Bearer ${session.access_token}` header to `/api/create-portal`.

---

## 3. Detailed Code Breakdown & Explanations

### 3.1 `frontend/functions/api/create-portal.js`

```javascript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env }) {
  try {
    // 1. ตรวจสอบการยืนยันตัวตน (JWT Bearer Token จาก Header)
    // เปรียบเสมือนการตรวจบัตรประชาชนที่ประตูทางเข้า เพื่อป้องกันไม่ให้บุคคลภายนอกที่ไม่ได้รับอนุญาตเข้าถึงระบบ
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 2. ตรวจสอบความถูกต้องของ Token กับ Supabase Auth
    // ส่ง Token ไปถาม Supabase ว่า Token นี้ถูกต้องและยังไม่หมดอายุใช่หรือไม่
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. ดึง stripe_customer_id จากฐานข้อมูล (profiles) โดยอิงตาม user.id ของผู้ใช้ที่ล็อกอินเท่านั้น
    // เพื่อป้องกันช่องโหว่ IDOR (Insecure Direct Object Reference) - ห้ามเชื่อถือ customerId ที่ส่งมาจาก Client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found for this account' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. เชื่อมต่อ Stripe SDK และสร้าง Customer Portal Session
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // สร้าง Session สำหรับ Customer Portal เพื่อให้ลูกค้าจัดการบัตรหรือการบอกรับสมาชิก
    // return_url คือ URL ที่ลูกค้าจะถูก Redirect กลับมาหลังจัดการเสร็จสิ้น
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${new URL(request.url).origin}/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Portal Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 3.2 `frontend/src/pages/Settings.jsx` (`handleManageSubscription`)

```javascript
  const handleManageSubscription = async () => {
    if (!profile?.stripe_customer_id) {
      alert("คุณยังไม่ได้สมัครแพ็กเกจใดๆ ครับ (คุณใช้งานแพ็กเกจฟรีอยู่)");
      return;
    }
    
    setIsLoadingPortal(true);
    try {
      // 1. ดึง Token เซสชันปัจจุบันของผู้ใช้ที่ล็อกอินอยู่จาก Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        navigate('/login');
        return;
      }

      // 2. เรียก Cloudflare Function พร้อมแนบ Authorization Header (Bearer Token)
      // ไม่ต้องส่ง customerId ใน Request Body เพื่อป้องกันการปลอมแปลงข้อมูล (IDOR)
      const res = await fetch('/api/create-portal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // นำทางผู้ใช้ไปยัง Stripe Billing Portal
      } else {
        alert("ไม่สามารถสร้างลิงก์จัดการแพ็กเกจได้: " + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe");
    } finally {
      setIsLoadingPortal(false);
    }
  };
```

---

## 4. Caveats

No caveats. All requirements for Milestone 1 are completely implemented and verified with zero dependency on client-provided customer identifiers.

---

## 5. Conclusion

Milestone 1 has successfully remediated the IDOR and missing authentication vulnerabilities:
- `POST /api/create-portal` strictly requires a valid Bearer JWT.
- User identity is verified against Supabase Auth.
- `stripe_customer_id` is fetched exclusively from the database.
- Any client-submitted customer ID is ignored.
- `Settings.jsx` sends the Bearer access token upon user interaction.
- Linter and build commands pass with 0 errors.

---

## 6. Verification Method

1. **Lint Check**:
   ```powershell
   cd "c:\Auto script\frontend"
   npm run lint
   ```
   *Expected result*: 0 errors.

2. **Build Check**:
   ```powershell
   cd "c:\Auto script\frontend"
   npm run build
   ```
   *Expected result*: Vite build succeeds with 0 errors.

3. **Automated Unit Verification**:
   ```powershell
   cd "c:\Auto script"
   node .agents/worker_m1/verify_m1.mjs
   ```
   *Expected result*: All 5 test cases pass (401 for unauthenticated/malformed/invalid token, 400 for user without stripe ID, 200 with DB customer ID when spoofed payload is provided).
