import { afterEach, describe, expect, it, vi } from 'vitest';
import { annotate } from '@/index.js';
import { STROKE_JITTER, cleanup, mountContainer } from './helpers.js';

afterEach(cleanup);
afterEach(() => {
  window.scrollTo(0, 0);
  window.getSelection()?.removeAllRanges();
});

function mountParagraph(text: string, css = ''): HTMLElement {
  const container = mountContainer();
  const paragraph = document.createElement('p');

  paragraph.style.cssText = `margin:0;${css}`;
  paragraph.textContent = text;
  container.appendChild(paragraph);

  return paragraph;
}

function textRange(element: HTMLElement, start: number, end: number): Range {
  const range = document.createRange();
  const node = element.firstChild!;

  range.setStart(node, start);
  range.setEnd(node, end);

  return range;
}

function paths(annotation: { svg: SVGSVGElement | undefined }): SVGPathElement[] {
  return [...(annotation.svg?.querySelectorAll('path') ?? [])];
}

function widthInSvg(svg: SVGSVGElement, rect: DOMRect): number {
  const inverse = svg.getScreenCTM()!.inverse();
  const start = new DOMPoint(rect.x, rect.y).matrixTransform(inverse);
  const end = new DOMPoint(rect.right, rect.bottom).matrixTransform(inverse);

  return end.x - start.x;
}

const BASE = { animate: false, iterations: 1, padding: 0 } as const;

const fillerWords = Array.from({ length: 60 }, () => 'word').join(' ');

describe('range targets', () => {
  it('draws along the range rather than the whole element', () => {
    const paragraph = mountParagraph('the quick brown fox jumps over');
    const range = textRange(paragraph, 4, 9);
    const annotation = annotate(range, { type: 'underline', ...BASE });

    annotation.show();

    const drawn = paths(annotation)[0]!.getBBox().width;

    expect(
      Math.abs(drawn - widthInSvg(annotation.svg!, range.getBoundingClientRect())),
    ).toBeLessThan(STROKE_JITTER);

    const wholeLine = annotate(textRange(paragraph, 0, paragraph.textContent!.length), {
      type: 'underline',
      ...BASE,
    });

    wholeLine.show();

    expect(paths(wholeLine)[0]!.getBBox().width).toBeGreaterThan(drawn + STROKE_JITTER);
  });

  it('inserts the SVG next to the nearest element ancestor', () => {
    const paragraph = mountParagraph('hello world');
    const annotation = annotate(textRange(paragraph, 0, 5), { type: 'underline' });

    expect(paragraph.nextElementSibling).toBe(annotation.svg);
  });

  it('inserts before the ancestor for highlight, positions it, and restores on remove', () => {
    const paragraph = mountParagraph('hello world');

    expect(getComputedStyle(paragraph).position).toBe('static');

    const annotation = annotate(textRange(paragraph, 0, 5), { type: 'highlight' });

    expect(paragraph.previousElementSibling).toBe(annotation.svg);
    expect(paragraph.style.position).toBe('relative');

    annotation.remove();

    expect(paragraph.style.position).toBe('');
  });

  it('annotates each line box of a wrapped range', () => {
    const paragraph = mountParagraph(fillerWords, 'width:200px;');
    const range = textRange(paragraph, 0, paragraph.textContent!.length);
    const lines = [...range.getClientRects()].filter((rect) => rect.width && rect.height).length;

    expect(lines).toBeGreaterThan(1);

    const annotation = annotate(range, { type: 'underline', ...BASE, multiline: true });

    annotation.show();

    expect(paths(annotation)).toHaveLength(lines);
  });

  it('draws a single stroke for a wrapped range when multiline is off', () => {
    const paragraph = mountParagraph(fillerWords, 'width:200px;');
    const range = textRange(paragraph, 0, paragraph.textContent!.length);
    const annotation = annotate(range, { type: 'underline', ...BASE, multiline: false });

    annotation.show();

    expect(paths(annotation)).toHaveLength(1);
  });

  it('runs down the column for a vertical writing mode', () => {
    const paragraph = mountParagraph('abcdefghij', 'writing-mode:vertical-rl;height:120px;');
    const annotation = annotate(textRange(paragraph, 0, 4), { type: 'underline', ...BASE });

    annotation.show();

    const box = paths(annotation)[0]!.getBBox();

    expect(box.height).toBeGreaterThan(box.width);
  });

  it('draws nothing for a collapsed range without throwing', async () => {
    const paragraph = mountParagraph('hello world');
    const annotation = annotate(textRange(paragraph, 3, 3), { type: 'underline' });

    await expect(annotation.show()).resolves.toBeUndefined();
    expect(paths(annotation)).toHaveLength(0);
  });

  it('clears itself when the range collapses after a DOM change', async () => {
    const paragraph = mountParagraph('hello world');
    const annotation = annotate(textRange(paragraph, 0, 5), { type: 'underline', ...BASE });

    annotation.show();
    expect(paths(annotation)).toHaveLength(1);

    paragraph.textContent = 'replaced';

    await vi.waitFor(() => expect(paths(annotation)).toHaveLength(0));
  });

  it('redraws on window resize', async () => {
    const paragraph = mountParagraph('hello world');
    const annotation = annotate(textRange(paragraph, 0, 5), { type: 'underline', ...BASE });

    annotation.show();
    const before = paths(annotation)[0]!.getAttribute('d');

    paragraph.style.marginLeft = '48px';
    window.dispatchEvent(new Event('resize'));

    await vi.waitFor(() => expect(paths(annotation)[0]?.getAttribute('d')).not.toBe(before));
  });

  it('accepts a StaticRange', () => {
    const paragraph = mountParagraph('hello world');
    const node = paragraph.firstChild!;
    const staticRange = new StaticRange({
      startContainer: node,
      startOffset: 0,
      endContainer: node,
      endOffset: 5,
    });
    const annotation = annotate(staticRange, { type: 'underline', ...BASE });

    annotation.show();

    expect(paths(annotation)).toHaveLength(1);
  });

  it('snapshots a Selection so a later selection change does not move it', async () => {
    const paragraph = mountParagraph('hello world');
    const node = paragraph.firstChild!;
    const selection = window.getSelection()!;

    selection.removeAllRanges();
    selection.addRange(textRange(paragraph, 0, 5));

    const annotation = annotate(selection, { type: 'underline', ...BASE });

    annotation.show();
    expect(paths(annotation)).toHaveLength(1);

    const before = paths(annotation)[0]!.getAttribute('d');
    const wider = document.createRange();

    wider.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(wider);
    window.dispatchEvent(new Event('resize'));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(paths(annotation)[0]?.getAttribute('d')).toBe(before);
  });

  it('does not attach when the range has no element ancestor', async () => {
    const annotation = annotate(new Range(), { type: 'underline' });

    expect(annotation.svg).toBeUndefined();
    await expect(annotation.show()).resolves.toBeUndefined();
  });

  it('draws once the range scrolls into view with showOnVisible', async () => {
    const container = mountContainer();

    container.style.position = 'static';

    const before = document.createElement('div');
    const after = document.createElement('div');
    const paragraph = document.createElement('p');

    before.style.height = '200vh';
    after.style.height = '200vh';
    paragraph.textContent = 'target words in the middle of a long page';
    container.append(before, paragraph, after);

    const annotation = annotate(textRange(paragraph, 0, 6), {
      type: 'underline',
      showOnVisible: true,
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(paths(annotation)).toHaveLength(0);

    paragraph.scrollIntoView({ block: 'center' });

    await vi.waitFor(() => expect(paths(annotation).length).toBeGreaterThan(0));
  });
});
