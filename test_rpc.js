import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Testing RPC...");
  // Try with user_id and amount
  let res1 = await supabase.rpc('increment_credits', { user_id: 'a9b25754-071a-471f-bde7-3168285511b8', amount: -1 });
  console.log("Result 1 (user_id, amount):", res1.error ? res1.error.message : res1.data);

  // Try with p_user_id and p_amount
  let res2 = await supabase.rpc('increment_credits', { p_user_id: 'a9b25754-071a-471f-bde7-3168285511b8', p_amount: -1 });
  console.log("Result 2 (p_user_id, p_amount):", res2.error ? res2.error.message : res2.data);
}

test();
