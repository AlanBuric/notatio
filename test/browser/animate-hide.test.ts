import { afterEach, describe, expect, it } from 'vitest';
import { annotate, annotationGroup } from '@/index.js';
import { cleanup, mountElement, pathsFor } from './helpers.js';

afterEach(cleanup);

const REVERSE = 'notatio-dash-reverse';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('animate.onHide', () => {
  it('removes the drawing immediately by default', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    annotation.show();
    annotation.hide();

    expect(pathsFor(element)).toHaveLength(0);
  });

  it('keeps the paths in the DOM while the reverse animation plays', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 300,
    });

    annotation.show();
    annotation.hide();

    expect(pathsFor(element).length).toBeGreaterThan(0);

    await nextFrame();

    pathsFor(element).forEach((path) => expect(path.style.animationName).toBe(REVERSE));
  });

  it('reports as hidden straight away, before the animation finishes', () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 300,
    });

    annotation.show();
    annotation.hide();

    expect(annotation.isShowing()).toBe(false);
  });

  it('removes the paths once the animation completes', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 60,
    });

    annotation.show();
    annotation.hide();

    await wait(140);

    expect(pathsFor(element)).toHaveLength(0);
  });

  it('retreats the strokes in the reverse of the drawing order', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'box',
      animate: { onHide: true },
      animationDuration: 400,
      iterations: 1,
    });

    annotation.show();
    annotation.hide();
    await nextFrame();

    const delays = pathsFor(element).map((path) => parseFloat(path.style.animationDelay));

    /* The last stroke drawn is the first to retreat, so delays descend. */
    expect(delays).toEqual([...delays].sort((a, b) => b - a));
  });

  it('drives the retreat from the path length custom property', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 300,
    });

    annotation.show();
    annotation.hide();
    await nextFrame();

    const path = pathsFor(element)[0]!;

    expect(path.style.getPropertyValue('--notatio-path-length')).not.toBe('');
    expect(path.style.strokeDashoffset).toBe('0');
  });

  it('does not animate the hide when animation is off entirely', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: false });

    annotation.show();
    annotation.hide();

    expect(pathsFor(element)).toHaveLength(0);
  });

  it('can animate the hide without animating the show', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onShow: false, onHide: true },
      animationDuration: 200,
    });

    annotation.show();
    pathsFor(element).forEach((path) => expect(path.style.animationName).toBe(''));

    annotation.hide();
    await nextFrame();

    pathsFor(element).forEach((path) => expect(path.style.animationName).toBe(REVERSE));
  });

  it('uses animationEasing for the retreat by default', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 300,
      animationEasing: 'linear',
    });

    annotation.show();
    annotation.hide();
    await nextFrame();

    expect(pathsFor(element)[0]!.style.animationTimingFunction).toBe('linear');
  });

  it('overrides animationEasing for the retreat when animate.hideEasing is set', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true, hideEasing: 'ease-in' },
      animationDuration: 300,
      animationEasing: 'linear',
    });

    annotation.show();
    annotation.hide();
    await nextFrame();

    expect(pathsFor(element)[0]!.style.animationTimingFunction).toBe('ease-in');
  });

  it('does nothing when hide is called twice', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animate: { onHide: true } });

    annotation.show();
    annotation.hide();

    expect(() => annotation.hide()).not.toThrow();
  });
});

describe('animate.onHide interruptions', () => {
  it('cancels a pending removal when show interrupts the hide', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 60,
    });

    annotation.show();
    annotation.hide();
    annotation.show();

    // The removal scheduled by hide() must not strip the redrawn annotation.
    await wait(140);

    expect(annotation.isShowing()).toBe(true);
    expect(pathsFor(element).length).toBeGreaterThan(0);
  });

  it('re-shows in place without animating the previous drawing out', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 60,
      iterations: 2,
    });

    annotation.show();

    const drawn = pathsFor(element).length;

    /* Dropping the old strokes outright, not animating them out. */
    annotation.show();
    expect(pathsFor(element)).toHaveLength(drawn);

    await wait(140);

    expect(annotation.isShowing()).toBe(true);
    expect(pathsFor(element)).toHaveLength(drawn);
  });

  it('does not leave the reverse animation applied after re-showing', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 60,
    });

    annotation.show();
    annotation.hide();
    await nextFrame();
    annotation.show();

    pathsFor(element).forEach((path) => expect(path.style.animationName).not.toBe(REVERSE));
  });

  it('removes cleanly while a hide animation is in flight', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: { onHide: true },
      animationDuration: 60,
    });

    annotation.show();
    annotation.hide();
    annotation.remove();

    await wait(140);

    expect(element.nextElementSibling).toBeNull();
  });
});

describe('annotationGroup with animate.onHide', () => {
  it('animates every annotation out', async () => {
    const first = mountElement();
    const second = mountElement();
    const group = annotationGroup([
      annotate(first, { type: 'underline', animate: { onHide: true }, animationDuration: 300 }),
      annotate(second, { type: 'underline', animate: { onHide: true }, animationDuration: 300 }),
    ]);

    group.show();
    group.hide();
    await nextFrame();

    expect(pathsFor(first)[0]?.style.animationName).toBe(REVERSE);
    expect(pathsFor(second)[0]?.style.animationName).toBe(REVERSE);
  });
});
