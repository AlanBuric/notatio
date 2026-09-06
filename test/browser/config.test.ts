import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { cleanup, flushMicrotasks, mountContainer, mountElement, pathsFor } from './helpers.js';

afterEach(cleanup);

/** CSS time values serialise as seconds in Chromium, so normalise to ms. */
function durationMs(value: string): number {
  if (value.endsWith('ms')) return parseFloat(value);
  if (value.endsWith('s')) return parseFloat(value) * 1000;

  return parseFloat(value);
}

function keyframeStyles(): HTMLStyleElement[] {
  return [...document.querySelectorAll('style')].filter((style) =>
    style.textContent?.includes('notatio-dash'),
  );
}

/** The x coordinate of a path's opening move command. */
function startX(path: SVGPathElement): number {
  const match = /^M(-?[\d.]+)/.exec(path.getAttribute('d') ?? '');

  return parseFloat(match![1]!);
}

describe('color', () => {
  it('defaults to currentColor', () => {
    const element = mountElement();

    annotate(element, { type: 'underline' }).show();
    expect(pathsFor(element)[0]?.getAttribute('stroke')).toBe('currentColor');
  });

  it('applies the configured color to every path', () => {
    const element = mountElement();

    annotate(element, { type: 'box', color: 'rgb(0, 128, 0)' }).show();

    const paths = pathsFor(element);

    expect(paths.length).toBeGreaterThan(0);

    paths.forEach((path) => expect(path.getAttribute('stroke')).toBe('rgb(0, 128, 0)'));
  });

  it('re-renders when color is set after showing', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', color: 'red' });

    annotation.show();

    annotation.color = 'blue';
    await flushMicrotasks();

    expect(annotation.color).toBe('blue');
    expect(pathsFor(element)[0]?.getAttribute('stroke')).toBe('blue');
  });
});

describe('strokeWidth', () => {
  it('defaults to 2', () => {
    const element = mountElement();

    annotate(element, { type: 'underline' }).show();
    expect(pathsFor(element)[0]?.getAttribute('stroke-width')).toBe('2');
  });

  it('applies the configured width', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', strokeWidth: 7 }).show();
    expect(pathsFor(element)[0]?.getAttribute('stroke-width')).toBe('7');
  });

  it('honours a zero width', () => {
    /* Guards against a zero being coerced to the default. */
    const element = mountElement();

    annotate(element, { type: 'underline', strokeWidth: 0 }).show();
    expect(pathsFor(element)[0]?.getAttribute('stroke-width')).toBe('0');
  });

  it('does not accept a width for highlight, deriving it from element height', () => {
    const element = mountElement();

    // @ts-expect-error highlight sizes its stroke to the element.
    annotate(element, { type: 'highlight', strokeWidth: 1 }).show();

    const width = parseFloat(pathsFor(element)[0]!.getAttribute('stroke-width')!);

    expect(width).toBeCloseTo(element.getBoundingClientRect().height * 0.95, 1);
  });
});

describe('roughness', () => {
  it('wobbles off the straight baseline by default', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', animate: false }).show();
    expect(pathsFor(element)[0]!.getBBox().height).toBeGreaterThan(0);
  });

  it('draws an exact line when set to 0', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', roughness: 0, animate: false }).show();
    expect(pathsFor(element)[0]!.getBBox().height).toBeCloseTo(0, 5);
  });

  it('re-renders when roughness is set after showing', async () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline', roughness: 0 });

    annotation.show();

    annotation.roughness = 5;
    await flushMicrotasks();

    expect(annotation.roughness).toBe(5);
    expect(pathsFor(element)[0]!.getBBox().height).toBeGreaterThan(0);
  });
});

describe('animation', () => {
  it('animates by default', () => {
    const element = mountElement();

    annotate(element, { type: 'underline' }).show();

    const style = pathsFor(element)[0]!.style;

    expect(style.animationName).toBe('notatio-dash');
    expect(durationMs(style.animationDuration)).toBeGreaterThan(0);
  });

  it('sets no animation when animate is false', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', animate: false }).show();

    pathsFor(element).forEach((path) => {
      expect(path.style.animationName).toBe('');
      expect(path.style.strokeDasharray).toBe('');
    });
  });

  it('splits the configured duration across the paths', () => {
    const element = mountElement();

    annotate(element, { type: 'underline', animationDuration: 1000, iterations: 2 }).show();

    const total = pathsFor(element).reduce(
      (sum, path) => sum + durationMs(path.style.animationDuration),
      0,
    );

    expect(total).toBeCloseTo(1000, 0);
  });

  it('renders instantly when animationDuration is zero', () => {
    /* Guards against a zero being coerced to the default. */
    const element = mountElement();

    annotate(element, { type: 'underline', animationDuration: 0 }).show();
    pathsFor(element).forEach((path) => expect(durationMs(path.style.animationDuration)).toBe(0));
  });

  it('does not animate on re-show, so an already-visible annotation does not flicker', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    annotation.show();
    annotation.show();

    pathsFor(element).forEach((path) => expect(path.style.animationName).toBe(''));
  });

  it('injects the keyframes rule once', () => {
    mountElement();
    annotate(mountElement(), { type: 'underline' }).show();
    annotate(mountElement(), { type: 'box' }).show();

    expect(keyframeStyles()).toHaveLength(1);
  });

  /* A router replacing document.head must not leave annotations invisible. */
  it('reinjects the keyframes after the document head is replaced', () => {
    annotate(mountElement(), { type: 'underline' }).show();
    keyframeStyles().forEach((style) => style.remove());

    const element = mountElement();

    annotate(element, { type: 'underline' }).show();

    expect(keyframeStyles()).toHaveLength(1);
    expect(pathsFor(element)[0]?.style.animationName).toBe('notatio-dash');
  });
});

describe('padding', () => {
  it('moves the underline further from the element as padding grows', () => {
    const tight = mountElement();

    annotate(tight, { type: 'underline', padding: 0, animate: false }).show();

    const loose = mountElement();

    annotate(loose, { type: 'underline', padding: 40, animate: false }).show();

    /* A larger bottom padding pushes the underline further down. */
    const tightY = parseFloat(
      /^M[\d.-]+ ([\d.-]+)/.exec(
        tight.nextElementSibling!.querySelector('path')!.getAttribute('d')!,
      )![1]!,
    );
    const looseY = parseFloat(
      /^M[\d.-]+ ([\d.-]+)/.exec(
        loose.nextElementSibling!.querySelector('path')!.getAttribute('d')!,
      )![1]!,
    );

    expect(looseY).toBeGreaterThan(tightY + 30);
  });
});

describe('reverse', () => {
  it('draws the first stroke against the text flow', () => {
    const forwards = mountElement();

    annotate(forwards, { type: 'underline', animate: false }).show();

    const backwards = mountElement();

    annotate(backwards, { type: 'underline', reverse: true, animate: false }).show();

    expect(startX(pathsFor(backwards)[0]!)).toBeGreaterThan(startX(pathsFor(forwards)[0]!));
  });
});

describe('multiline', () => {
  it('annotates each visual line separately', () => {
    const container = mountContainer();

    container.style.width = '120px';

    const span = document.createElement('span');

    span.textContent = 'this sentence is long enough to wrap onto several lines';
    container.appendChild(span);

    const lines = span.getClientRects().length;
    expect(lines).toBeGreaterThan(1);

    annotate(span, { type: 'underline', multiline: true, iterations: 1 }).show();
    expect(pathsFor(span)).toHaveLength(lines);
  });

  it('annotates each visual line by default', () => {
    const container = mountContainer();

    container.style.width = '120px';

    const span = document.createElement('span');

    span.textContent = 'this sentence is long enough to wrap onto several lines';
    container.appendChild(span);

    const lines = span.getClientRects().length;
    expect(lines).toBeGreaterThan(1);

    annotate(span, { type: 'underline', iterations: 1 }).show();
    expect(pathsFor(span)).toHaveLength(lines);
  });

  it('annotates the bounding box as one when multiline is off', () => {
    const container = mountContainer();

    container.style.width = '120px';

    const span = document.createElement('span');

    span.textContent = 'this sentence is long enough to wrap onto several lines';
    container.appendChild(span);

    annotate(span, { type: 'underline', multiline: false, iterations: 1 }).show();
    expect(pathsFor(span)).toHaveLength(1);
  });
});
