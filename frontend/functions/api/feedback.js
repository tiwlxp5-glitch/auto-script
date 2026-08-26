import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

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
    const rating = parseInt(body.rating, 10);
    const comment = (body.comment || '').slice(0, 1000); // Max 1000 chars to prevent abuse

    if (isNaN(rating) || rating < 1 || rating > 5) {
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
      console.error("Failed to insert feedback:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save feedback" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Send Discord Webhook if configured
    if (env.DISCORD_WEBHOOK_URL) {
      const emailText = user.email || user.id;
      const starStr = '⭐'.repeat(rating);
      
      const payload = {
        username: "AutoScript Feedback",
        avatar_url: "https://cdn-icons-png.flaticon.com/512/3260/3260838.png",
        embeds: [{
          title: "📢 มีรีวิวใหม่จากลูกค้า!",
          color: rating >= 4 ? 3066993 : (rating === 3 ? 16776960 : 15158332), // Green/Yellow/Red
          fields: [
            { name: "👤 User", value: emailText, inline: true },
            { name: "⭐️ Rating", value: starStr, inline: true },
            { name: "💬 Comment", value: comment || '-(ไม่ได้พิมพ์ข้อความ)-', inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      };
      
      try {
        await fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (discordErr) {
        console.error("Failed to send Discord Webhook:", discordErr);
        // Do not throw error, we still want to return success to the user
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Feedback API Error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
