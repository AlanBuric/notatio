<script setup lang="ts">
import { useId } from 'vue';
import { SWATCHES } from '@/annotations/schema';

const model = defineModel<string>({ required: true });
const customId = useId();
</script>

<template>
  <fieldset class="flex flex-wrap items-center gap-2">
    <legend class="sr-only">Colour</legend>

    <label v-for="swatch in SWATCHES" :key="swatch.value" class="relative cursor-pointer">
      <input
        v-model="model"
        class="peer sr-only"
        type="radio"
        name="annotation-colour"
        :value="swatch.value"
      />
      <span
        class="block size-7 rounded-full border border-black/15 transition-transform peer-checked:ring-2 peer-checked:ring-ink peer-checked:ring-offset-2 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:scale-110"
        :style="{ backgroundColor: swatch.value }"
      />
      <span class="sr-only">{{ swatch.label }}</span>
    </label>

    <span class="flex items-center gap-1.5">
      <label class="text-sm text-ink-soft" :for="customId">Custom</label>
      <input
        :id="customId"
        v-model="model"
        class="size-7 cursor-pointer rounded-full border border-rule bg-paper p-0.5"
        type="color"
      />
    </span>
  </fieldset>
</template>
