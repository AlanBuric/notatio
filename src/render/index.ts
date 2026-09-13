import { type OpSet } from 'roughjs/bin/core';
import {
  DEFAULT_AMPLITUDE,
  DEFAULT_ANIMATION_EASING,
  DEFAULT_BRACKET_SIDE,
  DEFAULT_COLOR,
  DEFAULT_FREQUENCY,
  DEFAULT_ITERATIONS,
  DEFAULT_PADDING,
  DEFAULT_STROKE_WIDTH,
  KEYFRAME_NAME,
  PATH_PRECISION,
  SVG_NS,
  TIME_PRECISION,
} from '@/constants.js';
import { getAnimation } from '@/animation.js';
import { getFrame } from '@/frame.js';
import { round } from '@/round.js';
import type { FullPadding, Rectangle, InternalAnnotationConfig, WritingMode } from '@/types.js';
import { getBlocks } from './geometry.js';
import { STRATEGIES } from './strategies.js';
import { getOptions } from './rough-options.js';

/** @internal Exported for testing. */
export function parsePadding(config: Pick<InternalAnnotationConfig, 'padding'>): FullPadding {
  const { padding } = config;

  if (typeof padding === 'number') return [padding, padding, padding, padding];

  if (Array.isArray(padding) && padding.length) {
    const [top, right = top, bottom = top, left = right] = padding;
    return [top, right, bottom, left];
  }

  return [DEFAULT_PADDING, DEFAULT_PADDING, DEFAULT_PADDING, DEFAULT_PADDING];
}

export function renderAnnotation(
  target: SVGSVGElement,
  rect: Rectangle,
  mode: WritingMode,
  config: InternalAnnotationConfig,
  animationDelay: number,
  animationDuration: number,
  reversedFlow: boolean,
) {
  const padding = parsePadding(config);
  const frame = getFrame(rect, padding, mode);
  const strategy = STRATEGIES[config.type]({
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
    blocks: getBlocks(frame, config.position),
    options: getOptions('single', config, config.seed),
    overrides: config,
    seed: config.seed,
  });

  if (!strategy.ops.length) return;

  const strokeWidth = strategy.strokeWidth ?? config.strokeWidth ?? DEFAULT_STROKE_WIDTH;

  const paths = opsToPath(strategy.ops).map((d) => {
    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', config.color ?? DEFAULT_COLOR);
    path.setAttribute('stroke-width', `${strokeWidth}`);
    target.appendChild(path);

    return path;
  });

  if (!getAnimation(config.animate).onShow) return;

  const lengths = paths.map((path) => path.getTotalLength());
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  const easing = config.animationEasing ?? DEFAULT_ANIMATION_EASING;
  let delay = animationDelay;

  paths.forEach((path, index) => {
    const length = lengths[index];
    const duration = totalLength ? animationDuration * (length / totalLength) : 0;
    const roundedLength = round(length, PATH_PRECISION);
    const roundedDuration = round(duration, TIME_PRECISION);
    const roundedDelay = round(delay, TIME_PRECISION);

    path.style.strokeDashoffset = `${roundedLength}`;
    path.style.strokeDasharray = `${roundedLength}`;
    path.style.animation = `${KEYFRAME_NAME} ${roundedDuration}ms ${easing} ${roundedDelay}ms forwards`;

    delay += duration;
  });
}

/** @internal Exported for testing. */
export function opsToPath(opList: OpSet[]): string[] {
  const paths: string[] = [];

  opList.forEach(({ ops }) => {
    let path = '';

    ops.forEach(({ op, data }) => {
      const [x1, y1, x2, y2, x3, y3] = data.map((value) => round(value, PATH_PRECISION));

      switch (op) {
        case 'move':
          if (path) paths.push(path);

          path = `M${x1} ${y1}`;
          break;
        case 'bcurveTo':
          path += ` C${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
          break;
        case 'lineTo':
          path += ` L${x1} ${y1}`;
          break;
      }
    });

    if (path) paths.push(path);
  });

  return paths;
}
