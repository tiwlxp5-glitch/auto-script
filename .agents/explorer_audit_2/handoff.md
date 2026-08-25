# Handoff Report: Frontend UX & State Resilience Audit

**Auditor:** Frontend UX & State Explorer (`explorer_audit_2`)  
**Target:** Auto Script Frontend React Application  
**Target Directory:** `frontend/src/`  
**Handoff Type:** Hard (Audit Complete)  
**Date:** 2026-08-25  

---

## 1. Observation

### 1.1 ErrorBoundary & Code Splitting
- **Dynamic Imports in `App.jsx` (Lines 14-18):**
  ```javascript
  const CreateScript = lazy(() => import('./pages/CreateScript'));
  const Pricing      = lazy(() => import('./pages/Pricing'));
  const Settings     = lazy(() => import('./pages/Settings'));
  const History      = lazy(() => import('./pages/History'));
  const Legal        = lazy(() => import('./pages/Legal'));
  ```
  Dynamic chunk loading has no reload retry mechanism upon new production deployments (stale chunk hashes 404).
- **Layout Unmounting in `App.jsx` (Lines 54-81):**
  ```jsx
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<MainLayout />}>
  ```
  Suspense wraps all routes at root level, causing `MainLayout` and `Navbar` to completely unmount during lazy navigation.

### 1.2 Network Timeouts & State Locks
- **Unbounded Fetch in `CreateScript.jsx` (Lines 146-153):**
  ```javascript
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });
  ```
  `fetch('/api/generate')` contains NO timeout signal (`AbortSignal.timeout`) and NO active `AbortController`.
- **Button Lock in `CreateScript.jsx` (Lines 421-428, 452-459):**
  ```jsx
  disabled={isGenerating || !user || !profile}
  className={`... ${isGenerating ? 'bg-blue-400 cursor-wait' : (!user || !profile) ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600'}`}
  ```
  When network hangs, `isGenerating` stays `true` indefinitely with no cancellation or retry path.
- **Profile Loading Lock in `CreateScript.jsx` (Lines 436-439) & `Settings.jsx` (Lines 132-134):**
  If `sync_profile_credits` fails during initial session load, `profile` is `null`, locking the UI into "กำลังโหลดข้อมูลบัญชี..." permanently.
- **Optimistic UI in `History.jsx` (Lines 39-47):**
  `toggleFavorite` updates local state optimistically without rolling back when Supabase update fails.

### 1.3 Memory Leaks & Cleanup
- **In-flight Fetch Updates in `CreateScript.jsx` (Lines 201-218):**
  Navigating away while AI is generating executes `setGeneratedScript`, `setProfile`, `setIsGenerating(false)` on unmounted component.
- **Uncleaned Timers in `Settings.jsx` (Line 40) & `Register.jsx` (Line 30):**
  `setTimeout` calls lack clearance in `useEffect` cleanup.
- **Dead Code in `CreateScript.jsx` (Lines 10, 20, 23-25, 81-87, 625-665):**
  `analyzeAbortRef`, `productUrls`, `showTerminal`, `isAnalyzing`, `terminalText`, and `<Modern AI Analysis Loading Modal>` are orphaned.

### 1.4 Mobile Layout & Clipping
- **Teleprompter Step Circle Clipping in `CreateScript.jsx` (Lines 504, 576):**
  Parent `overflow-hidden` clips `absolute -left-3` badge on mobile screens (<400px).
- **Dead Stylesheet in `App.css` (Lines 1-185):**
  185 lines of unused default Vite starter CSS.

### 1.5 Accessibility (a11y)
- **Form Controls Missing Labels:**
  `<input>` and `<textarea>` in `CreateScript.jsx`, `Login.jsx`, `Register.jsx`, `Settings.jsx` lack `id` attributes and their `<label>` elements lack `htmlFor`.
- **Navbar Menu (Lines 63-72):**
  Hamburger button lacks `aria-label`, `aria-expanded`, and Escape key dismissal.
- **Blocking Native Dialogs:**
  Frequent use of browser `alert()` and `confirm()` blocks the event loop and interrupts mobile users.

---

## 2. Logic Chain

1. **Deployment Resilience:**
   - *Premise:* Static hosting on Cloudflare Pages generates unique hashes per build (e.g. `dist/assets/CreateScript-C9jiVBWP.js`).
   - *Observation:* Old tabs attempting to load outdated chunk hashes receive 404s.
   - *Deduction:* Without `lazyWithRetry`, users will crash into ErrorBoundary until a manual hard refresh is performed.

2. **Network Resilience & State Locking:**
   - *Observation:* Mobile devices frequently transition between Wi-Fi, 4G, 5G, and dead zones.
   - *Deduction:* Any unbounded `fetch()` without `AbortController` and timeout will suspend promise resolution indefinitely, keeping state flags (`isGenerating: true`, `isLoadingPortal: true`) active forever and disabling interactive buttons.

3. **Sub-Layout Suspense vs Root Suspense:**
   - *Observation:* `App.jsx` wraps `<Suspense>` around `<Routes>`.
   - *Deduction:* When a sub-page loads, the entire route tree unmounts, destroying Navbar state and creating full-page flicker. Moving `<Suspense>` inside `MainLayout` preserves the layout shell.

4. **Accessibility & Form Usability:**
   - *Observation:* Absence of `htmlFor`/`id` bindings prevents screen readers from announcing field context and disables tap-to-focus behavior on touchscreens.

---

## 3. Caveats

1. **Backend Integration Boundary:** The timeout on `/api/generate` is set to 60 seconds on the frontend. If the Gemini API backend takes longer under heavy load, the client will abort. 60 seconds is standard for LLM generation.
2. **Offline Mode:** The application is an online SaaS tool; full offline local-first editing was not in scope, but graceful network error handling is ensured.
3. **SessionStorage Availability:** `lazyWithRetry` relies on `window.sessionStorage`. If cookies/storage are disabled by extreme browser privacy modes, it will fall back to normal lazy behavior.

---

## 4. Conclusion & Remediation Plan

The frontend codebase is functionally solid, but requires **7 targeted structural enhancements** to achieve production-grade resilience:

1. **Implement `lazyWithRetry`:** Add chunk reload auto-recovery in `App.jsx` for all 5 lazy routes.
2. **Relocate `<Suspense>` to `MainLayout.jsx`:** Eliminate full-page flash during route navigation.
3. **Add `AbortController` + 60s Timeout to `handleGenerate`:** Prevent infinite button disabling and spinner hangs on network drops.
4. **Clean up Orphaned Scraping States:** Remove `analyzeAbortRef`, `productUrls`, `showTerminal`, and modal JSX from `CreateScript.jsx`.
5. **Add State Rollback on `toggleFavorite` & Profile Error Retry:** Make state changes resilient to network dropouts.
6. **Form Accessibility & A11y Polish:** Add `htmlFor`/`id` to all form fields, add `aria-label` / `aria-expanded` / `Escape` handler to Navbar hamburger button, add `aria-hidden="true"` to SVGs.
7. **Replace Native `alert()` with Inline UI Feedback:** Modernize clipboard copy feedback with transient "✓ คัดลอกแล้ว!" button state.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Linting Verification:**
   ```powershell
   cd "C:\Auto script\frontend"
   npm run lint
   ```
   *Expected:* 0 errors, reduction from 15 warnings to 0 warnings.
2. **Unit & Integration Tests:**
   ```powershell
   cd "C:\Auto script\frontend"
   npm run test
   ```
3. **Build Verification:**
   ```powershell
   cd "C:\Auto script\frontend"
   npm run build
   ```
   *Expected:* Clean Vite build with zero chunk resolution errors.
4. **End-to-End Playwright Navigation & Mobile Responsiveness Test:**
   ```powershell
   cd "C:\Auto script\frontend"
   npx playwright test tests/qa_polish.spec.js
   ```

### 5.2 Specific File Inspection Targets
- `frontend/src/App.jsx` (lazy imports & Suspense placement)
- `frontend/src/layouts/MainLayout.jsx` (nested Suspense around Outlet)
- `frontend/src/pages/CreateScript.jsx` (AbortController, form labels, copy state, removal of dead state)
- `frontend/src/components/Navbar.jsx` (accessibility attributes, focus rings, Escape listener)
- `frontend/src/pages/History.jsx` (optimistic rollback, fetch error state)
- `frontend/src/pages/Settings.jsx` (timeout cleanup, mobile toast positioning)
