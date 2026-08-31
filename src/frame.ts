import type { Point } from 'roughjs/bin/geometry';
import type { FullPadding, Rectangle, WritingMode } from './types.js';

/**
 * An element's box in writing-mode-relative terms. `inline` runs along the text
 * flow, `block` runs across it, and both are measured from their start edge, so
 * a planner that draws in this space is correct in every writing mode.
 */
export interface Frame {
  /** Extent along the inline axis: the element's width under horizontal text. */
  inlineSize: number;
  /** Extent along the block axis: the element's height under horizontal text. */
  blockSize: number;
  /** Padding on the block-start side, which `position: 'over'` sits beyond. */
  overPadding: number;
  /** Padding on the block-end side, which `position: 'under'` sits beyond. */
  underPadding: number;
  point(inline: number, block: number): Point;
}

/**
 * Resolves a computed `writing-mode` to the three cases that differ
 * geometrically. The legacy `tb-rl` aliases and the `sideways-*` values map onto
 * whichever of the two vertical modes shares their block direction.
 */
export function readWritingMode(element: HTMLElement): WritingMode {
  const { writingMode } = window.getComputedStyle(element);

  if (writingMode.startsWith('horizontal') || writingMode === 'lr-tb' || writingMode === 'rl-tb') {
    return 'horizontal-tb';
  }

  return writingMode.endsWith('lr') ? 'vertical-lr' : 'vertical-rl';
}

export function createFrame(rect: Rectangle, padding: FullPadding, mode: WritingMode): Frame {
  const [top, right, bottom, left] = padding;

  if (mode === 'horizontal-tb') {
    return {
      inlineSize: rect.width,
      blockSize: rect.height,
      overPadding: top,
      underPadding: bottom,
      point: (inline, block) => [rect.x + inline, rect.y + block],
    };
  }

  /* Vertical text flows downward, so the inline axis is y either way. What the
     two modes disagree on is which side the block axis starts from. */
  const rightToLeft = mode === 'vertical-rl';

  return {
    inlineSize: rect.height,
    blockSize: rect.width,
    overPadding: rightToLeft ? right : left,
    underPadding: rightToLeft ? left : right,
    point: (inline, block) => [
      rightToLeft ? rect.x + rect.width - block : rect.x + block,
      rect.y + inline,
    ],
  };
}
