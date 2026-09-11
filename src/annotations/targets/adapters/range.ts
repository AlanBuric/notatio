import type { TargetAdapter, TargetMeasurement } from '../adapter.js';
import { insertBeside, restorePosition } from './helpers.js';

const TRANSIT_THRESHOLDS = Array.from({ length: 101 }, (_, index) => index / 100);

function getElementAncestor(node: Node): HTMLElement | null {
  const element = node instanceof Element ? node : node.parentElement;

  return element instanceof HTMLElement ? element : null;
}

function getFirstThreshold(threshold: number | number[] | undefined): number {
  return (Array.isArray(threshold) ? threshold[0] : threshold) ?? 0;
}

function getCoveredFraction(box: DOMRect, within: DOMRectReadOnly): number {
  const area = box.width * box.height;

  if (!area) return 0;

  const width = Math.max(0, Math.min(box.right, within.right) - Math.max(box.left, within.left));
  const height = Math.max(0, Math.min(box.bottom, within.bottom) - Math.max(box.top, within.top));

  return (width * height) / area;
}

export class RangeTarget implements TargetAdapter {
  #range: Range;
  #anchor: HTMLElement | null;
  #positioned = false;

  constructor(range: Range) {
    this.#range = range;
    this.#anchor = getElementAncestor(range.commonAncestorContainer);
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

  observeReflow(onReflow: () => void): (() => void) | undefined {
    const host = this.#anchor;

    if (!host) return;

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
  ): (() => void) | undefined {
    const host = this.#anchor;

    if (!host) return;

    const wanted = getFirstThreshold(options.threshold);
    const observer = new IntersectionObserver(
      (entries) => {
        const latest = entries.at(-1);

        if (!latest) return;

        const covered = latest.isIntersecting
          ? getCoveredFraction(this.#range.getBoundingClientRect(), latest.intersectionRect)
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
