import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env, data }) {
  const logger = data?.logger || console;

  // 1. ตรวจสอบกุญแจต่างๆ ว่ามีครบไหม
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('Missing environment variables for Stripe Webhook');
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
    logger.error(`Webhook signature verification failed`, err);
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
            logger.info(`Event ${event.id} already processed successfully. Skipping.`, { eventId: event.id });
            return new Response('Already processed', { status: 200 });
          } else if (existingEvent.status === 'pending') {
            const ageMinutes = (new Date() - new Date(existingEvent.created_at)) / (1000 * 60);
            if (ageMinutes < 5) {
              logger.info(`Event ${event.id} is currently processing. Returning 409 to let Stripe retry later.`, { eventId: event.id });
              return new Response('Currently processing', { status: 409 });
            } else {
              logger.warn(`Event ${event.id} stuck in pending. Retrying.`, { eventId: event.id });
              await supabase.from('webhook_events').update({ status: 'pending', error_message: null }).eq('id', event.id);
            }
          } else if (existingEvent.status === 'failed') {
            logger.warn(`Event ${event.id} failed previously. Retrying.`, { eventId: event.id });
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
        logger.info(`Session ${session.id} not paid yet (${session.payment_status}). Skipping.`, { sessionId: session.id });
        await supabase.from('webhook_events').update({ status: 'failed', error_message: `Payment pending: ${session.payment_status}` }).eq('id', event.id);
        return new Response('Payment pending', { status: 200 });
      }

      const userId = session.client_reference_id;

      if (userId) {
        if (data?.logger?.setUserId) data.logger.setUserId(userId);
        
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
          logger.error("Database upsert failed", upsertError, { userId, eventId: event.id });
          await supabase.from('webhook_events').update({ status: 'failed', error_message: `DB Upsert Error: ${upsertError.message}` }).eq('id', event.id);
          return new Response(`Database Error: ${upsertError.message}`, { status: 500 });
        }

        // 2. เติมเครดิตแบบ Atomic ด้วย RPC ป้องกัน Race Condition
        const { error: rpcError, data: rpcData } = await supabase.rpc('increment_credits', {
          p_user_id: userId,
          p_amount: addCredits,
          p_source: 'stripe_webhook',
          p_reference_id: event.id
        });

        // Handle Idempotent Success gracefully (Rule #2)
        if (rpcData && rpcData.idempotent_success) {
          logger.info(`Idempotent success for event ${event.id}. Transaction already processed.`);
        }

        if (rpcError) {
          logger.error("RPC increment_credits failed", rpcError, { userId, eventId: event.id });
          await supabase.from('webhook_events').update({ status: 'failed', error_message: `RPC Error: ${rpcError.message}` }).eq('id', event.id);
          return new Response(`Database Error: ${rpcError.message}`, { status: 500 });
        }
      }
    }

    if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      const charge = event.data.object;
      const customerId = charge.customer;
      const paymentIntentId = charge.payment_intent; // We will use this to find the exact ledger row

      if (customerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, credits, tier')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          if (data?.logger?.setUserId) data.logger.setUserId(profile.id);
          logger.warn(`Revoking access for refunded/disputed customer ${customerId} (event: ${event.type})`, { customerId, eventId: event.id });

          // FIND ORIGINAL GRANT
          const { data: originalTx, error: txError } = await supabase
            .from('credit_transactions')
            .select('amount')
            .eq('user_id', profile.id)
            .eq('source', 'stripe_webhook')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (txError) {
             logger.error("Could not find original credit transaction for refund", txError, { userId: profile.id });
          }

          // Rule #7: Exact original amount. Fallback to charge amount heuristics if not found (for legacy data)
          const creditsToDeduct = originalTx ? originalTx.amount : (charge.amount >= 59000 ? 150 : 60);

          // Rule #8: Balance may become negative.
          // Rule #6: Atomic Balance + Ledger via increment_credits
          // Rule #11: Refund Idempotency (use event.id as reference_id)
          const { error: refundRpcError, data: refundRpcData } = await supabase.rpc('increment_credits', {
            p_user_id: profile.id,
            p_amount: -creditsToDeduct,
            p_source: event.type === 'charge.refunded' ? 'stripe_refund' : 'stripe_dispute',
            p_reference_id: event.id
          });

          if (refundRpcData && refundRpcData.idempotent_success) {
            logger.info(`Idempotent success for refund/dispute event ${event.id}. Transaction already processed.`);
            return new Response('Idempotent success', { status: 200 });
          }

          if (refundRpcError) {
             logger.error("RPC increment_credits failed for refund", refundRpcError, { userId: profile.id, eventId: event.id });
             await supabase.from('webhook_events').update({ status: 'failed', error_message: `Refund RPC Error: ${refundRpcError.message}` }).eq('id', event.id);
             return new Response(`Database Error: ${refundRpcError.message}`, { status: 500 });
          }

          // Downgrade tier strictly
          await supabase.from('profiles').update({ tier: 'free' }).eq('id', profile.id);

          logger.info(`Downgraded user ${profile.id} to free tier and deducted ${creditsToDeduct} credits.`, { userId: profile.id });
        }
      }
    }

    // 4. บันทึกผลว่าทำงานสำเร็จ (State-aware Idempotency)
    const { error: updateSuccessError } = await supabase
      .from('webhook_events')
      .update({ status: 'success', error_message: null })
      .eq('id', event.id);

    if (updateSuccessError) {
      logger.error(`Failed to mark event ${event.id} as success`, updateSuccessError, { eventId: event.id });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    logger.error(`Webhook handler failed`, err, { eventId: event?.id });
    if (event?.id) {
      await supabase.from('webhook_events').update({ status: 'failed', error_message: err.message }).eq('id', event.id);
    }
    return new Response(`Webhook handler Error: ${err.message}`, { status: 500 });
  }
}
