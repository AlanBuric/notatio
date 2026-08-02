import type { RoughAnnotation } from '../../src/model.js';

const SVG_SELECTOR = 'svg.rough-annotation';

/**
 * Mounts a container with a deterministic size so rect maths is stable, and
 * registers it for teardown. Returns the container.
 */
export function mountContainer(): HTMLDivElement {
  const container = document.createElement('div');

  container.style.cssText = 'position:absolute;top:0;left:0;width:600px;font:16px/1.5 monospace;';

  document.body.appendChild(container);
  containers.push(container);

  return container;
}

const containers: HTMLElement[] = [];

export function cleanup(): void {
  containers.splice(0).forEach((container) => container.remove());
  document.querySelectorAll(SVG_SELECTOR).forEach((svg) => svg.remove());
}

/** Mounts a block element containing `text` and returns it. */
export function mountElement(text = 'annotate me', tag = 'div'): HTMLElement {
  const container = mountContainer();
  const element = document.createElement(tag);

  element.textContent = text;
  container.appendChild(element);

  return element;
}

/** The annotation SVG associated with an element, if one was attached. */
export function svgFor(element: HTMLElement): SVGSVGElement | null {
  const next = element.nextElementSibling;

  if (next?.matches(SVG_SELECTOR)) return next as SVGSVGElement;

  const previous = element.previousElementSibling;

  if (previous?.matches(SVG_SELECTOR)) return previous as SVGSVGElement;

  return null;
}

/** The rendered <path> elements for an annotation. */
export function pathsFor(element: HTMLElement): SVGPathElement[] {
  return [...(svgFor(element)?.querySelectorAll('path') ?? [])];
}

/** Resolves once the annotation's CSS animations have been applied. */
export async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Waits for the microtask queue to drain, which is when `refresh()` runs. */
export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export function isShowing(annotation: RoughAnnotation): boolean {
  return annotation.isShowing();
}
