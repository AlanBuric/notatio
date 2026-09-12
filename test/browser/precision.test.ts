import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { cleanup, mountElement, getPathsFor } from './helpers.js';

afterEach(cleanup);

function getDecimalPlaces(value: string): number {
  return value.split('.')[1]?.length ?? 0;
}

/** CSS time values serialise as seconds in Chromium, so normalise to ms. */
function durationMs(value: string): number {
  if (value.endsWith('ms')) return parseFloat(value);
  if (value.endsWith('s')) return parseFloat(value) * 1000;

  return parseFloat(value);
}

describe('numeric precision', () => {
  it('rounds path coordinates to at most three decimal places', () => {
    const element = mountElement();

    annotate(element, { type: 'wavy', animate: false }).show();

    const d = getPathsFor(element)[0].getAttribute('d')!;
    const numbers = d.match(/-?\d+(\.\d+)?/g) ?? [];

    expect(numbers.length).toBeGreaterThan(0);

    numbers.forEach((value) => expect(getDecimalPlaces(value)).toBeLessThanOrEqual(3));
  });

  it('rounds stroke-dasharray and stroke-dashoffset to at most three decimal places', () => {
    const element = mountElement();

    annotate(element, { type: 'underline' }).show();

    const path = getPathsFor(element)[0];

    expect(getDecimalPlaces(path.style.strokeDasharray)).toBeLessThanOrEqual(3);
    expect(getDecimalPlaces(path.style.strokeDashoffset)).toBeLessThanOrEqual(3);
  });

  it('rounds animation duration and delay to one decimal place of a millisecond', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', animationDuration: 333.456, delay: 12.345 }).show();

    const path = getPathsFor(element)[0];

    expect(durationMs(path.style.animationDuration)).toBeCloseTo(333.5, 1);
    expect(durationMs(path.style.animationDelay)).toBeCloseTo(12.3, 1);
  });
});
