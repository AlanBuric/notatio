import type { RoughAnnotation } from '@/types.js';

const SVG_SELECTOR = 'svg.notatio-annotation';

/**
 * roughjs offsets every stroke by a random amount, so any assertion comparing a
 * drawn size against a layout size needs headroom. Keep fixtures large enough
 * that a real error stays well clear of this.
 */
export const STROKE_JITTER = 12;

/** Width of an annotation's drawn strokes, in SVG user units. */
export function getAnnotationWidth(element: HTMLElement): number {
  const boxes = getPathsFor(element).map((path) => path.getBBox());

  if (!boxes.length) return 0;

  return Math.max(...boxes.map((box) => box.x + box.width)) - Math.min(...boxes.map(({ x }) => x));
}

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
export function getSvgFor(element: HTMLElement): SVGSVGElement | null {
  const next = element.nextElementSibling;

  if (next?.matches(SVG_SELECTOR)) return next as SVGSVGElement;

  const previous = element.previousElementSibling;

  if (previous?.matches(SVG_SELECTOR)) return previous as SVGSVGElement;

  return null;
}

/**
 * The annotated element's box in the coordinate space its strokes are drawn in,
 * so a stroke's `getBBox()` can be compared against where the text actually is.
 */
export function getElementBox(element: HTMLElement): DOMRect {
  const svg = getSvgFor(element)!;
  const inverse = svg.getScreenCTM()!.inverse();
  const bounds = element.getBoundingClientRect();
  const start = new DOMPoint(bounds.x, bounds.y).matrixTransform(inverse);
  const end = new DOMPoint(bounds.right, bounds.bottom).matrixTransform(inverse);

  return new DOMRect(start.x, start.y, end.x - start.x, end.y - start.y);
}

/** The rendered <path> elements for an annotation. */
export function getPathsFor(element: HTMLElement): SVGPathElement[] {
  return [...(getSvgFor(element)?.querySelectorAll('path') ?? [])];
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
