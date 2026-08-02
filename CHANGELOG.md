# Changelog

## 1.0.0

First release under the name Notatio, forked from rough-notation 0.5.1.

### Breaking

- ESM only. The CommonJS and IIFE builds are removed, along with the `RoughNotation` global.
- The annotation CSS class is now `notatio-annotation`, previously `rough-annotation`, and the keyframe is `notatio-dash`, previously `rough-notation-dash`.
- Requires a browser supporting ES2022.

### Added

- `zIndex` sets the `z-index` of the annotation SVG ([rough-notation#83](https://github.com/rough-stuff/rough-notation/issues/83), [#80](https://github.com/rough-stuff/rough-notation/issues/80)).
- `textColor` recolors the element while the annotation is showing, so a dark highlight does not swallow dark text ([rough-notation#82](https://github.com/rough-stuff/rough-notation/issues/82)).
- `observeResize` and a public `detachListeners()` let callers drive their own redraw ([rough-notation#90](https://github.com/rough-stuff/rough-notation/issues/90)).
- The annotation SVG carries `aria-hidden="true"`, keeping decorative strokes out of the accessibility tree.
- Animation is skipped when `prefers-reduced-motion: reduce` is set.

### Fixed

- Annotations are positioned and sized correctly under a `transform: scale()` ancestor ([rough-notation#75](https://github.com/rough-stuff/rough-notation/issues/75)).

- Zero-valued `strokeWidth`, `iterations` and `animationDuration` are honoured instead of falling back to their defaults.
- Annotations no longer render invisible after a client-side route change that replaces `document.head` ([rough-notation#86](https://github.com/rough-stuff/rough-notation/issues/86)).
- The build works against roughjs 4.6.6, which dropped `combineNestedSvgPaths` ([rough-notation#67](https://github.com/rough-stuff/rough-notation/issues/67)).
- A package `exports` map replaces the bare `main` field ([rough-notation#78](https://github.com/rough-stuff/rough-notation/issues/78)).

### Changed

- Build moves from tsc plus Rollup to Vite, with declarations from vite-plugin-dts.
- tslint is replaced by ESLint and Prettier.
- Test suite added, running under Node and real Chromium.
