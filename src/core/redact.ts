/**
 * The redaction engine.
 *
 * Everything here is a pure function over a string. The extension's content
 * script and the landing page's demo both import this file, so the demo is
 * never a mock of the product: it is the product, applied to a sample page.
 */

export type Category = 'card' | 'key' | 'jwt' | 'iban' | 'email';

export interface CategoryMeta {
  id: Category;
  label: string;
  blurb: string;
  sample: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    id: 'card',
    label: 'Card numbers',
    blurb: '13 to 19 digits, and only when the Luhn checksum proves it is a real card.',
    sample: '4242 4242 4242 4242',
  },
  {
    id: 'key',
    label: 'Live API keys',
    blurb: 'Stripe secret and restricted keys, webhook secrets, AWS access keys, GitHub tokens.',
    sample: 'sk_live_51NxQ8K2eZvKYlo2C',
  },
  {
    id: 'jwt',
    label: 'Session tokens',
    blurb: 'Three base64url segments: the token someone pasted into a support thread.',
    sample: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.7mQ2c9',
  },
  {
    id: 'iban',
    label: 'Bank accounts',
    blurb: 'IBANs, and only when the MOD-97 check digits agree. No false alarms on order ids.',
    sample: 'GB82 WEST 1234 5698 7654 32',
  },
  {
    id: 'email',
    label: 'Email addresses',
    blurb: 'Customer addresses, support aliases, the whole CC line.',
    sample: 'priya.raman@northwind.co',
  },
];

const ALL_CATEGORIES: Category[] = CATEGORIES.map((c) => c.id);

interface Rule {
  category: Category;
  pattern: RegExp;
}

const RULES: readonly Rule[] = [
  // Stripe: secret, restricted and publishable keys, plus signing secrets.
  { category: 'key', pattern: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{12,}\b/g },
  { category: 'key', pattern: /\bwhsec_[A-Za-z0-9]{12,}\b/g },
  // AWS access key ids and GitHub tokens.
  { category: 'key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { category: 'key', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g },
  // A JWT is three base64url segments, and the first always starts with eyJ.
  { category: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/g },
  // Cards are validated with Luhn below, never trusted from the shape alone.
  { category: 'card', pattern: /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g },
  // IBANs are validated with MOD-97 below.
  { category: 'iban', pattern: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g },
  { category: 'email', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
];

export interface Match {
  start: number;
  end: number;
  value: string;
  category: Category;
}

/** Luhn checksum: the difference between a card number and a long order id. */
export function luhnValid(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = digits.charCodeAt(i) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0 && !/^(\d)\1+$/.test(digits);
}

/** ISO 13616 MOD-97 check. */
export function ibanValid(value: string): boolean {
  const iban = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (iban.length < 5 || iban.length > 34) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    const chunk = code >= 65 && code <= 90 ? String(code - 55) : char;
    for (const digit of chunk) {
      remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
    }
  }
  return remainder === 1;
}

function isEnabled(enabled: Iterable<Category>, category: Category): boolean {
  for (const item of enabled) if (item === category) return true;
  return false;
}

/**
 * Find every sensitive span in a string, skipping overlaps. Longer matches win:
 * a card number inside a longer number is not a card number.
 */
export function findMatches(text: string, enabled: Iterable<Category> = ALL_CATEGORIES): Match[] {
  const found: Match[] = [];

  for (const rule of RULES) {
    if (!isEnabled(enabled, rule.category)) continue;
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null = rule.pattern.exec(text);
    while (match) {
      const value = match[0];
      const valid =
        rule.category === 'card'
          ? luhnValid(value)
          : rule.category === 'iban'
            ? ibanValid(value)
            : true;
      if (valid) {
        found.push({
          start: match.index,
          end: match.index + value.length,
          value,
          category: rule.category,
        });
      }
      if (match[0].length === 0) rule.pattern.lastIndex += 1;
      match = rule.pattern.exec(text);
    }
  }

  found.sort((a, b) => a.start - b.start || b.end - a.end);

  const kept: Match[] = [];
  for (const match of found) {
    const last = kept[kept.length - 1];
    if (last && match.start < last.end) continue;
    kept.push(match);
  }
  return kept;
}

/** What a redacted value looks like: solid blocks, never a length leak beyond a cap. */
export function maskValue(value: string): string {
  return '█'.repeat(Math.min(24, Math.max(4, value.replace(/\s/g, '').length)));
}

export function emptyCounts(): Record<Category, number> {
  return { card: 0, key: 0, jwt: 0, iban: 0, email: 0 };
}

export function countMatches(matches: readonly Match[]): Record<Category, number> {
  const counts = emptyCounts();
  for (const match of matches) counts[match.category] += 1;
  return counts;
}

export interface RedactedText {
  text: string;
  counts: Record<Category, number>;
  matches: Match[];
}

/** Replace every match with blocks, leaving the rest of the string untouched. */
export function redactText(text: string, enabled: Iterable<Category> = ALL_CATEGORIES): RedactedText {
  const matches = findMatches(text, enabled);
  if (matches.length === 0) return { text, counts: emptyCounts(), matches };

  let output = '';
  let cursor = 0;
  for (const match of matches) {
    output += text.slice(cursor, match.start) + maskValue(match.value);
    cursor = match.end;
  }
  output += text.slice(cursor);

  return { text: output, counts: countMatches(matches), matches };
}
