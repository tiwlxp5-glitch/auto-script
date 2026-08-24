/**
 * In-Memory Mock Database & Supabase Client Simulation
 */
export class MockDatabase {
  constructor() {
    this.profiles = new Map();
    this.scripts = [];
    this.webhookEvents = new Set();
    this.authUsers = new Map();
    
    // Spies & Logs
    this.callLog = [];
    this.rpcCalls = [];
    this.scriptInserts = [];
    this.profileUpdates = [];
    this.profileUpserts = [];
    this.eventInserts = [];
    this.eventDeletes = [];

    // Fault injection flags
    this.failScriptInsert = false;
    this.scriptInsertErrorMessage = "Database connection error saving script";
    this.failRpc = false;
    this.rpcErrorMessage = "RPC execution failure";
    this.failProfileQuery = false;
    this.failEventInsert = false;
    this.failAuth = false;
  }

  reset() {
    this.profiles.clear();
    this.scripts = [];
    this.webhookEvents.clear();
    this.authUsers.clear();
    this.callLog = [];
    this.rpcCalls = [];
    this.scriptInserts = [];
    this.profileUpdates = [];
    this.profileUpserts = [];
    this.eventInserts = [];
    this.eventDeletes = [];
    this.failScriptInsert = false;
    this.failRpc = false;
    this.failProfileQuery = false;
    this.failEventInsert = false;
    this.failAuth = false;
  }

  seedUser(userId, token, email = 'user@example.com') {
    this.authUsers.set(token, { id: userId, email });
  }

  seedProfile(userId, profileData = {}) {
    const existing = this.profiles.get(userId) || {};
    this.profiles.set(userId, {
      id: userId,
      tier: 'free',
      credits: 3,
      stripe_customer_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...existing,
      ...profileData
    });
  }

  getProfile(userId) {
    return this.profiles.get(userId);
  }

  createClientInstance() {
    const db = this;

    return {
      auth: {
        async getUser(token) {
          if (db.failAuth) {
            return { data: { user: null }, error: { message: "Auth service unavailable" } };
          }
          if (!token || !db.authUsers.has(token)) {
            return { data: { user: null }, error: { message: "Invalid or expired JWT" } };
          }
          const user = db.authUsers.get(token);
          return { data: { user }, error: null };
        },
        admin: {
          async deleteUser(userId) {
            db.profiles.delete(userId);
            for (const [token, user] of db.authUsers.entries()) {
              if (user.id === userId) {
                db.authUsers.delete(token);
              }
            }
            return { data: { user: { id: userId } }, error: null };
          }
        }
      },

      rpc: async (functionName, args = {}) => {
        db.callLog.push({ type: 'rpc', functionName, args, time: Date.now() });
        db.rpcCalls.push({ functionName, args });

        if (db.failRpc) {
          return { data: null, error: { message: db.rpcErrorMessage } };
        }

        if (functionName === 'increment_credits') {
          // Normalize both prefixed (p_user_id) and legacy (user_id) argument conventions
          const userId = args.p_user_id ?? args.user_id;
          const amount = args.p_amount ?? args.amount ?? 0;
        
          if (!userId) {
            return { data: null, error: { message: 'Missing user identifier for increment_credits' } };
          }
        
          const profile = db.profiles.get(userId);
          if (!profile) {
            return { data: null, error: { message: `Profile not found for user ${userId}` } };
          }
        
          const currentCredits = profile.credits ?? 0;
          
          // Guard against insufficient balance on deduction
          if (amount < 0 && currentCredits < Math.abs(amount)) {
            return { data: -1, error: { message: 'Insufficient credits' } };
          }
        
          const newCredits = Math.max(0, currentCredits + amount);
          profile.credits = newCredits;
          profile.updated_at = new Date().toISOString();
          db.profiles.set(userId, profile);
        
          return { data: newCredits, error: null };
        }

        return { data: null, error: { message: `Unknown RPC function ${functionName}` } };
      },

      from: (table) => {
        return {
          select: (columns = '*') => {
            let _filterField = null;
            let filterValue = null;

            const chain = {
              eq: (field, value) => {
                _filterField = field;
                filterValue = value;
                return chain;
              },
              single: async () => {
                if (table === 'profiles') {
                  if (db.failProfileQuery) {
                    return { data: null, error: { message: "Failed to fetch profile" } };
                  }
                  const profile = db.profiles.get(filterValue);
                  if (!profile) {
                    return { data: null, error: { message: "Row not found", code: "PGRST116" } };
                  }
                  // Return only requested fields if specific
                  if (columns === 'credits, tier' || columns === 'tier, credits') {
                    return { data: { credits: profile.credits, tier: profile.tier }, error: null };
                  }
                  if (columns === 'credits') {
                    return { data: { credits: profile.credits }, error: null };
                  }
                  if (columns === 'stripe_customer_id') {
                    return { data: { stripe_customer_id: profile.stripe_customer_id }, error: null };
                  }
                  return { data: { ...profile }, error: null };
                }
                return { data: null, error: { message: `Unknown table ${table}` } };
              }
            };
            return chain;
          },

          insert: (data) => {
            const items = Array.isArray(data) ? data : [data];
            db.callLog.push({ type: `${table}.insert`, data, time: Date.now() });

            if (table === 'webhook_events') {
              db.eventInserts.push(...items);
              if (db.failEventInsert) {
                return Promise.resolve({ error: { message: "Database connection failed" } });
              }
              for (const item of items) {
                if (db.webhookEvents.has(item.id)) {
                  // Simulate PostgreSQL unique violation code 23505
                  return Promise.resolve({
                    data: null,
                    error: { message: `duplicate key value violates unique constraint`, code: '23505' }
                  });
                }
                db.webhookEvents.add(item.id);
              }
              return Promise.resolve({ data: items, error: null });
            }

            if (table === 'scripts') {
              db.scriptInserts.push(...items);
              if (db.failScriptInsert) {
                const err = { message: db.scriptInsertErrorMessage, code: '23502' };
                return {
                  select: () => ({
                    single: async () => ({ data: null, error: err })
                  }),
                  then: (resolve) => resolve({ data: null, error: err })
                };
              }
              const created = items.map((it, idx) => ({
                id: `script_${Date.now()}_${idx}`,
                created_at: new Date().toISOString(),
                ...it
              }));
              db.scripts.push(...created);

              return {
                select: () => ({
                  single: async () => ({ data: created[0], error: null })
                }),
                then: (resolve) => resolve({ data: created, error: null })
              };
            }

            return Promise.resolve({ data: items, error: null });
          },

          upsert: async (data, options = {}) => {
            db.callLog.push({ type: `${table}.upsert`, data, options, time: Date.now() });
            if (table === 'profiles') {
              db.profileUpserts.push(data);
              const existing = db.profiles.get(data.id) || { credits: 0, tier: 'free' };
              const merged = {
                ...existing,
                ...data,
                updated_at: new Date().toISOString()
              };
              db.profiles.set(data.id, merged);
              return { data: merged, error: null };
            }
            return { data, error: null };
          },

          update: (data) => {
            let _filterField = null;
            db.callLog.push({ type: `${table}.update`, data, time: Date.now() });

            return {
              eq: async (field, value) => {
                _filterField = field;
                if (table === 'profiles') {
                  db.profileUpdates.push({ data, field, value });
                  const profile = db.profiles.get(value);
                  if (profile) {
                    Object.assign(profile, data, { updated_at: new Date().toISOString() });
                    db.profiles.set(value, profile);
                    return { data: profile, error: null };
                  }
                  return { data: null, error: { message: "Profile not found" } };
                }
                return { data: null, error: null };
              }
            };
          },

          delete: () => {
            return {
              eq: async (field, value) => {
                db.callLog.push({ type: `${table}.delete`, field, value, time: Date.now() });
                if (table === 'webhook_events' && field === 'id') {
                  db.eventDeletes.push(value);
                  db.webhookEvents.delete(value);
                  return { error: null };
                }
                return { error: null };
              }
            };
          }
        };
      }
    };
  }
}

export const globalMockDb = new MockDatabase();
