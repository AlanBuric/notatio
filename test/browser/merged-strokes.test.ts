import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { cleanup, mountElement, getPathsFor, getSubpathCount } from './helpers.js';

afterEach(cleanup);

const REVERSE = 'notatio-dash-reverse';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('merged strokes', () => {
  it('merges every stroke into a single path when animation is entirely off', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', animate: false, iterations: 3 }).show();

    expect(getPathsFor(element)).toHaveLength(1);
    expect(getSubpathCount(element)).toBe(3);
  });

  it('keeps one path per stroke when the show animation is on', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', iterations: 3 }).show();

    expect(getPathsFor(element)).toHaveLength(3);
  });

  it('keeps one path per stroke when only the hide animation is on', () => {
    const element = mountElement();

    annotate(element, {
      type: 'underline',
      animate: { onShow: false, onHide: true },
      iterations: 3,
    }).show();

    expect(getPathsFor(element)).toHaveLength(3);
  });

  it('stays split for a later hide after a re-show suppresses the draw-in animation', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onShow: false, onHide: true },
      animationDuration: 300,
      iterations: 2,
    });

    annotation.show();
    annotation.show();

    expect(getPathsFor(element)).toHaveLength(2);

    annotation.hide();
    await nextFrame();

    getPathsFor(element).forEach((path) => expect(path.style.animationName).toBe(REVERSE));
  });
});
