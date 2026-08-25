const fs = require('fs');
let genCode = fs.readFileSync('frontend/functions/api/generate.js', 'utf8');

genCode = genCode.replace(
  /export async function onRequestPost\(context\) \{[\s\S]*?const \{ request, env \} = context;[\s\S]*?try \{/,
  `export async function onRequestPost(context) {
  const { request, env } = context;
  let creditDeducted = false;
  let userIdForRefund = null;

  try {`
);

genCode = genCode.replace(
  /const \{ data: updatedCredits, error: creditError \} = await supabaseAdmin.rpc\('increment_credits', \{[\s\S]*?p_user_id: user\.id,[\s\S]*?p_amount: -1[\s\S]*?\}\);/,
  `userIdForRefund = user.id;
    const { data: updatedCredits, error: creditError } = await supabaseAdmin.rpc('increment_credits', {
      p_user_id: user.id,
      p_amount: -1
    });`
);

genCode = genCode.replace(
  /let creditDeducted = true;/,
  `creditDeducted = true;`
);

genCode = genCode.replace(
  /catch \(err\) \{[\s\S]*?if \(typeof creditDeducted !== 'undefined' && creditDeducted\) \{/,
  `catch (err) {
    if (creditDeducted && userIdForRefund) {`
);

genCode = genCode.replace(
  /await supabaseAdmin\.rpc\('increment_credits', \{ p_user_id: user\.id, p_amount: 1 \}\);/,
  `await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });`
);

fs.writeFileSync('frontend/functions/api/generate.js', genCode, 'utf8');
console.log('Fixed block scoping in generate.js!');
