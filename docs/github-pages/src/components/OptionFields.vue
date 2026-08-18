<script setup lang="ts">
import { computed } from 'vue';
import { TYPE_FIELDS } from '@/annotations/schema';
import { usePlayground } from '@/composables/playground';
import NumberSlider from './NumberSlider.vue';
import ToggleField from './ToggleField.vue';
import BracketSides from './BracketSides.vue';

const { options } = usePlayground();

const fields = computed(() => TYPE_FIELDS[options.type]);
</script>

<template>
  <div class="grid gap-x-6 gap-y-4 @md:grid-cols-2 @3xl:grid-cols-3">
    <template v-for="field in fields" :key="field.key">
      <NumberSlider v-if="field.kind === 'number'" v-model="options[field.key]" :field="field" />
      <ToggleField
        v-else-if="field.kind === 'toggle'"
        v-model="options[field.key]"
        :field="field"
      />
      <BracketSides v-else v-model="options.brackets" :field="field" />
    </template>
  </div>
</template>
