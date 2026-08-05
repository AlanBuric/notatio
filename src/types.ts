export type RoughAnnotationType =
  | 'underline'
  | 'box'
  | 'circle'
  | 'highlight'
  | 'strike-through'
  | 'crossed-off'
  | 'bracket'
  | 'wavy';

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

export interface AnimationOptions {
  /** Animate the drawing on `show()`. Defaults to `true`. */
  onShow?: boolean;
  /** Retreat the strokes on `hide()`. Defaults to `false`. */
  onHide?: boolean;
}

/** `true` animates the drawing only. The object form controls each direction. */
export type AnimateOption = boolean | AnimationOptions;

export interface VisibilityOptions extends IntersectionObserverInit {
  /**
   * Hides the annotation again when the element leaves, and redraws it when it
   * comes back. Defaults to `false`, which draws once and stops observing.
   */
  repeat?: boolean;
}

export type ShowOnVisibleOption = boolean | VisibilityOptions;

/** Options every annotation type reads. */
export interface CommonAnnotationOptions {
  /** Defaults to `true`, which animates the drawing but not the removal. */
  animate?: AnimateOption;
  /** Milliseconds. Defaults to 800. */
  animationDuration?: number;
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
  /**
   * Calls `show()` the first time the element scrolls into view. Unset by
   * default, leaving the caller to decide when to draw.
   */
  showOnVisible?: ShowOnVisibleOption;
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

/** Shape of the wave, for the types drawn as one. */
interface Waved {
  /** Peak distance from the baseline, in pixels. Defaults to 3. */
  amplitude?: number;
  /**
   * Complete waves per 100px of width, so the wavelength stays the same under
   * short and long text. Defaults to 5. Rounded to a whole number of waves
   * across the element, so the stroke starts and ends on the baseline.
   */
  frequency?: number;
}

/** Options only the wave types read. */
type UnwavedKeys = 'amplitude' | 'frequency';

type StrokeAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Unsupported<'brackets' | UnwavedKeys> & {
    type: 'underline' | 'strike-through' | 'crossed-off';
  };

type ShapeAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Unsupported<'brackets' | 'rtl' | UnwavedKeys> & {
    type: 'box' | 'circle';
  };

/** `strokeWidth` is derived from the element height, so it cannot be set. */
type HighlightAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Directional &
  Unsupported<'brackets' | 'strokeWidth' | UnwavedKeys> & {
    type: 'highlight';
  };

/** Draws one bracket per side, so `iterations` does not apply. */
type BracketAnnotationConfig = CommonAnnotationOptions &
  Stroked &
  Unsupported<'iterations' | 'rtl' | UnwavedKeys> & {
    type: 'bracket';
    /** Sides to bracket. Defaults to `right`. */
    brackets?: BracketType | BracketType[];
  };

/** A wavy underline, drawn like `underline` but along a sine wave. */
type WavyAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Waved &
  Unsupported<'brackets'> & {
    type: 'wavy';
  };

export type RoughAnnotationConfig =
  | StrokeAnnotationConfig
  | ShapeAnnotationConfig
  | HighlightAnnotationConfig
  | BracketAnnotationConfig
  | WavyAnnotationConfig;

/**
 * The config options as plain optional properties. The annotation object
 * exposes them as settable regardless of type, since a value the type ignores
 * is harmless once the annotation exists.
 */
export interface AnnotationOptions
  extends Omit<CommonAnnotationOptions, 'showOnVisible'>, Iterated, Stroked, Directional, Waved {
  brackets?: BracketType | BracketType[];
}

/**
 * A single annotation. Setting any option that changes the drawing redraws a
 * visible annotation; `animate` and `animationDuration` apply from the next
 * `show()` or `hide()`.
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
