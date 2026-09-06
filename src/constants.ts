import type { BracketType } from './types.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export const ANNOTATION_CLASS = 'notatio-annotation';

export const KEYFRAME_NAME = 'notatio-dash';

export const REVERSE_KEYFRAME_NAME = 'notatio-dash-reverse';

/** Custom property the reverse keyframe reads the retreat distance from. */
export const PATH_LENGTH_PROPERTY = '--notatio-path-length';

export const DEFAULT_ANIMATION_DURATION = 800;

export const DEFAULT_ANIMATION_EASING = 'ease-out';

export const DEFAULT_ANIMATE_ON_SHOW = true;

export const DEFAULT_ANIMATE_ON_HIDE = false;

export const DEFAULT_DELAY = 0;

export const DEFAULT_ITERATIONS = 2;

export const DEFAULT_STROKE_WIDTH = 2;

export const DEFAULT_PADDING = 5;

export const DEFAULT_MULTILINE = true;

export const DEFAULT_BRACKET_SIDE: BracketType = 'right';

export const DEFAULT_COLOR = 'currentColor';

export const DEFAULT_ROUGHNESS = 1.5;

export const DEFAULT_HIGHLIGHT_ROUGHNESS = 3;

/** Fraction of the element height a highlight stroke covers. */
export const HIGHLIGHT_HEIGHT_RATIO = 0.95;

export const DEFAULT_AMPLITUDE = 3;

/** Complete waves per 100px of width. */
export const DEFAULT_FREQUENCY = 5;

/** Points sampled per wave, enough for the curve fit to keep a crest round. */
export const WAVE_RESOLUTION = 8;

/** Segments per wave: baseline, crest, baseline, trough. */
export const ZIGZAG_RESOLUTION = 4;

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
