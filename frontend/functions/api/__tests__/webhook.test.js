import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalMockDb } from './helpers/mockDb.js';
import { globalMockStripe } from './helpers/mockStripe.js';
import { createMockEnv } from './helpers/mockEnv.js';

// Setup Vitest mocks for modules
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => globalMockDb.createClientInstance()
}));

vi.mock('stripe', () => ({
  default: globalMockStripe.createStripeClass()
}));

// Import the endpoint under test
import { onRequestPost } from '../webhook.js';

describe('R2: POST /api/webhook (Atomic Credit RPC & Webhook Idempotency)', () => {
  const env = createMockEnv();
  const userId = 'usr_payer_uuid_555';
  const customerId = 'cus_stripe_payer_999';

  beforeEach(() => {
    globalMockDb.reset();
    globalMockStripe.reset();

    // Seed existing profile with 5 credits on free tier
    globalMockDb.seedProfile(userId, {
      tier: 'free',
      credits: 5,
      stripe_customer_id: null
    });
  });

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
  // TIER 1: CORE FEATURE BEHAVIOR (R2)
  // =========================================================================

  describe('Tier 1: Core Feature Requirements (R2)', () => {
    it('T1.1: should return 400 Webhook Error when Stripe signature verification fails', async () => {
      globalMockStripe.failSignature = true;
      globalMockStripe.signatureErrorMessage = 'Signature verification failed';

      const request = createWebhookRequest({ id: 'evt_sig_fail_1' }, 'invalid_sig');
      const response = await onRequestPost({ request, env });

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toContain('Webhook Error');
      expect(globalMockDb.rpcCalls.length).toBe(0);
    });

    it('T1.2: should enforce idempotency and return 200 "Already processed" for duplicate event IDs without double-crediting', async () => {
      const eventPayload = {
        id: 'evt_duplicate_test_100',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_100',
            client_reference_id: userId,
            customer: customerId,
            amount_subtotal: 24900 // Plus tier: 60 credits
          }
        }
      };

      // First webhook delivery
      const request1 = createWebhookRequest(eventPayload);
      const response1 = await onRequestPost({ request: request1, env });
      expect(response1.status).toBe(200);

      // Verify first delivery inserted event ID into webhook_events
      expect(globalMockDb.webhookEvents.has('evt_duplicate_test_100')).toBe(true);

      const rpcCountAfterFirst = globalMockDb.rpcCalls.length;
      const creditsAfterFirst = globalMockDb.getProfile(userId).credits;

      // Second webhook delivery with exact same event ID (simulating Stripe retry)
      const request2 = createWebhookRequest(eventPayload);
      const response2 = await onRequestPost({ request: request2, env });
      expect(response2.status).toBe(200);

      const text2 = await response2.text();
      expect(text2).toContain('Already processed');

      // Assert no additional RPC or credit modification occurred on second delivery
      expect(globalMockDb.rpcCalls.length).toBe(rpcCountAfterFirst);
      expect(globalMockDb.getProfile(userId).credits).toBe(creditsAfterFirst);
    });

    it('T1.3: should atomically add 60 credits via RPC and set tier to "plus" for Plus package checkout (24900 satang)', async () => {
      const eventPayload = {
        id: 'evt_plus_purchase_200',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_plus_200',
            client_reference_id: userId,
            customer: customerId,
            amount_subtotal: 24900
          }
        }
      };

      const request = createWebhookRequest(eventPayload);
      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      // Verify RPC function was invoked with correct arguments
      const rpcCall = globalMockDb.rpcCalls.find(c => c.functionName === 'increment_credits');
      expect(rpcCall).toBeDefined();
      expect(rpcCall.args).toEqual({
        user_id: userId,
        amount: 60
      });

      // Verify profile record was updated
      const profile = globalMockDb.getProfile(userId);
      expect(profile.tier).toBe('plus');
      expect(profile.stripe_customer_id).toBe(customerId);
      // Initial 5 + 60 = 65
      expect(profile.credits).toBe(65);
    });

    it('T1.4: should atomically add 150 credits via RPC and set tier to "pro" for Pro package checkout (59000 satang)', async () => {
      const eventPayload = {
        id: 'evt_pro_purchase_300',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_pro_300',
            client_reference_id: userId,
            customer: customerId,
            amount_subtotal: 59000
          }
        }
      };

      const request = createWebhookRequest(eventPayload);
      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      // Verify RPC invocation
      const rpcCall = globalMockDb.rpcCalls.find(c => c.functionName === 'increment_credits');
      expect(rpcCall).toBeDefined();
      expect(rpcCall.args).toEqual({
        user_id: userId,
        amount: 150
      });

      // Verify profile record
      const profile = globalMockDb.getProfile(userId);
      expect(profile.tier).toBe('pro');
      expect(profile.stripe_customer_id).toBe(customerId);
      // Initial 5 + 150 = 155
      expect(profile.credits).toBe(155);
    });

    it('T1.5: should NOT perform JS read-modify-write (credits must be updated via increment_credits RPC only)', async () => {
      const eventPayload = {
        id: 'evt_no_rmw_400',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_no_rmw_400',
            client_reference_id: userId,
            customer: customerId,
            amount_subtotal: 24900
          }
        }
      };

      const request = createWebhookRequest(eventPayload);
      await onRequestPost({ request, env });

      // Check that increment_credits RPC was called
      expect(globalMockDb.rpcCalls.some(c => c.functionName === 'increment_credits')).toBe(true);

      // Verify that profile upsert/update did NOT manually override credits if RPC is used
      // In the correct architecture, credits arithmetic is offloaded to the database RPC
      const profile = globalMockDb.getProfile(userId);
      expect(profile.credits).toBe(65);
    });

    it('T1.6: should delete event ID from webhook_events and return 500 when database error occurs to enable Stripe retry', async () => {
      globalMockDb.failRpc = true;
      globalMockDb.rpcErrorMessage = 'Database write failed due to lock timeout';

      const eventPayload = {
        id: 'evt_db_fail_500',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_fail_500',
            client_reference_id: userId,
            customer: customerId,
            amount_subtotal: 24900
          }
        }
      };

      const request = createWebhookRequest(eventPayload);
      const response = await onRequestPost({ request, env });

      expect(response.status).toBe(500);

      // Verify the event was removed from webhook_events so Stripe can retry
      expect(globalMockDb.webhookEvents.has('evt_db_fail_500')).toBe(false);
      expect(globalMockDb.eventDeletes).toContain('evt_db_fail_500');
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY, CORNER CASES & RESILIENCE
  // =========================================================================

  describe('Tier 2: Boundary & Corner Cases (R2)', () => {
    it('T2.1: should return 500 when required environment variables are missing', async () => {
      const incompleteEnv = {
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        VITE_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'key'
      };

      const request = createWebhookRequest({ id: 'evt_env_missing' });
      const response = await onRequestPost({ request, env: incompleteEnv });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toContain('Missing environment variables');
    });

    it('T2.2: should handle boundary values for amount_subtotal correctly', async () => {
      // Case A: Exactly 59000 (Pro -> 150 credits)
      const reqPro = createWebhookRequest({
        id: 'evt_b_59000',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_1', client_reference_id: userId, customer: customerId, amount_subtotal: 59000 } }
      });
      await onRequestPost({ request: reqPro, env });
      expect(globalMockDb.getProfile(userId).tier).toBe('pro');

      // Reset
      globalMockDb.reset();
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 0 });

      // Case B: 58999 (Plus -> 60 credits)
      const reqPlus = createWebhookRequest({
        id: 'evt_b_58999',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_2', client_reference_id: userId, customer: customerId, amount_subtotal: 58999 } }
      });
      await onRequestPost({ request: reqPlus, env });
      expect(globalMockDb.getProfile(userId).tier).toBe('plus');
      expect(globalMockDb.getProfile(userId).credits).toBe(60);

      // Reset
      globalMockDb.reset();
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 0 });

      // Case C: 0 (100% coupon applied -> Plus 60 credits)
      const reqZero = createWebhookRequest({
        id: 'evt_b_0',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_3', client_reference_id: userId, customer: customerId, amount_subtotal: 0 } }
      });
      await onRequestPost({ request: reqZero, env });
      expect(globalMockDb.getProfile(userId).tier).toBe('plus');
      expect(globalMockDb.getProfile(userId).credits).toBe(60);
    });

    it('T2.3: should safely handle session without client_reference_id without throwing uncaught errors', async () => {
      const req = createWebhookRequest({
        id: 'evt_no_client_ref',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_external', customer: 'cus_ext', amount_subtotal: 24900 } }
      });

      const response = await onRequestPost({ request: req, env });
      expect(response.status).toBe(200);
      expect(globalMockDb.rpcCalls.length).toBe(0);
    });

    it('T2.4: should acknowledge other non-checkout Stripe events with 200 { received: true }', async () => {
      const nonCheckoutEvents = [
        { id: 'evt_nc_1', type: 'payment_intent.succeeded', data: { object: {} } },
        { id: 'evt_nc_2', type: 'customer.subscription.deleted', data: { object: {} } },
        { id: 'evt_nc_3', type: 'charge.refunded', data: { object: {} } }
      ];

      for (const evt of nonCheckoutEvents) {
        const req = createWebhookRequest(evt);
        const res = await onRequestPost({ request: req, env });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ received: true });
      }
    });

    it('T2.5: should handle concurrent simulated webhook arrivals without race condition lost updates', async () => {
      // Simulate 2 distinct checkout events arriving concurrently
      const event1 = {
        id: 'evt_concurrent_1',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_c1', client_reference_id: userId, customer: customerId, amount_subtotal: 24900 } }
      };
      const event2 = {
        id: 'evt_concurrent_2',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_c2', client_reference_id: userId, customer: customerId, amount_subtotal: 24900 } }
      };

      const [res1, res2] = await Promise.all([
        onRequestPost({ request: createWebhookRequest(event1), env }),
        onRequestPost({ request: createWebhookRequest(event2), env })
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Initial credits was 5. +60 and +60 -> Total must be exactly 125
      const profile = globalMockDb.getProfile(userId);
      expect(profile.credits).toBe(125);
      expect(globalMockDb.rpcCalls.filter(c => c.functionName === 'increment_credits').length).toBe(2);
    });
  });
});
