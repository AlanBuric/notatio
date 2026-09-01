# Migrating from rough-notation

Notatio forked [rough-notation](https://github.com/rough-stuff/rough-notation) 0.5.1, whose last release was in 2022. The two do the same job and most code moves over by changing the import.

```javascript
import { annotate, annotationGroup } from 'notatio';
```

The [changelog](../CHANGELOG.md) lists every difference, including the upstream issues and pull requests that were folded in. This page covers only what breaks.

## Renamed options

| rough-notation           | Notatio                     |
| ------------------------ | --------------------------- |
| `animateOnHide: true`    | `animate: { onHide: true }` |
| `rtl`                    | `reverse`                   |
| `type: 'strike-through'` | `type: 'strikethrough'`     |

`rtl` was renamed because it reverses the stroke direction along the text, which is right-to-left only when the text happens to run that way, and reads wrongly under a vertical writing mode.

## Renamed CSS hooks

The annotation class is `notatio-annotation`, previously `rough-annotation`. The keyframe is `notatio-dash`, previously `rough-notation-dash`. Stylesheets targeting the old names need updating.

## ESM only

The CommonJS and IIFE builds are gone, along with the `RoughNotation` global. Load it as a module:

```html
<script type="module">
  import { annotate } from 'https://unpkg.com/notatio';
</script>
```

## Options are checked against the type

The config is a discriminated union on `type`, so an option the chosen type does not read is a compile error instead of being silently ignored. TypeScript will point at `iterations` on a `bracket`, `strokeWidth` on a `highlight`, `brackets` on anything else, and `reverse` on a `box` or `circle`. Delete them; they never did anything.

The annotation object returned by `annotate()` still accepts every option, whatever the type, since a value the type ignores is harmless once the annotation exists.

## show() and hide() return promises

They previously returned `void`. Calls that ignore the return value keep working unchanged.

## Requires a 2022 browser

Notatio targets ES2022 and uses `ResizeObserver`, `IntersectionObserver`, `Element.getAnimations()` and `structuredClone()`, putting the floor at roughly Chrome 98, Firefox 94 and Safari 15.4.

## What you gain

- Annotations stay correct under a `transform: scale()` ancestor, and follow their element when it moves rather than only when it resizes.
- Writing modes are understood, so vertical text is annotated along the text rather than across it.
- Every option is settable on the annotation object. rough-notation declared them all but only implemented accessors for six.
- New types (`wavy`, `zigzag`) and new options (`position`, `seed`, `delay`, `class`, the RoughJS stroke parameters).
- No runtime dependency on RoughJS: only the stroke renderers are bundled.
