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

  // ─── Credit Ledger State (Saga Pattern) ─────────────────────────────────────
  // transactionId: UUID ที่ได้จาก start_generation_tx — ใช้อ้างอิงตลอด lifecycle
  // ถ้า Cloudflare crash กลางคัน pg_cron จะ refund ให้อัตโนมัติผ่าน transaction_id นี้
  let transactionId = null;   // UUID ของ credit_transactions row ที่กำลัง 'pending'
  let creditAmount = 1;       // 1 สำหรับ single script, 2 สำหรับ multi-version
  let userId = null;          // เก็บไว้เพื่อใช้ใน catch block (refund_generation_tx)
  let supabaseAdmin = null;
  // ─────────────────────────────────────────────────────────────────────────────

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

    // ─── Smart Dynamic Brain: Model Selection ───────────────────────────────
    // Pro Belief-Shifting mode → Gemini Pro (คิดเชิงลึก, ลูกค้ายอมรอ 10-20 วินาที)
    // ทุก mode อื่น (รวม Pro ทั่วไป) → gemini-3.6-flash (เร็วปรี๊ด 3 วินาที, ต้นทุนต่ำ)
    const isProBrainMode = (effectiveTier === 'pro' && mode === 'โครงสร้างเจาะลึก' && !isMultiVersion);
    const selectedModel = isProBrainMode ? 'gemini-3.1-pro-preview' : 'gemini-3.6-flash';
    // ────────────────────────────────────────────────────────────────────────

    if (isMultiVersion && effectiveTier !== 'pro') {
      return new Response(JSON.stringify({ error: 'Multi-version scripts require Pro tier.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (mode === 'โครงสร้างเจาะลึก' && effectiveTier !== 'pro') {
      return new Response(JSON.stringify({ error: 'โหมดโครงสร้างเจาะลึก (Belief-Shifting) สงวนไว้สำหรับผู้ใช้ Pro เท่านั้น' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    creditAmount = isMultiVersion ? 2 : 1;
    userId = user.id;  // เก็บ userId ไว้ใช้ใน catch block

    // ─── Credit Ledger: เริ่ม Transaction ───────────────────────────────────
    // start_generation_tx คืน JSONB: { transaction_id, credits } หรือ { error, credits: -1 }
    // ทั้งการหักเครดิต + การสร้าง ledger row เกิดขึ้นพร้อมกัน (Atomic)
    const { data: txResult, error: txError } = await supabaseAdmin.rpc('start_generation_tx', {
      p_user_id: user.id,
      p_amount:  creditAmount,
      p_mode:    isMultiVersion ? 'Pro_MultiVersion' : mode
    });

    if (txError) {
      console.error('[Credit Ledger] start_generation_tx error:', txError);
      return new Response(JSON.stringify({ error: "Failed to start credit transaction" }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!txResult || txResult.credits < 0 || txResult.error) {
      // insufficient_credits หรือ profile_not_found
      return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), {
        status: 402, headers: { 'Content-Type': 'application/json' }
      });
    }

    // บันทึก transactionId ไว้ — นี่คือ "กุญแจ" ที่ใช้ commit หรือ refund ทีหลัง
    transactionId = txResult.transaction_id;
    let remainingCredits = txResult.credits;
    // ─────────────────────────────────────────────────────────────────────────


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
        'Direct Call-out: พุ่งเป้าไปที่ปัญหาของกลุ่มเป้าหมายแบบไม่อ้อมค้อม (ห้ามใช้คำว่า "ใครที่กำลัง" หรือ "เคยไหม")',
        'Extreme Frustration: แสดงความหงุดหงิดขั้นสุดกับปัญหาที่เจอมานาน (ใช้อารมณ์ร่วมสูง)',
        'Failed Attempts: เล่าถึงความล้มเหลวในการแก้ปัญหาด้วยวิธีเดิมๆ (เสียเงินฟรี, เสียเวลา)',
        'Hidden Danger: ชี้ให้เห็นผลกระทบที่ซ่อนอยู่ถ้าไม่รีบแก้ปัญหานี้ (ขู่ให้กลัวแบบเนียนๆ)',
        'The Confession: สารภาพความอับอายหรือความลำบากที่เกิดจากปัญหานี้',
        'Tired of Lies: แสดงความเหนื่อยหน่ายกับโฆษณาเกินจริงที่เคยเจอมา'
      ],
      'นักเล่าเรื่อง (Hook-Story-Offer)': [
        'The Big Secret: ทำท่าเหมือนกำลังจะแฉความลับวงในที่ไม่มีใครยอมบอก',
        'Unexpected Discovery: เล่าความบังเอิญที่ทำให้ได้เจอของดีแบบไม่ตั้งใจ',
        'The Skeptic: เริ่มต้นด้วยความไม่เชื่ออย่างรุนแรง แอนตี้สุดๆ ก่อนจะโดนตก',
        'Life Before & After: สรุปความเปลี่ยนแปลงแบบหน้ามือเป็นหลังมือแบบช็อคๆ',
        'The Regret: บ่นเสียดายว่ารู้งี้ใช้นานแล้ว ปล่อยให้ตัวเองลำบากตั้งนาน',
        "Friend's Recommendation: อ้างอิงว่าโดนเพื่อนป้ายยามาอีกทีแบบบังคับให้ลอง"
      ],
      'โดนใจ FOMO': [
        'Sold Out Panic: สร้างสถานการณ์ว่าของเพิ่งเติมสต็อก และกำลังจะหมดอีกรอบ',
        'Price Glitch: ทำตัวตื่นเต้นกับราคาที่ถูกจนเหมือนระบบรวน',
        'Exclusive Warning: เตือนว่าโปรโมชั่นนี้อาจจะหายไปในอีกไม่กี่ชั่วโมง',
        'Regret Warning: ขู่ว่าถ้าเลื่อนผ่านคลิปนี้จะต้องกลับมาซื้อในราคาเต็มแน่นอน',
        'Trend Alert: บอกว่านี่คือไอเทมที่หายากมากและกำลังเป็นกระแสที่สุดตอนนี้',
        'Stop Scrolling: สั่งให้หยุดดูแบบเร่งด่วนที่สุด เพราะมีเรื่องสำคัญมากจะบอก'
      ],
      'โชว์การเปลี่ยนแปลง (BAB Formula)': [
        'The Worst State: โชว์สภาพที่แย่ที่สุดในอดีตแบบไม่อาย',
        'Impossible Transformation: พูดถึงผลลัพธ์ที่ตอนแรกคิดว่าเป็นไปไม่ได้',
        'Timeline Reveal: ระบุระยะเวลาสั้นๆ ที่เกิดการเปลี่ยนแปลงแบบคาดไม่ถึง',
        'Doubt Buster: ท้าให้จับผิดผลลัพธ์ว่าใช้แอปหรือของจริง',
        'Money Spent: เทียบจำนวนเงินที่เคยเสียไปในอดีตกับผลลัพธ์ปัจจุบัน',
        'Everyone Asks: อ้างว่ามีแต่คนทักหรือถามว่าไปทำอะไรมา'
      ],
      'สายสเปค/ฟังก์ชัน (FAB Formula)': [
        'Myth Buster: ทุบความเชื่อผิดๆ เกี่ยวกับสเปคที่คนมักโดนหลอก',
        'The Game Changer: ชูฟังก์ชันเดียวที่เป็นทีเด็ด ทำลายคู่แข่งกระจุย',
        'Lazy Hack: นำเสนอสเปคในมุมของไอเทมสำหรับคนขี้เกียจแต่ได้ผลลัพธ์ชัวร์',
        'Unexpected Use: โชว์วิธีการใช้งานฟังก์ชันแบบแปลกๆ แต่เวิร์คมาก',
        'Quality Over Hype: เหน็บแนมของตามกระแส แล้วชูสเปคที่แท้จริงของตัวนี้',
        'Time Saver: เน้นฟังก์ชันที่ช่วยประหยัดเวลาชีวิตไปได้มหาศาล'
      ],
      'เปรียบเทียบชัดๆ': [
        'Direct Roast: แซะสินค้าตัวเก่าที่เคยใช้แบบเจ็บแสบ',
        'The Upgrade: อธิบายเหตุผลที่ต้องทิ้งของเดิมแล้วเปลี่ยนมาใช้อันนี้',
        'Blind Test Results: ทำทีเหมือนเทียบผลลัพธ์ให้ดูแบบจะๆ ไม่เข้าข้างใคร',
        'Price vs Value: เปรียบเทียบราคาที่จ่ายกับความคุ้มค่าที่ได้กลับมาแบบละเอียด',
        'Tired of Buying: บ่นว่าเบื่อที่ต้องซื้อของเดิมซ้ำๆ เพราะพังง่าย เลยมาจบที่ตัวนี้',
        'Industry Standard: ท้าชนแบรนด์ดังในราคาที่จับต้องได้มากกว่า'
      ],
      'โครงสร้างเจาะลึก': [
        'The Big Lie: ชี้เป้าคำโกหกคำโตที่วงการนี้หลอกเรามาตลอด',
        'Counter-Intuitive: นำเสนอสิ่งที่สวนทางกับความรู้สึกหรือความเชื่อเดิมๆ สุดโต่ง',
        'The Awakening: เล่าวินาทีตาสว่าง (Aha Moment) ที่ทำให้เปลี่ยนความคิด',
        'Stop Doing This: สั่งให้หยุดทำพฤติกรรมเดิมๆ ทันทีถ้าไม่อยากพังไปกว่านี้',
        'The Hidden Culprit: ชี้เป้าตัวการลับที่ทำให้แก้ปัญหาไม่หายสักที',
        'Unpopular Opinion: เสนอความคิดเห็นที่ขัดแย้งกับคนส่วนใหญ่แต่เป็นเรื่องจริง'
      ]
    };

    const MULTI_VERSION_HOOKS = {
      Funny: [
        'Absurd Hypothesis: ตั้งสมมติฐานหรือคำถามที่กาวมากๆ โยงเข้าสินค้าแบบหน้าตาเฉย',
        'Self-Deprecation: แซะตัวเองหรือเผาตัวเองแบบฮาๆ เพื่อดึงเข้าสินค้า',
        'Overdramatic: เล่นใหญ่เกินเบอร์ ทำเหมือนเป็นเรื่องคอขาดบาดตาย',
        'Sarcastic Warning: เตือนด้วยความประชดประชัน',
        'Roleplay: สวมบทบาทสมมติแบบตลกๆ (เช่น เป็นนักสืบ, เป็นคนรวยกำมะลอ)'
      ],
      Review: [
        'Brutal Honesty: รีวิวแบบพลีชีพ ด่าก่อนชมทีหลัง ไม่มีการอวยเว่อร์',
        'The Skeptic: ยอมรับตรงๆ ว่าตอนแรกอคติ และกะจะซื้อมาด่า',
        'No BS: ประกาศกร้าวว่าจะพูดแต่ความจริง ไม่มีสคริปต์ ไม่ขายฝัน',
        'Real Struggle: เล่าความลำบากจริงๆ ในชีวิตประจำวันก่อนที่จะเจอสินค้า',
        'Long Term Update: ทำทีเหมือนว่าใช้มานานมากแล้วเพิ่งได้โอกาสมารีวิว'
      ],
      FOMO: [
        'Last Chance Panic: สร้างความตื่นตระหนกว่านี่คือโอกาสสุดท้ายจริงๆ',
        'Exclusive Secret: ทำเหมือนแอบกระซิบโปรโมชั่นที่คนอื่นไม่รู้',
        'Stock Depletion: แจ้งเตือนว่าของกำลังลดลงแบบเรียลไทม์',
        'Price Error Illusion: ทำตัวตกใจเหมือนแบรนด์ตั้งราคาผิด',
        'Trend Follower: ขู่ว่าถ้าไม่มีตอนนี้คือตกเทรนด์ คุยกับใครไม่รู้เรื่อง'
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
เพื่อป้องกันการใช้คำซ้ำซาก คุณถูกบังคับให้เปิดคลิป (Hook) ด้วยเทคนิคที่สุ่มมาให้ตามนี้:
- ใน <VERSION_FUNNY>: 👉 "${funnyHook}"
- ใน <VERSION_REVIEW>: 👉 "${reviewHook}"
- ใน <VERSION_FOMO>: 👉 "${fomoHook}"

ข้อห้ามเด็ดขาดในการเขียน Hook (หากฝ่าฝืนถือว่าผิดกฎ):
❌ ห้ามใช้คำเปิดคลิปเหล่านี้เด็ดขาด: "เคยป่ะ", "เคยไหม", "ใครที่กำลัง", "ทุกคน", "เอาจริงๆนะ", "บอกเลยว่า", "รู้ป่ะ"
❌ ห้ามลอกประโยคจากตัวอย่าง
✅ ให้คุณคิดค้น "ประโยคเปิดใหม่ๆ" ด้วยภาษาพูดที่เป็นธรรมชาติและตรงกับเทคนิคที่กำหนดให้มากที่สุด
`;
    } else {
      const hooks = HOOK_STRATEGIES[mode];
      if (hooks && hooks.length > 0) {
        const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];
        hookInstruction = `
[CRITICAL - DYNAMIC HOOK INSTRUCTION]
เพื่อป้องกันการใช้คำซ้ำซาก คุณถูกบังคับให้เปิดคลิป (Hook) ด้วยเทคนิคนี้เท่านั้น:
👉 "${selectedHook}"

ข้อห้ามเด็ดขาดในการเขียน Hook (หากฝ่าฝืนถือว่าผิดกฎ):
❌ ห้ามใช้คำเปิดคลิปเหล่านี้เด็ดขาด: "เคยป่ะ", "เคยไหม", "ใครที่กำลัง", "ทุกคน", "เอาจริงๆนะ", "บอกเลยว่า", "รู้ป่ะ"
❌ ห้ามลอกประโยคจากตัวอย่าง
✅ ให้คุณคิดค้น "ประโยคเปิดใหม่ๆ" ที่เป็นธรรมชาติและตรงกับเทคนิคที่กำหนดให้มากที่สุด
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

3. ตัวอย่างการใช้ภาษาพูดที่เป็นธรรมชาติ (Tone & Vibe Reference - DO NOT COPY EXAMPLES):
   - การเน้นอารมณ์: "คือตอนแรกอคติมากเว้ย... คิดว่าโฆษณาชัวร์... แต่พอโดนกับตัวคือหน้าสั่นเลย"
   - การใช้คำเชื่อมธรรมชาติ: "ตอนแรกก็งงว่าทำไมคนรีวิวเยอะ... อ๋อ... เข้าใจละ"
   - การกระตุ้นแอคชั่น: "ไม่อยากพูดเยอะ... ของมันหมดไวมาก ไปกดดูในตะกร้ากันเองนะ"
   (ห้ามก๊อปปี้ประโยคเหล่านี้ไปใช้ ให้ดูเป็นแนวทางอารมณ์ของการเว้นวรรคและการใช้คำสร้อย)
${hookInstruction}
`;

    // ─── Pro Normal Mode: Enhanced Depth Prompt (ไม่เปลี่ยน model, แต่เพิ่มความลึกของ Prompt) ─────
    // เฉพาะ Pro ที่ไม่ได้ใช้ Belief-Shifting mode (ซึ่งไม่ต้องการ Pro model)
    const proNormalEnhancement = (effectiveTier === 'pro' && !isProBrainMode) ? `

## 🧠 PRO DEEP BRAIN ENHANCEMENT — Normal Mode Upgrade
คุณกำลังทำงานในโหมดขั้นสูงของ Pro Deep Brain™ (Fast Engine) เพิ่มความลึกดังนี้อย่างเคร่งครัด:

1. **Micro-Emotion Targeting**: วิเคราะห์ Pain Point ของกลุ่มเป้าหมายเชิงลึกกว่า Free/Plus อย่างน้อย 1 ระดับ ระบุอารมณ์ที่ซ่อนอยู่เบื้องหลังการซื้อ (เช่น "กลัวถูกมองว่าล้าหลัง" ไม่ใช่แค่ "อยากของดี")
2. **Pattern Interrupt Hook**: Hook ต้องใช้เทคนิค "ทำลายความคาดหวัง" หรือ "Curiosity Gap" เปิดด้วยสิ่งที่ไม่มีใครพูดถึงหรือสวนทางความคิดเดิม อย่างน้อย 1 ครั้ง
3. **Specific Social Proof**: อ้างอิง Social Proof ที่เฉพาะเจาะจงกว่า (เช่น "คนซื้อซ้ำ 3 รอบในเดือนเดียว" ดีกว่า "คนชอบมาก", "ขายแล้ว 2,000+ ชิ้น" ดีกว่า "ขายดีมาก")
4. **Precision Micro-Urgency CTA**: CTA ต้องมี Urgency ที่เป็นธรรมชาติ 100% ห้าม generic เช่น "รีบกดตะกร้า" ให้ใช้เหตุผลเฉพาะเจาะจงของสินค้านั้น (เช่น "โปรนี้ขึ้นอยู่กับสต็อก ถ้าหมดรอบหน้าไม่รู้ราคาจะเท่าไหร่")
` : '';
    // ──────────────────────────────────────────────────────────────────────────────────────────────

    const finalSystemInstruction = baseSystemPrompt + advancedIntelligenceRules + proNormalEnhancement;

    let resultJson = null;
    let rawOutput = '';
    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model: selectedModel, // Smart Dynamic Brain: Flash for all, Pro only for Belief-Shifting
          contents: userPrompt,
          config: {
            systemInstruction: finalSystemInstruction,
            temperature: 0.85, // Increased from 0.8 to 0.85 for slightly more creativity/wordplay
            responseMimeType: isMultiVersion ? "text/plain" : "application/json",
          }
        });
        rawOutput = response.text;
        break; // Success, exit retry loop
      } catch (err) {
        const errMsg = err.message || String(err);
        const isRetryable = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || 
                            errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
        
        if (isRetryable && attempt < maxRetries) {
          attempt++;
          const backoffDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.warn(`[Auto-Retry] Gemini API Error (Attempt ${attempt}/${maxRetries}): ${errMsg}. Retrying in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          // Max retries reached or not a retryable error, throw to outer catch for refund and user notification
          throw err;
        }
      }
    }

    
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

    // ─── Credit Ledger: Commit Transaction ──────────────────────────────────
    // commit_generation_tx ทำ 2 อย่างพร้อมกัน (Atomic):
    //   1. INSERT script ลงตาราง scripts
    //   2. เปลี่ยน transaction status: 'pending' → 'completed'
    // ถ้า insert ล้มเหลว → ทั้งคู่ rollback → pg_cron จะ refund เครดิตอัตโนมัติ
    // ⚠️ NOTE: ส่ง transactionId ที่จับมาจาก start_generation_tx ลงไปตรงๆ
    //          user_id ถูกตรวจสอบซ้ำอีกครั้งใน RPC เพื่อป้องกัน IDOR
    const { data: commitResult, error: commitError } = await supabaseAdmin.rpc('commit_generation_tx', {
      p_transaction_id: transactionId,
      p_user_id:        user.id,
      p_product_name:   (productName || '').slice(0, 100),
      p_product_details:(productDetails || '').slice(0, 2000),
      p_mode:           isMultiVersion ? 'Pro_MultiVersion' : mode,
      p_content:        JSON.stringify(resultJson)
    });

    if (commitError || commitResult?.error) {
      console.error('[Credit Ledger] commit_generation_tx failed:', commitError || commitResult?.error);
      // commit ล้มเหลว → ยิง refund ทันที (Eager refund) ก่อนที่ pg_cron จะทำ
      // ใช้ best-effort (ไม่ await error เพราะ pg_cron ยังเป็น safety net อยู่)
      supabaseAdmin.rpc('refund_generation_tx', {
        p_transaction_id: transactionId,
        p_user_id:        user.id
      }).catch(e => console.error('[Credit Ledger] Eager refund failed (pg_cron will handle):', e));

      throw new Error("Failed to save script history");
    }
    // ─────────────────────────────────────────────────────────────────────────

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
      trial_pro_remaining: updatedTrialRemaining,
      used_pro_brain: isProBrainMode, // Smart Dynamic Brain flag for frontend badge
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    // ─── Credit Ledger: Refund Transaction (Best-Effort) ────────────────────
    // เรียก refund_generation_tx เฉพาะเมื่อ transactionId มีค่า
    // (แปลว่าหักเครดิตไปแล้ว แต่งานล้มเหลวก่อน commit)
    //
    // ⚠️ DESIGN NOTE: แม้ว่าการ await refund นี้จะล้มเหลว
    //    pg_cron ยังคงเป็น Safety Net สุดท้าย (จะ refund ใน 5 นาที)
    //    ดังนั้นไม่มี "เครดิตหายฟรี" เกิดขึ้นได้อีกต่อไป
    if (transactionId && userId && supabaseAdmin) {
      console.error('[Credit Ledger] Execution failed after deduction. Attempting immediate refund via transaction:', transactionId);
      try {
        await supabaseAdmin.rpc('refund_generation_tx', {
          p_transaction_id: transactionId,
          p_user_id:        userId
        });
        console.log('[Credit Ledger] Immediate refund successful for transaction:', transactionId);
      } catch (refundErr) {
        // ไม่ต้องตกใจ — pg_cron จะ refund ภายใน 5 นาที
        console.error('[Credit Ledger] Immediate refund failed. pg_cron will auto-refund within 5 minutes. Error:', refundErr);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
    console.error("Generate API Error:", err);
    
    let errorMessage = err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้งครับ";
    if (typeof errorMessage === 'string') {
      if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
        errorMessage = "ขณะนี้ระบบ AI ของ Google กำลังมีผู้ใช้งานหนาแน่น (503 Service Unavailable) ระบบได้คืนเครดิตให้คุณแล้ว กรุณาลองกดสร้างใหม่อีกครั้งครับ";
      } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "ระบบ AI ของ Google กำลังทำงานหนักเกินไป (429 Too Many Requests) ระบบได้คืนเครดิตให้คุณแล้ว กรุณารอสักครู่แล้วลองใหม่ครับ";
      } else if (errorMessage.includes('User location is not supported')) {
        errorMessage = "ไม่สามารถเชื่อมต่อ AI ได้เนื่องจากเครือข่ายหรือพื้นที่ของคุณไม่รองรับ (เช่น เปิด VPN หรืออยู่ต่างประเทศ) กรุณาปิด VPN หรือสลับอินเทอร์เน็ตแล้วลองใหม่ครับ (ระบบคืนเครดิตให้แล้ว)";
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
