<script setup lang="ts">
import { useId } from 'vue';
import type { ToggleField } from '@/annotations/schema';

defineProps<{ field: ToggleField }>();

const model = defineModel<boolean>({ required: true });
const inputId = useId();
const hintId = useId();
</script>

<template>
  <div>
    <div class="flex items-center gap-2">
      <input
        :id="inputId"
        v-model="model"
        class="size-4 accent-ink"
        type="checkbox"
        :aria-describedby="hintId"
      />
      <label class="text-sm font-medium text-ink" :for="inputId">{{ field.label }}</label>
    </div>
    <p class="mt-1 text-xs text-ink-faint" :id="hintId">{{ field.hint }}</p>
  </div>
</template>
