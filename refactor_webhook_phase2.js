const fs = require('fs');

let code = fs.readFileSync('frontend/functions/api/webhook.js', 'utf8');

// 1. Missing client_reference_id fallback
/* Old code:
    let userId = session.client_reference_id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing client_reference_id" }), { status: 400 });
    }
*/
code = code.replace(
  /let userId = session\.client_reference_id;\s*if \(\!userId\) \{[\s\S]*?status: 400 \}\);\s*\}/,
  `let userId = session.client_reference_id;

    if (!userId && (session.customer_details?.email || session.customer_email)) {
      const customerEmail = session.customer_details?.email || session.customer_email;
      const { data: userRecord } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .single();
      if (userRecord?.id) {
        userId = userRecord.id;
      }
    }

    if (!userId) {
      console.error(\`CRITICAL: Unable to resolve userId for Stripe session \${session.id}. Rolling back event to trigger retry.\`);
      await supabaseAdmin.from('webhook_events').delete().eq('id', event.id);
      return new Response(JSON.stringify({ error: "Missing customer identification" }), { status: 400 });
    }`
);

// 2. Unconditional Tier Upsert Causes Pro Users to be Demoted
/* Old code:
    let tier = 'plus';
    let addCredits = 60;

    if (amountPaid >= 59000) {
      tier = 'pro';
      addCredits = 150;
    }

    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: userId, 
        tier: tier, 
        stripe_customer_id: session.customer 
      }, { onConflict: 'id' });
*/
code = code.replace(
  /let tier = 'plus';[\s\S]*?\}, \{ onConflict: 'id' \}\);/,
  `let addCredits = 60;
    if (amountPaid >= 59000) {
      addCredits = 150;
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single();

    const currentTier = existingProfile?.tier;
    const targetTier = (currentTier === 'pro' || amountPaid >= 59000) ? 'pro' : 'plus';

    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: userId, 
        tier: targetTier, 
        stripe_customer_id: session.customer 
      }, { onConflict: 'id' });`
);

fs.writeFileSync('frontend/functions/api/webhook.js', code, 'utf8');
console.log('webhook.js refactored');
