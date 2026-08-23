import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env }) {
  try {
    // 1. ตรวจสอบการยืนยันตัวตน (JWT Bearer Token จาก Header)
    // เปรียบเสมือนการตรวจบัตรประชาชนที่ประตูทางเข้า เพื่อป้องกันไม่ให้บุคคลภายนอกที่ไม่ได้รับอนุญาตเข้าถึงระบบ
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 2. ตรวจสอบความถูกต้องของ Token กับ Supabase Auth
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. ดึง stripe_customer_id จากฐานข้อมูล (profiles) โดยอิงตาม user.id ของผู้ใช้ที่ล็อกอินเท่านั้น
    // เพื่อป้องกันช่องโหว่ IDOR (Insecure Direct Object Reference) - ห้ามเชื่อถือ customerId ที่ส่งมาจาก Client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found for this account' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. เชื่อมต่อ Stripe SDK และสร้าง Customer Portal Session
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // สร้าง Session สำหรับ Customer Portal เพื่อให้ลูกค้าจัดการบัตรหรือการบอกรับสมาชิก
    // return_url คือ URL ที่ลูกค้าจะถูก Redirect กลับมาหลังจัดการเสร็จสิ้น
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${new URL(request.url).origin}/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Portal Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

