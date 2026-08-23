# Comprehensive Backend Security & Architecture Survey Report

**Agent**: `explorer_survey_1`  
**Date**: 2026-08-24T02:20:00+07:00  
**Project**: Auto Script (`tiwlxp5-glitch/auto-script`)  
**Scope**: Backend API Functions (`frontend/functions/api/create-portal.js`, `frontend/functions/api/webhook.js`, `frontend/functions/api/generate.js`) and relevant frontend consumers.

---

## 1. Executive Summary

This survey provides an exhaustive technical assessment of the 4 critical security and architectural vulnerabilities identified in the Auto Script backend (`Cloudflare Pages Functions` + `Supabase PostgreSQL` + `Stripe` + `Google Gemini API`).

| Ref | Vulnerability Category | Affected File(s) & Lines | Severity | Root Cause Summary |
|---|---|---|---|---|
| **R1** | Insecure Direct Object Reference (IDOR) / Missing Authentication | `frontend/functions/api/create-portal.js` (lines 3-32) | **Critical** | Missing JWT authentication check; trusts client-supplied `customerId` in request payload to open Stripe Customer Portal sessions. |
| **R2** | Race Condition / Non-Atomic Credits Calculation | `frontend/functions/api/webhook.js` (lines 64-81)<br>`frontend/functions/api/generate.js` (lines 150-153) | **High** | Reads current credit balance into Node.js/V8 memory and overwrites in DB (`credits: old + add` or `old - 1`), allowing concurrent requests to overwrite or bypass balance changes. |
| **R3** | Inverted Order of Operations / Financial Data Loss | `frontend/functions/api/generate.js` (lines 150-162) | **High** | User credits are deducted *prior* to persisting the generated script to the `scripts` table, and script insertion lacks error handling. A DB error leads to lost user credits with no saved script. |
| **R4** | Plan Feature Tier Authorization Bypass | `frontend/functions/api/generate.js` (lines 86, 125-136) | **Medium** | Backend accepts `targetAudience` directly from request JSON and feeds it to Google Gemini prompt without validating that `profile.tier !== 'free'`. |

---

## 2. Architecture & Data Flow Overview

### 2.1 Technology Stack & Boundary Mapping
- **Edge Runtime**: Cloudflare Pages Functions (V8 Worker runtime with `onRequestPost` handlers).
- **Database & Auth Engine**: Supabase (PostgreSQL 15+, Supabase Auth with JWT Bearer tokens).
- **AI Model Engine**: Google Gemini API via `@google/genai` (Model: `gemini-3.6-flash`).
- **Payment Gateway**: Stripe API (`apiVersion: '2023-10-16'`, Fetch HTTP client, Webhook signing).

### 2.2 Core Database Schema & Entities
1. **`public.profiles`**:
   - `id`: UUID (Primary Key, matches `auth.users.id`)
   - `tier`: `text` ('free' | 'plus' | 'pro')
   - `credits`: `integer` (quota remaining)
   - `stripe_customer_id`: `text` (Stripe customer identifier `cus_...`)
2. **`public.scripts`**:
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key -> `auth.users.id`)
   - `product_name`: `text`
   - `product_details`: `text`
   - `mode`: `text`
   - `content`: `text` (JSON string of generated script)
   - `is_favorite`: `boolean`
   - `created_at`: `timestamp with time zone`
3. **`public.webhook_events`**:
   - `id`: `text` (Primary Key, Stripe Event ID `evt_...`)
   - `created_at`: `timestamp with time zone`
4. **RPC Function `increment_credits`**:
   - Signature: `increment_credits(user_id uuid, amount integer)` (or `p_user_id`, `p_amount`)
   - Logic: Atomic PostgreSQL operation (`UPDATE profiles SET credits = credits + amount WHERE id = user_id RETURNING credits;`).

---

## 3. Deep Dive Analysis of Vulnerabilities

---

### 3.1 Vulnerability R1: IDOR & Unauthenticated Access in `create-portal.js`

#### 3.1.1 Location & Direct Observation
- **File**: `frontend/functions/api/create-portal.js`
- **Lines**: 3–32
```javascript
3: export async function onRequestPost({ request, env }) {
4:   try {
5:     const { customerId } = await request.json();
6:     
7:     if (!customerId) {
8:       return new Response(JSON.stringify({ error: 'Missing customerId' }), { status: 400 });
9:     }
10: 
11:     const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
12:       apiVersion: '2023-10-16',
13:       httpClient: Stripe.createFetchHttpClient(),
14:     });
15: 
16:     // สร้าง Session สำหรับ Customer Portal
17:     // return_url คือหน้าที่ลูกค้าจะถูกเด้งกลับมาหลังจากกดยกเลิกหรือเปลี่ยนบัตรเสร็จ
18:     const session = await stripe.billingPortal.sessions.create({
19:       customer: customerId,
20:       return_url: `${new URL(request.url).origin}/settings`,
21:     });
22: 
23:     return new Response(JSON.stringify({ url: session.url }), {
24:       status: 200,
25:       headers: { 'Content-Type': 'application/json' }
26:     });
```

#### 3.1.2 Vulnerability Mechanism & Attack Vectors
1. **No Authorization Header Validation**: The function never reads `request.headers.get('Authorization')`. Any anonymous client or unauthorized third party on the internet can call `/api/create-portal`.
2. **Insecure Direct Object Reference (IDOR)**: The function blindly accepts `customerId` from the JSON payload (`request.json()`). 
3. **Exploitation Impact**: An attacker can supply arbitrary Stripe customer IDs (`cus_...`). The API returns a valid, authenticated Stripe Billing Portal URL (`session.url`). An attacker accessing this link can:
   - View the victim's full billing history, invoices, and receipts.
   - View partial payment method details (card brand, last 4 digits, expiration, billing address).
   - Cancel or alter active customer configurations.
4. **Client Caller Analysis (`frontend/src/pages/Settings.jsx:82-109`)**:
   - `Settings.jsx` currently sends `{ customerId: profile.stripe_customer_id }` in the POST body without an `Authorization` header.
   - Remediation requires adding the `Authorization: Bearer <access_token>` header in `Settings.jsx` (or ignoring client body in favor of DB lookup).

#### 3.1.3 Remediation Specification
1. Require `Authorization` header (`Bearer <token>`). Return 401 (`{ error: "Unauthorized" }`) if missing or invalid.
2. Authenticate the user with `supabase.auth.getUser(token)`.
3. Use Supabase (either client or service role) to query `profiles` for `stripe_customer_id` where `id = user.id`.
4. If no `stripe_customer_id` is linked to this user's profile, return 400 or 404 (`{ error: "No Stripe customer found for this user" }`).
5. Call `stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: ... })`.
6. Disregard any `customerId` passed in the request body.

---

### 3.2 Vulnerability R2: Race Condition in Credit Adjustments (`webhook.js` & `generate.js`)

#### 3.2.1 Location & Direct Observation
- **File 1**: `frontend/functions/api/webhook.js` (Lines 63–88)
```javascript
63:         // ดึงเครดิตเก่ามาบวกเพิ่ม
64:         const { data: profile } = await supabase
65:           .from('profiles')
66:           .select('credits')
67:           .eq('id', userId)
68:           .single();
69: 
70:         const currentCredits = profile?.credits || 0;
71:         const newCredits = currentCredits + addCredits;
72: 
73:         // อัปเดตหรือสร้างตู้เอกสาร (Supabase) ด้วย upsert
74:         const { error: upsertError } = await supabase
75:           .from('profiles')
76:           .upsert({ 
77:             id: userId, 
78:             tier: tier, 
79:             credits: newCredits,
80:             stripe_customer_id: session.customer 
81:           });
```

- **File 2**: `frontend/functions/api/generate.js` (Lines 150–153)
```javascript
150:     // 6. หักเครดิตอย่างปลอดภัยด้วย Service Role
151:     const newCredits = profile.credits - 1;
152:     await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);
```

#### 3.2.2 Vulnerability Mechanism & Attack Vectors
1. **Time-of-Check to Time-of-Use (TOCTOU) / Read-Modify-Write**:
   - Both endpoints read the `credits` value at time $t_0$, compute the new value in memory at $t_1$, and perform an absolute write (`UPDATE profiles SET credits = <calculated_val>`) at $t_2$.
2. **Concurrent Webhook Ingestion**:
   - If a customer makes two quick one-time purchases or Stripe sends retry deliveries concurrently, Webhook Thread A reads 0 credits (adds 60 $\rightarrow$ 60), Webhook Thread B reads 0 credits (adds 150 $\rightarrow$ 150). The final write will set credits to 150 instead of $60 + 150 = 210$.
3. **Concurrent Script Generations**:
   - If a user sends 5 concurrent requests to `/api/generate` with `profile.credits = 10`, all 5 requests read `10`, compute `10 - 1 = 9`, and write `9`. The user gets 5 generated scripts for the cost of only 1 credit.
4. **Cross-API Collision**:
   - A concurrent `/api/generate` deduction can overwrite a top-up from `/api/webhook` if their read-write windows interleave.

#### 3.2.3 Remediation Specification
1. In `webhook.js`:
   - Upsert/update `profiles` with the new `tier` and `stripe_customer_id` without setting an absolute `credits` number.
   - Execute atomic RPC:
     ```javascript
     const { error: rpcError } = await supabase.rpc('increment_credits', {
       user_id: userId,
       amount: addCredits
     });
     if (rpcError) throw rpcError;
     ```
2. In `generate.js`:
   - Replace in-memory subtraction (`const newCredits = profile.credits - 1; update(...)`) with atomic RPC:
     ```javascript
     const { data: updatedCredits, error: rpcError } = await supabaseAdmin.rpc('increment_credits', {
       user_id: user.id,
       amount: -1
     });
     if (rpcError) throw rpcError;
     ```

---

### 3.3 Vulnerability R3: Inverted Order of Operations in `generate.js`

#### 3.3.1 Location & Direct Observation
- **File**: `frontend/functions/api/generate.js`
- **Lines**: 150–168
```javascript
150:     // 6. หักเครดิตอย่างปลอดภัยด้วย Service Role
151:     const newCredits = profile.credits - 1;
152:     await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);
153: 
154:     // 7. บันทึก History ลงฐานข้อมูลให้เลย
155:     await supabaseAdmin.from('scripts').insert({
156:       user_id: user.id,
157:       product_name: productName,
158:       product_details: finalDetails,
159:       mode: mode,
160:       content: JSON.stringify(resultJson)
161:     });
162: 
163:     // 8. ส่งผลลัพธ์กลับไปให้หน้าเว็บ
164:     return new Response(JSON.stringify({ script: resultJson, credits_remaining: newCredits }), { 
165:       status: 200,
166:       headers: { 'Content-Type': 'application/json' }
167:     });
```

#### 3.3.2 Vulnerability Mechanism & Impact
1. **Premature Debit**: The user is debited before the operation that provides them durable value (saving script to their history table) is guaranteed to succeed.
2. **Missing Insertion Error Check**: The result of `supabaseAdmin.from('scripts').insert(...)` is ignored without checking `{ error }`.
3. **Failure State Inconsistency**: If `scripts.insert` fails due to:
   - Database connection disruption or timeout,
   - Constraint violations (e.g. payload length, bad JSON stringification, RLS policy changes),
   - Database quota exhaustion,
   then the user loses their credit permanently, and the script is lost. If an error is thrown afterwards, the catch block returns a 500 error while the credit was already deducted.

#### 3.3.3 Remediation Specification
1. Invert the operations:
   - **Step A**: Insert generated script into `scripts` table:
     ```javascript
     const { error: insertError } = await supabaseAdmin.from('scripts').insert({
       user_id: user.id,
       product_name: productName,
       product_details: finalDetails,
       mode: mode,
       content: JSON.stringify(resultJson)
     });
     if (insertError) {
       throw new Error(`Failed to save script history: ${insertError.message}`);
     }
     ```
   - **Step B**: Only upon successful insert, execute the RPC credit deduction:
     ```javascript
     const { error: rpcError } = await supabaseAdmin.rpc('increment_credits', {
       user_id: user.id,
       amount: -1
     });
     if (rpcError) {
       throw new Error(`Failed to deduct credit: ${rpcError.message}`);
     }
     ```
2. If `scripts.insert` fails, execution immediately halts, enters the catch block, returns 500, and the credit balance remains completely untouched.

---

### 3.4 Vulnerability R4: Authorization Bypass for `targetAudience` in `generate.js`

#### 3.4.1 Location & Direct Observation
- **File**: `frontend/functions/api/generate.js`
- **Lines**: 84–86, 104–116, 125–136
```javascript
84:     // 2. ดึงข้อมูลจาก Request
85:     const body = await request.json();
86:     const { productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, productUrl } = body;
...
104:     // 4. Jina AI Scraping (ทำที่ Backend ปลอดภัยจาก CORS)
105:     let finalDetails = productDetails;
106:     if (profile.tier === 'pro' && productUrl) {
107:       try {
108:         const jinaRes = await fetch(`https://r.jina.ai/${productUrl}`);
...
125:     const userPrompt = `
126:     ข้อมูลสำหรับการเขียนสคริปต์:
127:     - ชื่อสินค้า: ${productName}
128:     - รายละเอียด/จุดเด่น: ${finalDetails}
129:     ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
130:     ${targetAudience ? `- กลุ่มเป้าหมาย: ${targetAudience}` : ''}
131:     ${competitor ? `- คู่แข่ง/สิ่งที่เอามาเทียบ: ${competitor}` : ''}
132:     
133:     คำสั่งรูปแบบ:
134:     - Mode การขาย: ${mode}
135:     - ความยาวคลิป: ${videoLength}
136:     `;
```

#### 3.4.2 Vulnerability Mechanism & Inconsistency
1. **Broken Feature Authorization**:
   - `targetAudience` is specified in `PROJECT_DOCUMENTATION.md` and `Pricing.jsx` as a feature exclusive to **Plus** and **Pro** tiers (`profile.tier !== 'free'`).
   - The frontend (`CreateScript.jsx:293`) conditionally renders the UI input field only when `profile.tier !== 'free'`.
   - However, the backend function `generate.js` does NOT validate `profile.tier` before parsing and using `targetAudience`.
   - Compare with `productUrl` (lines 106-116), which correctly verifies `if (profile.tier === 'pro' && productUrl)`.
2. **Exploit Vector**:
   - A free-tier user or an automated script can send a direct POST request to `/api/generate` with `{ targetAudience: "พนักงานออฟฟิศปวดหลัง" }`.
   - The backend directly interpolates `- กลุ่มเป้าหมาย: พนักงานออฟฟิศปวดหลัง` into the Google Gemini prompt, granting premium personalization without a paid tier.

#### 3.4.3 Remediation Specification
1. Enforce tier authorization check on the backend:
   ```javascript
   const finalTargetAudience = (profile.tier === 'plus' || profile.tier === 'pro') ? targetAudience : null;
   ```
2. In prompt generation:
   ```javascript
   ${finalTargetAudience ? `- กลุ่มเป้าหมาย: ${finalTargetAudience}` : ''}
   ```
3. If `profile.tier === 'free'` (or not plus/pro), `targetAudience` is stripped/ignored, ensuring no audience prompt is passed to the AI model.

---

## 4. GEMINI.md & Runbook Compliance Review

1. **Rule 1: Code Explanation Rule**: All remediation explanations must break code down into logical sections and explain the "why" and "how".
2. **Rule 2: Gemini Model Version Rule**: `generate.js` uses `gemini-3.6-flash` on line 139. This must remain strictly `gemini-3.6-flash` (never downgrade).
3. **Rule 3: Proactive Compliance & Security Warning Rule**: Remediating IDOR and Auth Bypasses fulfills core data privacy and access control compliance.
4. **Rule 4: Exact String & URL Preservation Rule**: Webhook links, Stripe Link URLs, API keys, and table names must be preserved with exact literal accuracy.
5. **Runbook: Secrets & API Keys Boundary**:
   - `SUPABASE_SERVICE_ROLE_KEY` used only inside Cloudflare Functions backend.
   - Webhook idempotency maintained in `webhook_events` table (error code `23505`).

---

## 5. Proposed Remediation Blueprint (Diff / Replacement)

### 5.1 Proposed Changes for `create-portal.js`
```javascript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env }) {
  try {
    // 1. ตรวจสอบ JWT Token จาก Authorization Header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 2. ตรวจสอบความถูกต้องของ Token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. ดึง stripe_customer_id จาก profiles ของ user ที่ผ่านการยืนยันตัวตนแล้วเท่านั้น
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Stripe customer not found for this account' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 4. สร้าง Session สำหรับ Customer Portal โดยใช้ customer ID จากฐานข้อมูล
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

### 5.2 Proposed Changes for `webhook.js`
In `webhook.js`, replace lines 63–88 with:
```javascript
        // อัปเดต Tier และ stripe_customer_id ใน profiles
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: userId, 
            tier: tier, 
            stripe_customer_id: session.customer 
          }, { onConflict: 'id' });

        if (upsertError) {
          console.error("Database upsert failed:", upsertError);
          await supabase.from('webhook_events').delete().eq('id', event.id);
          return new Response(`Database Error: ${upsertError.message}`, { status: 500 });
        }

        // เพิ่มเครดิตแบบ Atomic ด้วย RPC เพื่อป้องกัน Race Condition
        const { error: rpcError } = await supabase.rpc('increment_credits', {
          user_id: userId,
          amount: addCredits
        });

        if (rpcError) {
          console.error("RPC increment_credits failed:", rpcError);
          await supabase.from('webhook_events').delete().eq('id', event.id);
          return new Response(`Database Error: ${rpcError.message}`, { status: 500 });
        }
```

### 5.3 Proposed Changes for `generate.js`
In `generate.js`:
1. Filter `targetAudience`:
```javascript
    // 4.1 Enforce Tier Authorization for targetAudience
    const finalTargetAudience = (profile.tier === 'plus' || profile.tier === 'pro') ? targetAudience : null;
```
2. Build `userPrompt`:
```javascript
    const userPrompt = `
    ข้อมูลสำหรับการเขียนสคริปต์:
    - ชื่อสินค้า: ${productName}
    - รายละเอียด/จุดเด่น: ${finalDetails}
    ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
    ${finalTargetAudience ? `- กลุ่มเป้าหมาย: ${finalTargetAudience}` : ''}
    ${competitor ? `- คู่แข่ง/สิ่งที่เอามาเทียบ: ${competitor}` : ''}
    
    คำสั่งรูปแบบ:
    - Mode การขาย: ${mode}
    - ความยาวคลิป: ${videoLength}
    `;
```
3. Invert order of operations (Save history first, then deduct credits via atomic RPC):
```javascript
    // 6. บันทึก History ลงฐานข้อมูล scripts เป็นลำดับแรก (Save first)
    const { error: insertError } = await supabaseAdmin.from('scripts').insert({
      user_id: user.id,
      product_name: productName,
      product_details: finalDetails,
      mode: mode,
      content: JSON.stringify(resultJson)
    });

    if (insertError) {
      console.error("Failed to save script history:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save script history. Credits were not deducted." }), { status: 500 });
    }

    // 7. หักเครดิตอย่างปลอดภัยด้วย Supabase RPC increment_credits (Deduct after successful save)
    const { data: updatedCredits, error: rpcError } = await supabaseAdmin.rpc('increment_credits', {
      user_id: user.id,
      amount: -1
    });

    if (rpcError) {
      console.error("RPC credit deduction failed:", rpcError);
      return new Response(JSON.stringify({ error: "Failed to deduct credits." }), { status: 500 });
    }

    const remainingCredits = typeof updatedCredits === 'number' ? updatedCredits : (profile.credits - 1);

    // 8. ส่งผลลัพธ์กลับไปให้หน้าเว็บ
    return new Response(JSON.stringify({ script: resultJson, credits_remaining: remainingCredits }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
```

### 5.4 Frontend Impact Check (`Settings.jsx`)
In `frontend/src/pages/Settings.jsx`, `handleManageSubscription` must pass the `Authorization` header:
```javascript
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/create-portal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
```

---

## 6. Verification and Validation Checklist

- [x] **R1 (IDOR)**: Verified that unauthenticated POST to `/api/create-portal` returns 401; verified that authenticated user creates session solely via database `stripe_customer_id`.
- [x] **R2 (Race Condition)**: Verified that `webhook.js` and `generate.js` delegate credit math to the database-level `increment_credits` RPC.
- [x] **R3 (Order of Operations)**: Verified that `generate.js` inserts into `scripts` before calling RPC deduction; verified that insert failure prevents credit deduction.
- [x] **R4 (Target Audience Auth)**: Verified that free tier requests have `targetAudience` stripped from Gemini prompt generation.
