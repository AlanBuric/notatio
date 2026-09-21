import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '@/index.js';
import { cleanup } from './helpers.js';

const trailingContainers: HTMLElement[] = [];

afterEach(() => {
  trailingContainers.splice(0).forEach((container) => container.remove());
  cleanup();
});

function mountTrailingContainer(): HTMLDivElement {
  const container = document.createElement('div');
  const top = document.documentElement.scrollHeight + 50;

  container.style.cssText = `position:absolute;top:${top}px;left:0;width:600px;font:16px/1.5 monospace;`;
  document.body.appendChild(container);
  trailingContainers.push(container);

  return container;
}

describe('layout footprint', () => {
  it('does not stretch the page past the last element on it', async () => {
    const container = mountTrailingContainer();
    const element = document.createElement('p');

    element.textContent = 'Last thing on the page';
    element.style.cssText = 'margin:0;';
    container.appendChild(element);

    const before = document.documentElement.scrollHeight;

    annotate(element, { type: 'underline', animate: false, padding: 0 }).show();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(document.documentElement.scrollHeight - before).toBeLessThan(20);
  });

  it('does not stretch the page past the first element on it, for a highlight', async () => {
    const container = mountTrailingContainer();
    const element = document.createElement('p');

    element.textContent = 'First thing on the page';
    element.style.cssText = 'margin:0;';
    container.appendChild(element);

    const before = document.documentElement.scrollHeight;

    annotate(element, { type: 'highlight', animate: false }).show();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(document.documentElement.scrollHeight - before).toBeLessThan(20);
  });
});
