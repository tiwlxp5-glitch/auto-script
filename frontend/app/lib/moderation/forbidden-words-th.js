/**
 * @typedef {'profanity' | 'insult' | 'sexual' | 'harassment' | 'threat' | 'self_harm' | 'hate' | 'illegal_activity' | 'spam' | 'scam'} ModerationCategory
 * @typedef {'low' | 'medium' | 'high' | 'critical'} ModerationSeverity
 * @typedef {'allow' | 'review' | 'block'} ModerationAction
 * @typedef {'exact' | 'contains'} ModerationMatchType
 * 
 * @typedef {Object} ForbiddenWord
 * @property {string} term
 * @property {ModerationCategory} category
 * @property {ModerationSeverity} severity
 * @property {ModerationAction} action
 * @property {ModerationMatchType} [matchType='contains'] - Default is 'contains'
 */

/**
 * @type {ForbiddenWord[]}
 */
export const FORBIDDEN_WORDS = [
  // --- CRITICAL (Threats, Self Harm, Illegal, Severe Sexual) ---
  { term: 'ฆ่าตัวตาย', category: 'self_harm', severity: 'critical', action: 'block' },
  { term: 'กรีดข้อมือ', category: 'self_harm', severity: 'critical', action: 'block' },
  { term: 'อยากตาย', category: 'self_harm', severity: 'high', action: 'review' },
  { term: 'ยาบ้า', category: 'illegal_activity', severity: 'critical', action: 'block' },
  { term: 'ยาไอซ์', category: 'illegal_activity', severity: 'critical', action: 'block' },
  { term: 'ขายปืน', category: 'illegal_activity', severity: 'critical', action: 'block' },
  { term: 'รับจ้างฆ่า', category: 'threat', severity: 'critical', action: 'block' },
  { term: 'ข่มขืน', category: 'sexual', severity: 'critical', action: 'block' },
  { term: 'คลิปหลุด', category: 'sexual', severity: 'high', action: 'block' },
  { term: 'child porn', category: 'sexual', severity: 'critical', action: 'block' },
  { term: 'ค้ามนุษย์', category: 'illegal_activity', severity: 'critical', action: 'block' },
  { term: 'ลอบสังหาร', category: 'threat', severity: 'critical', action: 'block' },

  // --- HIGH (Severe Profanity, Hate Speech, Scam) ---
  { term: 'ควย', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'หี', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'แตด', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'เย็ด', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'fuck', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'แมงดา', category: 'insult', severity: 'high', action: 'block' },
  { term: 'กะหรี่', category: 'insult', severity: 'high', action: 'block' },
  { term: 'ลูกอีช่าง', category: 'insult', severity: 'high', action: 'block' }, // generalized insult pattern
  { term: 'ส้นตีน', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'ไอ้สัส', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'ไอ้เหี้ย', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'อีห่า', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'อีสัตว์', category: 'profanity', severity: 'high', action: 'block' },
  { term: 'หลอกโอนเงิน', category: 'scam', severity: 'high', action: 'block' },
  { term: 'พนันออนไลน์', category: 'spam', severity: 'high', action: 'block' },
  { term: 'เว็บสล็อต', category: 'spam', severity: 'high', action: 'block' },
  { term: 'บาคาร่า', category: 'spam', severity: 'high', action: 'block' },
  
  // --- MEDIUM (General Insults, Profanity dependent on context) ---
  { term: 'เหี้ย', category: 'profanity', severity: 'medium', action: 'review' },
  { term: 'สัส', category: 'profanity', severity: 'medium', action: 'review' },
  { term: 'สัตว์', category: 'insult', severity: 'medium', action: 'review', matchType: 'exact' }, // exact match to allow "สัตว์เลี้ยง"
  { term: 'เสือก', category: 'insult', severity: 'medium', action: 'review' },
  { term: 'ตอแหล', category: 'insult', severity: 'medium', action: 'review' },
  { term: 'หน้าด้าน', category: 'insult', severity: 'medium', action: 'review' },
  { term: 'สันดาน', category: 'insult', severity: 'medium', action: 'review', matchType: 'exact' }, // 'สันดาน' by itself is often an insult, but needs exact match 
  { term: 'ชาติหมา', category: 'insult', severity: 'medium', action: 'block' },
  { term: 'bitch', category: 'insult', severity: 'medium', action: 'block' },
  { term: 'shit', category: 'profanity', severity: 'medium', action: 'review' },
  { term: 'หน้าโง่', category: 'insult', severity: 'medium', action: 'review' },

  // --- LOW (Mild words, highly contextual) ---
  { term: 'กู', category: 'profanity', severity: 'low', action: 'allow', matchType: 'exact' }, 
  { term: 'มึง', category: 'profanity', severity: 'low', action: 'allow', matchType: 'exact' },
  { term: 'แม่ง', category: 'profanity', severity: 'low', action: 'allow' },
  { term: 'ไอ้', category: 'profanity', severity: 'low', action: 'allow', matchType: 'exact' },
  { term: 'อี', category: 'profanity', severity: 'low', action: 'allow', matchType: 'exact' },
  { term: 'บ้า', category: 'insult', severity: 'low', action: 'allow', matchType: 'exact' },
];

/**
 * Words that might trigger false positives but should be allowed.
 * We remove or mask these before checking against forbidden words.
 */
export const ALLOW_LIST = [
  'สัตว์เลี้ยง',
  'สัตว์ป่า',
  'สัตวแพทย์',
  'โหดเหี้ยม', // changed from เหี้ยม to avoid false positive overlap with เหี้ยมาก
  'หีบ',   // box
  'คอย',   // wait (close to ควย sometimes due to typos, but explicitly safe)
  'บ้าบอ',
  'ลูกเกด',
  'หอย',   // shell/oyster
  'หอยแมลงภู่',
];
