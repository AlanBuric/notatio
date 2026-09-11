import { afterEach, describe, expect, it } from 'vitest';
import { annotate, annotationGroup } from '@/index.js';
import { cleanup, mountElement, getPathsFor, getSvgFor } from './helpers.js';

afterEach(cleanup);

function delayMs(path: SVGPathElement): number {
  const value = path.style.animationDelay;

  if (value.endsWith('ms')) return parseFloat(value);
  if (value.endsWith('s')) return parseFloat(value) * 1000;

  return parseFloat(value);
}

/** The delay of the first stroke of an annotation. */
function firstDelay(element: HTMLElement): number {
  return delayMs(getPathsFor(element)[0]!);
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

    expect(getPathsFor(a).length).toBeGreaterThan(0);
    expect(getPathsFor(b).length).toBeGreaterThan(0);
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

    expect(getPathsFor(a)).toHaveLength(0);
    expect(getPathsFor(b)).toHaveLength(0);
  });

  it('staggers the animations in list order, not DOM order', () => {
    const first = mountElement();
    const second = mountElement();
    const third = mountElement();

    /* Deliberately out of DOM order. */
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
    /* A zero duration must not advance the stagger. */
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

    expect(getPathsFor(a).length).toBeGreaterThan(0);
    expect(getPathsFor(b)).toHaveLength(0);
  });

  it('tolerates an empty group', () => {
    const group = annotationGroup([]);

    expect(() => {
      group.show();
      group.hide();
      group.remove();
    }).not.toThrow();
  });

  it('exposes the annotations it was built from', () => {
    const first = annotate(mountElement(), { type: 'underline' });
    const second = annotate(mountElement(), { type: 'box' });

    expect(annotationGroup([first, second]).annotations).toEqual([first, second]);
  });

  it('exposes the snapshot, not the array it was handed', () => {
    const annotations = [annotate(mountElement(), { type: 'underline' })];
    const group = annotationGroup(annotations);

    annotations.push(annotate(mountElement(), { type: 'box' }));

    expect(group.annotations).toHaveLength(1);
  });

  it('removes every annotation in the group', () => {
    const a = mountElement();
    const b = mountElement();
    const group = annotationGroup([
      annotate(a, { type: 'underline' }),
      annotate(b, { type: 'box' }),
    ]);

    group.show();
    group.remove();

    expect(getSvgFor(a)).toBeNull();
    expect(getSvgFor(b)).toBeNull();
    group.annotations.forEach((annotation) => expect(annotation.svg).toBeUndefined());
  });
});
