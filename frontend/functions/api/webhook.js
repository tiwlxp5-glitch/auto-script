import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env }) {
  // 1. ตรวจสอบกุญแจต่างๆ ว่ามีครบไหม
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Missing environment variables', { status: 500 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16', // ใช้ API Version ปัจจุบัน
    httpClient: Stripe.createFetchHttpClient(), // จำเป็นสำหรับ Cloudflare Workers
  });

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // 2. ดึงข้อมูล Signature และ Payload จาก Stripe เพื่อตรวจสอบความถูกต้อง
  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 3. จัดการเหตุการณ์ต่างๆ ที่ Stripe โทรมาบอก
  try {
    // 3.1 Idempotency Check (ป้องกันการรันซ้ำ)
    const { error: insertEventError } = await supabase
      .from('webhook_events')
      .insert([{ id: event.id }]);
      
    if (insertEventError) {
      if (insertEventError.code === '23505') {
        // Unique violation - event already processed
        console.log(`Event ${event.id} already processed. Skipping.`);
        return new Response('Already processed', { status: 200 });
      } else {
        throw insertEventError; // Unexpected error
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id; // ดึง ID ของผู้ใช้ที่เราส่งไปตอนกดปุ่มจ่ายเงิน

      if (userId) {
        // เช็คว่ายอดเงินก่อนหักส่วนลดเท่าไหร่ เพื่อดูว่าซื้อ Plus (249) หรือ Pro (590)
        // ใช้ amount_subtotal แทน amount_total เพื่อแก้ปัญหาเวลาลูกค้าใช้คูปอง 100%
        const amountPaid = session.amount_subtotal; // สกุลเงินจะเป็นหน่วยย่อยสุด (สตางค์) เช่น 59000 = 590 บาท
        
        let tier = 'plus';
        let addCredits = 60;

        if (amountPaid >= 59000) {
          tier = 'pro';
          addCredits = 150;
        }

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
      }
    }

    // ลบส่วนจัดการ subscription เก่าออกไปแล้ว (ตามคำแนะนำ PAY-01) เพื่อป้องกันโค้ดรันตีกัน
    
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error(`Webhook handler failed.`, err.message);
    // ลบ event ID ออกเพื่อให้รันใหม่ได้ในภายหลัง
    await supabase.from('webhook_events').delete().eq('id', event.id);
    return new Response(`Webhook handler Error: ${err.message}`, { status: 500 });
  }
}
