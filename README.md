# Notatio

[![npm](https://img.shields.io/npm/v/notatio)](https://www.npmjs.com/package/notatio)
[![bundle size](https://img.shields.io/bundlejs/size/notatio)](https://bundlejs.com/?q=notatio)
[![license](https://img.shields.io/npm/l/notatio)](LICENSE)
[![CI](https://github.com/AlanBuric/notatio/actions/workflows/ci.yml/badge.svg)](https://github.com/AlanBuric/notatio/actions/workflows/ci.yml)

Create and animate hand-drawn annotations on any HTML element the way you'd mark up paper.

Notatio uses [RoughJS](https://roughjs.com) to underline, box, circle, highlight, strike through, cross off, bracket or
squiggle anything already on the page. Annotations follow the text, in horizontal and vertical writing modes alike. It
has no runtime dependencies and ships as an ES module with TypeScript types.

## Annotation types

| Type            | Draws                                                    |
| --------------- | -------------------------------------------------------- |
| `underline`     | A sketchy line alongside the element.                    |
| `box`           | A box around the element.                                |
| `circle`        | A circle around the element.                             |
| `highlight`     | A highlighter effect behind the element.                 |
| `strikethrough` | A line through the middle of the element.                |
| `crossed-off`   | An X across the element.                                 |
| `bracket`       | A bracket beside the element, usually a paragraph.       |
| `wavy`          | An underline along a sine wave, for a spellchecker look. |
| `zigzag`        | Wavy, but with sharp corners instead of curves.          |

## Installation

```sh
npm install notatio
pnpm add notatio
yarn add notatio
bun add notatio
deno add npm:notatio
```

Or load the ES module straight from a CDN:

```html
<script type="module">
  import { annotate } from 'https://unpkg.com/notatio';
</script>
```

## Example usage

### Individual annotations

Pass the element to annotate and a config describing the style, then call `show()`.

```javascript
import { annotate } from 'notatio';

const element = document.querySelector('#myElement');
const annotation = annotate(element, {
  type: 'underline',
  color: '#e11d48',
  strokeWidth: 3,
  iterations: 3,
  padding: [2, 0],
  animationDuration: 1200,
  animate: { onHide: true },
});

annotation.show();
```

Certain options can be changed afterwards, causing the visible annotation to redraw itself.

```javascript
annotation.color = 'seagreen';
```

Annotations can also draw themselves the first time the element is scrolled into the view.

```javascript
annotate(element, {
  type: 'highlight',
  color: '#1e293b',
  showOnVisible: { threshold: 0.5, repeat: true },
});
```

### Annotating part of the text

Pass a `Range` (or a `StaticRange`, or a `Selection`) instead of an element to mark up a part of text in place, without
wrapping it in an element.

```javascript
const paragraph = document.querySelector('#note').firstChild;
const range = new Range();
range.setStart(paragraph, 0);
range.setEnd(paragraph, 12);

annotate(range, { type: 'circle', color: 'rebeccapurple' }).show();
```

See the [reference](docs/REFERENCE.md#range-targets) for the trade-offs against an element target.

### Vertical text

Annotations adapt to the element's `writing-mode`. In this example, the underline runs down the column, on its left
side.

```html
<p id="tategaki" style="writing-mode: vertical-rl">縦書きのテキスト</p>
```

```javascript
annotate(document.querySelector('#tategaki'), { type: 'underline' }).show();
```

### Annotation groups

You can group annotations to animate them one after another, in the given order.

```javascript
import { annotate, annotationGroup } from 'notatio';

const heading = annotate(document.querySelector('#heading'), {
  type: 'circle',
  color: 'rebeccapurple',
  padding: 12,
});
const note = annotate(document.querySelector('#note'), {
  type: 'bracket',
  brackets: ['left', 'right'],
  strokeWidth: 2,
});
const typo = annotate(document.querySelector('#typo'), {
  type: 'wavy',
  color: 'red',
  amplitude: 4,
  frequency: 8,
});

await annotationGroup([heading, note, typo]).show();
```

### With a framework

Notatio is framework agnostic: it takes an element and draws beside it. You only need to call `remove()` when the
component umounts.

```jsx
import { useEffect, useRef } from 'react';
import { annotate } from 'notatio';

function Highlighted({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const annotation = annotate(ref.current, { type: 'highlight', color: '#fde68a' });

    annotation.show();

    return () => annotation.remove();
  }, []);

  return <span ref={ref}>{children}</span>;
}
```

## Accessibility

An annotation is an absolutely positioned `<svg>` inserted next to the element, carrying `aria-hidden="true"` and
`pointer-events: none`, so it is out of the accessibility tree and never intercepts clicks, hover or selection. The
annotated element itself is left alone, except by `highlight`, which sets `position: relative` on it when it is
otherwise `static` and puts it back on `remove()`. Animations are disabled whenever `prefers-reduced-motion: reduce`
is set.

You have two responsibilities for accessibility:

- **Put the meaning somewhere a screen reader can read it.** A strikethrough that means "completed" or a wavy underline
  that means "misspelled" is decoration to assistive technology, so the meaning has to live in the text or in an
  `aria-label` on the element.
- **Ensure the WCAG contrast of a highlight.** It paints behind the text, so a dark highlight under dark text fails the
  WCAG contrast guideline.

## Browser support

Notatio targets ES2024 and uses `ResizeObserver`, `MutationObserver`, `IntersectionObserver`,
`Element.getAnimations()` and `structuredClone()`.

## Documentation

The [reference](docs/REFERENCE.md) covers every annotation type, all configuration options, writing modes, the
annotation and group objects, accessibility and styling hooks.

## License

[MIT](LICENSE).

## Credits

Notatio is a fork of [rough-notation](https://github.com/rough-stuff/rough-notation)
by [Preet Shihn](https://github.com/pshihn), who also wrote [RoughJS](https://roughjs.com), which does the drawing.
A couple of open issues and pull requests from the source repository were also applied for new features, improvements
and optimizations.
