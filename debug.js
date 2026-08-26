import { moderateText } from './frontend/src/lib/moderation/engine.js';
import { normalizeText } from './frontend/src/lib/moderation/normalize-text.js';

console.log(normalizeText('เหี้ยมาก'));
console.log(moderateText('เหี้ยมาก'));
