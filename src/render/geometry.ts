import type { OpSet, ResolvedOptions } from 'roughjs/bin/core';
import type { Point } from 'roughjs/bin/geometry';
import { line } from 'roughjs/bin/renderer';
import { WAVE_RESOLUTION, ZIGZAG_RESOLUTION } from '@/constants.js';
import type { Frame } from '@/frame.js';
import type { AnnotationPosition, BracketType, FullPadding, Rectangle } from '@/types.js';

export function repeat(count: number, draw: () => OpSet): OpSet[] {
  return Array.from({ length: Math.max(count, 0) }, draw);
}

export function alternatingLines(
  from: Point,
  to: Point,
  iterations: number,
  reverse: number,
  options: ResolvedOptions,
): OpSet[] {
  return Array.from({ length: Math.max(iterations, 0) }, (_, index) => {
    const [[x1, y1], [x2, y2]] = (index + reverse) % 2 ? [to, from] : [from, to];
    return line(x1, y1, x2, y2, options);
  });
}

export function alternatingStrokes(
  points: Point[],
  iterations: number,
  reverse: number,
  draw: (points: Point[]) => OpSet,
): OpSet[] {
  let reversed: Point[] | undefined;

  return Array.from({ length: Math.max(iterations, 0) }, (_, index) =>
    draw((index + reverse) % 2 ? (reversed ??= [...points].reverse()) : points),
  );
}

/* Whole waves only, so the stroke starts and ends on the baseline. This leaves
   the drawn wavelength slightly off the requested frequency. */
function waveCount(inlineSize: number, frequency: number): number {
  return Math.max(Math.round((inlineSize * frequency) / 100), 1);
}

export function sinePoints(
  frame: Frame,
  block: number,
  amplitude: number,
  frequency: number,
): Point[] {
  const waves = waveCount(frame.inlineSize, frequency);
  const steps = waves * WAVE_RESOLUTION;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;

    return frame.point(
      frame.inlineSize * progress,
      block + amplitude * Math.sin(progress * waves * 2 * Math.PI),
    );
  });
}

export function zigzagPoints(
  frame: Frame,
  block: number,
  amplitude: number,
  frequency: number,
): Point[] {
  const waves = waveCount(frame.inlineSize, frequency);
  const steps = waves * ZIGZAG_RESOLUTION;
  const offsets = [0, amplitude, 0, -amplitude];

  return Array.from({ length: steps + 1 }, (_, index) =>
    frame.point((frame.inlineSize * index) / steps, block + offsets[index % ZIGZAG_RESOLUTION]),
  );
}

/* RoughJS starts every `linearPath` segment with its own move, which
   `opsToPath` would split into a separate path each. A wave wants one path. */
export function joinOps({ ops, ...rest }: OpSet): OpSet {
  return {
    ...rest,
    ops: ops.map((op, index) =>
      index && op.op === 'move' ? { op: 'lineTo' as const, data: op.data } : op,
    ),
  };
}

export function bracketPoints(side: BracketType, rect: Rectangle, padding: FullPadding): Point[] {
  const left = rect.x - padding[3] * 2;
  const right = rect.x + rect.width + padding[1] * 2;
  const top = rect.y - padding[0] * 2;
  const bottom = rect.y + rect.height + padding[2] * 2;

  switch (side) {
    case 'top':
      return [
        [left, rect.y],
        [left, top],
        [right, top],
        [right, rect.y],
      ];
    case 'bottom':
      return [
        [left, rect.y + rect.height],
        [left, bottom],
        [right, bottom],
        [right, rect.y + rect.height],
      ];
    case 'left':
      return [
        [rect.x, top],
        [left, top],
        [left, bottom],
        [rect.x, bottom],
      ];
    case 'right':
      return [
        [rect.x + rect.width, top],
        [right, top],
        [right, bottom],
        [rect.x + rect.width, bottom],
      ];
  }
}

export function resolveBlocks(frame: Frame, position: AnnotationPosition | undefined): number[] {
  const over = -frame.overPadding;
  const under = frame.blockSize + frame.underPadding;

  if (position === 'over') return [over];
  if (position === 'both') return [over, under];

  return [under];
}
