# Handoff Report — Milestone 3: Fix Order of Operations, Atomic Credit RPC, & Tier Authorization in `generate.js`

**Author**: `worker_m3`  
**Date**: 2026-08-24T02:25:35Z  
**Project**: Auto Script (`frontend/functions/api/generate.js`)  
**Milestone**: Milestone 3 (Requirements R2, R3, R4)  

---

## 1. Observation

### Direct Code Observations Prior to Modification:
1. **Inverted Order of Operations (R3)**:
   - In `frontend/functions/api/generate.js` (lines 150–162):
     ```javascript
     // 6. หักเครดิตอย่างปลอดภัยด้วย Service Role
     const newCredits = profile.credits - 1;
     await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);

     // 7. บันทึก History ลงฐานข้อมูลให้เลย
     await supabaseAdmin.from('scripts').insert({ ... });
     ```
   - User credits were debited *before* inserting into the `scripts` table, and the result of the `insert` was unhandled. If the database insertion failed, the user's credit was lost with no script recorded in history.

2. **Non-Atomic Credit Calculation (R2)**:
   - The credit balance was read into memory (`profile.credits`), subtracted in JavaScript (`profile.credits - 1`), and written via `supabaseAdmin.from('profiles').update({ credits: newCredits })`.
   - Concurrent requests could read the same initial balance, leading to a race condition where multiple scripts could be generated while only debiting 1 credit (or conflicting with concurrent webhook top-ups).

3. **Tier Authorization Bypass on `targetAudience` (R4)**:
   - In `frontend/functions/api/generate.js` (lines 86, 125–136):
     ```javascript
     const { productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, productUrl } = body;
     // ...
     const userPrompt = `
     ข้อมูลสำหรับการเขียนสคริปต์:
     - ชื่อสินค้า: ${productName}
     - รายละเอียด/จุดเด่น: ${finalDetails}
     ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
     ${targetAudience ? `- กลุ่มเป้าหมาย: ${targetAudience}` : ''}
     ${competitor ? `- คู่แข่ง/สิ่งที่เอามาเทียบ: ${competitor}` : ''}
     `;
     ```
   - The backend accepted `targetAudience` directly from the request body without checking if `profile.tier !== 'free'`. Any free-tier user could bypass the frontend UI restriction by sending a direct API request to include target audience customization in their AI prompt.

4. **Model Compliance (GEMINI.md Rule 2)**:
   - The AI model was configured as `model: 'gemini-3.6-flash'`, which aligns with project compliance rules.

---

## 2. Logic Chain & Code Explanation

### 2.1 Concept & Real-World Analogy (Beginner-Friendly Explanation)
To understand these security fixes, think of a vending machine:
- **Order of Operations (R3)**: If a vending machine took your coin *before* checking if the snack can drop, and the snack gets stuck, you lose your money with nothing to show for it. Our fix makes sure the machine dispenses the item into the tray (`scripts.insert`) first, and only takes your coin (`increment_credits`) once it confirms the item was successfully delivered!
- **Atomic Credit Operations (R2)**: Imagine two people using the same bank account card at two different ATMs at the exact same millisecond. If both ATMs read "Balance = $10" and both decide "$10 - $1 = $9", you got $2 cash but only paid $1. By using the database RPC function (`increment_credits(user_id, -1)`), the database locks the single record and deducts credits sequentially and accurately, preventing lost updates or double-spend race conditions.
- **Tier Feature Gating (R4)**: The frontend form hiding the "Target Audience" field is like putting a sign on a door saying "VIPs Only". But if the door is unlocked, anyone can walk in. Our backend check acts as the security guard verifying the user's badge (`profile.tier === 'plus' || profile.tier === 'pro'`) before allowing the audience parameter into the AI prompt.

### 2.2 Implemented Changes in `frontend/functions/api/generate.js`:

1. **Gating `targetAudience` by Tier (R4)**:
   ```javascript
   // 4.1 ตรวจสอบสิทธิ์การใช้งาน targetAudience (เฉพาะ Tier Plus และ Pro เท่านั้น)
   const finalTargetAudience = (profile.tier === 'plus' || profile.tier === 'pro') ? targetAudience : null;
   ```
   And within `userPrompt`:
   ```javascript
   ${finalTargetAudience ? `- กลุ่มเป้าหมาย: ${finalTargetAudience}` : ''}
   ```
   If a user is on the `free` tier, `finalTargetAudience` evaluates to `null`, ensuring no target audience instruction is sent to Google Gemini.

2. **Inserting into `scripts` First with Error Handling (R3)**:
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
     return new Response(JSON.stringify({ error: "Failed to save script history" }), { 
       status: 500,
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```
   If database insertion fails, execution halts immediately, returns HTTP 500, and credit deduction is bypassed entirely.

3. **Atomic Credit Deduction via Supabase RPC (R2)**:
   ```javascript
   // 7. หักเครดิตแบบ Atomic ด้วย Supabase RPC increment_credits หลังจากบันทึกสำเร็จเท่านั้น
   const { data: updatedCredits, error: rpcError } = await supabaseAdmin.rpc('increment_credits', {
     user_id: user.id,
     amount: -1
   });

   if (rpcError) {
     console.error("RPC credit deduction failed:", rpcError);
     return new Response(JSON.stringify({ error: "Failed to deduct credits" }), { 
       status: 500,
       headers: { 'Content-Type': 'application/json' }
     });
   }

   const remainingCredits = typeof updatedCredits === 'number' ? updatedCredits : (profile.credits - 1);
   ```

4. **Return Response**:
   ```javascript
   return new Response(JSON.stringify({ script: resultJson, credits_remaining: remainingCredits }), { 
     status: 200,
     headers: { 'Content-Type': 'application/json' }
   });
   ```

---

## 3. Caveats

1. **Jina AI Scraping Boundary**: URL scraping remains strictly gated to Pro tier (`profile.tier === 'pro' && productUrl`).
2. **PostgreSQL RPC Function**: The endpoint relies on `increment_credits` being present in Supabase. The database function performs `COALESCE(credits, 0) + amount`.

---

## 4. Conclusion

- **R2 (Race Condition)**: Fully resolved by replacing JavaScript-side math and direct database `update` with `supabaseAdmin.rpc('increment_credits', { user_id: user.id, amount: -1 })`.
- **R3 (Order of Operations)**: Fully resolved by ensuring that `scripts.insert` executes first and verifies success before calling credit deduction RPC. If insertion fails, credits remain untouched.
- **R4 (Tier Authorization on `targetAudience`)**: Fully resolved by validating `profile.tier === 'plus' || profile.tier === 'pro'`. Free tier users have `targetAudience` stripped from Gemini AI prompt construction.
- **Model Compliance**: Strictly retained `gemini-3.6-flash`.
- **All Quality Gates Pass**: Build, lint, and all 44 unit tests pass with zero errors.

---

## 5. Verification Method

### 5.1 Automated Unit & Integration Tests
Ran `npm test --prefix frontend`:
```bash
npm test --prefix frontend
```
**Results**:
- 4 test suites passed (`create-portal.test.js`, `webhook.test.js`, `scenarios.test.js`, `generate.test.js`)
- 44/44 tests passed (16 dedicated tests in `generate.test.js`).

### 5.2 Linting & Build Verification
1. `npm run lint --prefix frontend` (Oxlint): 0 errors.
2. `npm run build --prefix frontend` (Vite build): Successful production bundle generated.
