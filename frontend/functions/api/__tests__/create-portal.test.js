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
import { onRequestPost } from '../create-portal.js';

describe('R1: POST /api/create-portal (IDOR & JWT Authentication)', () => {
  const env = createMockEnv();
  const userId = 'usr_test_victim_123';
  const validToken = 'valid_jwt_token_for_victim';
  const legitimateCustomerId = 'cus_legit_victim_999';

  beforeEach(() => {
    globalMockDb.reset();
    globalMockStripe.reset();

    // Seed database with authenticated user and profile
    globalMockDb.seedUser(userId, validToken, 'victim@example.com');
    globalMockDb.seedProfile(userId, {
      stripe_customer_id: legitimateCustomerId,
      tier: 'plus',
      credits: 60
    });
  });

  // =========================================================================
  // TIER 1: CORE FEATURE BEHAVIOR
  // =========================================================================

  describe('Tier 1: Core Feature Requirements (R1)', () => {
    it('T1.1: should return 401 Unauthorized when Authorization header is missing', async () => {
      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: legitimateCustomerId })
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(globalMockStripe.portalSessionsCreated.length).toBe(0);
    });

    it('T1.2: should return 401 Unauthorized when token is invalid or expired', async () => {
      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid_or_expired_jwt'
        },
        body: JSON.stringify({})
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(globalMockStripe.portalSessionsCreated.length).toBe(0);
    });

    it('T1.3: should eliminate IDOR by ignoring client-provided customerId and using database stripe_customer_id', async () => {
      const attackerControlledCustomerId = 'cus_attacker_target_888';

      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({ customerId: attackerControlledCustomerId })
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('url');
      expect(body.url).toContain(legitimateCustomerId);
      expect(body.url).not.toContain(attackerControlledCustomerId);

      // Verify Stripe API was called with authentic DB customer ID, NOT the attacker customer ID
      expect(globalMockStripe.portalSessionsCreated.length).toBe(1);
      expect(globalMockStripe.portalSessionsCreated[0].customer).toBe(legitimateCustomerId);
      expect(globalMockStripe.portalSessionsCreated[0].customer).not.toBe(attackerControlledCustomerId);
    });

    it('T1.4: should return 400 Bad Request when authenticated user has no stripe_customer_id', async () => {
      const freeUserId = 'usr_free_no_stripe_456';
      const freeToken = 'jwt_free_no_stripe';
      globalMockDb.seedUser(freeUserId, freeToken);
      globalMockDb.seedProfile(freeUserId, { stripe_customer_id: null, tier: 'free', credits: 3 });

      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeToken}`
        },
        body: JSON.stringify({})
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(globalMockStripe.portalSessionsCreated.length).toBe(0);
    });

    it('T1.5: should return 404 or error when user profile does not exist in database', async () => {
      const ghostUserId = 'usr_ghost_789';
      const ghostToken = 'jwt_ghost_token';
      globalMockDb.seedUser(ghostUserId, ghostToken);
      // Notice: No profile seeded

      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ghostToken}`
        },
        body: JSON.stringify({})
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBeGreaterThanOrEqual(400);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(globalMockStripe.portalSessionsCreated.length).toBe(0);
    });

    it('T1.6: should return 200 with valid Stripe portal session URL on successful request', async () => {
      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({})
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const body = await response.json();
      expect(body.url).toMatch(/^https:\/\/billing\.stripe\.com\/p\/session\//);
      expect(globalMockStripe.portalSessionsCreated[0].return_url).toBe('https://autostrip.pages.dev/settings');
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY, MALFORMED INPUT & ERROR CASES
  // =========================================================================

  describe('Tier 2: Boundary & Corner Cases (R1)', () => {
    it('T2.1: should reject malformed Authorization header missing Bearer prefix', async () => {
      const malformedHeaders = [
        'Basic dXNlcjpwYXNz',
        'Token valid_jwt_token_for_victim',
        'valid_jwt_token_for_victim',
        'Bearer',
        'Bearer '
      ];

      for (const header of malformedHeaders) {
        const request = new Request('https://autostrip.pages.dev/api/create-portal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': header
          },
          body: JSON.stringify({})
        });

        const response = await onRequestPost({ request, env });
        expect(response.status).toBe(401);
      }
    });

    it('T2.2: should handle empty string stripe_customer_id in profile as missing customer (400 Bad Request)', async () => {
      const emptyCustUserId = 'usr_empty_cust_111';
      const emptyCustToken = 'jwt_empty_cust';
      globalMockDb.seedUser(emptyCustUserId, emptyCustToken);
      globalMockDb.seedProfile(emptyCustUserId, { stripe_customer_id: '' });

      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${emptyCustToken}`
        },
        body: JSON.stringify({})
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(400);
      expect(globalMockStripe.portalSessionsCreated.length).toBe(0);
    });

    it('T2.3: should handle empty body or non-JSON body gracefully without crashing', async () => {
      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('url');
    });

    it('T2.4: should return 500 when Stripe API throws an error', async () => {
      globalMockStripe.failPortalCreate = true;
      globalMockStripe.portalErrorMessage = 'Stripe customer deleted or invalid';

      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({})
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    it('T2.5: should return 500 when database query for profile fails', async () => {
      globalMockDb.failProfileQuery = true;

      const request = new Request('https://autostrip.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({})
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBeGreaterThanOrEqual(400);

      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });
});
