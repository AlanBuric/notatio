<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { ANNOTATION_TYPES } from '@/annotations/schema';
import { usePlayground } from '@/composables/playground';
import AnnotationList from './AnnotationList.vue';
import ColorPicker from './ColorPicker.vue';
import OptionFields from './OptionFields.vue';
import RadioChip from './RadioChip.vue';

const { options, mode, records, status } = usePlayground();

const optionsId = useId();
const listId = useId();
const optionsOpen = ref(window.matchMedia('(min-width: 1024px)').matches);
const listOpen = ref(false);

const activeType = computed(() =>
  ANNOTATION_TYPES.find((descriptor) => descriptor.value === options.type),
);

const panelButton =
  'rounded-full border border-rule px-3 py-1.5 text-sm text-ink-soft hover:border-ink-faint hover:text-ink aria-expanded:border-ink aria-expanded:bg-ink aria-expanded:text-paper';
</script>

<template>
  <aside
    class="@container sticky top-14 z-20 max-h-[calc(100dvh-3.5rem)] w-full self-start overflow-y-auto border-b border-rule bg-paper/95 font-sans backdrop-blur lg:w-80 lg:shrink-0 lg:border-x lg:border-b-0 lg:bg-paper/70"
    aria-label="Annotation tools"
  >
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-3 sm:px-6 lg:max-w-none">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <fieldset class="flex gap-2">
          <legend class="sr-only">Tool</legend>
          <RadioChip v-model="mode" name="tool" value="annotate">Annotate</RadioChip>
          <RadioChip v-model="mode" name="tool" value="erase">Erase</RadioChip>
        </fieldset>

        <div class="flex gap-2 @2xl:ml-auto">
          <button
            :class="panelButton"
            type="button"
            :aria-expanded="optionsOpen"
            :aria-controls="optionsId"
            @click="optionsOpen = !optionsOpen"
          >
            Options
          </button>
          <button
            :class="panelButton"
            type="button"
            :aria-expanded="listOpen"
            :aria-controls="listId"
            @click="listOpen = !listOpen"
          >
            Annotations
            <span class="tabular-nums">({{ records.length }})</span>
          </button>
        </div>
      </div>

      <ColorPicker v-model="options.color" />

      <fieldset class="min-w-0">
        <legend class="sr-only">Annotation type</legend>
        <div
          class="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
        >
          <RadioChip
            v-for="descriptor in ANNOTATION_TYPES"
            :key="descriptor.value"
            v-model="options.type"
            name="annotation-type"
            :value="descriptor.value"
          >
            {{ descriptor.label }}
          </RadioChip>
        </div>
        <p class="mt-1 text-xs text-ink-faint">{{ activeType?.description }}</p>
      </fieldset>

      <div v-show="optionsOpen" :id="optionsId" class="border-t border-rule pt-3">
        <OptionFields />
      </div>

      <div v-show="listOpen" :id="listId" class="border-t border-rule pt-3">
        <AnnotationList />
      </div>

      <p class="min-h-4 text-xs text-ink-faint" aria-live="polite">{{ status }}</p>
    </div>
  </aside>
</template>
