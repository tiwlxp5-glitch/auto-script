/**
 * In-Memory Mock Database & Supabase Client Simulation
 */
export class MockDatabase {
  constructor() {
    this.profiles = new Map();
    this.scripts = [];
    this.webhookEvents = new Map();
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
          
          // FIX DB-01: Strict Pre-Deduction Sufficiency Check
          if (amount < 0 && currentCredits < Math.abs(amount)) {
            return { data: -1, error: null };
          }
        
          const newCredits = Math.max(0, currentCredits + amount);
          profile.credits = newCredits;
          profile.updated_at = new Date().toISOString();
          db.profiles.set(userId, profile);
        
          return { data: newCredits, error: null };
        }

        // ─── Credit Ledger RPCs (Saga Pattern) ────────────────────────────────
        // Mock simulates the same Atomic behavior as the real DB RPCs
        // ─────────────────────────────────────────────────────────────────────

        if (functionName === 'start_generation_tx') {
          const userId = args.p_user_id;
          const amount = args.p_amount ?? 1;
          const mode   = args.p_mode ?? null;

          if (!userId) {
            return { data: null, error: { message: 'Missing p_user_id for start_generation_tx' } };
          }

          const profile = db.profiles.get(userId);
          if (!profile) {
            return { data: { error: 'profile_not_found', credits: -1 }, error: null };
          }

          const currentCredits = profile.credits ?? 0;
          if (currentCredits < amount) {
            // insufficient_credits → return credits: -1 (same as real RPC)
            return { data: { error: 'insufficient_credits', credits: -1 }, error: null };
          }

          // Deduct credits atomically
          const newCredits = currentCredits - amount;
          profile.credits = newCredits;
          db.profiles.set(userId, profile);

          // Create a ledger entry in memory
          const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          if (!db.creditTransactions) db.creditTransactions = new Map();
          db.creditTransactions.set(transactionId, {
            id: transactionId,
            user_id: userId,
            amount: -amount,
            status: 'pending',
            mode,
            created_at: new Date().toISOString()
          });

          return { data: { transaction_id: transactionId, credits: newCredits }, error: null };
        }

        if (functionName === 'commit_generation_tx') {
          const transactionId = args.p_transaction_id;
          const userId        = args.p_user_id;

          if (!db.creditTransactions) db.creditTransactions = new Map();
          const tx = db.creditTransactions.get(transactionId);

          if (!tx || tx.user_id !== userId || tx.status !== 'pending') {
            return { data: { error: 'transaction_not_found_or_already_processed' }, error: null };
          }

          // Insert script (delegates to the from('scripts').insert path)
          const scriptRecord = {
            id: `script_${Date.now()}`,
            user_id: userId,
            product_name:    (args.p_product_name || '').slice(0, 100),
            product_details: (args.p_product_details || '').slice(0, 2000),
            mode:    args.p_mode,
            content: args.p_content,
            created_at: new Date().toISOString()
          };

          if (db.failScriptInsert) {
            // Simulate commit failure — transaction stays pending for pg_cron
            return { data: null, error: { message: db.scriptInsertErrorMessage, code: '23502' } };
          }

          db.scripts.push(scriptRecord);
          db.scriptInserts.push(scriptRecord);

          // Mark transaction as completed
          tx.status = 'completed';
          db.creditTransactions.set(transactionId, tx);

          return { data: { success: true }, error: null };
        }

        if (functionName === 'refund_generation_tx') {
          const transactionId = args.p_transaction_id;
          const userId        = args.p_user_id;

          if (!db.creditTransactions) db.creditTransactions = new Map();
          const tx = db.creditTransactions.get(transactionId);

          if (!tx || tx.user_id !== userId || tx.status !== 'pending') {
            // Safe no-op — already refunded or committed
            return { data: { skipped: true }, error: null };
          }

          // Restore credits (tx.amount is negative, so * -1 adds back)
          const profile = db.profiles.get(userId);
          if (profile) {
            profile.credits = (profile.credits ?? 0) + (tx.amount * -1);
            db.profiles.set(userId, profile);
          }

          // Mark as refunded
          tx.status = 'refunded';
          db.creditTransactions.set(transactionId, tx);

          return { data: { success: true, refunded_amount: tx.amount * -1 }, error: null };
        }

        if (functionName === 'decrement_trial_quota') {
          const userId = args.p_user_id;
          const amount = args.p_amount ?? 1;
          const profile = db.profiles.get(userId);
          if (!profile) return { data: null, error: { message: 'Profile not found' } };
          const current = profile.trial_pro_remaining ?? 0;
          const next = Math.max(0, current - amount);
          profile.trial_pro_remaining = next;
          db.profiles.set(userId, profile);
          return { data: next, error: null };
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
              order: () => chain,
              limit: () => chain,
              single: async () => {
                if (table === 'credit_transactions') {
                  return { data: null, error: { message: "Row not found", code: "PGRST116" } };
                }
                if (table === 'profiles') {
                  if (db.failProfileQuery) {
                    return { data: null, error: { message: "Failed to fetch profile" } };
                  }
                  
                  let profile;
                  // Support lookup by stripe_customer_id (used by refund/chargeback handler)
                  if (_filterField === 'stripe_customer_id') {
                    profile = Array.from(db.profiles.values()).find(
                      p => p.stripe_customer_id === filterValue
                    );
                  } else {
                    // Default: lookup by id (primary key)
                    profile = db.profiles.get(filterValue);
                  }
                  
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
                  if (columns === 'id, credits, tier') {
                    return { data: { id: profile.id, credits: profile.credits, tier: profile.tier }, error: null };
                  }
                  return { data: { ...profile }, error: null };
                }
                if (table === 'webhook_events') {
                  const event = db.webhookEvents.get(filterValue);
                  if (!event) return { data: null, error: { message: "Row not found", code: "PGRST116" } };
                  return { data: { ...event }, error: null };
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
                db.webhookEvents.set(item.id, {
                  id: item.id,
                  status: item.status || 'success',
                  error_message: item.error_message || null,
                  created_at: new Date().toISOString()
                });
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
                if (table === 'webhook_events') {
                  const event = db.webhookEvents.get(value);
                  if (event) {
                    Object.assign(event, data);
                    db.webhookEvents.set(value, event);
                    return { data: event, error: null };
                  }
                  return { data: null, error: { message: "Event not found" } };
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
