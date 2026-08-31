import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { cleanup, flushMicrotasks, mountElement, pathsFor, svgFor } from './helpers.js';

afterEach(cleanup);

describe('svg', () => {
  it('is the element the library attached', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    expect(annotation.svg).toBe(svgFor(element));
  });

  it('is undefined once removed', () => {
    const annotation = annotate(mountElement(), { type: 'underline' });

    annotation.remove();

    expect(annotation.svg).toBeUndefined();
    expect(annotation.layer).toBeUndefined();
  });
});

describe('layer', () => {
  it('is a group inside the svg', () => {
    const annotation = annotate(mountElement(), { type: 'underline' });

    expect(annotation.layer?.parentNode).toBe(annotation.svg);
    expect(annotation.layer?.getAttribute('class')).toBe('notatio-layer');
  });

  it('holds the strokes, leaving the svg root with just the group', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: false });

    annotation.show();

    expect(annotation.layer!.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(annotation.svg!.children).toHaveLength(1);
  });

  it('survives the redraw that a changed option triggers', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: false });

    annotation.show();
    annotation.layer!.setAttribute('transform', 'translate(12, 34)');

    annotation.color = 'red';
    await flushMicrotasks();

    expect(annotation.layer!.getAttribute('transform')).toBe('translate(12, 34)');
    expect(pathsFor(element)[0]!.getAttribute('stroke')).toBe('red');
  });

  /* The documented reason to transform the layer: geometry is measured against
     the root, so a transform there is compensated away on the next redraw. */
  it('is the only one of the two that moves the drawing', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: false, iterations: 1 });

    annotation.show();

    const before = pathsFor(element)[0]!.getBBox().x;

    annotation.svg!.style.transform = 'translateX(50px)';
    annotation.color = 'red';
    await flushMicrotasks();

    expect(pathsFor(element)[0]!.getBBox().x).toBeCloseTo(before - 50, 0);
  });
});

describe('class', () => {
  const classOf = (element: HTMLElement) => svgFor(element)?.getAttribute('class');

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

    const before = pathsFor(element)[0];

    annotation.class = 'brand';
    await flushMicrotasks();

    expect(pathsFor(element)[0]).toBe(before);
  });
});
