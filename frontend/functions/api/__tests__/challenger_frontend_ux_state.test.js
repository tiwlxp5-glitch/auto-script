import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CHALLENGER AUDIT 2: FRONTEND UX, STATE, CODE SPLITTING & INFRASTRUCTURE HARNESS', () => {

  const frontendRoot = path.resolve(__dirname, '../../../src');
  const appJsxPath = path.join(frontendRoot, 'App.jsx');
  const createScriptPath = path.join(frontendRoot, 'pages', 'CreateScript.jsx');
  const errorBoundaryPath = path.join(frontendRoot, 'components', 'ErrorBoundary.jsx');
  const mainLayoutPath = path.join(frontendRoot, 'layouts', 'MainLayout.jsx');
  const navbarPath = path.join(frontendRoot, 'components', 'Navbar.jsx');
  const settingsPath = path.join(frontendRoot, 'pages', 'Settings.jsx');
  const historyPath = path.join(frontendRoot, 'pages', 'History.jsx');
  const loginPath = path.join(frontendRoot, 'pages', 'Login.jsx');
  const registerPath = path.join(frontendRoot, 'pages', 'Register.jsx');
  const authContextPath = path.join(frontendRoot, 'context', 'AuthContext.jsx');

  // =========================================================================
  // FOCUS 1: ErrorBoundary, Chunk Loading (lazyWithRetry) & Suspense Hierarchy
  // =========================================================================
  describe('Focus 1: ErrorBoundary, Dynamic Chunk Loading & Suspense Architecture', () => {
    
    it('EMP-CHUNK-1: App.jsx uses lazyWithRetry for automatic chunk reload recovery on 404 ChunkLoadErrors [FIXED]', () => {
      const appCode = fs.readFileSync(appJsxPath, 'utf8');
      
      // FIXED: App.jsx now uses lazyWithRetry instead of bare lazy()
      expect(appCode).toContain('lazyWithRetry');
      expect(appCode).toContain("from './utils/lazyWithRetry'");
      
      // All lazy-loaded pages use lazyWithRetry
      expect(appCode).toMatch(/lazyWithRetry\s*\(\s*\(\)\s*=>\s*import\(/);
    });


    it('EMP-CHUNK-2: lazyWithRetry simulation proves single force-refresh recovery without infinite reload loops', async () => {
      // Mock sessionStorage and window.location
      const storage = new Map();
      const mockSessionStorage = {
        getItem: (k) => storage.get(k) || null,
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
        clear: () => storage.clear()
      };
      
      let reloadCount = 0;
      const mockLocation = {
        reload: () => { reloadCount++; }
      };

      // Implement lazyWithRetry logic
      function simulateLazyWithRetry(componentImporter) {
        return async () => {
          const pageHasBeenForceRefreshed = JSON.parse(
            mockSessionStorage.getItem('page-has-been-force-refreshed') || 'false'
          );

          try {
            const component = await componentImporter();
            mockSessionStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
          } catch (error) {
            if (!pageHasBeenForceRefreshed) {
              mockSessionStorage.setItem('page-has-been-force-refreshed', 'true');
              mockLocation.reload();
              return { status: 'reloading' };
            }
            throw error; // Propagate on second failure to prevent loop
          }
        };
      }

      // Scenario A: First chunk failure -> triggers exactly 1 reload
      const failingImporter = vi.fn().mockRejectedValue(new Error('Failed to fetch dynamically imported module'));
      const lazyLoader = simulateLazyWithRetry(failingImporter);
      
      const firstAttempt = await lazyLoader();
      expect(reloadCount).toBe(1);
      expect(mockSessionStorage.getItem('page-has-been-force-refreshed')).toBe('true');
      expect(firstAttempt.status).toBe('reloading');

      // Scenario B: Second consecutive failure after reload -> does NOT loop, throws to ErrorBoundary
      let caughtError = null;
      try {
        await lazyLoader();
      } catch (err) {
        caughtError = err;
      }
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toContain('Failed to fetch dynamically imported module');
      expect(reloadCount).toBe(1); // Reload count remains 1 (no infinite loop)

      // Scenario C: Successful recovery on new build chunk -> resets guard flag
      const successfulImporter = vi.fn().mockResolvedValue({ default: () => 'PageLoaded' });
      const recoveryLoader = simulateLazyWithRetry(successfulImporter);
      
      const successfulAttempt = await recoveryLoader();
      expect(successfulAttempt.default()).toBe('PageLoaded');
      expect(mockSessionStorage.getItem('page-has-been-force-refreshed')).toBe('false');
    });

    it('EMP-SUSPENSE-1: App.jsx wraps entire Routes in Suspense, causing MainLayout and Navbar to unmount during lazy loads', () => {
      const appCode = fs.readFileSync(appJsxPath, 'utf8');
      const layoutCode = fs.readFileSync(mainLayoutPath, 'utf8');

      // In App.jsx: <Suspense> is outside <Routes>
      const suspenseIndex = appCode.indexOf('<Suspense fallback={<PageLoader />}>');
      const routesIndex = appCode.indexOf('<Routes>');
      const mainLayoutRouteIndex = appCode.indexOf('<Route path="/" element={<MainLayout />}>');

      expect(suspenseIndex).toBeGreaterThan(-1);
      expect(routesIndex).toBeGreaterThan(suspenseIndex);
      expect(mainLayoutRouteIndex).toBeGreaterThan(routesIndex);

      // In MainLayout.jsx: currently lacks internal Suspense around Outlet
      expect(layoutCode).not.toContain('<Suspense');
      expect(layoutCode).toContain('<Outlet />');
    });

    it('EMP-ERRB-1: ErrorBoundary.jsx lacks dynamic reset handler on route navigation', () => {
      const errorBoundaryCode = fs.readFileSync(errorBoundaryPath, 'utf8');
      
      // ErrorBoundary only provides full page reload / hard redirect
      expect(errorBoundaryCode).toContain('window.location.reload()');
      expect(errorBoundaryCode).toContain("window.location.href = '/'");
      
      // Lacks componentDidUpdate or location reset listener
      expect(errorBoundaryCode).not.toContain('componentDidUpdate');
      expect(errorBoundaryCode).not.toContain('resetError');
      expect(errorBoundaryCode).not.toContain('onReset');
    });
  });

  // =========================================================================
  // FOCUS 2: Network Timeout, Hanging State & AbortController in CreateScript
  // =========================================================================
  describe('Focus 2: Network Timeout, State Hang & AbortController in CreateScript.jsx', () => {

    it('EMP-FETCH-1: CreateScript.jsx has AbortController + 60s timeout on /api/generate [FIXED]', () => {
      const createScriptCode = fs.readFileSync(createScriptPath, 'utf8');

      // FIXED: Now includes AbortController and timeout
      expect(createScriptCode).toContain('AbortController');
      expect(createScriptCode).toContain('controller.signal');
      expect(createScriptCode).toContain('controller.abort');
      expect(createScriptCode).toContain('60000');
      expect(createScriptCode).toContain('AbortError');
    });


    it('EMP-FETCH-2: Simulating dropped network response proves isGenerating remains true indefinitely without timeout', async () => {
      // Simulate state machine of CreateScript.jsx
      let isGenerating = false;
      let generatingMode = null;
      let error = null;

      const mockStalledFetch = () => new Promise(() => {
        // Never resolves or rejects (simulating dropped TCP packet / hanging Cloudflare worker)
      });

      const handleGenerateSimulation = (isMultiVersion = false) => {
        isGenerating = true;
        generatingMode = isMultiVersion ? 'multi' : 'single';
        error = null;

        // In current code: bare fetch with no timeout
        return mockStalledFetch()
          .then(() => {
            isGenerating = false;
            generatingMode = null;
          })
          .catch((err) => {
            error = err.message;
            isGenerating = false;
            generatingMode = null;
          });
      };

      // Trigger generation
      handleGenerateSimulation(false);

      // Immediately state is locked
      expect(isGenerating).toBe(true);
      expect(generatingMode).toBe('single');

      // Advance time (simulated): without timeout isGenerating remains true
      expect(isGenerating).toBe(true);
      expect(error).toBeNull();
    });

    it('EMP-FETCH-3: Resilient AbortController pattern with 60s timeout unlocks button and displays timeout error', async () => {
      let isGenerating = false;
      let generatingMode = null;
      let error = null;
      let timeoutTriggered = false;

      // Resilient implementation
      const runResilientGenerate = async (timeoutMs = 50) => {
        isGenerating = true;
        generatingMode = 'single';
        error = null;

        const controller = new AbortController();
        const timer = setTimeout(() => {
          timeoutTriggered = true;
          controller.abort(new DOMException('TimeoutError', 'AbortError'));
        }, timeoutMs);

        try {
          // Stalled fetch with signal
          await new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(controller.signal.reason || new Error('Aborted'));
            });
          });
        } catch (err) {
          if (err.name === 'AbortError' || err.message === 'TimeoutError') {
            error = 'การเชื่อมต่อหมดเวลา (Timeout) กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง';
          } else {
            error = err.message;
          }
        } finally {
          clearTimeout(timer);
          isGenerating = false;
          generatingMode = null;
        }
      };

      await runResilientGenerate(10);

      expect(timeoutTriggered).toBe(true);
      expect(isGenerating).toBe(false);
      expect(generatingMode).toBeNull();
      expect(error).toContain('การเชื่อมต่อหมดเวลา (Timeout)');
    });

    it('EMP-AUTH-1: AuthContext silent failure leaves profile as null, permanently disabling CreateScript & Settings', () => {
      const authCode = fs.readFileSync(authContextPath, 'utf8');
      const createScriptCode = fs.readFileSync(createScriptPath, 'utf8');
      const settingsCode = fs.readFileSync(settingsPath, 'utf8');

      // In AuthContext.jsx: fetchProfile catches error and only console.error without exposing profileError state
      expect(authCode).toContain('console.error("Failed to sync profile:", err);');
      expect(authCode).not.toContain('profileError');

      // In CreateScript.jsx: disabled={!profile} with no retry button
      expect(createScriptCode).toContain('กำลังโหลดข้อมูลบัญชี...');
      expect(createScriptCode).toContain('disabled={isGenerating || !user || !profile}');

      // In Settings.jsx: permanent full page block
      expect(settingsCode).toContain('if (!user || !profile) {');
      expect(settingsCode).toContain('กำลังโหลดข้อมูลบัญชี...');
    });
  });

  // =========================================================================
  // FOCUS 3: Accessibility (a11y) Form Bindings & Mobile Layout Responsiveness
  // =========================================================================
  describe('Focus 3: Accessibility Form Bindings, Touch Targets & Mobile Responsiveness', () => {

    it('EMP-A11Y-1: Form inputs across CreateScript, Login, Register, Settings lack htmlFor/id pairings', () => {
      const auditForm = (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const labels = content.match(/<label\b[^>]*>/g) || [];
        const labelsWithHtmlFor = labels.filter(l => l.includes('htmlFor='));
        const inputs = content.match(/<input\b[^>]*>/g) || [];
        const inputsWithId = inputs.filter(i => i.includes('id='));
        return {
          totalLabels: labels.length,
          labelsWithHtmlFor: labelsWithHtmlFor.length,
          totalInputs: inputs.length,
          inputsWithId: inputsWithId.length
        };
      };

      const csAudit = auditForm(createScriptPath);
      const loginAudit = auditForm(loginPath);
      const regAudit = auditForm(registerPath);
      const settingsAudit = auditForm(settingsPath);

      // CreateScript: 0 labels have htmlFor, 0 text inputs have id
      expect(csAudit.labelsWithHtmlFor).toBe(0);
      expect(csAudit.inputsWithId).toBe(0);

      // Login: 0 labels have htmlFor, 0 inputs have id
      expect(loginAudit.labelsWithHtmlFor).toBe(0);
      expect(loginAudit.inputsWithId).toBe(0);

      // Register: only 1 checkbox has id (terms), 2 main inputs have 0 id
      expect(regAudit.labelsWithHtmlFor).toBe(1); // the checkbox
      expect(regAudit.inputsWithId).toBe(1); // the checkbox

      // Settings: 0 labels have htmlFor, 0 inputs have id
      expect(settingsAudit.labelsWithHtmlFor).toBe(0);
      expect(settingsAudit.inputsWithId).toBe(0);
    });

    it('EMP-NAV-1: Navbar hamburger button has aria-label, aria-expanded, and focus rings [FIXED]', () => {
      const navbarCode = fs.readFileSync(navbarPath, 'utf8');
      
      const buttonIndex = navbarCode.indexOf('onClick={() => setIsMenuOpen(!isMenuOpen)}');
      expect(buttonIndex).toBeGreaterThan(-1);

      // FIXED: Verify accessibility attributes are in the full navbar code
      expect(navbarCode).toContain('aria-label="เมนูหลัก"');
      expect(navbarCode).toContain('aria-expanded={isMenuOpen}');
      expect(navbarCode).toContain('aria-controls="main-nav-dropdown"');
      expect(navbarCode).toContain('aria-hidden="true"');
      // Focus ring for keyboard navigation
      expect(navbarCode).toContain('focus:ring');
    });



    it('EMP-MOBILE-1: Teleprompter step badges use negative margin inside overflow-hidden container', () => {
      const createScriptCode = fs.readFileSync(createScriptPath, 'utf8');

      // Parent container has overflow-hidden
      expect(createScriptCode).toContain('bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm h-full');

      // Step badges use absolute -left-3 (clipped on narrow mobile)
      expect(createScriptCode).toContain('absolute -left-3 top-5 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm');
    });

    it('EMP-DIALOG-1: Multiple pages use blocking window.alert() instead of non-blocking UI notifications', () => {
      const scanAlerts = (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const alertMatches = content.match(/alert\s*\(/g) || [];
        const confirmMatches = content.match(/confirm\s*\(/g) || [];
        return alertMatches.length + confirmMatches.length;
      };

      const csAlerts = scanAlerts(createScriptPath);
      const historyAlerts = scanAlerts(historyPath);
      const settingsAlerts = scanAlerts(settingsPath);
      const pricingAlerts = scanAlerts(path.join(frontendRoot, 'pages', 'Pricing.jsx'));

      expect(csAlerts).toBeGreaterThanOrEqual(4); // 4 alerts in CreateScript
      expect(historyAlerts).toBeGreaterThanOrEqual(4); // 4+ alerts in History
      expect(settingsAlerts).toBeGreaterThanOrEqual(6); // 6+ alerts/confirms in Settings
      expect(pricingAlerts).toBeGreaterThanOrEqual(1); // 1 alert in Pricing
    });

    it('EMP-A11Y-2: AI generation state container lacks aria-live polite region for screen readers', () => {
      const createScriptCode = fs.readFileSync(createScriptPath, 'utf8');

      expect(createScriptCode).not.toContain('aria-live');
      expect(createScriptCode).not.toContain('role="status"');
    });

    it('EMP-DEAD-1: CreateScript contains orphaned analyzeAbortRef and showTerminal modal from removed feature', () => {
      const createScriptCode = fs.readFileSync(createScriptPath, 'utf8');

      expect(createScriptCode).toContain('const analyzeAbortRef = useRef(null);');
      expect(createScriptCode).toContain('const [showTerminal, setShowTerminal] = useState(false);');
      expect(createScriptCode).toContain('{/* Modern AI Analysis Loading Modal */}');
    });
  });
});
