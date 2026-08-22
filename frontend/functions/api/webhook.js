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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id; // ดึง ID ของผู้ใช้ที่เราส่งไปตอนกดปุ่มจ่ายเงิน

      if (userId) {
        // เช็คว่ายอดเงินเท่าไหร่ เพื่อดูว่าซื้อ Plus (99) หรือ Pro (199)
        const amountPaid = session.amount_total; // สกุลเงินจะเป็นหน่วยย่อยสุด (สตางค์) เช่น 9900 = 99 บาท
        
        let tier = 'plus';
        let addCredits = 60;

        if (amountPaid >= 19900) {
          tier = 'pro';
          addCredits = 150;
        }

        // ดึงเครดิตเก่ามาบวกเพิ่ม
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single();

        const currentCredits = profile?.credits || 0;
        const newCredits = currentCredits + addCredits;

        // อัปเดตตู้เอกสาร (Supabase)
        await supabase
          .from('profiles')
          .update({ 
            tier: tier, 
            credits: newCredits,
            stripe_customer_id: session.customer // เก็บ ID ลูกค้าของ Stripe ไว้สำหรับตัดบัตรเดือนหน้า
          })
          .eq('id', userId);
      }
    } 
    else if (event.type === 'invoice.payment_succeeded') {
      // กรณีตัดบัตรรอบเดือนถัดไปสำเร็จ
      const invoice = event.data.object;
      const stripeCustomerId = invoice.customer;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tier')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (profile) {
        // เติมเครดิตใหม่ของเดือนนั้นให้เต็ม
        const monthlyCredits = profile.tier === 'pro' ? 150 : 60;
        await supabase
          .from('profiles')
          .update({ credits: monthlyCredits })
          .eq('id', profile.id);
      }
    }
    else if (event.type === 'customer.subscription.deleted') {
      // กรณียกเลิกแพ็กเกจ
      const subscription = event.data.object;
      const stripeCustomerId = subscription.customer;

      await supabase
        .from('profiles')
        .update({ tier: 'free', credits: 3 }) // กลับไปเป็นสายฟรี
        .eq('stripe_customer_id', stripeCustomerId);
    }

    // ตอบกลับ Stripe ว่ารับทราบแล้ว
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error(`Error processing webhook:`, err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
