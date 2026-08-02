import { randomSeed } from 'roughjs/bin/math';
import {
  ANNOTATION_CLASS,
  DEFAULT_ANIMATION_DURATION,
  PATH_LENGTH_PROPERTY,
  REVERSE_KEYFRAME_NAME,
  SVG_NS,
} from './constants.js';
import { ensureKeyframes } from './keyframes.js';
import { prefersReducedMotion, renderAnnotation } from './render.js';
import type {
  Rectangle,
  ResolvedAnnotationConfig,
  RoughAnnotation,
  RoughAnnotationConfig,
  RoughAnnotationGroup,
} from './types.js';

type AnnotationState = 'unattached' | 'not-showing' | 'showing';

const dirtyAnnotations = new Set<RoughAnnotationImpl>();
let flushScheduled = false;

/** Defers redraws to one batch per frame so reads and writes do not interleave. */
function markDirty(annotation: RoughAnnotationImpl): void {
  dirtyAnnotations.add(annotation);

  if (flushScheduled) return;

  flushScheduled = true;

  requestAnimationFrame(() => {
    flushScheduled = false;

    const batch = [...dirtyAnnotations];

    dirtyAnnotations.clear();
    RoughAnnotationImpl.flush(batch);
  });
}

/** Cancelled animations reject, and a redraw cancels routinely, so treat that as done. */
function settled(svg: SVGSVGElement): Promise<void> {
  const animations = svg.getAnimations({ subtree: true });

  if (!animations.length) return Promise.resolve();

  return Promise.all(animations.map(({ finished }) => finished.catch(() => undefined))).then(
    () => undefined,
  );
}

function sameRounded(a: number, b: number): boolean {
  return Math.round(a) === Math.round(b);
}

function isSameRect(a: Rectangle, b: Rectangle): boolean {
  return (
    sameRounded(a.x, b.x) &&
    sameRounded(a.y, b.y) &&
    sameRounded(a.width, b.width) &&
    sameRounded(a.height, b.height)
  );
}

/**
 * Element bounds in the SVG's user space. Going through the screen CTM rather
 * than subtracting rects keeps annotations correct under a scaled ancestor.
 */
function toSvgRect(svg: SVGSVGElement, bounds: DOMRect): Rectangle {
  const ctm = svg.getScreenCTM();

  if (!ctm) {
    const origin = svg.getBoundingClientRect();

    return {
      x: bounds.x - origin.x,
      y: bounds.y - origin.y,
      width: bounds.width,
      height: bounds.height,
    };
  }

  const inverse = ctm.inverse();
  const start = new DOMPoint(bounds.x, bounds.y).matrixTransform(inverse);
  const end = new DOMPoint(bounds.right, bounds.bottom).matrixTransform(inverse);

  return { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y };
}

class RoughAnnotationImpl implements RoughAnnotation {
  #state: AnnotationState = 'unattached';
  #config: ResolvedAnnotationConfig;
  #element: HTMLElement;
  #seed = randomSeed();
  #svg?: SVGSVGElement;
  #lastSizes: Rectangle[] = [];
  #resizeObserver?: ResizeObserver;
  #pendingRefresh?: Promise<void>;
  #animationDelay = 0;
  #previousTextColor?: string;
  #hideTimer?: number;
  #hideResolve?: () => void;

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

  show(): Promise<void> {
    if (this.#state === 'unattached' || !this.#svg) return Promise.resolve();

    /* Re-showing skips the animation so a visible annotation does not flicker. */
    const reshowing = this.#state === 'showing';

    this.#clear();
    this.#render(this.#svg, reshowing);

    return settled(this.#svg);
  }

  hide(): Promise<void> {
    if (this.#state === 'showing' && this.#shouldAnimateHide()) return this.#animateHide();

    this.#clear();

    return Promise.resolve();
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

    this.#hideResolve?.();
    this.#hideResolve = undefined;

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
   * Retreats each stroke in the reverse of the order it was drawn. Paths stay in
   * the DOM until the animation ends, but the state flips immediately.
   */
  #animateHide(): Promise<void> {
    const paths = [...(this.#svg?.querySelectorAll('path') ?? [])];

    if (!paths.length) {
      this.#clear();

      return Promise.resolve();
    }

    const duration = this.#config.animationDuration ?? DEFAULT_ANIMATION_DURATION;
    const lengths = paths.map((path) => {
      /* Frees stroke-dashoffset from the forwards-filled show animation. */
      path.style.animation = 'none';

      return path.getTotalLength();
    });
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);

    this.#state = 'not-showing';

    /* `animation: none` needs a frame to take effect before restarting. */
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

    /* Resolved by clear(), whether the timer fires or a redraw cancels it. */
    const finished = new Promise<void>((resolve) => {
      this.#hideResolve = resolve;
    });

    this.#hideTimer = window.setTimeout(() => this.#clear(), duration + this.#animationDelay);

    return finished;
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
      /* Left at its static position so it moves with the element in flow. */
      position: 'absolute',
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

  #resizeListener = () => markDirty(this);

  /** Measures the whole batch, then writes only what actually moved. */
  static flush(annotations: RoughAnnotationImpl[]): void {
    const stale: { annotation: RoughAnnotationImpl; rects: Rectangle[] }[] = [];

    annotations.forEach((annotation) => {
      if (annotation.#state !== 'showing') return;

      const rects = annotation.#rects();

      if (annotation.#rectsDiffer(rects)) stale.push({ annotation, rects });
    });

    stale.forEach(({ annotation, rects }) => annotation.#redraw(rects));
  }

  #redraw(rects: Rectangle[]): void {
    if (!this.#svg) return;

    this.#clear();
    this.#render(this.#svg, true, rects);
  }

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

  #rectsDiffer(rects: Rectangle[]): boolean {
    if (!this.#lastSizes.length) return false;

    if (rects.length !== this.#lastSizes.length) return true;

    return rects.some((rect, index) => !isSameRect(rect, this.#lastSizes[index]));
  }

  #refresh(): void {
    if (!this.isShowing() || this.#pendingRefresh) return;

    this.#pendingRefresh = Promise.resolve().then(() => {
      /* Not awaited: a later property change must not queue behind this redraw. */
      if (this.isShowing()) void this.show();

      this.#pendingRefresh = undefined;
    });
  }

  #render(svg: SVGSVGElement, ensureNoAnimation: boolean, measured?: Rectangle[]): void {
    const config = ensureNoAnimation ? { ...this.#config, animate: false } : this.#config;
    const rects = measured ?? this.#rects();
    const totalWidth = rects.reduce((sum, rect) => sum + rect.width, 0);
    const totalDuration = config.animationDuration ?? DEFAULT_ANIMATION_DURATION;
    let delay = 0;

    rects.forEach((rect) => {
      const duration = totalDuration * (rect.width / totalWidth);

      renderAnnotation(svg, rect, config, delay + this.#animationDelay, duration, this.#seed);
      delay += duration;
    });

    this.#applyTextColor();
    this.#lastSizes = rects;
    this.#state = 'showing';
  }

  #rects(): Rectangle[] {
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

function runAll(
  annotations: RoughAnnotation[],
  run: (annotation: RoughAnnotation) => Promise<void>,
): Promise<void> {
  return Promise.all(annotations.map(run)).then(() => undefined);
}

export function annotationGroup(annotations: RoughAnnotation[]): RoughAnnotationGroup {
  let delay = 0;

  annotations.forEach((annotation) => {
    RoughAnnotationImpl.setGroupDelay(annotation, delay);
    delay += annotation.animationDuration ?? DEFAULT_ANIMATION_DURATION;
  });

  const group = [...annotations];

  return {
    show: () => runAll(group, (annotation) => annotation.show()),
    hide: () => runAll(group, (annotation) => annotation.hide()),
  };
}
