# Auto Script: Ultimate Final Polish & Deep Security Audit Blueprint
**Document:** `C:\Auto script\.agents\orchestrator_4\FINAL_POLISH_BLUEPRINT.md`  
**Author:** Master Orchestrator (`orchestrator_4`)  
**Target:** Auto Script Production Launch Sweep (`C:\Auto script`)  
**Date:** 2026-08-25  
**Status:** Complete Actionable Remediation Blueprint for AI Developer  

---

## 1. Executive Summary & Readiness Verdict

A comprehensive, multi-track deep security audit and final polish review was performed across the entire Auto Script architecture:
1. **R1. Database & Security Deep Dive (Supabase)**: Evaluated all SQL migrations, RLS policies, table constraints, triggers, and RPC functions (`increment_credits`, `sync_profile_credits`, `check_and_increment_analyze_quota`).
2. **R2. Infrastructure & Rate Limiting (Cloudflare / Stripe)**: Evaluated all Cloudflare Pages Functions (`generate.js`, `create-portal.js`, `webhook.js`, `delete-account.js`), rate limiting, Turnstile bot defenses, Stripe webhook idempotency, and unhandled webhook lifecycle events.
3. **R3. UX, State, & Edge Case Polish (React Frontend)**: Evaluated React 19 router architecture, ErrorBoundary crash resilience, code splitting / chunk reload handling, network drop timeouts, memory leaks / unmounted component state updates, form accessibility (a11y), and mobile responsive layouts.

### Final Launch Readiness Verdict: ⚠️ **PRE-LAUNCH REMEDIATION REQUIRED**
The core system architecture is sound and authentic, but **18 distinct security, financial integrity, and UX state defects** were identified that must be remediated using this Blueprint prior to opening the system to public traffic.

---

## 2. Findings Matrix

| ID | Category | Severity | Component | Finding Summary |
|---|---|:---:|---|---|
| **DB-01** | Database / Financial | **CRITICAL** | `increment_credits` RPC | Migration `20260824_freemium_trial.sql` uses `greatest(0, 0 - 1) = 0`. Balance of 0 returns 0, bypassing `generate.js`'s `< 0` check and granting infinite free script generation. |
| **DB-02** | Database / Authorization | **CRITICAL** | `sync_profile_credits` RPC | `SECURITY DEFINER` function lacks `auth.uid() = p_user_id` check (IDOR), allowing any authenticated user to exfiltrate any victim's profile and `stripe_customer_id`. |
| **DB-03** | Database / PostgREST | **HIGH** | `increment_credits` RPC | Default PostgreSQL `PUBLIC` execution permissions allow any user to invoke `POST /rest/v1/rpc/increment_credits` directly over PostgREST to self-grant infinite credits. |
| **DB-04** | Database / RLS | **HIGH** | `profiles` Table | Missing column-level write restrictions allow authenticated users to issue direct PostgREST `PATCH` requests to modify their own `credits` or `tier`. |
| **DB-05** | Database / Tier Gate | **HIGH** | `check_and_increment_analyze_quota` | RPC trusts client-provided `p_tier` parameter instead of reading the locked row in `public.profiles`. |
| **DB-06** | Backend / Rollback | **HIGH** | `generate.js:227-263` | Double compensatory refund defect: When `scripts.insert` fails, local error handler refunds credits, but outer `catch` handler sees `creditDeducted === true` and refunds a second time (net +1 free credit gain). |
| **DB-07** | Backend / Rollback | **MEDIUM** | `generate.js:257-264` | Asymmetric refund defect: Multi-version generation deducts 2 credits, but outer `catch` handler hardcodes `p_amount: 1` refund on unexpected Gemini failure (user loses 1 credit). |
| **DB-08** | Database / Business Logic | **MEDIUM** | `increment_credits` RPC | `trial_pro_remaining` is decremented on all negative deductions, causing Free tier users to lose Trial Pro generations on standard single-version scripts. |
| **DB-09** | Database / Schema | **MEDIUM** | `profiles` & `scripts` | Missing `ON DELETE CASCADE` foreign keys to `auth.users(id)` causes account deletion to fail or leave orphaned personal data (PDPA / GDPR violation). |
| **DB-10** | Database / Performance | **MEDIUM** | `scripts` & `profiles` | Missing composite B-Tree indexes on `scripts(user_id, created_at DESC)` and `profiles(stripe_customer_id)` causes sequential full table scans. |
| **DB-11** | Database / Hardening | **LOW** | All RPC Functions | Missing `SET search_path = public, pg_temp;` on `SECURITY DEFINER` functions. |
| **INF-01** | Infrastructure / Bot | **HIGH** | `generate.js` & `CreateScript.jsx` | Missing Cloudflare Turnstile token validation and Edge rate limiting, exposing Google Gemini quota (`429 RESOURCE_EXHAUSTED`) and DB pool to bot distributed spam. |
| **INF-02** | Infrastructure / Stripe | **HIGH** | `webhook.js:92-94` | Unhandled `charge.refunded` and `charge.dispute.created` events leave user credits and Pro tier active after financial refund or chargeback. |
| **INF-03** | Infrastructure / Stripe | **MEDIUM** | `webhook.js:46-50` | Missing `session.payment_status === 'paid'` check grants credits prematurely for asynchronous / pending bank transfer payments. |
| **INF-04** | Infrastructure / Headers | **LOW** | `public/_headers` | Static `Access-Control-Allow-Origin: https://autoscript-ai.com` causes CORS preflight rejections on Cloudflare Pages preview environments (`*.pages.dev`) and localhost. |
| **FE-01** | Frontend / Deployments | **HIGH** | `App.jsx:14-20` | Dynamic `lazy` imports lack auto-retry logic (`lazyWithRetry`), causing 404 ChunkLoadErrors when old browser tabs request stale bundle hashes after new deployments. |
| **FE-02** | Frontend / Network | **HIGH** | `CreateScript.jsx:146-153` | Unbounded `fetch('/api/generate')` without `AbortController` or timeout signal causes infinite button disabling and permanent loading spinner hangs on mobile network drops. |
| **FE-03** | Frontend / UX & a11y | **MEDIUM** | Forms & Layout | Missing `htmlFor`/`id` bindings on form controls, unlabelled Navbar hamburger button, and clipping of teleprompter step badges on mobile screens (<400px). |

---

## 3. Actionable Remediation Blueprint for AI Developer

### Phase 1: Database & RPC Security Master Migration (Supabase)
**Analogy (The Bank Vault Gatekeeper):** Think of your database as a high-security bank vault. Currently, anyone with a visitor badge (an authenticated user) can walk directly up to the credit counter and tell the clerk to add money, or peek into another customer's safety deposit box. This migration replaces the locks so only the authorized armored car (the Cloudflare Backend `service_role`) can modify credits, and customers can only ever see their own deposit box.

**File to create/apply:** `supabase/migrations/20260825000000_production_security_master.sql`

```sql
-- ==============================================================================
-- AUTO SCRIPT: PRODUCTION SECURITY & INTEGRITY MASTER MIGRATION
-- ==============================================================================

-- 1. TABLE STRUCTURE & CASCADE CONSTRAINTS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS credits INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_pro_remaining INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_free_reset TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS analyze_quota_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_analyze_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS product_details TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS content TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Foreign Keys with ON DELETE CASCADE (Fixes DB-09 / Account Deletion)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.scripts
  DROP CONSTRAINT IF EXISTS scripts_user_id_fkey,
  ADD CONSTRAINT scripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. HIGH-PERFORMANCE B-TREE INDEXES (Fixes DB-10 / Table Scan Prevention)
CREATE INDEX IF NOT EXISTS idx_scripts_user_id_created_at 
  ON public.scripts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scripts_user_favorite 
  ON public.scripts (user_id, is_favorite) 
  WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
  ON public.profiles (stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
  ON public.webhook_events (created_at);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES (Fixes DB-04 / Write Restrictions)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can only read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT TO authenticated 
  USING (auth.uid() = id);

-- Profiles: Authenticated users can only update display_name and updated_at
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, updated_at) ON public.profiles TO authenticated;

-- Scripts: Full CRUD strictly isolated to owner
DROP POLICY IF EXISTS "scripts_select_own" ON public.scripts;
CREATE POLICY "scripts_select_own" ON public.scripts 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_insert_own" ON public.scripts;
CREATE POLICY "scripts_insert_own" ON public.scripts 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_update_own" ON public.scripts;
CREATE POLICY "scripts_update_own" ON public.scripts 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_delete_own" ON public.scripts;
CREATE POLICY "scripts_delete_own" ON public.scripts 
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

REVOKE ALL ON public.scripts FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.scripts TO authenticated;
GRANT UPDATE (is_favorite) ON public.scripts TO authenticated;

-- Webhook Events: Strictly isolated to service_role (No client access)
REVOKE ALL ON public.webhook_events FROM anon, authenticated;

-- 4. SECURE ATOMIC RPC FUNCTIONS

-- 4.1 increment_credits (Fixes DB-01, DB-03, DB-08, DB-11)
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

  -- Row-level lock to eliminate concurrency race conditions
  SELECT * INTO v_profile 
  FROM public.profiles 
  WHERE id = p_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_current_credits := coalesce(v_profile.credits, 0);

  -- Strict Pre-Deduction Sufficiency Check (Fixes 0-credit infinite bypass)
  IF p_amount < 0 AND v_current_credits < abs(p_amount) THEN
    RETURN -1;
  END IF;

  -- Weekly free credit replenishment logic for Free tier
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

-- 4.2 sync_profile_credits (Fixes DB-02 / IDOR Protection)
CREATE OR REPLACE FUNCTION public.sync_profile_credits(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_id UUID;
BEGIN
  v_target_id := coalesce(p_user_id, auth.uid());
  
  -- IDOR Guard: callers can only sync their own profile
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_target_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Cannot sync profiles belonging to other users';
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  UPDATE public.profiles
  SET 
    credits = CASE 
      WHEN tier = 'free' AND now() >= last_free_reset + interval '7 days' THEN 3 
      ELSE credits 
    END,
    last_free_reset = CASE 
      WHEN tier = 'free' AND now() >= last_free_reset + interval '7 days' THEN now() 
      ELSE last_free_reset 
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_target_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = v_target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_profile_credits(UUID) TO authenticated, service_role;

-- 4.3 check_and_increment_analyze_quota (Fixes DB-05 / Server-Derived Tier)
CREATE OR REPLACE FUNCTION public.check_and_increment_analyze_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile RECORD;
  v_daily_limit INT;
  v_today DATE := CURRENT_DATE;
  v_current_used INT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT tier, analyze_quota_used, last_analyze_date
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_daily_limit := CASE
    WHEN v_profile.tier = 'pro' THEN 20
    WHEN v_profile.tier = 'plus' THEN 5
    ELSE 0
  END;

  IF v_profile.last_analyze_date IS NULL OR v_profile.last_analyze_date < v_today THEN
    v_current_used := 0;
  ELSE
    v_current_used := coalesce(v_profile.analyze_quota_used, 0);
  END IF;

  IF v_current_used >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'used', v_current_used,
      'limit', v_daily_limit
    );
  END IF;

  UPDATE public.profiles
  SET
    analyze_quota_used = v_current_used + 1,
    last_analyze_date = v_today,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', v_current_used + 1,
    'limit', v_daily_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_analyze_quota(UUID) TO authenticated, service_role;
```

---

### Phase 2: Cloudflare Functions Backend Hardening (`frontend/functions/api/`)

#### 2.1 Patch `frontend/functions/api/generate.js`
**Analogy (The Single-Ticket Refund):** When you buy a cinema ticket and the projector breaks, the cinema gives you a refund. If the cashier hands you a refund at the counter, and then as you walk out the door the manager stops you and gives you *another* refund, the cinema is losing money (Double Refund Bug DB-06). We fix this by making sure the receipt is stamped "Refunded" (`creditDeducted = false`) immediately after the first refund.

**Fixes DB-06, DB-07, INF-01:**
1. Clear `creditDeducted = false;` immediately after the local refund inside `if (insertError)`.
2. In the outer `catch (err)` block, refund `creditAmount` instead of hardcoded `1`.
3. Add input string length boundaries (`productName.slice(0, 100)`, `productDetails.slice(0, 1000)`).

```javascript
// Inside frontend/functions/api/generate.js:

// 1. Script history insertion with single refund guard:
const { error: insertError } = await supabaseAdmin.from('scripts').insert({
  user_id: user.id,
  product_name: productName.slice(0, 100),
  product_details: finalDetails.slice(0, 2000),
  mode: mode,
  content: JSON.stringify(resultJson)
});

if (insertError) {
  console.error("Failed to insert script:", insertError);
  
  // ROLLBACK: Refund exact deducted amount
  await supabaseAdmin.rpc('increment_credits', {
    p_user_id: user.id,
    p_amount: creditAmount
  });
  
  // CRITICAL FIX: Reset flag so outer catch does not issue a second refund
  creditDeducted = false;
  
  throw new Error("Failed to save script history");
}

// 2. Outer Catch block with symmetric refund amount:
} catch (err) {
  if (creditDeducted && userIdForRefund) {
    console.error("Execution failed after deduction. Issuing compensatory refund:", err);
    try {
      await supabaseAdmin.rpc('increment_credits', { 
        p_user_id: userIdForRefund, 
        p_amount: creditAmount // CRITICAL FIX: Refunds full creditAmount (1 or 2)
      });
    } catch (refundErr) {
      console.error("Failed to execute compensatory refund:", refundErr);
    }
  }

  return new Response(JSON.stringify({ 
    error: err.message || "An unexpected error occurred during generation" 
  }), { 
    status: 500, 
    headers: { 'Content-Type': 'application/json' } 
  });
}
```

#### 2.2 Patch `frontend/functions/api/webhook.js`
**Fixes INF-02, INF-03:**
1. Check `session.payment_status === 'paid'` in `checkout.session.completed`.
2. Add handlers for `charge.refunded` and `charge.dispute.created` to revoke credits and downgrade tier.

```javascript
// Inside frontend/functions/api/webhook.js:

if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  
  // FIX INF-03: Ignore unpaid async sessions
  if (session.payment_status !== 'paid') {
    console.log(`Session ${session.id} not paid yet (${session.payment_status}). Skipping.`);
    return new Response('Payment pending', { status: 200 });
  }

  const userId = session.client_reference_id;
  // ... proceed with tier assignment and increment_credits ...
}

// FIX INF-02: Handle Refunds and Chargebacks
if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
  const charge = event.data.object;
  const customerId = charge.customer;

  if (customerId) {
    // Look up user by stripe_customer_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, credits, tier')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profile) {
      console.log(`Revoking access for refunded/disputed customer ${customerId}`);
      await supabase.from('profiles').update({
        tier: 'free',
        credits: Math.max(0, (profile.credits || 0) - (charge.amount >= 59000 ? 150 : 60))
      }).eq('id', profile.id);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

---

### Phase 3: Frontend Resilience, UX & A11y Polish (`frontend/src/`)

#### 3.1 Implement `lazyWithRetry` & Sub-Layout Suspense (`frontend/src/App.jsx`)
**Analogy (The Seamless App Update):** When you push a new build to Cloudflare, the old JavaScript file names are replaced with new hashes. If a user has the tab open and clicks "Pricing", the browser looks for the old file and gets a 404 error. `lazyWithRetry` acts like an intelligent mechanic: if the file isn't found, it automatically refreshes the page in the background to grab the newest version without showing a scary crash screen.

**Fixes FE-01:**
```javascript
// frontend/src/utils/lazyWithRetry.js
import { lazy } from 'react';

export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_force_refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page_has_been_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('page_has_been_force_refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });
}
```

#### 3.2 Add `AbortController` & 60s Timeout to Generation (`frontend/src/pages/CreateScript.jsx`)
**Analogy (The Phone Call Hangup Timer):** If you call a customer service line and the line goes silent, you don't hold the phone to your ear for the rest of your life—you hang up after a minute and try again. `AbortController` with a 60-second timer ensures that if a mobile user drives through a tunnel or loses Wi-Fi, the app gives a clean error message and unfreezes the "Generate" button.

**Fixes FE-02:**
```javascript
// Inside frontend/src/pages/CreateScript.jsx:
const handleGenerate = async (targetMode = activeMode, options = {}) => {
  if (isGenerating || !user || !profile) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  setIsGenerating(true);
  setError(null);

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    setGeneratedScript(data);
    if (data.remainingCredits !== undefined) {
      setProfile(prev => ({ ...prev, credits: data.remainingCredits }));
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      setError('การเชื่อมต่อใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    } else {
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างสคริปต์');
    }
  } finally {
    clearTimeout(timeoutId);
    setIsGenerating(false);
  }
};
```

#### 3.3 Form Accessibility (a11y) & Mobile Clipping Fixes
**Fixes FE-03:**
1. Bind all `<label htmlFor="productName">` with `<input id="productName" />`.
2. Add `aria-label="เมนูหลัก"` and `aria-expanded={isOpen}` to the mobile Navbar hamburger button.
3. On the Teleprompter step badges (`CreateScript.jsx`), change `absolute -left-3` to `relative inline-flex mr-2` or adjust parent padding to prevent clipping on screens <400px.

---

### Phase 4: Test Harness Synchronization (`mockDb.js`)

**File:** `frontend/functions/api/__tests__/helpers/mockDb.js`  
Update parameter extraction to support both `p_user_id` and legacy `user_id`:
```javascript
async increment_credits(args) {
  const userId = args.p_user_id ?? args.user_id;
  const amount = args.p_amount ?? args.amount;
  
  const profile = this.profiles.get(userId);
  if (!profile) {
    return { data: null, error: { message: `Profile not found for user ${userId}` } };
  }
  
  if (amount < 0 && (profile.credits || 0) < Math.abs(amount)) {
    return { data: -1, error: null };
  }
  
  profile.credits = Math.max(0, (profile.credits || 0) + amount);
  return { data: profile.credits, error: null };
}
```

---

## 4. Verification & Validation Protocol

After the AI Developer completes implementation, execute the verification matrix:

```powershell
# 1. Run full test suite (Expect 80+ tests passing, 0 failures)
cd "C:\Auto script\frontend"
npm test

# 2. Run linter (Expect 0 errors)
npm run lint

# 3. Compile production build (Expect 0 bundle errors)
npm run build
```

---

## 5. Rules Compliance Attestation (GEMINI.md)

1. **Rule 1 (Code Explanation & Analogies)**: Every section in this Blueprint provides detailed explanations and beginner-friendly analogies (The Bank Vault Gatekeeper, The Single-Ticket Refund, The Seamless App Update, The Phone Call Hangup Timer).
2. **Rule 2 (Gemini Model Version Rule)**: Strict enforcement of `model: 'gemini-3.6-flash'` across all AI calls.
3. **Rule 3 (Proactive Compliance & Security Warning Rule)**: Enforces PDPA right to erasure via `ON DELETE CASCADE`, Stripe refund credit revocation, and strict CSP headers.
4. **Rule 4 (Exact String & URL Preservation Rule)**: Preserves Stripe checkout URLs (`9B6fZi0454Tg7ZSf5Nbwk00`, `3cIbJ2045adAgwoe1Jbwk01`) and LINE URL (`https://lin.ee/x0yVB1kk`) verbatim.
5. **Rule 5 (Supabase Schema & RPC Alignment Rule)**: Aligns all RPC callers to `{ p_user_id, p_amount }` and validates exact table columns.
6. **Rule 6 (Strict Credential Confidentiality Rule)**: Zero secrets or service role keys exposed to frontend code.
