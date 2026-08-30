import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env, data }) {
  const logger = data?.logger || console;

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      logger.warn('Unauthorized request: missing authorization header');
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      logger.warn('Unauthorized request: token validation failed', { userError });
      return new Response(JSON.stringify({ error: "Invalid token" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (data?.logger?.setUserId) data.logger.setUserId(user.id);

    const body = await request.json();
    const rating = parseInt(body.rating, 10);
    const comment = (body.comment || '').slice(0, 1000); // Max 1000 chars to prevent abuse

    if (isNaN(rating) || rating < 1 || rating > 5) {
      logger.warn('Invalid rating submitted', { rating });
      return new Response(JSON.stringify({ error: "Rating must be between 1 and 5" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use service role to insert, bypassing any RLS issues just in case, though we set RLS for authenticated to insert.
    // Actually, it's better to use user's JWT so it matches RLS, but since we are doing it securely on the backend:
    const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { error: insertError } = await supabaseAdmin.from('feedbacks').insert({
      user_id: user.id,
      rating: rating,
      comment: comment
    });

    if (insertError) {
      logger.error("Failed to insert feedback", insertError);
      return new Response(JSON.stringify({ error: "Failed to save feedback" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine Avatar & Emoji & Critical Bug using Gemini
    let aiEmoji = "";
    let isCritical = false;
    
    if (env.GEMINI_API_KEY && comment.trim().length > 0) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `วิเคราะห์ข้อความ Feedback ของลูกค้านี้: <user_comment>${comment}</user_comment>
ให้ตอบกลับมาเป็น JSON เท่านั้น โดยมี 2 ค่า:
1. "emoji": Emoji 1 ตัวที่ตรงกับความรู้สึกลูกค้าที่สุด (เช่น 🤩, 😍, 😊, 🤔, 😡, 😭, 💡, 🐛, 🙏)
2. "is_critical_bug": true ถ้าลูกค้ารายงานปัญหาที่ทำให้ใช้งานต่อไม่ได้, จ่ายเงินไม่ได้, หรือระบบล่ม (ถ้าไม่ใช่ ให้เป็น false)`,
          config: { 
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        });
        
        if (response.text) {
           const aiResult = JSON.parse(response.text);
           aiEmoji = aiResult.emoji || "";
           isCritical = aiResult.is_critical_bug === true;
        }
      } catch (e) {
        logger.error("Gemini sentiment analysis failed", e);
      }
    }

    if (!aiEmoji || aiEmoji.length > 5) {
      if (rating === 5) aiEmoji = "🤩";
      else if (rating === 4) aiEmoji = "😊";
      else if (rating === 3) aiEmoji = "🤔";
      else aiEmoji = "😡";
    }

    // Try to map to Twemoji for Avatar
    let avatarUrl = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ac.png";
    try {
      const codePoint = aiEmoji.codePointAt(0).toString(16);
      avatarUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;
    } catch(e) {}

    // Webhook Routing
    const targetWebhookUrl = rating >= 4 ? env.DISCORD_WEBHOOK_HIGH_STAR : env.DISCORD_WEBHOOK_LOW_STAR;
    const finalWebhookUrl = targetWebhookUrl || env.DISCORD_WEBHOOK_URL; // Fallback to original URL if not separated

    // Send Discord Webhook if configured
    if (finalWebhookUrl) {
      const emailText = user.email || user.id;
      const starStr = '⭐'.repeat(rating);

      const payload = {
        content: isCritical ? "@everyone 🚨 **CRITICAL SYSTEM ALERT** 🚨 ลูกค้าพบปัญหาร้ายแรง/ระบบล่ม กรุณาตรวจสอบด่วน!" : null,
        username: `AutoScript Feedback ${aiEmoji}`,
        avatar_url: avatarUrl,
        embeds: [{
          title: rating >= 4 ? `${aiEmoji} ลูกค้าประทับใจแอปของเรา!` : (rating === 3 ? `${aiEmoji} มีรีวิวใหม่จากลูกค้า` : `${aiEmoji} ลูกค้าพบปัญหา/ไม่พอใจ!`),
          color: isCritical ? 16711680 : (rating >= 4 ? 3066993 : (rating === 3 ? 16776960 : 15158332)), // Pure Red for critical
          fields: [
            { name: "👤 User", value: emailText, inline: true },
            { name: "⭐️ Rating", value: starStr, inline: true },
            { name: "💬 Comment", value: comment || '-(ไม่ได้พิมพ์ข้อความ)-', inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      };
      
      try {
        await fetch(finalWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (discordErr) {
        logger.error("Failed to send Discord Webhook", discordErr);
      }
    }

    logger.info('Feedback processed successfully', { rating, isCritical });

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    logger.error("Feedback API Error", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
