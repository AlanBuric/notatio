import type { AnnotationSubject } from '@/types.js';

export interface TargetMeasurement {
  rects: DOMRect[];
  style: CSSStyleDeclaration;
}

/** What an annotation reads its geometry from and attaches its SVG beside: an element, or a text range. */
export interface AnnotationTarget {
  readonly anchor: HTMLElement | null;
  placeSvg(svg: SVGSVGElement, behind: boolean): void;
  measure(multiline: boolean): TargetMeasurement;
  observeReflow(onReflow: () => void): () => void;
  observeVisibility(
    options: IntersectionObserverInit,
    onChange: (visible: boolean) => void,
  ): () => void;
  release(): void;
}

const NOOP = (): void => undefined;

const TRANSIT_THRESHOLDS = Array.from({ length: 101 }, (_, index) => index / 100);

function insertBeside(host: HTMLElement, svg: SVGSVGElement, behind: boolean): boolean {
  host.insertAdjacentElement(behind ? 'beforebegin' : 'afterend', svg);

  if (behind && window.getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';

    return true;
  }

  return false;
}

function restorePosition(host: HTMLElement, changed: boolean): void {
  if (changed && host.style.position === 'relative') host.style.position = '';
}

export class ElementTarget implements AnnotationTarget {
  #element: HTMLElement;
  #positioned = false;

  constructor(element: HTMLElement) {
    this.#element = element;
  }

  get anchor(): HTMLElement {
    return this.#element;
  }

  placeSvg(svg: SVGSVGElement, behind: boolean): void {
    this.#positioned = insertBeside(this.#element, svg, behind);
  }

  measure(multiline: boolean): TargetMeasurement {
    return {
      rects: multiline
        ? [...this.#element.getClientRects()]
        : [this.#element.getBoundingClientRect()],
      style: window.getComputedStyle(this.#element),
    };
  }

  observeReflow(onReflow: () => void): () => void {
    const observer = new ResizeObserver(onReflow);

    observer.observe(this.#element);

    return () => observer.disconnect();
  }

  observeVisibility(
    options: IntersectionObserverInit,
    onChange: (visible: boolean) => void,
  ): () => void {
    const observer = new IntersectionObserver((entries) => {
      const latest = entries.at(-1);

      if (latest) onChange(latest.isIntersecting);
    }, options);

    observer.observe(this.#element);

    return () => observer.disconnect();
  }

  release(): void {
    restorePosition(this.#element, this.#positioned);
  }
}

function elementAncestor(node: Node): HTMLElement | null {
  const element = node instanceof Element ? node : node.parentElement;

  return element instanceof HTMLElement ? element : null;
}

function firstThreshold(threshold: number | number[] | undefined): number {
  if (Array.isArray(threshold)) return threshold[0] ?? 0;

  return threshold ?? 0;
}

function coveredFraction(box: DOMRect, within: DOMRectReadOnly): number {
  const area = box.width * box.height;

  if (!area) return 0;

  const width = Math.max(0, Math.min(box.right, within.right) - Math.max(box.left, within.left));
  const height = Math.max(0, Math.min(box.bottom, within.bottom) - Math.max(box.top, within.top));

  return (width * height) / area;
}

export class RangeTarget implements AnnotationTarget {
  #range: Range;
  #anchor: HTMLElement | null;
  #positioned = false;

  constructor(range: Range) {
    this.#range = range;
    this.#anchor = elementAncestor(range.commonAncestorContainer);
  }

  get anchor(): HTMLElement | null {
    return this.#anchor;
  }

  placeSvg(svg: SVGSVGElement, behind: boolean): void {
    if (this.#anchor) this.#positioned = insertBeside(this.#anchor, svg, behind);
  }

  measure(multiline: boolean): TargetMeasurement {
    const style = window.getComputedStyle(this.#anchor ?? document.body);

    if (this.#range.collapsed) return { rects: [], style };

    if (!multiline) {
      const box = this.#range.getBoundingClientRect();

      return { rects: box.width && box.height ? [box] : [], style };
    }

    return {
      rects: [...this.#range.getClientRects()].filter((rect) => rect.width && rect.height),
      style,
    };
  }

  observeReflow(onReflow: () => void): () => void {
    const host = this.#anchor;

    if (!host) return NOOP;

    const resize = new ResizeObserver(onReflow);
    const mutation = new MutationObserver(onReflow);

    resize.observe(host);
    mutation.observe(host, { childList: true, characterData: true, subtree: true });

    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }

  observeVisibility(
    options: IntersectionObserverInit,
    onChange: (visible: boolean) => void,
  ): () => void {
    const host = this.#anchor;

    if (!host) return NOOP;

    const wanted = firstThreshold(options.threshold);
    const observer = new IntersectionObserver(
      (entries) => {
        const latest = entries.at(-1);

        if (!latest) return;

        const covered = latest.isIntersecting
          ? coveredFraction(this.#range.getBoundingClientRect(), latest.intersectionRect)
          : 0;

        onChange(wanted === 0 ? covered > 0 : covered >= wanted);
      },
      { root: options.root, rootMargin: options.rootMargin, threshold: TRANSIT_THRESHOLDS },
    );

    observer.observe(host);

    return () => observer.disconnect();
  }

  release(): void {
    if (this.#anchor) restorePosition(this.#anchor, this.#positioned);
  }
}

function toLiveRange(subject: Range | StaticRange): Range {
  if (subject instanceof Range) return subject;

  const range = new Range();

  try {
    range.setStart(subject.startContainer, subject.startOffset);
    range.setEnd(subject.endContainer, subject.endOffset);
  } catch {
    /* detached boundary nodes leave the range collapsed on the document */
  }

  return range;
}

/** Picks the target implementation for what `annotate` was handed. */
export function resolveTarget(subject: AnnotationSubject): AnnotationTarget {
  if (subject instanceof Selection) {
    return new RangeTarget(subject.rangeCount ? subject.getRangeAt(0).cloneRange() : new Range());
  }

  if ('startContainer' in subject) return new RangeTarget(toLiveRange(subject));

  return new ElementTarget(subject);
}
