/**
 * Mock Stripe Client Simulation
 */
export class MockStripeManager {
  constructor() {
    this.portalSessionsCreated = [];
    this.eventsConstructed = [];
    this.failPortalCreate = false;
    this.portalErrorMessage = "Stripe API rate limit exceeded";
    this.failSignature = false;
    this.signatureErrorMessage = "Invalid signature";
  }

  reset() {
    this.portalSessionsCreated = [];
    this.eventsConstructed = [];
    this.failPortalCreate = false;
    this.failSignature = false;
  }

  createStripeClass() {
    const manager = this;

    class MockStripe {
      constructor(apiKey, config = {}) {
        this.apiKey = apiKey;
        this.config = config;

        this.billingPortal = {
          sessions: {
            create: async (params) => {
              manager.portalSessionsCreated.push(params);
              if (manager.failPortalCreate) {
                throw new Error(manager.portalErrorMessage);
              }
              return {
                id: `bps_${Date.now()}`,
                object: 'billing_portal.session',
                customer: params.customer,
                return_url: params.return_url,
                url: `https://billing.stripe.com/p/session/test_${params.customer}_${Date.now()}`
              };
            }
          }
        };

        this.webhooks = {
          constructEventAsync: async (payload, signature, secret) => {
            manager.eventsConstructed.push({ payload, signature, secret });
            if (manager.failSignature || !signature || signature === 'invalid_signature') {
              throw new Error(manager.signatureErrorMessage || "Webhook signature verification failed");
            }
            if (typeof payload === 'string') {
              try {
                return JSON.parse(payload);
              } catch {
                throw new Error("Invalid payload JSON");
              }
            }
            return payload;
          }
        };
      }

      static createFetchHttpClient() {
        return {};
      }
    }

    return MockStripe;
  }
}

export const globalMockStripe = new MockStripeManager();
