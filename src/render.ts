import type { OpSet, ResolvedOptions } from 'roughjs/bin/core';
import type { Point } from 'roughjs/bin/geometry';
import { curve, ellipse, line, linearPath, rectangle } from 'roughjs/bin/renderer';
import {
  DEFAULT_AMPLITUDE,
  DEFAULT_ANIMATION_EASING,
  DEFAULT_BRACKET_SIDE,
  DEFAULT_COLOR,
  DEFAULT_FREQUENCY,
  DEFAULT_HIGHLIGHT_ROUGHNESS,
  DEFAULT_ITERATIONS,
  DEFAULT_PADDING,
  DEFAULT_ROUGHNESS,
  DEFAULT_STROKE_WIDTH,
  HIGHLIGHT_HEIGHT_RATIO,
  KEYFRAME_NAME,
  SVG_NS,
  WAVE_RESOLUTION,
  ZIGZAG_RESOLUTION,
} from './constants.js';
import { resolveAnimation } from './animation.js';
import { createFrame, type Frame } from './frame.js';
import type {
  AnnotationPosition,
  BracketType,
  FullPadding,
  Rectangle,
  ResolvedAnnotationConfig,
  RoughAnnotationType,
  RoughStrokeOptions,
  WritingMode,
} from './types.js';

type RoughOptionsType = 'highlight' | 'single' | 'double';

function getOptions(
  type: RoughOptionsType,
  overrides: RoughStrokeOptions,
  seed: number,
): ResolvedOptions {
  return {
    maxRandomnessOffset: 2,
    bowing: 1,
    stroke: '#000',
    strokeWidth: 1.5,
    curveTightness: 0,
    curveFitting: 0.95,
    curveStepCount: 9,
    fillStyle: 'hachure',
    fillWeight: -1,
    hachureAngle: -41,
    hachureGap: -1,
    dashOffset: -1,
    dashGap: -1,
    zigzagOffset: -1,
    disableMultiStrokeFill: false,
    preserveVertices: false,
    fillShapeRoughnessGain: 0.8,
    roughness: type === 'highlight' ? DEFAULT_HIGHLIGHT_ROUGHNESS : DEFAULT_ROUGHNESS,
    ...overrides,
    seed,
    disableMultiStroke: type !== 'double',
  };
}

/** @internal Exported for testing. */
export function parsePadding(config: Pick<ResolvedAnnotationConfig, 'padding'>): FullPadding {
  const { padding } = config;

  if (typeof padding === 'number') return [padding, padding, padding, padding];

  if (Array.isArray(padding) && padding.length) {
    const [top, right = top, bottom = top, left = right] = padding;
    return [top, right, bottom, left];
  }

  return [DEFAULT_PADDING, DEFAULT_PADDING, DEFAULT_PADDING, DEFAULT_PADDING];
}

function alternatingLines(
  from: Point,
  to: Point,
  iterations: number,
  reverse: number,
  options: ResolvedOptions,
): OpSet[] {
  return Array.from({ length: Math.max(iterations, 0) }, (_, index) => {
    const [[x1, y1], [x2, y2]] = (index + reverse) % 2 ? [to, from] : [from, to];
    return line(x1, y1, x2, y2, options);
  });
}

function alternatingStrokes(
  points: Point[],
  iterations: number,
  reverse: number,
  draw: (points: Point[]) => OpSet,
): OpSet[] {
  let reversed: Point[] | undefined;

  return Array.from({ length: Math.max(iterations, 0) }, (_, index) =>
    draw((index + reverse) % 2 ? (reversed ??= [...points].reverse()) : points),
  );
}

/* Whole waves only, so the stroke starts and ends on the baseline. This leaves
   the drawn wavelength slightly off the requested frequency. */
function waveCount(inlineSize: number, frequency: number): number {
  return Math.max(Math.round((inlineSize * frequency) / 100), 1);
}

function sinePoints(frame: Frame, block: number, amplitude: number, frequency: number): Point[] {
  const waves = waveCount(frame.inlineSize, frequency);
  const steps = waves * WAVE_RESOLUTION;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;

    return frame.point(
      frame.inlineSize * progress,
      block + amplitude * Math.sin(progress * waves * 2 * Math.PI),
    );
  });
}

function zigzagPoints(frame: Frame, block: number, amplitude: number, frequency: number): Point[] {
  const waves = waveCount(frame.inlineSize, frequency);
  const steps = waves * ZIGZAG_RESOLUTION;
  const offsets = [0, amplitude, 0, -amplitude];

  return Array.from({ length: steps + 1 }, (_, index) =>
    frame.point((frame.inlineSize * index) / steps, block + offsets[index % ZIGZAG_RESOLUTION]),
  );
}

/* RoughJS starts every `linearPath` segment with its own move, which
   `opsToPath` would split into a separate path each. A wave wants one path. */
function joinOps({ ops, ...rest }: OpSet): OpSet {
  return {
    ...rest,
    ops: ops.map((op, index) =>
      index && op.op === 'move' ? { op: 'lineTo' as const, data: op.data } : op,
    ),
  };
}

function bracketPoints(side: BracketType, rect: Rectangle, padding: FullPadding): Point[] {
  const left = rect.x - padding[3] * 2;
  const right = rect.x + rect.width + padding[1] * 2;
  const top = rect.y - padding[0] * 2;
  const bottom = rect.y + rect.height + padding[2] * 2;

  switch (side) {
    case 'top':
      return [
        [left, rect.y],
        [left, top],
        [right, top],
        [right, rect.y],
      ];
    case 'bottom':
      return [
        [left, rect.y + rect.height],
        [left, bottom],
        [right, bottom],
        [right, rect.y + rect.height],
      ];
    case 'left':
      return [
        [rect.x, top],
        [left, top],
        [left, bottom],
        [rect.x, bottom],
      ];
    case 'right':
      return [
        [rect.x + rect.width, top],
        [right, top],
        [right, bottom],
        [rect.x + rect.width, bottom],
      ];
  }
}

interface StrokeContext {
  rect: Rectangle;
  frame: Frame;
  padding: FullPadding;
  iterations: number;
  reverse: number;
  brackets: BracketType[];
  amplitude: number;
  frequency: number;
  /** Block offsets the inline strokes run along, one per side drawn. */
  blocks: number[];
  options: ResolvedOptions;
  overrides: RoughStrokeOptions;
  seed: number;
}

interface StrokePlan {
  ops: OpSet[];
  /** Set when the type derives its own width instead of taking the configured one. */
  strokeWidth?: number;
}

function repeat(count: number, draw: () => OpSet): OpSet[] {
  return Array.from({ length: Math.max(count, 0) }, draw);
}

function resolveBlocks(frame: Frame, position: AnnotationPosition | undefined): number[] {
  const over = -frame.overPadding;
  const under = frame.blockSize + frame.underPadding;

  if (position === 'over') return [over];
  if (position === 'both') return [over, under];

  return [under];
}

function inlineStrokes(context: StrokeContext, options = context.options): OpSet[] {
  const { frame, iterations, reverse, blocks } = context;

  return blocks.flatMap((block) =>
    alternatingLines(
      frame.point(0, block),
      frame.point(frame.inlineSize, block),
      iterations,
      reverse,
      options,
    ),
  );
}

function wavedStrokes(
  context: StrokeContext,
  sample: (frame: Frame, block: number, amplitude: number, frequency: number) => Point[],
  draw: (points: Point[]) => OpSet,
): OpSet[] {
  const { frame, amplitude, frequency, iterations, reverse, blocks } = context;

  return blocks.flatMap((block) =>
    alternatingStrokes(sample(frame, block, amplitude, frequency), iterations, reverse, draw),
  );
}

function paddedBox({ rect, padding }: StrokeContext) {
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

const PLANNERS: Record<RoughAnnotationType, Planner> = {
  underline: (context) => ({ ops: inlineStrokes(context) }),

  strikethrough: (context) => ({ ops: inlineStrokes(through(context)) }),

  highlight: (context) => ({
    ops: inlineStrokes(through(context), getOptions('highlight', context.overrides, context.seed)),
    strokeWidth: context.frame.blockSize * HIGHLIGHT_HEIGHT_RATIO,
  }),

  'crossed-off'({ rect, iterations, reverse, options }) {
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;

    return {
      ops: [
        ...alternatingLines([rect.x, rect.y], [right, bottom], iterations, reverse, options),
        ...alternatingLines([right, rect.y], [rect.x, bottom], iterations, reverse, options),
      ],
    };
  },

  box(context) {
    const { x, y, width, height } = paddedBox(context);

    return {
      ops: repeat(context.iterations, () => rectangle(x, y, width, height, context.options)),
    };
  },

  circle(context) {
    const { x, y, width, height } = paddedBox(context);
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
    ops: brackets.map((side) => linearPath(bracketPoints(side, rect, padding), false, options)),
  }),

  wavy: (context) => ({
    ops: wavedStrokes(context, sinePoints, (points) => curve(points, context.options)),
  }),

  zigzag: (context) => ({
    ops: wavedStrokes(context, zigzagPoints, (points) =>
      joinOps(linearPath(points, false, context.options)),
    ),
  }),
};

export function renderAnnotation(
  target: SVGSVGElement,
  rect: Rectangle,
  mode: WritingMode,
  config: ResolvedAnnotationConfig,
  animationDelay: number,
  animationDuration: number,
  reversedFlow: boolean,
) {
  const { onShow } = resolveAnimation(config.animate);
  const padding = parsePadding(config);
  const frame = createFrame(rect, padding, mode);
  const plan = PLANNERS[config.type]({
    rect,
    frame,
    padding,
    iterations: config.iterations ?? DEFAULT_ITERATIONS,
    reverse: (config.reverse ?? reversedFlow) ? 1 : 0,
    brackets: Array.isArray(config.brackets)
      ? config.brackets
      : [config.brackets ?? DEFAULT_BRACKET_SIDE],
    amplitude: config.amplitude ?? DEFAULT_AMPLITUDE,
    frequency: config.frequency ?? DEFAULT_FREQUENCY,
    blocks: resolveBlocks(frame, config.position),
    options: getOptions('single', config, config.seed),
    overrides: config,
    seed: config.seed,
  });

  if (!plan.ops.length) return;

  const strokeWidth = plan.strokeWidth ?? config.strokeWidth ?? DEFAULT_STROKE_WIDTH;

  const paths = opsToPath(plan.ops).map((d) => {
    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', config.color ?? DEFAULT_COLOR);
    path.setAttribute('stroke-width', `${strokeWidth}`);
    target.appendChild(path);

    return path;
  });

  if (!onShow) return;

  const lengths = paths.map((path) => path.getTotalLength());
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  const easing = config.animationEasing ?? DEFAULT_ANIMATION_EASING;
  let delay = animationDelay;

  paths.forEach((path, index) => {
    const length = lengths[index];
    const duration = totalLength ? animationDuration * (length / totalLength) : 0;

    path.style.strokeDashoffset = `${length}`;
    path.style.strokeDasharray = `${length}`;
    path.style.animation = `${KEYFRAME_NAME} ${duration}ms ${easing} ${delay}ms forwards`;

    delay += duration;
  });
}

/** @internal Exported for testing. */
export function opsToPath(opList: OpSet[]): string[] {
  const paths: string[] = [];

  opList.forEach(({ ops }) => {
    let path = '';

    ops.forEach(({ op, data }) => {
      switch (op) {
        case 'move':
          if (path) paths.push(path);

          path = `M${data[0]} ${data[1]}`;
          break;
        case 'bcurveTo':
          path += ` C${data[0]} ${data[1]}, ${data[2]} ${data[3]}, ${data[4]} ${data[5]}`;
          break;
        case 'lineTo':
          path += ` L${data[0]} ${data[1]}`;
          break;
      }
    });

    if (path) paths.push(path);
  });

  return paths;
}
