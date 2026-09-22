# Reference

The full option list and behaviour of every export. See the [README](../README.md) for a quick start. Or you can just
look at what's exposed via `types.ts`.

## Contents

- [Reference](#reference)
  - [Contents](#contents)
  - [annotate](#annotate)
  - [Configuration](#configuration)
    - [type](#type)
    - [animate](#animate)
    - [delay](#delay)
    - [padding](#padding)
    - [position](#position)
    - [showOnVisible](#showonvisible)
    - [wavy and zigzag](#wavy-and-zigzag)
    - [seed and stroke options](#seed-and-stroke-options)
  - [Range targets](#range-targets)
  - [Writing modes](#writing-modes)
  - [The annotation object](#the-annotation-object)
    - [Changing options after creation](#changing-options-after-creation)
    - [Waiting for the animation](#waiting-for-the-animation)
    - [Pausing an animation](#pausing-an-animation)
    - [Reaching the SVG](#reaching-the-svg)
  - [annotationGroup](#annotationgroup)
  - [Accessibility](#accessibility)
  - [Styling](#styling)
  - [Notes and caveats](#notes-and-caveats)

## annotate

```javascript
import { annotate } from 'notatio';

const annotation = annotate(element, { type: 'underline' });

annotation.show();
```

`annotate(subject, config)` links an annotation to a `subject` and returns
an [annotation object](#the-annotation-object). The `subject` is usually an element, but a
[text range](#range-targets) works too. Nothing is drawn until `show()` is called, unless [
`showOnVisible`](#showonvisible) is set.

## Configuration

`type` is the only required field.

| Option              | Type                           | Default        | Description                                                                    |
| ------------------- | ------------------------------ | -------------- | ------------------------------------------------------------------------------ |
| `type`              | `RoughAnnotationType`          | required       | The annotation style. See [type](#type).                                       |
| `animate`           | `boolean \| AnimationOptions`  | `true`         | Whether to animate the drawing. See [animate](#animate).                       |
| `animationDuration` | `number`                       | `800`          | Duration in milliseconds. `0` draws instantly.                                 |
| `animationEasing`   | `string`                       | `'ease-out'`   | Any valid CSS `animation-timing-function` value.                               |
| `delay`             | `number`                       | `0`            | Milliseconds to wait before drawing. See [delay](#delay).                      |
| `color`             | `string`                       | `currentColor` | Stroke color.                                                                  |
| `strokeWidth`       | `number`                       | `2`            | Every type except `highlight`, which derives it from the element.              |
| `padding`           | `RoughPadding`                 | `5`            | Gap between the element and the annotation. Not `highlight`, `strikethrough` or `crossed-off`. See [padding](#padding). |
| `iterations`        | `number`                       | `2`            | Number of strokes. Every type except `bracket`, which draws one per side.      |
| `position`          | `'under' \| 'over' \| 'both'`  | `'under'`      | Which side of the text a line sits on. See [position](#position).              |
| `reverse`           | `boolean`                      | `direction`    | Draw the first stroke against the text flow. Not `box`, `circle` or `bracket`. |
| `brackets`          | `BracketType \| BracketType[]` | `'right'`      | `bracket` only.                                                                |
| `amplitude`         | `number`                       | `3`            | Wave types only. Peak distance from the baseline, in pixels.                   |
| `frequency`         | `number`                       | `5`            | Wave types only. Complete waves per 100px of text.                             |
| `multiline`         | `boolean`                      | `true`         | Annotate each wrapped line of inline text separately.                          |
| `class`             | `string`                       | unset          | Added to the annotation SVG alongside `notatio-annotation`.                    |
| `zIndex`            | `number`                       | unset          | `z-index` of the annotation SVG.                                               |
| `observeResize`     | `boolean`                      | `true`         | Redraw on element and window resize.                                           |
| `showOnVisible`     | `boolean \| VisibilityOptions` | unset          | Draw when the element first scrolls into view.                                 |
| `seed`              | `number`                       | random         | Pins the random variation. See [seed](#seed-and-stroke-options).               |
| `roughness`         | `number`                       | `1.5`          | How far strokes wander off a straight/geometric path. `3` for `highlight`.     |

Plus the rest of the [stroke options](#seed-and-stroke-options), which tune how RoughJS draws.

Options a type does not support are a type error in TypeScript, so `strokeWidth` on a `highlight` or `amplitude` on a
`box` is caught at compile time.

### type

- **underline**: a sketchy line alongside the element.
- **box**: a box around the element.
- **circle**: a circle around the element.
- **highlight**: a highlighter effect behind the element.
- **strikethrough**: lines through the middle of the element.
- **crossed-off**: an X across the element.
- **bracket**: a bracket beside the element, usually a paragraph of text.
- **wavy**: an underline drawn along a sine wave, for a spellchecker look.
- **zigzag**: the same wave with sharp corners instead of curves.

### animate

`true` animates the drawing and removes instantly. The object form controls each direction independently.

```javascript
annotate(element, { type: 'underline', animate: { onHide: true } });
annotate(element, { type: 'underline', animate: { onShow: false, onHide: true } });
```

`onShow` defaults to `true` and `onHide` to `false`, so `animate: true` and `animate: {}` mean the same thing. Animation
is skipped entirely when the user has `prefers-reduced-motion: reduce` set, whatever is configured here.

The retreat on `hide()` uses `animationEasing` unless `animate.hideEasing` overrides it:

```javascript
annotate(element, {
  type: 'underline',
  animate: { onHide: true, hideEasing: 'ease-in' },
  animationEasing: 'ease-out',
});
```

### delay

Milliseconds to wait before the drawing starts, on top of the slot the annotation gets from
its [group](#annotationgroup). Use it to hold an annotation back without building a group around it.

```javascript
annotate(element, { type: 'underline', delay: 400 });
```

### padding

A single number, or an array of 1 to 4 numbers in CSS shorthand order, sets the gap on each side.

Padding is named physically, but applied logically per [writing mode](#writing-modes).

Unsupported by `highlight`, `strikethrough` and `crossed-off`, since they have no sides to pad.

### position

Which side of the text a line runs along. Applies to `underline`, `wavy` and `zigzag`; the other types either cross the
text or surround it, so there is no side to choose.

```javascript
annotate(element, { type: 'underline', position: 'over' });
annotate(element, { type: 'wavy', position: 'both' });
```

`under` is the default and puts the stroke below horizontal text. `over` puts it above. `both` draws one of each,
doubling the stroke count. Each side uses its own padding.

The names are logical rather than physical, so they follow the text: under `vertical-rl`, `under` is the left of the
column and `over` is the right. See [writing modes](#writing-modes).

`position` never mirrors a wave for you. To flip one, negate its [`amplitude`](#wavy-and-zigzag).

### showOnVisible

Draws the annotation the first time the element scrolls into view, so it does not animate off screen where nobody sees
it.

```javascript
annotate(element, { type: 'underline', showOnVisible: true });
```

There is no need to call `show()` yourself. `true` uses the platform defaults, which fire as soon as any part of the
element enters the viewport. The object form takes `root`, `rootMargin` and `threshold`, passed straight through to
`IntersectionObserver`, plus `repeat`.

```javascript
annotate(element, { type: 'box', showOnVisible: { threshold: 0.5 } });
```

By default the annotation is drawn once and the observer is dropped. `repeat` keeps it, hiding the annotation when the
element leaves and drawing it again when it returns.

```javascript
annotate(element, { type: 'box', showOnVisible: { repeat: true } });
```

`remove()` stops the observer.

### wavy and zigzag

Both sit where `underline` does and take the same options, plus the shape of the wave. `wavy` curves between its points;
`zigzag` samples the same wave only where it crosses and peaks, and joins those with straight strokes.

```javascript
annotate(element, { type: 'wavy', color: 'red', amplitude: 4, frequency: 8 });
annotate(element, { type: 'zigzag', color: 'orange', amplitude: 5, frequency: 4 });
```

`frequency` counts complete waves per 100px of text rather than across the whole element, so a short label and a long
heading get the same wavelength. It is rounded to a whole number of waves across the element so the stroke starts and
ends on the baseline, which puts the drawn wavelength slightly off the requested one.

A negative `amplitude` mirrors the wave, starting it on the other side of the baseline. That is the whole of it: there
is no separate flag.

```javascript
annotate(element, { type: 'wavy', position: 'both', amplitude: -3 });
```

### seed and stroke options

`seed` chooses the random variation. The same seed, options and geometry always draw the same strokes, which makes
annotations reproducible across reloads and in screenshot tests.

It is assigned randomly when the config omits one, and readable from the annotation afterwards, so a variation you like
can be captured and pinned:

```javascript
const annotation = annotate(element, { type: 'circle' });

annotation.show();
console.log(annotation.seed);
```

The rest of the stroke options are RoughJS parameters, passed through to the renderer:

| Option                | Default | Description                                                   |
| --------------------- | ------- | ------------------------------------------------------------- |
| `roughness`           | `1.5`   | How far strokes wander off the ideal path. `0` draws exactly. |
| `maxRandomnessOffset` | `2`     | Ceiling on a single point's random displacement.              |
| `bowing`              | `1`     | How far a straight line bends on its way across.              |
| `curveFitting`        | `0.95`  | How closely an ellipse follows its ideal curve.               |
| `curveTightness`      | `0`     | Slack in the curve through a wave's points.                   |
| `curveStepCount`      | `9`     | Points sampled around an ellipse.                             |
| `preserveVertices`    | `false` | Pins path endpoints in place instead of jittering them.       |

These are the RoughJS options that reach the stroke renderers. RoughJS accepts more, but the rest only affect fills,
which annotations never draw, so they are deliberately not exposed.

## Range targets

`annotate` also takes a `Range`, a `StaticRange`, or a `Selection`, so text can be annotated without wrapping
it in an element.

```javascript
const range = new Range();
range.setStart(node, 10);
range.setEnd(node, 24);

annotate(range, { type: 'underline' }).show();
```

A `StaticRange` is turned into a live range internally. A `Selection` is snapshotted at the call: its first range is
cloned, so a later change to what the user has selected does not move the annotation.

Everything else works as it does for an element: `multiline` annotates each line box of a wrapped range, writing mode
is read from the range's nearest element ancestor, and that ancestor is where the SVG is inserted and what
`highlight` positions. Some things a range cannot do that an element can:

- **Reflow tracking is coarser.** A `ResizeObserver` and a `MutationObserver` on the ancestor, plus the window resize,
  stand in for the `ResizeObserver` an element target puts on the element itself. A change that moves the text without
  resizing the ancestor or mutating its subtree is not caught; call `show()` again to redraw.
- **`showOnVisible` follows the ancestor.** Visibility is measured against the visible portion of the ancestor, so a
  range inside a tall ancestor is only re-checked as that ancestor scrolls through the viewport.
- **A collapsed range clears the annotation.** If the range's boundary nodes are replaced, for instance by a framework
  re-render, the range collapses and the annotation removes itself for good. Re-create it, or target a range whose
  boundary nodes are stable.

## Writing modes

An annotation is drawn along the text rather than along the screen, in the element's computed `writing-mode`. Nothing
has to be configured for this.

Under `horizontal-tb` an underline runs left to right below the text. Under `vertical-rl` the same annotation runs top
to bottom, to the left of the column; under `vertical-lr` it runs to the right. `sideways-rl` and `sideways-lr` follow
whichever of the two shares their block direction.

```html
<p style="writing-mode: vertical-rl">縦書きのテキスト</p>
```

```javascript
annotate(element, { type: 'underline' });
```

This applies throughout: `strikethrough` runs down the middle of a vertical column, `highlight` takes its thickness from
the column's width instead of its height, [`position`](#position) names sides relative to the text, and each of those
uses the padding of the side it actually sits on. `bracket` is the exception, since `brackets: 'left'` names a physical
side by design.

Horizontal `direction: rtl` text works the same way, but only the sweep is affected: the drawn annotation is identical,
and its strokes begin at the start of the reading direction unless `reverse` is set explicitly. The vertical modes
normally flow top to bottom, but `direction: rtl` reverses that to bottom to top, as does `sideways-lr`; setting both
cancels out. `reverse` still overrides whatever the writing mode implies.

## The annotation object

`annotate()` returns an object with:

- **`isShowing(): boolean`** whether the annotation is currently drawn.
- **`show()`** draws the annotation, animating if configured, and returns a promise that resolves when the animation
  finishes. Calling it again re-renders at the element's current size and position, without replaying the animation. To
  replay it, call `hide()` first.
- **`hide()`** removes the drawing, immediately unless `animate.onHide` is set, in which case the strokes retreat the
  way they were drawn and are removed when the animation ends. Returns a promise that resolves once the annotation is
  gone. `isShowing()` reports `false` as soon as `hide()` is called. Calling `show()` during the animation cancels it
  and redraws.
- **`pause()`** and **`resume()`** hold and release an animation in progress.
  See [pausing an animation](#pausing-an-animation).
- **`remove()`** unlinks the annotation from the element.
- **`svg`** the injected SVG. See [reaching the SVG](#reaching-the-svg).
- **`seed`** the variation in use, readable and settable. See [seed](#seed-and-stroke-options).

### Changing options after creation

Every config property is also exposed as a settable property, whatever the type was configured as, since a value the
type ignores is harmless once the annotation exists.

```javascript
const annotation = annotate(element, { type: 'underline', color: 'red' });

annotation.show();
annotation.color = 'green';
```

Setting an option that changes the drawing redraws a visible annotation: `color`, `strokeWidth`, `padding`,
`iterations`, `multiline`, `reverse`, `position`, `brackets`, `amplitude`, `frequency`, `seed` and the rest of
the [stroke options](#seed-and-stroke-options). Several changes in the same task are coalesced into one redraw.

`animate`, `animationDuration`, `animationEasing` and `delay` apply from the next `show()` or `hide()`, so setting one
leaves the current drawing alone. `zIndex` and `class` restyle the SVG in place.

`observeResize` attaches or detaches the resize listeners, so it is the single switch for callers driving their own
redraw. Set it to `false` in the config to never attach them, or on the annotation at any point to stop and start.

```javascript
const annotation = annotate(element, { type: 'underline' });

annotation.show();
annotation.observeResize = false;
```

`type` and `showOnVisible` cannot be changed. `type` decides how the SVG is inserted, and `showOnVisible` only decides
when the first draw happens, so both belong to `annotate()`. Create a new annotation instead.

### Waiting for the animation

`show()` and `hide()` both return a promise, so work can follow the animation without a timer. They resolve immediately
when nothing is animating.

```javascript
await annotate(element, { type: 'highlight' }).show();
console.log('drawn');
```

Interrupting an animation still settles its promise, so a `show()` cancelled by another `show()` resolves rather than
hanging.

### Pausing an animation

`pause()` holds every animation on the annotation where it is, and `resume()` runs them on from that point. Both are
safe to call when nothing is animating.

```javascript
const annotation = annotate(element, { type: 'box', animationDuration: 2000 });

annotation.show();
annotation.pause();
annotation.resume();
```

This covers the retreat on `hide()` as well, since the teardown follows the animations rather than a timer. A paused
`hide()` leaves the strokes on the page until it is resumed, and its promise resolves only once the animation actually
finishes.

### Reaching the SVG

`annotation.svg` is the injected `<svg>`, and is `undefined` after `remove()`. Use it for anything visual the config
does not cover: filters, opacity, a class of your own.

```javascript
annotation.svg.style.opacity = '0.6';
```

Opacity belongs on the SVG rather than on individual strokes: overlapping passes would otherwise darken where they
cross, while opacity on the root composites the whole annotation once.

One thing it is not for is a CSS transform. The element's geometry is measured against the SVG, so a transform on it is
folded into that measurement and the next redraw compensates it away. Transform a wrapper around the annotated element
instead.

## annotationGroup

A group animates its annotations one after another, in the order given rather than DOM order.

```javascript
import { annotate, annotationGroup } from 'notatio';

const a1 = annotate(document.querySelector('#e1'), { type: 'underline' });
const a2 = annotate(document.querySelector('#e2'), { type: 'box' });
const a3 = annotate(document.querySelector('#e3'), { type: 'circle' });

annotationGroup([a3, a1, a2]).show();
```

`annotationGroup()` returns an object with:

- **`show()`** and **`hide()`**, which apply to every annotation in the group. Both return a promise that resolves once
  every annotation in the group has finished.
- **`remove()`**, which removes every annotation in the group.
- **`annotations`**, the annotations it was built from. The group snapshots the array it is handed, so mutating that
  array afterwards does not change the group.

An annotation's own [`delay`](#delay) adds to the slot the group gives it.

## Accessibility

Annotations are decoration, and are treated as such:

- The annotation SVG carries `aria-hidden="true"`, keeping its strokes out of the accessibility tree.
- It is `pointer-events: none`, so it never intercepts clicks, hover or text selection.
- Animation is skipped when `prefers-reduced-motion: reduce` is set. This is checked before `animate` is applied, so no
  configuration can draw motion the user has declined.
- Annotating never changes the element's text content. Only `highlight` touches the element at all, setting
  `position: relative` when it is otherwise `static`, because it paints behind the element rather than in front. That
  is put back on `remove()`.

Two things the library cannot do for you.

**An annotation that carries meaning needs that meaning somewhere else.** A `strikethrough` that means "completed", or a
`wavy` underline that means "misspelled", reaches assistive technology as nothing at all. That is the right default,
since announcing every decorative underline would be noise, but it means the meaning has to live in the text or on the
annotated element:

```html
<span aria-label="Misspelled: recieve">recieve</span>
```

```javascript
annotate(element, { type: 'wavy', color: 'red' });
```

**Check the contrast of a `highlight`.** It paints behind the text, so a dark highlight under dark text fails WCAG
contrast whatever the annotation does. `color` is the highlight's own color, not the text's, and the two have to be
checked together.

## Styling

The injected SVG carries the class `notatio-annotation`, and the stroke animation uses the keyframes `notatio-dash` and
`notatio-dash-reverse`.

`class` adds your own class to the SVG, which is the way to reach an annotation from a stylesheet rather than
imperatively:

```javascript
annotate(element, { type: 'underline', class: 'brand-underline' });
```

```css
@media (prefers-color-scheme: dark) {
  .brand-underline path {
    stroke: #f9a8d4;
  }
}
```

Because it is set when the SVG is created, a rule written this way applies to the very first paint.

## Notes and caveats

Showing an annotation inserts an SVG as a sibling of the element, which can be awkward in places that restrict their
children, such as a `<table>`. Wrap the content in an inner `<span>` or `<div>` in those cases.

Annotations are measured from the element's rendered size. If a web font is still loading when you call `show()`, the
annotation will be sized against the fallback font. Wait for `document.fonts.ready` if that applies.
