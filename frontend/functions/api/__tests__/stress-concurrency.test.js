import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalMockDb } from './helpers/mockDb.js';
import { globalMockStripe } from './helpers/mockStripe.js';
import { globalMockGemini } from './helpers/mockGemini.js';
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
import { onRequestPost as handleWebhook } from '../webhook.js';
import { onRequestPost as handleGenerate } from '../generate.js';
import { onRequestPost as handleCreatePortal } from '../create-portal.js';

describe('EMPIRICAL CONCURRENCY & RACE CONDITION STRESS HARNESS (challenger_audit_1)', () => {
  const env = createMockEnv();

  beforeEach(() => {
    globalMockDb.reset();
    globalMockStripe.reset();
    globalMockGemini.reset();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SUITE 1: MASS CONCURRENT WEBHOOK REPLAY & TOP-UP ATOMICS
  // =========================================================================
  describe('Suite 1: High-Concurrency Webhook Replay & Parallel Top-Ups', () => {
    it('STRESS-1.1: 100 concurrent webhook deliveries with duplicate event ID results in exactly 1 credit grant (+60 for Plus)', async () => {
      const userId = 'usr_mass_replay_100';
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 0 });

      const eventPayload = {
        id: 'evt_mass_replay_100_plus',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_mass_100',
            payment_status: 'paid',
            client_reference_id: userId,
            customer: 'cus_mass_100',
            amount_subtotal: 24900
          }
        }
      };

      const promises = Array.from({ length: 100 }, () => {
        const req = new Request('https://domain/api/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'valid_sig'
          },
          body: JSON.stringify(eventPayload)
        });
        return handleWebhook({ request: req, env });
      });

      const results = await Promise.all(promises);

      // All 100 requests must succeed with HTTP 200
      expect(results.length).toBe(100);
      for (const res of results) {
        expect(res.status).toBe(200);
      }

      // Exactly 1 RPC call executed
      expect(globalMockDb.rpcCalls.length).toBe(1);
      expect(globalMockDb.rpcCalls[0]).toEqual({
        functionName: 'increment_credits',
        args: { p_user_id: userId, p_amount: 60 }
      });

      // Exactly 1 webhook_events entry
      expect(globalMockDb.webhookEvents.size).toBe(1);
      expect(globalMockDb.webhookEvents.has('evt_mass_replay_100_plus')).toBe(true);

      // Final balance strictly 60, not 6000
      const profile = globalMockDb.getProfile(userId);
      expect(profile.credits).toBe(60);
      expect(profile.tier).toBe('plus');
    });

    it('STRESS-1.2: 50 distinct concurrent webhook checkout sessions for the same user accurately accumulate credits without lost updates', async () => {
      const userId = 'usr_parallel_topups_50';
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 10 });

      // 50 Plus (+60 each) = 50 * 60 = 3000 credits added
      const promises = Array.from({ length: 50 }, (_, i) => {
        const eventPayload = {
          id: `evt_distinct_topup_${i}`,
          type: 'checkout.session.completed',
          data: {
            object: {
              id: `cs_distinct_${i}`,
              payment_status: 'paid',
            client_reference_id: userId,
              customer: `cus_distinct_${i}`,
              amount_subtotal: 24900 // Plus: 60 credits
            }
          }
        };

        const req = new Request('https://domain/api/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'valid_sig'
          },
          body: JSON.stringify(eventPayload)
        });

        return handleWebhook({ request: req, env });
      });

      const results = await Promise.all(promises);

      for (const res of results) {
        expect(res.status).toBe(200);
      }

      // Exactly 50 RPC calls
      expect(globalMockDb.rpcCalls.length).toBe(50);
      expect(globalMockDb.webhookEvents.size).toBe(50);

      // Initial 10 + 3000 = 3010
      const profile = globalMockDb.getProfile(userId);
      expect(profile.credits).toBe(3010);
      expect(profile.tier).toBe('plus');
    });
  });

  // =========================================================================
  // SUITE 2: PARALLEL GENERATION & CREDIT DEDUCTION CONCURRENCY
  // =========================================================================
  describe('Suite 2: Parallel Script Generation & Deductions', () => {
    it('STRESS-2.1: 50 concurrent script generation requests from user with 50 credits generate 50 scripts and end at exactly 0 credits', async () => {
      const userId = 'usr_gen_50';
      const token = 'jwt_gen_50';
      globalMockDb.seedUser(userId, token);
      globalMockDb.seedProfile(userId, { tier: 'plus', credits: 50 });

      const promises = Array.from({ length: 50 }, (_, i) => {
        const req = new Request('https://domain/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productName: `Product ${i}`,
            productDetails: `Details for product ${i}`,
            mode: 'ขยี้ปัญหา (PAS Formula)',
            targetAudience: 'กลุ่มผู้ใช้ทั่วไป'
          })
        });
        return handleGenerate({ request: req, env });
      });

      const results = await Promise.all(promises);

      for (const res of results) {
        expect(res.status).toBe(200);
      }

      // 50 Gemini calls, 50 script rows inserted
      // ✅ NEW Credit Ledger: 2 RPC calls per successful generation (start + commit) = 100
      expect(globalMockGemini.generateCalls.length).toBe(50);
      expect(globalMockDb.scripts.length).toBe(50);
      expect(globalMockDb.rpcCalls.length).toBe(100);

      // Final balance strictly 0
      const profile = globalMockDb.getProfile(userId);
      expect(profile.credits).toBe(0);
    });

    it('STRESS-2.2: Parallel requests from user with 0 credits are ALL blocked with 403 before calling AI or DB', async () => {
      const userId = 'usr_zero_burst';
      const token = 'jwt_zero_burst';
      globalMockDb.seedUser(userId, token);
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 0 });

      const promises = Array.from({ length: 30 }, () => {
        const req = new Request('https://domain/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productName: 'Zero Test',
            productDetails: 'Details'
          })
        });
        return handleGenerate({ request: req, env });
      });

      const results = await Promise.all(promises);

      for (const res of results) {
        expect(res.status).toBe(402);
      }

      expect(globalMockGemini.generateCalls.length).toBe(0);
      expect(globalMockDb.scripts.length).toBe(0);
      expect(globalMockDb.rpcCalls.length).toBe(30);
       expect(globalMockDb.getProfile(userId).credits).toBe(0);
    });

    it('STRESS-2.3: Parallel requests from user with negative credits (-5) are ALL blocked with 403', async () => {
      const userId = 'usr_neg_burst';
      const token = 'jwt_neg_burst';
      globalMockDb.seedUser(userId, token);
      globalMockDb.seedProfile(userId, { tier: 'free', credits: -5 });

      const promises = Array.from({ length: 20 }, () => {
        const req = new Request('https://domain/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productName: 'Neg Test',
            productDetails: 'Details'
          })
        });
        return handleGenerate({ request: req, env });
      });

      const results = await Promise.all(promises);

      for (const res of results) {
        expect(res.status).toBe(402);
      }

      expect(globalMockGemini.generateCalls.length).toBe(0);
      expect(globalMockDb.scripts.length).toBe(0);
      expect(globalMockDb.rpcCalls.length).toBe(20);
       expect(globalMockDb.getProfile(userId).credits).toBe(-5);
    });
  });

  // =========================================================================
  // SUITE 3: CONCURRENT MIXED STORM (TOP-UPS + REPLAYS + GENERATIONS)
  // =========================================================================
  describe('Suite 3: Mixed Concurrency Storm', () => {
    it('STRESS-3.1: Interleaved concurrent top-ups, duplicate replays, and generations preserve exact balance invariants', async () => {
      const userId = 'usr_storm_user';
      const token = 'jwt_storm_token';
      globalMockDb.seedUser(userId, token);
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 10 });

      // Action 1: 10 distinct top-ups (+60 each = +600)
      const topUpPromises = Array.from({ length: 10 }, (_, i) => {
        const req = new Request('https://domain/api/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'stripe-signature': 'valid_sig' },
          body: JSON.stringify({
            id: `evt_storm_topup_${i}`,
            type: 'checkout.session.completed',
            data: { object: { id: `cs_s_${i}`, payment_status: 'paid',
            client_reference_id: userId, customer: 'cus_storm', amount_subtotal: 24900 } }
          })
        });
        return handleWebhook({ request: req, env });
      });

      // Action 2: 20 replays of the exact same event (+60 once, 19 skipped)
      const replayPromises = Array.from({ length: 20 }, () => {
        const req = new Request('https://domain/api/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'stripe-signature': 'valid_sig' },
          body: JSON.stringify({
            id: 'evt_storm_replay_single',
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_replay_storm', payment_status: 'paid',
            client_reference_id: userId, customer: 'cus_storm', amount_subtotal: 24900 } }
          })
        });
        return handleWebhook({ request: req, env });
      });

      // Action 3: 5 valid generations (-5 credits)
      const genPromises = Array.from({ length: 5 }, (_, i) => {
        const req = new Request('https://domain/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productName: `Storm Product ${i}`, productDetails: 'Details' })
        });
        return handleGenerate({ request: req, env });
      });

      // Fire all 35 requests concurrently
      const allResults = await Promise.all([...topUpPromises, ...replayPromises, ...genPromises]);

      for (const res of allResults) {
        expect(res.status).toBe(200);
      }

      // Calculation:
      // Initial credits = 10
      // 10 distinct top-ups = +600
      // 1 replay batch = +60
      // 5 generations = -5
      // Expected final credits = 10 + 600 + 60 - 5 = 665
      const profile = globalMockDb.getProfile(userId);
      expect(profile.credits).toBe(665);
      expect(profile.tier).toBe('plus');
      expect(globalMockDb.scripts.length).toBe(5);
      // ✅ NEW: RPC calls = 10 (topups sync_profile_credits) + 1 (replay sync) + 5*2 (gen start+commit) = 21
      expect(globalMockDb.rpcCalls.length).toBe(21);

    });
  });

  // =========================================================================
  // SUITE 4: CREATE-PORTAL CONCURRENT IDOR STRESS
  // =========================================================================
  describe('Suite 4: Create Portal Concurrency & Identity Isolation', () => {
    it('STRESS-4.1: 20 concurrent portal requests with spoofed customer IDs strictly return genuine user customer sessions', async () => {
      const userCount = 10;
      const promises = [];

      for (let i = 0; i < userCount; i++) {
        const uid = `user_portal_stress_${i}`;
        const tok = `tok_portal_stress_${i}`;
        const realCust = `cus_real_${i}`;
        const attackerCust = `cus_spoofed_victim_${i}`;

        globalMockDb.seedUser(uid, tok);
        globalMockDb.seedProfile(uid, { stripe_customer_id: realCust });

        // Request 1: with spoofed payload
        const req1 = new Request('https://domain/api/create-portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
          body: JSON.stringify({ customerId: attackerCust })
        });

        // Request 2: with empty body
        const req2 = new Request('https://domain/api/create-portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
          body: JSON.stringify({})
        });

        promises.push(
          handleCreatePortal({ request: req1, env }).then(async res => {
            const data = await res.json();
            return { status: res.status, url: data.url, expectedCust: realCust };
          }),
          handleCreatePortal({ request: req2, env }).then(async res => {
            const data = await res.json();
            return { status: res.status, url: data.url, expectedCust: realCust };
          })
        );
      }

      const results = await Promise.all(promises);

      expect(results.length).toBe(20);
      for (const res of results) {
        expect(res.status).toBe(200);
        expect(res.url).toContain(res.expectedCust);
      }

      expect(globalMockStripe.portalSessionsCreated.length).toBe(20);
      for (const session of globalMockStripe.portalSessionsCreated) {
        expect(session.customer).not.toContain('spoofed');
      }
    });
  });
});
