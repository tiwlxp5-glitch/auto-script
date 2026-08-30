import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env }) {
  // 1. ตรวจสอบกุญแจต่างๆ ว่ามีครบไหม
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Missing environment variables', { status: 500 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
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
    // 3.1 Idempotency Check (ป้องกันการรันซ้ำแบบมี State - Expert Architecture Audit Item 3)
    const { error: insertEventError } = await supabase
      .from('webhook_events')
      .insert([{ id: event.id, status: 'pending' }]);
      
    if (insertEventError) {
      if (insertEventError.code === '23505') {
        const { data: existingEvent } = await supabase
          .from('webhook_events')
          .select('status, created_at')
          .eq('id', event.id)
          .single();

        if (existingEvent) {
          if (existingEvent.status === 'success') {
            console.log(`Event ${event.id} already processed successfully. Skipping.`);
            return new Response('Already processed', { status: 200 });
          } else if (existingEvent.status === 'pending') {
            const ageMinutes = (new Date() - new Date(existingEvent.created_at)) / (1000 * 60);
            if (ageMinutes < 5) {
              console.log(`Event ${event.id} is currently processing. Returning 409 to let Stripe retry later.`);
              return new Response('Currently processing', { status: 409 });
            } else {
              console.log(`Event ${event.id} stuck in pending. Retrying.`);
              await supabase.from('webhook_events').update({ status: 'pending', error_message: null }).eq('id', event.id);
            }
          } else if (existingEvent.status === 'failed') {
            console.log(`Event ${event.id} failed previously. Retrying.`);
            await supabase.from('webhook_events').update({ status: 'pending', error_message: null }).eq('id', event.id);
          }
        }
      } else {
        throw insertEventError;
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // FIX INF-03: Ignore unpaid async sessions (e.g., bank transfers still pending)
      if (session.payment_status !== 'paid') {
        console.log(`Session ${session.id} not paid yet (${session.payment_status}). Skipping.`);
        await supabase.from('webhook_events').update({ status: 'failed', error_message: `Payment pending: ${session.payment_status}` }).eq('id', event.id);
        return new Response('Payment pending', { status: 200 });
      }

      const userId = session.client_reference_id;

      if (userId) {
        // ใช้ amount_subtotal แทน amount_total เพื่อแก้ปัญหาเวลาลูกค้าใช้คูปอง 100%
        const amountPaid = session.amount_subtotal;
        let addCredits = amountPaid >= 59000 ? 150 : 60;

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', userId)
          .single();

        const currentTier = existingProfile?.tier;
        const targetTier = (currentTier === 'pro' || amountPaid >= 59000) ? 'pro' : 'plus';

        // 1. อัปเดต Tier และ Stripe Customer ID
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: userId, 
            tier: targetTier, 
            stripe_customer_id: session.customer 
          }, { onConflict: 'id' });

        if (upsertError) {
          console.error("Database upsert failed:", upsertError);
          await supabase.from('webhook_events').update({ status: 'failed', error_message: `DB Upsert Error: ${upsertError.message}` }).eq('id', event.id);
          return new Response(`Database Error: ${upsertError.message}`, { status: 500 });
        }

        // 2. เติมเครดิตแบบ Atomic ด้วย RPC ป้องกัน Race Condition
        const { error: rpcError } = await supabase.rpc('increment_credits', {
          p_user_id: userId,
          p_amount: addCredits
        });

        if (rpcError) {
          console.error("RPC increment_credits failed:", rpcError);
          await supabase.from('webhook_events').update({ status: 'failed', error_message: `RPC Error: ${rpcError.message}` }).eq('id', event.id);
          return new Response(`Database Error: ${rpcError.message}`, { status: 500 });
        }
      }
    }

    // FIX INF-02: Handle Refunds and Chargebacks
    if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      const charge = event.data.object;
      const customerId = charge.customer;

      if (customerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, credits, tier')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          console.log(`Revoking access for refunded/disputed customer ${customerId} (event: ${event.type})`);
          const creditsToDeduct = charge.amount >= 59000 ? 150 : 60;
          const newCredits = Math.max(0, (profile.credits || 0) - creditsToDeduct);
          
          await supabase.from('profiles').update({
            tier: 'free',
            credits: newCredits
          }).eq('id', profile.id);

          console.log(`Downgraded user ${profile.id} to free tier. Credits adjusted to ${newCredits}.`);
        }
      }
    }

    // 4. บันทึกผลว่าทำงานสำเร็จ (State-aware Idempotency)
    const { error: updateSuccessError } = await supabase
      .from('webhook_events')
      .update({ status: 'success', error_message: null })
      .eq('id', event.id);

    if (updateSuccessError) {
      console.error(`Failed to mark event ${event.id} as success:`, updateSuccessError);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error(`Webhook handler failed.`, err.message);
    await supabase.from('webhook_events').update({ status: 'failed', error_message: err.message }).eq('id', event.id);
    return new Response(`Webhook handler Error: ${err.message}`, { status: 500 });
  }
}
