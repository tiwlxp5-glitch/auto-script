// Dictionary of banned profanity and explicit words
export const profanityWords = [
  "ควย",
  "เหี้ย",
  "สัส",
  "สัตว์",
  "เย็ด",
  "หี",
  "แตด",
  "เงี่ยน",
  "เสือก",
  "กะหรี่",
  "ระยำ",
  "จัญไร",
  "ส้นตีน",
  "แม่ง",
  "ชิบหาย",
  "ฉิบหาย",
  "โคตร", // Sometimes used as slang, but often in profanity context. Will leave it out if too broad? Actually 'โคตร' is very common (e.g., โคตรดี). Let's NOT ban 'โคตร'.
  "พ่อง",
  "แม่มึง",
  "พ่อมึง",
  "ดอกทอง",
  "ตอแหล",
  "แรด",
  "หน้าตัวเมีย",
  "ไอ้สัส",
  "อีสัส",
  "ไอ้เหี้ย",
  "อีเหี้ย",
  "เย็ดแม่",
  "ควาย", // Could be animal, but usually an insult.
  "อีดอก",
  "ไอ้สัตว์",
  "อีสัตว์",
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "pussy",
  "cunt",
  "whore",
  "slut"
];

// Refined list removing false positives (like โคตร, ควาย could be borderline but okay to ban in this context)
const refinedProfanity = [
  "ควย", "เหี้ย", "สัส", "เย็ด", "หี", "แตด", "เงี่ยน", "กะหรี่", "ระยำ", "จัญไร", 
  "ส้นตีน", "แม่ง", "ชิบหาย", "ฉิบหาย", "พ่อง", "แม่มึง", "พ่อมึง", "ดอกทอง", "ตอแหล", 
  "หน้าตัวเมีย", "ไอ้สัส", "อีสัส", "ไอ้เหี้ย", "อีเหี้ย", "เย็ดแม่", "อีดอก", "ไอ้สัตว์", 
  "อีสัตว์", "fuck", "shit", "bitch", "bastard", "asshole", "dick", "pussy", "cunt", "whore", "slut"
];

export function containsProfanity(text) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  for (let word of refinedProfanity) {
    if (lowerText.includes(word.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}
