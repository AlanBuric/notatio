import { randomSeed } from 'roughjs/bin/math';
import {
  DEFAULT_ANIMATION_DURATION,
  DEFAULT_ANIMATION_EASING,
  DEFAULT_DELAY,
  DEFAULT_MULTILINE,
  PATH_LENGTH_PROPERTY,
  REVERSE_KEYFRAME_NAME,
  SVG_NS,
} from '@/constants.js';
import { ensureKeyframes } from '@/keyframes.js';
import { resolveAnimation } from '@/animation.js';
import { isReversedFlow, readWritingMode } from '@/frame.js';
import { renderAnnotation } from '@/render/index.js';
import type {
  AnnotationOptions,
  Rectangle,
  ResolvedAnnotationConfig,
  RoughAnnotation,
  RoughAnnotationConfig,
  RoughAnnotationGroup,
  RoughAnnotationType,
  VisibilityOptions,
  WritingMode,
} from '@/types.js';
import {
  DEFERRED_OPTIONS,
  REDRAWN_OPTIONS,
  annotationClassName,
  isSameRect,
  resolveVisibility,
  settled,
  toSvgRect,
  type AnnotationState,
} from './utils.js';

interface Measurement {
  rects: Rectangle[];
  mode: WritingMode;
  isReversedFlow: boolean;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

class RoughAnnotationImpl implements RoughAnnotation {
  static #dirtyAnnotations = new Set<RoughAnnotationImpl>();
  static #flushScheduled = false;
  declare seed: number;

  #state: AnnotationState = 'unattached';
  #config: ResolvedAnnotationConfig;
  #element: HTMLElement;
  #svg?: SVGSVGElement;
  #lastSizes: Rectangle[] = [];
  #resizeObserver?: ResizeObserver;
  #visibility?: VisibilityOptions;
  #visibilityObserver?: IntersectionObserver;
  #refreshQueued = false;
  #animationDelay = 0;
  #drawing = 0;

  constructor(element: HTMLElement, config: RoughAnnotationConfig) {
    const { showOnVisible, ...cloneable } = config;
    const cloned: AnnotationOptions & { type: RoughAnnotationType } = structuredClone(cloneable);

    this.#element = element;
    this.#config = { ...cloned, seed: cloned.seed ?? randomSeed() };
    this.#visibility = resolveVisibility(showOnVisible);
    this.#attach();
  }

  static setGroupDelay(annotation: RoughAnnotation, delay: number): void {
    (annotation as RoughAnnotationImpl).#animationDelay = delay;
  }

  static {
    const define = (key: keyof AnnotationOptions, redraw: boolean) =>
      Object.defineProperty(this.prototype, key, {
        configurable: true,
        get(this: RoughAnnotationImpl) {
          return this.#config[key];
        },
        set(this: RoughAnnotationImpl, value: never) {
          if (this.#config[key] !== value) {
            this.#config[key] = value;

            if (redraw) this.#refresh();
          }
        },
      });

    REDRAWN_OPTIONS.forEach((key) => define(key, true));
    DEFERRED_OPTIONS.forEach((key) => define(key, false));
  }

  get svg(): SVGSVGElement | undefined {
    return this.#svg;
  }

  get class() {
    return this.#config.class;
  }

  set class(value) {
    if (this.#config.class === value) return;

    this.#config.class = value;
    this.#svg?.setAttribute('class', annotationClassName(value));
  }

  get zIndex() {
    return this.#config.zIndex;
  }

  set zIndex(value) {
    if (this.#config.zIndex === value) return;

    this.#config.zIndex = value;

    if (this.#svg) this.#svg.style.zIndex = value === undefined ? '' : `${value}`;
  }

  get observeResize() {
    return this.#config.observeResize;
  }

  set observeResize(value) {
    if (this.#config.observeResize === value) return;

    this.#config.observeResize = value;

    if (value === false) this.#detachListeners();
    else this.#attachListeners();
  }

  isShowing(): boolean {
    return this.#state !== 'not-showing';
  }

  show(): Promise<void> {
    if (this.#state === 'unattached' || !this.#svg) return Promise.resolve();

    const reshowing = this.#state === 'showing';

    this.#clear();
    this.#render(reshowing);

    return settled(this.#svg);
  }

  hide(): Promise<void> {
    if (this.#state === 'showing' && this.#shouldAnimateHide()) return this.#animateHide();

    this.#clear();

    return Promise.resolve();
  }

  pause(): void {
    this.#svg?.getAnimations({ subtree: true }).forEach((animation) => animation.pause());
  }

  resume(): void {
    this.#svg?.getAnimations({ subtree: true }).forEach((animation) => animation.play());
  }

  remove(): void {
    this.#clear();
    this.#svg?.remove();
    this.#svg = undefined;
    this.#state = 'unattached';
    this.#detachListeners();
    this.#disconnectVisibility();
  }

  #detachListeners(): void {
    window.removeEventListener('resize', this.#resizeListener);
    this.#resizeObserver?.unobserve(this.#element);
  }

  #clear(): void {
    this.#drawing++;
    this.#svg?.replaceChildren();
    this.#state = 'not-showing';
  }

  #shouldAnimateHide(): boolean {
    return resolveAnimation(this.#config.animate).onHide;
  }

  async #animateHide(): Promise<void> {
    const svg = this.#svg;
    const paths = [...(svg?.querySelectorAll('path') ?? [])];

    if (!svg || !paths.length) {
      this.#clear();
      return;
    }

    const duration = this.#config.animationDuration ?? DEFAULT_ANIMATION_DURATION;
    const easing =
      resolveAnimation(this.#config.animate).hideEasing ??
      this.#config.animationEasing ??
      DEFAULT_ANIMATION_EASING;
    const lengths = paths.map((path) => {
      path.style.animation = 'none';

      return path.getTotalLength();
    });
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    const drawing = ++this.#drawing;

    this.#state = 'not-showing';

    /* `animation: none` only takes effect on the next frame, so restarting the
       animation before then would be ignored. */
    await nextFrame();

    if (this.#drawing !== drawing) return;

    paths.reduceRight((delay, path, index) => {
      const length = lengths[index];
      const segment = totalLength ? duration * (length / totalLength) : 0;
      const { style } = path;

      style.strokeDashoffset = '0';
      style.strokeDasharray = `${length}`;
      style.setProperty(PATH_LENGTH_PROPERTY, `${length}`);
      style.animation = `${REVERSE_KEYFRAME_NAME} ${segment}ms ${easing} ${delay}ms forwards`;

      return delay + segment;
    }, this.#startDelay());

    await settled(svg);

    if (this.#drawing === drawing) this.#clear();
  }

  #startDelay(): number {
    return this.#animationDelay + (this.#config.delay ?? DEFAULT_DELAY);
  }

  #attach(): void {
    if (this.#state !== 'unattached' || !this.#element.parentElement) return;

    ensureKeyframes();

    const svg = document.createElementNS(SVG_NS, 'svg');

    svg.setAttribute('class', annotationClassName(this.#config.class));
    svg.setAttribute('aria-hidden', 'true');
    Object.assign(svg.style, {
      position: 'absolute',
      overflow: 'visible',
      pointerEvents: 'none',
      width: '100px',
      height: '100px',
    });

    if (this.#config.zIndex !== undefined) svg.style.zIndex = `${this.#config.zIndex}`;

    const behindElement = this.#config.type === 'highlight';

    this.#element.insertAdjacentElement(behindElement ? 'beforebegin' : 'afterend', svg);
    this.#svg = svg;
    this.#state = 'not-showing';

    if (behindElement && window.getComputedStyle(this.#element).position === 'static') {
      this.#element.style.position = 'relative';
    }

    this.#attachListeners();
    this.#observeVisibility();
  }

  #observeVisibility(): void {
    if (!this.#visibility) return;

    const { repeat, ...init } = this.#visibility;

    this.#visibilityObserver = new IntersectionObserver((entries) => {
      const latest = entries.at(-1);

      if (!latest) return;

      if (latest.isIntersecting) {
        this.show();

        if (!repeat) this.#disconnectVisibility();
      } else if (repeat && this.isShowing()) {
        this.hide();
      }
    }, init);

    this.#visibilityObserver.observe(this.#element);
  }

  #disconnectVisibility(): void {
    this.#visibilityObserver?.disconnect();
    this.#visibilityObserver = undefined;
  }

  #resizeListener = () => RoughAnnotationImpl.#markDirty(this);

  /** Defers redraws to one batch per frame so reads and writes do not interleave. */
  static #markDirty(annotation: RoughAnnotationImpl): void {
    this.#dirtyAnnotations.add(annotation);

    if (this.#flushScheduled) return;

    this.#flushScheduled = true;

    requestAnimationFrame(() => {
      this.#flushScheduled = false;

      const batch = [...this.#dirtyAnnotations];

      this.#dirtyAnnotations.clear();
      this.flush(batch);
    });
  }

  static flush(annotations: RoughAnnotationImpl[]): void {
    const stale: { annotation: RoughAnnotationImpl; measurement: Measurement }[] = [];

    annotations.forEach((annotation) => {
      if (annotation.#state !== 'showing') return;

      const measurement = annotation.#measure();

      if (annotation.#rectsDiffer(measurement.rects)) stale.push({ annotation, measurement });
    });

    stale.forEach(({ annotation, measurement }) => annotation.#redraw(measurement));
  }

  #redraw(measurement: Measurement): void {
    this.#clear();
    this.#render(true, measurement);
  }

  #attachListeners(): void {
    this.#detachListeners();

    if (this.#config.observeResize === false) return;

    window.addEventListener('resize', this.#resizeListener, { passive: true });

    this.#resizeObserver ??= new ResizeObserver(this.#resizeListener);
    this.#resizeObserver.observe(this.#element);
  }

  #rectsDiffer(rects: Rectangle[]): boolean {
    if (!this.#lastSizes.length) return false;

    if (rects.length !== this.#lastSizes.length) return true;

    return rects.some((rect, index) => !isSameRect(rect, this.#lastSizes[index]));
  }

  /** Coalesces several property changes in the same task into one redraw. */
  #refresh(): void {
    if (!this.isShowing() || this.#refreshQueued) return;

    this.#refreshQueued = true;

    queueMicrotask(() => {
      this.#refreshQueued = false;

      if (this.isShowing()) this.show();
    });
  }

  #render(ensureNoAnimation: boolean, measured?: Measurement): void {
    const svg = this.#svg;

    if (!svg) return;

    const config = ensureNoAnimation ? { ...this.#config, animate: false } : this.#config;
    const { rects, mode, isReversedFlow: reversedFlow } = measured ?? this.#measure();
    const runLength = ({ width, height }: Rectangle) => (mode === 'horizontal-tb' ? width : height);
    const total = rects.reduce((sum, rect) => sum + runLength(rect), 0);
    const totalDuration = config.animationDuration ?? DEFAULT_ANIMATION_DURATION;

    let delay = this.#startDelay();

    rects.forEach((rect) => {
      const duration = total ? totalDuration * (runLength(rect) / total) : 0;

      renderAnnotation(svg, rect, mode, config, delay, duration, reversedFlow);
      delay += duration;
    });

    this.#lastSizes = rects;
    this.#state = 'showing';
  }

  #measure(): Measurement {
    const svg = this.#svg;

    if (!svg) return { rects: [], mode: 'horizontal-tb', isReversedFlow: false };

    const bounds =
      (this.#config.multiline ?? DEFAULT_MULTILINE)
        ? [...this.#element.getClientRects()]
        : [this.#element.getBoundingClientRect()];
    const style = window.getComputedStyle(this.#element);
    const mode = readWritingMode(style);

    return {
      rects: bounds.map((bound) => toSvgRect(svg, bound)),
      mode,
      isReversedFlow: isReversedFlow(style, mode),
    };
  }
}

export function annotate(element: HTMLElement, config: RoughAnnotationConfig): RoughAnnotation {
  return new RoughAnnotationImpl(element, config);
}

async function runAll(
  annotations: readonly RoughAnnotation[],
  run: (annotation: RoughAnnotation) => Promise<void>,
) {
  await Promise.all(annotations.map(run));
}

export function annotationGroup(annotations: RoughAnnotation[]): RoughAnnotationGroup {
  let delay = 0;

  annotations.forEach((annotation) => {
    RoughAnnotationImpl.setGroupDelay(annotation, delay);
    delay += annotation.animationDuration ?? DEFAULT_ANIMATION_DURATION;
  });

  const group = [...annotations];

  return {
    annotations: group,
    show: () => runAll(group, (annotation) => annotation.show()),
    hide: () => runAll(group, (annotation) => annotation.hide()),
    remove: () => group.forEach((annotation) => annotation.remove()),
  };
}
