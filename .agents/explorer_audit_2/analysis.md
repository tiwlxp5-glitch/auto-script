# Frontend UX & State Resilience Audit Report (Auto Script)

**Audit Date:** 2026-08-25  
**Auditor:** Frontend UX & State Explorer  
**Scope:** `frontend/src/` (Components, Pages, Contexts, Layouts, Router, ErrorBoundary, Libs)  
**Status:** Complete Read-Only Investigation  

---

## Executive Summary

The Auto Script frontend application is a React 19 SPA built with Tailwind CSS v4, React Router v7, Vite v8, Supabase client, and Cloudflare Pages Functions. 

While the core functionality and sales psychology features are well-structured, this deep audit identified **17 specific issues** spanning 5 critical dimensions:
1. **ErrorBoundary & Chunk Loading / Code Splitting Resilience:** 3 findings (ChunkLoadError reload loops, layout unmounting during lazy loads, missing boundary reset).
2. **Network Drops, Timeouts, AbortController & State Hangs:** 6 findings (Missing `AbortSignal.timeout` on AI generation causing permanently disabled buttons and hanging spinners, unhandled profile sync failures causing infinite loading, missing rollbacks on optimistic UI).
3. **Memory Leaks & Unmounted Component Updates:** 4 findings (In-flight fetch completion on unmounted components, missing timer cleanups in `Settings` and `Register`, dead/orphaned state in `CreateScript`).
4. **Mobile Responsiveness & Visual Polish:** 4 findings (Clipped step badges in teleprompter due to `overflow-hidden`, missing scroll cues, mobile toast viewport overflows, legacy Vite stylesheet).
5. **Accessibility (a11y), Form Labels & UX Feedback:** 5 findings (Missing `label htmlFor` / `input id` pairings across all forms, unlabelled hamburger menu, missing `aria-live` for AI generation status, blocking browser `alert()` dialogs).

---

## Dimension 1: ErrorBoundary & Code Splitting Resilience

### Finding 1.1: Missing Chunk Loading Error Recovery on Deployment (High Severity)
- **File:** `frontend/src/App.jsx` (Lines 14-18) & `frontend/src/components/ErrorBoundary.jsx` (Lines 1-51)
- **Observation:**
  ```javascript
  // frontend/src/App.jsx:14-18
  const CreateScript = lazy(() => import('./pages/CreateScript'));
  const Pricing      = lazy(() => import('./pages/Pricing'));
  const Settings     = lazy(() => import('./pages/Settings'));
  const History      = lazy(() => import('./pages/History'));
  const Legal        = lazy(() => import('./pages/Legal'));
  ```
  When new deployments are pushed to Cloudflare Pages, previous chunk hashes (e.g., `CreateScript-C9jiVBWP.js`) become unavailable (HTTP 404). Users navigating to lazy-loaded routes encounter `TypeError: Failed to fetch dynamically imported module` or `ChunkLoadError`.
  Currently, `ErrorBoundary.jsx` displays a static error message with manual reload buttons, but fails to handle automated recovery or distinguish chunk load errors from logic runtime crashes.
- **Remediation:** Implement a `lazyWithRetry` utility with a `sessionStorage` guard to automatically refresh the page once upon encountering dynamic import failures, downloading the latest bundle without user intervention.
- **Proposed Code:**
  ```javascript
  // src/lib/lazyWithRetry.js
  import { lazy } from 'react';

  export function lazyWithRetry(componentImport) {
    return lazy(async () => {
      const pageHasBeenForceRefreshed = JSON.parse(
        window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
      );

      try {
        const component = await componentImport();
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
        return component;
      } catch (error) {
        if (!pageHasBeenForceRefreshed) {
          window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
          window.location.reload();
          return new Promise(() => {}); // Prevent render while reloading
        }
        throw error;
      }
    });
  }
  ```

---

### Finding 1.2: Layout Unmounting & Flash during Lazy Navigation (Medium Severity)
- **File:** `frontend/src/App.jsx` (Lines 54-81) & `frontend/src/layouts/MainLayout.jsx` (Lines 8-11)
- **Observation:**
  In `App.jsx`, `<Suspense fallback={<PageLoader />}>` wraps the entire `<Routes>` tree. When navigating between lazy-loaded routes (`/create` -> `/history`), the entire `MainLayout` (including sticky `Navbar` and `Footer`) unmounts and is replaced with a full-screen spinner (`min-h-screen bg-slate-50`), causing a jarring screen flicker.
- **Remediation:** Move `<Suspense>` inside `MainLayout.jsx` around `<Outlet />`. Keep the top navigation and layout persistent while sub-pages load.
- **Proposed Code:**
  ```jsx
  // src/layouts/MainLayout.jsx
  import { Suspense } from 'react';
  import { Outlet, Link } from 'react-router-dom';
  import Navbar from '../components/Navbar';

  function PageSubLoader() {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-slate-500 font-medium">กำลังโหลดเนื้อหา...</p>
      </div>
    );
  }

  function MainLayout() {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={<PageSubLoader />}>
            <Outlet />
          </Suspense>
        </main>
        {/* Footer */}
      </div>
    );
  }
  ```

---

### Finding 1.3: ErrorBoundary Placement & Missing Route Recovery (Medium Severity)
- **File:** `frontend/src/main.jsx` (Lines 11-17) & `frontend/src/components/ErrorBoundary.jsx` (Lines 1-51)
- **Observation:**
  `<ErrorBoundary>` is rendered outside `<BrowserRouter>`. If a component crashes, the ErrorBoundary cannot access React Router's location context or reset its state upon navigating to a safe route. Clicking "กลับหน้าหลัก" executes `window.location.href = '/'` causing an unnecessary full reload.
- **Remediation:** Enhance `ErrorBoundary` with a `handleReset` method and support error logging / inline reset capabilities.

---

## Dimension 2: Network Drops, Timeouts, AbortController & State Hangs

### Finding 2.1: Missing AbortController & Timeout on `/api/generate` (Critical Severity)
- **File:** `frontend/src/pages/CreateScript.jsx` (Lines 121-218, 421-482)
- **Observation:**
  ```javascript
  // CreateScript.jsx:146-153
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });
  ```
  1. `fetch('/api/generate')` has **no timeout signal** (`AbortSignal.timeout`) and **no active AbortController**.
  2. If the user's mobile network drops, connection throttles, or the Cloudflare worker stalls, the request never completes.
  3. `isGenerating` remains `true` indefinitely.
  4. Both "สร้างสคริปต์ปกติ" and "สร้างทีเดียว 3 สไตล์" buttons remain permanently disabled with spinning icons (`cursor-wait`), and the teleprompter panel displays a spinning loader forever without allowing the user to cancel or retry.
- **Remediation:**
  1. Introduce an `AbortController` with a 60-second timeout.
  2. Bind the abort controller to a ref (`generateAbortRef`) so pending requests can be aborted on unmount or on user cancellation.
  3. Display a clear, localized timeout error message with a "ลองใหม่อีกครั้ง" button.
- **Proposed Code:**
  ```javascript
  // CreateScript.jsx
  const generateAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      if (generateAbortRef.current) {
        generateAbortRef.current.abort();
      }
    };
  }, []);

  const handleGenerate = async (e, isMultiVersion = false) => {
    if (e) e.preventDefault();
    // ... validation ...

    setIsGenerating(true);
    setGeneratingMode(isMultiVersion ? 'multi' : 'single');
    setError(null);
    setGeneratedScript(null);
    setBannedWarnings([]);

    const controller = new AbortController();
    generateAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('เซสชันหมดอายุ กรุณาล็อกอินใหม่อีกครั้ง');
      }

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

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "เกิดข้อผิดพลาดในการสร้างสคริปต์");
      }

      // Process responseData ...
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('การเชื่อมต่อหมดเวลา (Timeout) กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการสร้างสคริปต์ กรุณาลองใหม่อีกครั้งครับ');
      }
    } finally {
      clearTimeout(timeoutId);
      generateAbortRef.current = null;
      setIsGenerating(false);
      setGeneratingMode(null);
    }
  };
  ```

---

### Finding 2.2: Silent Profile Sync Failure Causing Permanent Account Loading State (High Severity)
- **File:** `frontend/src/context/AuthContext.jsx` (Lines 19-31) & `frontend/src/pages/CreateScript.jsx` (Lines 436-439, 467-470) & `frontend/src/pages/Settings.jsx` (Lines 132-134)
- **Observation:**
  1. In `AuthContext.jsx`:
     ```javascript
     const fetchProfile = useCallback(async (userId) => {
       try {
         const { data, error } = await supabase
           .rpc('sync_profile_credits', { p_user_id: userId })
           .single();
         if (data && !error) {
           setProfile(data);
         }
       } catch (err) {
         console.error("Failed to sync profile:", err);
       }
     }, []);
     ```
  2. If the network drops during the initial `sync_profile_credits` call, `profile` remains `null`.
  3. In `CreateScript.jsx`:
     ```jsx
     // CreateScript.jsx:436-439
     !profile ? (
       <div className="flex items-center justify-center gap-2">
         <svg className="w-5 h-5 animate-spin" ... />
         <span>กำลังโหลดข้อมูลบัญชี...</span>
       </div>
     )
     ```
     The button is permanently disabled with `bg-slate-400 cursor-not-allowed` and the spinner runs forever with no retry button.
  4. In `Settings.jsx`:
     ```jsx
     if (!user || !profile) {
       return <div className="text-center py-20 text-slate-500">กำลังโหลดข้อมูลบัญชี...</div>;
     }
     ```
     The settings page is permanently stuck on full-page loading.
- **Remediation:**
  1. In `AuthContext.jsx`, track `profileError` and expose a retry handler.
  2. In `CreateScript.jsx` and `Settings.jsx`, display a retry button (`ลองโหลดใหม่อีกครั้ง`) if `profile` failed to load after auth completes.

---

### Finding 2.3: Missing Abort / Timeout on Stripe Portal & Account Deletion (Medium Severity)
- **File:** `frontend/src/pages/Settings.jsx` (Lines 61-98, 100-130)
- **Observation:**
  `fetch('/api/create-portal')` and `fetch('/api/delete-account')` lack timeouts and abort controllers. If the request stalls, `isLoadingPortal` or `isDeleting` remains `true` permanently, disabling action buttons.
- **Remediation:** Wrap fetch calls with `AbortSignal.timeout(15000)` and handle network errors gracefully.

---

### Finding 2.4: History Fetch Failure Masked as Empty State (Medium Severity)
- **File:** `frontend/src/pages/History.jsx` (Lines 15-27, 141-148)
- **Observation:**
  ```javascript
  const loadHistory = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setScripts(data);
    }
    setLoading(false);
  };
  ```
  If Supabase returns an error or network is offline, `setScripts` is not called, `scripts` remains `[]`, and line 141 displays "ไม่พบสคริปต์ คุณยังไม่ได้สร้างสคริปต์" (empty state) rather than informing the user that a network failure occurred.
- **Remediation:** Track `fetchError` state and render an error banner with a "ลองใหม่อีกครั้ง" retry button.

---

### Finding 2.5: Optimistic UI in `toggleFavorite` Lacks Error Rollback (Medium Severity)
- **File:** `frontend/src/pages/History.jsx` (Lines 39-47)
- **Observation:**
  ```javascript
  const toggleFavorite = async (scriptId, currentStatus) => {
    // Optimistic UI update
    setScripts(scripts.map(s => s.id === scriptId ? { ...s, is_favorite: !currentStatus } : s));
    
    await supabase
      .from('scripts')
      .update({ is_favorite: !currentStatus })
      .eq('id', scriptId);
  };
  ```
  If the Supabase update fails due to network drop, expired session, or RLS error, the optimistic change is not reverted. The user sees a yellow star even though the change was rejected on the database.
- **Remediation:** Save snapshot of previous scripts before updating and rollback on catch.
- **Proposed Code:**
  ```javascript
  const toggleFavorite = async (scriptId, currentStatus) => {
    const previous = [...scripts];
    setScripts(scripts.map(s => s.id === scriptId ? { ...s, is_favorite: !currentStatus } : s));
    
    const { error } = await supabase
      .from('scripts')
      .update({ is_favorite: !currentStatus })
      .eq('id', scriptId);

    if (error) {
      console.error("Failed to toggle favorite:", error);
      setScripts(previous); // Rollback
    }
  };
  ```

---

### Finding 2.6: Google OAuth Button Lacks Loading State (Low Severity)
- **File:** `frontend/src/pages/Login.jsx` (Lines 32-43) & `frontend/src/pages/Register.jsx` (Lines 36-47)
- **Observation:**
  Clicking "เข้าสู่ระบบด้วย Google" / "สมัครด้วย Google" initiates an async redirect to OAuth provider without setting a loading state. Users can double-click or trigger concurrent OAuth popup requests.
- **Remediation:** Add `isGoogleLoading` state to disable the button and show a spinner.

---

## Dimension 3: Memory Leaks & Cleanup

### Finding 3.1: In-Flight Fetch State Updates on Unmounted `CreateScript` (Medium Severity)
- **File:** `frontend/src/pages/CreateScript.jsx` (Lines 127-218)
- **Observation:**
  If a user starts generating a script and navigates away to `/history` or `/pricing` before the generation finishes (~5-15s), the promise resolution triggers `setBannedWarnings`, `setGeneratedScript`, `setProfile`, and `setIsGenerating(false)` on an unmounted component.
- **Remediation:** Cancel request via `generateAbortRef.current.abort()` in `useEffect` cleanup.

---

### Finding 3.2: Missing Timeout Cleanup in `Settings` and `Register` (Low Severity)
- **File:** `frontend/src/pages/Settings.jsx` (Lines 30-42) & `frontend/src/pages/Register.jsx` (Lines 30-33)
- **Observation:**
  In `Settings.jsx`:
  ```javascript
  setTimeout(() => setShowToast(false), 5000);
  ```
  In `Register.jsx`:
  ```javascript
  setTimeout(() => { navigate('/create'); }, 2000);
  ```
  Neither timeout is cleared on component unmount, causing React warnings and potential out-of-order navigation if the user rapidly switches routes.
- **Remediation:** Store timer IDs in refs/variables and return cleanup functions from `useEffect`.

---

### Finding 3.3: Dead / Orphaned State and Ref in `CreateScript.jsx` (Low Severity)
- **File:** `frontend/src/pages/CreateScript.jsx` (Lines 10, 20, 23-25, 81-87, 625-665)
- **Observation:**
  `analyzeAbortRef`, `productUrls`, `isAnalyzing`, `terminalText`, `showTerminal`, and the entire `<Modern AI Analysis Loading Modal>` (lines 625-665) are dead code left over from a previous URL scraping feature. They bloat the bundle and trigger 7 linter warnings.
- **Remediation:** Remove unused state, refs, and dead JSX modal from `CreateScript.jsx`.

---

## Dimension 4: Mobile Responsiveness, Tailwind Breakpoints & Overflow

### Finding 4.1: Teleprompter Step Badge Clipped on Mobile by Parent `overflow-hidden` (Medium Severity)
- **File:** `frontend/src/pages/CreateScript.jsx` (Lines 504, 576-578)
- **Observation:**
  The parent container at line 504 has `overflow-hidden`. Script block cards at line 576 position the step number circle at `absolute -left-3 top-5 w-6 h-6`. On mobile screens (<400px), `-left-3` (negative margin) causes the left half of the circle badge (e.g. "1", "2", "3") to be clipped by the parent's `overflow-hidden` boundary.
- **Remediation:** Adjust badge positioning or margin to `left-2 top-4` or ensure adequate padding `pl-5` so the badge is fully visible across all mobile viewports.

---

### Finding 4.2: Mode Filter Bar Horizontal Scroll Cues on Mobile (Low Severity)
- **File:** `frontend/src/pages/History.jsx` (Lines 106-123)
- **Observation:**
  The filter bar uses `overflow-x-auto hide-scrollbar`. On mobile screens (iPhone SE, 375px), the rightmost button ("เปรียบเทียบชัดๆ") is partially cut off without a visual scroll indicator or fade gradient, making it non-obvious to users that the container is scrollable.
- **Remediation:** Add subtle gradient fade edges or standard momentum scroll styling.

---

### Finding 4.3: Toast Notification Mobile Viewport Overlap (Low Severity)
- **File:** `frontend/src/pages/Settings.jsx` (Lines 140-147)
- **Observation:**
  `fixed top-20 right-4 md:right-8` on narrow mobile screens (320px-360px) can overlap header content or stretch beyond viewport width.
- **Remediation:** Change to `fixed top-20 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-sm`.

---

### Finding 4.4: Legacy Vite CSS in `App.css` (Low Severity)
- **File:** `frontend/src/App.css` (Lines 1-185)
- **Observation:**
  `App.css` contains 185 lines of unused default Vite starter CSS (`.counter`, `.hero .framework`, `#next-steps`, etc.) which is not imported or needed in the Tailwind v4 styling setup.
- **Remediation:** Clean up unused `App.css` to prevent bundle bloat.

---

## Dimension 5: Accessibility (a11y), Form Labels & UX Feedback

### Finding 5.1: Missing Form Label & Input `id`/`htmlFor` Associations (High Severity)
- **File:** `frontend/src/pages/CreateScript.jsx` (Lines 298-367), `frontend/src/pages/Login.jsx` (Lines 77-98), `frontend/src/pages/Register.jsx` (Lines 88-110), `frontend/src/pages/Settings.jsx` (Lines 163-179)
- **Observation:**
  Form labels (`<label className="...">`) lack `htmlFor` attributes, and `<input>` / `<textarea>` elements lack `id` attributes. Screen reader users cannot determine which input corresponds to which field, and tapping the label text on mobile does not focus the input.
- **Remediation:** Pair every `<label htmlFor="field-id">` with `<input id="field-id">`.
- **Proposed Code Sample:**
  ```jsx
  // CreateScript.jsx
  <div>
    <label htmlFor="productName" className="block text-sm font-medium text-slate-700 mb-2">
      ชื่อสินค้า
    </label>
    <input
      id="productName"
      type="text"
      required
      value={productName}
      onChange={(e) => setProductName(e.target.value)}
      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
      placeholder="เช่น เซรั่มหน้าใส แบรนด์ XYZ"
    />
  </div>
  ```

---

### Finding 5.2: Unlabelled Hamburger Button & Missing Keyboard Trap in `Navbar` (Medium Severity)
- **File:** `frontend/src/components/Navbar.jsx` (Lines 63-72)
- **Observation:**
  ```jsx
  <button 
    onClick={() => setIsMenuOpen(!isMenuOpen)}
    className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors focus:outline-none"
  >
    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
  ```
  1. The button has no `aria-label` or accessible text name (screen readers read "Button").
  2. Missing `aria-expanded={isMenuOpen}` and `aria-haspopup="true"`.
  3. Uses `focus:outline-none` without `focus-visible:ring-2`, breaking keyboard navigation.
  4. Pressing the `Escape` key does not close the open dropdown menu.
- **Remediation:** Add `aria-label="เปิดเมนูการนำทาง"`, `aria-expanded`, `focus-visible:ring-2`, and `keydown` event listener for the Escape key.

---

### Finding 5.3: Missing Live Regions (`aria-live`) for AI Generation Status (Medium Severity)
- **File:** `frontend/src/pages/CreateScript.jsx` (Lines 430-482, 497-503)
- **Observation:**
  When a user triggers script generation, the status change is purely visual (`isGenerating`). Screen reader users receive no auditory announcement that generation has started or when the script has completed.
- **Remediation:** Add `aria-live="polite"` and `role="status"` to generation state containers.

---

### Finding 5.4: Jarring Browser `alert()` and `confirm()` Dialogs (Medium Severity)
- **File:** `CreateScript.jsx` (Lines 104, 109, 116, 227), `History.jsx` (Lines 53, 57, 59, 192, 205), `Pricing.jsx` (Line 18), `Settings.jsx` (Lines 54, 56, 63, 72, 90, 94, 101, 104, 119, 123, 126)
- **Observation:**
  Browser native dialogs (`alert()`, `confirm()`) freeze the JavaScript event loop, block background processes, look unstyled, and trigger popup blocker warnings on mobile Safari/Chrome.
  For example, copying a script triggers `alert('คัดลอกสคริปต์เรียบร้อยแล้ว!')`.
- **Remediation:**
  1. Replace copy `alert()` with an inline "✓ คัดลอกแล้ว!" button state.
  2. Replace error alerts with non-blocking error banners / toast messages.

---

### Finding 5.5: Inline SVGs Missing `aria-hidden="true"` (Low Severity)
- **File:** Across all JSX components (`Navbar.jsx`, `CreateScript.jsx`, `History.jsx`, `Home.jsx`, `Pricing.jsx`, `Settings.jsx`, `Legal.jsx`)
- **Observation:**
  Dozens of decorative inline `<svg>` icons lack `aria-hidden="true"`, causing assistive technologies to announce redundant graphical elements.
- **Remediation:** Add `aria-hidden="true"` to all decorative SVGs.

---

## Complete Findings Summary Matrix

| ID | Category | Location | Severity | Impact |
|---|---|---|---|---|
| **F-1.1** | Code Splitting | `App.jsx:14`, `ErrorBoundary.jsx` | High | Dynamic chunk load 404s after new deployment crash app |
| **F-1.2** | Code Splitting | `App.jsx:54`, `MainLayout.jsx` | Medium | Entire Navbar/Layout unmounts during lazy navigation |
| **F-1.3** | ErrorBoundary | `main.jsx:11`, `ErrorBoundary.jsx` | Medium | ErrorBoundary cannot reset state on route change |
| **F-2.1** | Network / State | `CreateScript.jsx:146` | **Critical** | Missing timeout / AbortController permanently hangs generate button |
| **F-2.2** | Network / State | `AuthContext.jsx:19`, `CreateScript.jsx:436` | High | Profile sync network glitch locks user in permanent loading state |
| **F-2.3** | Network / State | `Settings.jsx:78, 109` | Medium | Stripe portal & delete account lack timeout handling |
| **F-2.4** | Network / State | `History.jsx:15` | Medium | History fetch error silently masked as empty state |
| **F-2.5** | State Resilience | `History.jsx:39` | Medium | Favorite toggle optimistic UI lacks rollback on failure |
| **F-2.6** | UX State | `Login.jsx:32`, `Register.jsx:36` | Low | Google OAuth login lacks loading state / duplicate prevention |
| **F-3.1** | Memory Leak | `CreateScript.jsx:127` | Medium | Pending fetch updates unmounted component state |
| **F-3.2** | Memory Leak | `Settings.jsx:40`, `Register.jsx:30` | Low | Missing `setTimeout` cleanup in `useEffect` |
| **F-3.3** | Dead Code | `CreateScript.jsx:10, 20, 625` | Low | Orphaned scraping states, refs, and modal inflate bundle |
| **F-4.1** | Mobile Layout | `CreateScript.jsx:504, 576` | Medium | Teleprompter step badges clipped by `overflow-hidden` on mobile |
| **F-4.2** | Mobile Layout | `History.jsx:106` | Low | Filter bar lacks horizontal scroll visual indicator |
| **F-4.3** | Mobile Layout | `Settings.jsx:140` | Low | Fixed toast notification overlaps viewport on narrow mobile |
| **F-4.4** | Cleanup | `App.css:1-185` | Low | Unused legacy starter CSS included in build |
| **F-5.1** | Accessibility | `CreateScript.jsx`, `Login.jsx`, `Register.jsx`, `Settings.jsx` | High | Missing `htmlFor` and `id` bindings on all form inputs |
| **F-5.2** | Accessibility | `Navbar.jsx:63` | Medium | Hamburger button missing `aria-label`, focus rings, ESC key |
| **F-5.3** | Accessibility | `CreateScript.jsx:430` | Medium | AI generation lacks `aria-live` status announcements |
| **F-5.4** | UX Feedback | `CreateScript.jsx:227`, `Settings.jsx` | Medium | Blocking browser `alert()` and `confirm()` dialogs |
| **F-5.5** | Accessibility | Across all components | Low | Decorative SVGs missing `aria-hidden="true"` |
