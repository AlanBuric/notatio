# Changelog

## 1.0.0

First release under the name Notatio, forked from rough-notation 0.5.1.

The library does the same job it always did, and most code moves over by changing the import. The sections below cover what changed, why, and what to write instead.

### Migrating from rough-notation

Install `notatio` in place of `rough-notation` and update the import. The package is ESM only, so a CDN usage needs `<script type="module">`.

```javascript
// Before
import { annotate, annotationGroup } from 'rough-notation';

// After
import { annotate, annotationGroup } from 'notatio';
```

`animateOnHide` is now part of `animate`.

```javascript
// Before
annotate(element, { type: 'underline', animateOnHide: true });

// After
annotate(element, { type: 'underline', animate: { onHide: true } });
```

CSS that targets the injected SVG or the stroke keyframe needs the new names.

```css
/* Before */
.rough-annotation {
}
@keyframes rough-notation-dash {
}

/* After */
.notatio-annotation {
}
@keyframes notatio-dash {
}
```

If TypeScript now rejects a config it used to accept, the option is one the chosen type never read. Drop it, or switch to the type that does read it.

```javascript
annotate(element, { type: 'bracket', iterations: 3 }); // iterations: bracket draws one per side
annotate(element, { type: 'highlight', strokeWidth: 4 }); // strokeWidth: derived from the element height
annotate(element, { type: 'box', rtl: true }); // rtl: box has no stroke direction
annotate(element, { type: 'underline', brackets: 'left' }); // brackets: bracket only
```

Nothing else needs changing. `show()`, `hide()` and `remove()` keep their old behaviour for callers that ignore the return value, and every other option keeps its name and meaning.

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
- `show()` and `hide()` return a promise resolving when the animation finishes, on both annotations and groups ([rough-notation#61](https://github.com/rough-stuff/rough-notation/issues/61)).
- `animate.onHide` plays the drawing animation in reverse on `hide()` ([rough-notation#57](https://github.com/rough-stuff/rough-notation/issues/57), [PR #88](https://github.com/rough-stuff/rough-notation/pull/88)).
- `zIndex` sets the `z-index` of the annotation SVG ([rough-notation#83](https://github.com/rough-stuff/rough-notation/issues/83), [#80](https://github.com/rough-stuff/rough-notation/issues/80)).
- `textColor` recolors the element while the annotation is showing, so a dark highlight does not swallow dark text ([rough-notation#82](https://github.com/rough-stuff/rough-notation/issues/82)).
- `observeResize` and a public `detachListeners()` let callers drive their own redraw ([rough-notation#90](https://github.com/rough-stuff/rough-notation/issues/90)).
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

- Resize redraws are batched into an animation frame instead of waiting out a fixed 400ms debounce. Every annotation in a batch is measured before any is redrawn, so a batch cannot interleave layout reads with writes, and an annotation whose rect did not actually change is skipped ([rough-notation PR #89](https://github.com/rough-stuff/rough-notation/pull/89)).
- Build moves from tsc plus Rollup to Vite, with declarations from vite-plugin-dts.
- tslint is replaced by ESLint and Prettier.
- Test suite added, running under Node and real Chromium.
