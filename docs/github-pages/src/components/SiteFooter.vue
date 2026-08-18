<script setup lang="ts">
import { REPOSITORY_URL } from '@/site';
</script>

<template>
  <footer class="mx-auto max-w-5xl px-4 pb-12 font-sans text-sm text-ink-faint sm:px-6">
    <p>
      Notatio is released under the MIT license and is a fork of
      <a
        class="underline underline-offset-2 hover:text-ink"
        href="https://github.com/rough-stuff/rough-notation"
        rel="noopener"
        >rough-notation</a
      >, drawn with <a class="underline underline-offset-2 hover:text-ink" href="https://roughjs.com" rel="noopener">RoughJS</a>.
      <a class="underline underline-offset-2 hover:text-ink" :href="REPOSITORY_URL" rel="noopener"
        >Source code on GitHub</a
      >.
    </p>
  </footer>
</template>
