import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import type { AnnotationPosition, FullPadding, RoughAnnotationConfig } from '@/types.js';
import {
  STROKE_JITTER,
  cleanup,
  getElementBox,
  mountContainer,
  getPathsFor,
  getSubpathCount,
} from './helpers.js';

afterEach(cleanup);

function mountText(writingMode = 'horizontal-tb'): HTMLElement {
  const container = mountContainer();
  const element = document.createElement('div');

  element.style.cssText = `writing-mode:${writingMode};width:200px;height:120px;`;
  element.textContent = 'annotate me';
  container.appendChild(element);

  return element;
}

const BASE = { type: 'underline', animate: false, iterations: 1, padding: 0 } as const;

function extent(element: HTMLElement) {
  const boxes = getPathsFor(element).map((path) => path.getBBox());

  return {
    top: Math.min(...boxes.map((box) => box.y)),
    bottom: Math.max(...boxes.map((box) => box.y + box.height)),
    left: Math.min(...boxes.map((box) => box.x)),
    right: Math.max(...boxes.map((box) => box.x + box.width)),
  };
}

function drawn(config: RoughAnnotationConfig, writingMode?: string) {
  const element = mountText(writingMode);

  annotate(element, config).show();

  return { element, box: getElementBox(element), ...extent(element) };
}

describe('position', () => {
  it('puts the stroke below the text by default', () => {
    const { box, top } = drawn(BASE);

    expect(top).toBeGreaterThan(box.bottom - STROKE_JITTER);
  });

  it('puts the stroke above the text when set to over', () => {
    const { box, bottom } = drawn({ ...BASE, position: 'over' });

    expect(bottom).toBeLessThan(box.top + STROKE_JITTER);
  });

  it('draws on both sides when set to both', () => {
    const { box, top, bottom } = drawn({ ...BASE, position: 'both' });

    expect(top).toBeLessThan(box.top + STROKE_JITTER);
    expect(bottom).toBeGreaterThan(box.bottom - STROKE_JITTER);
  });

  it('doubles the stroke count when set to both', () => {
    const one = getSubpathCount(drawn({ ...BASE, iterations: 2 }).element);
    const two = getSubpathCount(drawn({ ...BASE, iterations: 2, position: 'both' }).element);

    expect(two).toBe(one * 2);
  });

  it.each(['under', 'over'] as AnnotationPosition[])(
    'reads the padding of the %s side it sits on',
    (position) => {
      const padding: FullPadding = position === 'over' ? [40, 0, 0, 0] : [0, 0, 40, 0];
      const near = drawn({ ...BASE, position });
      const far = drawn({ ...BASE, position, padding });
      const distance = position === 'over' ? far.box.top - far.bottom : far.top - far.box.bottom;
      const before = position === 'over' ? near.box.top - near.bottom : near.top - near.box.bottom;

      expect(distance - before).toBeGreaterThan(30);
    },
  );
});

describe('position under vertical writing', () => {
  /* `over` is the block-start side, which vertical-rl puts on the right. */
  it('mirrors onto the right of the column under vertical-rl', () => {
    const { box, left } = drawn({ ...BASE, position: 'over' }, 'vertical-rl');

    expect(left).toBeGreaterThan(box.right - STROKE_JITTER);
  });

  it('mirrors onto the left of the column under vertical-lr', () => {
    const { box, right } = drawn({ ...BASE, position: 'over' }, 'vertical-lr');

    expect(right).toBeLessThan(box.left + STROKE_JITTER);
  });

  it('brackets both sides of the column when set to both', () => {
    const { box, left, right } = drawn({ ...BASE, position: 'both' }, 'vertical-rl');

    expect(left).toBeLessThan(box.left + STROKE_JITTER);
    expect(right).toBeGreaterThan(box.right - STROKE_JITTER);
  });
});

describe('position on wave types', () => {
  it.each(['wavy', 'zigzag'] as const)('%s draws on both sides when asked', (type) => {
    const single = getSubpathCount(drawn({ type, animate: false, iterations: 1 }).element);
    const both = getSubpathCount(
      drawn({ type, animate: false, iterations: 1, position: 'both' }).element,
    );

    expect(both).toBe(single * 2);
  });
});
