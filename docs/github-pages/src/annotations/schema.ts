import type { BracketType, RoughAnnotationType } from 'notatio';
import type { AnnotationOptionValues } from './types';

export interface TypeDescriptor {
  value: RoughAnnotationType;
  label: string;
  description: string;
}

export const ANNOTATION_TYPES: readonly TypeDescriptor[] = [
  { value: 'underline', label: 'Underline', description: 'A sketchy line under the text' },
  { value: 'box', label: 'Box', description: 'A box around the text' },
  { value: 'circle', label: 'Circle', description: 'A circle around the text' },
  { value: 'highlight', label: 'Highlight', description: 'A marker streak behind the text' },
  { value: 'strike-through', label: 'Strike-through', description: 'Lines through the text' },
  { value: 'crossed-off', label: 'Crossed off', description: 'An X across the text' },
  { value: 'bracket', label: 'Bracket', description: 'A bracket beside the text' },
  { value: 'wavy', label: 'Wavy', description: 'An underline along a sine wave' },
];

export interface NumberField {
  kind: 'number';
  key: 'strokeWidth' | 'padding' | 'iterations' | 'amplitude' | 'frequency' | 'animationDuration';
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint: string;
}

export interface ToggleField {
  kind: 'toggle';
  key: 'multiline' | 'rtl';
  label: string;
  hint: string;
}

export interface BracketsField {
  kind: 'brackets';
  key: 'brackets';
  label: string;
  hint: string;
}

export type OptionField = NumberField | ToggleField | BracketsField;

export const BRACKET_SIDES: readonly BracketType[] = ['left', 'right', 'top', 'bottom'];

const STROKE_WIDTH: NumberField = {
  kind: 'number',
  key: 'strokeWidth',
  label: 'Stroke width',
  min: 1,
  max: 12,
  step: 1,
  unit: 'px',
  hint: 'Thickness of the pen',
};

const PADDING: NumberField = {
  kind: 'number',
  key: 'padding',
  label: 'Padding',
  min: 0,
  max: 24,
  step: 1,
  unit: 'px',
  hint: 'Gap between the text and the annotation',
};

const ITERATIONS: NumberField = {
  kind: 'number',
  key: 'iterations',
  label: 'Iterations',
  min: 1,
  max: 6,
  step: 1,
  hint: 'How many times the stroke is drawn',
};

const AMPLITUDE: NumberField = {
  kind: 'number',
  key: 'amplitude',
  label: 'Amplitude',
  min: 1,
  max: 10,
  step: 1,
  unit: 'px',
  hint: 'Height of each wave',
};

const FREQUENCY: NumberField = {
  kind: 'number',
  key: 'frequency',
  label: 'Frequency',
  min: 1,
  max: 15,
  step: 1,
  hint: 'Waves per 100 pixels of width',
};

const DURATION: NumberField = {
  kind: 'number',
  key: 'animationDuration',
  label: 'Animation',
  min: 0,
  max: 2500,
  step: 100,
  unit: 'ms',
  hint: 'Zero draws the annotation instantly',
};

const MULTILINE: ToggleField = {
  kind: 'toggle',
  key: 'multiline',
  label: 'Multiline',
  hint: 'Annotate each wrapped line on its own',
};

const RTL: ToggleField = {
  kind: 'toggle',
  key: 'rtl',
  label: 'Right to left',
  hint: 'Draw the first stroke the way Arabic reads',
};

const BRACKETS: BracketsField = {
  kind: 'brackets',
  key: 'brackets',
  label: 'Sides',
  hint: 'Sides the bracket is drawn on',
};

const STROKE_TYPE_FIELDS: readonly OptionField[] = [
  STROKE_WIDTH,
  PADDING,
  ITERATIONS,
  DURATION,
  MULTILINE,
  RTL,
];

export const TYPE_FIELDS: Readonly<Record<RoughAnnotationType, readonly OptionField[]>> = {
  underline: STROKE_TYPE_FIELDS,
  'strike-through': STROKE_TYPE_FIELDS,
  'crossed-off': STROKE_TYPE_FIELDS,
  box: [STROKE_WIDTH, PADDING, ITERATIONS, DURATION, MULTILINE],
  circle: [STROKE_WIDTH, PADDING, ITERATIONS, DURATION, MULTILINE],
  highlight: [PADDING, ITERATIONS, DURATION, MULTILINE, RTL],
  bracket: [STROKE_WIDTH, PADDING, DURATION, MULTILINE, BRACKETS],
  wavy: [STROKE_WIDTH, PADDING, ITERATIONS, AMPLITUDE, FREQUENCY, DURATION, MULTILINE, RTL],
};

export const SWATCHES: readonly { value: string; label: string }[] = [
  { value: '#dc2626', label: 'Red' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#ca8a04', label: 'Ochre' },
  { value: '#15803d', label: 'Green' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#1a1714', label: 'Ink' },
];

export const DEFAULT_OPTIONS: AnnotationOptionValues = {
  type: 'underline',
  color: '#dc2626',
  strokeWidth: 2,
  padding: 5,
  iterations: 2,
  multiline: true,
  rtl: false,
  brackets: ['right'],
  amplitude: 3,
  frequency: 5,
  animationDuration: 800,
};

export function typeLabel(type: RoughAnnotationType): string {
  return ANNOTATION_TYPES.find((descriptor) => descriptor.value === type)?.label ?? type;
}
