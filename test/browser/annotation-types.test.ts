import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '../../src/rough-notation.js';
import type { BracketType, RoughAnnotationConfig, RoughAnnotationType } from '../../src/types.js';
import { cleanup, mountElement, pathsFor } from './helpers.js';

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

  // Path counts per iteration, measured against the current renderer. These
  // pin the shape of the output so a refactor cannot silently change how much
  // is drawn. `paths per iteration` differs by type because roughjs splits a
  // shape at every move command: a rectangle becomes four sides, a bracket
  // becomes three segments, and a cross is two strokes.
  it.each([
    { type: 'underline', perIteration: 1 },
    { type: 'strike-through', perIteration: 1 },
    { type: 'highlight', perIteration: 1 },
    { type: 'circle', perIteration: 1 },
    { type: 'box', perIteration: 4 },
    { type: 'crossed-off', perIteration: 2 },
  ] as const)('$type draws $perIteration path(s) per iteration', ({ type, perIteration }) => {
    [1, 2, 3].forEach((iterations) =>
      expect(render({ type, iterations })).toHaveLength(perIteration * iterations),
    );
  });

  // Regression guard: `iterations: 0` used to be coerced to the default of 2.
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

  // Unlike every other type, bracket loops over the requested sides and
  // ignores `iterations` completely. Recorded as current behaviour rather
  // than endorsed; see the upstream issue backlog.
  it('ignores the iterations option', () => {
    expect(render({ type: 'bracket', iterations: 1 })).toHaveLength(3);
    expect(render({ type: 'bracket', iterations: 5 })).toHaveLength(3);
  });
});
