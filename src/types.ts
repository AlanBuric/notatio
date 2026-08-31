export type RoughAnnotationType =
  | 'underline'
  | 'box'
  | 'circle'
  | 'highlight'
  | 'strike-through'
  | 'crossed-off'
  | 'bracket'
  | 'wavy'
  | 'zigzag';

export type BracketType = 'left' | 'right' | 'top' | 'bottom';

/**
 * Which side of the text a stroke sits on, named in the writing mode's block
 * axis. Under horizontal text `under` is below and `over` is above; under
 * `vertical-rl` they are the left and right sides instead.
 */
export type AnnotationPosition = 'under' | 'over' | 'both';

/** The three cases a computed `writing-mode` reduces to geometrically. */
export type WritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

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
  /** Overrides `animationEasing` for the retreat on `hide()`. */
  hideEasing?: string;
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

/**
 * The RoughJS parameters that reach the stroke renderers. RoughJS accepts more
 * than this, but the rest only affect fills, which annotations never draw.
 */
export interface RoughStrokeOptions {
  /**
   * How far strokes wander from a straight/geometric path. Defaults to 1.5,
   * or 3 for `highlight`. 0 draws exactly on the shape, with no wobble.
   */
  roughness?: number;
  /** Ceiling on a single point's random displacement. Defaults to 2. */
  maxRandomnessOffset?: number;
  /** How far a straight line bends on its way across. Defaults to 1. */
  bowing?: number;
  /** How closely an ellipse follows its ideal curve. Defaults to 0.95. */
  curveFitting?: number;
  /** Slack in the curve through a wave's points. Defaults to 0. */
  curveTightness?: number;
  /** Points sampled around an ellipse. Defaults to 9. */
  curveStepCount?: number;
  /** Pins path endpoints in place instead of jittering them. Defaults to `false`. */
  preserveVertices?: boolean;
  /**
   * Chooses the random variation. The same seed and geometry always draw the
   * same strokes. Assigned randomly when omitted, and readable afterwards from
   * the annotation, so a variation you like can be pinned.
   */
  seed?: number;
}

/** Options every annotation type reads. */
export interface CommonAnnotationOptions extends RoughStrokeOptions {
  /** Defaults to `true`, which animates the drawing but not the removal. */
  animate?: AnimateOption;
  /** Milliseconds. Defaults to 800. */
  animationDuration?: number;
  /** Any valid CSS `animation-timing-function` value. Defaults to `ease-out`. */
  animationEasing?: string;
  /** Milliseconds to wait before drawing, on top of any group delay. Defaults to 0. */
  delay?: number;
  /** Defaults to `currentColor`. */
  color?: string;
  /** Defaults to 5px on every side. Ignored by types that fill the element box. */
  padding?: RoughPadding;
  /** Annotates each wrapped line of inline text separately. */
  multiline?: boolean;
  /** Added to the annotation SVG alongside `notatio-annotation`. */
  class?: string;
  /** `z-index` of the annotation SVG. Unset by default. */
  zIndex?: number;
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

/** Draws the first stroke against the text flow, right to left in Latin text. */
interface Directional {
  reverse?: boolean;
}

/** Which side of the text the stroke runs along. Defaults to `under`. */
interface Positioned {
  position?: AnnotationPosition;
}

/** Shape of the wave, for the types drawn as one. */
interface Waved {
  /**
   * Peak distance from the baseline, in pixels. Defaults to 3. A negative value
   * mirrors the wave, starting it on the other side of the baseline.
   */
  amplitude?: number;
  /**
   * Complete waves per 100px of text, so the wavelength stays the same under
   * short and long text. Defaults to 5. Rounded to a whole number of waves
   * across the element, so the stroke starts and ends on the baseline.
   */
  frequency?: number;
}

/** Options only the wave types read. */
type UnwavedKeys = 'amplitude' | 'frequency';

type UnderlineAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Positioned &
  Unsupported<'brackets' | UnwavedKeys> & {
    type: 'underline';
  };

/** Both are drawn across the text itself, so there is no side to choose. */
type StrikeAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Unsupported<'brackets' | 'position' | UnwavedKeys> & {
    type: 'strike-through' | 'crossed-off';
  };

type ShapeAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Unsupported<'brackets' | 'reverse' | 'position' | UnwavedKeys> & {
    type: 'box' | 'circle';
  };

/** `strokeWidth` is derived from the element size, so it cannot be set. */
type HighlightAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Directional &
  Unsupported<'brackets' | 'strokeWidth' | 'position' | UnwavedKeys> & {
    type: 'highlight';
  };

/** Draws one bracket per side, so `iterations` does not apply. */
type BracketAnnotationConfig = CommonAnnotationOptions &
  Stroked &
  Unsupported<'iterations' | 'reverse' | 'position' | UnwavedKeys> & {
    type: 'bracket';
    /** Sides to bracket. Defaults to `right`. */
    brackets?: BracketType | BracketType[];
  };

/** Drawn like an underline, but along a wave: `wavy` curved, `zigzag` angular. */
type WaveAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Positioned &
  Waved &
  Unsupported<'brackets'> & {
    type: 'wavy' | 'zigzag';
  };

export type RoughAnnotationConfig =
  | UnderlineAnnotationConfig
  | StrikeAnnotationConfig
  | ShapeAnnotationConfig
  | HighlightAnnotationConfig
  | BracketAnnotationConfig
  | WaveAnnotationConfig;

/**
 * The config options as plain optional properties. The annotation object
 * exposes them as settable regardless of type, since a value the type ignores
 * is harmless once the annotation exists.
 */
export interface AnnotationOptions
  extends
    Omit<CommonAnnotationOptions, 'showOnVisible'>,
    Iterated,
    Stroked,
    Directional,
    Positioned,
    Waved {
  brackets?: BracketType | BracketType[];
}

/**
 * A single annotation. Setting any option that changes the drawing redraws a
 * visible annotation; the animation options apply from the next `show()` or
 * `hide()`.
 */
export interface RoughAnnotation extends AnnotationOptions {
  /** Always a number once the annotation exists, even when the config omitted it. */
  seed: number;
  /**
   * The annotation's SVG, or `undefined` once removed. Geometry is measured
   * against this element, so a transform set on it is undone by the next
   * redraw; transform `layer` instead.
   */
  readonly svg: SVGSVGElement | undefined;
  /** The group the strokes are drawn into. Safe to transform. */
  readonly layer: SVGGElement | undefined;
  isShowing(): boolean;
  /** Resolves once the drawing animation has finished, or immediately if there is none. */
  show(): Promise<void>;
  /** Resolves once the annotation is gone, after the reverse animation if one runs. */
  hide(): Promise<void>;
  /** Holds any animation in progress where it is. */
  pause(): void;
  /** Runs a paused animation on from where it stopped. */
  resume(): void;
  /** Unlinks the annotation from its element. */
  remove(): void;
}

/** Annotations animated in sequence. */
export interface RoughAnnotationGroup {
  readonly annotations: readonly RoughAnnotation[];
  /** Resolves once every annotation in the group has finished drawing. */
  show(): Promise<void>;
  /** Resolves once every annotation in the group is gone. */
  hide(): Promise<void>;
  /** Removes every annotation in the group. */
  remove(): void;
}

/** @internal Flat shape used inside the library, where the discriminant is settled. */
export type ResolvedAnnotationConfig = AnnotationOptions & {
  type: RoughAnnotationType;
  seed: number;
};
