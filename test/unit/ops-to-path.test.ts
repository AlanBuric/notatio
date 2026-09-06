import { describe, expect, it } from 'vitest';
import { opsToPath } from '@/render/index.js';
import type { OpSet } from 'roughjs/bin/core';

function opSet(ops: OpSet['ops']): OpSet {
  return { type: 'path', ops };
}

describe('opsToPath', () => {
  it('returns nothing for an empty op list', () => expect(opsToPath([])).toEqual([]));

  it('returns nothing for an op set with no ops', () => expect(opsToPath([opSet([])])).toEqual([]));

  it('converts a move and a line into a single path string', () => {
    const paths = opsToPath([
      opSet([
        { op: 'move', data: [0, 1] },
        { op: 'lineTo', data: [2, 3] },
      ]),
    ]);

    expect(paths).toEqual(['M0 1 L2 3']);
  });

  it('converts a bezier segment', () => {
    const paths = opsToPath([
      opSet([
        { op: 'move', data: [0, 0] },
        { op: 'bcurveTo', data: [1, 2, 3, 4, 5, 6] },
      ]),
    ]);

    expect(paths).toEqual(['M0 0 C1 2, 3 4, 5 6']);
  });

  it('splits a new path at every move op', () => {
    const paths = opsToPath([
      opSet([
        { op: 'move', data: [0, 0] },
        { op: 'lineTo', data: [1, 1] },
        { op: 'move', data: [5, 5] },
        { op: 'lineTo', data: [6, 6] },
      ]),
    ]);

    expect(paths).toEqual(['M0 0 L1 1', 'M5 5 L6 6']);
  });

  it('keeps separate op sets as separate paths', () => {
    const paths = opsToPath([
      opSet([
        { op: 'move', data: [0, 0] },
        { op: 'lineTo', data: [1, 1] },
      ]),
      opSet([
        { op: 'move', data: [2, 2] },
        { op: 'lineTo', data: [3, 3] },
      ]),
    ]);

    expect(paths).toEqual(['M0 0 L1 1', 'M2 2 L3 3']);
  });

  it('emits a degenerate path for a trailing move', () => {
    const paths = opsToPath([
      opSet([
        { op: 'move', data: [0, 0] },
        { op: 'lineTo', data: [1, 1] },
        { op: 'move', data: [9, 9] },
      ]),
    ]);

    expect(paths).toEqual(['M0 0 L1 1', 'M9 9']);
  });
});
