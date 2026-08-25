# Handoff Report — Challenger Audit 1 (Database & Backend Findings)

**Target:** Auto Script Database & Backend Architecture  
**Author:** Empirical Challenger 1 (`challenger_audit_1`)  
**Date:** 2026-08-25  
**Type:** Hard Handoff (Task Complete)  
**Verdict:** ⛔ **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical observations, verbatim code excerpts, and test executions:

1. **Double-Refund Defect in `generate.js` (DB-06 / VULN-01)**:
   - In `frontend/functions/api/generate.js` lines 227–237:
     ```javascript
     if (insertError) {
       console.error("Failed to insert script:", insertError);
       await supabaseAdmin.rpc('increment_credits', { p_user_id: user.id, p_amount: creditAmount });
       throw new Error("Failed to save script history");
     }
     ```
   - In `generate.js` lines 257–263:
     ```javascript
     } catch (err) {
       if (creditDeducted && userIdForRefund) {
         try {
           await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
         } catch {}
       }
     ```
   - Running existing test `functions/api/__tests__/adversarial.test.js` gave:
     ```
     FAIL ADV-D2: When script insert fails, credits remain 100% untouched
     AssertionError: expected 8 to be 7 // Object.is equality
     - Expected: 7
     + Received: 8
     ```
   - Executing `functions/api/__tests__/challenger_empirical_db_backend.test.js` (`EMP-DB-06.1`) confirmed: initial credits 5 -> upfront deduction (-1) -> inner refund (+1) -> catch refund (+1) -> final credits = 6 (net +1 bonus credit).

2. **Asymmetric Refund Defect in `generate.js` (DB-07 / VULN-02 / VULN-05)**:
   - In `generate.js` line 156: `creditAmount = isMultiVersion ? 2 : 1;`.
   - In `generate.js` line 261: `await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });`.
   - Executing `challenger_empirical_db_backend.test.js` (`EMP-DB-07.1`) when Gemini API throws 503 during multi-version generation confirmed: initial credits 10 -> upfront deduction (-2) -> catch refund (+1) -> final credits = 9 (1 credit permanently lost).

3. **Zero-Credit Generation Bypass (DB-01)**:
   - In `supabase/migrations/20260824_freemium_trial.sql` lines 50–60:
     ```sql
     UPDATE public.profiles
     SET credits = greatest(0, coalesce(v_profile.credits, 0) + p_amount)
     WHERE id = p_user_id
     RETURNING credits INTO v_new_credits;
     RETURN v_new_credits;
     ```
   - In `generate.js` lines 167–169:
     ```javascript
     if (updatedCredits === null || updatedCredits < 0) {
       return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
     }
     ```
   - When `credits = 0` and `p_amount = -1`, `greatest(0, 0 + (-1))` is `0`. In `generate.js`, `0 === null` is `false`, `0 < 0` is `false`. The check is bypassed, generating unlimited scripts for free.
   - Executing `challenger_empirical_db_backend.test.js` (`EMP-DB-01.1` & `EMP-DB-01.2`) verified this bypass and confirmed that `IF p_amount < 0 AND credits < abs(p_amount) THEN RETURN -1;` resolves the defect.

4. **Stripe Webhook Payment Status Bypass & Unhandled Lifecycle Events (VULN-04 / VULN-05)**:
   - In `frontend/functions/api/webhook.js` lines 46–59: `checkout.session.completed` executes credit addition without checking `session.payment_status === 'paid'`.
   - Executing `challenger_empirical_db_backend.test.js` (`EMP-VULN-04`) showed asynchronous `payment_status: 'unpaid'` sessions immediately grant 150 credits.
   - `webhook.js` does not handle `charge.refunded` or `charge.dispute.created`, verified via `EMP-VULN-05.1` and `EMP-VULN-05.2`.

---

## 2. Logic Chain

1. **Premise 1**: Financial integrity in a transactional credit system requires zero-sum balance conservation: successful generation consumes $C$ credits; aborted generation preserves initial balance $B$ ($B_{final} = B_{initial}$).
2. **Observation 1 & 2**: When `scripts.insert` fails in `generate.js`, two consecutive refunds are invoked ($B_{final} = B_{initial} - 1 + 1 + 1 = B_{initial} + 1$). When multi-version AI generation fails, refund is hardcoded to 1 ($B_{final} = B_{initial} - 2 + 1 = B_{initial} - 1$).
3. **Inference 1**: Both codepaths violate balance conservation, leading to unmetered free credit generation in insertion failure scenarios, and permanent user loss in AI failure scenarios.
4. **Premise 2**: Credit gating requires that requests with insufficient balance ($credits < cost$) must be rejected prior to executing costly downstream AI compute.
5. **Observation 3**: `20260824_freemium_trial.sql` uses `greatest(0, ...)` which clips negative balances to 0, returning `0` instead of `-1`. `generate.js` interprets `0` as success because `0 < 0` is false.
6. **Inference 2**: Any user with 0 credits can generate infinite AI scripts without payment.
7. **Premise 3**: Webhook credit provisioning must only occur upon confirmed receipt of funds, and must be revoked upon refund/chargeback.
8. **Observation 4**: `webhook.js` lacks `session.payment_status === 'paid'` verification and lacks event listeners for `charge.refunded` and `charge.dispute.created`.
9. **Inference 3**: Delayed payment mechanisms allow unpaid credit extraction, and refunded users retain Pro tier and credits indefinitely.
10. **Conclusion**: All 4 core areas contain confirmed vulnerabilities and require code and SQL changes before deployment.

---

## 3. Caveats

1. **Turnstile Bot Guard & Edge Rate Limiting**: This audit focused on the database RPC, transactional logic, and webhook state machines. Edge network WAF rate limiting and Cloudflare Turnstile token validation were verified absent in `generate.js`, but implementing them requires frontend/backend coordinate integration.
2. **Local Test Environment vs Production Supabase**: Tests were executed using Vitest and high-fidelity mock environments matching PostgreSQL semantics. Applying the consolidated migration to production Supabase is required to ensure database-level enforcement.

---

## 4. Conclusion

- **Verdict**: **REQUEST_CHANGES**
- The database and backend logic suffers from 3 critical/high bugs in `generate.js` (double-refund, asymmetric refund, and 0-credit bypass interaction) and 2 webhook gaps in `webhook.js` (unpaid asynchronous session bypass and unhandled refunds).
- Complete remediation blueprints and test suites have been constructed in `challenge_report.md` and `functions/api/__tests__/challenger_empirical_db_backend.test.js`.

---

## 5. Verification Method

To independently reproduce and verify all findings, run the following commands in powershell/bash:

```powershell
# Run the dedicated challenger empirical test suite
cd "C:\Auto script\frontend"
npx vitest run functions/api/__tests__/challenger_empirical_db_backend.test.js

# Run the full backend test suite to observe existing test suite failures
npm test
```

### Invalidation Conditions
- If setting `creditDeducted = false` after `scripts.insert` failure and using dynamic `creditAmount` in `catch (err)` eliminates double/asymmetric refund behavior.
- If applying the master SQL migration with `IF p_amount < 0 AND credits < abs(p_amount) THEN RETURN -1;` successfully forces `generate.js` to return 402 for 0-credit users.
- If adding `if (session.payment_status !== 'paid') return 200;` prevents premature credit allocation on asynchronous payments.
