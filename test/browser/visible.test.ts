import { afterEach, describe, expect, it, vi } from 'vitest';
import { annotate } from '@/index.js';
import type { RoughAnnotationConfig } from '@/types.js';
import { cleanup, mountContainer, nextFrame, getPathsFor } from './helpers.js';

afterEach(cleanup);

/** Mounts an element below the fold, so the observer starts out reporting it as hidden. */
function mountBelowFold(): HTMLElement {
  const container = mountContainer();
  const spacer = document.createElement('div');
  const element = document.createElement('div');

  /* mountContainer pins its container to the top left, which would leave the
     element on screen no matter how much space precedes it. */
  container.style.position = 'static';
  spacer.style.height = '200vh';
  element.textContent = 'annotate me';
  container.append(spacer, element);

  return element;
}

function scrollTo(element: HTMLElement): void {
  element.scrollIntoView();
}

function scrollAway(): void {
  window.scrollTo(0, 0);
}

/** The observer fires asynchronously, so assertions have to be retried. */
function waitForPaths(element: HTMLElement, count: number): Promise<void> {
  return vi.waitFor(() => expect(getPathsFor(element).length).toBe(count));
}

afterEach(scrollAway);

describe('showOnVisible', () => {
  it('does not draw while the element is out of view', async () => {
    const element = mountBelowFold();

    annotate(element, { type: 'underline', showOnVisible: true });

    await nextFrame();
    await nextFrame();

    expect(getPathsFor(element)).toHaveLength(0);
  });

  it('draws once the element scrolls into view', async () => {
    const element = mountBelowFold();
    const annotation = annotate(element, { type: 'underline', showOnVisible: true });

    scrollTo(element);
    await waitForPaths(element, 2);

    expect(annotation.isShowing()).toBe(true);
  });

  it('draws immediately when the element is already in view', async () => {
    const container = mountContainer();
    const element = document.createElement('div');

    element.textContent = 'annotate me';
    container.appendChild(element);

    annotate(element, { type: 'underline', showOnVisible: true });

    await waitForPaths(element, 2);
  });

  it('accepts observer options', async () => {
    const element = mountBelowFold();

    /* threshold 1 only ever resolves for an element that fits the viewport. */
    element.style.width = '100px';

    annotate(element, {
      type: 'underline',
      showOnVisible: { threshold: 1, rootMargin: '0px' },
    });

    scrollTo(element);
    await waitForPaths(element, 2);
  });

  /* A DOM node cannot be structured-cloned, so the config copy has to leave it out. */
  it('accepts a scrolling root without choking on the config copy', async () => {
    const container = mountContainer();
    const root = document.createElement('div');
    const spacer = document.createElement('div');
    const element = document.createElement('div');

    root.style.cssText = 'overflow:auto;height:100px;';
    spacer.style.height = '400px';
    element.textContent = 'annotate me';
    root.append(spacer, element);
    container.appendChild(root);

    annotate(element, { type: 'underline', showOnVisible: { root } });

    await nextFrame();
    await nextFrame();
    expect(getPathsFor(element)).toHaveLength(0);

    root.scrollTop = root.scrollHeight;
    await waitForPaths(element, 2);
  });

  it('stays drawn after the element leaves again', async () => {
    const element = mountBelowFold();
    const annotation = annotate(element, { type: 'underline', showOnVisible: true });

    scrollTo(element);
    await waitForPaths(element, 2);

    scrollAway();
    await nextFrame();
    await nextFrame();

    expect(annotation.isShowing()).toBe(true);
    expect(getPathsFor(element)).toHaveLength(2);
  });

  it('hides and redraws on every pass when repeat is set', async () => {
    const element = mountBelowFold();
    const annotation = annotate(element, {
      type: 'underline',
      showOnVisible: { repeat: true },
    });

    scrollTo(element);
    await waitForPaths(element, 2);

    scrollAway();
    await vi.waitFor(() => expect(annotation.isShowing()).toBe(false));
    expect(getPathsFor(element)).toHaveLength(0);

    scrollTo(element);
    await waitForPaths(element, 2);
  });

  it('stops observing once the annotation is removed', async () => {
    const element = mountBelowFold();

    annotate(element, { type: 'underline', showOnVisible: true }).remove();

    scrollTo(element);
    await nextFrame();
    await nextFrame();

    expect(getPathsFor(element)).toHaveLength(0);
  });

  it('is off by default, leaving the caller to call show()', async () => {
    const element = mountBelowFold();

    annotate(element, { type: 'underline' });

    scrollTo(element);
    await nextFrame();
    await nextFrame();

    expect(getPathsFor(element)).toHaveLength(0);
  });

  it('is accepted by every annotation type', async () => {
    const configs: RoughAnnotationConfig[] = [
      { type: 'box', showOnVisible: true },
      { type: 'highlight', showOnVisible: { threshold: 0.5 } },
      { type: 'wavy', showOnVisible: true },
    ];

    for (const config of configs) {
      const element = mountBelowFold();

      annotate(element, config);
      scrollTo(element);

      await vi.waitFor(() => expect(getPathsFor(element).length).toBeGreaterThan(0));
    }
  });
});
