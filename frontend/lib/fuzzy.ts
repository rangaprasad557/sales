/**
 * Typo-tolerant sequential fuzzy matching utility
 * e.g. 'bsmt' matches 'Royal Basmati Rice 5kg'
 */
export function fuzzyMatch(pattern: string, text: string): boolean {
  if (!pattern) return true;
  pattern = pattern.toLowerCase();
  text = text.toLowerCase();

  // Substring match always passes
  if (text.includes(pattern)) return true;

  // Sequential character match (e.g. 'bsmt' -> 'basmati')
  let patternIdx = 0;
  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === pattern.length;
}
