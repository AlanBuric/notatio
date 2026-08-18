<script setup lang="ts">
import { useId } from 'vue';
import type { BracketType } from 'notatio';
import { BRACKET_SIDES, type BracketsField } from '@/annotations/schema';

defineProps<{ field: BracketsField }>();

const model = defineModel<BracketType[]>({ required: true });
const hintId = useId();

function isLastChecked(side: BracketType): boolean {
  return model.value.length === 1 && model.value[0] === side;
}
</script>

<template>
  <fieldset :aria-describedby="hintId">
    <legend class="text-sm font-medium text-ink">{{ field.label }}</legend>
    <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
      <label
        v-for="side in BRACKET_SIDES"
        :key="side"
        class="flex items-center gap-1.5 text-sm text-ink-soft"
      >
        <input
          v-model="model"
          class="size-4 accent-ink"
          type="checkbox"
          :value="side"
          :disabled="isLastChecked(side)"
        />
        {{ side }}
      </label>
    </div>
    <p class="mt-1 text-xs text-ink-faint" :id="hintId">
      {{ field.hint }}. At least one side stays on.
    </p>
  </fieldset>
</template>
