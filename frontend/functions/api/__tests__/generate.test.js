import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalMockDb } from './helpers/mockDb.js';
import { globalMockGemini } from './helpers/mockGemini.js';
import { createMockEnv } from './helpers/mockEnv.js';

// Setup Vitest mocks for modules
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => globalMockDb.createClientInstance()
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: globalMockGemini.createGoogleGenAIClass()
}));

// Import the endpoint under test
import { onRequestPost } from '../generate.js';

describe('POST /api/generate (R2: Atomic RPC, R3: Order of Operations, R4: Tier Authorization)', () => {
  const env = createMockEnv();
  const userId = 'usr_gen_test_123';
  const validToken = 'jwt_valid_user_token';

  beforeEach(() => {
    globalMockDb.reset();
    globalMockGemini.reset();

    // Default seed: valid user with free tier and 5 credits
    globalMockDb.seedUser(userId, validToken, 'generator@example.com');
    globalMockDb.seedProfile(userId, {
      tier: 'free',
      credits: 5,
      stripe_customer_id: null
    });
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

  // =========================================================================
  // TIER 1: AUTHENTICATION & CORE SECURITY
  // =========================================================================

  describe('Tier 1: Authentication & Authorization Checks', () => {
    it('T1.1: should return 401 Unauthorized when Authorization header is missing', async () => {
      const request = createGenerateRequest({ productName: 'Test Product' }, null);
      const response = await onRequestPost({ request, env });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
      expect(globalMockGemini.generateCalls.length).toBe(0);
      expect(globalMockDb.rpcCalls.length).toBe(0);
    });

    it('T1.2: should return 401 Unauthorized when token is invalid', async () => {
      const request = createGenerateRequest({ productName: 'Test Product' }, 'invalid_expired_token');
      const response = await onRequestPost({ request, env });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid token');
      expect(globalMockGemini.generateCalls.length).toBe(0);
      expect(globalMockDb.rpcCalls.length).toBe(0);
    });

    it('T1.3: should return 404 when user profile does not exist', async () => {
      const ghostUserId = 'usr_ghost_404';
      const ghostToken = 'jwt_ghost_token';
      globalMockDb.seedUser(ghostUserId, ghostToken);
      // No profile seeded

      const request = createGenerateRequest({ productName: 'Test Product' }, ghostToken);
      const response = await onRequestPost({ request, env });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Profile not found');
    });

    it('T1.4: should return 402 when user has 0 credits', async () => {
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 0 });

      const request = createGenerateRequest({ productName: 'Test Product' });
      const response = await onRequestPost({ request, env });

      expect(response.status).toBe(402);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'เครดิตไม่พอ กรุณาเติมเครดิต');
      expect(globalMockGemini.generateCalls.length).toBe(0);
    });

    it('T1.5: should return 402 when user has negative credits', async () => {
      globalMockDb.seedProfile(userId, { tier: 'free', credits: -2 });

      const request = createGenerateRequest({ productName: 'Test Product' });
      const response = await onRequestPost({ request, env });

      expect(response.status).toBe(402);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'เครดิตไม่พอ กรุณาเติมเครดิต');
    });
  });

  // =========================================================================
  // TIER 2: REQUIREMENT 4 - TIER GATING FOR TARGET AUDIENCE
  // =========================================================================

  describe('Tier 2: R4 - Tier Authorization for targetAudience', () => {
    it('T2.1: Free tier user supplying targetAudience MUST have targetAudience stripped from Gemini prompt', async () => {
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 3 });

      const request = createGenerateRequest({
        productName: 'เซรั่มหน้าใส',
        productDetails: 'ลดรอยสิว ผิวกระจ่างใส',
        pricePromo: '290 บาท',
        videoLength: 'สั้น',
        mode: 'ขยี้ปัญหา (PAS Formula)',
        targetAudience: 'วัยรุ่น นักศึกษา อายุ 18-24 ปี',
        competitor: 'เซรั่มทั่วไป'
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      expect(globalMockGemini.generateCalls.length).toBe(1);
      const geminiCall = globalMockGemini.generateCalls[0];
      expect(geminiCall.model).toBe('gemini-3.6-flash');

      const promptContents = geminiCall.contents;
      expect(promptContents).not.toContain('วัยรุ่น นักศึกษา อายุ 18-24 ปี');
      expect(promptContents).not.toContain('- กลุ่มเป้าหมาย:');
    });

    it('T2.2: Plus tier user supplying targetAudience MUST have targetAudience included in Gemini prompt', async () => {
      const plusUserId = 'usr_plus_user';
      const plusToken = 'jwt_plus_token';
      globalMockDb.seedUser(plusUserId, plusToken);
      globalMockDb.seedProfile(plusUserId, { tier: 'plus', credits: 10 });

      const request = createGenerateRequest({
        productName: 'หมอนสุขภาพ',
        productDetails: 'รองรับต้นคอ เมมโมรี่โฟมแท้',
        videoLength: 'กลาง',
        mode: 'นักเล่าเรื่อง (Hook-Story-Offer)',
        targetAudience: 'พนักงานออฟฟิศ มีอาการปวดคอบ่าไหล่'
      }, plusToken);

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      expect(globalMockGemini.generateCalls.length).toBe(1);
      const promptContents = globalMockGemini.generateCalls[0].contents;
      expect(promptContents).toContain('พนักงานออฟฟิศ มีอาการปวดคอบ่าไหล่');
      expect(promptContents).toContain('- กลุ่มเป้าหมาย: <target_audience>พนักงานออฟฟิศ มีอาการปวดคอบ่าไหล่</target_audience>');
    });

    it('T2.3: Pro tier user supplying targetAudience MUST have targetAudience included in Gemini prompt', async () => {
      const proUserId = 'usr_pro_user';
      const proToken = 'jwt_pro_token';
      globalMockDb.seedUser(proUserId, proToken);
      globalMockDb.seedProfile(proUserId, { tier: 'pro', credits: 20 });

      const request = createGenerateRequest({
        productName: 'คีย์บอร์ดกลไก',
        productDetails: 'สวิตช์ไร้เสียง เชื่อมต่อบลูทูธ 3 เครื่อง',
        videoLength: 'ยาว',
        mode: 'สายสเปค/ฟังก์ชัน (FAB Formula)',
        targetAudience: 'โปรแกรมเมอร์และสตรีมเมอร์'
      }, proToken);

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      expect(globalMockGemini.generateCalls.length).toBe(1);
      const promptContents = globalMockGemini.generateCalls[0].contents;
      expect(promptContents).toContain('โปรแกรมเมอร์และสตรีมเมอร์');
      expect(promptContents).toContain('- กลุ่มเป้าหมาย: <target_audience>โปรแกรมเมอร์และสตรีมเมอร์</target_audience>');
    });
  });

  // =========================================================================
  // TIER 3: CREDIT LEDGER - ORDER OF OPERATIONS (Saga Pattern)
  // =========================================================================

  describe('Tier 3: R3 - Order of Operations (Credit Ledger Saga)', () => {
    it('T3.1: should call start_generation_tx BEFORE commit_generation_tx', async () => {
      const request = createGenerateRequest({
        productName: 'กระทะเคลือบหินอ่อน',
        productDetails: 'ไม่ติดกระทะ ล้างง่าย ไร้น้ำมัน',
        videoLength: 'สั้น',
        mode: 'ขยี้ปัญหา (PAS Formula)'
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      // ✅ NEW: deduction = start_generation_tx, save = commit_generation_tx
      const startTxIndex  = globalMockDb.callLog.findIndex(c => c.type === 'rpc' && c.functionName === 'start_generation_tx');
      const commitTxIndex = globalMockDb.callLog.findIndex(c => c.type === 'rpc' && c.functionName === 'commit_generation_tx');

      expect(startTxIndex).toBeGreaterThan(-1);
      expect(commitTxIndex).toBeGreaterThan(-1);
      expect(startTxIndex).toBeLessThan(commitTxIndex);

      // Verify script was saved in mock store via commit RPC
      expect(globalMockDb.scripts.length).toBe(1);
      const inserted = globalMockDb.scripts[0];
      expect(inserted.user_id).toBe(userId);
      expect(inserted.product_name).toBe('กระทะเคลือบหินอ่อน');
      expect(inserted.mode).toBe('ขยี้ปัญหา (PAS Formula)');
      expect(typeof inserted.content).toBe('string');
    });

    it('T3.2: if commit fails (script insert error), refund_generation_tx restores credits', async () => {
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 5 });
      globalMockDb.failScriptInsert = true;
      globalMockDb.scriptInsertErrorMessage = 'Table scripts connection reset';

      const request = createGenerateRequest({
        productName: 'แก้วเก็บความเย็น',
        productDetails: 'เก็บเย็น 24 ชม.',
        videoLength: 'สั้น',
        mode: 'ขยี้ปัญหา (PAS Formula)'
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Failed to save script history');

      // ✅ NEW: start → commit (fail) → refund
      const rpcNames = globalMockDb.rpcCalls.map(r => r.functionName);
      expect(rpcNames).toContain('start_generation_tx');
      expect(rpcNames).toContain('refund_generation_tx');

      // CRITICAL: Credits in DB remain exactly 5 (refunded)
      const profile = globalMockDb.getProfile(userId);
      expect(profile.credits).toBe(5);
    });

    it('T3.3: should never use manual UPDATE for credits', async () => {
      const request = createGenerateRequest({
        productName: 'กล้องติดหน้ารถ',
        productDetails: 'ชัด 4K กลางคืนสว่าง',
        videoLength: 'สั้น',
        mode: 'ขยี้ปัญหา (PAS Formula)'
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      // Verify no direct update calls on profiles table for credits
      const profileUpdates = globalMockDb.profileUpdates.filter(u => u.data.credits !== undefined);
      expect(profileUpdates.length).toBe(0);
    });
  });

  // =========================================================================
  // TIER 4: REQUIREMENT 2 - ATOMIC RPC CREDIT DEDUCTION (Credit Ledger)
  // =========================================================================

  describe('Tier 4: R2 - Atomic Credit Deduction via RPC', () => {
    it('T4.1: should call start_generation_tx with user_id and p_amount: 1 (Credit Ledger)', async () => {
      globalMockDb.seedProfile(userId, { tier: 'free', credits: 4 });

      const request = createGenerateRequest({
        productName: 'หูฟังบลูทูธ',
        productDetails: 'เบสหนัก แบตอึด',
        videoLength: 'สั้น',
        mode: 'ขยี้ปัญหา (PAS Formula)'
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      // ✅ NEW: first RPC call is start_generation_tx, second is commit_generation_tx
      const startCall = globalMockDb.rpcCalls.find(r => r.functionName === 'start_generation_tx');
      expect(startCall).toBeDefined();
      expect(startCall.args.p_user_id).toBe(userId);
      expect(startCall.args.p_amount).toBe(1);   // Ledger: positive = amount to deduct

      // Verify updated credits in profile
      const updatedProfile = globalMockDb.getProfile(userId);
      expect(updatedProfile.credits).toBe(3);

      // Verify response payload
      const data = await response.json();
      expect(data.credits_remaining).toBe(3);
      expect(data).toHaveProperty('script');
    });

    it('T4.2: should return 500 when start_generation_tx RPC fails', async () => {
      globalMockDb.failRpc = true;
      globalMockDb.rpcErrorMessage = 'RPC database timeout';

      const request = createGenerateRequest({
        productName: 'สายชาร์จเร็ว',
        productDetails: 'ชาร์จ 100W',
        videoLength: 'สั้น',
        mode: 'ขยี้ปัญหา (PAS Formula)'
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Failed to start credit transaction');
    });
  });

  // =========================================================================
  // TIER 5: AI MODEL VERSION & SYSTEM PROMPT COMPLIANCE
  // =========================================================================

  describe('Tier 5: Model Compliance & System Instruction', () => {
    it('T5.1: MUST use model gemini-3.6-flash per GEMINI.md Rule 2', async () => {
      const request = createGenerateRequest({
        productName: 'ไฟแต่งห้อง RGB',
        productDetails: 'เปลี่ยนสีตามจังหวะเพลง',
        videoLength: 'สั้น',
        mode: 'ขยี้ปัญหา (PAS Formula)'
      });

      const response = await onRequestPost({ request, env });
      expect(response.status).toBe(200);

      expect(globalMockGemini.generateCalls.length).toBe(1);
      expect(globalMockGemini.generateCalls[0].model).toBe('gemini-3.6-flash');
    });

    it('T5.2: should return 500 when Gemini API key is not configured', async () => {
      const request = createGenerateRequest({ productName: 'Test' });
      const response = await onRequestPost({
        request,
        env: {
          VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
          // GEMINI_API_KEY omitted
        }
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      // After ledger deduction, credits should be refunded by the catch block
      expect(body).toHaveProperty('error');
    });

    it('T5.3: should return 500 when Gemini model throws an error and credits are refunded', async () => {
      globalMockGemini.failGenerate = true;
      globalMockGemini.generateErrorMessage = 'AI service overloaded';

      const request = createGenerateRequest({ productName: 'Test' });
      const response = await onRequestPost({ request, env });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('AI service overloaded');

      // Verify no script was saved
      expect(globalMockDb.scripts.length).toBe(0);

      // ✅ NEW: start_generation_tx (deduct) + refund_generation_tx (refund in catch)
      const rpcNames = globalMockDb.rpcCalls.map(r => r.functionName);
      expect(rpcNames).toContain('start_generation_tx');
      expect(rpcNames).toContain('refund_generation_tx');

      // Credits should be restored back to 5
      const profile = globalMockDb.getProfile(userId);
      expect(profile.credits).toBe(5);
    });
  });
});

describe('Brand Voice Memory Feature', () => {
  const env = createMockEnv();
  const userId = 'usr_brandvoice_test';
  const validToken = 'jwt_valid_brandvoice_token';

  beforeEach(() => {
    globalMockDb.reset();
    globalMockGemini.reset();
    globalMockDb.seedUser(userId, validToken, 'brandvoice@example.com');
  });

  function createGenerateRequest(bodyObject) {
    return new Request('https://autostrip.pages.dev/api/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify(bodyObject)
    });
  }

  it('1. should inject brand voice config into AI prompt when enabled', async () => {
    globalMockDb.seedProfile(userId, {
      tier: 'pro',
      credits: 10,
      is_brand_voice_enabled: true,
      creator_name: 'เจ้สวย',
      catchphrase: 'จึ้งมากแม่',
      custom_tone: 'เพื่อนสาวเม้าท์มอย',
      target_audience: 'วัยรุ่นสายช้อป'
    });
    
    const request = createGenerateRequest({
      productName: 'Lipstick',
      productDetails: 'Red color'
    });

    const response = await onRequestPost({ request, env, context: { waitUntil: () => {} } });
    expect(response.status).toBe(200);

    const promptSent = globalMockGemini.generateCalls[0].contents;
    expect(promptSent).toContain('<brand_voice>');
    expect(promptSent).toContain('เจ้สวย');
    expect(promptSent).toContain('จึ้งมากแม่');
    expect(promptSent).toContain('เพื่อนสาวเม้าท์มอย');
    expect(promptSent).toContain('วัยรุ่นสายช้อป');
  });

  it('2. should fallback and not inject brand voice if disabled', async () => {
    globalMockDb.seedProfile(userId, {
      tier: 'pro',
      credits: 10,
      is_brand_voice_enabled: false,
      creator_name: 'เจ้สวย',
      catchphrase: 'จึ้งมากแม่'
    });
    
    const request = createGenerateRequest({
      productName: 'Lipstick',
      productDetails: 'Red color',
      targetAudience: 'ผู้หญิงทำงาน' // frontend fallback
    });

    const response = await onRequestPost({ request, env, context: { waitUntil: () => {} } });
    expect(response.status).toBe(200);

    const promptSent = globalMockGemini.generateCalls[0].contents;
    expect(promptSent).not.toContain('<brand_voice>');
    expect(promptSent).not.toContain('เจ้สวย');
    // should use frontend target audience
    expect(promptSent).toContain('ผู้หญิงทำงาน');
  });

  it('3. should block generation if brand voice contains profanity', async () => {
    globalMockDb.seedProfile(userId, {
      tier: 'pro',
      credits: 10,
      is_brand_voice_enabled: true,
      creator_name: 'เจ้สวย ควย', // Moderation bad word trigger
      catchphrase: 'จึ้งมากแม่'
    });

    const request = createGenerateRequest({
      productName: 'Lipstick',
      productDetails: 'Red color'
    });

    const response = await onRequestPost({ request, env, context: { waitUntil: () => {} } });
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error).toContain('ไม่สามารถส่งได้');
  });
});
