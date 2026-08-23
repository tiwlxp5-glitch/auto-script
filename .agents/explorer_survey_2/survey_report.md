# Comprehensive Survey Report: Test Infrastructure, Database Architecture, and API Verification

**Author:** `explorer_survey_2`  
**Date:** 2026-08-24  
**Project Root:** `c:\Auto script`  
**Working Directory:** `c:\Auto script\.agents\explorer_survey_2`  
**Target Requirements:** R1 (create-portal IDOR), R2 (RPC Race Condition), R3 (Order of Operations), R4 (targetAudience Auth)

---

## 1. Executive Summary

This survey report provides a detailed technical evaluation of the **Auto Script** application codebase, focusing on test infrastructure, build toolchains, Cloudflare Pages backend functions, Supabase database schemas and RPC definitions, and frontend call sites.

### Key Assessment Findings
1. **Application Topology:**
   - **Frontend:** React 19 + Vite 8 + Tailwind CSS v4 Single Page Application in `frontend/src/`.
   - **Backend:** Cloudflare Pages Functions in `frontend/functions/api/` (`create-portal.js`, `delete-account.js`, `generate.js`, `webhook.js`).
   - **Database & Auth:** Supabase PostgreSQL (`public.profiles`, `public.scripts`, `public.webhook_events`) with Supabase Auth.
   - **External Integrations:** Stripe (PromptPay / Card one-time checkout & Billing Portal), Google Gemini API (`gemini-3.6-flash`), Jina AI (`r.jina.ai`).

2. **Test Infrastructure Status:**
   - **Current State:** No automated test runner (Vitest, Jest, Playwright) is currently configured in `frontend/package.json`.
   - **Linter & Build Health:** `npm run build` succeeds (Vite 8.2.2 bundle produced), `npm run lint` (`oxlint`) passes with 0 errors (10 warnings on unused vars / effect patterns).
   - **Test Strategy:** Cloudflare Pages Functions export pure JS handlers (`onRequestPost({ request, env })`) that can be executed and tested via Vitest with lightweight mocks for `@supabase/supabase-js`, `stripe`, and `@google/genai`.

3. **Vulnerability Verification & Mapping:**
   - **R1 (`create-portal.js`):** Confirmed IDOR vulnerability. The endpoint currently parses `customerId` directly from the request JSON without checking the `Authorization` header.
   - **R2 (`webhook.js` & `generate.js`):** Confirmed race conditions. Both files perform read-modify-write cycles in JS (`select credits` -> calculate `newCredits` -> `update`/`upsert`) rather than using an atomic Supabase RPC function (`increment_credits`).
   - **R3 (`generate.js`):** Confirmed order-of-operations defect. Credits are deducted on line 152 before inserting the script history into the `scripts` table on line 155.
   - **R4 (`generate.js`):** Confirmed authorization bypass. Line 86 and line 130 accept and include `targetAudience` in the Gemini AI prompt without validating that `profile.tier !== 'free'`.

---

## 2. Project Structure and Code Layout

```
c:\Auto script\
├── .agents/                                # Agent metadata, plans, reports
│   ├── ORIGINAL_REQUEST.md                 # Authoritative user requirements
│   ├── orchestrator_1/                     # Project orchestrator
│   ├── explorer_survey_1/                  # Survey agent 1
│   ├── explorer_survey_2/                  # Survey agent 2 (Self)
│   ├── spec_miner_survey_3/                # Spec miner agent 3
│   └── skills/cloudflare-supabase-security/ # Domain security runbook
├── frontend/                               # Main Application Package
│   ├── functions/                          # Cloudflare Pages Functions (Backend)
│   │   └── api/
│   │       ├── create-portal.js            # [R1 Vulnerability] Stripe Billing Portal API
│   │       ├── delete-account.js           # Account deletion API (Admin Auth)
│   │       ├── generate.js                 # [R2, R3, R4 Vulnerabilities] AI Script Generation API
│   │       └── webhook.js                  # [R2 Vulnerability] Stripe Webhook Handler
│   ├── public/
│   │   ├── _headers                        # Cloudflare Security Headers (CSP, HSTS, X-Frame)
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/                                # Frontend React Application
│   │   ├── components/
│   │   │   └── Navbar.jsx                  # Navigation & User Profile dropdown
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx              # App layout wrapper
│   │   ├── lib/
│   │   │   ├── bannedWords.js              # Thai social media banned words checker
│   │   │   └── supabase.js                 # Supabase Browser Client (Anon Key)
│   │   ├── pages/
│   │   │   ├── CreateScript.jsx            # Script generator UI (calls /api/generate)
│   │   │   ├── History.jsx                 # Script history & favorites UI (queries public.scripts)
│   │   │   ├── Home.jsx                    # Landing page & feature showcase
│   │   │   ├── Legal.jsx                   # Terms of Service & Privacy Policy
│   │   │   ├── Login.jsx                   # Auth login page
│   │   │   ├── Pricing.jsx                 # Pricing tiers & Stripe checkout redirect
│   │   │   ├── Register.jsx                # User signup page
│   │   │   └── Settings.jsx                # Account settings & Billing Portal trigger
│   │   ├── App.jsx                         # React Router route definitions
│   │   ├── index.css                       # Global styles & Tailwind
│   │   └── main.jsx                        # React entry point
│   ├── .env.local                          # Local environment variables
│   ├── package.json                        # NPM package configuration
│   └── vite.config.js                      # Vite + Tailwind plugin config
├── GEMINI.md                               # Project rules & constraints
├── PROJECT_DOCUMENTATION.md                # Project architectural overview
└── audit_blueprint_phase4.md               # Audit findings and blueprint history
```

---

## 3. Dependencies and Scripts Inventory

### 3.1 `package.json` Analysis (`frontend/package.json`)

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google/genai": "^2.18.0",
    "@supabase/supabase-js": "^2.112.3",
    "@tailwindcss/vite": "^4.3.3",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router-dom": "^7.18.2",
    "stripe": "^22.5.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.4",
    "autoprefixer": "^10.5.4",
    "oxlint": "^1.75.0",
    "postcss": "^8.5.26",
    "tailwindcss": "^4.3.3",
    "vite": "^8.2.0"
  }
}
```

### 3.2 Toolchain Verification Results
- **Build Execution:**
  - Command: `npm run build` (executed in `frontend/`)
  - Result: **SUCCESS** (exit code 0). Generated `dist/index.html` (0.84 kB), `dist/assets/index-*.css` (43.58 kB), and `dist/assets/index-*.js` (530.58 kB).
- **Lint Execution:**
  - Command: `npm run lint` (`oxlint`)
  - Result: **PASS** (exit code 0). 0 errors, 10 warnings across 19 files.

---

## 4. Backend API Endpoints & Call Sites

### 4.1 `/api/create-portal` (`frontend/functions/api/create-portal.js`)
- **Route:** `POST /api/create-portal`
- **Current Signature:** `export async function onRequestPost({ request, env })`
- **Current Vulnerability (R1):**
  - Accepts `{ customerId }` from `await request.json()`.
  - Does NOT authenticate the request.
  - Generates a Stripe Billing Portal session for the arbitrary `customerId` supplied in the request body.
- **Frontend Call Site (`frontend/src/pages/Settings.jsx`):**
  - Lines 91-96:
    ```javascript
    const res = await fetch('/api/create-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: profile.stripe_customer_id })
    });
    ```
- **Remediation Specification:**
  1. Inspect `request.headers.get('Authorization')`. If missing or invalid format (`Bearer <token>`), return 401 `{ error: "Unauthorized" }`.
  2. Extract JWT token and verify user via `supabase.auth.getUser(token)` using `env.VITE_SUPABASE_URL` and `env.VITE_SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`).
  3. Query `public.profiles` for `id = user.id` to retrieve the authentic `stripe_customer_id`.
  4. If `stripe_customer_id` is missing/null, return 400 `{ error: "No active subscription found" }`.
  5. Create Stripe billing portal session using the database-retrieved customer ID and return `{ url: session.url }`.
  6. Update `Settings.jsx` to pass `Authorization: Bearer ${session.access_token}`.

---

### 4.2 `/api/webhook` (`frontend/functions/api/webhook.js`)
- **Route:** `POST /api/webhook`
- **Current Signature:** `export async function onRequestPost({ request, env })`
- **Idempotency Status:**
  - Implemented via `public.webhook_events` insert:
    ```javascript
    const { error: insertEventError } = await supabase
      .from('webhook_events')
      .insert([{ id: event.id }]);
    if (insertEventError && insertEventError.code === '23505') {
      return new Response('Already processed', { status: 200 });
    }
    ```
- **Current Vulnerability (R2 - Race Condition):**
  - Lines 64-81:
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
- **Remediation Specification:**
  1. For `checkout.session.completed`, ensure profile tier and customer ID are updated, and credits are incremented atomically.
  2. Use `supabase.rpc('increment_credits', { user_id: userId, amount: addCredits })`.
  3. If profile record needs upsert for new user while updating tier/customer_id, ensure atomic tier update and atomic credit addition without overwriting concurrent credit deductions.

---

### 4.3 `/api/generate` (`frontend/functions/api/generate.js`)
- **Route:** `POST /api/generate`
- **Current Signature:** `export async function onRequestPost(context)`
- **Current Authentication & Authorization Flow:**
  - Checks `Authorization: Bearer <token>` with `supabaseClient.auth.getUser(token)`.
  - Queries `profiles` with `supabaseAdmin` for `credits, tier`.
  - Checks if `profile.credits <= 0` (returns 403).
- **Current Vulnerabilities (R2, R3, R4):**
  - **R2 (Race Condition):** Lines 150-152 calculate `newCredits = profile.credits - 1` and update `profiles` table directly.
  - **R3 (Order of Operations):** Line 152 updates credits *before* line 155 inserts into `scripts`. If `scripts.insert()` fails, user loses a credit without obtaining their script.
  - **R4 (Authorization Bypass):** Line 86 accepts `targetAudience` from `request.json()`. Line 130 unconditionally appends `targetAudience` to `userPrompt` if provided, even if `profile.tier === 'free'`.
- **Frontend Call Site (`frontend/src/pages/CreateScript.jsx`):**
  - Lines 118-125: Passes JWT in `Authorization` header, JSON payload in body.
- **Remediation Specification:**
  1. Enforce Tier Check for `targetAudience`:
     ```javascript
     let sanitizedAudience = targetAudience;
     if (profile.tier === 'free') {
       sanitizedAudience = '';
     }
     ```
     Ensure `userPrompt` only includes `targetAudience` if `profile.tier !== 'free'` and `sanitizedAudience` is non-empty.
  2. Perform AI generation with Gemini (`gemini-3.6-flash`).
  3. **Order of Operations (R3):** Insert generated script into `scripts` table FIRST:
     ```javascript
     const { data: scriptData, error: scriptError } = await supabaseAdmin
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

     if (scriptError) {
       console.error("Script save error:", scriptError);
       return new Response(JSON.stringify({ error: "Failed to save script history" }), { status: 500 });
     }
     ```
  4. **Atomic Credit Deduction (R2):** Only after successful insert, invoke the atomic RPC function:
     ```javascript
     const { data: updatedCredits, error: rpcError } = await supabaseAdmin
       .rpc('increment_credits', { user_id: user.id, amount: -1 });

     if (rpcError) {
       console.error("Credit deduction error:", rpcError);
       // Handle gracefully or alert
     }
     ```
  5. Return 200 response with `{ script: resultJson, credits_remaining: updatedCredits }`.

---

### 4.4 `/api/delete-account` (`frontend/functions/api/delete-account.js`)
- **Route:** `POST /api/delete-account`
- **Current Signature:** `export async function onRequestPost({ request, env })`
- **Status:** Already implements JWT authentication via `supabaseAdmin.auth.getUser(token)` and deletes the authenticated user via `supabaseAdmin.auth.admin.deleteUser(user.id)`.

---

## 5. Database Schema & RPC Function Architecture

### 5.1 Supabase Schema Definitions

#### Table: `public.profiles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, references `auth.users(id) ON DELETE CASCADE` | User ID matching Supabase Auth UID |
| `tier` | `VARCHAR(20)` | `DEFAULT 'free'`, `CHECK (tier IN ('free', 'plus', 'pro'))` | Current subscription tier |
| `credits` | `INTEGER` | `DEFAULT 3`, `CHECK (credits >= 0)` | Available script generation credits |
| `stripe_customer_id` | `VARCHAR(255)` | `NULLABLE` | Stripe Customer ID (`cus_...`) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record last update timestamp |

#### Table: `public.scripts`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` / `BIGINT` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique script identifier |
| `user_id` | `UUID` | references `auth.users(id)` or `profiles(id) ON DELETE CASCADE` | Owner user ID |
| `product_name` | `TEXT` | `NOT NULL` | Product name |
| `product_details` | `TEXT` | `NOT NULL` | Product details and scraped information |
| `mode` | `VARCHAR(50)` | `NOT NULL` | Sales script mode |
| `content` | `JSONB` / `TEXT` | `NOT NULL` | Generated script JSON |
| `is_favorite` | `BOOLEAN` | `DEFAULT FALSE` | Favorite bookmark flag |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Script generation timestamp |

#### Table: `public.webhook_events`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Stripe Event ID (`evt_...`) for idempotency |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Event receipt timestamp |

---

### 5.2 Atomic RPC Function: `increment_credits`

To eliminate race conditions in concurrent credit operations (e.g. concurrent webhook deliveries or rapid script generation requests), PostgreSQL provides row-level locking during `UPDATE` statements.

#### PostgreSQL RPC Definition
```sql
-- Migration: Add increment_credits RPC function
CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INT;
BEGIN
  UPDATE public.profiles
  SET credits = GREATEST(0, credits + amount),
      updated_at = NOW()
  WHERE id = user_id
  RETURNING credits INTO new_balance;
  
  RETURN new_balance;
END;
$$;
```

#### RPC Calling Conventions (Supabase JS Client)
```javascript
// Example 1: Deducting 1 credit in generate.js
const { data: newCredits, error: rpcError } = await supabaseAdmin
  .rpc('increment_credits', {
    user_id: user.id,
    amount: -1
  });

// Example 2: Adding 60 or 150 credits in webhook.js
const { data: newCredits, error: rpcError } = await supabaseAdmin
  .rpc('increment_credits', {
    user_id: userId,
    amount: addCredits
  });
```

---

## 6. Testing Infrastructure and Strategy

### 6.1 Recommended Testing Framework Setup
Since the repository currently lacks a test runner, installing `vitest` as a dev dependency allows seamless testing of Cloudflare Functions in a Node/ESM environment.

```json
"devDependencies": {
  "vitest": "^2.1.0"
}
```
And adding script:
```json
"scripts": {
  "test": "vitest run"
}
```

### 6.2 Unit and Integration Test Matrix for Backend Functions

| Test Suite File | Tested Endpoint | Target Scenario / Acceptance Criteria |
|---|---|---|
| `functions/api/__tests__/create-portal.test.js` | `POST /api/create-portal` | 1. Missing `Authorization` header -> returns 401 Unauthorized.<br>2. Invalid JWT token -> returns 401 Unauthorized.<br>3. Valid token, client sends arbitrary `customerId: 'cus_attacker'` -> reads `stripe_customer_id` from database (`cus_legit`), invokes Stripe with `cus_legit`, ignores client body `customerId`.<br>4. User has no `stripe_customer_id` in DB -> returns 400 Bad Request. |
| `functions/api/__tests__/webhook.test.js` | `POST /api/webhook` | 1. Invalid Stripe signature -> returns 400 Webhook Error.<br>2. Duplicate event ID (23505 unique violation) -> returns 200 'Already processed' (Idempotency).<br>3. Valid `checkout.session.completed` for Plus (249 THB / 24900 satang) -> invokes `increment_credits(userId, 60)` and updates tier to `'plus'`.<br>4. Valid `checkout.session.completed` for Pro (590 THB / 59000 satang) -> invokes `increment_credits(userId, 150)` and updates tier to `'pro'`.<br>5. Concurrent webhook invocations -> verified to use atomic RPC without overwriting balances. |
| `functions/api/__tests__/generate.test.js` | `POST /api/generate` | 1. Missing or invalid `Authorization` header -> returns 401.<br>2. Profile has `credits <= 0` -> returns 403 Insufficient credits, no AI call, no credit deduction.<br>3. Free tier user submits `targetAudience: "Entrepreneurs"` -> `targetAudience` is cleared/ignored and NOT passed in the Gemini prompt contents.<br>4. Plus/Pro user submits `targetAudience: "Entrepreneurs"` -> `targetAudience` is included in prompt.<br>5. **Order of Operations:** `scripts` table insert fails -> error returned (500), `increment_credits` is NEVER called, user credit balance is preserved.<br>6. Script insert succeeds -> `increment_credits(user.id, -1)` is executed, returns 200 with generated script and updated credits. |

---

## 7. Compliance and Rule Adherence Matrix

| Rule / Standard | Compliance Requirement | Implementation Plan |
|---|---|---|
| **GEMINI.md Rule 1: Code Explanation** | Explain all code sections in detail with clear analogies. | Implementers & reviewers must include structured explanations for all backend modifications and RPC scripts. |
| **GEMINI.md Rule 2: Model Version** | MUST use `gemini-3.6-flash` only. | Ensure `generate.js` retains `model: 'gemini-3.6-flash'`. |
| **GEMINI.md Rule 3: Proactive Compliance** | Alert on ToS, PDPA, security risks. | Ensure no sensitive keys leak to client; enforce RLS policies; maintain strict CSP in `public/_headers`. |
| **GEMINI.md Rule 4: String Preservation** | Exact URL and ID preservation (e.g. Stripe links). | Do not modify Stripe Payment Links (`9B6fZi0454Tg7ZSf5Nbwk00`, `3cIbJ2045adAgwoe1Jbwk01`). |
| **Skill: Cloudflare Supabase Security** | 1. Secrets Boundary (`env.GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` on backend only).<br>2. Credit Deduction on Backend via Service Role.<br>3. Webhook Idempotency with `webhook_events`.<br>4. Frontend Security Headers in `public/_headers`. | All backend functions execute under Cloudflare Pages Functions; credits managed via Supabase Service Role and atomic RPC; idempotency verified. |

---

## 8. Summary of Actionable Implementation Items

1. **`functions/api/create-portal.js`**:
   - Add Authorization header extraction and Supabase JWT verification (`supabase.auth.getUser(token)`).
   - Fetch `stripe_customer_id` from `public.profiles` for `user.id`.
   - Discard client-provided `customerId` from request body.
2. **`functions/api/webhook.js`**:
   - Replace manual JavaScript credit summation and upsert with atomic Supabase RPC call: `supabase.rpc('increment_credits', { user_id, amount })`.
3. **`functions/api/generate.js`**:
   - Enforce authorization filter on `targetAudience`: strip/ignore `targetAudience` if `profile.tier === 'free'`.
   - Reorder execution pipeline: Call AI -> Insert into `public.scripts` -> If and only if insert succeeds, call `increment_credits(user.id, -1)` -> Return response.
4. **`src/pages/Settings.jsx`**:
   - Update `handleManageSubscription` to include `Authorization: Bearer ${session.access_token}` in the fetch call to `/api/create-portal`.
5. **Database / Migrations**:
   - Define and document `increment_credits(user_id UUID, amount INT)` RPC SQL.
6. **Test Suite**:
   - Setup test harness (Vitest) with mock fixtures for Supabase, Stripe, and Gemini to ensure 100% automated regression verification.

---
*End of Survey Report*
