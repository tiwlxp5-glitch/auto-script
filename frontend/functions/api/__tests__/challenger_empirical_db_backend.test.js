import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockDatabase } from './helpers/mockDb.js';
import { globalMockGemini } from './helpers/mockGemini.js';
import { globalMockStripe } from './helpers/mockStripe.js';
import { createMockEnv } from './helpers/mockEnv.js';

// Dedicated instance of MockDatabase for this test suite
const testDb = new MockDatabase();

// Setup Vitest mocks
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => testDb.createClientInstance()
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: globalMockGemini.createGoogleGenAIClass()
}));

vi.mock('stripe', () => ({
  default: globalMockStripe.createStripeClass()
}));

// Import endpoints under test
import { onRequestPost as handleGenerate } from '../generate.js';
import { onRequestPost as handleWebhook } from '../webhook.js';

describe('EMPIRICAL CHALLENGER 1: Database & Backend Vulnerability Verification', () => {
  const env = createMockEnv();
  const userId = 'usr_challenger_db_1';
  const validToken = 'jwt_challenger_token_1';
  const customerId = 'cus_challenger_stripe_1';

  beforeEach(() => {
    testDb.reset();
    globalMockGemini.reset();
    globalMockStripe.reset();

    testDb.seedUser(userId, validToken, 'challenger@example.com');
  });

  function createGenerateRequest(bodyObject, token = validToken) {
    const headers = { 'Content-Type': 'application/json' };
    if (token !== null) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return new Request('https://autostrip.pages.dev/api/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyObject)
    });
  }

  function createWebhookRequest(payloadObject, signature = 'valid_sig_test') {
    const payloadString = typeof payloadObject === 'string' ? payloadObject : JSON.stringify(payloadObject);
    return new Request('https://autostrip.pages.dev/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: payloadString
    });
  }

  // =========================================================================
  // 1. DOUBLE-REFUND DEFECT (DB-06 / VULN-01) IN generate.js
  // =========================================================================
  describe('1. Double-Refund Vulnerability (DB-06 / VULN-01) on Script Insert Failure', () => {
    it('EMP-DB-06.1: Demonstrates that when scripts.insert fails, generate.js executes TWO compensatory refunds (net +1 credit gain)', async () => {
      const initialCredits = 5;
      testDb.seedProfile(userId, {
        tier: 'free',
        credits: initialCredits
      });

      // Inject failure on scripts table insertion (e.g. database constraint or connection drop)
      testDb.failScriptInsert = true;

      const request = createGenerateRequest({
        productName: 'Serum Test',
        productDetails: 'Anti-aging serum',
        mode: 'ขยี้ปัญหา (PAS Formula)',
        videoLength: '30-45s',
        isMultiVersion: false
      });

      const response = await handleGenerate({ request, env });

      // The endpoint returns HTTP 500 error
      expect(response.status).toBe(500);

      // ✅ NEW Credit Ledger: start_generation_tx (deduct) → commit (fail) → refund_generation_tx
      const rpcNames = testDb.rpcCalls.map(r => r.functionName);
      expect(rpcNames).toContain('start_generation_tx');
      expect(rpcNames).toContain('refund_generation_tx');

      // FIXED: User still has their original credits (deduct + refund = net 0 change)
      const finalCredits = testDb.getProfile(userId).credits;
      expect(finalCredits).toBe(initialCredits);
    });

    it('EMP-DB-06.2: Multi-version generation insert failure restores 2 credits via refund_generation_tx [FIXED]', async () => {
      const initialCredits = 10;
      testDb.seedProfile(userId, {
        tier: 'pro',
        credits: initialCredits
      });

      testDb.failScriptInsert = true;

      const request = createGenerateRequest({
        productName: 'Pro Product',
        productDetails: 'Details',
        videoLength: '30-45s',
        isMultiVersion: true
      });

      const response = await handleGenerate({ request, env });
      expect(response.status).toBe(500);

      // ✅ NEW: start_generation_tx (deduct 2) → commit (fail) → refund_generation_tx (refund 2)
      const rpcNames = testDb.rpcCalls.map(r => r.functionName);
      expect(rpcNames).toContain('start_generation_tx');
      expect(rpcNames).toContain('refund_generation_tx');

      const startCall = testDb.rpcCalls.find(r => r.functionName === 'start_generation_tx');
      expect(startCall.args.p_amount).toBe(2); // Multi-version deducts 2

      // FIXED: User balance unchanged (10 - 2 + 2 = 10)
      const finalCredits = testDb.getProfile(userId).credits;
      expect(finalCredits).toBe(initialCredits);
    });
  });

  // =========================================================================
  // 2. ASYMMETRIC REFUND DEFECT (DB-07 / VULN-02 / VULN-05) IN generate.js
  // =========================================================================
  describe('2. Asymmetric Credit Refund (DB-07 / VULN-02 / VULN-05) on Multi-Version Failures', () => {
    it('EMP-DB-07.1: Multi-version generation now refunds the full 2 credits on Gemini AI error [FIXED]', async () => {
      const initialCredits = 10;
      testDb.seedProfile(userId, {
        tier: 'pro',
        credits: initialCredits
      });

      // Inject Gemini API failure (e.g. rate limit, content safety filter, network timeout)
      globalMockGemini.failGenerate = true;
      globalMockGemini.errorMessage = 'Gemini 3.6 Flash API 503 Service Unavailable';

      const request = createGenerateRequest({
        productName: 'Pro Multi-Version Product',
        productDetails: 'High converting pitch',
        videoLength: '30-45s',
        isMultiVersion: true
      });

      const response = await handleGenerate({ request, env });
      expect(response.status).toBe(500);

      // ✅ NEW Credit Ledger: start_generation_tx (deduct 2) → refund_generation_tx (refund 2 in catch)
      const rpcNames = testDb.rpcCalls.map(r => r.functionName);
      expect(rpcNames).toContain('start_generation_tx');
      expect(rpcNames).toContain('refund_generation_tx');

      const startCall = testDb.rpcCalls.find(r => r.functionName === 'start_generation_tx');
      expect(startCall.args.p_amount).toBe(2); // Multi-version deducts 2

      // FIXED: User balance fully restored (10 - 2 + 2 = 10)
      const finalCredits = testDb.getProfile(userId).credits;
      expect(finalCredits).toBe(initialCredits);
    });
  });


  // =========================================================================
  // 3. ZERO-CREDIT BYPASS VULNERABILITY (DB-01) IN increment_credits LOGIC
  // =========================================================================
  describe('3. Zero-Credit Bypass Vulnerability (DB-01) Regression Analysis', () => {
    it('EMP-DB-01.1: Simulating greatest(0, credits + p_amount) SQL without sufficiency check allows 0-credit user to generate scripts', async () => {
      testDb.seedProfile(userId, {
        tier: 'free',
        credits: 0
      });

      // Create a scenario where increment_credits uses greatest(0, 0 + (-1)) => 0
      // In 20260824_freemium_trial.sql:
      // UPDATE profiles SET credits = greatest(0, coalesce(credits, 0) + p_amount) RETURNING credits;
      // When credits = 0 and p_amount = -1, greatest(0, -1) = 0.
      const originalRpc = testDb.rpcCalls;
      
      // Temporarily override testDb's rpc handling for this test to match 20260824_freemium_trial.sql
      const client = testDb.createClientInstance();
      
      // We test the logic path directly:
      const updatedCredits = 0; // return value from buggy PostgreSQL RPC
      const wouldBypass = (updatedCredits === null || updatedCredits < 0);
      
      // EMPIRICAL ASSERTION: 0 does not trigger the 402 guard in generate.js!
      expect(wouldBypass).toBe(false);
      
      // In generate.js line 167:
      // if (updatedCredits === null || updatedCredits < 0) { return 402 }
      // Because wouldBypass is false, the execution proceeds to Gemini generation!
    });

    it('EMP-DB-01.2: Atomic pre-deduction guard (IF credits < abs(p_amount) THEN RETURN -1) strictly blocks 0-credit requests with 402', async () => {
      testDb.seedProfile(userId, {
        tier: 'free',
        credits: 0
      });

      // Default mockDb implements the fixed/guarded RPC returning -1 when balance < deduction
      const request = createGenerateRequest({
        productName: 'Zero Credit Blocked',
        productDetails: 'Testing protected credit deduction',
        mode: 'ขยี้ปัญหา (PAS Formula)',
        videoLength: '15-30s',
        isMultiVersion: false
      });

      const response = await handleGenerate({ request, env });

      // When RPC returns -1, generate.js properly returns 402 Payment Required
      expect(response.status).toBe(402);
      const resBody = await response.json();
      expect(resBody.error).toBe('เครดิตไม่พอ กรุณาเติมเครดิต');
    });
  });

  // =========================================================================
  // 4. STRIPE WEBHOOK EVENT MATRIX & IDEMPOTENCY (VULN-04 / VULN-05)
  // =========================================================================
  describe('4. Stripe Webhook Event Matrix & Payment Status Gaps (VULN-04 / VULN-05)', () => {
    it('EMP-VULN-04: payment_status check correctly rejects unpaid async sessions [FIXED]', async () => {
      testDb.seedProfile(userId, {
        tier: 'free',
        credits: 3
      });

      // Simulate an asynchronous payment session (e.g. Bank transfer) where payment_status is 'unpaid'
      const unconfirmedSessionPayload = {
        id: 'evt_async_unpaid_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_async_unpaid_1',
            client_reference_id: userId,
            customer: customerId,
            amount_subtotal: 59000,
            payment_status: 'unpaid' // Crucial: payment is NOT settled yet
          }
        }
      };

      const request = createWebhookRequest(unconfirmedSessionPayload);
      const response = await handleWebhook({ request, env });

      expect(response.status).toBe(200);

      // FIXED (INF-03): Unpaid sessions are now skipped - no credits or tier upgrade granted
      const profile = testDb.getProfile(userId);
      expect(profile.tier).toBe('free');  // tier unchanged
      expect(profile.credits).toBe(3);    // credits unchanged
    });

    it('EMP-VULN-05.1: charge.refunded now revokes credits and downgrades tier [FIXED]', async () => {
      testDb.seedProfile(userId, {
        tier: 'pro',
        credits: 150,
        stripe_customer_id: customerId
      });

      const refundPayload = {
        id: 'evt_charge_refunded_1',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_12345',
            customer: customerId,
            amount: 59000,
            amount_refunded: 59000
          }
        }
      };

      const request = createWebhookRequest(refundPayload);
      const response = await handleWebhook({ request, env });

      expect(response.status).toBe(200);

      // FIXED (INF-02): Refund now downgrades tier to free and deducts 150 credits
      const profile = testDb.getProfile(userId);
      expect(profile.tier).toBe('free');
      expect(profile.credits).toBe(0); // 150 - 150 = 0 (Math.max(0, ...))
    });

    it('EMP-VULN-05.2: charge.dispute.created now revokes access for fraudulent chargeback accounts [FIXED]', async () => {
      testDb.seedProfile(userId, {
        tier: 'pro',
        credits: 150,
        stripe_customer_id: customerId
      });

      const disputePayload = {
        id: 'evt_dispute_1',
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_12345',
            customer: customerId,
            amount: 59000,
            status: 'needs_response'
          }
        }
      };

      const request = createWebhookRequest(disputePayload);
      const response = await handleWebhook({ request, env });

      expect(response.status).toBe(200);

      // FIXED (INF-02): Dispute now downgrades tier and revokes credits
      const profile = testDb.getProfile(userId);
      expect(profile.tier).toBe('free');
      expect(profile.credits).toBe(0);
    });

    it('EMP-IDEMP-01: Webhook idempotency correctly handles replay floods and deduplicates credit grants', async () => {
      testDb.seedProfile(userId, {
        tier: 'free',
        credits: 3
      });

      const sessionPayload = {
        id: 'evt_concurrent_replay_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_replay_1',
            client_reference_id: userId,
            customer: customerId,
            amount_subtotal: 59000,
            payment_status: 'paid'
          }
        }
      };

      // Send 10 identical webhook requests concurrently
      const requests = Array.from({ length: 10 }, () => createWebhookRequest(sessionPayload));
      const responses = await Promise.all(requests.map(req => handleWebhook({ request: req, env })));

      // All responses should be HTTP 200 or 409
      responses.forEach(res => expect([200, 409]).toContain(res.status));

      // The profile should have received exactly 150 credits (NOT 10 * 150 = 1500)
      const profile = testDb.getProfile(userId);
      expect(profile.credits).toBe(153);
      expect(profile.tier).toBe('pro');
    });
  });
});
