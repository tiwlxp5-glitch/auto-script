# 🔬 Specification Report: Critical Security & Architecture Requirements

**Author:** spec_miner_survey_3  
**Project:** Auto Script (Cloudflare Pages Functions + Supabase + Google Gemini + Stripe)  
**Date:** 2026-08-24  
**Integrity Mode:** Development  
**Target Vulnerabilities:** R1 (IDOR in `create-portal`), R2 (Race Condition in `webhook` & `generate`), R3 (Order of Operations in `generate`), R4 (Auth Bypass on `targetAudience` in `generate`)

---

## 1. Executive Summary & Context

Auto Script is a serverless SaaS web application on Cloudflare Pages Functions and Supabase. A comprehensive security review revealed four critical architectural vulnerabilities:
1. **R1 (IDOR / Missing Auth in `/api/create-portal`):** The endpoint blindly trusts `customerId` passed in the request body from unauthenticated clients, permitting arbitrary Stripe Customer Portal session hijacking.
2. **R2 (Race Condition / Lost Updates in Credits):** `webhook.js` and `generate.js` perform non-atomic Read-Modify-Write cycles in JavaScript (`select credits` -> `math in JS` -> `update/upsert`), causing credit loss or double-spend under concurrency.
3. **R3 (Order of Operations in `/api/generate`):** `generate.js` deducts credits *before* inserting into the `scripts` table. If the database insertion fails, the user is charged a credit without receiving their saved script.
4. **R4 (Broken Tier Authorization in `/api/generate`):** `targetAudience` is a premium feature gated on the frontend, but `/api/generate` accepts and injects `targetAudience` into the Gemini AI prompt regardless of the user's tier (`free`).

This document provides the authoritative, exhaustive technical specifications, HTTP API contracts, database schemas/RPC interfaces, execution order requirements, error behaviors, and edge cases to guide implementation and dual-track testing.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Security / Auth | `/api/create-portal` JWT Verification | Authenticates caller via Supabase JWT Bearer token before generating Stripe Portal session. | `Authorization: Bearer <jwt>` | 200 OK + `{ url: string }` | 401 Unauthorized if missing/invalid token | `frontend/functions/api/create-portal.js`, `ORIGINAL_REQUEST.md` |
| 2 | Security / Access Control | `/api/create-portal` IDOR Elimination | Discards client-provided `customerId` and queries `profiles.stripe_customer_id` via Supabase Service Role for authenticated `user.id`. | Authenticated `user.id` | Stripe Portal Session URL | 400 Bad Request if no `stripe_customer_id` on profile, 404 if profile not found | `frontend/functions/api/create-portal.js`, `ORIGINAL_REQUEST.md` |
| 3 | Database / Concurrency | Supabase RPC `increment_credits` | Atomic database-level increment/decrement of user credits using PostgreSQL `UPDATE ... SET credits = COALESCE(credits, 0) + amount`. | `user_id` (UUID), `amount` (INT, positive or negative) | New credit balance (INT) | Error on DB connection failure or invalid user ID | `frontend/functions/api/webhook.js`, `frontend/functions/api/generate.js`, `ORIGINAL_REQUEST.md` |
| 4 | Payment / Webhook | Atomic Credit Top-up in `webhook.js` | Uses `increment_credits` RPC when `checkout.session.completed` fires instead of manual JS addition, while upserting tier and customer ID. | Stripe webhook payload, signature | 200 OK `{ received: true }` | 400 invalid signature, 500 DB failure (deletes event from `webhook_events` for retry) | `frontend/functions/api/webhook.js`, `SKILL.md` |
| 5 | Data Integrity | Script Insertion Precedence in `generate.js` | Saves generated script to `scripts` table *before* deducting credit. Credit is only deducted if insertion succeeds. | Script metadata, content JSON | 200 OK `{ script, credits_remaining }` | 500 error if DB insert fails; credit deduction is SKIPPED | `frontend/functions/api/generate.js`, `ORIGINAL_REQUEST.md` |
| 6 | Authorization / Tier Gating | `targetAudience` Tier Check in `generate.js` | Inspects `profile.tier` retrieved from Supabase. If `tier === 'free'`, ignores/clears `targetAudience` before prompt construction. | `targetAudience` (string), `profile.tier` | Filtered prompt passed to Gemini | Silently stripped / ignored for Free users; allowed for Plus/Pro | `frontend/functions/api/generate.js`, `ORIGINAL_REQUEST.md` |
| 7 | AI / Prompt Engine | Gemini 3.6 Flash Generation | Calls Google Gemini model `gemini-3.6-flash` with system prompt and structured JSON response formatting. | System prompt, user prompt | Valid JSON script structure | 500 if API key missing or AI call fails | `frontend/functions/api/generate.js`, `GEMINI.md` |
| 8 | Scraping / Pro Feature | Jina AI URL Scraping | Scrapes reference product URL via `r.jina.ai` only when `profile.tier === 'pro'`. | `productUrl`, `profile.tier === 'pro'` | Appended text context in `finalDetails` | Errors caught and ignored (graceful fallback) | `frontend/functions/api/generate.js`, `PROJECT_DOCUMENTATION.md` |
| 9 | Payment / Idempotency | Webhook Idempotency Check | Checks `webhook_events` table for `event.id` before processing to prevent duplicate processing. | Stripe `event.id` | 200 OK 'Already processed' on code `23505` | 500 on unexpected DB error | `frontend/functions/api/webhook.js`, `SKILL.md` |
| 10 | Security / Account Deletion | `/api/delete-account` Auth & Admin Delete | Validates caller JWT and deletes user from Supabase Auth admin API. | `Authorization: Bearer <jwt>` | 200 OK 'Account deleted' | 401 invalid token, 500 on delete failure | `frontend/functions/api/delete-account.js` |

---

## 3. Detailed Specifications for the 4 Critical Requirements

---

### Requirement 1: Fix IDOR & Missing Auth in `/api/create-portal` (`create-portal.js`)

#### 3.1.1 Problem Statement
Currently, `/api/create-portal` accepts `{ customerId }` directly from the client JSON body with zero authentication. An attacker can pass any Stripe customer ID (e.g., `cus_123456789`) and obtain an active billing portal session URL, allowing unauthorized viewing of invoices, payment methods, and subscription details.

#### 3.1.2 Specification & Workflow
1. **JWT Header Inspection:**
   - The endpoint MUST read the `Authorization` HTTP header.
   - If `Authorization` is absent, empty, or does not begin with `Bearer `, immediately return HTTP `401 Unauthorized` with JSON payload `{ "error": "Unauthorized" }` or `{ "error": "Missing or invalid authorization header" }`.
2. **Token Authentication:**
   - Extract the token via `authHeader.replace('Bearer ', '').trim()` or `authHeader.split(' ')[1]`.
   - Initialize a Supabase client using `env.VITE_SUPABASE_URL` and `env.SUPABASE_SERVICE_ROLE_KEY` (or `env.VITE_SUPABASE_ANON_KEY`).
   - Call `await supabase.auth.getUser(token)`.
   - If `userError` is returned or `!user`, return HTTP `401 Unauthorized` with JSON payload `{ "error": "Invalid token" }` or `{ "error": "Unauthorized" }`.
3. **Secure Customer ID Retrieval from Database:**
   - Extract the authenticated user's ID: `user.id`.
   - Using the Supabase Admin client (`env.SUPABASE_SERVICE_ROLE_KEY`), query the `profiles` table:
     ```javascript
     const { data: profile, error: profileError } = await supabaseAdmin
       .from('profiles')
       .select('stripe_customer_id')
       .eq('id', user.id)
       .single();
     ```
   - If `profileError` or `!profile`, return HTTP `404 Not Found` with `{ "error": "Profile not found" }`.
   - If `!profile.stripe_customer_id` (null, empty string, or undefined), the user has never purchased or has no Stripe customer record. Return HTTP `400 Bad Request` with `{ "error": "No Stripe customer found for this account" }`.
4. **Ignore Client-Supplied `customerId`:**
   - The endpoint MUST NOT use any `customerId` passed in `request.json()`.
   - If a request body contains `{ customerId: "cus_attacker" }`, this value MUST be completely discarded in favor of `profile.stripe_customer_id`.
5. **Stripe Billing Portal Session Creation:**
   - Initialize Stripe instance:
     ```javascript
     const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
       apiVersion: '2023-10-16',
       httpClient: Stripe.createFetchHttpClient(),
     });
     ```
   - Create session:
     ```javascript
     const returnUrl = `${new URL(request.url).origin}/settings`;
     const session = await stripe.billingPortal.sessions.create({
       customer: profile.stripe_customer_id,
       return_url: returnUrl,
     });
     ```
   - Return HTTP `200 OK` with headers `{ 'Content-Type': 'application/json' }` and payload `{ "url": session.url }`.

#### 3.1.3 HTTP Contract for `/api/create-portal`
- **Method:** `POST`
- **Path:** `/api/create-portal`
- **Request Headers:**
  - `Authorization: Bearer <jwt_access_token>` *(Required)*
  - `Content-Type: application/json` *(Optional)*
- **Request Body:** `{}` *(Any properties such as `customerId` are ignored)*
- **Response Status Codes & Schemas:**

| HTTP Status | Condition | Response Headers | Response Body Schema |
|---|---|---|---|
| `200 OK` | Valid token, user has `stripe_customer_id`, Stripe session created | `Content-Type: application/json` | `{"url": "https://billing.stripe.com/session/..."}` |
| `401 Unauthorized` | Missing `Authorization` header, invalid bearer format, or invalid/expired JWT | `Content-Type: application/json` | `{"error": "Unauthorized"}` or `{"error": "Invalid token"}` |
| `400 Bad Request` | User has no `stripe_customer_id` associated in `profiles` table | `Content-Type: application/json` | `{"error": "No Stripe customer found for this account"}` |
| `404 Not Found` | User record not found in `profiles` table | `Content-Type: application/json` | `{"error": "Profile not found"}` |
| `500 Internal Server Error` | Stripe API failure, missing environment variables, or unexpected server error | `Content-Type: application/json` | `{"error": "<error_message>"}` |

#### 3.1.4 Frontend Integration Contract (`frontend/src/pages/Settings.jsx`)
In `Settings.jsx` (`handleManageSubscription`):
- Retrieve current session token via `const { data: { session } } = await supabase.auth.getSession();`
- Pass `headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }`.
- Request body can be `{}` (no need to send `customerId`, though sending it will be safely ignored).

---

### Requirement 2: Fix Race Condition using Supabase RPC `increment_credits` (`webhook.js` & `generate.js`)

#### 3.2.1 Problem Statement
Currently, both `webhook.js` and `generate.js` update credits using a non-atomic Read-Modify-Write pattern:
1. `SELECT credits FROM profiles WHERE id = ...` (returns e.g. 10)
2. In Node.js: `newCredits = 10 + 60 = 70` (or `10 - 1 = 9`)
3. `UPDATE profiles SET credits = 70 WHERE id = ...`

If two requests execute concurrently (e.g., rapid checkout webhook delivery, or concurrent script generation requests), the second request reads the stale credit balance before the first write completes, leading to Lost Updates.

#### 3.2.2 Supabase RPC Specification (`increment_credits`)
The database RPC function `increment_credits` executes an atomic in-place arithmetic update protected by PostgreSQL row-level locks.

**PostgreSQL RPC Function Definition:**
```sql
CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + amount
  WHERE id = user_id
  RETURNING credits INTO new_credits;
  
  RETURN new_credits;
END;
$$;
```

**RPC Interface Parameters & Return:**
- **Function Name:** `increment_credits`
- **Arguments:**
  - `user_id` (`UUID` or string UUID): The target user ID matching `profiles.id`.
  - `amount` (`INTEGER`): The credit delta.
    - Positive integer (e.g. `+60`, `+150`) for purchases / additions in `webhook.js`.
    - Negative integer (e.g. `-1`) for credit deductions in `generate.js`.
- **Return Value:** `INTEGER` (the newly calculated `credits` value after the atomic update).

#### 3.2.3 Webhook Modification Specification (`webhook.js`)
When handling `checkout.session.completed`:
1. Extract `userId = session.client_reference_id`.
2. Determine `tier` and `addCredits`:
   - If `session.amount_subtotal >= 59000`: `tier = 'pro'`, `addCredits = 150`.
   - Else: `tier = 'plus'`, `addCredits = 60`.
3. Update tier and stripe_customer_id in `profiles`:
   ```javascript
   // Ensure profile row exists and metadata is updated
   const { error: profileError } = await supabase
     .from('profiles')
     .upsert({
       id: userId,
       tier: tier,
       stripe_customer_id: session.customer
     }, { onConflict: 'id' });
     
   if (profileError) {
     throw profileError;
   }
   ```
4. Perform atomic credit increment via RPC:
   ```javascript
   const { data: updatedCredits, error: rpcError } = await supabase.rpc('increment_credits', {
     user_id: userId,
     amount: addCredits
   });
   
   if (rpcError) {
     throw rpcError;
   }
   ```
5. **Prohibited Pattern:** MUST NOT call `supabase.from('profiles').select('credits')` or calculate `newCredits = currentCredits + addCredits` in JavaScript.
6. **Error Handling & Idempotency:** If any database operation fails, catch the error, delete `event.id` from `webhook_events` to allow Stripe webhook retries, and return HTTP `500`.

#### 3.2.4 Generate API Modification Specification (`generate.js`)
1. In `generate.js`, pre-check credit balance before starting AI generation:
   - Query `profiles` to check `profile.credits > 0`. If `<= 0`, return HTTP `403 Forbidden` (`{"error": "Insufficient credits"}`).
2. After AI generation and after successful `scripts` database insertion (see R3):
   - Deduct credit via RPC:
     ```javascript
     const { data: newCredits, error: rpcError } = await supabaseAdmin.rpc('increment_credits', {
       user_id: user.id,
       amount: -1
     });
     
     if (rpcError) {
       console.error("Credit deduction RPC error:", rpcError);
       // Handle or throw
     }
     ```
3. Return `credits_remaining: newCredits` in the 200 response payload.
4. **Prohibited Pattern:** MUST NOT execute `supabaseAdmin.from('profiles').update({ credits: profile.credits - 1 })`.

---

### Requirement 3: Fix Order of Operations in `/api/generate` (`generate.js`)

#### 3.3.1 Problem Statement
In the original `generate.js`, credit deduction was placed before script insertion:
```javascript
// Step A: Deduct credit
const newCredits = profile.credits - 1;
await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);

// Step B: Insert script history
await supabaseAdmin.from('scripts').insert({ ... });
```
If Step B throws an error (e.g. database constraint error, payload parsing failure, or database downtime), the user's credit is already permanently lost with no script saved in history.

#### 3.3.2 Strict Execution Sequence Specification
All operations in `/api/generate` MUST follow this sequential pipeline:

```
[1. Auth Header Validation]
       │
       ▼ (Valid JWT)
[2. Supabase Auth Verification (getUser)]
       │
       ▼ (Valid User)
[3. Query Profile (credits, tier)]
       │
       ▼ (Credits > 0)
[4. Jina AI Scraping (if tier === 'pro' && productUrl)]
       │
       ▼
[5. Tier Gating for targetAudience (if tier === 'free' -> targetAudience = '')]
       │
       ▼
[6. Call Google Gemini API (gemini-3.6-flash)]
       │
       ▼ (Valid AI JSON Output)
[7. DB INSERT: Save Script to 'scripts' Table FIRST] ──(Fails)──► [Throw Error, NO Credit Deducted, Return 500]
       │
       ▼ (Insert Succeeded)
[8. DB RPC: Deduct Credit via increment_credits(user.id, -1)]
       │
       ▼
[9. Return HTTP 200 { script, credits_remaining }]
```

#### 3.3.3 Database Operations Specification
1. **Step 7 — Insert into `scripts` Table:**
   ```javascript
   const { data: savedScript, error: insertError } = await supabaseAdmin
     .from('scripts')
     .insert({
       user_id: user.id,
       product_name: productName,
       product_details: finalDetails,
       mode: mode,
       content: JSON.stringify(resultJson)
     })
     .select()
     .single();

   if (insertError) {
     console.error("Failed to save script history:", insertError);
     throw new Error(`Database error saving script: ${insertError.message}`);
   }
   ```
2. **Step 8 — Deduct Credit via RPC (ONLY after Step 7 succeeds):**
   ```javascript
   const { data: newCredits, error: creditError } = await supabaseAdmin.rpc('increment_credits', {
     user_id: user.id,
     amount: -1
   });

   if (creditError) {
     console.error("Failed to deduct credit via RPC:", creditError);
     // Fallback / log error
   }
   ```
3. **Failure Guarantee:** If `insertError` occurs, execution jumps immediately to the catch block. `increment_credits` is NEVER called, and the user's credit balance remains completely untouched.

---

### Requirement 4: Enforce Authorization for `targetAudience` in `/api/generate` (`generate.js`)

#### 3.4.1 Problem Statement
The frontend UI restricts the `targetAudience` field to paid tiers (Plus/Pro). However, the backend endpoint `/api/generate` previously accepted `targetAudience` from any client payload and inserted it directly into the Gemini prompt without checking the user's tier in the database:
```javascript
const { targetAudience } = body;
// ...
const userPrompt = `... ${targetAudience ? `- กลุ่มเป้าหมาย: ${targetAudience}` : ''} ...`;
```
An attacker on the `free` tier could bypass the frontend restriction by sending a custom POST request containing `targetAudience` to unlock premium targeting capabilities.

#### 3.4.2 Specification & Prompt Sanitization Rules
1. **Database Tier Lookup:**
   - Retrieve `profile.tier` directly from the `profiles` table using Supabase Admin client (`SUPABASE_SERVICE_ROLE_KEY`).
   - Valid tiers: `'free'`, `'plus'`, `'pro'`.
2. **Tier Gating Logic:**
   - Determine `isPremium = profile.tier === 'plus' || profile.tier === 'pro'`.
   - If `!isPremium` (i.e. `profile.tier === 'free'` or undefined/null):
     - `effectiveTargetAudience = ''` (or `null`).
   - If `isPremium`:
     - `effectiveTargetAudience = targetAudience || ''`.
3. **Gemini AI Prompt Formatting:**
   - Construct `userPrompt` strictly using `effectiveTargetAudience`:
     ```javascript
     const userPrompt = `
     ข้อมูลสำหรับการเขียนสคริปต์:
     - ชื่อสินค้า: ${productName}
     - รายละเอียด/จุดเด่น: ${finalDetails}
     ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
     ${effectiveTargetAudience ? `- กลุ่มเป้าหมาย: ${effectiveTargetAudience}` : ''}
     ${competitor ? `- คู่แข่ง/สิ่งที่เอามาเทียบ: ${competitor}` : ''}
     
     คำสั่งรูปแบบ:
     - Mode การขาย: ${mode}
     - ความยาวคลิป: ${videoLength}
     `;
     ```
4. **Behavioral Guarantee:**
   - When a Free tier user provides `targetAudience: "วัยรุ่น มหาวิทยาลัย"`, the generated prompt sent to Google Gemini MUST NOT include `- กลุ่มเป้าหมาย:` or the string `"วัยรุ่น มหาวิทยาลัย"`.
   - When a Plus or Pro tier user provides `targetAudience`, it IS included in the prompt.
5. **Consistency with Other Tier-Gated Features:**
   - `productUrl` (Jina AI scraping) MUST continue to require `profile.tier === 'pro'`.

---

## 4. Complete HTTP API Contracts

### 4.1 `/api/create-portal`

#### Request
```http
POST /api/create-portal HTTP/1.1
Host: autostrip.pages.dev
Authorization: Bearer <SUPABASE_USER_JWT>
Content-Type: application/json

{}
```

#### Success Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "url": "https://billing.stripe.com/p/session/live_123456789"
}
```

#### Error Responses
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Unauthorized"
}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "No Stripe customer found for this account"
}
```

---

### 4.2 `/api/generate`

#### Request
```http
POST /api/generate HTTP/1.1
Host: autostrip.pages.dev
Authorization: Bearer <SUPABASE_USER_JWT>
Content-Type: application/json

{
  "productName": "ครีมกันแดดเนื้อน้ำนม",
  "productDetails": "กันน้ำ คุมมัน ไม่อุดตัน",
  "pricePromo": "1 แถม 1 ราคา 290 บาท",
  "videoLength": "สั้น",
  "mode": "ขยี้ปัญหา (PAS Formula)",
  "competitor": "",
  "targetAudience": "คนเป็นสิว ผิวแพ้ง่าย",
  "productUrl": ""
}
```

#### Success Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "script": {
    "metadata": {
      "target_audience_persona": "คนผิวมันเป็นสิวง่าย",
      "primary_psychological_trigger": "Agitation & Solution",
      "estimated_duration_seconds": 15
    },
    "script_blocks": [
      {
        "timestamp": "0-3s",
        "phase": "Hook",
        "visual_direction": "โคลสอัพหน้ามันเยิ้มแล้วเป็นสิว",
        "audio_spoken": "ทากันแดดแล้วสิวเห่อ หน้าเยิ้มใช่ไหมอ่ะแก",
        "subtext_emotion": "หงุดหงิด เข้าใจปัญหา"
      }
    ]
  },
  "credits_remaining": 5
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: `{"error": "Insufficient credits"}` (when `credits <= 0`).
- `404 Not Found`: `{"error": "Profile not found"}`.
- `500 Internal Server Error`: `{"error": "Database error saving script: ..."}` (credit NOT deducted).

---

### 4.3 `/api/webhook`

#### Request
```http
POST /api/webhook HTTP/1.1
Host: autostrip.pages.dev
Stripe-Signature: t=1612345678,v1=abc123def456...
Content-Type: application/json

{
  "id": "evt_123456789",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_123",
      "client_reference_id": "usr_uuid_1234",
      "customer": "cus_stripe_123",
      "amount_subtotal": 59000
    }
  }
}
```

#### Success Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "received": true
}
```

#### Duplicate Event Response
```http
HTTP/1.1 200 OK

Already processed
```

---

## 5. Edge Cases & Boundary Analysis

| # | Feature | Input / Condition | Observed & Specified Behavior |
|---|---|---|---|
| E1 | `/api/create-portal` | Request with valid JWT for User A, but body contains `{ customerId: "cus_USER_B" }` | Endpoint ignores body `customerId`, queries `profiles` for User A's `stripe_customer_id`, and creates portal session for User A ONLY. |
| E2 | `/api/create-portal` | Request with valid JWT for a free user who has never made a purchase (`stripe_customer_id` is null/empty) | Returns HTTP 400 Bad Request `{ "error": "No Stripe customer found for this account" }`. |
| E3 | `/api/create-portal` | Request with missing `Authorization` header | Returns HTTP 401 Unauthorized. |
| E4 | `/api/create-portal` | Request with malformed `Authorization: InvalidTokenFormat` | Returns HTTP 401 Unauthorized. |
| E5 | `/api/create-portal` | Request with expired or forged JWT | `supabase.auth.getUser` returns error, endpoint returns HTTP 401. |
| E6 | `webhook.js` | 2 concurrent Stripe `checkout.session.completed` events for the same user (60 credits each) | Idempotency handles separate event IDs; RPC `increment_credits(user_id, 60)` executes atomically sequentially, resulting in exact `credits = initial + 120`. No lost update. |
| E7 | `webhook.js` | Duplicate delivery of the exact same event ID (`evt_abc`) | First attempt inserts into `webhook_events`; second attempt hits unique violation code `23505` and returns HTTP 200 "Already processed". No extra credits added. |
| E8 | `webhook.js` | `amount_subtotal` is 59000 (Pro package) | Sets `tier: 'pro'` and calls `increment_credits` with `+150`. |
| E9 | `webhook.js` | `amount_subtotal` is 24900 (Plus package) or 100% coupon applied | Sets `tier: 'plus'` and calls `increment_credits` with `+60`. |
| E10 | `generate.js` | Free tier user (`tier === 'free'`) sends `targetAudience: "กลุ่มแม่และเด็ก"` in request body | Server-side check identifies `tier === 'free'`, sets `effectiveTargetAudience = ''`, and excludes target audience line from Gemini AI prompt. |
| E11 | `generate.js` | Plus tier user (`tier === 'plus'`) sends `targetAudience: "วัยทำงาน 25-35"` | Server-side check identifies `tier === 'plus'`, includes `- กลุ่มเป้าหมาย: วัยทำงาน 25-35` in prompt. |
| E12 | `generate.js` | Free tier user sends `productUrl: "https://shopee.co.th/product/123"` | Server ignores URL scraping because `tier !== 'pro'`. |
| E13 | `generate.js` | User has 1 credit. Gemini generation succeeds, but `scripts.insert()` fails (e.g. DB connection dropped) | Throws error; catch block catches exception; `increment_credits` is NEVER invoked; user credit balance remains 1; returns HTTP 500. |
| E14 | `generate.js` | User has 0 credits | Pre-check detects `profile.credits <= 0`, immediately returns HTTP 403 Forbidden without calling Gemini or modifying DB. |
| E15 | `generate.js` | User has negative credits in DB (edge condition) | Pre-check detects `credits <= 0`, returns HTTP 403 Forbidden. |

---

## 6. Acceptance Criteria Matrix

| Requirement | Acceptance Criteria | Verification Method |
|---|---|---|
| **R1 (create-portal IDOR)** | 1. POST to `/api/create-portal` without valid `Authorization` header returns 401. | Unit/Integration test: POST without header, verify 401 status. |
| **R1 (create-portal IDOR)** | 2. POST with valid token creates session for authenticated user's `stripe_customer_id` from DB, ignoring client `customerId`. | Test: Mock profile with `cus_A`, pass body `{ customerId: 'cus_B' }`, assert `stripe.billingPortal.sessions.create` called with `cus_A`. |
| **R1 (create-portal IDOR)** | 3. User with null `stripe_customer_id` returns 400 Bad Request. | Test: Mock profile with `stripe_customer_id: null`, assert 400 response. |
| **R2 (Race Condition RPC)** | 4. Webhook updates credits exclusively via `increment_credits` RPC. | Code audit & test: Verify `supabase.rpc('increment_credits', { user_id, amount })` is invoked, no JS addition. |
| **R2 (Race Condition RPC)** | 5. Generation deducts credits exclusively via `increment_credits` RPC with amount `-1`. | Code audit & test: Verify `supabaseAdmin.rpc('increment_credits', { user_id, amount: -1 })` is invoked. |
| **R3 (Order of Operations)** | 6. `generate.js` inserts into `scripts` table before deducting credits. | Mock test: Spy order of execution, assert `scripts.insert` precedes `rpc('increment_credits')`. |
| **R3 (Order of Operations)** | 7. If `scripts.insert` rejects/errors, credit deduction is not called and HTTP 500 is returned. | Test: Mock `scripts.insert` failure, assert `rpc('increment_credits')` was never called, response is 500. |
| **R4 (targetAudience Auth)** | 8. Free tier user providing `targetAudience` has the field stripped from the Gemini prompt. | Test: Free user mock, assert `ai.models.generateContent` contents does NOT contain `- กลุ่มเป้าหมาย:`. |
| **R4 (targetAudience Auth)** | 9. Plus/Pro tier user providing `targetAudience` has the field retained in the Gemini prompt. | Test: Plus/Pro user mock, assert `ai.models.generateContent` contents DOES contain `- กลุ่มเป้าหมาย:`. |

---

## 7. Required Invariants & Compliance Rules

1. **Rule 1 (Code Explanation):** All code modifications and handoffs must explain logic simply and clearly for beginners.
2. **Rule 2 (Gemini Model Version):** The AI model parameter in `generate.js` MUST remain strictly `'gemini-3.6-flash'`. Older models (e.g. `gemini-2.5-flash`) are strictly prohibited.
3. **Rule 3 (Proactive Compliance):** Maintain PDPA, GDPR, and security boundaries. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to client-side code.
4. **Rule 4 (Exact String Preservation):** Preserve all exact literals, error messages, and Stripe configurations.
