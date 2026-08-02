import { randomSeed } from 'roughjs/bin/math';
import {
  ANNOTATION_CLASS,
  DEFAULT_ANIMATION_DURATION,
  RESIZE_DEBOUNCE_MS,
  SVG_NS,
} from './constants.js';
import { ensureKeyframes } from './keyframes.js';
import { renderAnnotation } from './render.js';
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

/** Element bounds expressed in the annotation SVG's own coordinate space. */
function toSvgRect(svg: SVGSVGElement, bounds: DOMRect): Rect {
  const origin = svg.getBoundingClientRect();

  return {
    x: bounds.x - origin.x,
    y: bounds.y - origin.y,
    w: bounds.width,
    h: bounds.height,
  };
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
    switch (this.#state) {
      case 'unattached':
        break;
      case 'showing':
        this.hide();
        if (this.#svg) this.#render(this.#svg, true);
        break;
      case 'not-showing':
        this.#attach();
        if (this.#svg) this.#render(this.#svg, false);
        break;
    }
  }

  hide(): void {
    this.#svg?.replaceChildren();
    this.#state = 'not-showing';
  }

  remove(): void {
    this.#svg?.remove();
    this.#svg = undefined;
    this.#state = 'unattached';
    this.#detachListeners();
  }

  #attach(): void {
    if (this.#state !== 'unattached' || !this.#element.parentElement) return;

    ensureKeyframes();

    const svg = document.createElementNS(SVG_NS, 'svg');

    svg.setAttribute('class', ANNOTATION_CLASS);
    Object.assign(svg.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      overflow: 'visible',
      pointerEvents: 'none',
      width: '100px',
      height: '100px',
    });

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
    this.#detachListeners();
    window.addEventListener('resize', this.#resizeListener, { passive: true });

    this.#resizeObserver ??= new ResizeObserver(this.#resizeListener);
    this.#resizeObserver.observe(this.#element);
  }

  #detachListeners(): void {
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
