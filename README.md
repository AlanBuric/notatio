# Notatio

A small JavaScript library to create and animate annotations on a web page.

Notatio uses [RoughJS](https://roughjs.com) to give annotations a hand-drawn look and feel. Elements can be annotated in a number of styles, and the animation can be retimed or turned off.

It has no runtime dependencies.

Notatio is a fork of [rough-notation](https://github.com/rough-stuff/rough-notation) by Preet Shihn, updated for current tooling and browsers. See [Differences from rough-notation](#differences-from-rough-notation) if you are migrating.

## Installation

```
npm install notatio
```

Or load the ES module directly:

```html
<script type="module">
  import { annotate } from 'https://unpkg.com/notatio';
</script>
```

## Usage

Create an annotation by passing the element to annotate and a config describing the style, then call `show()`.

```javascript
import { annotate } from 'notatio';

const element = document.querySelector('#myElement');
const annotation = annotate(element, { type: 'underline' });

annotation.show();
```

This inserts an SVG as a sibling of the element, which can be awkward in places that restrict their children, such as a `<table>`. Wrap the content in an inner `<span>` or `<div>` in those cases.

Annotations are measured from the element's rendered size. If a web font is still loading when you call `show()`, the annotation will be sized against the fallback font. Wait for `document.fonts.ready` if that applies.

## Annotation groups

A group animates its annotations one after another, in the order given rather than DOM order.

```javascript
import { annotate, annotationGroup } from 'notatio';

const a1 = annotate(document.querySelector('#e1'), { type: 'underline' });
const a2 = annotate(document.querySelector('#e2'), { type: 'box' });
const a3 = annotate(document.querySelector('#e3'), { type: 'circle' });

annotationGroup([a3, a1, a2]).show();
```

## Configuration

`type` is the only required field.

| Option              | Type                           | Default        | Description                                                                 |
| ------------------- | ------------------------------ | -------------- | --------------------------------------------------------------------------- |
| `type`              | `RoughAnnotationType`          | required       | The annotation style. See below.                                            |
| `animate`           | `boolean \| AnimationOptions`  | `true`         | Whether to animate the drawing. See below.                                  |
| `animationDuration` | `number`                       | `800`          | Duration in milliseconds. `0` draws instantly.                              |
| `color`             | `string`                       | `currentColor` | Stroke color.                                                               |
| `strokeWidth`       | `number`                       | `2`            | Every type except `highlight`, which derives it from the element height.    |
| `padding`           | `RoughPadding`                 | `5`            | Gap between the element and the annotation.                                 |
| `iterations`        | `number`                       | `2`            | Number of strokes. Every type except `bracket`, which draws one per side.   |
| `brackets`          | `BracketType \| BracketType[]` | `'right'`      | `bracket` only.                                                             |
| `amplitude`         | `number`                       | `3`            | `wavy` only. Peak distance from the baseline, in pixels.                    |
| `frequency`         | `number`                       | `5`            | `wavy` only. Complete waves per 100px of width.                             |
| `multiline`         | `boolean`                      | `false`        | Annotate each wrapped line of inline text separately.                       |
| `rtl`               | `boolean`                      | `false`        | Types drawn as back-and-forth strokes, so not `box`, `circle` or `bracket`. |
| `zIndex`            | `number`                       | unset          | `z-index` of the annotation SVG.                                            |
| `textColor`         | `string`                       | unset          | Applied to the element's `color` while the annotation is showing.           |
| `observeResize`     | `boolean`                      | `true`         | Redraw on element and window resize.                                        |
| `showOnVisible`     | `boolean \| VisibilityOptions` | unset          | Draw when the element first scrolls into view. See below.                   |

### animate

`true` animates the drawing and removes instantly. The object form controls each direction independently.

```javascript
annotate(element, { type: 'underline', animate: { onHide: true } });
annotate(element, { type: 'underline', animate: { onShow: false, onHide: true } });
```

`onShow` defaults to `true` and `onHide` to `false`, so `animate: true` and `animate: {}` mean the same thing. Animation is skipped entirely when the user has `prefers-reduced-motion: reduce` set, whatever is configured here.

### textColor

A dark highlight can swallow dark text. `textColor` recolors the element while the annotation is showing and restores the previous value on `hide()` or `remove()`.

```javascript
annotate(element, { type: 'highlight', color: '#000', textColor: '#fff' }).show();
```

### showOnVisible

Draws the annotation the first time the element scrolls into view, so it does not animate off screen where nobody sees it.

```javascript
annotate(element, { type: 'underline', showOnVisible: true });
```

There is no need to call `show()` yourself. `true` uses the platform defaults, which fire as soon as any part of the element enters the viewport. The object form takes `root`, `rootMargin` and `threshold`, passed straight through to `IntersectionObserver`, plus `repeat`.

```javascript
annotate(element, { type: 'box', showOnVisible: { threshold: 0.5 } });
```

By default the annotation is drawn once and the observer is dropped. `repeat` keeps it, hiding the annotation when the element leaves and drawing it again when it returns.

```javascript
annotate(element, { type: 'box', showOnVisible: { repeat: true } });
```

`remove()` stops the observer. `detachListeners()` does not, since it governs resize redraws only.

### type

- **underline**: a sketchy underline below the element.
- **box**: a box around the element.
- **circle**: a circle around the element.
- **highlight**: a highlighter effect behind the element.
- **strike-through**: horizontal lines through the element.
- **crossed-off**: an X across the element.
- **bracket**: a bracket beside the element, usually a paragraph of text.
- **wavy**: an underline drawn along a sine wave, for a spellchecker look.

### wavy

`wavy` sits where `underline` does and takes the same options, plus the shape of the wave.

```javascript
annotate(element, { type: 'wavy', color: 'red', amplitude: 4, frequency: 8 });
```

`frequency` counts complete waves per 100px of width rather than across the whole element, so a short label and a long heading get the same wavelength. It is rounded to a whole number of waves across the element so the stroke starts and ends on the baseline, which puts the drawn wavelength slightly off the requested one.

### padding

A single number applies to every side. An array follows CSS shorthand order, so `[top, right, bottom, left]`, `[top, right, bottom]`, or `[block, inline]`.

## Annotation object

`annotate()` returns an object with:

- **`isShowing(): boolean`** whether the annotation is currently drawn.
- **`show()`** draws the annotation, animating if configured, and returns a promise that resolves when the animation finishes. Calling it again re-renders at the element's current size and position, without replaying the animation. To replay it, call `hide()` first.
- **`hide()`** removes the drawing, immediately unless `animate.onHide` is set, in which case the strokes retreat the way they were drawn and are removed when the animation ends. Returns a promise that resolves once the annotation is gone. `isShowing()` reports `false` as soon as `hide()` is called. Calling `show()` during the animation cancels it and redraws.
- **`remove()`** unlinks the annotation from the element.
- **`detachListeners()`** stops redrawing on resize, for callers driving their own redraw. The annotation stays drawn, and `show()` reattaches the listeners. Set `observeResize: false` to never attach them.

Every config property is also exposed as a settable property, whatever the type was configured as, since a value the type ignores is harmless once the annotation exists.

```javascript
const annotation = annotate(element, { type: 'underline', color: 'red' });

annotation.show();
annotation.color = 'green';
```

Setting an option that changes the drawing redraws a visible annotation: `color`, `strokeWidth`, `padding`, `iterations`, `multiline`, `rtl`, `brackets`, `amplitude`, `frequency` and `textColor`. Several changes in the same task are coalesced into one redraw.

`animate` and `animationDuration` apply from the next `show()` or `hide()`, so setting one leaves the current drawing alone. `zIndex` restyles the SVG in place, and `observeResize` attaches or detaches the resize listeners.

`type` and `showOnVisible` cannot be changed. `type` decides how the SVG is inserted, and `showOnVisible` only decides when the first draw happens, so both belong to `annotate()`. Create a new annotation instead.

### Waiting for the animation

`show()` and `hide()` both return a promise, so work can follow the animation without a timer. They resolve immediately when nothing is animating.

```javascript
await annotate(element, { type: 'highlight' }).show();
console.log('drawn');
```

Interrupting an animation still settles its promise, so a `show()` cancelled by another `show()` resolves rather than hanging.

## Annotation group object

`annotationGroup()` returns an object with `show()` and `hide()`, which apply to every annotation in the group. Both return a promise that resolves once every annotation in the group has finished.

## Styling

The injected SVG carries the class `notatio-annotation`, and the stroke animation uses the keyframe `notatio-dash`.

## Differences from rough-notation

Notatio 1.0.0 is behaviourally compatible with rough-notation 0.5.1 apart from a handful of renames and signature changes, each with a one-line migration. The [changelog](CHANGELOG.md) covers them in full, along with everything fixed and added.

## Credits

Notatio is a fork of [rough-notation](https://github.com/rough-stuff/rough-notation) by [Preet Shihn](https://github.com/pshihn), who also wrote [RoughJS](https://roughjs.com), which does the drawing.

These third-party wrappers target the original rough-notation, not Notatio:

- [React](https://github.com/linkstrifer/react-rough-notation)
- [Svelte](https://github.com/dimfeld/svelte-rough-notation)
- [Vue](https://github.com/Leecason/vue-rough-notation)
- [Web Component](https://github.com/Matsuuu/vanilla-rough-notation)
- [Angular](https://github.com/mikyaj/ngx-rough-notation)
