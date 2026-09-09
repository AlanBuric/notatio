import type { Point } from 'roughjs/bin/geometry';
import type { FullPadding, Rectangle, WritingMode } from './types.js';

/**
 * An element's box in writing-mode-relative terms: `inline` runs along the text
 * flow, `block` across it, both measured from their start edge.
 */
export interface Frame {
  inlineSize: number;
  blockSize: number;
  /** Block-start padding, which `position: 'over'` sits beyond. */
  overPadding: number;
  /** Block-end padding, which `position: 'under'` sits beyond. */
  underPadding: number;
  point(inline: number, block: number): Point;
}

export function getWritingMode(style: CSSStyleDeclaration): WritingMode {
  const { writingMode } = style;

  if (writingMode.startsWith('horizontal') || writingMode === 'lr-tb' || writingMode === 'rl-tb') {
    return 'horizontal-tb';
  }

  return writingMode.endsWith('lr') ? 'vertical-lr' : 'vertical-rl';
}

export function isReversedFlow(style: CSSStyleDeclaration): boolean {
  const rtl = style.direction === 'rtl';
  const bottomToTop = style.writingMode === 'sideways-lr';

  return rtl !== bottomToTop;
}

export function getFrame(rect: Rectangle, padding: FullPadding, mode: WritingMode): Frame {
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
