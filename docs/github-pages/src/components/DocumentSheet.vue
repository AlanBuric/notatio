<script setup lang="ts">
/**
 * The markup below is deliberately static: the playground annotates it by
 * wrapping selected text in real DOM elements, which Vue would discard if it
 * ever re-rendered this subtree.
 */
</script>

<template>
  <article class="sheet" aria-labelledby="document-title">
    <header class="sheet-header">
      <p class="eyebrow" data-block="eyebrow">A working document, and a demo of itself</p>
      <h1 id="document-title" data-block="title">Notatio</h1>
      <p class="lede" data-block="lede">
        Notatio is a small library that draws hand-drawn annotations over anything already on the
        page: an underline under a phrase, a box around a warning, a highlighter streak across a
        sentence you want people to read twice.
      </p>
    </header>

    <section aria-labelledby="what-it-is">
      <h2 id="what-it-is" data-block="h-what-it-is">What it is</h2>
      <p data-block="what-1">
        Every annotation is an SVG drawn with
        <a href="https://roughjs.com" rel="noopener">RoughJS</a>, so nothing lands quite straight.
        The strokes wobble the way a pen does, and no two are identical. The library ships with no
        runtime dependencies, measures the element you point it at, and gets out of the way.
      </p>
      <p data-block="what-2">
        It annotates elements, not text ranges. You hand it an element and a configuration object,
        and it hands back an annotation you can show, hide, restyle, or remove. This page bridges
        the gap: when you select text below, your selection is wrapped in an element first, and that
        element is what gets annotated.
      </p>
    </section>

    <section aria-labelledby="where-it-helps">
      <h2 id="where-it-helps" data-block="h-where">Where it helps</h2>
      <ul>
        <li data-block="use-1">
          Product tours and onboarding, where a circle around the button beats an arrow pointing at
          it.
        </li>
        <li data-block="use-2">
          Slide decks and talks, where a strike-through lands better than a bullet that says the
          idea was wrong.
        </li>
        <li data-block="use-3">
          Documentation, marking the one line of a code sample that actually changed.
        </li>
        <li data-block="use-4">
          Review and feedback tools, where a wavy underline reads as "look again" without any
          legend.
        </li>
        <li data-block="use-5">
          Landing pages, giving a headline the weight of something a person marked up by hand.
        </li>
      </ul>
    </section>

    <section aria-labelledby="how-it-works">
      <h2 id="how-it-works" data-block="h-how">How it works</h2>
      <ol>
        <li data-block="how-1">
          You call <code>annotate(element, config)</code>. Nothing is drawn yet; the annotation is
          attached to the element and waits.
        </li>
        <li data-block="how-2">
          On <code>show()</code>, the element is measured through its client rectangles, so text
          that wraps across several lines can be annotated line by line.
        </li>
        <li data-block="how-3">
          RoughJS turns that geometry into sketchy paths, which go into an SVG inserted as a sibling
          of the element and positioned over it.
        </li>
        <li data-block="how-4">
          The paths animate by retreating their dash offset, which is why an underline looks drawn
          rather than faded in. Set a duration of zero, or ask the browser for reduced motion, and
          it simply appears.
        </li>
        <li data-block="how-5">
          A resize observer redraws the annotation when the element or the window changes size, so
          it stays on top of its text.
        </li>
      </ol>
    </section>

    <section aria-labelledby="the-types">
      <h2 id="the-types" data-block="h-types">The eight types</h2>
      <p data-block="types-intro">
        <strong>Underline</strong> and <strong>wavy</strong> sit below the text, the second along a
        sine wave for a spellchecker look. <strong>Box</strong> and <strong>circle</strong> enclose
        it. <strong>Highlight</strong> lays a marker streak behind it.
        <strong>Strike-through</strong> and <strong>crossed-off</strong> cancel it, with one line or
        with two. <strong>Bracket</strong> stands beside it, which suits a whole paragraph better
        than a single word.
      </p>
    </section>

    <section aria-labelledby="both-directions">
      <h2 id="both-directions" data-block="h-directions">Both directions</h2>
      <p data-block="dir-1">
        Strokes are drawn back and forth, so they have a direction, and a script that runs
        right-to-left wants that direction reversed. The <code>rtl</code> option flips the first
        stroke, which is enough to make an underline start where the reader's eye does.
      </p>
      <blockquote lang="ar" dir="rtl">
        <p data-block="quote-ar">العلم صيد والكتابة قيده، قيد صيودك بالحبال الواثقة</p>
      </blockquote>
      <p class="attribution" data-block="quote-en">
        "Knowledge is game, and writing is its snare; bind your quarry with strong rope." Attributed
        to al-Shafi'i. Select inside the Arabic line above and annotate it with
        <code>rtl</code> turned on.
      </p>
    </section>

    <section aria-labelledby="the-name">
      <h2 id="the-name" data-block="h-name">The name</h2>
      <p data-block="name-1">
        <em>Notatio</em> is Latin for a marking or a noting down, from <em>noto</em>: I mark, I
        annotate. The library is a fork of rough-notation, kept behaviourally compatible with it and
        brought forward to current browsers and tooling, with a name of its own.
      </p>
    </section>

    <section aria-labelledby="try-it">
      <h2 id="try-it" data-block="h-try">Try it here</h2>
      <p data-block="try-1">
        Pick a colour and a type in the toolbar, then select any text on this sheet. The annotation
        is drawn as soon as you let the selection go. Change the options afterwards and the
        annotation you last touched follows along. Switch to the eraser and click an annotation to
        take it off the page. Everything you draw is kept in this browser's local storage, so the
        document is where you left it when you come back.
      </p>
    </section>
  </article>
</template>

<style scoped>
.sheet {
  background-color: var(--color-paper);
  color: var(--color-ink);
  box-shadow: var(--shadow-sheet);
  border-radius: 4px;
  padding: clamp(1.5rem, 5vw, 4rem);
  font-size: clamp(1.0625rem, 0.98rem + 0.4vw, 1.1875rem);
  line-height: 1.75;
}

.sheet-header {
  border-bottom: 1px solid var(--color-rule);
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
}

.eyebrow {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
  margin-bottom: 0.75rem;
}

h1 {
  font-size: clamp(2.5rem, 1.8rem + 3.5vw, 4rem);
  font-style: italic;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.lede {
  margin-top: 1rem;
  font-size: 1.15em;
  color: var(--color-ink-soft);
}

section + section {
  margin-top: 2.5rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 0.75rem;
}

p + p,
ul,
ol,
blockquote {
  margin-top: 1rem;
}

ul,
ol {
  padding-inline-start: 1.75rem;
}

ul {
  list-style: disc;
}

ol {
  list-style: decimal;
}

li + li {
  margin-top: 0.5rem;
}

li::marker {
  color: var(--color-ink-faint);
}

blockquote {
  border-inline-start: 3px solid var(--color-rule);
  padding-inline-start: 1.25rem;
  margin-block: 1.5rem;
  font-family: var(--font-arabic);
  font-size: 1.5rem;
  line-height: 2.1;
}

.attribution {
  color: var(--color-ink-faint);
  font-size: 0.95em;
}

code {
  font-family: ui-monospace, 'SFMono-Regular', 'Cascadia Code', Consolas, monospace;
  font-size: 0.875em;
  background-color: var(--color-desk);
  border-radius: 3px;
  padding: 0.1em 0.35em;
}

a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
</style>
