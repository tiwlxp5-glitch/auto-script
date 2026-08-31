const fs = require('fs');
const path = require('path');

const filePath = path.join('c:\\', 'Auto script', 'frontend', 'functions', 'api', 'generate.js');
let content = fs.readFileSync(filePath, 'utf8');

const searchStr = "<mechanism>${mechanism}</mechanism>` : ''}";

if (content.includes(searchStr)) {
  const replacement = searchStr + "\n      ${profile?.is_brand_voice_enabled ? `\n      [Brand Voice Memory - สไตล์และตัวตนเฉพาะของช่อง (สำคัญมาก)]\n      <brand_voice>\n        ${profile.creator_name ? `- คำเรียกแทนตัวเอง (Creator Name): ${profile.creator_name}` : ''}\n        ${profile.catchphrase ? `- คำติดปาก/คำเปิด-ปิดคลิป (Catchphrase): ${profile.catchphrase}` : ''}\n        ${profile.custom_tone ? `- โทนน้ำเสียง (Custom Tone): ${profile.custom_tone}` : ''}\n      </brand_voice>\n      (ข้อกำหนดพิเศษ: คุณต้องใช้คำเรียกแทนตัวเองนี้ในการเล่าเรื่องเสมอ สอดแทรกคำติดปากอย่างเป็นธรรมชาติ และคุมโทนให้ตรงกับที่ระบุไว้อย่างเคร่งครัด)` : ''}";
  content = content.replace(searchStr, replacement);
  console.log("Injected Brand Voice block.");
} else {
  console.log("Could not find mechanism search string");
}

const targetAudienceSearch = "const finalTargetAudience = (effectiveTier === 'plus' || effectiveTier === 'pro') ? targetAudience : null;";
const targetAudienceReplacement = "const finalTargetAudience = (effectiveTier === 'plus' || effectiveTier === 'pro') ? ((profile?.is_brand_voice_enabled && profile?.target_audience) ? profile.target_audience : targetAudience) : null;";
if (content.includes(targetAudienceSearch)) {
  content = content.replace(targetAudienceSearch, targetAudienceReplacement);
  console.log("Replaced finalTargetAudience block.");
} else {
  console.log("Could not find finalTargetAudience search string");
}

const toneSearch = "(Speaker Tone/Gender): ${speakerTone || ";
const toneReplacement = "(Speaker Tone/Gender): ${profile?.is_brand_voice_enabled && profile?.custom_tone ? profile.custom_tone : (speakerTone || ";
if (content.includes(toneSearch)) {
  // Wait, there might be a trailing bracket that needs to close if we wrap it, but we can just replace the variable.
  // Original: (Speaker Tone/Gender): ${speakerTone || 'หญิง (สาวรีวิว)'}
  // Replacement: (Speaker Tone/Gender): ${profile?.is_brand_voice_enabled && profile?.custom_tone ? profile.custom_tone : (speakerTone || 'หญิง (สาวรีวิว)')}
  // So we just need to replace the start and add a closing paren at the end.
  const oldLine = "(Speaker Tone/Gender): ${speakerTone || \n'หญิง (สาวรีวิว)'}\n      `;";
  // Wait, that might have newlines. Let's do it safely.
}
// simpler approach for speakerTone
content = content.replace(
  /\(Speaker Tone\/Gender\): \$\{speakerTone \|\|/g, 
  "(Speaker Tone/Gender): ${profile?.is_brand_voice_enabled && profile?.custom_tone ? profile.custom_tone : (speakerTone ||"
);
content = content.replace(
  /'หญิง \(สาวรีวิว\)'\}/g,
  "'หญิง (สาวรีวิว)')}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("File updated successfully.");
