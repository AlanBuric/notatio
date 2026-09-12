import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import type { BracketType, RoughAnnotationConfig, RoughAnnotationType } from '@/types.js';
import {
  getAnnotationWidth,
  cleanup,
  mountElement,
  getPathsFor,
  getSubpathCount,
  STROKE_JITTER,
} from './helpers.js';

afterEach(cleanup);

function render(config: RoughAnnotationConfig): SVGPathElement[] {
  const element = mountElement();

  annotate(element, config).show();

  return getPathsFor(element);
}

const ALL_TYPES: RoughAnnotationType[] = [
  'underline',
  'box',
  'circle',
  'highlight',
  'strikethrough',
  'crossed-off',
  'bracket',
  'wavy',
  'zigzag',
];

describe('annotation types', () => {
  it.each(ALL_TYPES)('renders exactly one path element for %s', (type) => {
    const paths = render({ type });

    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute('d')).toMatch(/^M/);
    expect(paths[0].getAttribute('fill')).toBe('none');
  });

  /* Every stroke pass merges into the same <path>, as multiple `M` subpaths in one `d`,
     rather than one DOM node per pass. Subpath counts still differ by type because
     roughjs starts a new subpath at every move command within a single pass. */
  it.each([
    { type: 'underline', perIteration: 1 },
    { type: 'strikethrough', perIteration: 1 },
    { type: 'highlight', perIteration: 1 },
    { type: 'circle', perIteration: 1 },
    { type: 'box', perIteration: 4 },
    { type: 'crossed-off', perIteration: 2 },
    { type: 'wavy', perIteration: 1 },
    { type: 'zigzag', perIteration: 1 },
  ] as const)(
    '$type stays one path, with $perIteration subpath(s) per iteration',
    ({ type, perIteration }) => {
      [1, 2, 3].forEach((iterations) => {
        const paths = render({ type, iterations });

        expect(paths).toHaveLength(1);
        expect(getSubpathCount(paths[0])).toBe(perIteration * iterations);
      });
    },
  );

  /* Guards against a zero being coerced to the default. */
  it('draws nothing when iterations is zero', () =>
    expect(render({ type: 'underline', iterations: 0 })).toHaveLength(0));

  it('defaults to two iterations worth of subpaths', () => {
    const [path] = render({ type: 'underline' });

    expect(getSubpathCount(path!)).toBe(2);
  });
});

describe('bracket', () => {
  it('brackets the right side by default, as three subpaths of one path', () => {
    const [path] = render({ type: 'bracket' });

    expect(getSubpathCount(path!)).toBe(3);
  });

  it.each([
    { brackets: 'left', expectedSubpaths: 3 },
    { brackets: ['left', 'right'], expectedSubpaths: 6 },
    { brackets: ['left', 'right', 'top', 'bottom'], expectedSubpaths: 12 },
  ] as { brackets: BracketType | BracketType[]; expectedSubpaths: number }[])(
    'draws three segments per bracketed side, as subpaths of one path ($expectedSubpaths total)',
    ({ brackets, expectedSubpaths }) => {
      const paths = render({ type: 'bracket', brackets });

      expect(paths).toHaveLength(1);
      expect(getSubpathCount(paths[0])).toBe(expectedSubpaths);
    },
  );

  it('accepts a bare string as well as an array', () => {
    const bare = render({ type: 'bracket', brackets: 'top' })[0];
    const array = render({ type: 'bracket', brackets: ['top'] })[0];

    expect(getSubpathCount(bare)).toBe(getSubpathCount(array));
  });

  it('does not accept iterations, and draws one bracket per side regardless', () => {
    // @ts-expect-error bracket draws one bracket per side, so iterations does not apply.
    const [path] = render({ type: 'bracket', iterations: 5 });

    expect(getSubpathCount(path!)).toBe(3);
  });
});

function drawnHeight(paths: SVGPathElement[]): number {
  const boxes = paths.map((path) => path.getBBox());

  return (
    Math.max(...boxes.map((box) => box.y + box.height)) - Math.min(...boxes.map((box) => box.y))
  );
}

/** Y of evenly spaced points along a path, in the order it is drawn. */
function sampleY(path: SVGPathElement, samples = 41): number[] {
  const length = path.getTotalLength();

  return Array.from(
    { length: samples },
    (_, index) => path.getPointAtLength((length * index) / (samples - 1)).y,
  );
}

function drawnLength(paths: SVGPathElement[]): number {
  return paths.reduce((total, path) => total + path.getTotalLength(), 0);
}

describe('zigzag', () => {
  it('spans the width of the element, like an underline', () => {
    const element = mountElement();

    annotate(element, { type: 'zigzag' }).show();

    expect(getAnnotationWidth(element)).toBeCloseTo(element.getBoundingClientRect().width, -1);
  });

  /* One stroke, not one per segment, so the pen never lifts across the wave. */
  it('draws each pass as a single subpath', () => {
    const [path] = render({ type: 'zigzag', iterations: 1, frequency: 12 });

    expect(getSubpathCount(path!)).toBe(1);
  });

  it('amplitude sets how far the peaks depart from the baseline', () => {
    const shallow = drawnHeight(render({ type: 'zigzag', amplitude: 2, iterations: 1 }));
    const deep = drawnHeight(render({ type: 'zigzag', amplitude: 20, iterations: 1 }));

    expect(deep).toBeGreaterThan(shallow + STROKE_JITTER);
  });

  it('draws a flat line when the amplitude is zero', () => {
    const flat = drawnHeight(render({ type: 'zigzag', amplitude: 0, iterations: 1 }));

    expect(flat).toBeLessThan(STROKE_JITTER);
  });
});

describe.each(['wavy', 'zigzag'] as const)('%s amplitude sign', (type) => {
  /* A negative amplitude mirrors the wave, which is what replaces an `inverted` flag. */
  it('mirrors the wave without changing how far it reaches', () => {
    const positive = drawnHeight(render({ type, amplitude: 12, iterations: 1 }));
    const negative = drawnHeight(render({ type, amplitude: -12, iterations: 1 }));

    expect(Math.abs(positive - negative)).toBeLessThan(STROKE_JITTER);
  });

  /* roughness 0 removes the jitter, so the two waves are exact reflections. */
  it('reflects every point about the baseline', () => {
    const sampled = (amplitude: number) =>
      sampleY(render({ type, amplitude, iterations: 1, roughness: 0, seed: 1 })[0]);
    const above = sampled(12);
    const below = sampled(-12);
    const baseline = above.reduce((sum, y) => sum + y, 0) / above.length;

    expect(Math.max(...above) - Math.min(...above)).toBeGreaterThan(12);

    above.forEach((y, index) => expect(y + below[index]).toBeCloseTo(baseline * 2, 0));
  });
});

describe('wavy', () => {
  it('spans the width of the element, like an underline', () => {
    const element = mountElement();

    annotate(element, { type: 'wavy' }).show();

    expect(getAnnotationWidth(element)).toBeCloseTo(element.getBoundingClientRect().width, -1);
  });

  it('amplitude sets how far the wave departs from the baseline', () => {
    const shallow = drawnHeight(render({ type: 'wavy', amplitude: 2, iterations: 1 }));
    const deep = drawnHeight(render({ type: 'wavy', amplitude: 20, iterations: 1 }));

    expect(deep).toBeGreaterThan(shallow + STROKE_JITTER);
  });

  /* More waves over the same width means more stroke to travel. */
  it('frequency changes how tightly the wave repeats', () => {
    const loose = drawnLength(render({ type: 'wavy', frequency: 1, iterations: 1 }));
    const tight = drawnLength(render({ type: 'wavy', frequency: 12, iterations: 1 }));

    expect(tight).toBeGreaterThan(loose);
  });

  it('draws a flat line when the amplitude is zero', () => {
    const flat = drawnHeight(render({ type: 'wavy', amplitude: 0, iterations: 1 }));

    expect(flat).toBeLessThan(STROKE_JITTER);
  });

  it('does not accept brackets', () => {
    // @ts-expect-error brackets belong to the bracket type.
    const [path] = render({ type: 'wavy', brackets: 'left' });

    expect(getSubpathCount(path!)).toBe(2);
  });
});
