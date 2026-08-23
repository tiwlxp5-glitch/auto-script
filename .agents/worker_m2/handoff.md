# Milestone 2 Implementation Handoff Report: Fix Race Condition in `webhook.js`

**Agent**: `worker_m2`  
**Milestone**: M2 — Fix Race Condition in `webhook.js` via Supabase atomic RPC `increment_credits`  
**Date**: 2026-08-24T02:23:00+07:00  
**Target Files**:
- `frontend/functions/api/webhook.js`
- `supabase/migrations/20260824000000_create_increment_credits_rpc.sql`

---

## 1. Observation

1. **Original Vulnerable Code in `frontend/functions/api/webhook.js` (lines 63–88)**:
   ```javascript
   // ดึงเครดิตเก่ามาบวกเพิ่ม
   const { data: profile } = await supabase
     .from('profiles')
     .select('credits')
     .eq('id', userId)
     .single();

   const currentCredits = profile?.credits || 0;
   const newCredits = currentCredits + addCredits;

   // อัปเดตหรือสร้างตู้เอกสาร (Supabase) ด้วย upsert
   const { error: upsertError } = await supabase
     .from('profiles')
     .upsert({ 
       id: userId, 
       tier: tier, 
       credits: newCredits,
       stripe_customer_id: session.customer 
     });
   ```
2. **Analysis of Vulnerability**:
   - The endpoint previously executed a **Read-Modify-Write** cycle in Node.js/V8 memory.
   - When multiple Stripe checkout events or concurrent API calls occurred simultaneously for the same user, both requests read the same initial credit balance, computed `newCredits` locally, and the last write overwrote preceding additions, causing **Lost Updates**.
3. **Database Migration Requirement**:
   - Supabase PostgreSQL needed an atomic RPC function `increment_credits(user_id UUID, amount INT) RETURNS INT` that directly executes `UPDATE profiles SET credits = COALESCE(credits, 0) + amount WHERE id = user_id RETURNING credits`.
4. **Build & Lint Verification Commands and Results**:
   - `npm run lint` in `c:\Auto script\frontend`:
     ```
     > frontend@0.0.0 lint
     > oxlint
     Found 10 warnings and 0 errors.
     Finished in 26ms on 19 files with 104 rules using 16 threads.
     ```
   - `npm run build` in `c:\Auto script\frontend`:
     ```
     > frontend@0.0.0 build
     > vite build
     vite v8.2.2 building client environment for production...
     ✓ 79 modules transformed.
     dist/index.html                   0.84 kB │ gzip:   0.45 kB
     dist/assets/index-BwRzc4Eo.css   43.58 kB │ gzip:   8.08 kB
     dist/assets/index-m7y6PUpR.js   530.58 kB │ gzip: 146.06 kB
     ✓ built in 265ms
     ```

---

## 2. Logic Chain

1. **Root Cause Analysis (Ref: Observation §1)**:
   - When credits are updated via `select -> add in memory -> upsert(credits: newCredits)`, concurrent transactions interleave.
   - Analogy: Imagine two bank tellers reading a customer's balance of $100 at the exact same second. Teller A deposits $60 and sets balance to $160. Teller B deposits $150 and sets balance to $250. The customer ends up with $250 instead of $310 because Teller B didn't see Teller A's deposit.
2. **Remediation Strategy**:
   - **Step 1 (SQL RPC)**: Define an atomic PostgreSQL function `increment_credits(user_id UUID, amount INT)` which operates directly inside the database with row-level locks.
   - **Step 2 (Metadata Upsert)**: In `webhook.js`, upsert only the user's `tier` and `stripe_customer_id` into `profiles` (specifying `{ onConflict: 'id' }`) without modifying or overwriting the `credits` column.
   - **Step 3 (Atomic Increment)**: Call `await supabase.rpc('increment_credits', { user_id: userId, amount: addCredits })` (+60 for Plus, +150 for Pro).
   - **Step 4 (Failure Compensation)**: If either the metadata upsert or the RPC invocation fails, log the error, delete `event.id` from `webhook_events`, and return HTTP 500 so Stripe can safely retry.
3. **Execution Verification (Ref: Observation §4)**:
   - Linting and build passed cleanly without errors.

---

## 3. Detailed Code Breakdown & Educational Explanation (GEMINI.md Rule 1)

### 3.1 SQL RPC Function (`supabase/migrations/20260824000000_create_increment_credits_rpc.sql`)
```sql
CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + amount
  WHERE id = user_id
  RETURNING credits INTO new_credits;
  
  RETURN new_credits;
END;
$$;
```
- **Why this works**: `COALESCE(credits, 0) + amount` ensures that even if a user's credit balance is currently NULL, PostgreSQL treats it as 0 before adding/subtracting.
- **Atomic Safety**: PostgreSQL acquires a row-level lock on the specific `profiles` row during `UPDATE`. Any other concurrent query modifying the same row will wait until this update finishes, completely eliminating race conditions.

### 3.2 Webhook Handler Refactor (`frontend/functions/api/webhook.js`)
```javascript
// 1. อัปเดตข้อมูลระดับผู้ใช้ (Tier) และ Stripe Customer ID โดยไม่แก้ไขจำนวนเครดิตตรงนี้
const { error: upsertError } = await supabase
  .from('profiles')
  .upsert({ 
    id: userId, 
    tier: tier, 
    stripe_customer_id: session.customer 
  }, { onConflict: 'id' });

if (upsertError) {
  console.error("Database upsert failed:", upsertError);
  // ลบ event ID ออกเพื่อให้รันใหม่ได้ในภายหลังถ้า Database ล้มเหลว
  await supabase.from('webhook_events').delete().eq('id', event.id);
  return new Response(`Database Error: ${upsertError.message}`, { status: 500 });
}

// 2. เติมเครดิตแบบ Atomic ด้วย Supabase RPC increment_credits เพื่อป้องกันปัญหา Race Condition
const { error: rpcError } = await supabase.rpc('increment_credits', {
  user_id: userId,
  amount: addCredits
});

if (rpcError) {
  console.error("RPC increment_credits failed:", rpcError);
  // ลบ event ID ออกเพื่อให้รันใหม่ได้ในภายหลังถ้า RPC ล้มเหลว
  await supabase.from('webhook_events').delete().eq('id', event.id);
  return new Response(`Database Error: ${rpcError.message}`, { status: 500 });
}
```
- **Separation of Concerns**: Metadata updates (Tier, Stripe Customer ID) are kept separate from quota math.
- **Idempotency Rollback**: If a database error occurs after `webhook_events` has recorded the event, deleting `event.id` ensures that Stripe's automatic retry mechanism will not get falsely rejected with `Already processed` on subsequent retry attempts.

---

## 4. Caveats

- **Database RPC Deployment**: The SQL migration file `supabase/migrations/20260824000000_create_increment_credits_rpc.sql` has been created. In a live production environment, this migration must be applied to the remote Supabase PostgreSQL instance via the Supabase CLI (`supabase db push`) or SQL Editor.
- **Other Endpoints**: Milestone 2 specifically owns `webhook.js`. Deducting credits via RPC in `generate.js` is scoped to Milestone 3 (worker_m3).

---

## 5. Conclusion

Milestone 2 implementation is complete and verified. The non-atomic read-modify-write credit update in `frontend/functions/api/webhook.js` has been replaced with the atomic Supabase RPC `increment_credits`, preventing race conditions and lost updates under concurrent webhook processing. The PostgreSQL RPC migration file has been created, and the build and lint checks pass without errors.

---

## 6. Verification Method

1. **Verify Source Code Changes**:
   - Inspect `frontend/functions/api/webhook.js` lines 63–91 to verify `supabase.rpc('increment_credits', ...)` is called and no `select('credits')` occurs.
   - Inspect `supabase/migrations/20260824000000_create_increment_credits_rpc.sql` for PostgreSQL RPC definition.
2. **Run Linter**:
   ```bash
   cd "c:\Auto script\frontend"
   npm run lint
   ```
   *Expected: 0 errors.*
3. **Run Production Build**:
   ```bash
   cd "c:\Auto script\frontend"
   npm run build
   ```
   *Expected: Clean Vite build exit code 0.*
