import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '../../src/index.js';
import {
  STROKE_JITTER,
  cleanup,
  mountContainer,
  mountElement,
  pathsFor,
  svgFor,
} from './helpers.js';

afterEach(cleanup);

describe('accessibility', () => {
  it('hides the decorative SVG from the accessibility tree', () => {
    const element = mountElement();

    annotate(element, { type: 'underline' });

    expect(svgFor(element)?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('zIndex', () => {
  it('is unset by default', () => {
    const element = mountElement();

    annotate(element, { type: 'highlight' });

    expect(svgFor(element)?.style.zIndex).toBe('');
  });

  it('applies the configured value to the SVG', () => {
    const element = mountElement();

    annotate(element, { type: 'highlight', zIndex: 5 });

    expect(svgFor(element)?.style.zIndex).toBe('5');
  });

  it('accepts a negative value, so a highlight can sit behind its element', () => {
    const element = mountElement();

    annotate(element, { type: 'highlight', zIndex: -1 });

    expect(svgFor(element)?.style.zIndex).toBe('-1');
  });
});

describe('textColor', () => {
  it('leaves the element colour alone by default', () => {
    const element = mountElement();

    annotate(element, { type: 'highlight' }).show();

    expect(element.style.color).toBe('');
  });

  it('applies while showing and restores on hide', () => {
    const element = mountElement();

    element.style.color = 'rgb(0, 0, 0)';

    const annotation = annotate(element, { type: 'highlight', textColor: 'rgb(255, 255, 255)' });

    annotation.show();
    expect(element.style.color).toBe('rgb(255, 255, 255)');

    annotation.hide();
    expect(element.style.color).toBe('rgb(0, 0, 0)');
  });

  it('restores on remove', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'highlight', textColor: 'red' });

    annotation.show();
    annotation.remove();

    expect(element.style.color).toBe('');
  });

  it('does not compound across repeated show and hide cycles', () => {
    const element = mountElement();

    element.style.color = 'rgb(1, 2, 3)';

    const annotation = annotate(element, { type: 'highlight', textColor: 'rgb(9, 9, 9)' });

    annotation.show();
    annotation.hide();
    annotation.show();
    annotation.hide();

    expect(element.style.color).toBe('rgb(1, 2, 3)');
  });
});

describe('detachListeners', () => {
  it('is exposed on the annotation', () => {
    const annotation = annotate(mountElement(), { type: 'underline' });

    expect(typeof annotation.detachListeners).toBe('function');
  });

  it('leaves an already-drawn annotation in place', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    annotation.show();
    annotation.detachListeners();

    expect(annotation.isShowing()).toBe(true);
    expect(pathsFor(element).length).toBeGreaterThan(0);
  });

  it('still draws when observeResize is off', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', observeResize: false }).show();

    expect(pathsFor(element).length).toBeGreaterThan(0);
  });
});

describe('transformed ancestors', () => {
  /*
   * Upstream #75. getBoundingClientRect is post-transform while path
   * coordinates are read in the SVG's user space, so a scaled ancestor used to
   * size and offset the annotation by the scale factor. roughjs jitters each
   * stroke by a couple of pixels, hence the tolerance.
   */
  it.each([0.5, 1, 2, 3])('draws at layout size under transform: scale(%s)', (scale) => {
    const container = mountContainer();

    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top left';

    const element = document.createElement('div');

    // Sized well above roughjs's few pixels of stroke jitter, so a scale error
    // of 0.5x or 2x cannot be mistaken for noise.
    element.style.cssText = 'width:200px;height:100px;';
    container.appendChild(element);

    annotate(element, { type: 'box', animate: false, padding: 0, iterations: 1 }).show();

    const boxes = pathsFor(element).map((path) => path.getBBox());
    const width =
      Math.max(...boxes.map((box) => box.x + box.width)) - Math.min(...boxes.map((box) => box.x));
    const height =
      Math.max(...boxes.map((box) => box.y + box.height)) - Math.min(...boxes.map((box) => box.y));

    expect(Math.abs(width - element.offsetWidth)).toBeLessThan(STROKE_JITTER);
    expect(Math.abs(height - element.offsetHeight)).toBeLessThan(STROKE_JITTER);
  });
});
