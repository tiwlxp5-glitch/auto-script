import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT_SINGLE = `
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
1. "ขยี้ปัญหา (PAS Formula)": Problem -> Agitate -> Solution & CTA.
2. "นักเล่าเรื่อง (Hook-Story-Offer)": Hook -> Story -> Offer & CTA.
3. "โชว์การเปลี่ยนแปลง (BAB Formula)": Before -> After -> Bridge & CTA.
4. "สายสเปค/ฟังก์ชัน (FAB Formula)": Feature -> Advantage -> Benefit & CTA.
5. "เปรียบเทียบชัดๆ": Compare product against generic competitors directly (Price/Quality/Outcome).

## Length Constraints
- "สั้น" (10-15 วิ): 3-4 fast-paced blocks.
- "กลาง" (30-45 วิ): 5-7 blocks.
- "ยาว" (60 วิ+): 8-12 blocks.

## Output Constraints
You MUST output ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
The output values MUST BE IN THAI (except for the JSON keys).
CRITICAL: You MUST escape all double quotes inside string values.
CRITICAL: Do NOT use raw newlines or line breaks inside string values.

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
      "visual_direction": "String (Thai: What to show on screen)",
      "audio_spoken": "String (Thai: The spoken script. 100% natural conversational Thai)",
      "subtext_emotion": "String (Thai: The emotion the actor should convey)"
    }
  ]
}
`;

const SYSTEM_PROMPT_MULTI = `
You are an elite Short-Form Video Scriptwriter and Neuromarketing Expert specializing in the Thai TikTok/Reels e-commerce market (Affiliate/ปักตะกร้า).
Your goal is to write highly engaging, 15-60 second video scripts that hack the viewer's attention and drive impulse purchases.

## Asian Market Psychology & Copywriting Formulas (CRITICAL)
- Native UGC Tone: Do not sound like a corporate ad. Sound like a real user reviewing a product to a friend. Use natural Thai spoken language ("แก", "เนี่ย", "เดี๋ยว"). No formal greetings like "สวัสดีครับ".
- Fast Pacing: Visual changes or text popups every 2-3 seconds to keep the dopamine loop active.
- Proven Formulas: You must apply proven formulas like PAS (Problem-Agitate-Solution), Hook-Story-Offer, and BAB (Before-After-Bridge).

## MULTI-VERSION OUTPUT CONSTRAINT
You MUST output EXACTLY 3 distinct versions of the script wrapped in specific XML tags. 
Inside EACH XML tag, you MUST output ONLY valid JSON format (No markdown blocks like \`\`\`json).
CRITICAL: You MUST escape all double quotes inside string values.
CRITICAL: Do NOT use raw newlines or line breaks inside string values.

<VERSION_FUNNY>
(JSON output here for a Funny/Entertaining script. Use a humorous, relatable, out-of-the-box Hook. Break the fourth wall if necessary. Make it highly shareable.)
</VERSION_FUNNY>

<VERSION_REVIEW>
(JSON output here for an Authentic Review script. Use the PAS (Problem-Agitate-Solution) formula. Sound highly credible, trustworthy, and realistic. Focus on honest benefits and solving a real pain point.)
</VERSION_REVIEW>

<VERSION_FOMO>
(JSON output here for an Urgency/FOMO script. Use the Hook-Story-Offer formula. Hard sell, extremely urgent, flash sale vibes, pushing the user to click the yellow basket immediately.)
</VERSION_FOMO>

## JSON Structure (For inside each XML tag)
{
  "metadata": {
    "target_audience_persona": "String (Thai: Describe the target audience persona)",
    "primary_psychological_trigger": "String (Thai/English: e.g., FOMO, Social Proof, Humor)",
    "estimated_duration_seconds": Number
  },
  "script_blocks": [
    {
      "timestamp": "String (e.g., 0-3s)",
      "phase": "Hook | Problem | Agitation | Solution | Reveal | FOMO | CTA",
      "visual_direction": "String (Thai: What to show on screen/B-Roll/Text Popups)",
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
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e.message, "Raw:", cleaned);
    throw new Error("AI ตอบกลับข้อมูลมาในรูปแบบที่อ่านไม่ได้ (มีอักขระพิเศษ) กรุณากดสร้างสคริปต์ใหม่อีกครั้งครับ");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let creditDeducted = false;
  let creditAmount = 1;
  let userIdForRefund = null;
  let supabaseAdmin = null;

  try {
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

    const body = await request.json();
    const { productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, isMultiVersion } = body;

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

    if (isMultiVersion && effectiveTier !== 'pro') {
      return new Response(JSON.stringify({ error: 'Multi-version scripts require Pro tier.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    creditAmount = isMultiVersion ? 2 : 1;
    userIdForRefund = user.id;

    const { data: updatedCredits, error: creditError } = await supabaseAdmin.rpc('increment_credits', {
      p_user_id: user.id,
      p_amount: -creditAmount
    });
    
    if (creditError) {
      return new Response(JSON.stringify({ error: "Failed to deduct credits" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (updatedCredits === null || updatedCredits < 0) {
      return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }
    creditDeducted = true;
    let remainingCredits = updatedCredits;

    const finalTargetAudience = (effectiveTier === 'plus' || effectiveTier === 'pro') ? targetAudience : null;
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
    - รายละเอียด/จุดเด่น: ${productDetails}
    ${pricePromo ? `- ราคา/โปรโมชั่น: ${pricePromo}` : ''}
    ${finalTargetAudience ? `- กลุ่มเป้าหมาย: ${finalTargetAudience}` : ''}
    ${competitor ? `- คู่แข่ง/สิ่งที่เอามาเทียบ: ${competitor}` : ''}
    
    คำสั่งรูปแบบ:
    ${!isMultiVersion ? `- Mode การขาย: ${mode}` : '- สร้างทีเดียว 3 สไตล์: ตลก, รีวิวจริงใจ, กระตุ้นด่วน'}
    - ความยาวคลิป: ${videoLength}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userPrompt,
      config: {
        systemInstruction: isMultiVersion ? SYSTEM_PROMPT_MULTI : SYSTEM_PROMPT_SINGLE,
        temperature: 0.8,
        responseMimeType: isMultiVersion ? "text/plain" : "application/json",
      }
    });

    let resultJson = null;
    let rawOutput = response.text;
    
    if (isMultiVersion) {
      const funnyMatch = rawOutput.match(/<VERSION_FUNNY>([\s\S]*?)<\/VERSION_FUNNY>/);
      const reviewMatch = rawOutput.match(/<VERSION_REVIEW>([\s\S]*?)<\/VERSION_REVIEW>/);
      const fomoMatch = rawOutput.match(/<VERSION_FOMO>([\s\S]*?)<\/VERSION_FOMO>/);
      
      if (!funnyMatch || !reviewMatch || !fomoMatch) {
        throw new Error("AI ตอบกลับข้อมูลไม่ครบ 3 รูปแบบ กรุณากดสร้างสคริปต์ใหม่อีกครั้ง");
      }
      
      safeParseJson(funnyMatch[1]);
      safeParseJson(reviewMatch[1]);
      safeParseJson(fomoMatch[1]);
      
      resultJson = { raw_multi_version: rawOutput };
    } else {
      resultJson = safeParseJson(rawOutput);
    }

    // 6. บันทึก History ลงฐานข้อมูล scripts เป็นลำดับแรก (Save first)
    // Input length boundaries to prevent abuse (INF-01)
    const { error: insertError } = await supabaseAdmin.from('scripts').insert({
      user_id: user.id,
      product_name: (productName || '').slice(0, 100),
      product_details: (productDetails || '').slice(0, 2000),
      mode: isMultiVersion ? 'Pro_MultiVersion' : mode,
      content: JSON.stringify(resultJson)
    });

    if (insertError) {
      console.error("Failed to insert script:", insertError);
      
      // ROLLBACK: Refund exact deducted amount
      await supabaseAdmin.rpc('increment_credits', {
        p_user_id: user.id,
        p_amount: creditAmount
      });
      
      // CRITICAL FIX (DB-06): Reset flag so outer catch does NOT issue a SECOND refund
      creditDeducted = false;
      
      throw new Error("Failed to save script history");
    }

    // 7. Deduct Trial Quota if used
    let updatedTrialRemaining = profile.trial_pro_remaining;
    if (profile.tier === 'free' && profile.trial_pro_remaining > 0) {
      updatedTrialRemaining = Math.max(0, profile.trial_pro_remaining - creditAmount);
      await supabaseAdmin.from('profiles').update({ 
        trial_pro_remaining: updatedTrialRemaining 
      }).eq('id', user.id);
    }

    return new Response(JSON.stringify({ 
      script: resultJson,
      credits_remaining: remainingCredits,
      trial_pro_remaining: updatedTrialRemaining
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    if (creditDeducted && userIdForRefund) {
      console.error("Execution failed after deduction. Issuing compensatory refund:", err);
      try {
        // CRITICAL FIX (DB-07): Refund the exact creditAmount (1 or 2), NOT hardcoded 1
        await supabaseAdmin.rpc('increment_credits', { 
          p_user_id: userIdForRefund, 
          p_amount: creditAmount 
        });
      } catch (refundErr) {
        console.error("Failed to execute compensatory refund:", refundErr);
      }
    }
    console.error("Generate API Error:", err);
    
    let errorMessage = err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้งครับ";
    if (typeof errorMessage === 'string') {
      if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
        errorMessage = "ขณะนี้ระบบ AI ของ Google กำลังมีผู้ใช้งานหนาแน่น (503 Service Unavailable) ระบบได้คืนเครดิตให้คุณแล้ว กรุณาลองกดสร้างใหม่อีกครั้งครับ";
      } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "ระบบ AI ของ Google กำลังทำงานหนักเกินไป (429 Too Many Requests) ระบบได้คืนเครดิตให้คุณแล้ว กรุณารอสักครู่แล้วลองใหม่ครับ";
      } else if (errorMessage.startsWith('{')) {
        try {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error && parsed.error.message) {
            errorMessage = "ข้อผิดพลาดจาก AI: " + parsed.error.message;
          }
        } catch (e) {
          // fallback to original string
        }
      }
    }

    return new Response(JSON.stringify({ 
      error: errorMessage
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
