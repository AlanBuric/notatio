import type { OpSet, ResolvedOptions } from 'roughjs/bin/core';
import type { Point } from 'roughjs/bin/geometry';
import { ellipse, line, linearPath, rectangle } from 'roughjs/bin/renderer';
import {
  DEFAULT_COLOR,
  DEFAULT_ITERATIONS,
  DEFAULT_PADDING,
  DEFAULT_STROKE_WIDTH,
  HIGHLIGHT_HEIGHT_RATIO,
  KEYFRAME_NAME,
  REDUCED_MOTION_QUERY,
  SVG_NS,
} from './constants.js';
import type { BracketType, FullPadding, Rect, RoughAnnotationConfig } from './types.js';

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

/** @internal Exported for testing. Not part of the package entry point. */
export function parsePadding(config: RoughAnnotationConfig): FullPadding {
  const { padding } = config;

  if (typeof padding === 'number') return [padding, padding, padding, padding];

  if (Array.isArray(padding) && padding.length) {
    const [top, right = top, bottom = top, left = right] = padding;
    return [top, right, bottom, left];
  }

  return [DEFAULT_PADDING, DEFAULT_PADDING, DEFAULT_PADDING, DEFAULT_PADDING];
}

/**
 * Strokes drawn back and forth between two points. `rtl` shifts the starting
 * parity so the first stroke runs in the opposite direction.
 */
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

function bracketPoints(side: BracketType, rect: Rect, padding: FullPadding): Point[] {
  const left = rect.x - padding[3] * 2;
  const right = rect.x + rect.w + padding[1] * 2;
  const top = rect.y - padding[0] * 2;
  const bottom = rect.y + rect.h + padding[2] * 2;

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
        [left, rect.y + rect.h],
        [left, bottom],
        [right, bottom],
        [right, rect.y + rect.h],
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
        [rect.x + rect.w, top],
        [right, top],
        [right, bottom],
        [rect.x + rect.w, bottom],
      ];
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function renderAnnotation(
  svg: SVGSVGElement,
  rect: Rect,
  config: RoughAnnotationConfig,
  animationGroupDelay: number,
  animationDuration: number,
  seed: number,
) {
  const padding = parsePadding(config);
  const animate = (config.animate ?? true) && !prefersReducedMotion();
  const iterations = config.iterations ?? DEFAULT_ITERATIONS;
  const rtl = config.rtl ? 1 : 0;
  const options = getOptions('single', seed);

  let strokeWidth = config.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  let opList: OpSet[] = [];

  switch (config.type) {
    case 'underline': {
      const y = rect.y + rect.h + padding[2];
      opList = alternatingLines([rect.x, y], [rect.x + rect.w, y], iterations, rtl, options);
      break;
    }
    case 'strike-through': {
      const y = rect.y + rect.h / 2;
      opList = alternatingLines([rect.x, y], [rect.x + rect.w, y], iterations, rtl, options);
      break;
    }
    case 'highlight': {
      const highlightOptions = getOptions('highlight', seed);
      const y = rect.y + rect.h / 2;

      strokeWidth = rect.h * HIGHLIGHT_HEIGHT_RATIO;
      opList = alternatingLines(
        [rect.x, y],
        [rect.x + rect.w, y],
        iterations,
        rtl,
        highlightOptions,
      );
      break;
    }
    case 'crossed-off': {
      const x2 = rect.x + rect.w;
      const y2 = rect.y + rect.h;

      opList = [
        ...alternatingLines([rect.x, rect.y], [x2, y2], iterations, rtl, options),
        ...alternatingLines([x2, rect.y], [rect.x, y2], iterations, rtl, options),
      ];
      break;
    }
    case 'box': {
      const x = rect.x - padding[3];
      const y = rect.y - padding[0];
      const width = rect.w + padding[1] + padding[3];
      const height = rect.h + padding[0] + padding[2];

      opList = Array.from({ length: Math.max(iterations, 0) }, () =>
        rectangle(x, y, width, height, options),
      );
      break;
    }
    case 'circle': {
      const width = rect.w + padding[1] + padding[3];
      const height = rect.h + padding[0] + padding[2];
      const x = rect.x - padding[3] + width / 2;
      const y = rect.y - padding[0] + height / 2;
      const doubleStrokes = Math.floor(iterations / 2);
      const singleStrokes = iterations - doubleStrokes * 2;
      const doubleOptions = getOptions('double', seed);

      opList = [
        ...Array.from({ length: doubleStrokes }, () => ellipse(x, y, width, height, doubleOptions)),
        ...Array.from({ length: Math.max(singleStrokes, 0) }, () =>
          ellipse(x, y, width, height, options),
        ),
      ];
      break;
    }
    case 'bracket': {
      const sides = Array.isArray(config.brackets) ? config.brackets : [config.brackets ?? 'right'];

      opList = sides.map((side) => linearPath(bracketPoints(side, rect, padding), false, options));
      break;
    }
  }

  if (!opList.length) return;

  const paths = opsToPath(opList).map((d) => {
    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', config.color ?? DEFAULT_COLOR);
    path.setAttribute('stroke-width', `${strokeWidth}`);
    svg.appendChild(path);

    return path;
  });

  if (!animate) return;

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
      if (path) paths.push(path.trim());
    }

    ops.forEach(({ op, data }) => {
      switch (op) {
        case 'move':
          flush();
          path = `M${data[0]} ${data[1]} `;
          break;
        case 'bcurveTo':
          path += `C${data[0]} ${data[1]}, ${data[2]} ${data[3]}, ${data[4]} ${data[5]} `;
          break;
        case 'lineTo':
          path += `L${data[0]} ${data[1]} `;
          break;
      }
    });

    flush();
  });

  return paths;
}
