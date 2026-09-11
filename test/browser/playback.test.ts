import { afterEach, describe, expect, it } from 'vitest';
import { annotate, annotationGroup } from '@/index.js';
import { cleanup, flushMicrotasks, mountElement, getPathsFor } from './helpers.js';

afterEach(cleanup);

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayMs(path: SVGPathElement): number {
  return parseFloat(path.style.animationDelay);
}

describe('delay', () => {
  it('offsets the start of the drawing', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', delay: 250 }).show();

    expect(delayMs(getPathsFor(element)[0]!)).toBeCloseTo(250, 0);
  });

  it('is zero by default', () => {
    const element = mountElement();

    annotate(element, { type: 'underline' }).show();

    expect(delayMs(getPathsFor(element)[0]!)).toBeCloseTo(0, 0);
  });

  it('adds to the slot an annotation gets in a group', () => {
    const first = mountElement();
    const second = mountElement();

    annotationGroup([
      annotate(first, { type: 'underline', animationDuration: 300 }),
      annotate(second, { type: 'underline', animationDuration: 300, delay: 100 }),
    ]).show();

    expect(delayMs(getPathsFor(second)[0]!)).toBeCloseTo(400, 0);
  });

  it('does not redraw a visible annotation when changed', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    annotation.show();

    const before = getPathsFor(element)[0];

    annotation.delay = 500;
    await flushMicrotasks();

    expect(getPathsFor(element)[0]).toBe(before);
  });
});

describe('pause and resume', () => {
  it('holds the drawing animation where it is', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'box', animationDuration: 600 });

    annotation.show();
    annotation.pause();

    const animations = annotation.svg!.getAnimations({ subtree: true });

    expect(animations.length).toBeGreaterThan(0);
    animations.forEach((animation) => expect(animation.playState).toBe('paused'));
  });

  it('runs the animation on again', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'box', animationDuration: 600 });

    annotation.show();
    annotation.pause();
    annotation.resume();

    annotation
      .svg!.getAnimations({ subtree: true })
      .forEach((animation) => expect(animation.playState).toBe('running'));
  });

  it('leaves the drawing unfinished for as long as it is paused', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animationDuration: 100 });

    annotation.show();
    annotation.pause();

    await wait(300);

    const [path] = getPathsFor(element);

    expect(Number(path!.style.strokeDashoffset)).toBeGreaterThan(0);
  });

  /* The hide is driven by the animations themselves, not a timer, so pausing
     one genuinely suspends the teardown rather than letting it fire anyway. */
  it('suspends a hide in progress', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 100,
    });

    annotation.show();
    annotation.hide();

    await nextFrame();
    annotation.pause();
    await wait(300);

    expect(getPathsFor(element).length).toBeGreaterThan(0);
  });

  it('lets a suspended hide finish once resumed', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 100,
    });

    annotation.show();

    const hidden = annotation.hide();

    await nextFrame();
    annotation.pause();
    await wait(200);
    annotation.resume();
    await hidden;

    expect(getPathsFor(element)).toHaveLength(0);
  });

  it('is harmless before anything has been drawn', () => {
    const annotation = annotate(mountElement(), { type: 'underline' });

    expect(() => {
      annotation.pause();
      annotation.resume();
    }).not.toThrow();
  });
});
