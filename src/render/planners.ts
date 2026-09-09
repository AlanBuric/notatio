import type { OpSet, ResolvedOptions } from 'roughjs/bin/core';
import type { Point } from 'roughjs/bin/geometry';
import { curve, ellipse, linearPath, rectangle } from 'roughjs/bin/renderer';
import { HIGHLIGHT_HEIGHT_RATIO } from '@/constants.js';
import type { Frame } from '@/frame.js';
import type {
  BracketType,
  FullPadding,
  Rectangle,
  RoughAnnotationType,
  RoughStrokeOptions,
} from '@/types.js';
import {
  getAlternatingLines,
  getAlternatingStrokes,
  getBracketPoints,
  joinOps,
  repeat,
  getSinePoints,
  getZigzagPoints,
} from './geometry.js';
import { getOptions } from './rough-options.js';

export interface StrokeContext {
  rect: Rectangle;
  frame: Frame;
  padding: FullPadding;
  iterations: number;
  reverse: number;
  brackets: BracketType[];
  amplitude: number;
  frequency: number;
  blocks: number[];
  options: ResolvedOptions;
  overrides: RoughStrokeOptions;
  seed: number;
}

export interface StrokePlan {
  ops: OpSet[];
  strokeWidth?: number;
}

export type SampleFunction = (
  frame: Frame,
  block: number,
  amplitude: number,
  frequency: number,
) => Point[];

function getInlineStrokes(context: StrokeContext, options = context.options): OpSet[] {
  const { frame, iterations, reverse, blocks } = context;

  return blocks.flatMap((block) =>
    getAlternatingLines(
      frame.point(0, block),
      frame.point(frame.inlineSize, block),
      iterations,
      reverse,
      options,
    ),
  );
}

function getWavedStrokes(
  context: StrokeContext,
  sample: SampleFunction,
  draw: (points: Point[]) => OpSet,
): OpSet[] {
  const { frame, amplitude, frequency, iterations, reverse, blocks } = context;

  return blocks.flatMap((block) =>
    getAlternatingStrokes(sample(frame, block, amplitude, frequency), iterations, reverse, draw),
  );
}

function getPaddedBox({ rect, padding }: StrokeContext) {
  return {
    x: rect.x - padding[3],
    y: rect.y - padding[0],
    width: rect.width + padding[1] + padding[3],
    height: rect.height + padding[0] + padding[2],
  };
}

function through(context: StrokeContext): StrokeContext {
  return { ...context, blocks: [context.frame.blockSize / 2] };
}

type Planner = (context: StrokeContext) => StrokePlan;

export const PLANNERS: Record<RoughAnnotationType, Planner> = {
  underline: (context) => ({ ops: getInlineStrokes(context) }),

  strikethrough: (context) => ({ ops: getInlineStrokes(through(context)) }),

  highlight: (context) => ({
    ops: getInlineStrokes(
      through(context),
      getOptions('highlight', context.overrides, context.seed),
    ),
    strokeWidth: context.frame.blockSize * HIGHLIGHT_HEIGHT_RATIO,
  }),

  'crossed-off'({ rect, iterations, reverse, options }) {
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;

    return {
      ops: [
        ...getAlternatingLines([rect.x, rect.y], [right, bottom], iterations, reverse, options),
        ...getAlternatingLines([right, rect.y], [rect.x, bottom], iterations, reverse, options),
      ],
    };
  },

  box(context) {
    const { x, y, width, height } = getPaddedBox(context);

    return {
      ops: repeat(context.iterations, () => rectangle(x, y, width, height, context.options)),
    };
  },

  circle(context) {
    const { x, y, width, height } = getPaddedBox(context);
    const centreX = x + width / 2;
    const centreY = y + height / 2;
    const doubleStrokes = Math.floor(context.iterations / 2);
    const doubleOptions = getOptions('double', context.overrides, context.seed);

    return {
      ops: [
        ...repeat(doubleStrokes, () => ellipse(centreX, centreY, width, height, doubleOptions)),
        ...repeat(context.iterations - doubleStrokes * 2, () =>
          ellipse(centreX, centreY, width, height, context.options),
        ),
      ],
    };
  },

  bracket: ({ rect, padding, brackets, options }) => ({
    ops: brackets.map((side) => linearPath(getBracketPoints(side, rect, padding), false, options)),
  }),

  wavy: (context) => ({
    ops: getWavedStrokes(context, getSinePoints, (points) => curve(points, context.options)),
  }),

  zigzag: (context) => ({
    ops: getWavedStrokes(context, getZigzagPoints, (points) =>
      joinOps(linearPath(points, false, context.options)),
    ),
  }),
};
