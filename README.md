# Notatio

[![npm](https://img.shields.io/npm/v/notatio)](https://www.npmjs.com/package/notatio)
[![bundle size](https://img.shields.io/bundlejs/size/notatio)](https://bundlejs.com/?q=notatio)
[![license](https://img.shields.io/npm/l/notatio)](LICENSE)
[![CI](https://github.com/AlanBuric/notatio/actions/workflows/ci.yml/badge.svg)](https://github.com/AlanBuric/notatio/actions/workflows/ci.yml)

Create and animate hand-drawn annotations on any HTML element.

Notatio uses [RoughJS](https://roughjs.com) to underline, box, circle, highlight, strike through, cross off, bracket or squiggle anything already on the page. Annotations follow the text, in horizontal and vertical writing modes alike. It has no runtime dependencies and ships as an ES module with TypeScript types, at 6 kB gzipped.

It is a maintained fork of [rough-notation](https://github.com/rough-stuff/rough-notation), whose last release was 0.5.1. If you are coming from there:

- Annotations stay correct under a `transform: scale()` ancestor, and follow their element when it moves rather than only when it resizes.
- Writing modes are understood, so vertical text is annotated along the text rather than across it.
- `show()` and `hide()` return promises, every option is settable, and the config is a discriminated union that rejects options the chosen type does not read.
- Smaller, with no runtime dependency on RoughJS: only the stroke renderers are bundled.

The [changelog](CHANGELOG.md) lists every difference, including the upstream issues and pull requests that were folded in.

## Annotation types

| Type             | Draws                                                    |
| ---------------- | -------------------------------------------------------- |
| `underline`      | A sketchy line alongside the element.                    |
| `box`            | A box around the element.                                |
| `circle`         | A circle around the element.                             |
| `highlight`      | A highlighter effect behind the element.                 |
| `strike-through` | Lines through the middle of the element.                 |
| `crossed-off`    | An X across the element.                                 |
| `bracket`        | A bracket beside the element, usually a paragraph.       |
| `wavy`           | An underline along a sine wave, for a spellchecker look. |
| `zigzag`         | The same wave, with sharp corners instead of curves.     |

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

### Vertical text

Annotations read the element's `writing-mode`, so nothing extra is needed for vertical text. This underline runs down the column, on its left.

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

Notatio is framework agnostic: it takes an element and draws beside it. The only thing to get right is calling `remove()` when the component goes away.

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

Annotations are decoration, and Notatio treats them as such:

- The annotation SVG carries `aria-hidden="true"`, so its strokes are not announced.
- It is `pointer-events: none`, so it never intercepts clicks, hover or selection.
- Animation is skipped when the user has `prefers-reduced-motion: reduce` set. This is checked before the `animate` option is read, so no configuration can draw motion the user has declined.
- Annotating does not change the element's text. Only `highlight` touches the element at all, setting `position: relative` when it is otherwise `static`.

Two things are left to you:

**An annotation that carries meaning needs that meaning somewhere else.** A strike-through that means "completed", or a wavy underline that means "misspelled", is invisible to a screen reader by design, because announcing every decorative underline would be worse. Put the meaning in the text, or on the annotated element:

```html
<span aria-label="Misspelled: recieve">recieve</span>
```

**Check the contrast of a highlight.** It paints behind the text, so a dark highlight under dark text fails WCAG contrast no matter what the library does.

## Browser support

Notatio targets ES2022 and uses `ResizeObserver`, `IntersectionObserver`, `Element.getAnimations()` and `structuredClone()`. That puts the floor at roughly Chrome 98, Firefox 94 and Safari 15.4, all from early 2022.

## Documentation

The [API reference](docs/API.md) covers every annotation type, all configuration options, writing modes, the annotation and group objects, accessibility and styling hooks.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE).

## Credits

Notatio is a fork of [rough-notation](https://github.com/rough-stuff/rough-notation) by [Preet Shihn](https://github.com/pshihn), who also wrote [RoughJS](https://roughjs.com), which does the drawing.
A couple of open issues and pull requests were also applied from the source repository.
