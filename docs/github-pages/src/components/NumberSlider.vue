<script setup lang="ts">
import { useId } from 'vue';
import type { NumberField } from '@/annotations/schema';

defineProps<{ field: NumberField }>();

const model = defineModel<number>({ required: true });
const inputId = useId();
const hintId = useId();
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-2">
      <label class="text-sm font-medium text-ink" :for="inputId">{{ field.label }}</label>
      <output class="text-xs tabular-nums text-ink-faint" :for="inputId">
        {{ model }}{{ field.unit ?? '' }}
      </output>
    </div>
    <input
      :id="inputId"
      v-model.number="model"
      class="w-full accent-ink"
      type="range"
      :min="field.min"
      :max="field.max"
      :step="field.step"
      :aria-describedby="hintId"
    />
    <p class="text-xs text-ink-faint" :id="hintId">{{ field.hint }}</p>
  </div>
</template>
