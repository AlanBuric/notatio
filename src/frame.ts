import type { Point } from 'roughjs/bin/geometry';
import type { FullPadding, Rectangle, WritingMode } from './types.js';

/**
 * An element's box in writing-mode-relative terms. `inline` runs along the text
 * flow and `block` across it, both measured from their start edge, so anything
 * drawn in this space is correct in every writing mode.
 */
export interface Frame {
  inlineSize: number;
  blockSize: number;
  /** Padding on the block-start side, which `position: 'over'` sits beyond. */
  overPadding: number;
  /** Padding on the block-end side, which `position: 'under'` sits beyond. */
  underPadding: number;
  point(inline: number, block: number): Point;
}

/*
 * The legacy `tb-rl` aliases and the `sideways-*` values map onto whichever of
 * the two vertical modes shares their block direction.
 */
export function readWritingMode(style: CSSStyleDeclaration): WritingMode {
  const { writingMode } = style;

  if (writingMode.startsWith('horizontal') || writingMode === 'lr-tb' || writingMode === 'rl-tb') {
    return 'horizontal-tb';
  }

  return writingMode.endsWith('lr') ? 'vertical-lr' : 'vertical-rl';
}

/**
 * Horizontal right-to-left text reads against the frame's inline axis, so its
 * strokes should sweep from the end by default. The vertical modes flow top to
 * bottom regardless of `direction`, so only `horizontal-tb` is affected.
 */
export function readReversedFlow(style: CSSStyleDeclaration, mode: WritingMode): boolean {
  return mode === 'horizontal-tb' && style.direction === 'rtl';
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

  /*
   * Vertical text flows downward either way, so the inline axis is y. The two
   * modes differ only in which side the block axis starts from.
   */
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
