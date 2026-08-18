<script setup lang="ts">
import { REPOSITORY_URL } from '@/site';

const links = [
  { label: 'Read me', href: `${REPOSITORY_URL}#readme`, wide: true },
  { label: 'Issues', href: `${REPOSITORY_URL}/issues`, wide: false },
  { label: 'Source code', href: REPOSITORY_URL, wide: false },
] as const;
</script>

<template>
  <header class="sticky top-0 z-30 h-14 bg-ink text-paper">
    <nav aria-label="Site" class="mx-auto flex h-full max-w-7xl items-center gap-x-6 px-4 sm:px-6">
      <a href="#top" class="font-serif text-2xl italic tracking-tight text-paper hover:text-white">
        Notatio
      </a>
      <ul class="flex flex-1 items-center justify-end gap-x-5 font-sans text-sm">
        <li v-for="link in links" :key="link.href" :class="{ 'hidden sm:block': link.wide }">
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
