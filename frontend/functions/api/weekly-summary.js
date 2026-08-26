import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Verify Cron Authentication
    // To trigger this, the caller must send a POST request with the correct Bearer token matching ADMIN_CRON_KEY
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader.replace('Bearer ', '') !== env.ADMIN_CRON_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Fetch last 7 days of feedback
    const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: feedbacks, error: dbError } = await supabaseAdmin
      .from('feedbacks')
      .select('rating, comment, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (dbError) {
      throw new Error(`Database Error: ${dbError.message}`);
    }

    if (!feedbacks || feedbacks.length === 0) {
      return new Response(JSON.stringify({ message: "No feedback in the last 7 days. Skipped summary." }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Summarize with Gemini
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    
    const rawDataStr = feedbacks.map(f => `[Rating: ${f.rating}/5] ${f.comment || 'ไม่มีคอมเมนต์'}`).join('\n');
    
    const prompt = `You are an expert Product Manager analyzing weekly customer feedback for a Thai SaaS product.
Here is the raw feedback from the last 7 days (${feedbacks.length} items):

${rawDataStr}

Please write a concise, actionable summary in THAI for the executive team. Use emojis.
Format as exactly 4 sections:
1. 📊 ภาพรวมสัปดาห์นี้ (Overall Sentiment)
2. 💖 สิ่งที่ลูกค้าประทับใจ (Key Praise)
3. 🛠️ ปัญหาที่ต้องแก้ไขด่วน (Bugs/Pain Points - if any)
4. 💡 ฟีเจอร์ที่ลูกค้าเรียกร้อง (Feature Requests - if any)

Keep it professional, highly concise, and under 1500 characters.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { temperature: 0.3 }
    });

    const summaryText = response.text.trim();

    // 4. Send to Discord
    const webhookUrl = env.DISCORD_WEBHOOK_HIGH_STAR || env.DISCORD_WEBHOOK_URL;
    
    if (webhookUrl) {
      const payload = {
        username: "AutoScript Weekly Report 📈",
        avatar_url: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4c8.png",
        embeds: [{
          title: "🗓️ สรุป Feedback ลูกค้ารายสัปดาห์",
          description: summaryText,
          color: 3447003, // Blue
          footer: {
            text: `วิเคราะห์จากรีวิวทั้งหมด ${feedbacks.length} รายการในช่วง 7 วันที่ผ่านมา`
          },
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    return new Response(JSON.stringify({ success: true, count: feedbacks.length }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Weekly Summary API Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
