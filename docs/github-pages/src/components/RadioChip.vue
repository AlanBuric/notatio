<script setup lang="ts" generic="T extends string">
defineProps<{ name: string; value: T }>();

const model = defineModel<T>({ required: true });
</script>

<template>
  <label class="relative cursor-pointer">
    <input v-model="model" class="peer sr-only" type="radio" :name="name" :value="value" />
    <span
      class="block rounded-full border border-rule bg-paper px-3 py-1.5 text-sm whitespace-nowrap text-ink-soft transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-ink-faint"
    >
      <slot />
    </span>
  </label>
</template>
