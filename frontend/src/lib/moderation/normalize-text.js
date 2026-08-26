/**
 * normalizes text to prevent obfuscation bypasses
 * Handles:
 * - Unicode normalization
 * - Lowercase
 * - Trim
 * - Whitespace normalization
 * - Zero-width character removal
 * - Punctuation stripping
 * - Repeated character collapsing (with Thai language awareness)
 * - Removes inserted symbols
 */

/**
 * Normalizes text to help match against the moderation dataset.
 * Note: We return multiple variations if needed, or a highly simplified version.
 * 
 * @param {string} text - Raw input text
 * @returns {string} - Normalized text for engine matching
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';

  let normalized = text;

  // 1. Unicode Normalization (NFC usually best for Thai)
  // Decomposing (NFD) might separate characters and tone marks, which is sometimes useful 
  // but NFC is standard. We'll stick to standard NFC and handle obfuscation manually.
  normalized = normalized.normalize('NFC');

  // 2. Lowercase (for English terms)
  normalized = normalized.toLowerCase();

  // 3. Remove zero-width characters & invisible characters
  // \u200B-\u200D (zero width spaces, joiners)
  // \uFEFF (BOM)
  // \u202A-\u202E (LTR/RTL overrides)
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u034F\u2060-\u206F]/g, '');

  // 4. Remove unwanted punctuation and symbols that might be used to split words.
  // We keep Thai characters, English letters, and Numbers. 
  // Note: Thai unicode range is \u0E00-\u0E7F
  // We also keep spaces initially to handle words, but we'll compress them.
  // Instead of removing all symbols, we remove standard punctuation often used for obfuscation: . , - _ * @ # ! ?
  normalized = normalized.replace(/[.,\-_*@#!?$%^&()+=\[\]{};:'"\\|<>\/`~]/g, '');

  // 5. Compress multiple spaces into a single space
  normalized = normalized.replace(/\s+/g, ' ');

  // 6. Trim
  normalized = normalized.trim();

  return normalized;
}

/**
 * Creates an aggressive stripped version for detecting hidden words (e.g., ส-ั-ส, ค ว ย)
 * Removes ALL spaces. This is strictly for matching specific highly restricted words 
 * because stripping all spaces in Thai can combine harmless words into bad words (False Positive).
 * We will use this specifically against Obfuscation rules.
 * 
 * @param {string} text
 * @returns {string}
 */
export function stripAllSpaces(text) {
  return text.replace(/\s+/g, '');
}

/**
 * Reduces repeated characters. e.g., "หยาบบบบ" -> "หยาบ"
 * For Thai, we need to be careful with double characters (e.g., "สรร" is valid).
 * For English, "hello" has double 'l'.
 * We will reduce 3 or more repeating characters down to 1 (or 2, depending on language).
 * 
 * @param {string} text 
 * @returns {string}
 */
export function collapseRepeatedChars(text) {
  // Replace 3 or more of the same character with just 1 of that character
  // (e.g. "คคคควย" -> "ควย", "heellllo" -> "helo")
  // It might break valid words with double chars if we used 2, so we use 3+ to be safe.
  return text.replace(/(.)\1{2,}/gu, '$1');
}

/**
 * Specialized Obfuscation Normalizer (Thai Vowels)
 * Sometimes users put tone marks and vowels out of order or repeat them
 * e.g., ห + ี + ้ + ้
 */
export function normalizeThaiVowels(text) {
  // Remove repeated consecutive identical Thai vowels/tone marks (e.g. ้้้ -> ้)
  // Thai vowels/tones are roughly \u0E30-\u0E4F
  return text.replace(/([\u0E30-\u0E4F])\1+/g, '$1');
}

