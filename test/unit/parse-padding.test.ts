import { describe, expect, it } from 'vitest';
import { parsePadding } from '@/render/index.js';
import type { FullPadding, RoughPadding } from '@/types.js';

function withPadding(padding?: RoughPadding) {
  return { type: 'box', padding };
}

describe('parsePadding', () => {
  it('defaults to 5px on every side when padding is omitted', () => {
    expect(parsePadding(withPadding())).toEqual([5, 5, 5, 5]);
  });

  it('applies a single number to every side', () => {
    expect(parsePadding(withPadding(3))).toEqual([3, 3, 3, 3]);
  });

  it('honours an explicit zero rather than falling back to the default', () => {
    expect(parsePadding(withPadding(0))).toEqual([0, 0, 0, 0]);
  });

  it('accepts negative padding', () => {
    expect(parsePadding(withPadding(-4))).toEqual([-4, -4, -4, -4]);
  });

  it.each<{ input: RoughPadding; expected: FullPadding; label: string }>([
    { input: [7], expected: [7, 7, 7, 7], label: '1 value covers all sides' },
    { input: [1, 2], expected: [1, 2, 1, 2], label: '2 values are block then inline' },
    { input: [1, 2, 3], expected: [1, 2, 3, 2], label: '3 values reuse right for left' },
    { input: [1, 2, 3, 4], expected: [1, 2, 3, 4], label: '4 values map directly' },
  ])('follows CSS shorthand semantics: $label', ({ input, expected }) => {
    expect(parsePadding(withPadding(input))).toEqual(expected);
  });

  it('falls back to the default for an empty array', () => {
    expect(parsePadding(withPadding([] as any))).toEqual([5, 5, 5, 5]);
  });

  it('ignores entries beyond the fourth', () => {
    expect(parsePadding(withPadding([1, 2, 3, 4, 5, 6] as any))).toEqual([1, 2, 3, 4]);
  });

  it('does not alias the caller array', () => {
    const padding: RoughPadding = [1, 2, 3, 4];
    const parsed = parsePadding(withPadding(padding));

    parsed[0] = 99;

    expect(padding[0]).toBe(1);
  });
});
