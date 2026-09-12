import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { cleanup, mountElement, getPathsFor } from './helpers.js';

afterEach(cleanup);

function decimalPlaces(value: string): number {
  const match = /\.(\d+)/.exec(value);

  return match ? match[1]!.length : 0;
}

/** CSS time values serialise as seconds in Chromium, so normalise to ms. */
function durationMs(value: string): number {
  if (value.endsWith('ms')) return parseFloat(value);
  if (value.endsWith('s')) return parseFloat(value) * 1000;

  return parseFloat(value);
}

describe('numeric precision', () => {
  it('rounds path coordinates to at most two decimal places', () => {
    const element = mountElement();

    annotate(element, { type: 'wavy', animate: false }).show();

    const d = getPathsFor(element)[0]!.getAttribute('d')!;
    const numbers = d.match(/-?\d+(\.\d+)?/g) ?? [];

    expect(numbers.length).toBeGreaterThan(0);
    numbers.forEach((value) => expect(decimalPlaces(value)).toBeLessThanOrEqual(2));
  });

  it('rounds stroke-dasharray and stroke-dashoffset to at most two decimal places', () => {
    const element = mountElement();

    annotate(element, { type: 'underline' }).show();

    const path = getPathsFor(element)[0]!;

    expect(decimalPlaces(path.style.strokeDasharray)).toBeLessThanOrEqual(2);
    expect(decimalPlaces(path.style.strokeDashoffset)).toBeLessThanOrEqual(2);
  });

  it('rounds animation duration and delay to one decimal place of a millisecond', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', animationDuration: 333.456, delay: 12.345 }).show();

    const path = getPathsFor(element)[0]!;

    expect(durationMs(path.style.animationDuration)).toBeCloseTo(333.5, 1);
    expect(durationMs(path.style.animationDelay)).toBeCloseTo(12.3, 1);
  });
});
