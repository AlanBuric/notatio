# The Notatio site

The page published at GitHub Pages: a document you can annotate with the library itself.

## Running it

```
pnpm install
pnpm dev
```

The site imports the library from `../../src`, so the packages at the repository root have to be
installed as well, and every change to the library shows up here without a build.

```
pnpm build     # type checks with vue-tsc, then writes dist/
pnpm preview   # serves dist/
```

## How the playground fits together

- `src/annotations/ranges.ts` turns a selection into character offsets into one block of the
  document, and back again. Wrapping a range in an element leaves the block's text untouched, so
  offsets stay valid as annotations come and go.
- `src/annotations/schema.ts` lists the option each annotation type reads, which is what the
  toolbar renders its inputs from.
- `src/composables/playground.ts` owns the annotations: it draws them, keeps them in local storage,
  and applies toolbar changes to the one being edited.
- `src/components/DocumentSheet.vue` is the document. Its markup is static on purpose, since the
  playground annotates it by inserting real elements that a re-render would throw away. Each
  annotatable block carries a `data-block` attribute, which is the name its annotations are stored
  under, so renaming one drops the annotations saved against it.
