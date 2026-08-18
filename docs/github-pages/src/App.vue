<script setup lang="ts">
import { computed, ref } from 'vue';
import { annotationIdOf, createPlayground } from '@/composables/playground';
import { onSelectionSettled } from '@/composables/textSelection';
import AnnotationToolbar from '@/components/AnnotationToolbar.vue';
import DocumentSheet from '@/components/DocumentSheet.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import SiteHeader from '@/components/SiteHeader.vue';

const documentRoot = ref<HTMLElement | null>(null);
const { mode, annotateSelection, activate } = createPlayground(documentRoot);
const annotating = computed(() => mode.value === 'annotate');

onSelectionSettled(annotating, annotateSelection);

function onActivate(event: Event): void {
  const id = annotationIdOf(event.target);

  if (id) {
    event.preventDefault();
    activate(id);
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    onActivate(event);
  }
}
</script>

<template>
  <a
    class="sr-only font-sans focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-paper focus:px-4 focus:py-2"
    href="#document"
  >
    Skip to the document
  </a>

  <SiteHeader />

  <div class="mx-auto flex max-w-7xl flex-col lg:flex-row lg:items-start lg:gap-8 lg:px-6">
    <AnnotationToolbar />

    <main id="document" class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-0">
      <div
        ref="documentRoot"
        :class="{ erasing: mode === 'erase' }"
        @click="onActivate"
        @keydown="onKeydown"
      >
        <DocumentSheet />
      </div>
    </main>
  </div>

  <SiteFooter />
</template>
