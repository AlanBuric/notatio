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
  SVG_NS,
} from '@/constants.js';
import { getAnimation } from '@/animation.js';
import { getFrame } from '@/frame.js';
import type { FullPadding, Rectangle, InternalAnnotationConfig, WritingMode } from '@/types.js';
import { getBlocks } from './geometry.js';
import { PLANNERS } from './planners.js';
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
  const { onShow } = getAnimation(config.animate);
  const padding = parsePadding(config);
  const frame = getFrame(rect, padding, mode);
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
    blocks: getBlocks(frame, config.position),
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
