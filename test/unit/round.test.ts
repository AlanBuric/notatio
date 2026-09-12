import { describe, expect, it } from 'vitest';
import { round } from '@/round.js';

describe('round', () => {
  it('rounds to the given number of decimal places', () => {
    expect(round(1.23456, 2)).toBe(1.23);
    expect(round(1.239, 2)).toBe(1.24);
  });

  it('rounds to the nearest integer when given zero decimals', () => {
    expect(round(1.5, 0)).toBe(2);
    expect(round(1.4, 0)).toBe(1);
  });

  it('drops trailing zeros rather than padding to a fixed width', () => {
    expect(round(5, 2)).toBe(5);
    expect(round(5.1, 2)).toBe(5.1);
  });

  it('rounds negative numbers correctly', () => expect(round(-1.23456, 2)).toBe(-1.23));
});
