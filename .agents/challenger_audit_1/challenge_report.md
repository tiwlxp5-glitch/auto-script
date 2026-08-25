# EMPIRICAL CHALLENGER 1: Database & Backend Security & Integrity Challenge Report

**Target:** Auto Script Database Architecture, Cloudflare Pages Functions (`generate.js`, `webhook.js`), and PostgreSQL RPCs  
**Author:** Empirical Challenger 1 (`challenger_audit_1`)  
**Date:** 2026-08-25  
**Verdict:** ⛔ **REQUEST_CHANGES** (Actionable architectural and backend remediations required before production release)  

---

## 1. Executive Summary & Verdict

An empirical, adversarial challenge was conducted against the Database & Backend architecture of Auto Script. Using dedicated Vitest test harnesses (`functions/api/__tests__/challenger_empirical_db_backend.test.js`) and direct runtime execution, all reported vulnerabilities were stress-tested and proven under simulated adversarial conditions.

### Final Verdict: **REQUEST_CHANGES**

The system possesses strong security foundations (isolated server-side secrets, cryptographically verified Stripe signatures, and row-level locking during atomic RPCs). However, **multiple critical and high-severity transactional and financial logic bugs** were empirically reproduced:

1. **DB-06 / VULN-01 (High)**: A double-refund defect in `generate.js` when `scripts.insert` fails gives users +1 free credit on failure.
2. **DB-07 / VULN-02 (Medium/High)**: An asymmetric refund defect in `generate.js` when multi-version generation fails deducts 2 credits but only refunds 1, causing permanent credit loss.
3. **DB-01 (Critical)**: A regression in `increment_credits` migration removes the pre-deduction sufficiency check; when `credits = 0`, `greatest(0, 0 + (-1))` returns `0`, which passes `generate.js`'s `< 0` check and grants unlimited free script generations.
4. **VULN-04 (High)**: `webhook.js` omits checking `session.payment_status === 'paid'`, allowing delayed payment methods (bank transfers/Boleto) with `payment_status: 'unpaid'` to instantly receive 60 or 150 credits before funds settle.
5. **VULN-05 (High)**: `webhook.js` completely ignores `charge.refunded` and `charge.dispute.created` events, allowing refunded or chargeback accounts to retain purchased credits and Pro tier indefinitely.

---

## 2. Deep-Dive Empirical Findings & Proofs

---

### Challenge 1: Double-Refund Defect (DB-06 / VULN-01) in `generate.js`

- **Severity**: HIGH  
- **Affected File**: `frontend/functions/api/generate.js` (lines 227–237 and 257–263)  
- **Empirical Test**: `EMP-DB-06.1` & `EMP-DB-06.2` in `challenger_empirical_db_backend.test.js`  

#### Attack Mechanism & Code Walkthrough
In `generate.js`, upfront deduction occurs at line 159:
```javascript
creditDeducted = true;
```
When `supabaseAdmin.from('scripts').insert(...)` fails (due to DB constraint, schema mismatch, or connection drop):
```javascript
// Lines 227-237:
if (insertError) {
  console.error("Failed to insert script:", insertError);
  // REFUND #1: Issued here
  await supabaseAdmin.rpc('increment_credits', {
    p_user_id: user.id,
    p_amount: creditAmount
  });
  throw new Error("Failed to save script history");
}
```
The thrown error is intercepted by the outer `catch (err)` block:
```javascript
// Lines 257-263:
} catch (err) {
  if (creditDeducted && userIdForRefund) {
    // REFUND #2: Issued here because creditDeducted was NOT reset!
    try {
      await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
    } catch {}
  }
}
```

#### Empirical Test Results
- **Scenario**: User has 5 credits. Single-version script requested (`creditAmount = 1`). `scripts.insert` injected with failure.
- **Trace**:
  1. `increment_credits(user_id, -1)` -> Credits: 5 -> 4
  2. `increment_credits(user_id, +1)` (inside `if (insertError)`) -> Credits: 4 -> 5
  3. `increment_credits(user_id, +1)` (inside `catch (err)`) -> Credits: 5 -> 6
- **Result**: User started with 5 credits and ended with 6 credits!
- **Test Output**: `RPC calls count = 3`, `finalCredits = 6`. Test passed with 100% reproduction.

---

### Challenge 2: Asymmetric Credit Refund (DB-07 / VULN-02 / VULN-05) in `generate.js`

- **Severity**: HIGH  
- **Affected File**: `frontend/functions/api/generate.js` (lines 156 and 261)  
- **Empirical Test**: `EMP-DB-07.1` in `challenger_empirical_db_backend.test.js`  

#### Attack Mechanism & Code Walkthrough
When a Pro user requests multi-version generation (`isMultiVersion: true`), line 156 sets `creditAmount = 2`:
```javascript
creditAmount = isMultiVersion ? 2 : 1;
// Deducts 2 credits:
await supabaseAdmin.rpc('increment_credits', { p_user_id: user.id, p_amount: -creditAmount });
```
If Google Gemini API throws an error (e.g., 503 Overloaded, 429 Quota Exceeded, safety filter rejection), execution jumps directly to `catch (err)`:
```javascript
} catch (err) {
  if (creditDeducted && userIdForRefund) {
    try {
      await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 }); // Hardcoded 1!
    } catch {}
  }
}
```

#### Empirical Test Results
- **Scenario**: Pro user has 10 credits. Multi-version generation (`creditAmount = 2`). Gemini API fails with 503.
- **Trace**:
  1. `increment_credits(user_id, -2)` -> Credits: 10 -> 8
  2. Gemini fails -> outer catch triggers `increment_credits(user_id, 1)` -> Credits: 8 -> 9
- **Result**: User paid 2 credits for an aborted generation and was refunded only 1 credit. 1 credit permanently lost.
- **Test Output**: `finalCredits = 9`. Test passed with 100% reproduction.

---

### Challenge 3: Zero-Credit Generation Bypass (DB-01) in `increment_credits` Logic

- **Severity**: CRITICAL  
- **Affected Files**: `supabase/migrations/20260824_freemium_trial.sql` (lines 50-60), `frontend/functions/api/generate.js` (lines 167-169)  
- **Empirical Test**: `EMP-DB-01.1` & `EMP-DB-01.2` in `challenger_empirical_db_backend.test.js`  

#### Vulnerability Mechanism
In `20260824_atomic_credit_guard.sql`, the RPC checked:
```sql
IF p_amount < 0 AND coalesce(v_current_credits, 0) < abs(p_amount) THEN
  RETURN -1;
END IF;
```
However, `20260824_freemium_trial.sql` dropped this check and used arithmetic clipping:
```sql
UPDATE public.profiles
SET credits = greatest(0, coalesce(v_profile.credits, 0) + p_amount)
WHERE id = p_user_id
RETURNING credits INTO v_new_credits;

RETURN v_new_credits;
```
When `credits = 0` and `p_amount = -1`:
`greatest(0, 0 + (-1))` evaluates to `0`. The RPC returns `0`.

In `generate.js` (line 167):
```javascript
if (updatedCredits === null || updatedCredits < 0) {
  return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
}
```
Because `0` is NOT `null` and `0 < 0` is `false`, the 402 guard is bypassed. The endpoint invokes Gemini AI and generates the script for free.

#### Empirical Test Results
- **Test EMP-DB-01.1**: When `increment_credits` returns `0`, `generate.js` returns HTTP 200 and successfully returns a script to a 0-credit user.
- **Test EMP-DB-01.2**: When `increment_credits` returns `-1` (via strict guard), `generate.js` returns HTTP 402 `เครดิตไม่พอ กรุณาเติมเครดิต`.

---

### Challenge 4: Unchecked `payment_status` in Webhook (VULN-04)

- **Severity**: HIGH  
- **Affected File**: `frontend/functions/api/webhook.js` (lines 46-59)  
- **Empirical Test**: `EMP-VULN-04` in `challenger_empirical_db_backend.test.js`  

#### Vulnerability Mechanism
In `webhook.js`:
```javascript
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const userId = session.client_reference_id;
  if (userId) {
    const amountPaid = session.amount_subtotal;
    let addCredits = amountPaid >= 59000 ? 150 : 60;
    // Immediately upserts tier and adds credits!
  }
}
```
For asynchronous payment methods (Boleto, bank wires, delayed SEPA), Stripe emits `checkout.session.completed` while `session.payment_status === 'unpaid'`. Granting credits immediately allows attackers to start a deferred payment, consume 150 AI credits, and cancel the payment before settlement.

#### Empirical Test Results
- **Scenario**: Incoming `checkout.session.completed` with `payment_status: 'unpaid'`.
- **Result**: `webhook.js` returned HTTP 200 and immediately credited 150 credits and upgraded user to Pro.
- **Remediation**: Require `if (session.payment_status !== 'paid') { return new Response('Payment pending', { status: 200 }); }`.

---

### Challenge 5: Unhandled `charge.refunded` & `charge.dispute.created` (VULN-05 / VULN-03)

- **Severity**: HIGH  
- **Affected File**: `frontend/functions/api/webhook.js` (lines 90-95)  
- **Empirical Test**: `EMP-VULN-05.1` & `EMP-VULN-05.2` in `challenger_empirical_db_backend.test.js`  

#### Vulnerability Mechanism
When a merchant issues a refund or a cardholder initiates a chargeback via Stripe:
- Stripe sends `charge.refunded` or `charge.dispute.created`.
- `webhook.js` falls through with `return new Response(JSON.stringify({ received: true }), { status: 200 })`.
- No database update occurs. The refunded customer retains all granted credits and remains on Pro tier.

#### Empirical Test Results
- **Test EMP-VULN-05.1**: Sent `charge.refunded` event for Pro user. Profile credits remained 150 and tier remained `pro`.
- **Test EMP-VULN-05.2**: Sent `charge.dispute.created` event. Profile credits and tier remained active.

---

### Challenge 6: Webhook Idempotency & Database Failure Resilience

- **Severity**: VERIFIED ROBUST  
- **Affected File**: `frontend/functions/api/webhook.js` (lines 32-44, 73, 86, 98)  
- **Empirical Test**: `EMP-IDEMP-01` in `challenger_empirical_db_backend.test.js`  

#### Verification Results
- 10 concurrent identical webhook deliveries (`event.id = 'evt_concurrent_replay_1'`) were processed.
- Exactly 1 delivery acquired the insertion into `webhook_events`, while the other 9 encountered unique constraint code `23505` and returned HTTP 200 `Already processed`.
- Exact credits granted: 150 (NOT 1,500).
- Idempotency deduplication is verified robust.

---

## 3. Vitest Empirical Test Execution Log

```
 RUN  v4.1.11 C:/Auto script/frontend

 ✓ functions/api/__tests__/challenger_empirical_db_backend.test.js (9 tests) 44ms
   ✓ 1. Double-Refund Vulnerability (DB-06 / VULN-01) on Script Insert Failure
     ✓ EMP-DB-06.1: Demonstrates that when scripts.insert fails, generate.js executes TWO compensatory refunds (net +1 credit gain)
     ✓ EMP-DB-06.2: Multi-version generation insert failure results in 3 RPC calls and +1 bonus credit
   ✓ 2. Asymmetric Credit Refund (DB-07 / VULN-02 / VULN-05) on Multi-Version Failures
     ✓ EMP-DB-07.1: Multi-version generation deducts 2 credits but only refunds 1 credit on Gemini AI error
   ✓ 3. Zero-Credit Bypass Vulnerability (DB-01) Regression Analysis
     ✓ EMP-DB-01.1: Simulating greatest(0, credits + p_amount) SQL without sufficiency check allows 0-credit user to generate scripts
     ✓ EMP-DB-01.2: Atomic pre-deduction guard (IF credits < abs(p_amount) THEN RETURN -1) strictly blocks 0-credit requests with 402
   ✓ 4. Stripe Webhook Event Matrix & Payment Status Gaps (VULN-04 / VULN-05)
     ✓ EMP-VULN-04: Unchecked payment_status in checkout.session.completed grants credits on unpaid asynchronous sessions
     ✓ EMP-VULN-05.1: Unhandled charge.refunded event does not revoke credits or downgrade tier
     ✓ EMP-VULN-05.2: Unhandled charge.dispute.created leaves fraudulent/chargeback account active
     ✓ EMP-IDEMP-01: Webhook idempotency correctly handles replay floods and deduplicates credit grants

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  343ms
```

---

## 4. Actionable Remediation Blueprint for Implementers

### Remediation Step 1: Fix `generate.js` Double-Refund and Asymmetric Refund

In `frontend/functions/api/generate.js`:
```javascript
// 1. Inside `if (insertError)`: Set creditDeducted = false immediately after refunding
if (insertError) {
  console.error("Failed to insert script:", insertError);
  await supabaseAdmin.rpc('increment_credits', {
    p_user_id: user.id,
    p_amount: creditAmount
  });
  creditDeducted = false; // PREVENTS DOUBLE-REFUND IN CATCH BLOCK
  throw new Error("Failed to save script history");
}

// 2. Inside outer `catch (err)`: Refund creditAmount (not hardcoded 1)
} catch (err) {
  if (creditDeducted && userIdForRefund) {
    console.error("Execution failed after deduction. Issuing compensatory refund:", err);
    try {
      await supabaseAdmin.rpc('increment_credits', { 
        p_user_id: userIdForRefund, 
        p_amount: creditAmount // DYNAMIC: 1 for single, 2 for multi-version
      });
    } catch {}
  }
  console.error("Generate API Error:", err);
  return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), { 
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Remediation Step 2: Fix `increment_credits` Migration in PostgreSQL

Apply the consolidated master migration with strict pre-deduction sufficiency check:
```sql
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_credits INT;
  v_new_credits INT;
  v_profile RECORD;
BEGIN
  -- Strict caller verification: only service_role or DB superuser can adjust credits
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: increment_credits may only be executed by service_role';
  END IF;

  SELECT * INTO v_profile 
  FROM public.profiles 
  WHERE id = p_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_current_credits := coalesce(v_profile.credits, 0);

  -- STRICT PRE-DEDUCTION BALANCE CHECK (Prevents 0-credit bypass)
  IF p_amount < 0 AND v_current_credits < abs(p_amount) THEN
    RETURN -1;
  END IF;

  -- Weekly free credit reset
  IF v_profile.tier = 'free' AND now() >= v_profile.last_free_reset + interval '7 days' THEN
    v_current_credits := 3;
    v_profile.last_free_reset := now();
  END IF;

  v_new_credits := greatest(0, v_current_credits + p_amount);

  UPDATE public.profiles
  SET 
    credits = v_new_credits,
    last_free_reset = v_profile.last_free_reset,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN v_new_credits;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_credits(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, INT) TO service_role;
```

### Remediation Step 3: Harden `webhook.js` for Payment Status and Refunds

In `frontend/functions/api/webhook.js`:
```javascript
// 1. Guard against unpaid asynchronous checkout sessions
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  if (session.payment_status !== 'paid') {
    console.log(`Payment status for session ${session.id} is ${session.payment_status}. Deferring credit grant.`);
    return new Response('Payment pending', { status: 200 });
  }
  // Proceed with tier update and credit increment...
}

// 2. Handle refund and chargeback events
if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
  const charge = event.data.object;
  const customerId = charge.customer;
  if (customerId) {
    const { data: profile } = await supabase.from('profiles').select('id, credits').eq('stripe_customer_id', customerId).single();
    if (profile) {
      // Downgrade tier to free and revoke credits
      await supabase.from('profiles').update({ tier: 'free', credits: 0 }).eq('id', profile.id);
      console.log(`Revoked tier and credits for refunded customer: ${customerId}`);
    }
  }
}
```

---

## 5. Summary Findings Table

| Vulnerability ID | Component | Severity | Empirical Status | Impact | Recommended Action |
|---|---|---|---|---|---|
| **DB-01** | `increment_credits` | **CRITICAL** | **PROVEN** | 0-credit users get free AI scripts | Add `IF credits < abs(p_amount) THEN RETURN -1;` |
| **DB-06 / VULN-01** | `generate.js:227-263` | **HIGH** | **PROVEN** | Script insert error yields +1 free credit | Set `creditDeducted = false` after inner refund |
| **DB-07 / VULN-02** | `generate.js:261` | **HIGH** | **PROVEN** | Multi-version AI failure loses 1 credit | Refund `creditAmount` instead of hardcoded `1` |
| **VULN-04** | `webhook.js:46-50` | **HIGH** | **PROVEN** | Unpaid async sessions get credits | Check `session.payment_status === 'paid'` |
| **VULN-05** | `webhook.js:90-95` | **HIGH** | **PROVEN** | Refunded users keep credits & Pro tier | Handle `charge.refunded` & `charge.dispute.created` |
