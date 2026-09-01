import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import type { RoughAnnotationConfig } from '@/types.js';
import { STROKE_JITTER, cleanup, elementBox, mountContainer, pathsFor } from './helpers.js';

afterEach(cleanup);

type Mode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

/** A column of text tall enough that a vertical stroke is unmistakable. */
function mountText(mode: Mode): HTMLElement {
  const container = mountContainer();
  const element = document.createElement('div');

  element.style.cssText = `writing-mode:${mode};width:120px;height:180px;`;
  element.textContent = 'annotate me';
  container.appendChild(element);

  return element;
}

function draw(mode: Mode, config: RoughAnnotationConfig): SVGPathElement[] {
  const element = mountText(mode);

  annotate(element, config).show();

  return pathsFor(element);
}

function bounds(paths: SVGPathElement[]) {
  const boxes = paths.map((path) => path.getBBox());

  return {
    left: Math.min(...boxes.map((box) => box.x)),
    right: Math.max(...boxes.map((box) => box.x + box.width)),
    top: Math.min(...boxes.map((box) => box.y)),
    bottom: Math.max(...boxes.map((box) => box.y + box.height)),
  };
}

const UNDERLINE = { type: 'underline', animate: false, iterations: 1, padding: 0 } as const;

describe('underline direction', () => {
  it('runs across the text under horizontal writing', () => {
    const { left, right, top, bottom } = bounds(draw('horizontal-tb', UNDERLINE));

    expect(right - left).toBeGreaterThan(bottom - top);
  });

  it.each(['vertical-rl', 'vertical-lr'] as const)('runs down the text under %s', (mode) => {
    const { left, right, top, bottom } = bounds(draw(mode, UNDERLINE));

    expect(bottom - top).toBeGreaterThan(right - left);
  });
});

describe('underline side', () => {
  it('sits below the text under horizontal writing', () => {
    const element = mountText('horizontal-tb');

    annotate(element, UNDERLINE).show();

    expect(bounds(pathsFor(element)).top).toBeGreaterThan(
      elementBox(element).bottom - STROKE_JITTER,
    );
  });

  /* The block-end side, which is where the next column of text would go. */
  it('sits left of the text under vertical-rl', () => {
    const element = mountText('vertical-rl');

    annotate(element, UNDERLINE).show();

    expect(bounds(pathsFor(element)).right).toBeLessThan(elementBox(element).left + STROKE_JITTER);
  });

  it('sits right of the text under vertical-lr', () => {
    const element = mountText('vertical-lr');

    annotate(element, UNDERLINE).show();

    expect(bounds(pathsFor(element)).left).toBeGreaterThan(
      elementBox(element).right - STROKE_JITTER,
    );
  });
});

describe('strikethrough', () => {
  it('runs down the middle of a vertical column', () => {
    const element = mountText('vertical-rl');

    annotate(element, { type: 'strikethrough', animate: false, iterations: 1 }).show();

    const box = elementBox(element);
    const { left, right, top, bottom } = bounds(pathsFor(element));

    expect(bottom - top).toBeGreaterThan(right - left);
    expect(Math.abs((left + right) / 2 - (box.x + box.width / 2))).toBeLessThan(STROKE_JITTER);
  });
});

describe('highlight', () => {
  const strokeWidth = (paths: SVGPathElement[]) => Number(paths[0]!.getAttribute('stroke-width'));

  it('takes its thickness from the text height under horizontal writing', () => {
    const element = mountText('horizontal-tb');

    annotate(element, { type: 'highlight', animate: false, iterations: 1 }).show();

    expect(strokeWidth(pathsFor(element))).toBeCloseTo(elementBox(element).height * 0.95, 0);
  });

  /* Across the text is the column's width once the text runs downward. */
  it('takes its thickness from the column width under vertical writing', () => {
    const element = mountText('vertical-rl');

    annotate(element, { type: 'highlight', animate: false, iterations: 1 }).show();

    expect(strokeWidth(pathsFor(element))).toBeCloseTo(elementBox(element).width * 0.95, 0);
  });
});

describe('padding', () => {
  /* Under vertical-rl the block-end side is the left one, so `left` moves it. */
  it('is read from the side the stroke actually sits on', () => {
    const near = bounds(draw('vertical-rl', { ...UNDERLINE, padding: [0, 0, 0, 0] })).right;
    const far = bounds(draw('vertical-rl', { ...UNDERLINE, padding: [0, 0, 0, 40] })).right;

    expect(near - far).toBeGreaterThan(30);
  });
});
