export type RoughAnnotationType =
  'underline' | 'box' | 'circle' | 'highlight' | 'strike-through' | 'crossed-off' | 'bracket';

export type BracketType = 'left' | 'right' | 'top' | 'bottom';

/** `[top, right, bottom, left]`, following the CSS shorthand order. */
export type FullPadding = [number, number, number, number];

export type RoughPadding = number | [number, number] | FullPadding;

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Options every annotation type reads. */
export interface CommonAnnotationOptions {
  /** Defaults to `true`. */
  animate?: boolean;
  /** Milliseconds. Defaults to 800. */
  animationDuration?: number;
  /** Play the drawing animation in reverse on `hide()`. Defaults to `false`. */
  animateOnHide?: boolean;
  /** Defaults to `currentColor`. */
  color?: string;
  /** Defaults to 5px on every side. Ignored by types that fill the element box. */
  padding?: RoughPadding;
  /** Annotates each wrapped line of inline text separately. */
  multiline?: boolean;
  /** `z-index` of the annotation SVG. Unset by default. */
  zIndex?: number;
  /** Applied to the element's `color` while the annotation is showing. */
  textColor?: string;
  /** Redraw on element and window resize. Defaults to `true`. */
  observeResize?: boolean;
}

/** Marks options a given type does not read, so passing one is a type error. */
type Unsupported<Keys extends string> = Partial<Record<Keys, never>>;

/** Number of strokes drawn. Defaults to 2. */
interface Iterated {
  iterations?: number;
}

/** Defaults to 2. */
interface Stroked {
  strokeWidth?: number;
}

/** Draws the first stroke right to left. */
interface Directional {
  rtl?: boolean;
}

type StrokeAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Unsupported<'brackets'> & {
    type: 'underline' | 'strike-through' | 'crossed-off';
  };

type ShapeAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Unsupported<'brackets' | 'rtl'> & {
    type: 'box' | 'circle';
  };

/** `strokeWidth` is derived from the element height, so it cannot be set. */
type HighlightAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Directional &
  Unsupported<'brackets' | 'strokeWidth'> & {
    type: 'highlight';
  };

/** Draws one bracket per side, so `iterations` does not apply. */
type BracketAnnotationConfig = CommonAnnotationOptions &
  Stroked &
  Unsupported<'iterations' | 'rtl'> & {
    type: 'bracket';
    /** Sides to bracket. Defaults to `right`. */
    brackets?: BracketType | BracketType[];
  };

export type RoughAnnotationConfig =
  | StrokeAnnotationConfig
  | ShapeAnnotationConfig
  | HighlightAnnotationConfig
  | BracketAnnotationConfig;

/**
 * The config options as plain optional properties. The annotation object
 * exposes them as settable regardless of type, since a value the type ignores
 * is harmless once the annotation exists.
 */
export interface AnnotationOptions extends CommonAnnotationOptions, Iterated, Stroked, Directional {
  brackets?: BracketType | BracketType[];
}

/**
 * A single annotation. Changing `color`, `strokeWidth` or `padding` redraws a
 * visible annotation.
 */
export interface RoughAnnotation extends AnnotationOptions {
  isShowing(): boolean;
  /** Resolves once the drawing animation has finished, or immediately if there is none. */
  show(): Promise<void>;
  /** Resolves once the annotation is gone, after the reverse animation if one runs. */
  hide(): Promise<void>;
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
  /** Resolves once every annotation in the group has finished drawing. */
  show(): Promise<void>;
  /** Resolves once every annotation in the group is gone. */
  hide(): Promise<void>;
}

/** @internal Flat shape used inside the library, where the discriminant is settled. */
export type ResolvedAnnotationConfig = AnnotationOptions & { type: RoughAnnotationType };
