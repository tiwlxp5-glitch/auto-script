export function translateError(errorMsg) {
  if (!errorMsg || typeof errorMsg !== 'string') return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';

  const msg = errorMsg.toLowerCase();

  // Authentication errors
  if (msg.includes('invalid login credentials')) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  }
  if (msg.includes('email not confirmed')) {
    return 'กรุณายืนยันอีเมลในกล่องจดหมายของคุณก่อนเข้าสู่ระบบ';
  }
  if (msg.includes('user already registered')) {
    return 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ';
  }
  if (msg.includes('password should be at least 6 characters')) {
    return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
  }
  if (msg.includes('new password should be different from the old password')) {
    return 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม';
  }
  if (msg.includes('token has expired') || msg.includes('invalid token')) {
    return 'ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง';
  }
  if (msg.includes('rate limit exceeded') || msg.includes('too many requests')) {
    return 'คุณทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  }
  if (msg.includes('once every 60 seconds')) {
    return 'เพื่อความปลอดภัย กรุณารอ 60 วินาทีก่อนทำรายการอีกครั้ง';
  }
  if (msg.includes('unable to validate email address')) {
    return 'รูปแบบอีเมลไม่ถูกต้อง';
  }
  if (msg.includes('missing email')) {
    return 'กรุณาระบุอีเมล';
  }
  if (msg.includes('missing password')) {
    return 'กรุณาระบุรหัสผ่าน';
  }
  if (msg.includes('weak_password')) {
    return 'รหัสผ่านคาดเดาง่ายเกินไป';
  }
  
  // Database or other errors
  if (msg.includes('database error')) {
    return 'เกิดข้อผิดพลาดที่ระบบฐานข้อมูล กรุณาลองใหม่ในภายหลัง';
  }
  
  // Default fallback (shows the original English but nicely formatted)
  return `เกิดข้อผิดพลาด: ${errorMsg}`;
}
