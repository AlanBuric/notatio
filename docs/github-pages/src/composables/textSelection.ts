import { onBeforeUnmount, onMounted, type Ref } from 'vue';

/** A drag or a shift-arrow run is over well before this, and touch handles settle within it. */
const SETTLE_DELAY = 400;
const RELEASE_DELAY = 30;

/**
 * Calls back once a selection has stopped changing. Pointer and key releases
 * are handled quickly; the longer timer catches the touch handles, which drag
 * without releasing anything.
 */
export function onSelectionSettled(enabled: Ref<boolean>, callback: () => void): void {
  let timer: number | undefined;

  function schedule(delay: number): void {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (enabled.value) {
        callback();
      }
    }, delay);
  }

  const onSelectionChange = () => schedule(SETTLE_DELAY);
  const onRelease = () => schedule(RELEASE_DELAY);

  onMounted(() => {
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('pointerup', onRelease);
    document.addEventListener('keyup', onRelease);
  });

  onBeforeUnmount(() => {
    clearTimeout(timer);
    document.removeEventListener('selectionchange', onSelectionChange);
    document.removeEventListener('pointerup', onRelease);
    document.removeEventListener('keyup', onRelease);
  });
}
