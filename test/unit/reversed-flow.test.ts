import { describe, expect, it } from 'vitest';
import { isReversedFlow } from '@/frame.js';

function getStyle(direction: string, writingMode: string): CSSStyleDeclaration {
  return { direction, writingMode } as CSSStyleDeclaration;
}

describe('isReversedFlow', () => {
  it.each([
    { direction: 'ltr', writingMode: 'horizontal-tb', expected: false },
    { direction: 'rtl', writingMode: 'horizontal-tb', expected: true },
    { direction: 'ltr', writingMode: 'vertical-rl', expected: false },
    { direction: 'ltr', writingMode: 'vertical-lr', expected: false },
  ])('follows $direction under $writingMode', ({ direction, writingMode, expected }) => {
    expect(isReversedFlow(getStyle(direction, writingMode))).toBe(expected);
  });

  it('reverses a vertical mode under rtl', () => {
    expect(isReversedFlow(getStyle('rtl', 'vertical-rl'))).toBe(true);
    expect(isReversedFlow(getStyle('rtl', 'vertical-lr'))).toBe(true);
  });

  it('treats sideways-lr as bottom to top', () => {
    expect(isReversedFlow(getStyle('ltr', 'sideways-lr'))).toBe(true);
  });

  it('cancels sideways-lr against rtl', () => {
    expect(isReversedFlow(getStyle('rtl', 'sideways-lr'))).toBe(false);
  });
});
