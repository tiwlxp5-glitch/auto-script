import { Logger } from '../../app/lib/logger.js';

export const onRequest = async (context) => {
  const { request, next } = context;
  const origin = request.headers.get("Origin");
  
  // Initialize context data and logger
  context.data = context.data || {};
  const reqId = crypto.randomUUID();
  context.data.reqId = reqId;
  const logger = new Logger(reqId);
  context.data.logger = logger;
  
  const url = new URL(request.url);
  logger.info(`[Incoming Request] ${request.method} ${url.pathname}`);
  
  // 1. กำหนด Origin (โดเมน) ที่อนุญาตให้เรียก API ได้
  const allowedOrigins = [
    "https://autoscript-ai.com",
    "http://localhost:5173"
  ];
  
  // Fallback พื้นฐาน (ลดความเสี่ยงจากการเปิด '*')
  let corsOrigin = "https://autoscript-ai.com"; 
  
  // ตรวจสอบว่า Origin ที่เรียกเข้ามาอยู่ใน White-list หรือเป็น Cloudflare Preview URL หรือไม่
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith(".pages.dev"))) {
    corsOrigin = origin;
  }

  // 2. Handle CORS preflight requests (สำหรับ OPTIONS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 3. ปล่อย Request ให้ส่งไปประมวลผลที่ฟังก์ชันหลัก (เช่น generate.js)
  const startTime = Date.now();
  const response = await next();
  const duration = Date.now() - startTime;
  
  logger.info(`[Response Out] ${request.method} ${url.pathname} - Status: ${response.status} (${duration}ms)`);

  // 4. สร้าง Response ใหม่เพื่อแนบ Security Headers
  const newResponse = new Response(response.body, response);
  
  // แปะ CORS Headers สำหรับ Response ปกติ
  newResponse.headers.set("Access-Control-Allow-Origin", corsOrigin);
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // แปะ Security Headers พื้นฐานเพื่ออุดช่องโหว่ (Informational)
  newResponse.headers.set("X-Content-Type-Options", "nosniff"); // ป้องกัน MIME-type sniffing
  newResponse.headers.set("X-Frame-Options", "DENY"); // ป้องกัน Clickjacking
  newResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload"); // บังคับใช้ HTTPS
  newResponse.headers.set("X-Request-Id", reqId); // Observability

  return newResponse;
};
