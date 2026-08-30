# Test Infrastructure & Strategy Documentation

## 1. Overview
The Auto Script test infrastructure is built using **Vitest** (Node ESM runtime) designed for Cloudflare Pages Functions (`frontend/functions/api/`) and React frontend integration. The test suite provides deterministic, hermetic, and high-performance verification of the 4 critical security and architecture requirements without requiring live external network dependencies.

---

## 2. Test Directory Layout
```
frontend/
├── functions/
│   └── api/
│       ├── __tests__/
│       │   ├── helpers/
│       │   │   ├── mockDb.js         # In-memory Supabase PostgreSQL & Auth simulation
│       │   │   ├── mockStripe.js     # Mock Stripe SDK (Billing Portal & Webhook constructor)
│       │   │   ├── mockGemini.js     # Mock GoogleGenAI SDK (@google/genai)
│       │   │   └── mockEnv.js        # Cloudflare Pages Functions mock environment
│       │   ├── create-portal.test.js # [R1] IDOR Elimination & JWT Auth verification
│       │   ├── webhook.test.js       # [R2] Atomic RPC credit top-up & Webhook idempotency
│       │   ├── generate.test.js      # [R2, R3, R4] Order of Operations, RPC deduction, Tier auth
│       │   └── scenarios.test.js     # [Tiers 3 & 4] Cross-feature flows & Real-world user journeys
│       ├── create-portal.js          # Stripe Billing Portal Cloudflare Function
│       ├── delete-account.js         # Account Deletion Cloudflare Function
│       ├── generate.js               # Script Generation Cloudflare Function
│       └── webhook.js                # Stripe Webhook Cloudflare Function
├── package.json                      # Added "test": "vitest run" and "vitest" devDependency
└── vitest.config.js                  # Vitest Node runner configuration
```

---

## 3. Mock Infrastructure Components

### 3.1 `mockDb.js` (`MockDatabase`)
- **Supabase Auth**: Simulates `auth.getUser(token)` and `auth.admin.deleteUser(uid)`.
- **Database Tables**:
  - `public.profiles`: Simulates `select`, `update`, `upsert`, and field filtering (`credits`, `tier`, `stripe_customer_id`).
  - `public.scripts`: Simulates `insert().select().single()`, auto-generating script IDs.
  - `public.webhook_events`: Simulates unique constraint violation (PostgreSQL code `23505`) for duplicate event IDs.
- **Supabase RPC (`increment_credits`)**:
  - Executes atomic database arithmetic: `credits = Math.max(0, currentCredits + amount)`.
  - Records full call arguments and timestamps in `callLog` and `rpcCalls`.
- **Fault Injection**:
  - `failScriptInsert`: Simulates database crash during script saving.
  - `failRpc`: Simulates lock timeout or RPC execution failure.
  - `failProfileQuery`: Simulates profile read failure.
  - `failAuth`: Simulates auth service unavailability.

### 3.2 `mockStripe.js` (`MockStripeManager`)
- **Billing Portal**: Simulates `stripe.billingPortal.sessions.create({ customer, return_url })`, capturing parameters in `portalSessionsCreated`.
- **Webhooks**: Simulates `stripe.webhooks.constructEventAsync(payload, signature, secret)` and signature verification failures.
- **Fault Injection**: `failPortalCreate`, `failSignature`.

### 3.3 `mockGemini.js` (`MockGeminiManager`)
- **Google GenAI SDK**: Simulates `ai.models.generateContent({ model, contents, config })`.
- **Model Verification**: Validates model parameter compliance (`gemini-3.6-flash`).
- **Prompt Inspection**: Captures all prompts in `generateCalls` to assert presence or exclusion of `targetAudience`.
- **Fault Injection**: `failGenerate`, `returnInvalidJson`, `customResponseText`.

---

## 4. Test Strategy Matrix (Tiers 1 to 4)

| Test Suite | Tier | Covered Requirements & Features | Number of Tests |
|---|---|---|---|
| `create-portal.test.js` | Tier 1 (Core) & Tier 2 (Boundary) | **R1 (IDOR & JWT Auth):** Missing/invalid JWT, authentic `stripe_customer_id` lookup from DB, client `customerId` discarding, null customer handling, malformed headers, Stripe API failure. | 11 tests |
| `webhook.test.js` | Tier 1 (Core) & Tier 2 (Boundary) | **R2 (Atomic RPC & Idempotency):** Signature verification, `webhook_events` deduplication (`code 23505`), Plus tier (+60 credits), Pro tier (+150 credits), RPC failure rollback, boundary pricing, concurrent delivery. | 11 tests |
| `generate.test.js` | Tier 1 (Core) & Tier 2 (Boundary) | **R2, R3, R4:** Missing JWT, 0 credit pre-check, Order of Operations (`scripts.insert` BEFORE `increment_credits`), DB insert failure credit preservation, Free tier `targetAudience` stripping, Plus/Pro tier `targetAudience` preservation, `gemini-3.6-flash` model rule, Jina AI Pro scraping. | 16 tests |
| `scenarios.test.js` | Tier 3 (Cross-Feature) & Tier 4 (Real-World) | **E2E Journeys:** Webhook top-up + generate cycle, Free to Pro upgrade flow, Webhook replay during active usage, Complete Free user lifecycle to exhaustion, Complete Paid Plus journey (Purchase -> Premium Generate -> Stripe Portal), Complete Pro journey. | 6 tests |
| **Total** | **Tiers 1 - 4** | **All 4 Security & Architecture Requirements** | **44 tests** |

---

## 5. How to Run the Tests

### Run all tests:
```powershell
cd "c:\Auto script\frontend"
npm test
```

### Run tests with file watch:
```powershell
cd "c:\Auto script\frontend"
npm run test:watch
```

### Run a specific test suite:
```powershell
cd "c:\Auto script\frontend"
npx vitest run functions/api/__tests__/create-portal.test.js
npx vitest run functions/api/__tests__/webhook.test.js
npx vitest run functions/api/__tests__/generate.test.js
npx vitest run functions/api/__tests__/scenarios.test.js
```

### Run build and lint verification:
```powershell
cd "c:\Auto script\frontend"
npm run lint
npm run build
```
