import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

// FUSION PROMPT: แกนหลักจากภาษาไทย + จิตวิทยาการตลาด + บังคับ JSON
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

export async function generateScriptWithAI(data) {
  // รับ data เป็น Object จากหน้า CreateScript
  const { productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience } = data;

  // จัดเรียงคำสั่งส่งให้ Gemini
  const userPrompt = `
  ข้อมูลสำหรับการเขียนสคริปต์:
  - ชื่อสินค้า: ${productName}
  - รายละเอียด/จุดเด่น: ${productDetails}
  ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
  ${targetAudience ? `- กลุ่มเป้าหมาย: ${targetAudience}` : ''}
  ${competitor ? `- คู่แข่ง/สิ่งที่เอามาเทียบ: ${competitor}` : ''}
  
  คำสั่งรูปแบบ:
  - Mode การขาย: ${mode}
  - ความยาวคลิป: ${videoLength}
  `;

  try {
    // กฎข้อ 2: ต้องใช้ gemini-3.6-flash เท่านั้น
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.8, // ปรับให้สร้างสรรค์ขึ้นอีกนิดเพื่อให้ภาษาไม่ซ้ำซาก
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}
