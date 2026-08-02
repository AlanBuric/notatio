import { REDUCED_MOTION_QUERY } from './constants.js';
import type { AnimateOption } from './types.js';

interface ResolvedAnimation {
  onShow: boolean;
  onHide: boolean;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Drawing is animated by default, removal is not. A reduced-motion preference
 * overrides both, so callers cannot opt back into motion the user declined.
 */
export function resolveAnimation(animate: AnimateOption | undefined): ResolvedAnimation {
  if (prefersReducedMotion()) return { onShow: false, onHide: false };

  if (typeof animate === 'boolean') return { onShow: animate, onHide: false };

  return { onShow: animate?.onShow ?? true, onHide: animate?.onHide ?? false };
}
