import { FORBIDDEN_WORDS, ALLOW_LIST } from './forbidden-words-th.js';
import { 
  normalizeText, 
  collapseRepeatedChars, 
  normalizeThaiVowels,
  stripAllSpaces
} from './normalize-text.js';

/**
 * @typedef {import('./forbidden-words-th.js').ModerationAction} ModerationAction
 * @typedef {import('./forbidden-words-th.js').ModerationSeverity} ModerationSeverity
 * @typedef {import('./forbidden-words-th.js').ModerationCategory} ModerationCategory
 * 
 * @typedef {Object} ModerationResult
 * @property {boolean} blocked - True if action is 'block'
 * @property {ModerationSeverity | 'none'} severity
 * @property {ModerationAction} action
 * @property {ModerationCategory | 'none'} category
 * @property {string[]} matchedTerms
 * @property {number} confidence
 * @property {string} reason
 */

const SEVERITY_RANK = {
  'none': 0,
  'low': 1,
  'medium': 2,
  'high': 3,
  'critical': 4
};

/**
 * Main function to evaluate text against moderation policies.
 * 
 * @param {string} rawText 
 * @returns {ModerationResult}
 */
export function moderateText(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
    return {
      blocked: false,
      severity: 'none',
      action: 'allow',
      category: 'none',
      matchedTerms: [],
      confidence: 100,
      reason: 'Empty or invalid input'
    };
  }

  // 1. Pre-process: Protect ALLOW_LIST words (False Positive Protection)
  // We replace them with a safe placeholder so they don't trigger substring matches.
  let protectedText = rawText;
  ALLOW_LIST.forEach(safeWord => {
    // case insensitive replacement, though Thai doesn't have case
    const regex = new RegExp(safeWord, 'gi');
    protectedText = protectedText.replace(regex, '___SAFE_WORD___');
  });

  // 2. Normalization
  let normalized = normalizeText(protectedText);
  normalized = collapseRepeatedChars(normalized);
  normalized = normalizeThaiVowels(normalized);

  // 3. Obfuscation specific normalized (no spaces)
  let noSpaceText = stripAllSpaces(normalized);

  let highestSeverity = 'none';
  let finalAction = 'allow';
  let matchedCategory = 'none';
  const matchedTerms = [];

  // Helper to update the final result if we find a worse severity
  const updateResult = (wordDef, matchText) => {
    matchedTerms.push(wordDef.term);
    
    if (SEVERITY_RANK[wordDef.severity] > SEVERITY_RANK[highestSeverity]) {
      highestSeverity = wordDef.severity;
      matchedCategory = wordDef.category;
      finalAction = wordDef.action;
    }
    // If severity is the same, but action is block (vs review), prioritize block
    else if (SEVERITY_RANK[wordDef.severity] === SEVERITY_RANK[highestSeverity]) {
       if (wordDef.action === 'block' && finalAction !== 'block') {
         finalAction = 'block';
       }
    }
  };

  // 4. Checking engine - Sort by length descending to prevent shorter words (หี) from triggering inside longer words (เหี้ย)
  const sortedWords = [...FORBIDDEN_WORDS].sort((a, b) => b.term.length - a.term.length);

  for (const word of sortedWords) {
    const matchType = word.matchType || 'contains';

    if (matchType === 'exact') {
      // Split by spaces and check exact words
      const wordsArray = normalized.split(' ');
      if (wordsArray.includes(word.term)) {
        updateResult(word, word.term);
        // Replace to prevent shorter words matching inside
        normalized = normalized.split(' ').map(w => w === word.term ? '___MATCHED___' : w).join(' ');
      }
    } else {
      // 'contains' match
      if (normalized.includes(word.term)) {
        updateResult(word, word.term);
        normalized = normalized.replaceAll(word.term, '___MATCHED___');
        noSpaceText = noSpaceText.replaceAll(word.term, '___MATCHED___');
      } 
      else if ((word.severity === 'high' || word.severity === 'critical') && noSpaceText.includes(word.term)) {
        updateResult(word, word.term);
        noSpaceText = noSpaceText.replaceAll(word.term, '___MATCHED___');
      }
    }
  }

  const result = {
    blocked: finalAction === 'block',
    severity: highestSeverity,
    action: finalAction,
    category: matchedCategory,
    matchedTerms: [...new Set(matchedTerms)], // deduplicate
    confidence: highestSeverity !== 'none' ? 95 : 100, // 95% confidence on deterministic matches
    reason: highestSeverity !== 'none' ? `Detected ${highestSeverity} severity content` : 'Passed all checks'
  };

  return result;
}
