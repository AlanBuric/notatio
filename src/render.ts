import type { OpSet, ResolvedOptions } from 'roughjs/bin/core';
import type { Point } from 'roughjs/bin/geometry';
import { curve, ellipse, line, linearPath, rectangle } from 'roughjs/bin/renderer';
import {
  DEFAULT_AMPLITUDE,
  DEFAULT_COLOR,
  DEFAULT_FREQUENCY,
  DEFAULT_ITERATIONS,
  DEFAULT_PADDING,
  DEFAULT_STROKE_WIDTH,
  HIGHLIGHT_HEIGHT_RATIO,
  KEYFRAME_NAME,
  SVG_NS,
  WAVE_RESOLUTION,
} from './constants.js';
import { resolveAnimation } from './animation.js';
import type {
  BracketType,
  FullPadding,
  Rectangle,
  ResolvedAnnotationConfig,
  RoughAnnotationType,
} from './types.js';

type RoughOptionsType = 'highlight' | 'single' | 'double';

function getOptions(type: RoughOptionsType, seed: number): ResolvedOptions {
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
    roughness: type === 'highlight' ? 3 : 1.5,
    disableMultiStroke: type !== 'double',
    seed,
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

/** Strokes back and forth between two points. `rtl` flips the starting direction. */
function alternatingLines(
  from: Point,
  to: Point,
  iterations: number,
  rtl: number,
  options: ResolvedOptions,
): OpSet[] {
  return Array.from({ length: Math.max(iterations, 0) }, (_, index) => {
    const [[x1, y1], [x2, y2]] = (index + rtl) % 2 ? [to, from] : [from, to];
    return line(x1, y1, x2, y2, options);
  });
}

/* Rounded to whole waves so the stroke starts and ends on the baseline, which
   leaves the wavelength slightly off the requested frequency. */
function wavePoints(rect: Rectangle, y: number, amplitude: number, frequency: number): Point[] {
  const waves = Math.max(Math.round((rect.width * frequency) / 100), 1);
  const steps = waves * WAVE_RESOLUTION;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;

    return [
      rect.x + rect.width * progress,
      y + amplitude * Math.sin(progress * waves * 2 * Math.PI),
    ];
  });
}

function alternatingCurves(
  points: Point[],
  iterations: number,
  rtl: number,
  options: ResolvedOptions,
): OpSet[] {
  const reversed = [...points].reverse();

  return Array.from({ length: Math.max(iterations, 0) }, (_, index) =>
    curve((index + rtl) % 2 ? reversed : points, options),
  );
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

/** Everything a planner needs, resolved from the config. */
interface StrokeContext {
  rect: Rectangle;
  padding: FullPadding;
  iterations: number;
  rtl: number;
  brackets: BracketType[];
  amplitude: number;
  frequency: number;
  options: ResolvedOptions;
  seed: number;
}

interface StrokePlan {
  ops: OpSet[];
  /** Set when the type derives its own width rather than taking the configured one. */
  strokeWidth?: number;
}

function repeat(count: number, draw: () => OpSet): OpSet[] {
  return Array.from({ length: Math.max(count, 0) }, draw);
}

function horizontal({ rect, iterations, rtl, options }: StrokeContext, y: number): OpSet[] {
  return alternatingLines([rect.x, y], [rect.x + rect.width, y], iterations, rtl, options);
}

/** Outer box of the annotation, the element rect grown by its padding. */
function paddedBox({ rect, padding }: StrokeContext) {
  return {
    x: rect.x - padding[3],
    y: rect.y - padding[0],
    width: rect.width + padding[1] + padding[3],
    height: rect.height + padding[0] + padding[2],
  };
}

type PlanFunction = (context: StrokeContext) => StrokePlan;

const PLANNERS: Record<RoughAnnotationType, PlanFunction> = {
  underline: (context) => ({
    ops: horizontal(context, context.rect.y + context.rect.height + context.padding[2]),
  }),

  'strike-through': (context) => ({
    ops: horizontal(context, context.rect.y + context.rect.height / 2),
  }),

  highlight: (context) => ({
    ops: horizontal(
      { ...context, options: getOptions('highlight', context.seed) },
      context.rect.y + context.rect.height / 2,
    ),
    strokeWidth: context.rect.height * HIGHLIGHT_HEIGHT_RATIO,
  }),

  'crossed-off'({ rect, iterations, rtl, options }) {
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;

    return {
      ops: [
        ...alternatingLines([rect.x, rect.y], [right, bottom], iterations, rtl, options),
        ...alternatingLines([right, rect.y], [rect.x, bottom], iterations, rtl, options),
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
    const doubleOptions = getOptions('double', context.seed);

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

  wavy: ({ rect, padding, amplitude, frequency, iterations, rtl, options }) => ({
    ops: alternatingCurves(
      wavePoints(rect, rect.y + rect.height + padding[2], amplitude, frequency),
      iterations,
      rtl,
      options,
    ),
  }),
};

export function renderAnnotation(
  svg: SVGSVGElement,
  rect: Rectangle,
  config: ResolvedAnnotationConfig,
  animationGroupDelay: number,
  animationDuration: number,
  seed: number,
) {
  const { onShow } = resolveAnimation(config.animate);
  const plan = PLANNERS[config.type]({
    rect,
    padding: parsePadding(config),
    iterations: config.iterations ?? DEFAULT_ITERATIONS,
    rtl: config.rtl ? 1 : 0,
    brackets: Array.isArray(config.brackets) ? config.brackets : [config.brackets ?? 'right'],
    amplitude: config.amplitude ?? DEFAULT_AMPLITUDE,
    frequency: config.frequency ?? DEFAULT_FREQUENCY,
    options: getOptions('single', seed),
    seed,
  });

  if (!plan.ops.length) return;

  const strokeWidth = plan.strokeWidth ?? config.strokeWidth ?? DEFAULT_STROKE_WIDTH;

  const paths = opsToPath(plan.ops).map((d) => {
    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', config.color ?? DEFAULT_COLOR);
    path.setAttribute('stroke-width', `${strokeWidth}`);
    svg.appendChild(path);

    return path;
  });

  if (!onShow) return;

  const lengths = paths.map((path) => path.getTotalLength());
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  let delay = animationGroupDelay;

  paths.forEach((path, index) => {
    const length = lengths[index];
    const duration = totalLength ? animationDuration * (length / totalLength) : 0;

    path.style.strokeDashoffset = `${length}`;
    path.style.strokeDasharray = `${length}`;
    path.style.animation = `${KEYFRAME_NAME} ${duration}ms ease-out ${delay}ms forwards`;

    delay += duration;
  });
}

/** @internal Exported for testing. Not part of the package entry point. */
export function opsToPath(opList: OpSet[]): string[] {
  const paths: string[] = [];

  opList.forEach(({ ops }) => {
    let path = '';

    function flush() {
      if (path) paths.push(path);
    }

    /* Separator leads each command, so no trailing space needs trimming off. */
    ops.forEach(({ op, data }) => {
      switch (op) {
        case 'move':
          flush();
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

    flush();
  });

  return paths;
}
