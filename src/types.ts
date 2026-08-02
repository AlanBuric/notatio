export type RoughAnnotationType =
  'underline' | 'box' | 'circle' | 'highlight' | 'strike-through' | 'crossed-off' | 'bracket';

export type BracketType = 'left' | 'right' | 'top' | 'bottom';

/** `[top, right, bottom, left]`, following the CSS shorthand order. */
export type FullPadding = [number, number, number, number];

export type RoughPadding = number | [number, number] | FullPadding;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoughAnnotationConfigBase {
  /** Defaults to `true`. */
  animate?: boolean;
  /** Milliseconds. Defaults to 800. */
  animationDuration?: number;
  /** Play the drawing animation in reverse on `hide()`. Defaults to `false`. */
  animateOnHide?: boolean;
  /** Defaults to `currentColor`. */
  color?: string;
  /** Defaults to 2. */
  strokeWidth?: number;
  /** Defaults to 5px on every side. */
  padding?: RoughPadding;
  /** Number of strokes drawn. Defaults to 2, and is ignored by `bracket`. */
  iterations?: number;
  /** Sides to bracket. Defaults to `right`. */
  brackets?: BracketType | BracketType[];
  /** `z-index` of the annotation SVG. Unset by default. */
  zIndex?: number;
  /** Applied to the element's `color` while the annotation is showing. */
  textColor?: string;
  /** Redraw on element and window resize. Defaults to `true`. */
  observeResize?: boolean;
}

export interface RoughAnnotationConfig extends RoughAnnotationConfigBase {
  type: RoughAnnotationType;
  /** Annotates each wrapped line of inline text separately. */
  multiline?: boolean;
  /** Draws the first stroke right to left. */
  rtl?: boolean;
}

/**
 * A single annotation. Every property of the config is also settable here;
 * changing `color`, `strokeWidth` or `padding` redraws a visible annotation.
 */
export interface RoughAnnotation extends RoughAnnotationConfigBase {
  isShowing(): boolean;
  show(): void;
  hide(): void;
  /** Unlinks the annotation from its element. */
  remove(): void;
  /**
   * Stops redrawing on resize, for callers driving their own redraw. The
   * annotation stays attached and drawn. `show()` reattaches the listeners.
   */
  detachListeners(): void;
}

/** Annotations animated in sequence. */
export interface RoughAnnotationGroup {
  show(): void;
  hide(): void;
}
