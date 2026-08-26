import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import type { AnnotationOptions, RoughAnnotation } from '@/types.js';
import {
  annotationWidth,
  cleanup,
  flushMicrotasks,
  mountContainer,
  mountElement,
  pathsFor,
  svgFor,
} from './helpers.js';

afterEach(cleanup);

const VALUES = {
  animate: false,
  animationDuration: 120,
  animationEasing: 'linear',
  color: 'rgb(1, 2, 3)',
  padding: 11,
  multiline: true,
  zIndex: 3,
  observeResize: false,
  iterations: 5,
  strokeWidth: 9,
  rtl: true,
  brackets: 'left',
  amplitude: 6,
  frequency: 7,
} as const satisfies Required<AnnotationOptions>;

const KEYS = Object.keys(VALUES) as (keyof typeof VALUES)[];

describe('settable options', () => {
  it.each(KEYS)('sets %s value', (key) => {
    const annotation: RoughAnnotation = annotate(mountElement(), { type: 'wavy' });

    Object.assign(annotation, { [key]: VALUES[key] });

    expect(annotation[key]).toEqual(VALUES[key]);
  });

  it.each(KEYS)('reads %s back from the config it was constructed with', (key) => {
    const annotation: RoughAnnotation = annotate(mountElement(), {
      type: 'wavy',
      ...{ [key]: VALUES[key] },
    });

    expect(annotation[key]).toEqual(VALUES[key]);
  });
});

describe('redrawing on set', () => {
  it('redraws when brackets change', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'bracket', animate: false });

    annotation.show();
    expect(pathsFor(element)).toHaveLength(3);

    annotation.brackets = ['left', 'right'];
    await flushMicrotasks();

    expect(pathsFor(element)).toHaveLength(6);
  });

  it('redraws when iterations change', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: false });

    annotation.show();
    expect(pathsFor(element)).toHaveLength(2);

    annotation.iterations = 5;
    await flushMicrotasks();

    expect(pathsFor(element)).toHaveLength(5);
  });

  it('redraws when multiline changes', async () => {
    const container = mountContainer();
    const span = document.createElement('span');

    container.style.width = '120px';
    span.textContent = 'this sentence is long enough to wrap onto several lines';
    container.appendChild(span);

    const annotation = annotate(span, { type: 'underline', animate: false, iterations: 1 });

    annotation.show();
    expect(pathsFor(span)).toHaveLength(1);

    annotation.multiline = true;
    await flushMicrotasks();

    expect(pathsFor(span)).toHaveLength(span.getClientRects().length);
  });

  it.each(['amplitude', 'frequency'] as const)('redraws when %s changes', async (key) => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'wavy', animate: false, iterations: 1 });

    annotation.show();

    const before = pathsFor(element)[0]!.getTotalLength();

    annotation[key] = 20;
    await flushMicrotasks();

    expect(pathsFor(element)[0]!.getTotalLength()).toBeGreaterThan(before);
  });

  it('leaves a hidden annotation undrawn', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    annotation.color = 'red';
    await flushMicrotasks();

    expect(pathsFor(element)).toHaveLength(0);
  });

  it.each(['animate', 'animationDuration', 'animationEasing'] as const)(
    'does not redraw when %s changes',
    async (key) => {
      const element = mountElement();
      const annotation = annotate(element, { type: 'underline' });

      annotation.show();

      const before = pathsFor(element)[0];

      Object.assign(annotation, { [key]: VALUES[key] });
      await flushMicrotasks();

      expect(pathsFor(element)[0]).toBe(before);
    },
  );

  it('does not redraw when a value is set to what it already was', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', color: 'red' });

    annotation.show();

    const before = pathsFor(element)[0];

    annotation.color = 'red';
    await flushMicrotasks();

    expect(pathsFor(element)[0]).toBe(before);
  });
});

describe('zIndex after attaching', () => {
  it('applies a value set on the annotation', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'highlight' });

    annotation.zIndex = 4;

    expect(svgFor(element)?.style.zIndex).toBe('4');
  });

  it('clears the style when set back to undefined', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'highlight', zIndex: 4 });

    annotation.zIndex = undefined;

    expect(svgFor(element)?.style.zIndex).toBe('');
  });
});

describe('observeResize after attaching', () => {
  function sized(width: number): HTMLElement {
    const container = mountContainer();
    const element = document.createElement('div');

    element.style.cssText = `width:${width}px;height:60px;`;
    container.appendChild(element);

    return element;
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

  it('stops redrawing when switched off', async () => {
    const element = sized(100);
    const annotation = annotate(element, {
      type: 'box',
      animate: false,
      padding: 0,
      iterations: 1,
    });

    annotation.show();
    annotation.observeResize = false;

    element.style.width = '300px';
    await settle();

    expect(annotationWidth(element)).toBeLessThan(150);
  });

  it('starts redrawing when switched on', async () => {
    const element = sized(100);
    const annotation = annotate(element, {
      type: 'box',
      animate: false,
      padding: 0,
      iterations: 1,
      observeResize: false,
    });

    annotation.show();
    annotation.observeResize = true;

    element.style.width = '300px';
    await settle();

    expect(annotationWidth(element)).toBeGreaterThan(250);
  });
});
