import { describe, expect, it } from 'vitest';
import { roundCurrency } from './money';

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCurrency(112.5)).toBe(112.5);
    expect(roundCurrency(10.005)).toBe(10.01);
    expect(roundCurrency(10.004)).toBe(10);
  });

  it('fixes classic floating point artifacts', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in raw JS floats.
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });

  it('handles zero and negative values', () => {
    expect(roundCurrency(0)).toBe(0);
    expect(roundCurrency(-5.555)).toBe(-5.55);
  });
});
