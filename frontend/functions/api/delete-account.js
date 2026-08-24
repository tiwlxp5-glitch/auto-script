import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export async function onRequestPost({ request, env }) {
  try {
    // 1. ตรวจสอบ Token ของผู้ใช้ที่เรียกมา (Auth)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // สร้าง Client ของ Supabase โดยใช้ Service Role Key เพื่อให้มีสิทธิ์ลบ User ได้
    const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 2. ดึงข้อมูล User จาก Token เพื่อยืนยันว่าเขาเป็นใครและกำลังลบตัวเองจริงๆ
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response('Invalid token', { status: 401 });
    }

    // 3. สั่งลบ User ออกจากระบบ Auth
    // หมายเหตุ: การลบ Auth User อาจทำให้ Row ในตาราง public.profiles และ public.scripts
    // ถูกลบไปด้วยอัตโนมัติ หากตั้งค่า ON DELETE CASCADE ไว้ใน Supabase
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return new Response(deleteError.message, { status: 500 });
    }

    return new Response('Account deleted', { status: 200 });

  } catch (err) {
    console.error('Delete API Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
