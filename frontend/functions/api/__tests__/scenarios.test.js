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

// Import all endpoints under test
import { onRequestPost as handleCreatePortal } from '../create-portal.js';
import { onRequestPost as handleWebhook } from '../webhook.js';
import { onRequestPost as handleGenerate } from '../generate.js';

describe('Tiers 3 & 4: Cross-Feature Combinations & Real-World Application Scenarios', () => {
  const env = createMockEnv();
  const userId = 'usr_journey_user_777';
  const userToken = 'jwt_token_journey_777';
  const customerId = 'cus_stripe_real_777';

  beforeEach(() => {
    globalMockDb.reset();
    globalMockStripe.reset();
    globalMockGemini.reset();

    // Seed initial user
    globalMockDb.seedUser(userId, userToken, 'journey@example.com');
  });

  function createPortalReq(token = userToken, body = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new Request('https://autostrip.pages.dev/api/create-portal', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  }

  function createWebhookReq(eventObj) {
    return new Request('https://autostrip.pages.dev/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'valid_sig_test'
      },
      body: JSON.stringify(eventObj)
    });
  }

  function createGenerateReq(payload, token = userToken) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new Request('https://autostrip.pages.dev/api/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  }

  // =========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS & CONCURRENCY INVARIANTS
  // =========================================================================

  describe('Tier 3: Cross-Feature Interactions', () => {
    it('T3.1: Webhook top-up (+60 credits) followed immediately by script generation deducts 1 credit via RPC', async () => {
      // Step 1: User starts at 0 credits
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 0 });

      // Pre-condition check: Generate attempt fails with 403
      const preGenRes = await handleGenerate({
        request: createGenerateReq({ productName: 'หูฟังบลูทูธ', productDetails: 'ตัดเสียงรบกวน' }),
        env
      });
      expect(preGenRes.status).toBe(403);

      // Step 2: Stripe Webhook delivers Plus package checkout (24900 satang)
      const webhookRes = await handleWebhook({
        request: createWebhookReq({
          id: 'evt_t3_topup_1',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_t3_1',
              client_reference_id: userId,
              customer: customerId,
              amount_subtotal: 24900
            }
          }
        }),
        env
      });
      expect(webhookRes.status).toBe(200);

      // Verify profile is now Plus with 60 credits
      const profileAfterTopUp = globalMockDb.getProfile(userId);
      expect(profileAfterTopUp.tier).toBe('plus');
      expect(profileAfterTopUp.credits).toBe(60);

      // Step 3: User generates a script
      const genRes = await handleGenerate({
        request: createGenerateReq({
          productName: 'หูฟังบลูทูธ',
          productDetails: 'ตัดเสียงรบกวน แบตอึด 40 ชม.',
          mode: 'สายสเปค/ฟังก์ชัน (FAB Formula)',
          targetAudience: 'คนทำงาน WFH และนักเรียน'
        }),
        env
      });
      expect(genRes.status).toBe(200);

      const genBody = await genRes.json();
      expect(genBody.credits_remaining).toBe(59);

      // Verify database state: 1 script saved, credits is 59
      expect(globalMockDb.scripts.length).toBe(1);
      expect(globalMockDb.getProfile(userId).credits).toBe(59);
    });

    it('T3.2: User upgrade from Free to Pro unlocks targetAudience and Jina URL scraping in subsequent generation', async () => {
      const originalFetch = global.fetch;
      const scrapedUrls = [];
      global.fetch = async (url, options) => {
        if (typeof url === 'string' && url.includes('r.jina.ai')) {
          scrapedUrls.push(url);
          return new Response('Scraped Pro Product Specs: 60W Fast Charging', { status: 200 });
        }
        return originalFetch(url, options);
      };

      try {
        // Step 1: User on Free tier with 3 credits generates script with targetAudience and productUrl
        globalMockDb.seedProfile(userId, { tier: 'free', credits: 3 });

        const freeGenReq = createGenerateReq({
          productName: 'หัวชาร์จเร็ว',
          productDetails: 'ขนาดกะทัดรัด',
          targetAudience: 'ผู้ใช้ iPhone 16',
          productUrl: 'https://shopee.co.th/product/fast-charger-60w'
        });

        const freeRes = await handleGenerate({ request: freeGenReq, env });
        expect(freeRes.status).toBe(200);

        // Verification 1: In Free tier, targetAudience was stripped and Jina scraping was skipped
        const prompt1 = globalMockGemini.generateCalls[0].contents;
        expect(prompt1).not.toContain('ผู้ใช้ iPhone 16');
        expect(scrapedUrls.length).toBe(0);

        // Step 2: User purchases Pro package via Stripe webhook (59000 satang)
        const webhookRes = await handleWebhook({
          request: createWebhookReq({
            id: 'evt_upgrade_pro_1',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_pro_upgrade',
                client_reference_id: userId,
                customer: customerId,
                amount_subtotal: 59000
              }
            }
          }),
          env
        });
        expect(webhookRes.status).toBe(200);
        expect(globalMockDb.getProfile(userId).tier).toBe('pro');

        // Step 3: User generates second script on Pro tier with targetAudience and productUrl
        globalMockGemini.reset();
        const proGenReq = createGenerateReq({
          productName: 'หัวชาร์จเร็ว GaN 65W',
          productDetails: 'ขนาดกะทัดรัด มี 3 พอร์ต',
          targetAudience: 'ผู้ใช้ iPhone 16 และ MacBook',
          productUrl: 'https://shopee.co.th/product/fast-charger-60w'
        });

        const proRes = await handleGenerate({ request: proGenReq, env });
        expect(proRes.status).toBe(200);

        // Verification 2: On Pro tier, targetAudience IS included AND Jina scraping was performed
        const prompt2 = globalMockGemini.generateCalls[0].contents;
        expect(prompt2).toContain('กลุ่มเป้าหมาย');
        expect(prompt2).toContain('ผู้ใช้ iPhone 16 และ MacBook');
        expect(scrapedUrls.length).toBe(1);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('T3.3: Webhook idempotency replay prevents double crediting during active script generations', async () => {
      globalMockDb.seedProfile(userId, { tier: 'plus', credits: 10 });

      const webhookEvent = {
        id: 'evt_replay_test_999',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_replay_999',
            client_reference_id: userId,
            customer: customerId,
            amount_subtotal: 24900 // +60 credits
          }
        }
      };

      // 1. Initial Webhook delivery (+60 credits -> 70 total)
      const res1 = await handleWebhook({ request: createWebhookReq(webhookEvent), env });
      expect(res1.status).toBe(200);
      expect(globalMockDb.getProfile(userId).credits).toBe(70);

      // 2. Generate 1 script (-1 credit -> 69 total)
      const genRes = await handleGenerate({
        request: createGenerateReq({ productName: 'กระเป๋าสะพายข้าง', productDetails: 'กันน้ำ จุของได้เยอะ' }),
        env
      });
      expect(genRes.status).toBe(200);
      expect(globalMockDb.getProfile(userId).credits).toBe(69);

      // 3. Network replays the exact same webhook event
      const res2 = await handleWebhook({ request: createWebhookReq(webhookEvent), env });
      expect(res2.status).toBe(200);
      const text2 = await res2.text();
      expect(text2).toContain('Already processed');

      // Balance MUST remain exactly 69 (not 129)
      expect(globalMockDb.getProfile(userId).credits).toBe(69);
    });
  });

  // =========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS & FULL USER JOURNEYS
  // =========================================================================

  describe('Tier 4: Real-World User Journeys', () => {
    it('T4.1 (Complete Free Lifecycle): New signup with 3 credits generates scripts until exhaustion, then gets 403', async () => {
      // 1. New user registration starts with 3 credits on free tier
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 3 });

      // Script 1
      const res1 = await handleGenerate({
        request: createGenerateReq({ productName: 'Item 1', productDetails: 'Details 1' }),
        env
      });
      expect(res1.status).toBe(200);
      expect((await res1.json()).credits_remaining).toBe(2);
      expect(globalMockDb.scripts.length).toBe(1);

      // Script 2
      const res2 = await handleGenerate({
        request: createGenerateReq({ productName: 'Item 2', productDetails: 'Details 2' }),
        env
      });
      expect(res2.status).toBe(200);
      expect((await res2.json()).credits_remaining).toBe(1);
      expect(globalMockDb.scripts.length).toBe(2);

      // Script 3
      const res3 = await handleGenerate({
        request: createGenerateReq({ productName: 'Item 3', productDetails: 'Details 3' }),
        env
      });
      expect(res3.status).toBe(200);
      expect((await res3.json()).credits_remaining).toBe(0);
      expect(globalMockDb.scripts.length).toBe(3);

      // Script 4 (Exhausted) -> 403 Forbidden
      const res4 = await handleGenerate({
        request: createGenerateReq({ productName: 'Item 4', productDetails: 'Details 4' }),
        env
      });
      expect(res4.status).toBe(403);
      expect((await res4.json()).error).toContain('Insufficient credits');
      expect(globalMockDb.scripts.length).toBe(3); // Still 3, item 4 was not saved
    });

    it('T4.2 (Paid Customer Lifecycle): Exhausted user purchases Plus -> Generates premium script -> Accesses Billing Portal securely', async () => {
      // 1. User starts with 0 credits and no stripe_customer_id
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 0, stripe_customer_id: null });

      // 2. User attempts to open billing portal -> returns 400 (no stripe customer yet)
      const prePortalRes = await handleCreatePortal({ request: createPortalReq(userToken), env });
      expect(prePortalRes.status).toBe(400);

      // 3. User purchases Plus plan via Stripe checkout
      const webhookRes = await handleWebhook({
        request: createWebhookReq({
          id: 'evt_journey_plus_1',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_journey_plus',
              client_reference_id: userId,
              customer: customerId,
              amount_subtotal: 24900
            }
          }
        }),
        env
      });
      expect(webhookRes.status).toBe(200);

      // 4. User profile now has Plus tier, 60 credits, and stripe_customer_id
      const profile = globalMockDb.getProfile(userId);
      expect(profile.tier).toBe('plus');
      expect(profile.credits).toBe(60);
      expect(profile.stripe_customer_id).toBe(customerId);

      // 5. User generates a premium script with targetAudience
      const genRes = await handleGenerate({
        request: createGenerateReq({
          productName: 'รองเท้าวิ่งเพื่อสุขภาพ',
          productDetails: 'นุ่ม เบา ซับแรงกระแทก',
          targetAudience: 'ผู้สูงอายุและคนปวดส้นเท้า',
          mode: 'ขยี้ปัญหา (PAS Formula)'
        }),
        env
      });
      expect(genRes.status).toBe(200);

      const genData = await genRes.json();
      expect(genData.credits_remaining).toBe(59);

      // Assert target audience was preserved in Gemini prompt for Plus user
      const prompt = globalMockGemini.generateCalls[0].contents;
      expect(prompt).toContain('ผู้สูงอายุและคนปวดส้นเท้า');

      // 6. User navigates to Settings and clicks "Manage Subscription"
      // Even if an attacker injected customerId in the body, the server uses DB stripe_customer_id
      const portalRes = await handleCreatePortal({
        request: createPortalReq(userToken, { customerId: 'cus_attacker_fake_id' }),
        env
      });
      expect(portalRes.status).toBe(200);

      const portalData = await portalRes.json();
      expect(portalData.url).toContain(customerId);
      expect(portalData.url).not.toContain('cus_attacker_fake_id');
      expect(globalMockStripe.portalSessionsCreated[0].customer).toBe(customerId);
    });

    it('T4.3 (Pro Customer Lifecycle): User purchases Pro -> Scrapes URL & uses targeting -> Generates & archives script -> Opens Portal', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        if (typeof url === 'string' && url.includes('r.jina.ai')) {
          return new Response('Jina Scraped Content: ไมโครโฟนไร้สาย ตัดเสียงรบกวน DSP ชิปเซ็ต', { status: 200 });
        }
        return originalFetch(url, options);
      };

      try {
        // 1. User starts fresh
        globalMockDb.seedProfile(userId, { tier: 'free', credits: 0, stripe_customer_id: null });

        // 2. Stripe Webhook fires for Pro package (59000 satang)
        const proCustId = 'cus_pro_premium_888';
        const webhookRes = await handleWebhook({
          request: createWebhookReq({
            id: 'evt_journey_pro_1',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_journey_pro',
                client_reference_id: userId,
                customer: proCustId,
                amount_subtotal: 59000
              }
            }
          }),
          env
        });
        expect(webhookRes.status).toBe(200);

        // Verify Pro tier & 150 credits
        expect(globalMockDb.getProfile(userId).tier).toBe('pro');
        expect(globalMockDb.getProfile(userId).credits).toBe(150);

        // 3. User generates script with URL scraping and target audience
        const genRes = await handleGenerate({
          request: createGenerateReq({
            productName: 'ไมค์ลอยไร้สาย Wireless Pro',
            productDetails: 'ระยะรับสัญญาณ 50 เมตร',
            targetAudience: 'ครีเอเตอร์ และ Live Streamer',
            productUrl: 'https://shopee.co.th/product/wireless-mic-pro',
            mode: 'นักเล่าเรื่อง (Hook-Story-Offer)'
          }),
          env
        });
        expect(genRes.status).toBe(200);
        expect((await genRes.json()).credits_remaining).toBe(149);

        // Verify prompt has both scraped data and target audience
        const prompt = globalMockGemini.generateCalls[0].contents;
        expect(prompt).toContain('ไมโครโฟนไร้สาย ตัดเสียงรบกวน DSP ชิปเซ็ต');
        expect(prompt).toContain('ครีเอเตอร์ และ Live Streamer');

        // Verify script is saved in DB
        expect(globalMockDb.scripts.length).toBe(1);
        expect(globalMockDb.scripts[0].user_id).toBe(userId);

        // 4. Open Billing Portal
        const portalRes = await handleCreatePortal({ request: createPortalReq(userToken), env });
        expect(portalRes.status).toBe(200);
        expect(globalMockStripe.portalSessionsCreated[0].customer).toBe(proCustId);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
