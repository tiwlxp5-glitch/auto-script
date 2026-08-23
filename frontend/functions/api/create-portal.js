import Stripe from 'stripe';

export async function onRequestPost({ request, env }) {
  try {
    const { customerId } = await request.json();
    
    if (!customerId) {
      return new Response(JSON.stringify({ error: 'Missing customerId' }), { status: 400 });
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // สร้าง Session สำหรับ Customer Portal
    // return_url คือหน้าที่ลูกค้าจะถูกเด้งกลับมาหลังจากกดยกเลิกหรือเปลี่ยนบัตรเสร็จ
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${new URL(request.url).origin}/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Portal Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
