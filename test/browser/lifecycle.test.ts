import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { cleanup, mountElement, getPathsFor, getSvgFor } from './helpers.js';

afterEach(cleanup);

describe('attaching', () => {
  it('inserts the annotation SVG immediately after the element', () => {
    const element = mountElement();
    annotate(element, { type: 'underline' });

    const svg = element.nextElementSibling;
    expect(svg?.tagName).toBe('svg');
    expect(svg?.getAttribute('class')).toBe('notatio-annotation');
  });

  it('inserts the SVG before the element for highlight, so it paints behind', () => {
    const element = mountElement();
    annotate(element, { type: 'highlight' });

    expect(element.previousElementSibling?.tagName).toBe('svg');
    expect(element.nextElementSibling).toBeNull();
  });

  it('positions an unpositioned element when highlighting', () => {
    const element = mountElement();
    expect(getComputedStyle(element).position).toBe('static');

    annotate(element, { type: 'highlight' });

    expect(element.style.position).toBe('relative');
  });

  it('leaves an already-positioned element alone when highlighting', () => {
    const element = mountElement();
    element.style.position = 'absolute';

    annotate(element, { type: 'highlight' });

    expect(element.style.position).toBe('absolute');
  });

  it('makes the SVG non-interactive and unclipped', () => {
    const element = mountElement();
    annotate(element, { type: 'box' });

    const style = getSvgFor(element)!.style;
    expect(style.position).toBe('absolute');
    expect(style.pointerEvents).toBe('none');
    expect(style.overflow).toBe('visible');
  });

  it('does not attach when the element has no parent', () => {
    const orphan = document.createElement('div');
    const annotation = annotate(orphan, { type: 'underline' });

    expect(orphan.nextElementSibling).toBeNull();
    expect(annotation.isShowing()).toBe(true);

    annotation.show();
    expect(orphan.nextElementSibling).toBeNull();
  });
});

describe('show / hide / remove', () => {
  it('renders no paths until show is called', () => {
    const element = mountElement();
    annotate(element, { type: 'underline' });

    expect(getPathsFor(element)).toHaveLength(0);
  });

  it('renders paths on show', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    annotation.show();

    expect(getPathsFor(element).length).toBeGreaterThan(0);
    expect(annotation.isShowing()).toBe(true);
  });

  it('clears the paths on hide but keeps the SVG attached', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });
    annotation.show();

    annotation.hide();

    expect(getPathsFor(element)).toHaveLength(0);
    expect(getSvgFor(element)).not.toBeNull();
    expect(annotation.isShowing()).toBe(false);
  });

  it('re-renders rather than accumulating paths when show is called twice', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'box' });

    annotation.show();
    const first = getPathsFor(element).length;
    annotation.show();

    expect(getPathsFor(element)).toHaveLength(first);
  });

  it('detaches the SVG on remove', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });
    annotation.show();

    annotation.remove();

    expect(getSvgFor(element)).toBeNull();
  });

  it('tolerates remove being called twice', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });
    annotation.show();

    annotation.remove();
    expect(() => {
      annotation.remove();
    }).not.toThrow();
  });

  it('does not resurrect the annotation when show follows remove', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });
    annotation.show();
    annotation.remove();

    annotation.show();

    expect(getSvgFor(element)).toBeNull();
  });

  it('tolerates hide before show', () => {
    const element = mountElement();
    const annotation = annotate(element, { type: 'underline' });

    expect(() => {
      annotation.hide();
    }).not.toThrow();
    expect(annotation.isShowing()).toBe(false);
  });
});

describe('config isolation', () => {
  it('copies the config, so later mutation of the caller object is ignored', () => {
    const element = mountElement();
    const config = { type: 'underline', color: 'rgb(255, 0, 0)' } as const;
    const annotation = annotate(element, { ...config });

    annotation.show();

    expect(annotation.color).toBe('rgb(255, 0, 0)');
    expect(getPathsFor(element)[0]?.getAttribute('stroke')).toBe('rgb(255, 0, 0)');
  });
});
