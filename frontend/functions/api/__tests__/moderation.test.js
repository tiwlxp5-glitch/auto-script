import { describe, it, expect } from 'vitest';
import { moderateText, containsThaiObfuscation } from '../../../app/lib/moderation/engine.js';
import { normalizeText, stripAllSpaces, collapseRepeatedChars } from '../../../app/lib/moderation/normalize-text.js';

describe('Text Normalization', () => {
  it('should remove zero-width chars and standard punctuation', () => {
    const text = 'ค\u200Bว\u200Bย.มึ-ง';
    const norm = normalizeText(text);
    expect(norm).toBe('ควยมึง');
  });

  it('should collapse repeated chars (3 or more) to single char', () => {
    expect(collapseRepeatedChars('หยาบบบบ')).toBe('หยาบ');
    expect(collapseRepeatedChars('สรรรร')).toBe('สร');
    expect(collapseRepeatedChars('heeeellllooo')).toBe('helo');
  });
});

describe('Content Moderation Engine', () => {
  describe('Normal Text (Should ALLOW)', () => {
    it('allows standard Thai text', () => {
      const result = moderateText('วันนี้อากาศดีมาก');
      expect(result.action).toBe('allow');
      expect(result.blocked).toBe(false);
    });

    it('allows business and review prompts', () => {
      const result = moderateText('ช่วยเขียนสคริปต์ขายสินค้า ครีมกันแดดให้หน่อย ขอแบบรีวิวจริงใจ');
      expect(result.action).toBe('allow');
    });

    it('allows English and mixed language', () => {
      const result = moderateText('Hello world! สินค้าตัวนี้ work มาก');
      expect(result.action).toBe('allow');
    });
  });

  describe('Direct Profanity & Critical Terms (Should BLOCK/REVIEW)', () => {
    it('blocks high severity words', () => {
      const result = moderateText('ไอ้สัส เอ้ย');
      expect(result.action).toBe('block');
      expect(result.severity).toBe('high');
      expect(result.matchedTerms).toContain('ไอ้สัส');
    });

    it('reviews medium severity words', () => {
      const result = moderateText('เหี้ยมาก');
      expect(result.action).toBe('review');
      expect(result.severity).toBe('medium');
    });

    it('blocks critical terms (illegal/self-harm)', () => {
      const result = moderateText('รับจ้างฆ่าคน');
      expect(result.action).toBe('block');
      expect(result.severity).toBe('critical');
    });

    it('blocks explicit English words', () => {
      const result = moderateText('what the fuck');
      expect(result.action).toBe('block');
      expect(result.matchedTerms).toContain('fuck');
    });
  });

  describe('Obfuscation Detection (Should catch)', () => {
    it('catches space-separated words', () => {
      const result = moderateText('ค ว ย');
      expect(result.action).toBe('block');
    });

    it('catches symbol-inserted words', () => {
      const result = moderateText('เ-ย็-ด');
      expect(result.action).toBe('block');
    });

    it('catches repeating characters', () => {
      const result = moderateText('คคคคคววววยยยย');
      expect(result.action).toBe('block');
    });

    it('catches mixed obfuscation', () => {
      const result = moderateText('ไ-อ้...สั_ส_ส_ส');
      expect(result.action).toBe('block');
    });
  });

  describe('False Positive Protection', () => {
    it('allows specific words in ALLOW_LIST', () => {
      const result = moderateText('น้องหมาเป็นสัตว์เลี้ยงที่น่ารัก');
      // "สัตว์" by itself is medium/review, but "สัตว์เลี้ยง" is in ALLOW_LIST
      expect(result.action).toBe('allow');
    });

    it('allows contextual words that contain restricted substrings', () => {
      const result = moderateText('หีบใส่ของเก่า'); // Contains 'หี' which is high/block
      expect(result.action).toBe('allow');
    });

    it('allows contextual names/places', () => {
      const result = moderateText('ฉันชื่อบอย รอคอยเธอมานาน'); // "คอย" is in ALLOW_LIST to prevent clash with "ควย" space stripped
      expect(result.action).toBe('allow');
    });

    it('exact match works for contextual low severity', () => {
      const result = moderateText('บ้าบอที่สุด'); // "บ้า" is exact match, so "บ้าบอ" should pass
      expect(result.action).toBe('allow');
    });
  });
});
