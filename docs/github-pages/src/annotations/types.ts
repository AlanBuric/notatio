import type { BracketType, RoughAnnotationType } from 'notatio';

export type ToolMode = 'annotate' | 'erase';

export interface AnnotationOptionValues {
  type: RoughAnnotationType;
  color: string;
  strokeWidth: number;
  padding: number;
  iterations: number;
  multiline: boolean;
  rtl: boolean;
  brackets: BracketType[];
  amplitude: number;
  frequency: number;
  animationDuration: number;
}

export type OptionKey = keyof AnnotationOptionValues;

/**
 * Where an annotation sits in the document, as character offsets into the text
 * of one block. Wrapping a range in an element leaves that text untouched, so
 * the offsets of the other annotations survive it.
 */
export interface TextLocation {
  block: string;
  start: number;
  end: number;
  text: string;
}

export interface AnnotationRecord extends TextLocation {
  id: string;
  options: AnnotationOptionValues;
}
