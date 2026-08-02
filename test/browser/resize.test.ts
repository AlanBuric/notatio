import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '../../src/index.js';
import { STROKE_JITTER, annotationWidth, cleanup, mountContainer, pathsFor } from './helpers.js';

afterEach(cleanup);

function sized(width: number): HTMLElement {
  const container = mountContainer();
  const element = document.createElement('div');

  element.style.cssText = `width:${width}px;height:60px;`;
  container.appendChild(element);

  return element;
}

async function waitUntil(predicate: () => boolean, timeout = 1000): Promise<number> {
  const start = performance.now();

  while (performance.now() - start < timeout) {
    if (predicate()) return performance.now() - start;

    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  throw new Error(`condition not met within ${timeout}ms`);
}

describe('resize handling', () => {
  it('redraws when the element grows', async () => {
    const element = sized(100);

    annotate(element, { type: 'box', animate: false, padding: 0, iterations: 1 }).show();

    expect(Math.abs(annotationWidth(element) - 100)).toBeLessThan(STROKE_JITTER);

    element.style.width = '300px';
    await waitUntil(() => annotationWidth(element) > 250);

    expect(Math.abs(annotationWidth(element) - 300)).toBeLessThan(STROKE_JITTER);
  });

  /*
   * Upstream PR #89. The old implementation waited out a fixed 400ms debounce
   * before redrawing. Batching into an animation frame gets it done in one or
   * two frames instead.
   */
  it('redraws well inside the old 400ms debounce window', async () => {
    const element = sized(100);

    annotate(element, { type: 'box', animate: false, padding: 0, iterations: 1 }).show();

    element.style.width = '300px';

    const elapsed = await waitUntil(() => annotationWidth(element) > 250);

    expect(elapsed).toBeLessThan(200);
  });

  it('redraws several annotations from one resize', async () => {
    const first = sized(100);
    const second = sized(100);

    annotate(first, { type: 'box', animate: false, padding: 0, iterations: 1 }).show();
    annotate(second, { type: 'box', animate: false, padding: 0, iterations: 1 }).show();

    first.style.width = '300px';
    second.style.width = '250px';

    await waitUntil(() => annotationWidth(first) > 250 && annotationWidth(second) > 200);

    expect(Math.abs(annotationWidth(first) - 300)).toBeLessThan(STROKE_JITTER);
    expect(Math.abs(annotationWidth(second) - 250)).toBeLessThan(STROKE_JITTER);
  });

  it('leaves the drawing alone when nothing moved', async () => {
    const element = sized(150);
    const annotation = annotate(element, {
      type: 'underline',
      animate: false,
      iterations: 1,
    });

    annotation.show();

    const before = pathsFor(element)[0]!.getAttribute('d');

    /* A resize notification that does not change the rect must not redraw. */
    element.style.width = '150px';
    window.dispatchEvent(new Event('resize'));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(pathsFor(element)[0]?.getAttribute('d')).toBe(before);
  });

  it('stops redrawing after detachListeners', async () => {
    const element = sized(100);
    const annotation = annotate(element, {
      type: 'box',
      animate: false,
      padding: 0,
      iterations: 1,
    });

    annotation.show();
    annotation.detachListeners();

    const before = pathsFor(element)[0]!.getAttribute('d');

    element.style.width = '300px';
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(pathsFor(element)[0]?.getAttribute('d')).toBe(before);
  });

  it('does not redraw a hidden annotation', async () => {
    const element = sized(100);
    const annotation = annotate(element, { type: 'box', animate: false, padding: 0 });

    annotation.show();
    annotation.hide();

    element.style.width = '300px';
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(pathsFor(element)).toHaveLength(0);
    expect(annotation.isShowing()).toBe(false);
  });
});
