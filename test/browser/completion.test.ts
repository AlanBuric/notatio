import { afterEach, describe, expect, it } from 'vitest';
import { annotate, annotationGroup } from '../../src/index.js';
import { cleanup, mountElement, pathsFor } from './helpers.js';

afterEach(cleanup);

/** Milliseconds a promise took to settle. */
async function timed(promise: Promise<void>): Promise<number> {
  const start = performance.now();

  await promise;

  return performance.now() - start;
}

describe('show completion', () => {
  it('resolves only after the drawing animation finishes', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animationDuration: 200 });

    const elapsed = await timed(annotation.show());

    expect(elapsed).toBeGreaterThan(150);
  });

  it('resolves immediately when animation is off', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animate: false,
      animationDuration: 400,
    });

    const elapsed = await timed(annotation.show());

    expect(elapsed).toBeLessThan(60);
  });

  it('resolves immediately for a zero duration', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animationDuration: 0 });

    const elapsed = await timed(annotation.show());

    expect(elapsed).toBeLessThan(60);
  });

  it('leaves the annotation drawn once resolved', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'box', animationDuration: 80 });

    await annotation.show();

    expect(annotation.isShowing()).toBe(true);
    expect(pathsFor(element).length).toBeGreaterThan(0);
  });

  it('resolves for an annotation that never attached', async () => {
    const annotation = annotate(document.createElement('div'), { type: 'underline' });

    await expect(annotation.show()).resolves.toBeUndefined();
  });

  it('resolves rather than rejecting when a redraw cancels the animation', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animationDuration: 400 });
    const first = annotation.show();

    annotation.show();

    await expect(first).resolves.toBeUndefined();
  });
});

describe('hide completion', () => {
  it('resolves immediately when the hide is not animated', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', animationDuration: 400 });

    annotation.show();

    const elapsed = await timed(annotation.hide());

    expect(elapsed).toBeLessThan(60);
  });

  it('resolves after the reverse animation finishes', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animateOnHide: true,
      animationDuration: 200,
    });

    annotation.show();

    const elapsed = await timed(annotation.hide());

    expect(elapsed).toBeGreaterThan(150);
    expect(pathsFor(element)).toHaveLength(0);
  });

  it('resolves when a redraw interrupts the reverse animation', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animateOnHide: true,
      animationDuration: 400,
    });

    annotation.show();

    const hiding = annotation.hide();

    annotation.show();

    /* The interrupted hide must settle rather than hang on a cancelled timer. */
    await expect(hiding).resolves.toBeUndefined();
  });

  it('resolves when remove interrupts the reverse animation', async () => {
    const element = mountElement();
    const annotation = annotate(element, {
      type: 'underline',
      animateOnHide: true,
      animationDuration: 400,
    });

    annotation.show();

    const hiding = annotation.hide();

    annotation.remove();

    await expect(hiding).resolves.toBeUndefined();
  });
});

describe('group completion', () => {
  it('resolves after the whole staggered sequence', async () => {
    const first = mountElement();
    const second = mountElement();
    const group = annotationGroup([
      annotate(first, { type: 'underline', animationDuration: 150 }),
      annotate(second, { type: 'underline', animationDuration: 150 }),
    ]);

    const elapsed = await timed(group.show());

    /* The second is delayed behind the first, so the group outlasts either. */
    expect(elapsed).toBeGreaterThan(250);
  });

  it('resolves after every annotation is hidden', async () => {
    const first = mountElement();
    const second = mountElement();
    const group = annotationGroup([
      annotate(first, { type: 'underline', animateOnHide: true, animationDuration: 120 }),
      annotate(second, { type: 'underline', animateOnHide: true, animationDuration: 120 }),
    ]);

    group.show();
    await group.hide();

    expect(pathsFor(first)).toHaveLength(0);
    expect(pathsFor(second)).toHaveLength(0);
  });
});
