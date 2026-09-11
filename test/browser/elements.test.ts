import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { cleanup, flushMicrotasks, mountElement, getPathsFor, getSvgFor } from './helpers.js';

afterEach(cleanup);

describe('svg', () => {
  it('is the element the library attached', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    expect(annotation.svg).toBe(getSvgFor(element));
  });

  it('is undefined once removed', () => {
    const annotation = annotate(mountElement(), { type: 'underline' });

    annotation.remove();

    expect(annotation.svg).toBeUndefined();
  });

  it('holds the strokes', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: false });

    annotation.show();

    expect(annotation.svg!.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  /* Geometry is measured against the SVG, so a transform on it is folded into
     the next measurement and the drawing stays put. */
  it('compensates for a transform set on it', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: false, iterations: 1 });

    annotation.show();

    const before = getPathsFor(element)[0]!.getBBox().x;

    annotation.svg!.style.transform = 'translateX(50px)';
    annotation.color = 'red';
    await flushMicrotasks();

    expect(getPathsFor(element)[0]!.getBBox().x).toBeCloseTo(before - 50, 0);
  });
});

describe('class', () => {
  const classOf = (element: HTMLElement) => getSvgFor(element)?.getAttribute('class');

  it('is just the library class by default', () => {
    const element = mountElement();

    annotate(element, { type: 'underline' });

    expect(classOf(element)).toBe('notatio-annotation');
  });

  it('adds the configured class alongside it', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', class: 'brand' });

    expect(classOf(element)).toBe('notatio-annotation brand');
  });

  it('applies a value set after attaching', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    annotation.class = 'brand other';

    expect(classOf(element)).toBe('notatio-annotation brand other');
  });

  it('drops back to the library class when cleared', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', class: 'brand' });

    annotation.class = undefined;

    expect(classOf(element)).toBe('notatio-annotation');
  });

  it('does not redraw, since it changes no geometry', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: false });

    annotation.show();

    const before = getPathsFor(element)[0];

    annotation.class = 'brand';
    await flushMicrotasks();

    expect(getPathsFor(element)[0]).toBe(before);
  });
});
