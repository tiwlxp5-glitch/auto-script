import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ieomclhmsmskxblcmxpc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JUe3tiuvTPBFtO3ViZIVeQ_I2bihkbC';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Testing RPC with p_user_id and p_amount...");
  let res2 = await supabase.rpc('increment_credits', { p_user_id: 'a9b25754-071a-471f-bde7-3168285511b8', p_amount: -1 });
  console.log("Result 2:", res2.error ? res2.error : res2.data);
}

test();
