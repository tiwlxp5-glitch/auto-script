# Handoff Report — explorer_survey_2

## 1. Observation

Direct code and environment observations:

1. **Test Infrastructure & Dependencies:**
   - In `frontend/package.json`:
     ```json
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "lint": "oxlint",
       "preview": "vite preview"
     }
     ```
     No testing scripts (`test`) or testing frameworks (`vitest`, `jest`) are currently declared.
   - `npm run build` executed in `frontend/` exited with code 0 (Vite v8.2.2 bundle produced in `dist/`).
   - `npm run lint` (`oxlint`) exited with code 0 (0 errors, 10 warnings on unused catch/vars and effects).

2. **R1 (`frontend/functions/api/create-portal.js`):**
   - Lines 5-9:
     ```javascript
     const { customerId } = await request.json();
     if (!customerId) {
       return new Response(JSON.stringify({ error: 'Missing customerId' }), { status: 400 });
     }
     ```
   - Lines 18-21:
     ```javascript
     const session = await stripe.billingPortal.sessions.create({
       customer: customerId,
       return_url: `${new URL(request.url).origin}/settings`,
     });
     ```
   - No `Authorization` header extraction or Supabase token validation exists in `create-portal.js`.

3. **R2 (`frontend/functions/api/webhook.js` and `generate.js`):**
   - In `webhook.js` lines 64-81:
     ```javascript
     const { data: profile } = await supabase
       .from('profiles')
       .select('credits')
       .eq('id', userId)
       .single();

     const currentCredits = profile?.credits || 0;
     const newCredits = currentCredits + addCredits;

     const { error: upsertError } = await supabase
       .from('profiles')
       .upsert({ 
         id: userId, 
         tier: tier, 
         credits: newCredits,
         stripe_customer_id: session.customer 
       });
     ```
   - In `generate.js` lines 150-152:
     ```javascript
     const newCredits = profile.credits - 1;
     await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);
     ```

4. **R3 (`frontend/functions/api/generate.js`):**
   - Line 152 performs credit deduction (`update({ credits: newCredits })`) before line 155 inserts into `scripts` (`supabaseAdmin.from('scripts').insert(...)`). If insert fails, credits are already deducted.

5. **R4 (`frontend/functions/api/generate.js`):**
   - Line 86: `const { productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, productUrl } = body;`
   - Line 130: `${targetAudience ? `- กลุ่มเป้าหมาย: ${targetAudience}` : ''}`
   - Line 106 validates `profile.tier === 'pro'` for `productUrl`, but does NOT validate `profile.tier !== 'free'` for `targetAudience`.

6. **Frontend Call Sites:**
   - `frontend/src/pages/Settings.jsx` (lines 91-96) calls `POST /api/create-portal` with `{ customerId: profile.stripe_customer_id }` and does NOT currently pass an `Authorization` header.
   - `frontend/src/pages/CreateScript.jsx` (lines 118-125) calls `POST /api/generate` with `Authorization: Bearer ${session.access_token}` and payload.

---

## 2. Logic Chain

1. **R1 IDOR Vulnerability:**
   - Because `create-portal.js` directly takes `customerId` from the incoming JSON payload without verifying the caller's JWT identity (Observation 2), an attacker can supply any arbitrary Stripe customer ID to create a Billing Portal session and view/modify that victim's payment methods and subscriptions.
   - Therefore, `create-portal.js` must require a valid JWT `Authorization` header, verify the token via `supabase.auth.getUser(token)`, query `profiles.stripe_customer_id` using the verified `user.id`, and ignore any client-supplied customer ID.
   - Concurrently, `Settings.jsx` (Observation 6) must be updated to pass the `Authorization` header.

2. **R2 Race Condition:**
   - Because `webhook.js` and `generate.js` read the current credits balance into Node.js memory, calculate the new balance via arithmetic, and write it back via `update`/`upsert` (Observation 3), concurrent events (e.g. rapid webhooks or overlapping script generations) will overwrite each other, causing lost credit updates.
   - Therefore, both endpoints must invoke a PostgreSQL atomic RPC function (`increment_credits(user_id, amount)`) that performs in-database row-locked addition (`credits = credits + amount`).

3. **R3 Order of Operations Defect:**
   - Because `generate.js` updates credits on line 152 before inserting into `scripts` on line 155 (Observation 4), if the database insert encounters an error (e.g. connection timeout, table lock, validation error), the user's credits are consumed without the script being saved.
   - Therefore, the insert into `scripts` must happen first. Only if the insert succeeds without error should the credit deduction RPC be called.

4. **R4 Authorization Bypass on `targetAudience`:**
   - Because `generate.js` injects `targetAudience` directly into the Gemini prompt whenever present in the request body (Observation 5) without checking `profile.tier`, a free-tier user sending a crafted POST request can access the premium target audience feature for free.
   - Therefore, `generate.js` must verify `profile.tier` and ensure `targetAudience` is cleared/ignored when `profile.tier === 'free'`.

5. **Test Infrastructure Strategy:**
   - Because no test runner is currently installed (Observation 1), introducing `vitest` with mock fixtures for `@supabase/supabase-js`, `stripe`, and `@google/genai` allows comprehensive unit and integration testing of the pure `onRequestPost` handlers without needing live external API keys.

---

## 3. Caveats

- **External Live Services:** Live testing against actual Stripe webhooks and Supabase cloud requires valid network secrets. Unit and integration tests must rely on faithful mocks of the Supabase Client (including RPC response emulation), Stripe SDK, and GoogleGenAI SDK.
- **Client Side Settings.jsx:** Although the primary vulnerabilities are on the backend, fixing R1 requires `Settings.jsx` to pass the `Authorization` Bearer token to avoid breaking the client UI.
- **No other caveats.**

---

## 4. Conclusion

The repository structure, toolchains, backend endpoints, and frontend call sites have been thoroughly analyzed. All 4 vulnerabilities specified in `ORIGINAL_REQUEST.md` (R1 IDOR in `create-portal.js`, R2 Race Condition in `webhook.js` and `generate.js`, R3 Order of Operations in `generate.js`, and R4 Tier Authorization bypass in `generate.js`) have been verified at the line-number level. 

A detailed survey report has been generated at `c:\Auto script\.agents\explorer_survey_2\survey_report.md`, outlining exact remediation requirements, Supabase schema / RPC definitions, and a Vitest-based testing plan.

---

## 5. Verification Method

To independently verify this survey:

1. **Verify Build & Lint Baseline:**
   ```powershell
   cd "c:\Auto script\frontend"
   npm run build
   npm run lint
   ```
2. **Inspect Vulnerable Backend Locations:**
   - `create-portal.js`: line 5 (`customerId` from request body without auth check)
   - `webhook.js`: lines 64-81 (`select` then `upsert` of credits)
   - `generate.js`: lines 86 & 130 (`targetAudience` unauthenticated tier bypass)
   - `generate.js`: line 152 (credit update before line 155 script insert)
3. **Inspect Survey Report:**
   - Read `c:\Auto script\.agents\explorer_survey_2\survey_report.md`
