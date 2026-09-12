# Changelog

## 1.0.0

First release under the name Notatio, forked from rough-notation 0.5.1. It does the same job as the fork, but with lots
of API, performance and feature improvements and breaking changes.

### Breaking

- `animateOnHide` is folded into `animate`, which now accepts `boolean | { onShow?: boolean; onHide?: boolean }`. Use
  `animate: { onHide: true }` in place of `animateOnHide: true`. The object form also makes animating only the removal
  expressible, which the two separate flags could not express.
- The config is a discriminated union on `type`. Passing an option the chosen type does not read is a compile error
  rather than being silently ignored: `iterations` on `bracket`, `strokeWidth` on `highlight`, `brackets` on any other
  type, `reverse` on `box` or `circle`, `position` on anything but a line type. The annotation object returned by
  `annotate()` keeps every option settable, since a value the type ignores is harmless once the annotation exists.
- `show()` and `hide()` return `Promise<void>` rather than `void`. Existing calls that ignore the return value keep
  working.
- ESM only. The CommonJS and IIFE builds are removed, along with the `RoughNotation` global. Use
  `<script type="module">` for CDN usage.
- The annotation CSS class is now `notatio-annotation`, previously `rough-annotation`, and the keyframe is
  `notatio-dash`, previously `rough-notation-dash`.
- `strike-through` is renamed `strikethrough`.
- `rtl` is renamed `reverse`. It reverses the stroke direction along the text, which is right-to-left only when the text
  runs that way, and reads wrongly under a vertical writing mode.
- Requires a browser supporting ES2022.

### Added

- Writing-mode awareness: annotations read the element's computed `writing-mode` and draw along the text rather than
  along the screen, so an underline on a `vertical-rl` column runs top to bottom on its left, `strikethrough` runs down
  the middle, `highlight` takes its thickness from the column's width, and each stroke reads the padding of the side it
  actually sits on. Nothing has to be configured, and `sideways-rl` and `sideways-lr` follow whichever vertical mode
  shares their block direction.
- `wavy`, an underline drawn along a sine wave, shaped by `amplitude` and `frequency`. `frequency` counts complete waves
  per 100px of text, so the wavelength holds steady across elements of different widths, and is rounded to a whole
  number of waves so the stroke starts and ends on the baseline. A negative `amplitude` mirrors the wave.
- `zigzag`, the same wave sampled only where it crosses and peaks, joined with straight strokes. Drawn as a single
  continuous path per pass rather than one path per segment, so it animates as one stroke.
- `position` puts a line type `under` the text, `over` it, or on `both` sides. The names are logical, so under
  `vertical-rl` they are the left and right of the column, and each side reads its own padding.
- `seed` pins the random variation, making a drawing reproducible across reloads and in screenshot tests. It is assigned
  randomly when omitted and readable from the annotation afterwards, so a variation worth keeping can be captured and
  pasted into the config.
- The RoughJS stroke parameters are configurable: `maxRandomnessOffset`, `bowing`, `curveFitting`, `curveTightness`,
  `curveStepCount` and `preserveVertices`, alongside the existing `roughness`. These are the options that actually reach
  the stroke renderers; the rest of the RoughJS option set only affects fills, which annotations never draw, so exposing
  it would advertise options that silently do nothing.
- `delay` holds an annotation back before it draws, on top of any slot it gets from a group.
- `class` adds a class to the annotation SVG, so an annotation can be reached from a stylesheet. Being set when the SVG
  is created, it applies to the first paint.
- `annotation.svg` exposes the injected SVG, for filters, opacity or a class of your own. It is not a transform target:
  geometry is measured against it, so a transform there is compensated away by the next redraw.
- `pause()` and `resume()` hold and release an animation in progress, including the retreat on `hide()`.
- `annotationGroup()` exposes `remove()` and the `annotations` it was built from.
- `showOnVisible` draws the annotation the first time the element scrolls into view, using an `IntersectionObserver`.
  `true` uses the platform defaults; the object form takes `root`, `rootMargin` and `threshold`, plus `repeat` to hide
  the annotation again when the element leaves and redraw it when it returns. Without `repeat` the observer is dropped
  after the first draw.
- Every option is settable on the annotation object. rough-notation declared the full option set on its annotation type
  but only implemented accessors for `animate`, `animationDuration`, `iterations`, `color`, `strokeWidth` and `padding`,
  so reading `zIndex`, `multiline`, `rtl` or `brackets` gave `undefined` and writing one was silently dropped.
- `show()` and `hide()` return a promise resolving when the animation finishes, on both annotations and groups
  ([rough-notation#61](https://github.com/rough-stuff/rough-notation/issues/61)).
- `animate.onHide` plays the drawing animation in reverse on `hide()`
  ([rough-notation#57](https://github.com/rough-stuff/rough-notation/issues/57), [PR #88](https://github.com/rough-stuff/rough-notation/pull/88)).
- `zIndex` sets the `z-index` of the annotation SVG
  ([rough-notation#83](https://github.com/rough-stuff/rough-notation/issues/83), [#80](https://github.com/rough-stuff/rough-notation/issues/80)).
- `observeResize` lets callers drive their own redraw, settable in the config and on the
  annotation. [rough-notation#90](https://github.com/rough-stuff/rough-notation/issues/90) asked for a way to detach the
  internal listener because its 400ms debounce fought with the caller's own `ResizeObserver`. That debounce is gone, so
  the remaining need is only to turn the listeners off, which one option covers without a second method beside it.
- `roughness` controls how far strokes wander off a straight/geometric path, previously fixed at 1.5 (3 for `highlight`)
  ([rough-notation#73](https://github.com/rough-stuff/rough-notation/issues/73)).
- The annotation SVG carries `aria-hidden="true"`, keeping decorative strokes out of the accessibility tree.
- Animation is skipped when `prefers-reduced-motion: reduce` is set, whatever `animate` is configured to.
- `annotate` can take a `Range`, a `StaticRange`, or a `Selection` as well as an element, so a run of text can be
  annotated without wrapping it in an element of its own. A `StaticRange` becomes a live range; a `Selection` is
  snapshotted by cloning its first range. Geometry comes from the range's client rects and the writing mode from its
  nearest element ancestor, which is where the SVG is inserted. Reflow is tracked with a `ResizeObserver` and a
  `MutationObserver` on that ancestor, `showOnVisible` is measured against the ancestor's visible area, and a range that
  collapses because its boundary nodes were replaced clears the annotation.
- `highlight` puts back the `position: relative` it sets on an otherwise-`static` element when the annotation is
  `remove()`d, rather than leaving it behind.

### Fixed

- Annotations follow their element when it moves. The SVG now sits at its static position and shifts with the element in
  flow, where before it was pinned to the containing block and only corrected on a resize, which never fires for a move.
- Annotations are positioned and sized correctly under a `transform: scale()` ancestor. Element bounds are mapped
  through the SVG's inverse screen CTM instead of subtracting one client rect from another
  ([rough-notation#75](https://github.com/rough-stuff/rough-notation/issues/75)).
- Zero-valued `strokeWidth`, `iterations` and `animationDuration` are kept instead of falling back to their
  defaults, caused by `||`.
- Annotations no longer render invisible after a client-side route change that replaces `document.head`. The keyframes
  rule is reinjected when it goes missing
  ([rough-notation#86](https://github.com/rough-stuff/rough-notation/issues/86)).
- The build works against roughjs 4.6.6, which dropped `combineNestedSvgPaths`
  ([rough-notation#67](https://github.com/rough-stuff/rough-notation/issues/67)).
- A package `exports` map replaces the bare `main` field
  ([rough-notation#78](https://github.com/rough-stuff/rough-notation/issues/78)).

### Changed

- Setting any option that changes the drawing redraws a visible annotation, where rough-notation redrew only for
  `color`, `strokeWidth` and `padding`. `animate` and `animationDuration` still apply from the next `show()` or
  `hide()`, since redrawing on those would cancel the animation in flight.
- `showOnVisible` is accepted by `annotate()` but is not settable on the annotation object, unlike every other option.
  It only decides when the first draw happens, so changing it later has nothing to act on.
- The retreat on `hide()` completes when its animations do, rather than on a `setTimeout` sized to the configured
  duration. A paused hide now genuinely stays on the page instead of being torn down by a timer that kept running.
- Resize redraws are batched into an animation frame instead of waiting out a fixed 400ms debounce. Every annotation in
  a batch is measured before any is redrawn, so a batch cannot interleave layout reads with writes, and an annotation
  whose rect did not actually change is skipped
  ([rough-notation PR #89](https://github.com/rough-stuff/rough-notation/pull/89)).
- Build moved to Vite, with declarations from vite-plugin-dts.
- tslint is replaced by ESLint and Prettier.
- Test suite added: Vitest (Node) and Playwright (Chromium).
- Each annotation draws a single `<path>` element instead of one per stroke pass, RoughJS op-set, or bracket side.
  The CSS animation is now a single continuous `stroke-dashoffset` sweep across the whole path. Apparently one SVG merged path renders faster than multiple.
- SVG path coordinates and stroke lengths (`stroke-dasharray`/`stroke-dashoffset`) are rounded to 3 decimal places, and
  animation durations/delays to 1 decimal place of a millisecond, instead of carrying full floating-point precision into
  the DOM. This shouldn't be visually noticeable.
