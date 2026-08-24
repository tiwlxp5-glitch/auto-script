# Cloudflare + Supabase Security Runbook

When building features for this architecture, you MUST adhere to the following security standards:

## 1. Secrets & API Keys Boundary
- **Frontend (Vite/React)**: NEVER use `import.meta.env.VITE_...` for sensitive keys (e.g., LLM API keys, Stripe Secret Keys, Supabase Service Role Keys). The frontend must only possess the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Backend (Cloudflare Functions)**: All interactions with 3rd-party APIs (Google Gemini, Stripe, Jina AI) must happen here. Access environment variables via the `env` object provided in the function context (e.g., `env.GEMINI_API_KEY`).

## 2. Business Logic & Credit Deduction
- NEVER trust the client to manage its own billing or quotas (e.g., `update({ credits: newCredits })` on the frontend).
- Credit deduction and sensitive database updates must be executed in Cloudflare Functions using the `SUPABASE_SERVICE_ROLE_KEY`.
- Always verify the user's identity on the backend using `supabase.auth.getUser(token)` with the JWT passed from the frontend `Authorization: Bearer <token>` header.

## 3. Webhook Idempotency
- When building or modifying webhook handlers (e.g., Stripe webhooks), you MUST enforce idempotency.
- Stripe guarantees "at least once" delivery, which can result in duplicate events.
- Implement a `webhook_events` table in Supabase. Attempt to insert the `event.id` before processing. If a unique constraint violation occurs (code `23505`), return 200 early to prevent double-crediting.

## 4. Frontend Security Headers
- Ensure the `public/_headers` file exists with restrictive policies to score an A+ on security scanners.
- If a new 3rd-party integration is added (e.g., Analytics, Pixel), you MUST remind the user to update the `Content-Security-Policy` and `Access-Control-Allow-Origin` in `public/_headers`.
