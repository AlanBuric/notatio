import { randomSeed } from 'roughjs/bin/math';
import {
  ANNOTATION_CLASS,
  DEFAULT_ANIMATION_DURATION,
  PATH_LENGTH_PROPERTY,
  RESIZE_DEBOUNCE_MS,
  REVERSE_KEYFRAME_NAME,
  SVG_NS,
} from './constants.js';
import { ensureKeyframes } from './keyframes.js';
import { prefersReducedMotion, renderAnnotation } from './render.js';
import type {
  Rect,
  RoughAnnotation,
  RoughAnnotationConfig,
  RoughAnnotationGroup,
} from './types.js';

type AnnotationState = 'unattached' | 'not-showing' | 'showing';

function isSameRect(a: Rect, b: Rect): boolean {
  const sameRounded = (x: number, y: number) => Math.round(x) === Math.round(y);

  return (
    sameRounded(a.x, b.x) && sameRounded(a.y, b.y) && sameRounded(a.w, b.w) && sameRounded(a.h, b.h)
  );
}

/**
 * Element bounds expressed in the annotation SVG's own coordinate space.
 *
 * getBoundingClientRect reports post-transform screen pixels, but path
 * coordinates are read in the SVG's local user space. Under a transformed
 * ancestor the two differ by that transform, so screen coordinates are mapped
 * through the inverse of the SVG's screen CTM rather than simply subtracted.
 */
function toSvgRect(svg: SVGSVGElement, bounds: DOMRect): Rect {
  const ctm = svg.getScreenCTM();

  if (!ctm) {
    const origin = svg.getBoundingClientRect();

    return { x: bounds.x - origin.x, y: bounds.y - origin.y, w: bounds.width, h: bounds.height };
  }

  const inverse = ctm.inverse();
  const start = new DOMPoint(bounds.x, bounds.y).matrixTransform(inverse);
  const end = new DOMPoint(bounds.right, bounds.bottom).matrixTransform(inverse);

  return { x: start.x, y: start.y, w: end.x - start.x, h: end.y - start.y };
}

class RoughAnnotationImpl implements RoughAnnotation {
  #state: AnnotationState = 'unattached';
  #config: RoughAnnotationConfig;
  #element: HTMLElement;
  #seed = randomSeed();
  #svg?: SVGSVGElement;
  #lastSizes: Rect[] = [];
  #resizing = false;
  #resizeObserver?: ResizeObserver;
  #pendingRefresh?: Promise<void>;
  #animationDelay = 0;
  #previousTextColor?: string;
  #hideTimer?: number;

  constructor(element: HTMLElement, config: RoughAnnotationConfig) {
    this.#element = element;
    this.#config = structuredClone(config);
    this.#attach();
  }

  /** Lets `annotationGroup` stagger annotations without exposing the field. */
  static setGroupDelay(annotation: RoughAnnotation, delay: number): void {
    (annotation as RoughAnnotationImpl).#animationDelay = delay;
  }

  get animate() {
    return this.#config.animate;
  }

  set animate(value) {
    this.#config.animate = value;
  }

  get animationDuration() {
    return this.#config.animationDuration;
  }

  set animationDuration(value) {
    this.#config.animationDuration = value;
  }

  get animateOnHide() {
    return this.#config.animateOnHide;
  }

  set animateOnHide(value) {
    this.#config.animateOnHide = value;
  }

  get iterations() {
    return this.#config.iterations;
  }

  set iterations(value) {
    this.#config.iterations = value;
  }

  get color() {
    return this.#config.color;
  }

  set color(value) {
    if (this.#config.color === value) return;

    this.#config.color = value;
    this.#refresh();
  }

  get strokeWidth() {
    return this.#config.strokeWidth;
  }

  set strokeWidth(value) {
    if (this.#config.strokeWidth === value) return;

    this.#config.strokeWidth = value;
    this.#refresh();
  }

  get padding() {
    return this.#config.padding;
  }

  set padding(value) {
    if (this.#config.padding === value) return;

    this.#config.padding = value;
    this.#refresh();
  }

  isShowing(): boolean {
    return this.#state !== 'not-showing';
  }

  show(): void {
    if (this.#state === 'unattached' || !this.#svg) return;

    /*
     * Re-showing renders without animation so a visible annotation does not
     * flicker. `attach()` used to be called here for the not-showing case, but
     * it returns immediately unless the state is unattached. See upstream #71.
     */
    const reshowing = this.#state === 'showing';

    this.#clear();
    this.#render(this.#svg, reshowing);
  }

  hide(): void {
    if (this.#state === 'showing' && this.#shouldAnimateHide()) {
      this.#animateHide();
      return;
    }

    this.#clear();
  }

  remove(): void {
    this.#clear();
    this.#svg?.remove();
    this.#svg = undefined;
    this.#state = 'unattached';
    this.detachListeners();
  }

  /** Drops the drawing immediately, cancelling any hide animation in flight. */
  #clear(): void {
    if (this.#hideTimer !== undefined) {
      clearTimeout(this.#hideTimer);
      this.#hideTimer = undefined;
    }

    this.#restoreTextColor();
    this.#svg?.replaceChildren();
    this.#state = 'not-showing';
  }

  #shouldAnimateHide(): boolean {
    return (
      (this.#config.animateOnHide ?? false) &&
      (this.#config.animate ?? true) &&
      !prefersReducedMotion()
    );
  }

  /**
   * Retreats each stroke back along itself, in the reverse of the order it was
   * drawn. The paths stay in the DOM until the animation ends, but the state
   * flips immediately, so `isShowing()` reflects the caller's intent.
   */
  #animateHide(): void {
    const paths = [...(this.#svg?.querySelectorAll('path') ?? [])];

    if (!paths.length) {
      this.#clear();
      return;
    }

    const duration = this.#config.animationDuration ?? DEFAULT_ANIMATION_DURATION;
    const lengths = paths.map((path) => {
      /* Clearing the forwards-filled show animation frees stroke-dashoffset. */
      path.style.animation = 'none';

      return path.getTotalLength();
    });
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);

    this.#state = 'not-showing';

    /* A frame is needed for `animation: none` to take effect before restarting. */
    requestAnimationFrame(() => {
      let delay = this.#animationDelay;

      paths
        .map((path, index) => ({ path, length: lengths[index] }))
        .reverse()
        .forEach(({ path, length }) => {
          const segment = totalLength ? duration * (length / totalLength) : 0;
          const { style } = path;

          style.strokeDashoffset = '0';
          style.strokeDasharray = `${length}`;
          style.setProperty(PATH_LENGTH_PROPERTY, `${length}`);
          style.animation = `${REVERSE_KEYFRAME_NAME} ${segment}ms ease-out ${delay}ms forwards`;

          delay += segment;
        });
    });

    this.#hideTimer = window.setTimeout(() => {
      this.#hideTimer = undefined;
      this.#clear();
    }, duration + this.#animationDelay);
  }

  #applyTextColor(): void {
    const { textColor } = this.#config;

    if (textColor === undefined) return;

    this.#previousTextColor ??= this.#element.style.color;
    this.#element.style.color = textColor;
  }

  #restoreTextColor(): void {
    if (this.#previousTextColor === undefined) return;

    this.#element.style.color = this.#previousTextColor;
    this.#previousTextColor = undefined;
  }

  #attach(): void {
    if (this.#state !== 'unattached' || !this.#element.parentElement) return;

    ensureKeyframes();

    const svg = document.createElementNS(SVG_NS, 'svg');

    svg.setAttribute('class', ANNOTATION_CLASS);
    /* Annotations are decorative, so keep them out of the accessibility tree. */
    svg.setAttribute('aria-hidden', 'true');
    Object.assign(svg.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      overflow: 'visible',
      pointerEvents: 'none',
      width: '100px',
      height: '100px',
    });

    if (this.#config.zIndex !== undefined) svg.style.zIndex = `${this.#config.zIndex}`;

    /* A highlight paints behind its element, everything else in front. */
    const prepend = this.#config.type === 'highlight';

    this.#element.insertAdjacentElement(prepend ? 'beforebegin' : 'afterend', svg);
    this.#svg = svg;
    this.#state = 'not-showing';

    if (prepend && window.getComputedStyle(this.#element).position === 'static') {
      this.#element.style.position = 'relative';
    }

    this.#attachListeners();
  }

  #resizeListener = () => {
    if (this.#resizing) return;

    this.#resizing = true;

    setTimeout(() => {
      this.#resizing = false;

      if (this.#state === 'showing' && this.#haveRectsChanged()) this.show();
    }, RESIZE_DEBOUNCE_MS);
  };

  #attachListeners(): void {
    this.detachListeners();

    if (this.#config.observeResize === false) return;

    window.addEventListener('resize', this.#resizeListener, { passive: true });

    this.#resizeObserver ??= new ResizeObserver(this.#resizeListener);
    this.#resizeObserver.observe(this.#element);
  }

  detachListeners(): void {
    window.removeEventListener('resize', this.#resizeListener);
    this.#resizeObserver?.unobserve(this.#element);
  }

  #haveRectsChanged(): boolean {
    if (!this.#lastSizes.length) return false;

    const rects = this.#rects();

    if (rects.length !== this.#lastSizes.length) return true;

    return rects.some((rect, index) => !isSameRect(rect, this.#lastSizes[index]));
  }

  #refresh(): void {
    if (!this.isShowing() || this.#pendingRefresh) return;

    this.#pendingRefresh = Promise.resolve().then(() => {
      if (this.isShowing()) this.show();

      this.#pendingRefresh = undefined;
    });
  }

  #render(svg: SVGSVGElement, ensureNoAnimation: boolean): void {
    const config = ensureNoAnimation ? { ...this.#config, animate: false } : this.#config;
    const rects = this.#rects();
    const totalWidth = rects.reduce((sum, rect) => sum + rect.w, 0);
    const totalDuration = config.animationDuration ?? DEFAULT_ANIMATION_DURATION;
    let delay = 0;

    rects.forEach((rect) => {
      const duration = totalDuration * (rect.w / totalWidth);

      renderAnnotation(svg, rect, config, delay + this.#animationDelay, duration, this.#seed);
      delay += duration;
    });

    this.#applyTextColor();
    this.#lastSizes = rects;
    this.#state = 'showing';
  }

  #rects(): Rect[] {
    const svg = this.#svg;

    if (!svg) return [];

    const bounds = this.#config.multiline
      ? [...this.#element.getClientRects()]
      : [this.#element.getBoundingClientRect()];

    return bounds.map((bound) => toSvgRect(svg, bound));
  }
}

export function annotate(element: HTMLElement, config: RoughAnnotationConfig): RoughAnnotation {
  return new RoughAnnotationImpl(element, config);
}

export function annotationGroup(annotations: RoughAnnotation[]): RoughAnnotationGroup {
  let delay = 0;

  annotations.forEach((annotation) => {
    RoughAnnotationImpl.setGroupDelay(annotation, delay);
    delay += annotation.animationDuration ?? DEFAULT_ANIMATION_DURATION;
  });

  const group = [...annotations];

  return {
    show: () => group.forEach((annotation) => annotation.show()),
    hide: () => group.forEach((annotation) => annotation.hide()),
  };
}

export type {
  BracketType,
  FullPadding,
  RoughAnnotation,
  RoughAnnotationConfig,
  RoughAnnotationConfigBase,
  RoughAnnotationGroup,
  RoughAnnotationType,
  RoughPadding,
} from './types.js';
