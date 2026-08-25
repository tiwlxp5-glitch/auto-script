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

    // 2. Check & increment daily analyze quota (Lazy Reset pattern)
    const { data: quotaResult, error: quotaError } = await supabase.rpc('check_and_increment_analyze_quota', {
      p_user_id: user.id,
      p_tier: effectiveTier
    });

    if (quotaError) {
      return new Response(JSON.stringify({ error: `Quota Error: ${quotaError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Daily limit exceeded
    if (!quotaResult.allowed) {
      const limit = quotaResult.limit;
      return new Response(JSON.stringify({ 
        error: `คุณใช้โควต้าการวิเคราะห์ลิงก์วันนี้ครบแล้ว (${limit}/${limit} ลิงก์/วัน) กรุณารอพรุ่งนี้หรืออัปเกรดแพ็กเกจครับ`
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Deduct 1 credit for analysis (Atomic RPC)
    const { data: updatedCredits, error: creditError } = await supabase.rpc('increment_credits', {
      p_user_id: user.id,
      p_amount: -1
    });

    if (creditError) {
      // Rollback quota (decrement back)
      await supabase.from('profiles').update({ 
        analyze_quota_used: (profile.analyze_quota_used || 1) - 1 
      }).eq('id', user.id);
      return new Response(JSON.stringify({ error: `RPC Error: ${creditError.message || JSON.stringify(creditError)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (updatedCredits === null || updatedCredits < 0) {
      // Rollback quota
      await supabase.from('profiles').update({ 
        analyze_quota_used: Math.max(0, (quotaResult.used || 1) - 1)
      }).eq('id', user.id);
      return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Return a streaming response immediately!
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Remaining quota info to display to user
    const remainingQuota = quotaResult.limit - quotaResult.used;

    // Fire & Forget the heavy lifting so we can return the stream
    (async () => {
      try {
        await writer.write(encoder.encode(`เริ่มต้นกระบวนการ AI Analysis...\n`));
        await writer.write(encoder.encode(`กำลังอ่านข้อมูลจากลิงก์ที่ระบุ...\n`));
        
        // 4. Scrape URLs concurrently using Jina AI
        // Use API Key if available (higher success rate), otherwise use anonymous
        const jinaHeaders = {
          'Accept': 'text/plain',
          'X-Return-Format': 'markdown'
        };
        if (env.JINA_API_KEY) {
          jinaHeaders['Authorization'] = `Bearer ${env.JINA_API_KEY}`;
        }

        const scrapedContents = await Promise.all(urls.map(async (url, idx) => {
          await writer.write(encoder.encode(`กำลังอ่านเนื้อหาจากเว็บที่ ${idx + 1}: ${url}\n`));
          try {
            const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
              headers: jinaHeaders,
              signal: AbortSignal.timeout(20000) // 20 second timeout
            });
            if (jinaRes.ok) {
              const text = await jinaRes.text();
              return `--- SOURCE: ${url} ---\n${text.substring(0, 5000)}`;
            }
            return `--- SOURCE: ${url} ---\n[อ่านข้อมูลเว็บนี้ไม่สำเร็จ สถานะ: ${jinaRes.status}]`;
          } catch (err) {
            return `--- SOURCE: ${url} ---\n[เกิดข้อผิดพลาดในการเชื่อมต่อเว็บ: ${err.message}]`;
          }
        }));

        const combinedContext = scrapedContents.join('\n\n');
        await writer.write(encoder.encode("\nประมวลผลข้อมูลเสร็จสิ้น! AI กำลังสรุปข้อมูล...\n\n=================================\n\n"));

        // 5. Send to Gemini for Streaming Output
        const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });
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

        // If Gemini detected no product info → refund credit AND quota
        if (fullResponse.includes('<ERROR>NO_PRODUCT_FOUND</ERROR>')) {
            // Refund credit
            await supabase.rpc('increment_credits', { p_user_id: user.id, p_amount: 1 });
            // Rollback quota usage
            await supabase.from('profiles').update({ 
              analyze_quota_used: Math.max(0, (quotaResult.used || 1) - 1)
            }).eq('id', user.id);
            await writer.write(encoder.encode("\n\n⚠️ **ระบบคืนเครดิตให้คุณ 1 เครดิต** (ลิงก์นี้ติดระบบป้องกันของแพลตฟอร์ม ทำให้ AI เข้าถึงข้อมูลไม่ได้)\n⚠️ **โควต้าการวิเคราะห์คืนให้ 1 ครั้ง** ลองใหม่หรือใช้ลิงก์อื่นได้เลยครับ"));
        } else {
            await writer.write(encoder.encode(`\n\n✅ วิเคราะห์เสร็จสมบูรณ์! โควต้าคงเหลือวันนี้: ${remainingQuota - 1} ครั้ง`));
        }

        await writer.close();
      } catch (err) {
        // On any crash: refund both credit and quota
        try {
          await supabase.rpc('increment_credits', { p_user_id: user.id, p_amount: 1 });
          await supabase.from('profiles').update({ 
            analyze_quota_used: Math.max(0, (quotaResult.used || 1) - 1)
          }).eq('id', user.id);
        } catch (_) {}
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
