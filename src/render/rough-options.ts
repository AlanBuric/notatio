import type { ResolvedOptions } from 'roughjs/bin/core';
import { DEFAULT_HIGHLIGHT_ROUGHNESS, DEFAULT_ROUGHNESS } from '@/constants.js';
import type { RoughStrokeOptions } from '@/types.js';

export type RoughOptionsType = 'highlight' | 'single' | 'double';

export function getOptions(
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
