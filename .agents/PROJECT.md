# Project: Auto Script Deep QA Audit

## Architecture
- **Frontend**: React + Vite (or similar SPA) in `src/` (`CreateScript.jsx`, `Pricing.jsx`, `Settings.jsx`, `Home.jsx`, `App.jsx`, context/hooks).
- **Backend**: Cloudflare Pages Functions in `functions/api/` (`generate.js`, `create-portal.js`, `webhook.js`).
- **External Services**:
  - Google Gemini API (`gemini-3.6-flash`)
  - Jina AI Reader / scraping
  - Stripe Billing & Customer Portal
  - Supabase Database & Auth (RPCs, Row Level Security, tables)

## Objective & Requirements
Perform a comprehensive Quality Assurance (QA) audit identifying:
1. Edge cases in user input (empty, extreme length, malicious characters, unicode, rapid actions).
2. State management flaws (race conditions, async cancellations, stale state, corrupted localStorage, auth lifecycle glitches).
3. Backend robustness & vulnerability flaws (unvalidated payloads, missing authentication/authorization checks, unhandled external API failures from Jina/Gemini/Stripe/Supabase, RPC parameter mismatches, secret leakage).
4. Compliance & Rule Violations (GEMINI.md adherence, deprecated model checks, exact URL/string preservation, Supabase schema alignment).

## Audit Plan & Tracks
| Track | Focus | Assigned Agent | Status |
|---|---|---|---|
| Track 1 | Frontend UI & State Testing | `teamwork_preview_explorer_fe_1` | Dispatched |
| Track 2 | Backend APIs & Security Testing | `teamwork_preview_explorer_be_1` | Dispatched |
| Track 3 | Schema, RPC & Spec Alignment | `teamwork_preview_spec_miner_1` | Dispatched |
| Track 4 | Adversarial Stress & Edge Case Verification | `teamwork_preview_challenger_1` | Planned |
| Track 5 | Blueprint Authoring & Review | `teamwork_preview_worker_1` & Reviewers | Planned |

## Code Layout & Deliverables
- Target Deliverable: `C:\Auto script\QA_AUDIT_BLUEPRINT.md`
- Working Directories:
  - `.agents/orchestrator_3/`
  - `.agents/teamwork_preview_explorer_fe_1/`
  - `.agents/teamwork_preview_explorer_be_1/`
  - `.agents/teamwork_preview_spec_miner_1/`
