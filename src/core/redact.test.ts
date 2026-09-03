import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  findMatches,
  ibanValid,
  luhnValid,
  maskValue,
  redactText,
} from './redact';

const cats = (...ids: string[]) => ids as never;

describe('luhnValid', () => {
  it('accepts a real test card and rejects a single-digit change', () => {
    expect(luhnValid('4242 4242 4242 4242')).toBe(true);
    expect(luhnValid('4242 4242 4242 4241')).toBe(false);
    expect(luhnValid('5555555555554444')).toBe(true);
    expect(luhnValid('378282246310005')).toBe(true);
  });

  it('rejects repeated digits, short numbers and long order ids', () => {
    expect(luhnValid('0000000000000000')).toBe(false);
    expect(luhnValid('424242424242')).toBe(false);
    expect(luhnValid('42424242424242424242')).toBe(false);
  });
});

describe('ibanValid', () => {
  it('accepts a valid IBAN with and without spaces', () => {
    expect(ibanValid('GB82 WEST 1234 5698 7654 32')).toBe(true);
    expect(ibanValid('DE89370400440532013000')).toBe(true);
  });

  it('rejects a broken check digit', () => {
    expect(ibanValid('GB83 WEST 1234 5698 7654 32')).toBe(false);
    expect(ibanValid('XX00 0000 0000')).toBe(false);
  });
});

describe('findMatches', () => {
  it('finds each category in a line of real-looking text', () => {
    const text =
      'Card 4242 4242 4242 4242, key sk_live_51NxQ8K2eZvKYlo2C, token ' +
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.7mQ2c9, acct GB82 WEST 1234 5698 7654 32, mail priya@northwind.co';
    const found = findMatches(text);
    expect(found.map((m) => m.category)).toEqual(['card', 'key', 'jwt', 'iban', 'email']);
    expect(found.map((m) => m.value)).toEqual([
      '4242 4242 4242 4242',
      'sk_live_51NxQ8K2eZvKYlo2C',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.7mQ2c9',
      'GB82 WEST 1234 5698 7654 32',
      'priya@northwind.co',
    ]);
  });

  it('leaves order ids, versions and prose alone', () => {
    const text = 'Order 1234-5678-9012 shipped; build 2026.10.30; ping @northwind.';
    expect(findMatches(text)).toEqual([]);
  });

  it('does not match a card-shaped number that fails the checksum', () => {
    expect(findMatches('4242 4242 4242 4241')).toEqual([]);
  });

  it('honours the enabled categories', () => {
    const text = '4242 4242 4242 4242 and priya@northwind.co';
    expect(findMatches(text, cats('email')).map((m) => m.category)).toEqual(['email']);
    expect(findMatches(text, cats('card')).map((m) => m.category)).toEqual(['card']);
    expect(findMatches(text, [])).toEqual([]);
  });

  it('returns matches in order and never overlapping', () => {
    const text = 'a 4242 4242 4242 4242 b sk_live_abcdefghijklmnop c';
    const found = findMatches(text);
    for (let i = 1; i < found.length; i += 1) {
      expect(found[i].start).toBeGreaterThanOrEqual(found[i - 1].end);
    }
  });

  it('finds every category the engine advertises', () => {
    const sample = CATEGORIES.map((c) => c.sample).join(' ');
    const found = findMatches(sample);
    expect(new Set(found.map((m) => m.category)).size).toBe(CATEGORIES.length);
  });
});

describe('redaction output', () => {
  it('keeps the surrounding text and swaps only the sensitive spans', () => {
    const result = redactText('charge 4242 4242 4242 4242 for priya@northwind.co');
    expect(result.text).toBe(
      `charge ${maskValue('4242 4242 4242 4242')} for ${maskValue('priya@northwind.co')}`,
    );
    expect(result.text).not.toContain('4242');
    expect(result.text).not.toContain('priya@northwind.co');
    expect(result.counts.card).toBe(1);
    expect(result.counts.email).toBe(1);
    expect(result.counts.key).toBe(0);
  });

  it('leaves clean text byte for byte', () => {
    const clean = 'nothing to hide here';
    expect(redactText(clean).text).toBe(clean);
  });

  it('masks with blocks and caps the width', () => {
    expect(maskValue('4242424242424242')).toHaveLength(16);
    expect(maskValue('a@b.co')).toHaveLength(6);
    expect(maskValue('x'.repeat(200))).toHaveLength(24);
  });
});
