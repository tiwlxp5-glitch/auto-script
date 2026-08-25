# Forensic Integrity Audit Report — Auto Script Project

**Audit Date**: 2026-08-25T10:55:00+07:00  
**Auditor**: Forensic Auditor (uditor_final_1)  
**Target**: Complete Auto Script Project (C:\Auto script)  
**Integrity Mode**: Development Mode (evaluated against all 3 modes)  
**Binary Verdict**: **INTEGRITY VIOLATION** (Rejected due to test suite failure & double-refund credit balance corruption)

---

## Executive Summary

A comprehensive forensic audit was conducted across the production source code, Cloudflare Workers backend functions, Supabase database migrations, test harnesses, security headers, and GEMINI.md compliance rules.

While frontend architecture, secret boundary isolation, GEMINI.md rule compliance, and build processes pass inspection, the work product **FAILS behavioral test verification** (
pm test failed with 3 test failures). Specifically, a **Double-Refund Bug in rontend/functions/api/generate.js** causes unearned credit duplication when database write operations fail, resulting in test suite failure and financial logic violation.

---

## 1. Forensic Verification Phase Breakdown

| # | Forensic Check Area | Status | Findings / Evidence |
|---|---|:---:|---|
| **1** | **Dummy / Fake / Mock in Production Code** | **PASS** | No mock databases, stubs, or fake returns in rontend/src/**/* or rontend/functions/api/*.js. Real Supabase and Google GenAI SDKs are utilized. |
| **2** | **Secret Boundary & Credential Confidentiality** | **PASS** | No production API keys (sk_live_, AIza, service role keys) leaked. Frontend Vite bundle only possesses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Backend Cloudflare functions safely consume env secrets. |
| **3** | **GEMINI.md Rule 1 (Code Explanation)** | **PASS** | Source code includes comprehensive Thai commentary with beginner-friendly analogies. |
| **4** | **GEMINI.md Rule 2 (Gemini Model Version)** | **PASS** | generate.js:198 strictly configures model: 'gemini-3.6-flash'. No deprecated models (gemini-2.5-flash) found in production code. |
| **5** | **GEMINI.md Rule 3 (Compliance & Security Warning)** | **PASS** | PDPA, Terms of Service, refund policy, and banned words scanning are actively integrated into UI and legal pages. |
| **6** | **GEMINI.md Rule 4 (Exact String & URL Preservation)** | **PASS** | Exact Stripe Checkout URLs (PLUS_LINK = 'https://buy.stripe.com/9B6fZi0454Tg7ZSf5Nbwk00', PRO_LINK = 'https://buy.stripe.com/3cIbJ2045adAgwoe1Jbwk01') and LINE support URL (https://lin.ee/x0yVB1kk) are preserved verbatim. |
| **7** | **GEMINI.md Rule 5 (Supabase Schema & RPC Alignment)** | **PASS** | All RPC calls in JS (increment_credits, sync_profile_credits) strictly align with SQL signatures using parameter p_user_id and p_amount. |
| **8** | **Production Build Verification** | **PASS** | 
pm run build compiles cleanly in 286ms without errors. |
| **9** | **Behavioral Test Suite Verification** | **FAIL** | 
pm test fails with 3 test failures (ADV-D2, EMP-FAULT-1, T3.2) due to double-refund defect in generate.js. |

---

## 2. Root Cause Analysis: Double-Refund Defect in generate.js

### Location:
C:\Auto script\frontend\functions\api\generate.js (Lines 227–264)

### Defect Mechanism:
1. **Upfront Credit Deduction (Line 160–170)**:
   `javascript
   const { data: updatedCredits, error: creditError } = await supabaseAdmin.rpc('increment_credits', {
     p_user_id: user.id,
     p_amount: -creditAmount
   });
   creditDeducted = true; // Flag is set to true
   `
2. **First Refund Triggered on Script Insert Failure (Lines 227–237)**:
   `javascript
   if (insertError) {
     console.error( Failed to insert script:, insertError);
     
     // ROLLBACK: Refund credits if history save fails
     await supabaseAdmin.rpc('increment_credits', {
       p_user_id: user.id,
       p_amount: creditAmount
     });
     
     throw new Error(Failed to save script history); // Throws error into catch block
   }
   `
3. **Second Refund Triggered in Outer Catch Block (Lines 257–263)**:
   `javascript
   } catch (err) {
     if (creditDeducted && userIdForRefund) {
       console.error(Execution failed after deduction. Issuing compensatory refund:, err);
       try {
         await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
       } catch {}
     }
     ...
   `
4. **Resulting Violation**:
   - creditDeducted was NOT reset to alse when the first refund completed at line 234.
   - When 	hrow new Error(...) transfers control to catch (err), the catch block sees creditDeducted === true and issues a **second refund** (+1 credit).
   - User with 7 credits loses 1 (6), gets refunded +1 (7), and gets refunded +1 again (8). User balance increases from 7 to 8 upon an error condition!
   - Total RPC calls = 3 (Expected: 2).

### Failed Test Evidence:
`
FAIL functions/api/__tests__/adversarial.test.js > ADV-D2: When script insert fails, credits remain 100% untouched and error is returned
AssertionError: expected 8 to be 7 // Object.is equality

FAIL functions/api/__tests__/challenger_empirical.test.js > EMP-FAULT-1: Script insert DB failure returns 500 and strictly prevents credit deduction
AssertionError: expected 3 to be 2 // Object.is equality

FAIL functions/api/__tests__/generate.test.js > T3.2: if scripts insertion fails, upfront deduction is refunded and 500 error returned
AssertionError: expected 3 to be 2 // Object.is equality
`

---

## 3. Actionable Remediation Blueprint for AI Developer

To resolve this integrity violation and achieve 100% test pass rate:

In rontend/functions/api/generate.js, update the insertError handling block to reset creditDeducted = false before rethrowing or let the catch block handle the compensatory refund exclusively:

`javascript
    if (insertError) {
      console.error(Failed to insert script:, insertError);
      
      // Reset creditDeducted flag so outer catch does not issue a duplicate refund
      creditDeducted = false;
      
      await supabaseAdmin.rpc('increment_credits', {
        p_user_id: user.id,
        p_amount: creditAmount
      });
      
      throw new Error(Failed to save script history);
    }
`
*Note also*: In line 261 of the catch block, p_amount: creditAmount should be used instead of hardcoded 1 to properly handle multi-version (cost: 2 credits) refunds.

---

## 4. Final Verdict

- **Verdict**: **INTEGRITY VIOLATION**
- **Action**: Reject work product until the double-refund bug in generate.js is resolved and all 100 Vitest tests pass cleanly.
