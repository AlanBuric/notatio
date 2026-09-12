import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import type { RoughAnnotationConfig } from '@/types.js';
import { cleanup, flushMicrotasks, mountElement, getPathsFor } from './helpers.js';

afterEach(cleanup);

/** The path data of a fresh annotation, which is what a seed has to pin down. */
function drawnPaths(config: RoughAnnotationConfig): (string | null)[] {
  const element = mountElement();

  annotate(element, config).show();

  return getPathsFor(element).map((path) => path.getAttribute('d'));
}

describe('seed', () => {
  it('is a number even when the config omits one', () => {
    const annotation = annotate(mountElement(), { type: 'underline' });

    expect(typeof annotation.seed).toBe('number');
  });

  it('reads back the configured value', () => {
    const annotation = annotate(mountElement(), { type: 'underline', seed: 4242 });

    expect(annotation.seed).toBe(4242);
  });

  it('draws the same strokes twice for the same seed', () => {
    const config = { type: 'circle', animate: false, seed: 99 } as const;

    expect(drawnPaths(config)).toEqual(drawnPaths(config));
  });

  it('draws different strokes for different seeds', () => {
    const base = { type: 'circle', animate: false } as const;

    expect(drawnPaths({ ...base, seed: 1 })).not.toEqual(drawnPaths({ ...base, seed: 2 }));
  });

  it('varies between annotations that leave it unset', () => {
    const seeds = new Set(
      Array.from({ length: 8 }, () => annotate(mountElement(), { type: 'underline' }).seed),
    );

    expect(seeds.size).toBeGreaterThan(1);
  });

  it('redraws when changed on a visible annotation', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'circle', animate: false, seed: 1 });

    annotation.show();

    const before = getPathsFor(element).map((path) => path.getAttribute('d'));

    annotation.seed = 2;
    await flushMicrotasks();

    expect(getPathsFor(element).map((path) => path.getAttribute('d'))).not.toEqual(before);
  });
});

describe('stroke options', () => {
  it('roughness of zero draws a straight underline', () => {
    const element = mountElement();

    annotate(element, {
      type: 'underline',
      animate: false,
      iterations: 1,
      roughness: 0,
      bowing: 0,
    }).show();

    const { height } = getPathsFor(element)[0].getBBox();

    expect(height).toBeLessThan(1);
  });

  it('maxRandomnessOffset widens how far strokes wander', () => {
    const wander = (maxRandomnessOffset: number) => {
      const element = mountElement();

      annotate(element, {
        type: 'underline',
        animate: false,
        iterations: 1,
        seed: 7,
        maxRandomnessOffset,
      }).show();

      return getPathsFor(element)[0].getBBox().height;
    };

    expect(wander(20)).toBeGreaterThan(wander(1));
  });

  it('preserveVertices pins a box to its corners', () => {
    const corners = (preserveVertices: boolean) => {
      const element = mountElement();

      annotate(element, {
        type: 'box',
        animate: false,
        iterations: 1,
        padding: 0,
        seed: 7,
        preserveVertices,
      }).show();

      return getPathsFor(element).map((path) => path.getAttribute('d'));
    };

    expect(corners(true)).not.toEqual(corners(false));
  });

  it('cannot override the multi-stroke setting the shape derives', () => {
    const element = mountElement();

    /* @ts-expect-error not part of RoughStrokeOptions, and ignored if forced through. */
    annotate(element, { type: 'underline', animate: false, disableMultiStroke: false }).show();

    const paths = getPathsFor(element);

    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute('d')?.match(/M/g)).toHaveLength(2);
  });
});
