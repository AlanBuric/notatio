import type { TextLocation } from './types';

export const BLOCK_ATTRIBUTE = 'data-block';
export const ANNOTATION_ATTRIBUTE = 'data-annotation';

const BLOCK_SELECTOR = `[${BLOCK_ATTRIBUTE}]`;

export type DescribeFailure = 'outside' | 'empty' | 'across-blocks';

export type DescribeResult =
  { ok: true; location: TextLocation } | { ok: false; reason: DescribeFailure };

function blockOf(node: Node | null, root: HTMLElement): HTMLElement | null {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);

  if (!element || !root.contains(element)) {
    return null;
  }

  return element.closest<HTMLElement>(BLOCK_SELECTOR);
}

/** Length of the block's text up to a range boundary, whatever kind of node it lands on. */
function textLengthBefore(block: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();

  range.selectNodeContents(block);
  range.setEnd(container, offset);

  return range.toString().length;
}

function textNodeAt(block: HTMLElement, target: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let consumed = 0;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;

    if (consumed + text.length >= target) {
      return { node: text, offset: target - consumed };
    }

    consumed += text.length;
  }

  return null;
}

/**
 * Turns a live selection into offsets into a single block. A selection that
 * runs past the end of its block is trimmed back to it, which is what dragging
 * a little too far means, but one that covers text in a second block is
 * refused rather than silently cut short.
 */
export function describeRange(range: Range, root: HTMLElement): DescribeResult {
  const block = blockOf(range.startContainer, root);

  if (!block) {
    return { ok: false, reason: 'outside' };
  }

  const trimmed = range.cloneRange();

  if (blockOf(range.endContainer, root) !== block) {
    const blockEnd = document.createRange();

    blockEnd.selectNodeContents(block);
    trimmed.setEnd(blockEnd.endContainer, blockEnd.endOffset);

    if (range.toString().slice(trimmed.toString().length).trim()) {
      return { ok: false, reason: 'across-blocks' };
    }
  }

  const text = trimmed.toString();

  if (!text.trim()) {
    return { ok: false, reason: 'empty' };
  }

  const start = textLengthBefore(block, trimmed.startContainer, trimmed.startOffset);

  return {
    ok: true,
    location: {
      block: block.getAttribute(BLOCK_ATTRIBUTE) ?? '',
      start,
      end: start + text.length,
      text,
    },
  };
}

/** Rebuilds a range from offsets, always landing its ends inside text nodes. */
export function locateRange(location: TextLocation, root: HTMLElement): Range | null {
  const block = root.querySelector<HTMLElement>(
    `[${BLOCK_ATTRIBUTE}="${CSS.escape(location.block)}"]`,
  );

  if (!block) {
    return null;
  }

  const start = textNodeAt(block, location.start);
  const end = textNodeAt(block, location.end);

  if (!start || !end) {
    return null;
  }

  const range = document.createRange();

  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);

  return range.toString() === location.text ? range : null;
}

export function wrapRange(range: Range, id: string): HTMLElement {
  const wrapper = document.createElement('span');

  wrapper.className = 'annotated';
  wrapper.setAttribute(ANNOTATION_ATTRIBUTE, id);
  wrapper.append(range.extractContents());
  range.insertNode(wrapper);

  return wrapper;
}

export function unwrapElement(element: HTMLElement): void {
  const parent = element.parentNode;

  if (!parent) {
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
  parent.normalize();
}
