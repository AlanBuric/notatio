import { REDUCED_MOTION_QUERY } from './constants.js';
import type { AnimateOption } from './types.js';

interface ResolvedAnimation {
  onShow: boolean;
  onHide: boolean;
  hideEasing?: string;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/* Checked before the option, so no config can opt back into motion the user declined. */
export function resolveAnimation(animate: AnimateOption | undefined): ResolvedAnimation {
  if (prefersReducedMotion()) return { onShow: false, onHide: false };

  if (typeof animate === 'boolean') return { onShow: animate, onHide: false };

  return {
    onShow: animate?.onShow ?? true,
    onHide: animate?.onHide ?? false,
    hideEasing: animate?.hideEasing,
  };
}
