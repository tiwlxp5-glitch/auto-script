# Forensic Integrity Audit Handoff Report

**Target**: Auto Script Project (C:\Auto script)  
**Auditor**: Forensic Auditor (uditor_final_1)  
**Verdict**: **INTEGRITY VIOLATION**  

---

## 1. Observation

1. **Test Execution Output (
pm test in rontend/)**:
   - Total tests executed: 100 (97 passed, 3 failed, 3 skipped).
   - Test command exited with code 1.
   - Verbatim error logs:
     `
     FAIL functions/api/__tests__/adversarial.test.js > ADVERSARIAL STRESS TEST SUITE (challenger_2) > Category D: Execution Order & Zero-Loss Credit Guarantee > ADV-D2: When script insert fails, credits remain 100% untouched and error is returned
     AssertionError: expected 8 to be 7 // Object.is equality
     - Expected: 7
     + Received: 8
     at functions/api/__tests__/adversarial.test.js:522:62

     FAIL functions/api/__tests__/challenger_empirical.test.js > CHALLENGER AUDIT 2: EMPIRICAL ADVERSARIAL STRESS HARNESS > Focus 3: Fault Injection during scripts.insert > EMP-FAULT-1: Script insert DB failure returns 500 and strictly prevents credit deduction
     AssertionError: expected 3 to be 2 // Object.is equality
     - Expected: 2
     + Received: 3
     at functions/api/__tests__/challenger_empirical.test.js:259:45

     FAIL functions/api/__tests__/generate.test.js > POST /api/generate (R2: Atomic RPC, R3: Order of Operations, R4: Tier Authorization) > Tier 3: R3 - Order of Operations (Insert Script First, Deduct Second) > T3.2: if scripts insertion fails, upfront deduction is refunded and 500 error returned
     AssertionError: expected 3 to be 2 // Object.is equality
     - Expected: 2
     + Received: 3
     at functions/api/__tests__/generate.test.js:244:44
     `

2. **Source Code Inspection (rontend/functions/api/generate.js)**:
   - Lines 111–114:
     `javascript
     let creditDeducted = false;
     let creditAmount = 1;
     let userIdForRefund = null;
     let supabaseAdmin = null;
     `
   - Lines 159–171:
     `javascript
     const { data: updatedCredits, error: creditError } = await supabaseAdmin.rpc('increment_credits', {
       p_user_id: user.id,
       p_amount: -creditAmount
     });
     ...
     creditDeducted = true;
     `
   - Lines 227–237:
     `javascript
     if (insertError) {
       console.error( Failed to insert script:, insertError);
       
       // ROLLBACK: Refund credits if history save fails
       await supabaseAdmin.rpc('increment_credits', {
         p_user_id: user.id,
         p_amount: creditAmount
       });
       
       throw new Error(Failed to save script history);
     }
     `
   - Lines 257–264:
     `javascript
     } catch (err) {
       if (creditDeducted && userIdForRefund) {
         console.error(Execution failed after deduction. Issuing compensatory refund:, err);
         try {
           await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
         } catch {}
       }
       console.error(Generate API Error:, err);
       return new Response(JSON.stringify({ error: err.message || Internal Server Error }), { 
         status: 500,
         headers: { 'Content-Type': 'application/json' }
       });
     }
     `

3. **GEMINI.md Compliance & Security Audit Observations**:
   - **Rule 1 (Code Explanation)**: Detailed Thai comments with analogies present across App.jsx, create-portal.js, generate.js, webhook.js.
   - **Rule 2 (Gemini Model Version)**: generate.js:198 strictly specifies model: 'gemini-3.6-flash'.
   - **Rule 3 (Compliance & Warnings)**: Legal agreements in Legal.jsx, Register.jsx, MainLayout.jsx, and banned word detection in annedWords.js.
   - **Rule 4 (Exact String & URL Preservation)**: Exact Stripe links (https://buy.stripe.com/9B6fZi0454Tg7ZSf5Nbwk00, https://buy.stripe.com/3cIbJ2045adAgwoe1Jbwk01) and LINE link (https://lin.ee/x0yVB1kk) preserved.
   - **Rule 5 (Supabase Schema & RPC Alignment)**: increment_credits and sync_profile_credits use p_user_id and p_amount across all callers.
   - **Rule 6 (Strict Credential Confidentiality)**: Zero hardcoded live credentials found in production files.
   - **Vite Build**: 
pm run build completed successfully in 286ms.

---

## 2. Logic Chain

1. Per the Integrity Forensics protocol, the test suite must execute and pass without errors. A failing test suite is an automatic failure.
2. In generate.js, when a database failure occurs during scripts.insert:
   - Step A: Upfront deduction occurs (-1 credit), and creditDeducted is set to 	rue (Line 170).
   - Step B: Script insert fails (insertError), triggering the rollback block at line 231 which refunds +1 credit.
   - Step C: Line 236 throws 
ew Error(Failed to save script history) without resetting creditDeducted to alse.
   - Step D: The error is caught by catch (err) at line 257. Because creditDeducted === true, line 261 executes a **second refund** (+1 credit).
3. This double-refund defect increases the user's credits beyond their initial balance upon an error (e.g. 7 credits -> 6 -> 7 -> 8), directly violating credit balance invariants and failing test assertions in dversarial.test.js, challenger_empirical.test.js, and generate.test.js.
4. Therefore, the work product contains an active behavioral integrity violation and must be rejected until fixed.

---

## 3. Caveats

- All 97 other tests across Stripe webhooks, IDOR protection, prompt injection resistance, and concurrency storms pass cleanly.
- Frontend build and UX are fully functional.
- The defect is strictly isolated to the duplicate rollback execution path between lines 231-236 and 258-263 in generate.js.

---

## 4. Conclusion

The Auto Script project is rejected with a verdict of **INTEGRITY VIOLATION**.

### Actionable Fix:
In rontend/functions/api/generate.js, add creditDeducted = false; immediately before the rollback RPC call inside if (insertError) (line 230), and change p_amount: 1 to p_amount: creditAmount in the catch block (line 261).

---

## 5. Verification Method

To verify:
1. Run the test command in C:\Auto script\frontend:
   `powershell
   npm test
   `
2. Observe that 3 tests fail with AssertionError: expected 8 to be 7 and expected 3 to be 2.
3. Inspect rontend/functions/api/generate.js lines 227–264 to observe the un-cleared creditDeducted flag leading into the outer catch block.
