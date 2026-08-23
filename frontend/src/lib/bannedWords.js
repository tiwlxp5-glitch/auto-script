// รายการคำต้องห้าม หรือคำที่เสี่ยงโดนแบนบนแพลตฟอร์มต่างๆ (TikTok, Shopee, Facebook)
export const bannedWords = [
  {
    word: "ขาวถาวร",
    reason: "อ้างสรรพคุณเกินจริง (Overclaim) เสี่ยงโดนปิดกั้นการมองเห็น"
  },
  {
    word: "ลดน้ำหนัก",
    reason: "เป็นคำอ่อนไหวในหมวดสุขภาพ แนะนำให้ใช้คำว่า 'ดูแลรูปร่าง' หรือ 'คุมน้ำหนัก' แทน"
  },
  {
    word: "เห็นผล 100%",
    reason: "เป็นการการันตีผลลัพธ์เกินจริง ผิดกฎโฆษณา"
  },
  {
    word: "ฆ่าเชื้อ",
    reason: "อาจเข้าข่ายผลิตภัณฑ์ทางการแพทย์ ต้องมีใบอนุญาต"
  },
  {
    word: "ดีที่สุดในโลก",
    reason: "ข้อความโฆษณาโอ้อวดเกินจริง ไม่สามารถพิสูจน์ได้"
  },
  {
    word: "รักษา",
    reason: "ห้ามใช้กับเครื่องสำอางหรืออาหารเสริม เพราะถือว่าอ้างสรรพคุณทางยา"
  }
];

export function scanForBannedWords(text) {
  if (!text) return [];
  
  const foundWarnings = [];
  
  bannedWords.forEach(banned => {
    // ใช้ RegExp เพื่อค้นหาคำแบบไม่สนใจตัวพิมพ์เล็กใหญ่
    if (text.includes(banned.word)) {
      foundWarnings.push(banned);
    }
  });
  
  return foundWarnings;
}

export function highlightBannedWords(text, foundWarnings) {
  if (!text || foundWarnings.length === 0) return text;
  
  let highlightedText = text;
  
  foundWarnings.forEach(warning => {
    // ไฮไลต์ด้วยพื้นหลังสีแดง ตัวหนังสือสีขาว
    const replacement = `<span class="bg-red-500 text-white px-1 rounded mx-0.5 cursor-help" title="${warning.reason}">${warning.word}</span>`;
    // แทนที่คำทั้งหมดที่เจอ (ใช้ split/join ง่ายสุดสำหรับ String ธรรมดาที่ไม่ใช่ Regex ซับซ้อน)
    highlightedText = highlightedText.split(warning.word).join(replacement);
  });
  
  return highlightedText;
}
