export type RoughAnnotationType =
  | 'underline'
  | 'box'
  | 'circle'
  | 'highlight'
  | 'strikethrough'
  | 'crossed-off'
  | 'bracket'
  | 'wavy'
  | 'zigzag';

export type BracketType = 'left' | 'right' | 'top' | 'bottom';

/** Named on the block axis, so `under` is below horizontal text and left of a `vertical-rl` column. */
export type AnnotationPosition = 'under' | 'over' | 'both';

/** The three cases a computed `writing-mode` reduces to geometrically. */
export type WritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

/** `[top, right, bottom, left]`, following the CSS shorthand order. */
export type FullPadding = [number, number, number, number];

/** Mirrors the CSS shorthand cascade: 1, 2, 3, or 4 values. */
export type RoughPadding =
  | number
  | [number]
  | [number, number]
  | [number, number, number]
  | FullPadding;

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationOptions {
  /**
   * Animate the drawing on `show()`.
   * @defaultValue true
   */
  onShow?: boolean;
  /**
   * Retreat the strokes on `hide()`.
   * @defaultValue false
   */
  onHide?: boolean;
  /** Overrides `animationEasing` for the retreat on `hide()`. */
  hideEasing?: string;
}

export type AnimateOption = boolean | AnimationOptions;

export interface VisibilityOptions extends IntersectionObserverInit {
  /**
   * Hide again when the element leaves, and redraw when it returns.
   * @defaultValue false
   */
  repeat?: boolean;
}

export type ShowOnVisibleOption = boolean | VisibilityOptions;

/** The RoughJS parameters that reach the stroke renderers. The rest only affect fills. */
export interface RoughStrokeOptions {
  /**
   * How far strokes wander off the ideal path. 3 for `highlight`.
   * @defaultValue 1.5
   */
  roughness?: number;
  /**
   * Ceiling on a single point's random displacement.
   * @defaultValue 2
   */
  maxRandomnessOffset?: number;
  /**
   * How far a straight line bends on its way across.
   * @defaultValue 1
   */
  bowing?: number;
  /**
   * How closely an ellipse follows its ideal curve.
   * @defaultValue 0.95
   */
  curveFitting?: number;
  /**
   * Slack in the curve through a wave's points.
   * @defaultValue 0
   */
  curveTightness?: number;
  /**
   * Points sampled around an ellipse.
   * @defaultValue 9
   */
  curveStepCount?: number;
  /**
   * Pins path endpoints in place instead of jittering them.
   * @defaultValue false
   */
  preserveVertices?: boolean;
  /** Chooses the random variation. Assigned randomly when omitted, and readable afterwards. */
  seed?: number;
}

export interface CommonAnnotationOptions extends RoughStrokeOptions {
  /**
   * Animates the drawing but not the removal.
   * @defaultValue true
   */
  animate?: AnimateOption;
  /**
   * Milliseconds.
   * @defaultValue 800
   */
  animationDuration?: number;
  /**
   * Any valid CSS `animation-timing-function` value.
   * @defaultValue ease-out
   */
  animationEasing?: string;
  /**
   * Milliseconds to wait before drawing, on top of any group delay.
   * @defaultValue 0
   */
  delay?: number;
  /** @defaultValue currentColor */
  color?: string;
  /**
   * Annotates each wrapped line of inline text separately.
   * @defaultValue true
   */
  multiline?: boolean;
  /** Added to the annotation SVG alongside `notatio-annotation`. */
  class?: string;
  /** `z-index` of the annotation SVG. Unset by default. */
  zIndex?: number;
  /**
   * Redraw on element and window resize.
   * @defaultValue true
   */
  observeResize?: boolean;
  /** Calls `show()` the first time the element scrolls into view. */
  showOnVisible?: ShowOnVisibleOption;
}

/** Marks options a given type does not read, so passing one is a type error. */
type Unsupported<Keys extends string> = Partial<Record<Keys, never>>;

interface Iterated {
  /**
   * Number of strokes drawn.
   * @defaultValue 2
   */
  iterations?: number;
}

interface Stroked {
  /** @defaultValue 2 */
  strokeWidth?: number;
}

interface Directional {
  /** Draws the first stroke against the text flow. */
  reverse?: boolean;
}

interface Positioned {
  /**
   * Which side of the text the stroke runs along.
   * @defaultValue under
   */
  position?: AnnotationPosition;
}

interface Padded {
  /** @defaultValue 5px on every side */
  padding?: RoughPadding;
}

interface Waved {
  /**
   * Peak distance from the baseline, in pixels. A negative value mirrors the wave.
   * @defaultValue 3
   */
  amplitude?: number;
  /**
   * Complete waves per 100px of text, rounded to whole waves across the element.
   * @defaultValue 5
   */
  frequency?: number;
}

type UnwavedKeys = 'amplitude' | 'frequency';

type UnderlineAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Positioned &
  Padded &
  Unsupported<'brackets' | UnwavedKeys> & {
    type: 'underline';
  };

/** Both are drawn across the text itself, so `position` and `padding` have nothing to offset. */
type StrikeAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Unsupported<'brackets' | 'position' | 'padding' | UnwavedKeys> & {
    type: 'strikethrough' | 'crossed-off';
  };

type ShapeAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Padded &
  Unsupported<'brackets' | 'reverse' | 'position' | UnwavedKeys> & {
    type: 'box' | 'circle';
  };

/**
 * `strokeWidth` is derived from the element size, so it cannot be set. `padding` is likewise
 * ignored: the highlight always centres on the text's block axis.
 */
type HighlightAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Directional &
  Unsupported<'brackets' | 'strokeWidth' | 'position' | 'padding' | UnwavedKeys> & {
    type: 'highlight';
  };

/** Draws one bracket per side, so `iterations` does not apply. */
type BracketAnnotationConfig = CommonAnnotationOptions &
  Stroked &
  Padded &
  Unsupported<'iterations' | 'reverse' | 'position' | UnwavedKeys> & {
    type: 'bracket';
    /** @defaultValue right */
    brackets?: BracketType | BracketType[];
  };

/** Drawn like an underline, but along a wave: `wavy` curved, `zigzag` angular. */
type WaveAnnotationConfig = CommonAnnotationOptions &
  Iterated &
  Stroked &
  Directional &
  Positioned &
  Padded &
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

/** What `annotate` marks up: an element, a text range, or a selection to snapshot. */
export type AnnotationTarget = HTMLElement | AbstractRange | Selection;

/**
 * The config options as plain optional properties. The annotation exposes them
 * all as settable, since a value its type ignores is harmless.
 */
export interface AnnotationOptions
  extends
    Omit<CommonAnnotationOptions, 'showOnVisible'>,
    Iterated,
    Stroked,
    Directional,
    Positioned,
    Padded,
    Waved {
  brackets?: BracketType | BracketType[];
}

export interface RoughAnnotation extends AnnotationOptions {
  /** Always a number once the annotation exists, even when the config omitted it. */
  seed: number;
  /** The injected SVG, or `undefined` once removed. */
  readonly svg: SVGSVGElement | undefined;
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
  show(): Promise<void>;
  hide(): Promise<void>;
  remove(): void;
}

/** @internal Flat shape used inside the library, where the discriminant is settled. */
export type InternalAnnotationConfig = AnnotationOptions & {
  type: RoughAnnotationType;
  seed: number;
};
