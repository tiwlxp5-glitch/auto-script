import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalMockDb } from './helpers/mockDb.js';
import { globalMockGemini } from './helpers/mockGemini.js';
import { globalMockStripe } from './helpers/mockStripe.js';
import { createMockEnv } from './helpers/mockEnv.js';

// Setup Vitest mocks
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => globalMockDb.createClientInstance()
}));

vi.mock('stripe', () => ({
  default: globalMockStripe.createStripeClass()
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: globalMockGemini.createGoogleGenAIClass()
}));

// Import endpoints under test
import { onRequestPost as handleCreatePortal } from '../create-portal.js';
import { onRequestPost as handleGenerate } from '../generate.js';

describe('CHALLENGER AUDIT 2: EMPIRICAL ADVERSARIAL STRESS HARNESS', () => {
  const env = createMockEnv();

  beforeEach(() => {
    globalMockDb.reset();
    globalMockGemini.reset();
    globalMockStripe.reset();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // TASK FOCUS 1: IDOR Exploit Attempts on /api/create-portal
  // =========================================================================
  describe('Focus 1: IDOR Exploit Attempts on /api/create-portal', () => {
    it('EMP-IDOR-1: Discards attacker payload attempting to hijack 10 different customer IDs', async () => {
      const victimCustomerId = 'cus_victim_actual_111';
      const attackerUserId = 'usr_attacker_999';
      const attackerToken = 'jwt_attacker_token';
      const attackerActualCustomerId = 'cus_attacker_own_222';

      globalMockDb.seedUser(attackerUserId, attackerToken);
      globalMockDb.seedProfile(attackerUserId, { stripe_customer_id: attackerActualCustomerId, tier: 'plus' });

      // Attacker attempts passing various IDOR payloads in body
      const idorPayloads = [
        { customerId: victimCustomerId },
        { stripe_customer_id: victimCustomerId },
        { customer: victimCustomerId },
        { customerId: 'cus_admin_000', user_id: 'usr_admin' },
        { id: victimCustomerId },
        { customerId: { $ne: null } }, // NoSQL style injection attempt
        { customerId: ['cus_1', 'cus_2'] },
        { customerId: `'; DROP TABLE profiles; --` }
      ];

      for (const payload of idorPayloads) {
        const req = new Request('http://localhost/api/create-portal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${attackerToken}`
          },
          body: JSON.stringify(payload)
        });

        const res = await handleCreatePortal({ request: req, env });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.url).toContain(attackerActualCustomerId);
        expect(data.url).not.toContain(victimCustomerId);
      }

      // Verify all portal sessions created were strictly for attackerActualCustomerId
      expect(globalMockStripe.portalSessionsCreated.length).toBe(idorPayloads.length);
      for (const session of globalMockStripe.portalSessionsCreated) {
        expect(session.customer).toBe(attackerActualCustomerId);
        expect(session.customer).not.toBe(victimCustomerId);
      }
    });

    it('EMP-IDOR-2: User with NULL or missing stripe_customer_id cannot create portal even if they supply customerId', async () => {
      const freeUserId = 'usr_free_idor_attempt';
      const freeToken = 'jwt_free_token';
      globalMockDb.seedUser(freeUserId, freeToken);
      globalMockDb.seedProfile(freeUserId, { stripe_customer_id: null, tier: 'free' });

      const req = new Request('http://localhost/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeToken}`
        },
        body: JSON.stringify({ customerId: 'cus_stolen_id_123' })
      });

      const res = await handleCreatePortal({ request: req, env });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe('No Stripe customer found for this account');
      expect(globalMockStripe.portalSessionsCreated.length).toBe(0);
    });
  });

  // =========================================================================
  // TASK FOCUS 2: Tier Spoofing on /api/generate
  // =========================================================================
  describe('Focus 2: Tier Spoofing Attempts (targetAudience, productUrl)', () => {
    it('EMP-SPOOF-1: Free tier user passing targetAudience and productUrl has targetAudience stripped and productUrl un-scraped', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      globalMockDb.seedUser('usr_free_spoofer', 'tok_free_spoofer');
      globalMockDb.seedProfile('usr_free_spoofer', { tier: 'free', credits: 5 });

      const req = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer tok_free_spoofer'
        },
        body: JSON.stringify({
          productName: 'กล้องวงจรปิด',
          productDetails: 'ความละเอียด 2K หมุนได้ 360 องศา',
          targetAudience: 'เจ้าของบ้านและคอนโด',
          productUrl: 'https://shopee.co.th/cctv-2k-smart',
          tier: 'pro', // Spoofed client param in body
          credits: 999, // Spoofed client param in body
          mode: 'สายสเปค/ฟังก์ชัน (FAB Formula)',
          videoLength: 'สั้น'
        })
      });

      const res = await handleGenerate({ request: req, env });
      expect(res.status).toBe(200);

      // Verify fetch (Jina AI) was never called
      expect(fetchSpy).not.toHaveBeenCalled();

      // Verify Gemini prompt contents
      const aiPrompt = globalMockGemini.generateCalls[0].contents;
      expect(aiPrompt).not.toContain('เจ้าของบ้านและคอนโด');
      expect(aiPrompt).not.toContain('กลุ่มเป้าหมาย');
      expect(aiPrompt).not.toContain('ข้อมูลเสริมจากการสแกน URL');
    });

    it('EMP-SPOOF-2: Plus tier user gets targetAudience but NOT Jina URL scraping', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      globalMockDb.seedUser('usr_plus_user', 'tok_plus_user');
      globalMockDb.seedProfile('usr_plus_user', { tier: 'plus', credits: 10 });

      const req = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer tok_plus_user'
        },
        body: JSON.stringify({
          productName: 'โคมไฟตั้งโต๊ะ LED',
          productDetails: 'ปรับแสงได้ 3 ระดับ ถนอมสายตา',
          targetAudience: 'นักเรียน นักศึกษา คนอ่านหนังสือ',
          productUrl: 'https://lazada.co.th/led-lamp',
          mode: 'ขยี้ปัญหา (PAS Formula)',
          videoLength: 'สั้น'
        })
      });

      const res = await handleGenerate({ request: req, env });
      expect(res.status).toBe(200);

      // Jina fetch must NOT be called for Plus tier
      expect(fetchSpy).not.toHaveBeenCalled();

      // targetAudience MUST be present for Plus tier
      const aiPrompt = globalMockGemini.generateCalls[0].contents;
      expect(aiPrompt).toContain('- กลุ่มเป้าหมาย: นักเรียน นักศึกษา คนอ่านหนังสือ');
      expect(aiPrompt).not.toContain('ข้อมูลเสริมจากการสแกน URL');
    });

    it('EMP-SPOOF-3: Pro tier user gets BOTH targetAudience AND Jina URL scraping', async () => {
      const originalFetch = global.fetch;
      let fetchedUrl = null;
      global.fetch = async (url) => {
        fetchedUrl = url;
        return new Response('Scraped Content: โหมดถนอมสายตาแสงสีฟ้าต่ำ มาตรฐานเยอรมัน', { status: 200 });
      };

      try {
        globalMockDb.seedUser('usr_pro_legit', 'tok_pro_legit');
        globalMockDb.seedProfile('usr_pro_legit', { tier: 'pro', credits: 20 });

        const req = new Request('http://localhost/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer tok_pro_legit'
          },
          body: JSON.stringify({
            productName: 'โคมไฟตั้งโต๊ะ Pro',
            productDetails: 'ไฟ LED ถนอมสายตา',
            targetAudience: 'กราฟิกดีไซเนอร์',
            productUrl: 'https://lazada.co.th/led-lamp-pro',
            mode: 'สายสเปค/ฟังก์ชัน (FAB Formula)',
            videoLength: 'สั้น'
          })
        });

        const res = await handleGenerate({ request: req, env });
        expect(res.status).toBe(200);

        expect(fetchedUrl).toBe('https://r.jina.ai/https://lazada.co.th/led-lamp-pro');

        const aiPrompt = globalMockGemini.generateCalls[0].contents;
        expect(aiPrompt).toContain('- กลุ่มเป้าหมาย: กราฟิกดีไซเนอร์');
        expect(aiPrompt).toContain('[ข้อมูลสกัดเพิ่มเติมจาก URL]:');
        expect(aiPrompt).toContain('มาตรฐานเยอรมัน');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // =========================================================================
  // TASK FOCUS 3: Fault Injection during Database `scripts.insert`
  // =========================================================================
  describe('Focus 3: Fault Injection during scripts.insert', () => {
    it('EMP-FAULT-1: Script insert DB failure returns 500 and strictly prevents credit deduction', async () => {
      const initialCredits = 15;
      globalMockDb.seedUser('usr_fault_test', 'tok_fault_test');
      globalMockDb.seedProfile('usr_fault_test', { tier: 'plus', credits: initialCredits });

      // Inject failure on scripts.insert
      globalMockDb.failScriptInsert = true;
      globalMockDb.scriptInsertErrorMessage = 'PostgreSQL error: duplicate key or table lock deadlock';

      const req = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer tok_fault_test'
        },
        body: JSON.stringify({
          productName: 'พาวเวอร์แบงค์ 20000mAh',
          productDetails: 'ชาร์จไว รองรับ PD',
          mode: 'ขยี้ปัญหา (PAS Formula)',
          videoLength: 'สั้น'
        })
      });

      const res = await handleGenerate({ request: req, env });
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data.error).toBe('Failed to save script history');

      // VERIFICATION: RPC increment_credits was NEVER executed
      expect(globalMockDb.rpcCalls.length).toBe(0);

      // VERIFICATION: User credits remain exactly the initial value
      const profile = globalMockDb.getProfile('usr_fault_test');
      expect(profile.credits).toBe(initialCredits);
    });

    it('EMP-FAULT-2: RPC deduction failure returns 500', async () => {
      globalMockDb.seedUser('usr_rpc_fail', 'tok_rpc_fail');
      globalMockDb.seedProfile('usr_rpc_fail', { tier: 'free', credits: 5 });

      globalMockDb.failRpc = true;
      globalMockDb.rpcErrorMessage = 'RPC increment_credits execution failed';

      const req = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer tok_rpc_fail'
        },
        body: JSON.stringify({
          productName: 'เมาส์ไร้สาย',
          productDetails: 'คลิกไร้เสียง สบายมือ',
          mode: 'PAS',
          videoLength: 'สั้น'
        })
      });

      const res = await handleGenerate({ request: req, env });
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data.error).toBe('Failed to deduct credits');

      // Script was saved, but RPC failed
      expect(globalMockDb.scripts.length).toBe(1);
    });
  });

  // =========================================================================
  // TASK FOCUS 4: Jina AI Scraping Failures & Timeouts
  // =========================================================================
  describe('Focus 4: Jina AI Scraping Failures / Timeouts Graceful Degradation', () => {
    it('EMP-JINA-1: Jina network timeout throws exception -> caught and script generated successfully', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        throw new Error('Jina service timeout: connection timed out after 10000ms');
      };

      try {
        globalMockDb.seedUser('usr_jina_timeout', 'tok_jina_timeout');
        globalMockDb.seedProfile('usr_jina_timeout', { tier: 'pro', credits: 10 });

        const req = new Request('http://localhost/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer tok_jina_timeout'
          },
          body: JSON.stringify({
            productName: 'หูฟังตัดเสียงรบกวน',
            productDetails: 'ตัดเสียง ANC สบายหู',
            productUrl: 'https://shopee.co.th/anc-headphones',
            mode: 'PAS',
            videoLength: 'สั้น'
          })
        });

        const res = await handleGenerate({ request: req, env });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.script).toBeDefined();
        expect(data.credits_remaining).toBe(9);

        // Verification: Gemini was called with original details without scraping appended
        const prompt = globalMockGemini.generateCalls[0].contents;
        expect(prompt).toContain('ตัดเสียง ANC สบายหู');
        expect(prompt).not.toContain('[ข้อมูลสกัดเพิ่มเติมจาก URL]:');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('EMP-JINA-2: Jina returns HTTP 404 or 503 error status -> degrades gracefully', async () => {
      const originalFetch = global.fetch;
      const errorStatuses = [404, 500, 502, 503, 504];

      try {
        for (let i = 0; i < errorStatuses.length; i++) {
          const status = errorStatuses[i];
          global.fetch = async () => new Response('Error page', { status, ok: false });

          const uid = `usr_jina_status_${i}`;
          const tok = `tok_jina_status_${i}`;
          globalMockDb.seedUser(uid, tok);
          globalMockDb.seedProfile(uid, { tier: 'pro', credits: 5 });

          const req = new Request('http://localhost/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tok}`
            },
            body: JSON.stringify({
              productName: `Product ${i}`,
              productDetails: `Details ${i}`,
              productUrl: 'https://shopee.co.th/product-url',
              mode: 'PAS',
              videoLength: 'สั้น'
            })
          });

          const res = await handleGenerate({ request: req, env });
          expect(res.status).toBe(200);

          const prompt = globalMockGemini.generateCalls[globalMockGemini.generateCalls.length - 1].contents;
          expect(prompt).not.toContain('[ข้อมูลสกัดเพิ่มเติมจาก URL]:');
        }
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // =========================================================================
  // TASK FOCUS 5: Malformed, Expired Tokens & Missing Auth Headers
  // =========================================================================
  describe('Focus 5: Malformed Tokens, Expired Tokens, Missing Auth Headers', () => {
    const endpoints = [
      { name: '/api/create-portal', handler: handleCreatePortal },
      { name: '/api/generate', handler: handleGenerate }
    ];

    it('EMP-AUTH-1: Missing Authorization header returns 401 across endpoints', async () => {
      for (const ep of endpoints) {
        const req = new Request(`http://localhost${ep.name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productName: 'Test' })
        });

        const res = await ep.handler({ request: req, env });
        expect(res.status, `Endpoint ${ep.name} should return 401 on missing auth`).toBe(401);
      }
    });

    it('EMP-AUTH-2: Malformed tokens (not Bearer, invalid syntax, empty token) return 401 across endpoints', async () => {
      const malformedHeaders = [
        'Basic dXNlcjpwYXNz',
        'Digest username="Mufasa"',
        'Token some_token_value',
        'Bearer',
        'Bearer ',
        'Bearer invalid_expired_garbage_jwt',
        'Bearer null',
        'Bearer undefined',
        'Bearer [object Object]'
      ];

      for (const ep of endpoints) {
        for (const authHeader of malformedHeaders) {
          const req = new Request(`http://localhost${ep.name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify({ productName: 'Test' })
          });

          const res = await ep.handler({ request: req, env });
          expect(res.status, `Endpoint ${ep.name} with header "${authHeader}" should return 401`).toBe(401);
        }
      }
    });
  });
});
