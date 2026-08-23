# Handoff Report — explorer_survey_1

**Date**: 2026-08-24T02:22:00+07:00  
**Sender**: `explorer_survey_1`  
**Recipient**: `orchestrator_1` (Conversation ID: `e539761c-128a-4e65-b5fa-642b91d0bc21`)  
**Mission**: Backend codebase survey and vulnerability analysis for 4 security/architecture issues.  
**Survey Report Location**: `c:\Auto script\.agents\explorer_survey_1\survey_report.md`

---

## 1. Observation

### Observation 1: `frontend/functions/api/create-portal.js` (IDOR / Unauthenticated)
- Lines 3–21:
  ```javascript
  export async function onRequestPost({ request, env }) {
    try {
      const { customerId } = await request.json();
      if (!customerId) {
        return new Response(JSON.stringify({ error: 'Missing customerId' }), { status: 400 });
      }
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { ... });
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${new URL(request.url).origin}/settings`,
      });
  ```
- **Direct Finding**: No `Authorization` header extraction or verification is performed. The Stripe Customer ID is taken directly from the client request body (`customerId`).

### Observation 2: `frontend/functions/api/webhook.js` & `frontend/functions/api/generate.js` (Race Condition)
- `frontend/functions/api/webhook.js:64-81`:
  ```javascript
  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
  const currentCredits = profile?.credits || 0;
  const newCredits = currentCredits + addCredits;
  const { error: upsertError } = await supabase.from('profiles').upsert({
    id: userId,
    tier: tier,
    credits: newCredits,
    stripe_customer_id: session.customer
  });
  ```
- `frontend/functions/api/generate.js:150-152`:
  ```javascript
  const newCredits = profile.credits - 1;
  await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);
  ```
- **Direct Finding**: Credit calculations are performed via non-atomic in-memory JavaScript arithmetic (`credits - 1`, `credits + addCredits`) followed by absolute database overwrites.

### Observation 3: `frontend/functions/api/generate.js` (Order of Operations)
- `frontend/functions/api/generate.js:150-167`:
  ```javascript
  // 6. หักเครดิตอย่างปลอดภัยด้วย Service Role
  const newCredits = profile.credits - 1;
  await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);

  // 7. บันทึก History ลงฐานข้อมูลให้เลย
  await supabaseAdmin.from('scripts').insert({
    user_id: user.id,
    product_name: productName,
    product_details: finalDetails,
    mode: mode,
    content: JSON.stringify(resultJson)
  });
  ```
- **Direct Finding**: The profile credit is deducted at Step 6 prior to persisting the record to the `scripts` table at Step 7. Furthermore, the `insert` call return value is not error-checked.

### Observation 4: `frontend/functions/api/generate.js` (Authorization Bypass on `targetAudience`)
- `frontend/functions/api/generate.js:86, 125-136`:
  ```javascript
  const { productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, productUrl } = body;
  ...
  const userPrompt = `
  ข้อมูลสำหรับการเขียนสคริปต์:
  - ชื่อสินค้า: ${productName}
  - รายละเอียด/จุดเด่น: ${finalDetails}
  ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
  ${targetAudience ? `- กลุ่มเป้าหมาย: ${targetAudience}` : ''}
  ${competitor ? `- คู่แข่ง/สิ่งที่เอามาเทียบ: ${competitor}` : ''}
  ...
  `;
  ```
- **Direct Finding**: Unlike `productUrl` which enforces `if (profile.tier === 'pro' && productUrl)`, `targetAudience` is injected into the prompt without checking whether `profile.tier` is 'free'.

---

## 2. Logic Chain

1. **R1 Logic Chain**:
   - `/api/create-portal` creates a live Stripe Billing Portal session for the customer ID passed in the request body.
   - Because no auth verification is executed, any caller can supply any `customerId`.
   - Therefore, an attacker can access billing history, invoices, and payment methods for arbitrary customers (IDOR).
2. **R2 Logic Chain**:
   - Both `webhook.js` and `generate.js` read the balance, calculate the new balance in Node.js, and write it back.
   - Concurrent requests (e.g. parallel generation or webhook retries) interleave between read and write steps.
   - Therefore, credit counts can be lost or unauthorized extra script generations can occur unless atomic RPC (`increment_credits`) is used.
3. **R3 Logic Chain**:
   - `generate.js` updates `profiles` to decrement credits first, then inserts into `scripts`.
   - If `scripts.insert` fails due to schema, constraint, or network errors, the user's credit is already permanently debited without storing the script.
   - Therefore, inserting into `scripts` must happen first, and credit deduction must only trigger upon confirmed insert success.
4. **R4 Logic Chain**:
   - `targetAudience` is a premium (Plus/Pro) feature.
   - The frontend hides the UI field for Free users, but the backend accepts and uses `targetAudience` unconditionally.
   - Therefore, API-level requests can bypass the tier restriction and use the premium feature without payment.

---

## 3. Caveats

- **No Caveats**. The backend files (`create-portal.js`, `webhook.js`, `generate.js`) and database relationships were inspected directly.
- Note: Frontend `Settings.jsx` will require passing `Authorization: Bearer <token>` to match the remediated `create-portal.js`.

---

## 4. Conclusion

All 4 vulnerabilities are fully documented with root causes, attack mechanisms, exact line numbers, and concrete remediation code blueprints in `survey_report.md`. The remediation plan satisfies all acceptance criteria in `ORIGINAL_REQUEST.md`, complies with `GEMINI.md` rules (`gemini-3.6-flash`, clear explanations, exact strings), and conforms to the `cloudflare-supabase-security` skill standards.

---

## 5. Verification Method

1. **R1 Verification**:
   - Make unauthenticated POST to `/api/create-portal` $\rightarrow$ Expect `401 Unauthorized`.
   - Make authenticated POST with dummy `customerId` $\rightarrow$ Verify Stripe session uses the authenticated user's DB `stripe_customer_id`.
2. **R2 Verification**:
   - Inspect `webhook.js` and `generate.js` code $\rightarrow$ Verify calls to `supabase.rpc('increment_credits', { user_id, amount })`.
3. **R3 Verification**:
   - Simulate a failure in `supabaseAdmin.from('scripts').insert` $\rightarrow$ Verify that user credit balance is NOT decremented.
4. **R4 Verification**:
   - Send POST to `/api/generate` with a Free tier JWT and `targetAudience: "test"` $\rightarrow$ Inspect Gemini prompt to verify `targetAudience` is excluded.
