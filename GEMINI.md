# Auto Script Project Rules

## 1. Code Explanation Rule
When providing code blocks or technical commands to the user, the agent MUST ALWAYS explain what each part of the code does in detail. 
- Do not just output code blocks and ask the user to copy-paste them.
- Break the code down into logical sections and explain the 'why' and 'how'.
- Use simple analogies (like building blocks, security guards, etc.) to explain complex logic, keeping in mind that the user is a beginner.

## 2. Gemini Model Version Rule
When writing code that integrates with the Google Gemini API (e.g., using `@google/genai`), ALWAYS use the `gemini-3.6-flash` model by default. 
*EXCEPTION (Smart Dynamic Brain)*: For the "Pro Deep Brain" feature (Pro tier users using the "โครงสร้างเจาะลึก" / Belief-Shifting mode), explicitly use the `gemini-3.1-pro-preview` model to provide deep psychological analysis. Do NOT use `gemini-2.5-flash` or older deprecated models.

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

14. **Security & UX Upgrade (Password Requirements)**: Enforced 8-character minimum and strictly blocked typing Thai characters across all auth forms (Login, Register, ResetPassword) using onChange validation to silently ignore Thai input. Added a toggle (eye icon) using Heroicons SVG to view passwords during entry for better UX.

15. **Auth UX Enhancement (Forgot Password Verification)**: Implemented an explicit email existence check on the Forgot Password page to improve UX. Created a secure `check_email_exists` RPC function to query `auth.users` on the backend, allowing the frontend to show a clear "อีเมลไม่ถูกต้อง" (Invalid Email) warning and prevent silently failing (and avoiding email enumeration risks natively) when an unregistered email is submitted.

17. **Deep Security & Concurrency Audit (Pre-Launch)**: Conducted a comprehensive final sweep. Fixed a DoS vulnerability (Memory Exhaustion) in `generate.js` by truncating inputs before processing them through the moderation engine. Fixed a Data Leak (Information Disclosure) by dropping an improperly scoped `PUBLIC` RLS policy on `moderation_logs`. Fixed a Broken Access Control (Tier Bypass) vulnerability allowing Free users to access the Pro-only Belief-Shifting mode. Fixed a Race Condition in the `trial_pro_remaining` deduction logic by creating an atomic `decrement_trial_quota` RPC. Finally, mitigated an Email Enumeration vulnerability in the Forgot Password flow by adhering to the Standard Security UX ("If this email is in our system...").

18. **Customer Feedback System (Discord Webhook) — Full Build & Bug Fixes**:
   - Built complete feedback loop: `feedbacks` table (Supabase RLS), `FeedbackModal.jsx` (5-star + text), integrated in `Navbar.jsx`.
   - Backend `feedback.js`: validates auth, inserts to DB, sends rich Discord embed (color-coded Green/Yellow/Red).
   - **Bug Fix (createPortal):** Fixed modal being clipped/pushed up due to Navbar's CSS stacking context. Refactored `FeedbackModal.jsx` to use `ReactDOM.createPortal(..., document.body)` so the modal renders at the root level.
   - **Bug Fix (Auth Token):** Fixed "เกิดข้อผิดพลาดในการส่งข้อมูล" (401 Unauthorized) because `session` was undefined. Fixed by calling `supabase.auth.getSession()` inside the submit handler to get a fresh token each time.
   - **AI Sentiment Analysis:** Integrated Gemini into `feedback.js` to analyze comment text and return a JSON `{ emoji, is_critical_bug }`. Avatar and emoji in Discord now reflect the true sentiment of the comment, not just the star rating.
   - **Critical Bug Alert:** If `is_critical_bug === true`, the Discord message auto-tags `@everyone` with a bright red embed to alert admin immediately.
   - **Discord Channel Routing:** Separated Discord Webhooks into 2 channels using `DISCORD_WEBHOOK_HIGH_STAR` (4-5 stars) and `DISCORD_WEBHOOK_LOW_STAR` (1-3 stars) env variables, with fallback to `DISCORD_WEBHOOK_URL`.

19. **Weekly Feedback Summary Engine (`/api/weekly-summary`)**:
   - Created `frontend/functions/api/weekly-summary.js` — a POST-only secured endpoint.
   - Auth: Protected by `ADMIN_CRON_KEY` Bearer token (stored in Cloudflare env vars). Cannot be triggered by browsing to the URL directly.
   - Logic: Fetches all feedbacks from the last 7 days from Supabase, sends raw data to Gemini for PM-level analysis.
   - AI Prompt: Returns structured JSON `{ overall, praise, bugs, requests, action }` with each field capped at 200 chars.
   - Discord Output: Builds a clean embed with **separate named Fields** per category (📊 ภาพรวม, 📈 สถิติดาว, 💖 ชอบ, 🛠️ ปัญหา, 💡 ฟีเจอร์, 🎯 Next Action) for clear readability. Sends to dedicated `DISCORD_WEBHOOK_WEEKLY_REPORT` channel.
   - Cron Scheduling: Configured via **cron-job.org** to auto-trigger every Friday at 18:00 (Asia/Bangkok). Import via cURL command for correct POST + Auth header setup.

### New Environment Variables (Cloudflare Pages)
| Variable | Purpose |
|---|---|
| `DISCORD_WEBHOOK_HIGH_STAR` | Discord channel for 4-5 star reviews |
| `DISCORD_WEBHOOK_LOW_STAR` | Discord channel for 1-3 star reviews |
| `DISCORD_WEBHOOK_WEEKLY_REPORT` | Discord channel for weekly AI summary report |
| `ADMIN_CRON_KEY` | Secret password to authenticate `/api/weekly-summary` POST requests |

### New Files
- `frontend/functions/api/weekly-summary.js` — Weekly AI summary endpoint
- `supabase/migrations/20260826172700_create_feedbacks_table.sql` — feedbacks table + RLS

20. **Smart Feedback Rating Consistency Warning**: Added client-side sentiment detection (`detectSentiment()`) to `FeedbackModal.jsx`. Uses keyword scoring (positive/negative Thai + English word lists) to detect mismatch between star rating and comment tone. Shows a soft warning (non-blocking) with an explanation in two cases: (1) user selects 4-5 stars but writes a negative comment, or (2) user selects 1-2 stars but writes a positive comment. Triggers on star click and on textarea `onBlur`.
   - **Bug Fix (React Hooks):** Fixed React Rules of Hooks violation — `checkConsistency` was defined after the `if (!isOpen) return null` early return, causing the app to crash. Moved the function before the early return and converted from `useCallback` to a plain function.
   - **UI Upgrade (Premium SVG):** Replaced text emojis (⚠️⭐) with Heroicons SVG icons. Warning box is now color-coded: amber (⚠ triangle) for rating-too-high, blue (✦ sparkles) for rating-too-low. Uses Flexbox for icon+text alignment.
   - **Bug Fix (Sentiment Length):** Removed the 5-character minimum threshold in `detectSentiment()` so short Thai words like `แย่` (3 chars) correctly trigger the warning.

21. **Pre-Launch Security Polish**:
   - **CORS Middleware:** Added `frontend/functions/api/_middleware.js` to handle cross-origin requests for all endpoints.
   - **Prompt Injection:** Wrapped user comments in `<user_comment>` XML tags in `feedback.js` to prevent Gemini instruction override.
   - **Input Limits:** Enforced `maxLength={50}` on the Display Name field in `Settings.jsx`.
   - **Cleaned Up Backups:** Removed `generate.backup.js` from the API folder to prevent vulnerable code from deploying as a live endpoint.

22. **SEO Phase 1 & 2 — Basic SEO, Social Cards & Dynamic Metadata**:
   - **`index.html` Meta Tags:** Added full SEO metadata — Primary tags (`description`, `keywords`, `robots`, `author`, `canonical`), Open Graph tags for LINE/Facebook sharing, and Twitter Card tags.
   - **Language fix:** Changed `<html lang="en">` → `<html lang="th">` to correctly signal Thai content to Google.
   - **`robots.txt` & `sitemap.xml`:** Created in `public/` mapping all 5 public URLs with correct priorities.
   - **OG Image:** Created custom `og-image.png` (1200x630) using PowerShell `System.Drawing` directly without dependencies, placed in `public/`.
   - **GSC Verification:** Created `google-site-verification` HTML file in `public/` and successfully verified domain ownership.
   - **React 19 Document Metadata API (Phase 2):** Added native `<title>` and `<meta description>` to all main pages (Home, Pricing, Login, Register, Legal) without extra libraries.
   - **Next Steps (Phase 3):** React Router v7 SSG pre-rendering for perfect social unfurling on all routes.

23. **SEO Phase 3 — React Router v7 SSG Migration**:
   - **Architecture Shift:** Migrated the Vite SPA to React Router v7 Framework Mode for native SSR/SSG support.
   - **File-Based Routing:** Refactored `src/` to `app/` and adopted File-based routing inside `app/routes/` (e.g. `_index.jsx`, `pricing.jsx`), removing the old `react-router-dom` `<Routes>` setup.
   - **Entry Points:** Replaced `index.html`, `main.jsx`, `App.jsx` with `app/root.jsx`, `app/entry.client.jsx`, and `app/entry.server.jsx`.
   - **SSG Prerendering:** Configured `react-router.config.ts` to statically pre-render all public routes (`/`, `/pricing`, `/login`, `/register`, `/legal`, `/forgot-password`, `/reset-password`) into static HTML files to ensure 100% perfect social unfurling (Open Graph) on Facebook and LINE.
   - **Cloudflare Pages Compatibility:** Added a `postbuild.js` script to automatically rename `build/client` to `dist` after `npm run build` so that Cloudflare Pages deployment continues to work seamlessly without manual dashboard configuration changes.

24. **Tier-Based Script Auto-Cleanup + Bulk Delete UI**:
   - **Database (pg_cron):** Added `supabase/migrations/20260827000000_auto_cleanup_scripts.sql`. Enables `pg_cron` extension and creates `cleanup_old_scripts()` SQL function. Schedule: every day at 17:00 UTC (midnight Bangkok time).
   - **Retention Rules:** Free = delete non-favorite scripts after 3 days, Plus = 30 days, Pro = never delete.
   - **Favorites Protection:** Scripts with `is_favorite = true` are excluded from auto-deletion regardless of tier.
   - **Retention Banner:** `history.jsx` shows an amber banner (Free) or blue banner (Plus) informing users how long their scripts are kept, with a link to upgrade. Pro users see no banner.
   - **Bulk Delete Mode (UX):** Added "เลือกลบ" button (Trash SVG icon) in the History toolbar. Clicking enters Delete Mode — all filter controls are replaced with a delete toolbar (select-all checkbox + delete count button + cancel button). Each card shows a checkbox; favorites show a locked star icon instead. Deleted cards are removed instantly via optimistic UI update. All icons are Heroicons/SVG consistent with the existing design system (no text emojis).

25. **Post-Launch SSG Bug Fixes (Cloudflare Pages SPA)**:
   - **Broken Imports (Build Failure):** Fixed Cloudflare Pages silently failing to deploy due to Edge API functions still importing from `src/` instead of `app/` after the React Router v7 migration.
   - **CSP Hydration Block:** Added `'unsafe-inline'` to `script-src` in `public/_headers` to allow React Router v7's inline hydration scripts to execute, which were previously blocked, rendering all interactive elements (like Login buttons) dead.
   - **Supabase WS Crash (Node v20 vs v22):** `@supabase/supabase-js` v2.112+ requires Node 22+ for native WebSocket support. Created `.node-version` (`22`) to force Cloudflare Pages to use Node 22 during build, fixing the `native WebSocket not found` server crash. Added `.trim()` to Supabase env vars in `supabase.js` to defensively strip accidental trailing whitespace from Cloudflare dashboard config.
   - **Manifest Fetch Error (SPA Routing):** Set `ssr: false` in `react-router.config.ts` to stop the client from trying to fetch `/__manifest` (which Cloudflare responded to with `index.html`, causing a JSON parse error). Updated `postbuild.js` to rename `dist/__spa-fallback.html` to `dist/404.html` so Cloudflare Pages handles client-side routing correctly as a SPA fallback.

26. **True Real-time Progress Bar Polish**:
   - **Dynamic Linear Smoothing**: Replaced the asymptotic progress bar logic (`currentProgress += (95 - currentProgress) * 0.15`) in `CreateScript.jsx` which caused the bar to visually freeze at 95% while waiting for Gemini. Implemented a time-based linear engine that estimates duration (e.g. 5s for Flash, 25s for Pro Brain) and smoothly ticks 0-90% evenly, providing a significantly better user experience that aligns accurately with backend wait times without feeling "stuck".

27. **Final Pre-Launch Audit & OG Image**:
   - Conducted a comprehensive deep-dive audit of the entire stack (Security, Payments, Database, SEO).
   - Fixed obsolete legacy chunk-load Vitest UI tests broken by the RRv7 migration.
   - Replaced the low-quality AI-generated OG image with a pixel-perfect, light-themed, professional OG image (`1200x630`) generated via a custom Playwright headless browser script (`generate_og.cjs`) to ensure Thai typography (Kanit font) renders perfectly without artifacts.

27. **Competitor Field: Harsh-Word Ban + Warning UI**:
   - **Warning UI (create.jsx):** Added an amber-colored hint text (`<p>`) below the "คู่แข่ง / สินค้าที่นำมาเปรียบเทียบ" label. Only appears when `mode === 'เปรียบเทียบชัดๆ'`. Warns users to avoid harsh comparison words before they submit.
   - **Validation Logic (create.jsx):** Added a dedicated harsh-word check for the competitor field (`harshWords = ["กาก", "ห่วย", "แย่", "ขยะ", "สวะ", "หลอกลวง", "หมา"]`). Runs before the existing `containsProfanity` check. Only activates when `mode === 'เปรียบเทียบชัดๆ'` — has zero impact on all other modes. Shows a descriptive Thai error message suggesting safer alternatives.
   - **Home Page Fix (_index.jsx):** Added `inline-block` to the `<strong>` wrapping `"6 สูตรจิตวิทยาการขายระดับโลก"` to prevent the number "6" from orphaning onto its own line on mobile screens.

28. **Dynamic Hook Strategy Engine (V2 - Anti-Repetition Upgrade)**:
   - Fixed AI repetitiveness by completely rewriting `HOOK_STRATEGIES` and `MULTI_VERSION_HOOKS` to feature 6 abstract concepts per mode (40+ total) rather than providing literal sentence examples.
   - Implemented strict negative constraints (`❌ ห้ามใช้คำเปิดคลิปเหล่านี้เด็ดขาด`) forbidding cliché phrases like "เคยป่ะ", "ใครที่กำลัง", "เอาจริงๆนะ".
   - Adjusted Few-Shot examples in `advancedIntelligenceRules` to focus entirely on punctuation/vibe, explicitly instructing the AI not to copy them.

29. **Dynamic Progress Timeline (Mobile-First UI)**:
   - Replaced the simple loading spinner in `create.jsx` with a real-time 0-100% dynamic progress timeline.
   - Used an asymptotic progression engine (`setInterval`) to simulate AI thinking, reaching 95% smoothly and snapping to 100% on API success.

30. **Production Phase 1: Universal Ledger & Admin Security**:
   - **Universal Ledger:** Upgraded `credit_transactions` to track all credit movements by adding `source` and `reference_id` (NOT NULL). Used safe backfill strategy (`gen_random_uuid`) for legacy rows to prevent migration crashes.
   - **Financial Invariants (Idempotency):** Enforced a strict `UNIQUE(source, reference_id)` constraint. Refactored `increment_credits` RPC to perform a logical "Idempotent Success" return without throwing 500 errors when Stripe retries duplicate webhooks.
   - **Admin Security (Least Privilege):** Added `role` to `profiles`. Created secure `admin_list_users` and `admin_grant_credits` RPCs that extract identity securely via `auth.uid()` inside the DB. Blocked unrestricted DB SELECT access from the frontend.
   - **Audit Trail:** Created an append-only `audit_logs` table. Every manual credit adjustment automatically atomic-inserts into both `audit_logs` and `credit_transactions`.
   - **Refund Alignment:** Modified `webhook.js` (`charge.refunded`, `charge.dispute.created`) to query the exact original transaction from the ledger (`source = stripe_webhook`) before issuing refunds via `increment_credits`, ensuring exact balance restoration and negative balance support.
   - Built a beautiful mobile-first vertical timeline UI using Tailwind CSS and Heroicons, showcasing 4 psychological generation steps (Analyze -> Structure -> Tone -> Check) dynamically mapped to the user's selected `mode` and `speakerTone`.
   - Added a custom `animate-shimmer` CSS keyframe in Tailwind v4 (`app/index.css`) for a premium loading effect.
   - Protected against memory leaks by rigorously clearing intervals in `useEffect` cleanup and `finally` blocks.

30. **White-Box Security Audit & Hardening**:
   - Conducted a comprehensive security audit (White-Hat Persona) covering API Logic, Database RLS, Payment Webhooks, and Race Conditions.
   - Found the core infrastructure (IDOR prevention, Atomic credits, Webhook idempotency) to be highly robust.
   - Fixed a permissive CORS misconfiguration (`Access-Control-Allow-Origin: "*"`) in `frontend/functions/api/_middleware.js` to strictly allow `autoscript-ai.com` and `localhost`.

31. **API Rate Limit (429) & Backend Auto-Retry Engine Roadmap**:
   - Diagnosed `429 Too Many Requests` error occurring during rapid generation requests on the Gemini API free tier.
   - Evaluated Google Cloud Billing setup requirements (Google strictly blocks Prepaid cards like TrueMoney, requiring bank debit/credit cards).
   - Designed a Backend Auto-Retry Engine with Exponential Backoff (2s -> 4s) in `frontend/functions/api/generate.js` for handling transient 429 and 503 errors seamlessly.
   - Confirmed frontend compatibility: The dynamic vertical progress timeline in `app/routes/create.jsx` uses asymptotic timing and will seamlessly stay smooth and real-time during retry cycles without breaking UI state.

32. **Backend Auto-Retry Engine (Exponential Backoff)**: Added a robust backend retry loop in `frontend/functions/api/generate.js` to handle Gemini API `429 Too Many Requests` and `503 Service Unavailable` errors. It automatically retries up to 3 times (with 2s, 4s, 8s exponential backoff) before failing. This hides transient network/quota errors from the user while keeping the frontend UI smooth via the asymptotic progress bar.

33. **Gemini API Billing & Production Prepay Activation**:
   - Upgraded Google AI Studio project from Free Tier to Paid Tier via Google Cloud Prepay model.
   - Successfully linked Krungthai Mastercard debit card and deposited THB 400.00 initial credit balance (valid for 1 year).
   - Cost Control & Safety Posture: Confirmed `Auto-reload` is DISABLED. Costs are strictly limited to the prepaid amount with zero risk of runaway charges. THB 400 covers ~5,000 - 10,000 script generations with `gemini-3.6-flash`.
   - Verified Zero Code Changes: Existing `GEMINI_API_KEY` seamlessly inherited production quotas (1,000+ RPM), permanently eliminating Error 429 during normal generation workflows.

34. **Smart Dynamic Brain & Pro Deep Brain™ Feature**:
   - Implemented a tiered AI engine switching mechanism in `generate.js`.
   - **Pro Tier (Belief-Shifting Mode)**: Dynamically routes to `gemini-3.1-pro-preview` for deep psychological analysis.
   - **Pro Tier (Normal Modes)**: Remains on `gemini-3.6-flash` for speed, but injects a `proNormalEnhancement` prompt to dramatically increase depth (Micro-Emotion, Pattern Interrupt).
   - **Free/Plus Tier**: Uses `gemini-3.6-flash` standard prompt.
   - **UI/UX Upgrades**: Added "AI Brain Indicator" (Premium CpuChip SVG for Pro, Bolt SVG for Standard) and "Result Badge" in `create.jsx`. Re-designed `pricing.jsx` and added an Engine Comparison section to `_index.jsx` to drive FOMO and 590 THB upgrades.

35. **Pricing & Engine Comparison UI Overhaul (Anti-Cannibalization)**:
   - Redesigned the "AI Engine Comparison" section on the Home page (`_index.jsx`) to combat "The Paid-Free Anchor Trap" (where users mistakenly anchor the Plus tier to the Free tier).
   - Removed the "Free · Plus" combined card entirely.
   - Built a direct Head-to-Head Comparison: "Plus Smart Engine" vs "Pro Deep Brain™".
   - Upgraded UI to a mobile-friendly 2-column Card grid using Heroicons, highlighting Cost-per-Script (4.1 THB vs 3.9 THB) prominently at the bottom of each card.
   - Used Tailwind CSS for premium styling (`bg-blue-50/50`, `border-amber-400/50`, gradients) to clearly differentiate the value proposition of Plus (High-Speed Volume) and Pro (Deep Strategy).

36. **True Real-time Progress Bar UX Perfection**:
   - Adjusted the dynamic linear smoothing target from 90% to 99% (and 99.9% for slow-tick) to give a fuller loading experience.
   - Added a 500ms success delay at 100% completion in `CreateScript.jsx` to ensure users visually register the final state.
   - Upgraded Step 4 icon to turn into an emerald checkmark upon hitting 100%.

37. **True Real-time Progress Bar Polish**:
   - **Asymptotic Smoothing**: Upgraded the `create.jsx` generation progress engine from simple linear math to an asymptotic curve (`currentProgress += (99.9 - currentProgress) * 0.015`) during the 85-99% phase.
   - Fixed the issue where the progress bar would freeze at exactly 99% for 10-20 seconds on complex prompts by ensuring the bar smoothly decelerates and continuously moves until the backend responds.
   - Refined the expected completion time parameters (12s, 25s, 40s) for a much more accurate real-world reflection of `gemini-3.6-flash` and `gemini-3.1-pro-preview` latency.

38. **Comprehensive Architecture Implementation Analysis**:
   - Conducted a deep-dive analysis of the entire Auto Script architecture answering 140 detailed questions across 16 domains (System Overview, Frontend, Cloudflare API, Credit System, AI Pipeline, Database, Payment/Webhook, Failsafe, Security, Observability, Cost Control, Scalability, Data Lifecycle, Admin, Failure Simulation, and Architecture Decisions).
   - Generated 4 detailed Markdown Artifacts (`architecture_analysis_part1.md` to `part4.md`) documenting the "Current Design", "How It Works", "Why", "Failure Case", "Security Consideration", and "Status" (e.g., [DESIGNED], [PARTIALLY DESIGNED], [NOT DESIGNED]).
   - **Critical Finding**: Identified a significant Technical Debt risk (Cloudflare 50s execution limit on free tier) where an AI timeout could cause a hard crash, preventing the symmetric refund logic from executing and resulting in lost user credits. Recommended upgrading to Paid tier or implementing a Queue system for production.

39. **Expert Architecture Audit (Post-Launch Assessment)**:
   - An independent architecture review (by a human expert) validated the core stack (`React -> Cloudflare -> Supabase -> Gemini`) as highly solid (8/10) and explicitly recommended *against* rewriting it.
   - **5 Critical Fortifications Needed**: The expert identified 5 mandatory upgrades before handling real transactions at scale:
     1. **Credit Consistency**: Upfront deduction + `catch` refund fails if the serverless function crashes (e.g., OOM). Requires a transactional Credit Ledger.
     2. **Broad Service Role Usage**: `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. The backend API is the primary security wall and must strictly validate `user_id` authorization manually.
     3. **Webhook Recovery Risk**: Using `stripe_event_id` purely as a unique constraint blocks processing if an event fails midway and Stripe retries. Requires a state-aware Idempotency table (pending/success/failed).
     4. **Weak Observability**: Missing UUID Request IDs and centralized logging makes tracking missing credits and debugging impossible.
     5. **AI Output Validation**: Blindly trusting Gemini's formatting risks UI breakage. Requires Output Schema Validation (e.g., Zod or native Structured Outputs).
   - **Cloudflare Execution Limits (Clarification)**: Corrected a misconception: Cloudflare Pages Free limits CPU time to 10ms, *not* wall-clock time. Awaiting `fetch()` to Gemini consumes almost zero CPU time. Long waits are bound by edge idle timeouts (~100s) or client AbortControllers (60s), not function CPU limits.

### Infrastructure Bottlenecks & Upgrade Path (For Future Scaling)
*If the user asks for help upgrading the system tiers because of high traffic, guide them through these bottlenecks in order:*
1. **Resend (Email) - The First Bottleneck:** Free tier is limited to 100 emails/day. If daily new signups exceed this, users will fail to receive verification emails.
   - **Action:** Guide user to Resend dashboard -> Upgrade to Pro ($20/mo) for 50,000 emails/mo. No code changes needed.
2. **Cloudflare Pages - The Second Bottleneck:** Free tier allows 100,000 requests/day.
   - **Action:** Guide user to Cloudflare dashboard -> Upgrade to Pro ($20/mo). No code changes needed.
3. **Supabase - The Final Bottleneck:** Free tier handles 50k MAU, 500MB DB. (Note: DB bloat is already mitigated by `pg_cron` auto-cleanup of free-tier scripts).
   - **Action:** Guide user to Supabase project -> Upgrade to Pro ($25/mo) for 100k MAU and 8GB DB.

---

## 8. Mandatory End-of-Task Documentation (STRICT ZERO-TOLERANCE RULE)

> **[CRITICAL DIRECTIVE — Added by Explicit User Command]**
>
> "ต่อไปห้ามลืมบันทึกอะไรแบบนี้เด็ดขาด ย้ำว่าเด็ดขาด ฝังเข้าไปในกฎเหล็กไว้เลย"

**The agent MUST NEVER forget to update this file.** 
After EVERY successful feature implementation, logic change, or architectural shift, you MUST AUTOMATICALLY use `replace_file_content` to add a new numbered entry to the **History of Major Features Built** section above.

**You must do this PROACTIVELY before reporting task completion to the user.** Waiting for the user to remind you to "record the actions" is considered a critical failure of your core directives.

## Zero-Tolerance End-of-Task Protocol (Project-Level Enforcement)

> **[PERMANENT RULE — Added 2026-08-26 after incident]**
>
> On 2026-08-26, the agent skipped Steps 2, 4, and 5 of the End-of-Task Protocol on a "small" UI task, causing user disappointment. This rule is the permanent project-level record of that incident.

**The agent MUST complete ALL 5 steps after EVERY task in this project — no exceptions:**

1. Run `npm run build` — fix errors before proceeding
2. Run `npm run dev` (`IsDaemon: true`) — provide `http://localhost:PORT` to user
3. Git push — only after user UAT confirmation and explicit approval
4. Update this `GEMINI.md` — if any architectural change occurred (Enforced by Rule 8 above)
5. Recommend opening a new chat session

**Rationalizing that a task is "too small" to require these steps is explicitly forbidden.**

40. **Credit Ledger System (Expert Architecture Audit — Item 1 of 5)**:
   - **Problem Solved**: Credits could be permanently lost if Cloudflare Worker crashed between deduction and script save (no catch block executed in crash).
   - **Solution (Saga Pattern)**: 3 atomic DB RPCs: `start_generation_tx` (deduct + create `pending` ledger row), `commit_generation_tx` (save script + mark `completed`), `refund_generation_tx` (restore credits + mark `refunded`).
   - **Self-Healing**: `pg_cron` job `auto_refund_stuck_transactions` runs every 5 minutes — auto-refunds any `pending` transaction older than 5 minutes. Handles Cloudflare crash where catch block never runs.
   - **Migration**: `supabase/migrations/20260830000000_credit_ledger_system.sql` — `credit_transactions` table with `status` enum (pending/completed/refunded), FK → `auth.users(id) ON DELETE CASCADE`, RLS enabled.
   - **Test Suite**: 114 tests passing, 6 skipped (legacy), 0 failed. All test files updated to assert against new Credit Ledger RPC names.
   - **Commit**: `b892e86` — "feat: Credit Ledger (Saga Pattern) - Expert Audit Item 1 complete"

41. **Broad Service Role Usage Guard (Expert Architecture Audit — Item 2 of 5)**:
   - **Problem Solved**: The credit ledger RPCs (`start_generation_tx`, `commit_generation_tx`, `refund_generation_tx`) were `SECURITY DEFINER` without caller restrictions, allowing clients to bypass RLS and deduct credits from others (IDOR via anon key).
   - **Solution (Strict Caller Verification)**: Added `auth.role() = 'service_role'` validation inside all three RPCs and explicitly revoked `EXECUTE` privileges from `PUBLIC`, `anon`, and `authenticated`. 
   - **Security Pattern Enforced**: The Cloudflare Edge Functions (backend API) act as the primary security wall. They validate the user JWT (`auth.getUser(token)`), extract the true `user.id`, and call the strictly locked-down RPCs using `SUPABASE_SERVICE_ROLE_KEY`.
   - **Migration**: `supabase/migrations/20260830152617_lock_down_ledger_rpcs.sql`
   - **Commit**: (Pending auto commit)

42. **Webhook Recovery Risk (Expert Architecture Audit - Item 3 of 5)**:
   - **Problem Solved**: Webhooks previously used a simple `INSERT` into `webhook_events` for idempotency and `DELETE` on failure. If the worker crashed mid-execution, the ID remained forever, and Stripe retries would hit "Already processed" falsely, leading to lost tier upgrades.
   - **Solution (State-Aware Idempotency)**: Added `status` (`pending`, `success`, `failed`) and `error_message` to `webhook_events`. The webhook inserts `pending` upfront. Concurrent requests get `409 Conflict` (which Stripe retries). On success, it updates to `success`. On catch error, it updates to `failed`. Stripe retries on `failed` and `409`.
   - **Migration**: `supabase/migrations/20260830154000_webhook_idempotency.sql`
   - **Test Suite**: Updated stress concurrency and adversarial tests. 120 tests passed.

43. **Observability & Request Tracing (Expert Architecture Audit - Item 4 of 5)**:
   - **Problem Solved**: Weak Observability. Missing UUID Request IDs and centralized logging made tracking missing credits and debugging impossible across distributed serverless functions.
   - **Solution (Structured Logging)**: Created a centralized `Logger` class in `app/lib/logger.js`. Integrated it into Cloudflare `_middleware.js` to assign a `crypto.randomUUID()` to every incoming request. Added `X-Request-Id` to response headers.
   - **Integration**: Refactored `generate.js`, `webhook.js`, `create-portal.js`, `feedback.js`, `weekly-summary.js`, and `delete-account.js` to use `context.data.logger` for structured JSON logging (INFO/WARN/ERROR), attaching `userId` and contextual metadata to every log event.
   - **Commit**: (Pending auto commit)

44. **AI Output Validation (Expert Architecture Audit - Item 5 of 5)**:
   - **Problem Solved**: Blindly trusting Gemini's formatting risks UI breakage (e.g. missing `script_blocks` or `metadata`).
   - **Solution (Schema Validation)**: Implemented native JSON Schema Validation inside `generate.js` (`safeParseJson`). It validates and auto-fixes structural types (e.g., ensuring arrays, objects, and strings are present) before the data is passed to the frontend.
   - **Result**: Prevents `map()` errors or undefined access crashes on the client side. If the schema is fundamentally broken, it gracefully throws a handled error and refunds the user.
   - **Commit**: (Pending auto commit)

45. **Architecture Implementation Analysis (V2 Update)**:
   - Completely re-analyzed and updated the 4 Architecture Artifacts (`architecture_analysis_part1.md` to `part4.md`) to reflect the newly implemented Expert Audit fixes.
   - **Key Updates**: Documented the Saga Pattern in the Credit System, strict `service_role` RPC isolation, State-Aware Webhook Idempotency, `X-Request-Id` tracing, and AI Output Schema validation.
   - **Status**: The architecture is now highly robust against edge cases (like CF 50s limit) thanks to the `pg_cron` self-healing ledger.

### Expert Architecture Audit - COMPLETE
All 5 items from the Expert Architecture Audit have been successfully implemented and tested.

26. **Bug Fix (RPC Overload):** Fixed Failed to start credit transaction (500 Error) caused by a Supabase PostgREST PGRST203 function overload conflict when the start_generation_tx signature was updated without dropping the old one.

47. **Pre-Launch Security & UX Hardening (Turnstile + Abandoned Charge Fix + 524 Timeout Resilience)**:
   - **Bot & Spam Protection**: Integrated Cloudflare Turnstile natively via `@marsidev/react-turnstile` into `register.jsx`. Added `captchaToken` to `supabase.auth.signUp({ options: { captchaToken } })` with Supabase Auth Attack Protection. Added client-side fast-fail UX check for common temporary email providers (`tempmail.com`, `yopmail.com`, `10minutemail.com`, etc.).
   - **Abandoned Charge / React Unmount Leak**: Fixed memory leak in `create.jsx` where `analyzeAbortRef.current` was never assigned to `controller`. If the user navigates away or unmounts the component, `analyzeAbortRef.current.abort()` triggers cleanly, canceling the fetch.
   - **Edge Abort Recovery**: Added `request.signal.addEventListener('abort', ...)` with `context.waitUntil(supabaseAdmin.rpc('refund_generation_tx', ...))` in `generate.js`. Added checks for `request.signal.aborted` before calling Gemini and before committing the transaction.
   - **Cloudflare 524 HTML Resilience**: Added content-type check in `create.jsx` before calling `response.json()` to catch Cloudflare HTML error pages (Error 524 Gateway Timeout) and present a clean Thai message instead of crashing the React application with a `SyntaxError`.

