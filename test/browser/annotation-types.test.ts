import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import type { BracketType, RoughAnnotationConfig, RoughAnnotationType } from '@/types.js';
import { annotationWidth, cleanup, mountElement, pathsFor, STROKE_JITTER } from './helpers.js';

afterEach(cleanup);

function render(config: RoughAnnotationConfig): SVGPathElement[] {
  const element = mountElement();

  annotate(element, config).show();

  return pathsFor(element);
}

const ALL_TYPES: RoughAnnotationType[] = [
  'underline',
  'box',
  'circle',
  'highlight',
  'strike-through',
  'crossed-off',
  'bracket',
  'wavy',
];

describe('annotation types', () => {
  it.each(ALL_TYPES)('renders at least one path for %s', (type) => {
    const paths = render({ type });

    expect(paths.length).toBeGreaterThan(0);

    paths.forEach((path) => {
      expect(path.getAttribute('d')).toMatch(/^M/);
      expect(path.getAttribute('fill')).toBe('none');
    });
  });

  /* Counts differ by type because roughjs splits a shape at every move command. */
  it.each([
    { type: 'underline', perIteration: 1 },
    { type: 'strike-through', perIteration: 1 },
    { type: 'highlight', perIteration: 1 },
    { type: 'circle', perIteration: 1 },
    { type: 'box', perIteration: 4 },
    { type: 'crossed-off', perIteration: 2 },
    { type: 'wavy', perIteration: 1 },
  ] as const)('$type draws $perIteration path(s) per iteration', ({ type, perIteration }) => {
    [1, 2, 3].forEach((iterations) =>
      expect(render({ type, iterations })).toHaveLength(perIteration * iterations),
    );
  });

  /* Guards against a zero being coerced to the default. */
  it('draws nothing when iterations is zero', () =>
    expect(render({ type: 'underline', iterations: 0 })).toHaveLength(0));

  it('defaults to two iterations', () => expect(render({ type: 'underline' })).toHaveLength(2));
});

describe('bracket', () => {
  it('brackets the right side by default', () =>
    expect(render({ type: 'bracket' })).toHaveLength(3));

  it.each([
    { brackets: 'left', expected: 3 },
    { brackets: ['left', 'right'], expected: 6 },
    { brackets: ['left', 'right', 'top', 'bottom'], expected: 12 },
  ] as { brackets: BracketType | BracketType[]; expected: number }[])(
    'draws three segments per bracketed side ($expected total)',
    ({ brackets, expected }) => {
      expect(render({ type: 'bracket', brackets })).toHaveLength(expected);
    },
  );

  it('accepts a bare string as well as an array', () => {
    expect(render({ type: 'bracket', brackets: 'top' })).toHaveLength(
      render({ type: 'bracket', brackets: ['top'] }).length,
    );
  });

  it('does not accept iterations, and draws one bracket per side regardless', () => {
    // @ts-expect-error bracket draws one bracket per side, so iterations does not apply.
    expect(render({ type: 'bracket', iterations: 5 })).toHaveLength(3);
  });
});

/** Vertical extent of the drawn strokes, in SVG user units. */
function drawnHeight(paths: SVGPathElement[]): number {
  const boxes = paths.map((path) => path.getBBox());

  return (
    Math.max(...boxes.map((box) => box.y + box.height)) - Math.min(...boxes.map((box) => box.y))
  );
}

/** Combined length of the drawn strokes. */
function drawnLength(paths: SVGPathElement[]): number {
  return paths.reduce((total, path) => total + path.getTotalLength(), 0);
}

describe('wavy', () => {
  it('spans the width of the element, like an underline', () => {
    const element = mountElement();

    annotate(element, { type: 'wavy' }).show();

    expect(annotationWidth(element)).toBeCloseTo(element.getBoundingClientRect().width, -1);
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
    expect(render({ type: 'wavy', brackets: 'left' })).toHaveLength(2);
  });
});
