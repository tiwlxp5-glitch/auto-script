const fs = require('fs');

let code = fs.readFileSync('frontend/functions/api/delete-account.js', 'utf8');

// Add Stripe import at the top
if (!code.includes("import Stripe from 'stripe'")) {
  code = code.replace(
    /import \{ createClient \} from '@supabase\/supabase-js';/,
    `import { createClient } from '@supabase/supabase-js';\nimport Stripe from 'stripe';`
  );
}

// 2. Add Stripe Customer deletion
/* Old code:
    // Delete the user from Supabase Auth (this cascades to profiles and scripts)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
*/
code = code.replace(
  /\/\/ Delete the user from Supabase Auth/,
  `// Check for associated Stripe Customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_customer_id && env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        await stripe.customers.del(profile.stripe_customer_id);
      } catch (stripeErr) {
        console.warn("Failed to delete Stripe customer:", stripeErr.message);
      }
    }

    // Delete the user from Supabase Auth`
);

fs.writeFileSync('frontend/functions/api/delete-account.js', code, 'utf8');
console.log('delete-account.js refactored');
