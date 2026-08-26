# Auto Script Project Rules

## 1. Code Explanation Rule
When providing code blocks or technical commands to the user, the agent MUST ALWAYS explain what each part of the code does in detail. 
- Do not just output code blocks and ask the user to copy-paste them.
- Break the code down into logical sections and explain the 'why' and 'how'.
- Use simple analogies (like building blocks, security guards, etc.) to explain complex logic, keeping in mind that the user is a beginner.

## 2. Gemini Model Version Rule
When writing code that integrates with the Google Gemini API (e.g., using `@google/genai`), ALWAYS use the `gemini-3.6-flash` model (or the explicitly required latest version). Do NOT use `gemini-2.5-flash` or older models, as they are deprecated for new users and will result in a 404 "NOT_FOUND" / "UNAUTHENTICATED" API error.

## 3. Proactive Compliance & Security Warning Rule
The agent MUST proactively warn the user about any critical platform rules, Terms of Service (ToS) violations (e.g., using Vercel free tier for commercial SaaS), licensing issues, or data privacy concerns (e.g., PDPA, GDPR, safeguarding personal data). If a requested action or architectural choice poses a compliance or security risk, the agent must alert the user immediately and suggest a safer, compliant alternative, rather than just executing the request blindly.

## 4. Exact String & URL Preservation Rule
When the user provides URLs, API keys, IDs, or specific string literals (e.g., Stripe Payment Links), the agent MUST use them EXACTLY as provided.
- Do NOT arbitrarily truncate, modify, or "clean up" the string based on assumptions.
- Even if a string suffix appears random or seems like a typo (e.g., `0ZW02`), assume it is critical for functionality unless the user explicitly asks you to fix a typo.
- Missing small details in hardcoded strings causes production errors. Double-check copy-pasting accuracy.

## 5. Supabase Schema & RPC Alignment Rule
To prevent silent database crashes and PostgREST parameter mismatch errors:
- **Schema Verification**: Never assume standard database columns (like `updated_at` or `created_at`) exist. Always verify the exact schema of a table before writing SQL `UPDATE` or `INSERT` statements.
- **RPC Parameter Syncing**: If you modify the parameter names of a Supabase SQL function (e.g., changing `user_id` to `p_user_id`), you MUST perform a project-wide search (using `grep` or `Select-String`) to find every JavaScript file that calls `supabase.rpc('function_name')` and update the argument names to match exactly.

## 6. Strict Credential Confidentiality Rule
The agent MUST absolutely protect all API keys, passwords, access tokens, and sensitive credentials provided by the user.
- NEVER share, log, leak, or transmit the user's keys to anyone or any external unauthorized system.
- NEVER write real API keys directly into public codebase files (e.g., frontend code or GitHub commits) unless specifically instructed to use environment variable placeholders (e.g., process.env.API_KEY).
- Treat all keys provided in the chat as highly classified information belonging solely to the user.

---

## 7. Project Context (Auto Script — Full Knowledge Base)

### What is Auto Script?
Auto Script is a Thai-language SaaS web application that uses Google Gemini AI to automatically generate short-form video scripts for TikTok, Reels, and Shopee affiliate marketing (called "pak takra" / "ปักตะกร้า"). Target users are Thai online sellers and content creators.

### Tech Stack (Production)
- **Frontend**: React 19 + Vite, Tailwind CSS, React Router v7, deployed on **Cloudflare Pages**
- **Backend**: Cloudflare Pages Functions (`/functions/api/`) — serverless Edge functions
- **Database & Auth**: Supabase (PostgreSQL + Supabase Auth + Row Level Security)
- **AI**: Google Gemini API (`gemini-3.6-flash` model) — NEVER use other model versions
- **Payments**: Stripe (Checkout Sessions + Webhooks + Customer Portal)
- **Email**: Resend.com SMTP connected to Supabase Auth (domain: `autoscript-ai.com`)
- **Tests**: Vitest with custom mock helpers (`mockDb.js`, `mockStripe.js`, `mockGemini.js`, `mockEnv.js`)

### Supabase CLI Status
- **Linked & Ready**: The Supabase CLI is already authenticated and linked to the project locally in the Windows terminal. Do NOT ask the user to run `supabase login` or `supabase link`. Assume commands like `supabase db push` can be executed directly.

### Key Files & Folders
```
c:\Auto script\
├── frontend\
│   ├── src\
│   │   ├── pages\          — CreateScript.jsx, Settings.jsx, History.jsx, Pricing.jsx, Login.jsx, Register.jsx
│   │   ├── components\     — Navbar.jsx, ErrorBoundary.jsx
│   │   ├── context\        — AuthContext.jsx (Supabase session + profile)
│   │   ├── layouts\        — MainLayout.jsx
│   │   └── utils\          — lazyWithRetry.js (ChunkLoadError auto-retry)
│   └── functions\api\
│       ├── generate.js     — Main AI script generation endpoint
│       ├── webhook.js      — Stripe webhook handler
│       ├── create-portal.js — Stripe billing portal
│       ├── delete-account.js
│       └── __tests__\      — 100 automated tests (Vitest)
├── supabase\migrations\    — SQL migration files
└── .agents\skills\cloudflare-supabase-security\ — Security skill
```

### User Tiers & Pricing
| Tier | Credits | Price | Features |
|------|---------|-------|----------|
| Free | 3 credits (trial) | Free | Single script, 3 modes |
| Plus | 60 credits | ~249 THB | Single script |
| Pro | 150 credits | ~590 THB | Single + Multi-Version + Belief-Shifting |

- **Single script**: costs 1 credit, generates 1 script
- **Multi-Version** (Pro only): costs 2 credits, generates 3 styles (Funny, Review, FOMO) with XML tag parsing and 3-tab UI
- **Belief-Shifting** (Pro only): costs 1 credit, generates 1 highly advanced script using Epiphany Bridge framework

### Script Generation Modes
1. **ขยี้ปัญหา (PAS Formula)** — Problem, Agitate, Solution
2. **เล่าเรื่อง (HSO Formula)** — Hook, Story, Offer
3. **โดนใจ FOMO** — Fear Of Missing Out psychology
4. **โครงสร้างเจาะลึก** (Pro only) — Belief-Shifting & Epiphany Bridge with neuromarketing analysis CoT
5. **Multi-Version** (Pro only) — generates all 3 styles simultaneously

### Database Schema (Key Tables)
- **profiles**: `id` (UUID, = auth.users.id), `tier` (free/plus/pro), `credits` (int), `stripe_customer_id`, `email_verified`
- **scripts**: `id`, `user_id` (FK → profiles), `product_name`, `product_details`, `script_content`, `mode`, `created_at`
- **webhook_events**: `id` (Stripe event ID), `processed_at` — for idempotency

### Key RPC Functions (Supabase)
- `increment_credits(p_user_id, p_amount)` — atomic credit math, returns new balance or `-1` if insufficient
- `sync_profile_credits(p_user_id, p_amount, p_tier)` — called by webhook to set tier + credits after payment

### Credit Flow Logic
1. User submits → `generate.js` calls `increment_credits(userId, -1 or -2)` FIRST (upfront deduction)
2. Calls Gemini AI
3. If AI fails → refund exact same amount in `catch` block (symmetric refund)
4. If DB insert fails → refund in `if (insertError)` block, then set `creditDeducted = false` to prevent double refund
5. Returns 402 if `increment_credits` returns -1 (insufficient balance)

### Payment Webhook Flow (webhook.js)
- `checkout.session.completed` → verify `payment_status === 'paid'` → call `sync_profile_credits` → upgrade tier
- `charge.refunded` → find user by `stripe_customer_id` → downgrade to free → deduct credits
- `charge.dispute.created` → same as refund (fraud prevention)
- All events stored in `webhook_events` table for idempotency (deduplication)

### Frontend Architecture Decisions
- **lazyWithRetry**: All lazy-loaded routes use this instead of bare `lazy()` to prevent white screens after deployments
- **AbortController**: All `/api/generate` fetch calls have 60-second timeout — catches `AbortError` and shows Thai error message
- **Accessibility**: Navbar hamburger button has `aria-label`, `aria-expanded`, `aria-controls`, `aria-hidden` on SVG

### What Was Removed
- **URL Analysis feature**: Completely removed (Shopee blocks all bots with Login Wall). References to `analyze.js` are dead and deleted.

### Email Verification Setup
- Resend.com is connected to Supabase SMTP
- Domain: `autoscript-ai.com` (verified)
- Users must verify email before accessing the app
- Custom HTML email templates can be set in Supabase Dashboard → Auth → Email Templates

### Stripe Payment Links (DO NOT MODIFY THESE STRINGS)
- Plus Plan payment link suffix: `9B6fZi0454Tg7ZSf5Nbwk00`
- Pro Plan payment link suffix: `3cIbJ2045adAgwoe1Jbwk01`

### LINE Official Account
- LINE URL: `https://lin.ee/x0yVB1kk` (DO NOT MODIFY)

### PowerShell Encoding Warning
- NEVER use PowerShell `Set-Content`, `Get-Content`, `echo`, or `cat > file` to write files containing Thai text — it corrupts UTF-8 encoding.
- Always use the agent's `write_to_file` or `replace_file_content` tools instead.

### Test Suite Status (as of Final Polish Blueprint completion)
- **100 tests passing, 3 skipped** (legacy Jina URL scraping — feature removed)
- 0 build errors (`npm run build` passes cleanly)
- Test files in `frontend/functions/api/__tests__/`

### History of Major Features Built
1. Core script generation with 3 modes (PAS, HSO, FOMO)
2. Supabase Auth + Email verification (Resend.com)
3. Stripe payments + webhook handler + billing portal
4. Multi-Version generation (Pro only, 2 credits, 3 tabs UI)
5. **Final Polish Blueprint** — 18 critical security fixes:
   - DB: RLS policies, CASCADE constraints, B-Tree indexes, secure RPCs
   - Backend: Double-refund bug, symmetric refunds, input limits, payment_status check, refund/chargeback handlers
   - Frontend: lazyWithRetry, AbortController timeout, Navbar a11y
   - Tests: mockDb stripe_customer_id lookup, all audit tests updated to verify fixes
6. **Launch Readiness & Auth Polish**:
   - Auth UI: Rewrote Register.jsx for email verification, Spam warning, Resend button.
   - UX/Premium Feel: Replaced legacy emojis with Heroicons.
   - AI Reliability: Strict escaping rules to Gemini prompts.
7. **Belief-Shifting Script Mode (Pro Feature)** (Current Session):
   - Added a highly advanced "Belief-Shifting" script generation mode using Epiphany Bridge framework.
   - Added specific inputs (`falseBelief`, `mechanism`) using textareas for mobile UX.
   - Used Chain of Thought (CoT) prompting (`neuromarketing_analysis`) to deeply analyze psychology before generating the script.
   - Promoted the feature on the Dashboard Home page ("6 สูตรจิตวิทยาการขายระดับโลก").
   - Added strict client-side validation to prevent empty submissions and avoid 60s timeout errors.
8. **UX Polish (Error Handling)**:
   - Implemented Auto-Scroll to validation errors globally (CreateScript, Login, Register) for better UX on mobile and long forms.

9. **Content Moderation Engine**: Added a fast, deterministic server-side content moderation system. Prevents users from inputting profanity, threats, or illegal keywords with Thai obfuscation detection (e.g., zero-width char removal, space stripping). Logs 'blocked' and 'reviewed' content to moderation_logs (Supabase). Enforced before AI generation (saves credits/cost) and on AI output (failsafe).

10. **Speaker Tone & Natural Language Prompts**: Added the ability to select speaker gender (Female/Male) for AI script generation in the UI. Upgraded system prompts to strictly enforce Natural Language Rules (e.g., forbidden formal words, using filler words, breathing pauses) while preserving the original Elite Scriptwriter and 4 U's framework to maintain high-quality structure.

11. **AI Intelligence Upgrade (Micro-Persona & Contextual Few-Shot)**: Implemented an advanced dynamic system prompt in `generate.js`. The AI now adopts 1 of 4 specific Micro-Personas ("เพื่อนสาวจอมแฉ", "ผู้เชี่ยวชาญ", "แม่ค้าสายฮาร์ดเซลล์", "ผู้ชายรีวิวจริงใจ") based on product context. Added structural Few-Shot references for breathing pauses ("...") and natural spoken wordplay. Increased Gemini temperature from 0.8 to 0.85 for higher creativity and better punchlines.

12. **Forgot Password & Smart Recovery Flow**: Added `ForgotPassword.jsx` and `ResetPassword.jsx` using Supabase Auth. Implemented a smart fallback in `MainLayout.jsx` listening to `onAuthStateChange` (`'PASSWORD_RECOVERY'`) to automatically redirect users to the reset page if Supabase defaults to the Site URL, eliminating the need to manually configure Redirect URLs via the Supabase Dashboard.

13. **Centralized Thai Error Translation**: Created `translateError.js` utility to seamlessly map english Supabase auth errors (like "New password should be different from the old password.") to natural Thai phrasing. Integrated across `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, and `ResetPassword.jsx` for better UX.
