<script setup lang="ts">
import { typeLabel } from '@/annotations/schema';
import { excerpt, usePlayground } from '@/composables/playground';

const { records, selectedId, select, erase, eraseAll } = usePlayground();
</script>

<template>
  <div>
    <p v-if="!records.length" class="text-sm text-ink-faint">
      Nothing is annotated yet. Select some text in the document to start.
    </p>

    <template v-else>
      <ul class="flex flex-col gap-1">
        <li
          v-for="record in records"
          :key="record.id"
          class="flex items-center gap-2 rounded-sm border border-transparent px-1 py-0.5"
          :class="{ 'border-rule bg-desk/60': record.id === selectedId }"
        >
          <span
            class="size-3 shrink-0 rounded-full"
            :style="{ backgroundColor: record.options.color }"
          />
          <button
            class="flex-1 truncate text-left text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
            type="button"
            :aria-pressed="record.id === selectedId"
            @click="select(record.id)"
          >
            {{ typeLabel(record.options.type) }}, "{{ excerpt(record.text) }}"
          </button>
          <button
            class="rounded-sm px-2 py-0.5 text-xs text-ink-faint hover:bg-accent-soft hover:text-accent"
            type="button"
            @click="erase(record.id)"
          >
            Erase<span class="sr-only">
              the {{ typeLabel(record.options.type).toLowerCase() }} over "{{
                excerpt(record.text)
              }}"</span
            >
          </button>
        </li>
      </ul>

      <button
        class="mt-2 rounded-sm border border-rule px-2 py-1 text-xs text-ink-soft hover:border-accent hover:text-accent"
        type="button"
        @click="eraseAll"
      >
        Erase every annotation
      </button>
    </template>
  </div>
</template>
