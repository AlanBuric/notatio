export const SVG_NS = 'http://www.w3.org/2000/svg';

export const ANNOTATION_CLASS = 'notatio-annotation';

export const KEYFRAME_NAME = 'notatio-dash';

export const REVERSE_KEYFRAME_NAME = 'notatio-dash-reverse';

/** Custom property the reverse keyframe reads the retreat distance from. */
export const PATH_LENGTH_PROPERTY = '--notatio-path-length';

export const DEFAULT_ANIMATION_DURATION = 800;

export const DEFAULT_ANIMATION_EASING = 'ease-out';

export const DEFAULT_ITERATIONS = 2;

export const DEFAULT_STROKE_WIDTH = 2;

export const DEFAULT_PADDING = 5;

export const DEFAULT_COLOR = 'currentColor';

/** Fraction of the element height a highlight stroke covers. */
export const HIGHLIGHT_HEIGHT_RATIO = 0.95;

export const DEFAULT_AMPLITUDE = 3;

/** Complete waves per 100px of width. */
export const DEFAULT_FREQUENCY = 5;

/**
 * Points sampled per wave. Enough for the curve fit to keep a crest round
 * without the path data growing with no visible gain.
 */
export const WAVE_RESOLUTION = 8;

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
