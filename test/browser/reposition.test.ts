import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { STROKE_JITTER, cleanup, mountContainer, getPathsFor, getSvgFor } from './helpers.js';

afterEach(cleanup);

/** Gap between the top of the drawn strokes and the top of the element. */
function drift(element: HTMLElement): number {
  const boxes = getPathsFor(element).map((path) => path.getBBox());
  const strokeTop = Math.min(...boxes.map((box) => box.y));
  const elementTop =
    element.getBoundingClientRect().y - getSvgFor(element)!.getBoundingClientRect().y;

  return Math.abs(strokeTop - elementTop);
}

function scene(): { spacer: HTMLElement; element: HTMLElement } {
  const container = mountContainer();
  const spacer = document.createElement('div');
  const element = document.createElement('div');

  spacer.style.cssText = 'height:20px;';
  element.style.cssText = 'width:200px;height:60px;';
  container.append(spacer, element);

  return { spacer, element };
}

describe('element repositioning', () => {
  /*
   * ResizeObserver does not fire when an element only moves, so alignment has
   * to survive on layout alone. observeResize is off here to prove no redraw is
   * involved.
   */
  it('stays aligned when the element moves, without a redraw', async () => {
    const { spacer, element } = scene();

    annotate(element, {
      type: 'box',
      animate: false,
      padding: 0,
      iterations: 1,
      observeResize: false,
    }).show();

    const drawn = getPathsFor(element)[0].getAttribute('d');

    expect(drift(element)).toBeLessThan(STROKE_JITTER);

    spacer.style.height = '200px';
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(getPathsFor(element)[0]?.getAttribute('d')).toBe(drawn);
    expect(drift(element)).toBeLessThan(STROKE_JITTER);
  });

  it('stays aligned when a highlight element moves', async () => {
    const { spacer, element } = scene();

    annotate(element, {
      type: 'highlight',
      animate: false,
      iterations: 1,
      observeResize: false,
    }).show();

    spacer.style.height = '180px';
    await new Promise((resolve) => setTimeout(resolve, 150));

    const strokes = getPathsFor(element).map((path) => path.getBBox());
    const middle =
      (Math.min(...strokes.map((b) => b.y)) + Math.max(...strokes.map((b) => b.y + b.height))) / 2;
    const elementMiddle =
      element.getBoundingClientRect().y -
      getSvgFor(element)!.getBoundingClientRect().y +
      element.offsetHeight / 2;

    expect(Math.abs(middle - elementMiddle)).toBeLessThan(STROKE_JITTER);
  });
});
