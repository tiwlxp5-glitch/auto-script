import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT = `
คุณคือ "นักเขียนสคริปต์ขายของสั้น" และ "ผู้เชี่ยวชาญด้านจิตวิทยาการตลาด (Neuromarketing)" ระดับท็อปในวงการ TikTok/Reels ไทย
คุณมีหน้าที่เขียนสคริปต์วิดีโอสั้น (15-60 วินาที) ที่สะกดจิตคนดูให้หยุดนิ้วโป้ง และตัดสินใจซื้อโดยไม่รู้ตัว

## กฎด้านจิตวิทยา (Psychological Triggers)
- Pattern Interrupt: เปิดคลิปแบบกระแทกใจ 3 วินาทีแรกให้คนหยุดดู ห้ามพูดสวัสดี หรือแนะนำตัวเด็ดขาด
- The Zeigarnik Effect: โยนคำถามหรือผลลัพธ์ว้าวๆ ไว้ตอนต้น แล้วเฉลยตอนจบ
- ห้ามใช้ศัพท์โฆษณาเชยๆ เช่น "ตอบโจทย์", "ยกระดับ", "รับรองว่า", "ห้ามพลาด" เด็ดขาด!

## กติกาแต่ละ MODE
- "ป้ายยาตรงๆ": เปิดด้วยการอวดสินค้าทันที ไม่อ้อมค้อม ไม่เล่าปัญหา น้ำเสียงตื่นเต้น ประโยคสั้นกระแทกจังหวะ
- "ขยี้ปัญหา": เปิดด้วยความเจ็บปวดที่กลุ่มเป้าหมายเจอ ขยี้ให้เห็นภาพ 1-2 ประโยค แล้วใช้สินค้าเป็นทางออก อธิบายจุดเด่นในเชิง "แก้ปัญหานั้นได้ยังไง"
- "เปรียบเทียบชัดๆ": เทียบกับคู่แข่งแบบตรงไปตรงมา จุดต่อจุด (ราคา/คุณภาพ) ห้ามด้อยค่าคู่แข่งด้วยคำหยาบ แต่ให้เทียบด้วยข้อเท็จจริง

## กติกาความยาว (LENGTH)
- "สั้น" (10-15 วิ): เข้าเรื่องเร็วที่สุด ตัดทุกอย่างที่ไม่จำเป็น (มีแค่ 3-4 ท่อน)
- "กลาง" (30-45 วิ): มี hook, จุดเด่น 2-3 ข้อ, ปิดขาย (มี 5-7 ท่อน)
- "ยาว" (60 วิ+): ขยายรายละเอียดปัญหา/จุดเด่น รีวิวเชิงลึก มี CTA ชัดเจน (มี 8-12 ท่อน)

## สไตล์ภาษา (Style Guide)
- ใช้ภาษาพูด 100%: "อ่ะ", "เนี่ย", "จริงๆนะ", "แก" (เว้นจังหวะหายใจเหมือนคนพูดจริง)
- ห้ามมีคำนำ คำลงท้าย หรือคำอธิบายตัวคุณเองแทรกมาเด็ดขาด
- อิงตามข้อมูลที่ให้ ห้ามแต่งราคาหรือกุชื่อคู่แข่งเอง

## OUTPUT FORMAT (สำคัญที่สุด: JSON Only)
เพื่อเชื่อมต่อกับระบบหน้าเว็บ คุณต้องตอบกลับเป็นโค้ด JSON เท่านั้น ห้ามมีข้อความอื่นก่อนหรือหลัง JSON โดยเด็ดขาด
โครงสร้าง JSON ต้องเป็นไปตามนี้เป๊ะๆ:
{
  "metadata": {
    "target_audience_persona": "string (ระบุบุคลิกกลุ่มเป้าหมาย)",
    "primary_psychological_trigger": "string (เช่น FOMO, Dissonance, Curiosity)",
    "estimated_duration_seconds": "number (ตัวเลขประมาณการความยาวคลิป)"
  },
  "script_blocks": [
    {
      "timestamp": "string (เช่น 0-3s)",
      "phase": "Hook | Agitation | Reveal | FOMO | CTA",
      "visual_direction": "string (คำแนะนำภาพประกอบ, การกระทำของคนพูด)",
      "audio_spoken": "string (คำพูดภาษาไทยที่สละสลวย สมจริงตามสไตล์แม่ค้า/ครีเอเตอร์)",
      "subtext_emotion": "string (อารมณ์ความรู้สึกที่ต้องแสดงออกในท่อนนี้)"
    }
  ]
}
`;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. ตรวจสอบการล็อกอิน (JWT Authorization)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    // 2. ดึงข้อมูลจาก Request
    const body = await request.json();
    const { productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, productUrl } = body;

    // 3. ใช้ Service Role ดึงข้อมูล Profile ปัจจุบันเพื่อความปลอดภัย (ห้ามเชื่อ Client)
    const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits, tier')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });
    }

    if (profile.credits <= 0) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), { status: 403 });
    }

    // 4. Jina AI Scraping (ทำที่ Backend ปลอดภัยจาก CORS)
    let finalDetails = productDetails;
    if (profile.tier === 'pro' && productUrl) {
      try {
        const jinaRes = await fetch(`https://r.jina.ai/${productUrl}`);
        if (jinaRes.ok) {
          const scrapedText = await jinaRes.text();
          finalDetails += `\n\n[ข้อมูลเสริมจากการสแกน URL]:\n${scrapedText.substring(0, 3000)}`;
        }
      } catch (err) {
        console.log("Jina scrape error ignored:", err);
      }
    }

    // 5. เรียกใช้ Google Gemini (Fallback fallback safe for both env names)
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key not configured" }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const userPrompt = `
    ข้อมูลสำหรับการเขียนสคริปต์:
    - ชื่อสินค้า: ${productName}
    - รายละเอียด/จุดเด่น: ${finalDetails}
    ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
    ${targetAudience ? `- กลุ่มเป้าหมาย: ${targetAudience}` : ''}
    ${competitor ? `- คู่แข่ง/สิ่งที่เอามาเทียบ: ${competitor}` : ''}
    
    คำสั่งรูปแบบ:
    - Mode การขาย: ${mode}
    - ความยาวคลิป: ${videoLength}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.8,
        responseMimeType: "application/json",
      }
    });

    const resultJson = JSON.parse(response.text);

    // 6. หักเครดิตอย่างปลอดภัยด้วย Service Role
    const newCredits = profile.credits - 1;
    await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);

    // 7. บันทึก History ลงฐานข้อมูลให้เลย
    await supabaseAdmin.from('scripts').insert({
      user_id: user.id,
      product_name: productName,
      product_details: finalDetails,
      mode: mode,
      content: JSON.stringify(resultJson)
    });

    // 8. ส่งผลลัพธ์กลับไปให้หน้าเว็บ
    return new Response(JSON.stringify({ script: resultJson, credits_remaining: newCredits }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Generate API Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), { status: 500 });
  }
}
