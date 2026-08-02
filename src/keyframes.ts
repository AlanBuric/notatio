import { KEYFRAME_NAME, PATH_LENGTH_PROPERTY, REVERSE_KEYFRAME_NAME } from './constants.js';

let styleElement: HTMLStyleElement | undefined;

/**
 * Reinjects the rule if it is gone. A client-side router replacing
 * `document.head` would otherwise leave annotations stuck at full
 * stroke-dashoffset, meaning invisible.
 */
export function ensureKeyframes(): void {
  if (styleElement?.isConnected) return;

  styleElement = document.createElement('style');
  styleElement.textContent =
    `@keyframes ${KEYFRAME_NAME} { to { stroke-dashoffset: 0; } }` +
    `@keyframes ${REVERSE_KEYFRAME_NAME} { to { stroke-dashoffset: var(${PATH_LENGTH_PROPERTY}); } }`;

  document.head.appendChild(styleElement);
}
