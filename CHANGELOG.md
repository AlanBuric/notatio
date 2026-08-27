# Changelog

## 1.0.0

First release under the name Notatio, forked from rough-notation 0.5.1. It does the same job as the fork, but with lots of API, performance and feature improvements and breaking changes.

### Breaking

- `animateOnHide` is folded into `animate`, which now accepts `boolean | { onShow?: boolean; onHide?: boolean }`. Use `animate: { onHide: true }` in place of `animateOnHide: true`. The object form also makes animating only the removal expressible, which the two separate flags could not express.
- The config is a discriminated union on `type`. Passing an option the chosen type does not read is a compile error rather than being silently ignored: `iterations` on `bracket`, `strokeWidth` on `highlight`, `brackets` on any other type, `rtl` on `box` or `circle`. The annotation object returned by `annotate()` keeps every option settable, since a value the type ignores is harmless once the annotation exists.
- `show()` and `hide()` return `Promise<void>` rather than `void`. Existing calls that ignore the return value keep working.
- ESM only. The CommonJS and IIFE builds are removed, along with the `RoughNotation` global. Use `<script type="module">` for CDN usage.
- The annotation CSS class is now `notatio-annotation`, previously `rough-annotation`, and the keyframe is `notatio-dash`, previously `rough-notation-dash`.
- Requires a browser supporting ES2022.

### Added

- `wavy`, an underline drawn along a sine wave, shaped by `amplitude` and `frequency`. `frequency` counts complete waves per 100px of width, so the wavelength holds steady across elements of different widths, and is rounded to a whole number of waves so the stroke starts and ends on the baseline.
- `showOnVisible` draws the annotation the first time the element scrolls into view, using an `IntersectionObserver`. `true` uses the platform defaults; the object form takes `root`, `rootMargin` and `threshold`, plus `repeat` to hide the annotation again when the element leaves and redraw it when it returns. Without `repeat` the observer is dropped after the first draw.
- Every option is settable on the annotation object. rough-notation declared the full option set on its annotation type but only implemented accessors for `animate`, `animationDuration`, `iterations`, `color`, `strokeWidth` and `padding`, so reading `zIndex`, `multiline`, `rtl` or `brackets` gave `undefined` and writing one was silently dropped.
- `show()` and `hide()` return a promise resolving when the animation finishes, on both annotations and groups ([rough-notation#61](https://github.com/rough-stuff/rough-notation/issues/61)).
- `animate.onHide` plays the drawing animation in reverse on `hide()` ([rough-notation#57](https://github.com/rough-stuff/rough-notation/issues/57), [PR #88](https://github.com/rough-stuff/rough-notation/pull/88)).
- `zIndex` sets the `z-index` of the annotation SVG ([rough-notation#83](https://github.com/rough-stuff/rough-notation/issues/83), [#80](https://github.com/rough-stuff/rough-notation/issues/80)).
- `observeResize` lets callers drive their own redraw, settable in the config and on the annotation. [rough-notation#90](https://github.com/rough-stuff/rough-notation/issues/90) asked for a way to detach the internal listener because its 400ms debounce fought with the caller's own `ResizeObserver`. That debounce is gone, so the remaining need is only to turn the listeners off, which one option covers without a second method beside it.
- `roughness` controls how far strokes wander off a straight/geometric path, previously fixed at 1.5 (3 for `highlight`) ([rough-notation#73](https://github.com/rough-stuff/rough-notation/issues/73)).
- The annotation SVG carries `aria-hidden="true"`, keeping decorative strokes out of the accessibility tree.
- Animation is skipped when `prefers-reduced-motion: reduce` is set, whatever `animate` is configured to.

### Fixed

- Annotations follow their element when it moves. The SVG now sits at its static position and shifts with the element in flow, where before it was pinned to the containing block and only corrected on a resize, which never fires for a move.
- Annotations are positioned and sized correctly under a `transform: scale()` ancestor. Element bounds are mapped through the SVG's inverse screen CTM instead of subtracting one client rect from another ([rough-notation#75](https://github.com/rough-stuff/rough-notation/issues/75)).
- Zero-valued `strokeWidth`, `iterations` and `animationDuration` are honoured instead of falling back to their defaults, which is what applying them with `||` used to do.
- Annotations no longer render invisible after a client-side route change that replaces `document.head`. The keyframes rule is reinjected when it goes missing ([rough-notation#86](https://github.com/rough-stuff/rough-notation/issues/86)).
- The build works against roughjs 4.6.6, which dropped `combineNestedSvgPaths` ([rough-notation#67](https://github.com/rough-stuff/rough-notation/issues/67)).
- A package `exports` map replaces the bare `main` field ([rough-notation#78](https://github.com/rough-stuff/rough-notation/issues/78)).

### Changed

- Setting any option that changes the drawing redraws a visible annotation, where rough-notation redrew only for `color`, `strokeWidth` and `padding`. `animate` and `animationDuration` still apply from the next `show()` or `hide()`, since redrawing on those would cancel the animation in flight.
- `showOnVisible` is accepted by `annotate()` but is not settable on the annotation object, unlike every other option. It only decides when the first draw happens, so changing it later has nothing to act on.
- Resize redraws are batched into an animation frame instead of waiting out a fixed 400ms debounce. Every annotation in a batch is measured before any is redrawn, so a batch cannot interleave layout reads with writes, and an annotation whose rect did not actually change is skipped ([rough-notation PR #89](https://github.com/rough-stuff/rough-notation/pull/89)).
- Build moves from tsc plus Rollup to Vite, with declarations from vite-plugin-dts.
- tslint is replaced by ESLint and Prettier.
- Test suite added, running under Node and real Chromium.
