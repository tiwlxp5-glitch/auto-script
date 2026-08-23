/**
 * Mock Environment Variables for Cloudflare Pages Functions
 */
export function createMockEnv(overrides = {}) {
  return {
    STRIPE_SECRET_KEY: 'sk_test_mock_stripe_key_12345',
    STRIPE_WEBHOOK_SECRET: 'whsec_mock_stripe_webhook_secret_67890',
    VITE_SUPABASE_URL: 'https://mock-project.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_anon_key',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_service_role_key',
    GEMINI_API_KEY: 'AIzaSyMockGeminiApiKeyForTesting12345',
    VITE_GEMINI_API_KEY: 'AIzaSyMockGeminiApiKeyForTesting12345',
    ...overrides
  };
}
