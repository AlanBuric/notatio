<script setup lang="ts">
import SiteHeader from '@/components/SiteHeader.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import DocumentSheet from '@/components/DocumentSheet.vue';
</script>

<template>
  <a
    class="sr-only font-sans focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-paper focus:px-4 focus:py-2"
    href="#document"
  >
    Skip to the document
  </a>

  <SiteHeader />

  <main id="document" class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
    <DocumentSheet />
  </main>

  <SiteFooter />
</template>
