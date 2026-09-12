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
  const d = opsToPath(strategy.ops);

  if (!d) return;

  const path = document.createElementNS(SVG_NS, 'path');

  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', config.color ?? DEFAULT_COLOR);
  path.setAttribute('stroke-width', `${strokeWidth}`);
  target.appendChild(path);

  if (!getAnimation(config.animate).onShow) return;

  const length = round(path.getTotalLength(), PATH_PRECISION);
  const easing = config.animationEasing ?? DEFAULT_ANIMATION_EASING;
  const duration = round(animationDuration, TIME_PRECISION);
  const delay = round(animationDelay, TIME_PRECISION);

  path.style.strokeDashoffset = `${length}`;
  path.style.strokeDasharray = `${length}`;
  path.style.animation = `${KEYFRAME_NAME} ${duration}ms ${easing} ${delay}ms forwards`;
}

/*
 * Multiple `move` ops become multiple `M` subpaths within one string rather than
 * separate path strings, so a whole annotation renders as a single <path> element.
 *
 * @internal Exported for testing.
 */
export function opsToPath(opList: OpSet[]): string {
  const tokens: string[] = [];

  opList.forEach(({ ops }) => {
    ops.forEach(({ op, data }) => {
      const [x1, y1, x2, y2, x3, y3] = data.map((value) => round(value, PATH_PRECISION));

      switch (op) {
        case 'move':
          tokens.push(`M${x1} ${y1}`);
          break;
        case 'bcurveTo':
          tokens.push(`C${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`);
          break;
        case 'lineTo':
          tokens.push(`L${x1} ${y1}`);
          break;
      }
    });
  });

  return tokens.join(' ');
}
