import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT = `
You are an elite Short-Form Video Scriptwriter and Neuromarketing Expert specializing in the Thai TikTok/Reels e-commerce market (Affiliate/ปักตะกร้า).
Your goal is to write highly engaging, 15-60 second video scripts that hack the viewer's attention and drive impulse purchases.

## Asian Market Psychology & FOMO Tactics (CRITICAL)
- Scarcity & Urgency: Always use triggers like "Flash sale," "Only X left," or "Exclusive for this video." Thais respond heavily to scarcity.
- Social Proof (Herd Mentality): Trigger FOMO by stating the product is highly viral, constantly out of stock, or loved by everyone.
- Native UGC Tone: Do not sound like a corporate ad. Sound like a real user reviewing a product to a friend. Use natural Thai spoken language ("อ่ะ", "เนี่ย", "แก"). No formal greetings like "สวัสดีครับ".
- Fast Pacing: The script must dictate visual changes or text popups every 2-3 seconds to keep the dopamine loop active.

## The 4 U's (For the First 5 Seconds / The Hook)
Every hook MUST be: Urgent, Unique, Useful, and Ultra-specific. Do not use generic hooks.

## Scripting Frameworks (MODE)
You will receive a specific "Mode". Follow its structure strictly:
1. "ขยี้ปัญหา (PAS Formula)": 
   - Problem: Agitate a specific pain point immediately.
   - Agitate: Make the problem feel worse (costly, annoying, embarrassing).
   - Solution & CTA: Introduce the product as the hero. Tell them to click the basket (Point & Command).
2. "นักเล่าเรื่อง (Hook-Story-Offer)": 
   - Hook: Shocking statement or relatable scenario.
   - Story: Share a short, emotional personal experience or turning point.
   - Offer: Transition smoothly to an irresistible deal and urgency.
3. "โชว์การเปลี่ยนแปลง (BAB Formula)": 
   - Before: Describe the terrible past situation or pain.
   - After: Paint the picture of the perfect dream state.
   - Bridge: Reveal the product as the secret that bridged the gap.
4. "สายสเปค/ฟังก์ชัน (FAB Formula)": 
   - Feature: State a technical feature.
   - Advantage: Explain how it works practically.
   - Benefit: Translate it into an emotional, life-improving benefit (Why they should care).
5. "เปรียบเทียบชัดๆ": 
   - Compare the product against generic competitors directly (Price/Quality/Outcome).
   - Use factual comparisons. Do not use crude language against competitors.

## Length Constraints
- "สั้น" (10-15 วิ): 3-4 fast-paced blocks.
- "กลาง" (30-45 วิ): 5-7 blocks.
- "ยาว" (60 วิ+): 8-12 blocks.

## Output Constraints
You MUST output ONLY valid JSON.
The output values MUST BE IN THAI (except for the JSON keys).

{
  "metadata": {
    "target_audience_persona": "String (Thai: Describe the target audience persona)",
    "primary_psychological_trigger": "String (Thai/English: e.g., FOMO, Social Proof, Scarcity)",
    "estimated_duration_seconds": Number
  },
  "script_blocks": [
    {
      "timestamp": "String (e.g., 0-3s)",
      "phase": "Hook | Agitation | Story | Reveal | Offer | FOMO | CTA",
      "visual_direction": "String (Thai: What to show on screen. Must use 'Show, Don't Tell' rule in the first 3s)",
      "audio_spoken": "String (Thai: The spoken script. 100% natural conversational Thai)",
      "subtext_emotion": "String (Thai: The emotion the actor should convey)"
    }
  ]
}
`;

function safeParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('AI_EMPTY_RESPONSE');
  }
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let creditDeducted = false;
  let userIdForRefund = null;
  let supabaseAdmin = null;

  try {
    // 1. ตรวจสอบการล็อกอิน (JWT Authorization)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. ดึงข้อมูลจาก Request
    const body = await request.json();
    const { productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, productUrl, productUrls } = body;

    // 3. ใช้ Service Role ดึงข้อมูล Profile ป้องกันการปลอมแปลง (ปลอดภัยกว่า Client)
    supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const effectiveTier = (profile.tier === 'free' && profile.trial_pro_remaining > 0) ? 'pro' : profile.tier;

    // 4. Jina AI Scraping (ทำที่ Backend หมดปัญหา CORS - เฉพาะ Tier Pro หรือ Trial Pro)
    userIdForRefund = user.id;
    const { data: updatedCredits, error: creditError } = await supabaseAdmin.rpc('increment_credits', {
      p_user_id: user.id,
      p_amount: -1
    });
    if (creditError) {
      console.error("RPC increment_credits deduction error:", creditError);
      return new Response(JSON.stringify({ error: "Failed to deduct credits" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (updatedCredits === null || updatedCredits < 0) {
      return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }
    creditDeducted = true;
    let remainingCredits = updatedCredits;

    let finalDetails = productDetails;
    
    // Support backwards compatibility for productUrl (string) and new productUrls (array)
    let rawUrlsToScrape = [];
    if (productUrls && Array.isArray(productUrls)) {
      rawUrlsToScrape.push(...productUrls.filter(u => u.trim() !== ''));
    } else if (productUrl) {
      rawUrlsToScrape.push(productUrl);
    }
    const urlsToScrape = rawUrlsToScrape.slice(0, 3);
    if (effectiveTier === 'pro' && urlsToScrape.length > 0) {
      try {
        const scrapedContents = await Promise.all(urlsToScrape.map(async (url) => {
          const jinaRes = await fetch(`https://r.jina.ai/${encodeURI(url)}`, {
              headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
              signal: AbortSignal.timeout(8000)
            });
          if (jinaRes.ok) {
            const text = await jinaRes.text();
            return `--- ข้อมูลจากเว็บ ${url} ---\n${text.substring(0, 3000)}`;
          }
          return '';
        }));
        
        const combinedScraped = scrapedContents.filter(c => c).join('\n\n');
        if (combinedScraped) {
          finalDetails += `\n\n[ข้อมูลสกัดเพิ่มเติมจาก URL]:\n${combinedScraped}`;
        }
      } catch (err) {
        console.log("Jina scrape error ignored:", err);
      }
    }

    // 4.1 ตรวจสอบสิทธิ์การใช้งาน targetAudience (เฉพาะ Tier Plus และ Pro เท่านั้น)
    const finalTargetAudience = (effectiveTier === 'plus' || effectiveTier === 'pro') ? targetAudience : null;

    // 5. เรียกใช้ Google Gemini (Fallback safe for both env names)
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key not configured" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const userPrompt = `
    ข้อมูลสำหรับการเขียนสคริปต์:
    - ชื่อสินค้า: ${productName}
    - รายละเอียด/จุดเด่น: ${finalDetails}
    ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
    ${finalTargetAudience ? `- กลุ่มเป้าหมาย: ${finalTargetAudience}` : ''}
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

    const resultJson = safeParseJson(response.text);

    // 6. บันทึก History ลงฐานข้อมูล scripts เป็นลำดับแรก (Save first)
    const { error: insertError } = await supabaseAdmin.from('scripts').insert({
      user_id: user.id,
      product_name: productName,
      product_details: finalDetails,
      mode: mode,
      content: JSON.stringify(resultJson)
    });

    if (insertError) {
      throw new Error('Failed to save script history');
    }

    // 8. ส่งผลลัพธ์กลับไปให้หน้าเว็บ
    return new Response(JSON.stringify({ script: resultJson, credits_remaining: remainingCredits }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    if (creditDeducted && userIdForRefund) {
      console.error("Execution failed after deduction. Issuing compensatory refund:", err);
      try {
        await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
      } catch {}
    }
    console.error("Generate API Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
