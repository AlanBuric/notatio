# Notatio

Create and animate hand-drawn annotations on any HTML element.

Notatio uses [RoughJS](https://roughjs.com) to underline, box, circle, highlight, strike through, cross off, bracket or squiggle anything already on the page. It has no runtime dependencies and ships as an ES module with TypeScript types.

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

Options can be changed afterwards, and a visible annotation redraws itself.

```javascript
annotation.color = 'seagreen';
```

Annotations can also draw themselves the first time the element scrolls into view.

```javascript
annotate(element, {
  type: 'highlight',
  color: '#1e293b',
  textColor: '#f8fafc',
  showOnVisible: { threshold: 0.5, repeat: true },
});
```

Group annotations to animate them one after another, in the order given.

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

## Documentation

The [API reference](docs/API.md) covers every annotation type, all configuration options, the annotation and group objects, and styling hooks.

Migrating from rough-notation? The [changelog](CHANGELOG.md) lists the renames and signature changes, each with a one-line migration.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE).

## Credits

Notatio is a fork of [rough-notation](https://github.com/rough-stuff/rough-notation) by [Preet Shihn](https://github.com/pshihn), who also wrote [RoughJS](https://roughjs.com), which does the drawing.
