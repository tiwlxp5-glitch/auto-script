import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env, data }) {
  const logger = data?.logger || console;

  try {
    // 1. ตรวจสอบ Token ของผู้ใช้ที่เรียกมา (Auth)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized request: missing or invalid authorization header');
      return new Response('Unauthorized', { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // สร้าง Client ของ Supabase โดยใช้ Service Role Key เพื่อให้มีสิทธิ์ลบ User ได้
    const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 2. ดึงข้อมูล User จาก Token เพื่อยืนยันว่าเขาเป็นใครและกำลังลบตัวเองจริงๆ
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      logger.warn('Unauthorized request: token validation failed', { userError });
      return new Response('Invalid token', { status: 401 });
    }

    if (data?.logger?.setUserId) data.logger.setUserId(user.id);

    // 3. สั่งลบ User ออกจากระบบ Auth
    // หมายเหตุ: การลบ Auth User อาจทำให้ Row ในตาราง public.profiles และ public.scripts
    // ถูกลบไปด้วยอัตโนมัติ หากตั้งค่า ON DELETE CASCADE ไว้ใน Supabase
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      logger.error('Delete user error', deleteError);
      return new Response(deleteError.message, { status: 500 });
    }
    
    logger.info('Account deleted successfully');

    return new Response('Account deleted', { status: 200 });

  } catch (err) {
    logger.error('Delete API Error', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
