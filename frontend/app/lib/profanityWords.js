export const profanityWords = [
  // Sexual Organs (Explicit)
  "ควย", "ค.ย", "ค_ย", "หี", "ฮี", "แตด", "หำ", "จิ๋ม", "จู๋", "เจี๊ยว", "ไข่ดัน",
  
  // Sexual Acts (Explicit)
  "เย็ด", "เด้า", "เอาแม่", "เงี่ยน", "อมควย", "เลียหี",
  
  // Insults & Slurs (Animals/Creatures)
  "เหี้ย", "เชี่ย", "สัส", "ไอ้สัส", "อีสัส", "สัตว์", "ควาย", "ไอ้ควาย", "อีควาย", "หมา", "หน้าหมา", "ลูกหมา",
  
  // Insults & Slurs (Degrading)
  "กะหรี่", "กะรี่", "ดอกทอง", "แรด", "หน้าตัวเมีย", "หน้าหี", "หน้าส้นตีน", "ส้นตีน",
  
  // Swear words & Curses
  "แม่ง", "ชิบหาย", "ฉิบหาย", "ระยำ", "จัญไร", "เปรต", "เสือก",
  
  // Family Insults
  "พ่อง", "พ่อมึง", "แม่มึง", "พ่อตาย", "แม่ตาย", "เย็ดแม่",
  
  // English Profanity
  "fuck", "shit", "bitch", "bastard", "asshole", "dick", "pussy", "cunt", "whore", "slut", "motherfucker"
];

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsProfanity(text) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  for (let word of profanityWords) {
    // Exact word boundary matching for Thai is tricky because there are no spaces.
    // However, if we just do a simple substring check, "หำ" blocks "มหำมาตย์" (if it existed), 
    // but the user chose "exact word". For Thai, since there are no spaces, 
    // basic substring is actually required unless we use a tokenizer.
    // To prevent "ข้าวต้มมัด" from blocking (if we had banned 'ต้มมัด'), we have to be careful about the dictionary.
    // Since our dictionary is very specific (หำ, ควย, หี), substring matching is the only way in JS without NLP.
    
    // For English words, we CAN use word boundaries
    if (/^[a-zA-Z]+$/.test(word)) {
      const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
      if (regex.test(lowerText)) {
        return true;
      }
    } else {
      // For Thai words, we must use includes(). We just need to make sure our dictionary 
      // doesn't contain overly short/common syllables that appear in normal words.
      if (lowerText.includes(word)) {
        // Special case check for "หำ" to prevent False Positives with "ระห่ำ" (ระ-ห่ำ) or similar if needed.
        // Actually, "หำ" is quite unique.
        // Wait, "หมา" -> "หมวก" (no), "มหาวิทยาลัย" (no). "หมา" is fine.
        // "หี" -> "หีบ" (Heeb). "หีบ" will match "หี"! This is a false positive!
        // To fix this, we can check if it's part of a safe word.
        
        const safeWords = ["หีบ", "มหาวิทยาลัย", "หมาด", "สมาน", "อหังการ"];
        
        // If the text contains the profanity, let's see if the text ONLY contains it as part of a safe word.
        // A simple way is to remove safe words from the text before checking.
        let cleanedText = lowerText;
        for (let safe of safeWords) {
          cleanedText = cleanedText.split(safe).join('');
        }
        
        if (cleanedText.includes(word)) {
          return true;
        }
      }
    }
  }
  
  return false;
}
