import { afterEach, describe, expect, it } from 'vitest';
import { annotate, annotationGroup } from '../../src/rough-notation.js';
import { cleanup, mountElement, pathsFor } from './helpers.js';

afterEach(cleanup);

function delayMs(path: SVGPathElement): number {
  const value = path.style.animationDelay;
  if (value.endsWith('ms')) return parseFloat(value);
  if (value.endsWith('s')) return parseFloat(value) * 1000;
  return parseFloat(value);
}

/** The delay of the first stroke of an annotation. */
function firstDelay(element: HTMLElement): number {
  return delayMs(pathsFor(element)[0]!);
}

describe('annotationGroup', () => {
  it('shows every annotation in the group', () => {
    const a = mountElement();
    const b = mountElement();
    const group = annotationGroup([
      annotate(a, { type: 'underline' }),
      annotate(b, { type: 'box' }),
    ]);

    group.show();

    expect(pathsFor(a).length).toBeGreaterThan(0);
    expect(pathsFor(b).length).toBeGreaterThan(0);
  });

  it('hides every annotation in the group', () => {
    const a = mountElement();
    const b = mountElement();
    const group = annotationGroup([
      annotate(a, { type: 'underline' }),
      annotate(b, { type: 'box' }),
    ]);
    group.show();

    group.hide();

    expect(pathsFor(a)).toHaveLength(0);
    expect(pathsFor(b)).toHaveLength(0);
  });

  it('staggers the animations in list order, not DOM order', () => {
    const first = mountElement();
    const second = mountElement();
    const third = mountElement();

    // Deliberately out of DOM order, mirroring the roughnotation.com demo.
    const group = annotationGroup([
      annotate(third, { type: 'underline', animationDuration: 300 }),
      annotate(first, { type: 'underline', animationDuration: 300 }),
      annotate(second, { type: 'underline', animationDuration: 300 }),
    ]);
    group.show();

    expect(firstDelay(third)).toBeCloseTo(0, 0);
    expect(firstDelay(first)).toBeCloseTo(300, 0);
    expect(firstDelay(second)).toBeCloseTo(600, 0);
  });

  it('uses the default duration when an annotation does not specify one', () => {
    const a = mountElement();
    const b = mountElement();
    const group = annotationGroup([
      annotate(a, { type: 'underline' }),
      annotate(b, { type: 'box' }),
    ]);

    group.show();

    expect(firstDelay(a)).toBeCloseTo(0, 0);
    expect(firstDelay(b)).toBeCloseTo(800, 0);
  });

  it('does not stagger past an annotation with a zero duration', () => {
    // Regression guard: a zero duration used to be read as the 800ms default
    // in `render` while `annotationGroup` special-cased it, so the two
    // disagreed about where the next annotation should start.
    const a = mountElement();
    const b = mountElement();
    const group = annotationGroup([
      annotate(a, { type: 'underline', animationDuration: 0 }),
      annotate(b, { type: 'underline', animationDuration: 500 }),
    ]);

    group.show();

    expect(firstDelay(a)).toBeCloseTo(0, 0);
    expect(firstDelay(b)).toBeCloseTo(0, 0);
  });

  it('takes a snapshot of the list, so later mutation does not affect it', () => {
    const a = mountElement();
    const b = mountElement();
    const annotations = [annotate(a, { type: 'underline' })];
    const group = annotationGroup(annotations);

    annotations.push(annotate(b, { type: 'underline' }));
    group.show();

    expect(pathsFor(a).length).toBeGreaterThan(0);
    expect(pathsFor(b)).toHaveLength(0);
  });

  it('tolerates an empty group', () => {
    const group = annotationGroup([]);
    expect(() => {
      group.show();
      group.hide();
    }).not.toThrow();
  });
});
