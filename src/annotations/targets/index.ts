import type { AnnotationTarget } from '@/types.js';
import type { TargetAdapter } from './adapter.js';
import { ElementTarget } from './adapters/element.js';
import { RangeTarget } from './adapters/range.js';

export type { TargetAdapter, TargetMeasurement } from './adapter.js';

function toLiveRange(input: AbstractRange): Range {
  if (input instanceof Range) return input;

  const range = new Range();

  try {
    range.setStart(input.startContainer, input.startOffset);
    range.setEnd(input.endContainer, input.endOffset);
  } catch {
    /* detached boundary nodes leave the range collapsed on the document */
  }

  return range;
}

export function mapTarget(target: AnnotationTarget): TargetAdapter {
  if (target instanceof Selection) {
    return new RangeTarget(target.rangeCount ? target.getRangeAt(0).cloneRange() : new Range());
  }

  if (target instanceof AbstractRange) return new RangeTarget(toLiveRange(target));

  return new ElementTarget(target);
}
