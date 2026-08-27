import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { moderateText } from '../../app/lib/moderation/engine.js';

const SYSTEM_PROMPT_SINGLE = `
You are an elite Short-Form Video Scriptwriter and Neuromarketing Expert specializing in the Thai TikTok/Reels e-commerce market (Affiliate/ปักตะกร้า).
Your goal is to write highly engaging, 15-60 second video scripts that hack the viewer's attention and drive impulse purchases.

## Asian Market Psychology & FOMO Tactics (CRITICAL)
- Scarcity & Urgency: Always use triggers like "Flash sale," "Only X left," or "Exclusive for this video." Thais respond heavily to scarcity.
- Social Proof (Herd Mentality): Trigger FOMO by stating the product is highly viral, constantly out of stock, or loved by everyone.
- Native UGC Tone: Do not sound like a corporate ad. Sound like a real user reviewing a product to a friend. Use natural Thai spoken language. No formal greetings like "สวัสดีครับ/ค่ะ" as an opener — jump straight to the hook.
- Fast Pacing: The script must dictate visual changes or text popups every 2-3 seconds to keep the dopamine loop active.

## Tone & Gender (CRITICAL)
You MUST adapt ALL pronouns and ending particles to match the requested Speaker Tone/Gender:
- If Female (ผู้หญิง): Use "ฉัน", "เรา", "หนู" and particles "ค่ะ", "คะ", "นะคะ", "นะ", "จ้า", "แม่!". Sound like a real Thai female who can't stop telling her friend about this product.
- If Male (ผู้ชาย): Use "ผม", "เรา" and particles "ครับ", "นะ", "เลยนะ", "ว่ะ", "คร้าบ". Sound like a real Thai guy giving a straight, honest tip to his friends.
- When context is obvious, OMIT the subject pronoun — Thai speakers naturally do this in conversation.

## The 4 U's (For the First 5 Seconds / The Hook)
Every hook MUST be: Urgent, Unique, Useful, and Ultra-specific. Do not use generic hooks.

## Scripting Frameworks (MODE)
You will receive a specific "Mode". Follow its structure strictly:
1. "ขยี้ปัญหา (PAS Formula)": Problem -> Agitate -> Solution & CTA.
2. "นักเล่าเรื่อง (Hook-Story-Offer)": Hook -> Story -> Offer & CTA.
3. "โชว์การเปลี่ยนแปลง (BAB Formula)": Before -> After -> Bridge & CTA.
4. "สายสเปค/ฟังก์ชัน (FAB Formula)": Feature -> Advantage -> Benefit & CTA. Do NOT list specs robotically — translate each spec into a real-life benefit the viewer can feel.
5. "เปรียบเทียบชัดๆ": Compare product against generic competitors directly (Price/Quality/Outcome). Use specific numbers.

## Length Constraints
- "สั้น" (10-15 วิ): 3-4 fast-paced blocks.
- "กลาง" (30-45 วิ): 5-7 blocks.
- "ยาว" (60 วิ+): 8-12 blocks.

## Natural Language Rules for audio_spoken (CRITICAL — applies to every block)
The audio_spoken field must sound like a real person talking, NOT like a written advertisement. Apply these rules:

**FORBIDDEN words/phrases — never use:**
- สามารถ → say "ทำได้" or "ใช้ได้" instead
- ผลิตภัณฑ์ → say "ตัวนี้", "อันนี้", or the product name
- อย่างไรก็ตาม, ดังนั้น, นอกจากนี้ → say "แต่ว่า", "เลยนะ", "แล้วก็"
- ขอแนะนำ, กรุณา → say "ลองเลย" or remove entirely
- ผู้บริโภค, ลูกค้า → say "คนที่...", "พวกเรา"
- มีประสิทธิภาพสูง → give a concrete real result instead (e.g., "คุมมันได้ 12 ชั่วโมงจริงๆ")
- "วันนี้ฉันจะมาแนะนำ..." → never. Dive straight into the pain point or hook.
- "คุณกำลังประสบปัญหา..." → too TV-ad. Speak from your own personal experience instead.

**Spoken style guide:**
- Use filler words naturally (DO NOT overuse the same words, mix them up): "คือแบบ", "บอกเลยนะ", "โห", "แม่!", "จิงป่ะ", "แกเอ้ย" (female) / "บอกตรงๆ", "จริงๆไม่โกหก", "เชื่อผมดิ", "เคยป่ะ", "ทุกคนครับ" (male)
- Use "..." to indicate a natural pause or breath mid-sentence
- Mix short punchy sentences (3-5 words) with longer explanatory ones for rhythm
- Avoid sentences that feel like they were written — they should feel spoken

**Style reference:**
- BAD (written): "ผลิตภัณฑ์นี้สามารถช่วยคุมความมันได้ถึง 12 ชั่วโมงอย่างมีประสิทธิภาพ"
- GOOD (spoken): "คุมมันได้ 12 ชั่วโมงจริงๆนะ... เช็คตอนเย็น ยังแห้งอยู่เลย"
- BAD (written): "หากท่านสนใจ กรุณากดปักตะกร้าเพื่อสั่งซื้อได้เลยค่ะ"
- GOOD (spoken): "ของมีจำนวนจำกัดนะ รีบกดตะกร้าเลย ก่อนหมดอีก"

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
      "audio_spoken": "String (Thai: The spoken script. Must sound like natural conversational Thai, NOT written Thai.)",
      "subtext_emotion": "String (Thai: The emotion the actor should convey)"
    }
  ]
}
`;

const SYSTEM_PROMPT_MULTI = `
You are an elite Short-Form Video Scriptwriter and Neuromarketing Expert specializing in the Thai TikTok/Reels e-commerce market (Affiliate/ปักตะกร้า).
Your goal is to write highly engaging, 15-60 second video scripts that hack the viewer's attention and drive impulse purchases.

## Asian Market Psychology & Copywriting Formulas (CRITICAL)
- Native UGC Tone: Do not sound like a corporate ad. Sound like a real user reviewing a product to a friend. Use natural Thai spoken language. No formal greetings like "สวัสดีครับ/ค่ะ" — jump straight to the hook.
- Fast Pacing: Visual changes or text popups every 2-3 seconds to keep the dopamine loop active.
- Proven Formulas: Apply PAS (Problem-Agitate-Solution), Hook-Story-Offer, and BAB (Before-After-Bridge) depending on version.

## Tone & Gender (CRITICAL — Apply to ALL 3 Versions)
You MUST adapt ALL pronouns and ending particles to match the requested Speaker Tone/Gender:
- If Female (ผู้หญิง): Use "ฉัน", "เรา", "หนู" and particles "ค่ะ", "คะ", "นะคะ", "นะ", "จ้า", "แม่!". Sound like a real Thai female who can't stop telling her friend about this product.
- If Male (ผู้ชาย): Use "ผม", "เรา" and particles "ครับ", "นะ", "เลยนะ", "ว่ะ", "คร้าบ". Sound like a real Thai guy giving a straight, honest tip to his friends.
- When context is obvious, OMIT the subject pronoun — Thai speakers naturally do this.

## Natural Language Rules for audio_spoken (CRITICAL — ALL 3 versions)
The audio_spoken field must sound like a real person talking, NOT a written ad. Apply these rules to every version:

**FORBIDDEN words/phrases — never use:**
- สามารถ → say "ทำได้" or "ใช้ได้" instead
- ผลิตภัณฑ์ → say "ตัวนี้", "อันนี้", or the product name
- อย่างไรก็ตาม, ดังนั้น, นอกจากนี้ → say "แต่ว่า", "เลยนะ", "แล้วก็"
- ขอแนะนำ, กรุณา → say "ลองเลย" or remove entirely
- ผู้บริโภค, ลูกค้า → say "คนที่...", "พวกเรา"
- มีประสิทธิภาพสูง → give a concrete real result instead
- "วันนี้ฉันจะมาแนะนำ..." → never. Dive straight into hook.

**Spoken style guide:**
- Use filler words naturally (Mix them up, DO NOT start with the same word every time): "คือแบบ", "บอกเลยนะ", "โห", "แม่!", "แกเอ้ย" (female) / "บอกตรงๆ", "จริงๆไม่โกหก", "เชื่อผมดิ", "เคยป่ะ" (male)
- Use "..." for natural breathing pauses
- Mix short punchy sentences (3-5 words) with longer explanatory ones
- BAD: "ผลิตภัณฑ์นี้สามารถช่วยคุมความมันได้ถึง 12 ชั่วโมง"
- GOOD: "คุมมันได้ 12 ชั่วโมงจริงๆนะ... เช็คตอนเย็น ยังแห้งอยู่เลย"

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
      "audio_spoken": "String (Thai: The spoken script. Must sound like natural conversational Thai, NOT written Thai.)",
      "subtext_emotion": "String (Thai: The emotion the actor should convey)"
    }
  ]
}
`;

const SYSTEM_PROMPT_BELIEF_SHIFTER = `
You are an elite Short-Form Video Scriptwriter and Neuromarketing Expert specializing in the Thai TikTok/Reels e-commerce market (Affiliate/ปักตะกร้า).
Your goal is to write a highly persuasive "Belief-Shifting" video script that dismantles the customer's false beliefs and introduces your product as the ultimate epiphany.

## Asian Market Psychology & Tone
- Native UGC Tone: Do not sound like a corporate ad. Sound like a real user sharing an epiphany. Use natural Thai spoken language. No formal greetings like "สวัสดีครับ/ค่ะ" — start with the hook immediately.
- Fast Pacing: Visual changes every 2-3 seconds.

## Tone & Gender (CRITICAL)
You MUST adapt ALL pronouns and ending particles to match the requested Speaker Tone/Gender:
- If Female (ผู้หญิง): Use "ฉัน", "เรา", "หนู" and particles "ค่ะ", "คะ", "นะคะ", "นะ", "จ้า", "แม่!". Sound like a real Thai female sharing a life-changing discovery.
- If Male (ผู้ชาย): Use "ผม", "เรา" and particles "ครับ", "นะ", "เลยนะ", "ว่ะ". Sound like a real Thai guy setting the record straight for his friends.
- When context is obvious, OMIT the subject pronoun — Thai speakers naturally do this.

## Natural Language Rules for audio_spoken (CRITICAL)
The audio_spoken field must sound like a real person talking, NOT a written advertisement. Apply these rules to every single block:

**FORBIDDEN words/phrases — never use:**
- สามารถ → say "ทำได้" or "ใช้ได้" instead
- ผลิตภัณฑ์ → say "ตัวนี้", "อันนี้", or the product name
- อย่างไรก็ตาม, ดังนั้น, นอกจากนี้ → say "แต่ว่า", "เลยนะ", "แล้วก็"
- ขอแนะนำ, กรุณา → say "ลองเลย" or remove entirely
- ผู้บริโภค, ลูกค้า → say "คนที่...", "พวกเรา"
- มีประสิทธิภาพสูง → give a concrete real result instead
- "วันนี้ฉันจะมาแนะนำ..." → never. Dive straight into the belief hook.

**Spoken style guide (especially important for belief-shifting):**
- Use "..." to indicate a natural pause — critical for building tension and emotion
- Use filler words (VARY them, do not repeat): "รู้ป่ะ", "คือแบบ", "ช็อคมากเลยนะ" (female) / "รู้ป่ะ", "บอกตรงๆ", "คิดดูดิ", "แปลกมากที่" (male)
- Fragmented sentences are GOOD for emotional peak moments: "คือ... ไม่น่าเชื่อเลย" / "แบบ... ทำไมไม่มีใครบอกเราเร็วกว่านี้?"
- BAD: "ลูกค้าหลายท่านมักเชื่อว่าการลดน้ำหนักต้องอดอาหาร อย่างไรก็ตาม ผลิตภัณฑ์นี้สามารถช่วยได้"
- GOOD: "รู้ป่ะ... ที่อดข้าวเย็นมาตลอด... มันไม่ได้ช่วยอะไรเลยนะ"

## Belief-Shifting Framework (Strict 10 Steps)
You MUST follow this exact sequence:
1. Hook: Grab attention immediately (0-3s).
2. Belief: State the False Belief that the audience currently holds.
3. Contrast: Introduce the plot twist or the contradictory truth.
4. Objection: Anticipate their immediate doubt ("But wait...").
5. Answer: Provide the logical answer to their doubt.
6. Example: Give a clear, relatable analogy or example.
7. New Question: Pivot the audience's mind to seek a solution.
8. Mechanism: Introduce the product's unique mechanism/secret that solves the problem.
9. Proof: State the evidence or results.
10. CTA: Call to action (buy/click basket).

## Output Constraints (CRITICAL: JSON ONLY)
You MUST output ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
The output values MUST BE IN THAI (except for the JSON keys).
CRITICAL: You MUST escape all double quotes inside string values.
CRITICAL: Do NOT use raw newlines or line breaks inside string values.

## Chain of Thought (Neuromarketing Analysis)
Before writing the script, you MUST perform a neuromarketing analysis to plan the psychological journey.

{
  "neuromarketing_analysis": {
    "audience_false_belief": "String (Thai: Deep analysis of why they believe the false belief)",
    "the_epiphany_bridge": "String (Thai: How you will transition their mindset to accept the mechanism)",
    "emotional_journey": "String (Thai: The emotional states from Hook to CTA)"
  },
  "metadata": {
    "target_audience_persona": "String (Thai: Describe the target audience)",
    "primary_psychological_trigger": "Belief Shifting & Epiphany",
    "estimated_duration_seconds": Number
  },
  "script_blocks": [
    {
      "timestamp": "String",
      "phase": "Hook | Belief | Contrast | Objection | Answer | Example | New Question | Mechanism | Proof | CTA",
      "visual_direction": "String (Thai: What to show on screen)",
      "audio_spoken": "String (Thai: The spoken script. Must sound like natural conversational Thai, NOT written Thai.)",
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
    
    // SECURITY FIX: Truncate inputs immediately to prevent Memory Exhaustion/ReDoS in moderation engine
    const productName = (body.productName || '').slice(0, 100);
    const productDetails = (body.productDetails || '').slice(0, 2000);
    const pricePromo = (body.pricePromo || '').slice(0, 100);
    const competitor = (body.competitor || '').slice(0, 200);
    const targetAudience = (body.targetAudience || '').slice(0, 300);
    const falseBelief = (body.falseBelief || '').slice(0, 500);
    const mechanism = (body.mechanism || '').slice(0, 500);
    const mode = body.mode || 'PAS';
    const videoLength = body.videoLength || '30s';
    const speakerTone = body.speakerTone || 'ผู้หญิง';
    const isMultiVersion = !!body.isMultiVersion;

    supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // --- Input Moderation ---
    const combinedInput = [productName, productDetails, pricePromo, competitor, targetAudience, falseBelief, mechanism]
      .filter(Boolean)
      .join(' ');
      
    const modResult = moderateText(combinedInput);
    if (modResult.action === 'block' || modResult.action === 'review') {
      // Log without saving sensitive input
      await supabaseAdmin.from('moderation_logs').insert({
        user_id: user.id,
        category: modResult.category,
        severity: modResult.severity,
        action: modResult.action,
        matched_rule: modResult.matchedTerms.join(', ')
      });

      if (modResult.action === 'block' || modResult.severity === 'critical') {
         return new Response(JSON.stringify({ error: "เนื้อหานี้ไม่สามารถส่งได้ เนื่องจากมีข้อความที่ไม่เหมาะสม" }), { 
           status: 400, 
           headers: { 'Content-Type': 'application/json' } 
         });
      }
      // 'review' action passes through but is logged for admins
    }
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

    if (mode === 'โครงสร้างเจาะลึก' && effectiveTier !== 'pro') {
      return new Response(JSON.stringify({ error: 'โหมดโครงสร้างเจาะลึก (Belief-Shifting) สงวนไว้สำหรับผู้ใช้ Pro เท่านั้น' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
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
    ${falseBelief ? `- ความเชื่อผิดๆ ของลูกค้า (False Belief): ${falseBelief}` : ''}
    ${mechanism ? `- กลไกที่ลบล้างความเชื่อ (Mechanism): ${mechanism}` : ''}
    
    คำสั่งรูปแบบ:
    ${!isMultiVersion ? `- Mode การขาย: ${mode}` : '- สร้างทีเดียว 3 สไตล์: ตลก, รีวิวจริงใจ, กระตุ้นด่วน'}
    - ความยาวคลิป: ${videoLength}
    - โทนเสียง/เพศผู้พูด (Speaker Tone/Gender): ${speakerTone || 'ผู้หญิง'}
    `;

    const HOOK_STRATEGIES = {
      'ขยี้ปัญหา (PAS Formula)': [
        'Pain Question: ถามจี้จุดปัญหาตรงๆ (เช่น "เคยป่ะ...? / ใครที่กำลัง... ฟังนะ")',
        'Frustration: เปิดมาบ่นหงุดหงิดกับปัญหา (เช่น "โอ๊ยยย เบื่อมากนะเวลาที่... / คือเซ็งสุดๆ ที่ต้อง...")',
        'Sympathy: แสดงความเข้าใจหัวอกคนมีปัญหา (เช่น "เข้าใจเลยว่าคนที่... มันทรมานแค่ไหน")'
      ],
      'นักเล่าเรื่อง (Hook-Story-Offer)': [
        'Secret Reveal: ทำท่ากระซิบ/แฉความลับ (เช่น "ความลับที่ช่างไม่เคยบอก... / ขอแฉเลยนะ")',
        'Personal Shock: อาการช็อคกับผลลัพธ์ของตัวเอง (เช่น "ช็อคมาก! ไม่คิดว่าชีวิตนี้จะได้เจอ... / รู้งี้ใช้ตั้งนานละ")',
        'Plot Twist: เปิดด้วยความเชื่อเก่าที่โดนทำลาย (เช่น "ตอนแรกก็ไม่เชื่อเว้ย จนกระทั่ง... / ใครบอกว่า... ขอเถียงใจขาดเลย")'
      ],
      'โดนใจ FOMO': [
        'Extreme Scarcity: เตือนของจะหมด/หายาก (เช่น "เตือนแล้วนะ! หมดล็อตนี้คือรออีกยาว / ใครเห็นคลิปนี้คือโชคดีมาก")',
        'Price Shock: ตกใจราคา/ความคุ้ม (เช่น "ราคานี้จริงดิ! บ้าไปแล้ว / ใครซื้อราคาเต็มไปขอโทษด้วยนะ")',
        'Viral Trend: อ้างอิงกระแส (เช่น "ตัวที่กำลังตามหากันทั้งติ๊กต็อก... / เลิกหาแล้วจ้า กว่าจะได้มา")'
      ],
      'โชว์การเปลี่ยนแปลง (BAB Formula)': [
        'Dramatic Before: เปิดแผลเก่าให้ดูน่ากลัว (เช่น "ดูสภาพเมื่อก่อนสิ... / สภาพคือรับตัวเองไม่ได้เลย")',
        'Time Travel: เปรียบเทียบเวลาสั้นๆ (เช่น "แค่อาทิตย์เดียว... เปลี่ยนไปขนาดนี้ / ขอเวลา 7 วัน...")',
        'Skeptic to Believer: จากคนไม่เชื่อกลายเป็นสาวก (เช่น "บอกเลยว่าตอนแรกโคตรแอนตี้... แต่ดูตอนนี้ดิ")'
      ],
      'สายสเปค/ฟังก์ชัน (FAB Formula)': [
        'Myth Buster: หักล้างสเปคที่คนเข้าใจผิด (เช่น "หลายคนคิดว่าต้องใช้... แต่จริงๆ แล้ว...")',
        'The One Feature: ชูจุดเด่นฟังก์ชันเดียวที่กินขาด (เช่น "ถ้าคุณชอบ... คุณจะรักสิ่งนี้ / ฟังก์ชันเดียวที่ตอบโจทย์")',
        'Life Hack: นำเสนอเป็นทริคโกงชีวิต (เช่น "ไอเท็มลับโกงชีวิตสำหรับคน... / ทริคประหยัดเวลาที่...")'
      ],
      'เปรียบเทียบชัดๆ': [
        'Direct Call-out: ท้าชนตัวเก่าๆ (เช่น "บอกลาตัวเก่าไปได้เลย... / เลิกใช้แบบเดิมๆ เถอะ")',
        'Money Saved: เทียบความคุ้มค่าเงิน (เช่น "จ่ายแพงกว่าทำไม ในเมื่อ... / ประหยัดไปได้ตั้ง...")',
        'Blind Test: เทียบผลลัพธ์ชัดๆ (เช่น "เทียบให้ดูชัดๆ เลยนะ ว่า... / อันไหนปัง อันไหนพัง")'
      ],
      'โครงสร้างเจาะลึก': [
        'The Big Lie: ชี้เป้าคำโกหกตัวโต (เช่น "เราโดนหลอกมาตลอดชีวิตว่า...")',
        'Counter-Intuitive: สิ่งที่สวนทางกับความรู้สึก (เช่น "ยิ่ง... ยิ่งแย่ รู้ป่ะว่าทำไม?")',
        'The "Aha" Moment: จังหวะตาสว่าง (เช่น "เพิ่งตาสว่างก็วันนี้แหละ... / ที่ผ่านมาเราทำผิดมาตลอด")'
      ]
    };

    const MULTI_VERSION_HOOKS = {
      Funny: [
        'Absurdity: มุกตลก/เล่นใหญ่ (เช่น "ถ้า... แล้วผิด ตำรวจจับฉันไปเลย / เตรียมตัวรับแรงกระแทก")',
        'Sarcasm: ประชดประชัน (เช่น "ใครชอบหน้ามันเชิญป้ายหน้าจ้า...")'
      ],
      Review: [
        'Brutal Honesty: เรียล/จริงใจ/ไม่ขายฝัน (เช่น "รีวิวพลีชีพ... / จ่ายเงินซื้อเองล้วนๆ ไม่จกตา")',
        'Skepticism: สารภาพความสงสัยตอนแรก (เช่น "ตอนแรกกะซื้อมาขำๆ... แต่เอาจริงดิ")'
      ],
      FOMO: [
        'Panic: เร่งด่วน/กดดัน (เช่น "นาทีทอง! / ใครช้าคืออดนะแม่")',
        'Stock Alert: แจ้งเตือนของขาด (เช่น "ของเพิ่งเข้าเมื่อคืน! อย่าเพิ่งเลื่อนผ่าน")'
      ]
    };

    const baseSystemPrompt = isMultiVersion ? SYSTEM_PROMPT_MULTI : (mode === 'โครงสร้างเจาะลึก' ? SYSTEM_PROMPT_BELIEF_SHIFTER : SYSTEM_PROMPT_SINGLE);
    
    let hookInstruction = '';
    if (isMultiVersion) {
      const funnyHooks = MULTI_VERSION_HOOKS.Funny;
      const reviewHooks = MULTI_VERSION_HOOKS.Review;
      const fomoHooks = MULTI_VERSION_HOOKS.FOMO;
      
      const funnyHook = funnyHooks[Math.floor(Math.random() * funnyHooks.length)];
      const reviewHook = reviewHooks[Math.floor(Math.random() * reviewHooks.length)];
      const fomoHook = fomoHooks[Math.floor(Math.random() * fomoHooks.length)];
      
      hookInstruction = `
[CRITICAL - MULTI-VERSION DYNAMIC HOOK INSTRUCTIONS]
เพื่อป้องกันไม่ให้ AI ใช้คำซ้ำๆ คุณถูกบังคับให้เปิดคลิป (Hook) ด้วยสไตล์ที่สุ่มมาให้ตามนี้เท่านั้น:
- ใน <VERSION_FUNNY>: ให้เปิดคลิปสไตล์ 👉 "${funnyHook}"
- ใน <VERSION_REVIEW>: ให้เปิดคลิปสไตล์ 👉 "${reviewHook}"
- ใน <VERSION_FOMO>: ให้เปิดคลิปสไตล์ 👉 "${fomoHook}"
`;
    } else {
      const hooks = HOOK_STRATEGIES[mode];
      if (hooks && hooks.length > 0) {
        const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];
        hookInstruction = `
[CRITICAL - DYNAMIC HOOK INSTRUCTION]
เพื่อป้องกันไม่ให้ AI ใช้คำซ้ำๆ ในสคริปต์นี้ คุณถูกบังคับให้เปิดคลิป (Hook) ด้วยสไตล์ที่สุ่มมาให้ด้านล่างนี้เท่านั้น:
👉 "${selectedHook}"
(ห้ามขึ้นต้นด้วยคำว่า "เอาจริงๆนะ" หรือ "ใครที่กำลัง..." พร่ำเพรื่อ ให้แต่งประโยคให้ตรงกับสไตล์ที่บังคับเท่านั้น)
`;
      }
    }

    const advancedIntelligenceRules = `
## 🧠 AI INTELLIGENCE UPGRADE (Micro-Persona & Contextual Few-Shot)
คุณต้องยกระดับความเป็นมนุษย์ (Humanized AI) โดยปฏิบัติตามกฎนี้อย่างเคร่งครัด:

1. สวมวิญญาณนักพูด (Micro-Persona): วิเคราะห์จากสินค้าและเพศผู้พูด แล้วเลือกสวมบทบาท 1 ใน 4 สไตล์นี้:
   - "เพื่อนสาวจอมแฉ/ป้ายยา": พูดเร็ว, กัดจิก, รีวิวตรงๆ, สแลงเยอะ (ใช้คำเช่น "แกเอ้ย", "เอาดีๆ", "จึ้งมาก", "ตัวมารดา", "ฉ่ำ")
   - "ผู้เชี่ยวชาญน่าเชื่อถือ": นิ่ง, น่าเชื่อถือ, เน้นผลลัพธ์ (ใช้คำเช่น "รู้หรือไม่...", "หลักการคือ...", "สิ่งสำคัญคือ...")
   - "แม่ค้าสายฮาร์ดเซลล์": พลังเยอะ, กระตุ้นความคุ้มค่า, รีบเร่ง (ใช้คำเช่น "ฟังนะแม่!", "พลาดคือพลาดมาก", "กดตะกร้าด่วน")
   - "ผู้ชายรีวิวจริงใจ": แมนๆ, ตรงไปตรงมา, ไม่อ้อมค้อม (ใช้คำเช่น "ผมบอกตรงๆ", "เชื่อผมดิ", "ของโคตรดี", "อย่างแจ่ม", "คือว่านะ", "ฟังนะทุกคน")

2. การเว้นจังหวะหายใจและการเล่นคำ (Breathing & Wordplay):
   - บังคับใช้เครื่องหมาย "..." เพื่อเว้นจังหวะพักหายใจแบบคนพูดจริงๆ เพื่อไม่ให้เป็นหุ่นยนต์
   - พยายามใช้คำคล้องจองหรือวลีจำง่าย (Punchline) เพื่อให้คลิปน่าสนใจ

3. ตัวอย่างการพูดที่เป็นธรรมชาติ (Few-Shot Reference - DO NOT COPY EXACTLY, USE AS INSPIRATION ONLY):
   - [Hook 1] "แกเอ้ย... ตอนแรกก็ไม่เชื่อนะเว้ย ว่ามันจะเนียนขนาดนี้... คือแบบ... ช็อคมาก!"
   - [Hook 2] "ใครที่หน้ามันเยิ้มระหว่างวัน... หยุดฟังคลิปนี้ด่วนๆ เลยครับ"
   - [Hook 3] "เคยป่ะ... ซื้อของมาแล้วไม่ตรงปก... แต่อันนี้คือแบบ... เกินคาดว่ะ!"
   - [CTA] "ฟังนะแม่!... ตัวนี้คือแรร์ไอเทม... รีบกดตะกร้าเหลืองให้ทันก่อนของจะหมดนะจ๊ะ"
${hookInstruction}
`;

    const finalSystemInstruction = baseSystemPrompt + advancedIntelligenceRules;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userPrompt,
      config: {
        systemInstruction: finalSystemInstruction,
        temperature: 0.85, // Increased from 0.8 to 0.85 for slightly more creativity/wordplay
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

    // --- Output Moderation ---
    const outputModResult = moderateText(JSON.stringify(resultJson));
    if (outputModResult.action === 'block') {
      await supabaseAdmin.from('moderation_logs').insert({
        user_id: user.id,
        category: outputModResult.category,
        severity: outputModResult.severity,
        action: 'block',
        matched_rule: `AI_OUTPUT_${outputModResult.matchedTerms.join(', ')}`
      });
      // We throw error here so credit logic handles refunding automatically in the catch block
      throw new Error("AI สร้างเนื้อหาที่ไม่เหมาะสม (ถูกบล็อกโดยระบบรักษาความปลอดภัย)");
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
      const { data: newTrialVal, error: trialErr } = await supabaseAdmin.rpc('decrement_trial_quota', {
        p_user_id: user.id,
        p_amount: creditAmount
      });
      if (!trialErr && newTrialVal !== null) {
        updatedTrialRemaining = newTrialVal;
      }
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
