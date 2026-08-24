import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://autoscript-ai.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing URLs' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Check profile and tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const effectiveTier = (profile.tier === 'free' && profile.trial_pro_remaining > 0) ? 'pro' : profile.tier;
    
    if (effectiveTier !== 'pro' && effectiveTier !== 'plus') {
       return new Response(JSON.stringify({ error: 'Upgrade to Pro to use URL analysis.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Deduct 1 credit for analysis (Atomic RPC)
    const { data: updatedCredits, error: creditError } = await supabase.rpc('increment_credits', {
      p_user_id: user.id,
      p_amount: -1
    });

    if (creditError) {
      return new Response(JSON.stringify({ error: `RPC Error: ${creditError.message || JSON.stringify(creditError)}` }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (updatedCredits === null || updatedCredits < 0) {
      return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Return a streaming response immediately!
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Fire & Forget the heavy lifting so we can return the stream
    (async () => {
      try {
        await writer.write(encoder.encode("กำลังตรวจสอบลิงก์ข้อมูล...\n"));
        
        // 3. Scrape URLs concurrently
        const scrapedContents = await Promise.all(urls.map(async (url, idx) => {
          await writer.write(encoder.encode(`กำลังอ่านเนื้อหาจากเว็บที่ ${idx + 1}: ${url}\n`));
          try {
            const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
              headers: {
                'Accept': 'text/plain',
                'X-Return-Format': 'markdown'
              }
            });
            if (jinaRes.ok) {
              const text = await jinaRes.text();
              return `--- SOURCE: ${url} ---\n${text.substring(0, 5000)}`; // limit 5000 chars per URL to save context
            }
            return `--- SOURCE: ${url} ---\n[อ่านข้อมูลเว็บนี้ไม่สำเร็จ]`;
          } catch (e) {
            return `--- SOURCE: ${url} ---\n[เกิดข้อผิดพลาดในการเชื่อมต่อเว็บ]`;
          }
        }));

        const combinedContext = scrapedContents.join('\n\n');
        await writer.write(encoder.encode("\nประมวลผลข้อมูลเสร็จสิ้น! AI กำลังสรุปข้อมูล...\n\n=================================\n\n"));

        // 4. Send to Gemini for Streaming Output
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const prompt = `You are an expert e-commerce copywriter.
Analyze the following product details scraped from multiple URLs.
Extract and summarize the data into 3 distinct sections.
You MUST wrap your output exactly with these XML tags so the system can parse them:
<PRODUCT_NAME>
(Insert concise product name or category here)
</PRODUCT_NAME>
<PRODUCT_DETAILS>
(Insert key selling points, features, benefits, and target audience insights here. Keep it punchy and persuasive.)
</PRODUCT_DETAILS>
<PRICE_PROMO>
(Insert price or promotions here. If not found, write "ไม่ระบุ")
</PRICE_PROMO>

IMPORTANT: If the scraped data does NOT contain any meaningful product information (e.g. it only says 'Chat', 'Follow', 'CAPTCHA', 'Access Denied', or is completely unrelated to a product), you MUST output exactly this tag anywhere in your response:
<ERROR>NO_PRODUCT_FOUND</ERROR>

Be persuasive and write in Thai.

Scraped Data:
${combinedContext}
`;
        
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3.6-flash',
            contents: prompt
        });

        let fullResponse = "";
        for await (const chunk of responseStream) {
            fullResponse += chunk.text;
            await writer.write(encoder.encode(chunk.text));
        }

        // If Gemini detected no product info, refund the credit
        if (fullResponse.includes('<ERROR>NO_PRODUCT_FOUND</ERROR>')) {
            // Restore credits and trial_pro_remaining manually
            const { data: dbProfile } = await supabase.from('profiles').select('credits, trial_pro_remaining, tier').eq('id', user.id).single();
            if (dbProfile) {
                const shouldRestoreTrial = dbProfile.tier === 'free' && dbProfile.trial_pro_remaining < 3;
                await supabase.from('profiles').update({
                    credits: (dbProfile.credits || 0) + 1,
                    trial_pro_remaining: shouldRestoreTrial ? (dbProfile.trial_pro_remaining || 0) + 1 : dbProfile.trial_pro_remaining
                }).eq('id', user.id);
            }
            await writer.write(encoder.encode("\n\n⚠️ **ระบบคืนเครดิตให้คุณ 1 เครดิต** (ลิงก์นี้ติดระบบป้องกันของแพลตฟอร์ม ทำให้ AI เข้าถึงข้อมูลไม่ได้)"));
        }

        await writer.close();
      } catch (err) {
        await writer.write(encoder.encode(`\n\n[SYSTEM ERROR]: ${err.message}`));
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}
