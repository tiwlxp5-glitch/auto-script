# Frontend QA Audit Handoff Report

**Agent:** `teamwork_preview_explorer_fe_1` (Frontend QA Explorer)  
**Role:** Read-Only QA & Architecture Investigation  
**Working Directory:** `C:\Auto script\.agents\teamwork_preview_explorer_fe_1`  
**Date:** 2026-08-24  
**Primary Deliverable:** `C:\Auto script\.agents\teamwork_preview_explorer_fe_1\analysis.md`  

---

## 1. Observation

Direct code observations from static analysis, linter runs, and deep inspections across `src/`:

1. **Stored/Reflected XSS Vulnerability:**
   - In `frontend/src/pages/CreateScript.jsx` (lines 692–695):
     ```jsx
     <p 
       className="text-xl font-medium text-slate-800 leading-relaxed mb-4"
       dangerouslySetInnerHTML={{ __html: `"${highlightBannedWords(block.audio_spoken, bannedWarnings)}"` }}
     />
     ```
   - In `frontend/src/lib/bannedWords.js` (lines 44–57):
     ```javascript
     export function highlightBannedWords(text, foundWarnings) {
       if (!text || foundWarnings.length === 0) return text;
       let highlightedText = text;
       foundWarnings.forEach(warning => {
         const replacement = `<span class="bg-red-500 text-white px-1 rounded mx-0.5 cursor-help" title="${warning.reason}">${warning.word}</span>`;
         highlightedText = highlightedText.split(warning.word).join(replacement);
       });
       return highlightedText;
     }
     ```
   - *Observation*: `text` / `block.audio_spoken` is inserted directly into `dangerouslySetInnerHTML` without HTML character escaping.

2. **Insecure URL Domain Whitelist Bypass:**
   - In `frontend/src/pages/CreateScript.jsx` (lines 242–250):
     ```javascript
     const allowedDomains = ['shopee', 'lazada', 'tiktok', 'facebook', 'instagram', 'line.me', 'lin.ee'];
     for (let url of validUrls) {
       const lowerUrl = url.toLowerCase();
       const isAllowed = allowedDomains.some(domain => lowerUrl.includes(domain));
       if (!isAllowed) { ... }
     }
     ```
   - *Observation*: `lowerUrl.includes('shopee')` returns `true` for `https://evil.com/?q=shopee` or `https://shopee.attacker.xyz/phish`.

3. **Uncancelled Fetch Stream Leak:**
   - In `frontend/src/pages/CreateScript.jsx` (lines 272–298): `fetch('/api/analyze')` does not attach an `AbortController` signal, and the `while (true)` reader loop continues reading chunks after unmount.

4. **Missing Error Boundary & Route Fallback:**
   - In `frontend/src/main.jsx` and `frontend/src/App.jsx`: No `<ErrorBoundary>` wraps the component tree. No `<Route path="*" />` catch-all route is registered in `App.jsx`.

5. **History Filter ID Mismatch & Null Render Crash:**
   - In `frontend/src/pages/History.jsx` (lines 70–75): `s.product_name.toLowerCase()` crashes if `product_name` is null.
   - In `frontend/src/pages/History.jsx` (lines 101–106): Filter modes are defined as `['all', 'ป้ายยาตรงๆ', 'ขยี้ปัญหา', 'เปรียบเทียบชัดๆ']`, whereas `CreateScript.jsx` generates modes with IDs like `'ขยี้ปัญหา (PAS Formula)'`, `'นักเล่าเรื่อง (Hook-Story-Offer)'`, etc. Clicking "ขยี้ปัญหา" matches zero records.

6. **Mobile Navbar Navigation Omission:**
   - In `frontend/src/components/Navbar.jsx` (lines 86–89, 104–129): "สร้างสคริปต์" (`/create`) is styled with `hidden sm:block` on the main navbar and is completely omitted from the mobile dropdown menu.

7. **Broken PDPA / Terms Anchor Links:**
   - In `frontend/src/pages/Register.jsx` (lines 120–123): `ฉันยอมรับ <a href="#">เงื่อนไขการให้บริการ</a> และ <a href="#">นโยบายความเป็นส่วนตัว</a>`.

8. **Linter & Test Results:**
   - `npm run lint` produced 12 warnings (including unhandled catch errors, variable access during initialization, and setState in effect).

---

## 2. Logic Chain

1. **From Observation 1 to Vulnerability Assessment**:
   - Because `CreateScript.jsx` renders `block.audio_spoken` using `dangerouslySetInnerHTML`, and `highlightBannedWords` performs raw substring replacement without HTML escaping (`escapeHtml`), any HTML or JavaScript string returned in the payload executes directly in the victim's browser, leading to Stored/Reflected Cross-Site Scripting (XSS).

2. **From Observation 2 to Security Bypass**:
   - Because `String.prototype.includes` checks for substring occurrence anywhere in the URL (including query strings and paths), an attacker can supply arbitrary external domains containing `"shopee"` or `"tiktok"` in the query parameters, bypassing the intended platform whitelist.

3. **From Observation 3 to Performance & Stability Degradation**:
   - Without an `AbortController`, if a user navigates away while `/api/analyze` is streaming chunks, the async generator continues consuming memory and network resources in the background, attempting to call `setTerminalText` on an unmounted component.

4. **From Observation 4 to UX Fragility**:
   - Because React 19 unmounts the entire root component tree upon encountering an uncaught render error, any null reference exception in child components immediately produces a blank white screen with no recovery option.

5. **From Observation 5 & 6 to Broken User Workflows**:
   - A mobile user cannot navigate to `/create` from `/history` or `/settings` because the mobile navbar menu lacks the link.
   - A user attempting to filter history by "ขยี้ปัญหา" receives an empty list due to exact string mismatch between `s.mode` and `filterMode`.

---

## 3. Caveats

- **No Source Code Direct Edits**: In strict compliance with explorer instructions and read-only investigation protocol, no files in `src/` were directly modified. All proposed code patches and blueprints are documented in `analysis.md`.
- **Backend API Boundaries**: Backend edge cases (`functions/api/generate.js`, `create-portal.js`, `webhook.js`) are handled under Track 2 (`teamwork_preview_explorer_be_1`), though frontend integration contracts were fully validated.

---

## 4. Conclusion

The frontend codebase is well-structured and feature-rich, but contains **18 concrete edge cases and vulnerabilities** that must be addressed to achieve 100% production robustness:
- **1 Critical security vulnerability** (`FE-SEC-001` XSS in `CreateScript.jsx`).
- **5 High-severity issues** (`FE-SEC-002`, `FE-SEC-003`, `FE-STATE-001`, `FE-STATE-002`, `FE-ERR-001`, `FE-ERR-002`, `FE-STATE-004`).
- **7 Medium-severity issues** (`FE-STATE-003`, `FE-ERR-003`, `FE-VAL-001`, `FE-VAL-002`, `FE-UX-001`, `FE-UX-002`).
- **5 Low-severity issues** (`FE-ERR-004`, `FE-VAL-003`, `FE-UX-003`, `FE-UX-004`).

Detailed step-by-step remediation instructions with 'why' and 'how' explanations and code snippets are fully compiled in `C:\Auto script\.agents\teamwork_preview_explorer_fe_1\analysis.md`.

---

## 5. Verification Method

To independently verify these findings:
1. **Static Code Inspection**:
   - Inspect `frontend/src/pages/CreateScript.jsx:694` to verify `dangerouslySetInnerHTML` usage.
   - Inspect `frontend/src/pages/CreateScript.jsx:245` to verify `lowerUrl.includes(domain)` validation.
   - Inspect `frontend/src/components/Navbar.jsx:104-129` to verify absence of `/create` link on mobile.
   - Inspect `frontend/src/pages/Register.jsx:121` to verify `href="#"` anchor links.
   - Inspect `frontend/src/pages/History.jsx:101-106` vs `CreateScript.jsx:34-65` to verify mode ID mismatch.
2. **Automated Linter Run**:
   - Command: `cd "C:\Auto script\frontend" && npm run lint`
   - Confirms 12 static warnings regarding unhandled errors and lifecycle dependencies.
3. **Invalidation Conditions**:
   - This audit report is invalidated if `analysis.md` recommendations are implemented (e.g. `highlightBannedWords` escapes HTML, `ErrorBoundary` is wrapped, `AuthContext` is introduced, and mobile navbar contains `/create`).
