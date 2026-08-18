<script setup lang="ts">
import { REPOSITORY_URL } from '@/site';

const links = [
  { label: 'Read me', href: `${REPOSITORY_URL}#readme` },
  { label: 'Issues', href: `${REPOSITORY_URL}/issues` },
  { label: 'Source code', href: REPOSITORY_URL },
] as const;
</script>

<template>
  <header class="sticky top-0 z-30 bg-ink text-paper shadow-sm">
    <nav
      aria-label="Site"
      class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6"
    >
      <a
        href="#top"
        class="font-serif text-2xl italic tracking-tight text-paper hover:text-white"
      >
        Notatio
      </a>
      <ul class="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-1 font-sans text-sm">
        <li v-for="link in links" :key="link.href">
          <a
            :href="link.href"
            rel="noopener"
            class="text-desk underline-offset-4 hover:text-white hover:underline"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>
    </nav>
  </header>
</template>
