import assert from 'node:assert/strict';
import { onRequestPost } from '../../frontend/functions/api/create-portal.js';

const env = {
  VITE_SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  STRIPE_SECRET_KEY: 'sk_test_123456789'
};

const originalFetch = globalThis.fetch;

function setupMockFetch() {
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = url.toString();
    
    // Normalize headers
    let auth = '';
    if (options.headers) {
      if (typeof options.headers.get === 'function') {
        auth = options.headers.get('authorization') || options.headers.get('Authorization') || '';
      } else if (Array.isArray(options.headers)) {
        for (const [k, v] of options.headers) {
          if (k.toLowerCase() === 'authorization') auth = v;
        }
      } else {
        auth = options.headers.authorization || options.headers.Authorization || '';
      }
    }

    // 1. Supabase Auth getUser: GET /auth/v1/user
    if (urlStr.includes('/auth/v1/user')) {
      if (auth === 'Bearer valid-jwt-token') {
        return new Response(JSON.stringify({
          id: 'user-uuid-1',
          email: 'valid@example.com',
          role: 'authenticated'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else if (auth === 'Bearer no-stripe-jwt-token') {
        return new Response(JSON.stringify({
          id: 'user-uuid-2',
          email: 'nostripe@example.com',
          role: 'authenticated'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        return new Response(JSON.stringify({
          error: 'invalid_grant',
          message: 'Invalid JWT'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 2. Supabase REST profiles query: GET /rest/v1/profiles
    if (urlStr.includes('/rest/v1/profiles')) {
      if (urlStr.includes('user-uuid-1')) {
        return new Response(JSON.stringify({
          stripe_customer_id: 'cus_legit_123'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('user-uuid-2')) {
        return new Response(JSON.stringify({
          stripe_customer_id: null
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(null), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Stripe Billing Portal Session: POST https://api.stripe.com/v1/billing_portal/sessions
    if (urlStr.includes('api.stripe.com/v1/billing_portal/sessions')) {
      if (!auth || !auth.includes('Bearer sk_test_123456789')) {
        return new Response(JSON.stringify({
          error: { message: `Invalid Stripe API Key: received ${auth}` }
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const body = options.body ? options.body.toString() : '';
      const params = new URLSearchParams(body);
      const customer = params.get('customer');
      const return_url = params.get('return_url');

      return new Response(JSON.stringify({
        id: 'bps_test_session_id',
        object: 'billing_portal.session',
        customer: customer,
        return_url: return_url,
        url: `https://billing.stripe.com/session/${customer}_secret`
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return originalFetch(url, options);
  };
}

async function runTests() {
  console.log('=== Running Comprehensive Verification for M1 ===\n');
  setupMockFetch();

  try {
    // Case 1: Missing Authorization Header -> 401
    {
      const req = new Request('https://auto-script.pages.dev/api/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: 'cus_attacker_injected' })
      });
      const res = await onRequestPost({ request: req, env });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Unauthorized');
      console.log('✓ Case 1 Passed: Missing Authorization header returns 401');
    }

    // Case 2: Malformed Authorization Header (No Bearer prefix) -> 401
    {
      const req = new Request('https://auto-script.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Token invalid-format-token'
        },
        body: JSON.stringify({ customerId: 'cus_attacker_injected' })
      });
      const res = await onRequestPost({ request: req, env });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Unauthorized');
      console.log('✓ Case 2 Passed: Malformed Authorization header returns 401');
    }

    // Case 3: Invalid JWT token -> 401
    {
      const req = new Request('https://auto-script.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer expired-or-invalid-jwt'
        },
        body: JSON.stringify({ customerId: 'cus_attacker_injected' })
      });
      const res = await onRequestPost({ request: req, env });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Unauthorized');
      console.log('✓ Case 3 Passed: Invalid JWT token returns 401');
    }

    // Case 4: Valid user but no stripe_customer_id in profiles -> 400
    {
      const req = new Request('https://auto-script.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer no-stripe-jwt-token'
        },
        body: JSON.stringify({ customerId: 'cus_attacker_injected' })
      });
      const res = await onRequestPost({ request: req, env });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'No Stripe customer found for this account');
      console.log('✓ Case 4 Passed: Missing stripe_customer_id in DB returns 400');
    }

    // Case 5: Valid user + payload contains attacker customerId -> IDOR prevented! Uses DB stripe_customer_id
    {
      const req = new Request('https://auto-script.pages.dev/api/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({ customerId: 'cus_attacker_attempting_idor' })
      });
      const res = await onRequestPost({ request: req, env });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.url, 'https://billing.stripe.com/session/cus_legit_123_secret');
      console.log('✓ Case 5 Passed: IDOR strictly prevented, session created with DB customer ID (cus_legit_123)');
    }

    console.log('\n=== All 5 Test Cases Passed Successfully! ===');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
