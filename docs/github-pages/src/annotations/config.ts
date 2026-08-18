import type { RoughAnnotation, RoughAnnotationConfig } from 'notatio';
import type { AnnotationOptionValues } from './types';

/**
 * The library refuses options a type does not read, so each type is built from
 * only the ones it takes.
 */
export function toConfig(options: AnnotationOptionValues): RoughAnnotationConfig {
  const {
    type,
    color,
    padding,
    multiline,
    animationDuration,
    strokeWidth,
    iterations,
    rtl,
    brackets,
    amplitude,
    frequency,
  } = options;

  const common = {
    color,
    padding,
    multiline,
    animationDuration,
    animate: animationDuration > 0,
  } as const;

  switch (type) {
    case 'underline':
    case 'strike-through':
    case 'crossed-off':
      return { ...common, type, strokeWidth, iterations, rtl };
    case 'box':
    case 'circle':
      return { ...common, type, strokeWidth, iterations };
    case 'highlight':
      return { ...common, type, iterations, rtl };
    case 'bracket':
      /* The config is structured-cloned by the library, which a reactive array would not survive. */
      return { ...common, type, strokeWidth, brackets: [...brackets] };
    case 'wavy':
      return { ...common, type, strokeWidth, iterations, rtl, amplitude, frequency };
  }
}

/**
 * Every option is settable on a live annotation whatever its type, so the ones
 * the type ignores can be pushed across without a second switch. `type` itself
 * is fixed at creation, which is why changing it rebuilds the annotation.
 */
export function applyOptions(annotation: RoughAnnotation, options: AnnotationOptionValues): void {
  annotation.color = options.color;
  annotation.padding = options.padding;
  annotation.multiline = options.multiline;
  annotation.strokeWidth = options.strokeWidth;
  annotation.iterations = options.iterations;
  annotation.rtl = options.rtl;
  annotation.brackets = [...options.brackets];
  annotation.amplitude = options.amplitude;
  annotation.frequency = options.frequency;
  annotation.animationDuration = options.animationDuration;
  annotation.animate = options.animationDuration > 0;
}
