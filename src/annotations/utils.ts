import { ANNOTATION_CLASS } from '@/constants.js';
import type { Rectangle, ShowOnVisibleOption, VisibilityOptions } from '@/types.js';

export const UNATTACHED_STATE = 0;
export const NOT_SHOWING_STATE = 1;
export const SHOWING_STATE = 2;

export type AnnotationState =
  typeof UNATTACHED_STATE | typeof NOT_SHOWING_STATE | typeof SHOWING_STATE;

/** Setting one of these changes the drawing, so a visible annotation is redrawn. */
export const REDRAWN_OPTIONS = [
  'color',
  'strokeWidth',
  'padding',
  'iterations',
  'multiline',
  'reverse',
  'position',
  'brackets',
  'amplitude',
  'frequency',
  'roughness',
  'maxRandomnessOffset',
  'bowing',
  'curveFitting',
  'curveTightness',
  'curveStepCount',
  'preserveVertices',
  'seed',
] as const;

/** Read at the next `show()` or `hide()`, so setting one changes nothing now. */
export const DEFERRED_OPTIONS = [
  'animate',
  'animationDuration',
  'animationEasing',
  'delay',
] as const;

/* Cancelled animations reject, and a redraw cancels routinely, so treat that as done. */
export async function settled(svg: SVGSVGElement): Promise<void> {
  const animations = svg.getAnimations({ subtree: true });

  if (animations.length) {
    await Promise.allSettled(animations.map((animation) => animation.finished));
  }
}

export function getVisibility(
  option: ShowOnVisibleOption | undefined,
): VisibilityOptions | undefined {
  if (!option) return undefined;

  return option === true ? {} : option;
}

export function annotationClassName(extra: string | undefined): string {
  return extra ? `${ANNOTATION_CLASS} ${extra}` : ANNOTATION_CLASS;
}

function equalsRounded(a: number, b: number): boolean {
  return Math.round(a) === Math.round(b);
}

export function isSameRect(a: Rectangle, b: Rectangle): boolean {
  return (
    equalsRounded(a.x, b.x) &&
    equalsRounded(a.y, b.y) &&
    equalsRounded(a.width, b.width) &&
    equalsRounded(a.height, b.height)
  );
}

/*
 * Going through the screen CTM rather than subtracting rects keeps annotations correct under a
 * scaled ancestor.
 */
export function toSvgRect(svg: SVGSVGElement, bounds: DOMRect): Rectangle {
  const inverse = svg.getScreenCTM()?.inverse();

  if (inverse) {
    const start = new DOMPoint(bounds.x, bounds.y).matrixTransform(inverse);
    const end = new DOMPoint(bounds.right, bounds.bottom).matrixTransform(inverse);

    return { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y };
  }

  const origin = svg.getBoundingClientRect();

  return {
    x: bounds.x - origin.x,
    y: bounds.y - origin.y,
    width: bounds.width,
    height: bounds.height,
  };
}
