import { describe, expect, it } from 'vitest';
import { opsToPath } from '@/render/index.js';
import type { OpSet } from 'roughjs/bin/core';

function opSet(ops: OpSet['ops']): OpSet {
  return { type: 'path', ops };
}

describe('opsToPath', () => {
  it('returns nothing for an empty op list', () => expect(opsToPath([])).toBe(''));

  it('returns nothing for an op set with no ops', () => expect(opsToPath([opSet([])])).toBe(''));

  it('converts a move and a line into a single path string', () => {
    const d = opsToPath([
      opSet([
        { op: 'move', data: [0, 1] },
        { op: 'lineTo', data: [2, 3] },
      ]),
    ]);

    expect(d).toBe('M0 1 L2 3');
  });

  it('converts a bezier segment', () => {
    const d = opsToPath([
      opSet([
        { op: 'move', data: [0, 0] },
        { op: 'bcurveTo', data: [1, 2, 3, 4, 5, 6] },
      ]),
    ]);

    expect(d).toBe('M0 0 C1 2, 3 4, 5 6');
  });

  it('keeps every move as a subpath within a single path string', () => {
    const d = opsToPath([
      opSet([
        { op: 'move', data: [0, 0] },
        { op: 'lineTo', data: [1, 1] },
        { op: 'move', data: [5, 5] },
        { op: 'lineTo', data: [6, 6] },
      ]),
    ]);

    expect(d).toBe('M0 0 L1 1 M5 5 L6 6');
  });

  it('merges separate op sets into a single path string', () => {
    const d = opsToPath([
      opSet([
        { op: 'move', data: [0, 0] },
        { op: 'lineTo', data: [1, 1] },
      ]),
      opSet([
        { op: 'move', data: [2, 2] },
        { op: 'lineTo', data: [3, 3] },
      ]),
    ]);

    expect(d).toBe('M0 0 L1 1 M2 2 L3 3');
  });

  it('keeps a trailing move as a degenerate subpath', () => {
    const d = opsToPath([
      opSet([
        { op: 'move', data: [0, 0] },
        { op: 'lineTo', data: [1, 1] },
        { op: 'move', data: [9, 9] },
      ]),
    ]);

    expect(d).toBe('M0 0 L1 1 M9 9');
  });

  it('rounds coordinates to three decimal places', () => {
    const d = opsToPath([
      opSet([
        { op: 'move', data: [0.123456, 1.999999] },
        { op: 'lineTo', data: [2.005, 3.004] },
        { op: 'bcurveTo', data: [4.1, 5.2, 6.3, 7.4, 8.5, 9.6] },
      ]),
    ]);

    expect(d).toBe('M0.123 2 L2.005 3.004 C4.1 5.2, 6.3 7.4, 8.5 9.6');
  });
});
