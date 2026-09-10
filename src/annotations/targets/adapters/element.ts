import type { TargetAdapter, TargetMeasurement } from '../adapter.js';
import { insertBeside, restorePosition } from './helpers.js';

export class ElementTarget implements TargetAdapter {
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
