import {
  inject,
  nextTick,
  onMounted,
  provide,
  reactive,
  ref,
  toRaw,
  watch,
  type InjectionKey,
  type Ref,
} from 'vue';
import { annotate, annotationGroup, type RoughAnnotation } from 'notatio';
import { applyOptions, toConfig } from '@/annotations/config';
import {
  ANNOTATION_ATTRIBUTE,
  describeRange,
  locateRange,
  unwrapElement,
  wrapRange,
} from '@/annotations/ranges';
import { DEFAULT_OPTIONS, typeLabel } from '@/annotations/schema';
import { buildSeedRecords } from '@/annotations/seed';
import { loadRecords, saveRecords } from '@/annotations/storage';
import type { AnnotationOptionValues, AnnotationRecord, ToolMode } from '@/annotations/types';

interface Instance {
  element: HTMLElement;
  annotation: RoughAnnotation;
}

export interface Playground {
  options: AnnotationOptionValues;
  mode: Ref<ToolMode>;
  records: Ref<AnnotationRecord[]>;
  selectedId: Ref<string | null>;
  status: Ref<string>;
  annotateSelection: () => void;
  activate: (id: string) => void;
  select: (id: string | null) => void;
  erase: (id: string) => void;
  eraseAll: () => void;
}

const playgroundKey: InjectionKey<Playground> = Symbol('notatio-playground');

const EXCERPT_LENGTH = 42;

export function excerpt(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();

  return collapsed.length > EXCERPT_LENGTH
    ? `${collapsed.slice(0, EXCERPT_LENGTH - 1)}…`
    : collapsed;
}

function snapshot(options: AnnotationOptionValues): AnnotationOptionValues {
  return { ...toRaw(options), brackets: [...options.brackets] };
}

export function createPlayground(root: Ref<HTMLElement | null>): Playground {
  const options = reactive<AnnotationOptionValues>({ ...DEFAULT_OPTIONS });
  const mode = ref<ToolMode>('annotate');
  const records = ref<AnnotationRecord[]>([]);
  const selectedId = ref<string | null>(null);
  const status = ref('');
  const instances = new Map<string, Instance>();

  /** Set while the toolbar is being filled from an annotation, so the watcher does not write it back. */
  let syncing = false;

  function persist(): void {
    saveRecords(records.value);
  }

  function draw(record: AnnotationRecord): RoughAnnotation | null {
    const container = root.value;
    const range = container && locateRange(record, container);

    if (!range) {
      return null;
    }

    const element = wrapRange(range, record.id);
    const annotation = annotate(element, toConfig(record.options));

    instances.set(record.id, { element, annotation });
    applyEraseAffordance(record, element);

    return annotation;
  }

  function destroy(id: string): void {
    const instance = instances.get(id);

    if (!instance) {
      return;
    }

    instance.annotation.remove();
    unwrapElement(instance.element);
    instances.delete(id);
  }

  function applyEraseAffordance(record: AnnotationRecord, element: HTMLElement): void {
    if (mode.value === 'erase') {
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.setAttribute(
        'aria-label',
        `Erase the ${typeLabel(record.options.type).toLowerCase()} over "${excerpt(record.text)}"`,
      );
    } else {
      element.removeAttribute('role');
      element.removeAttribute('tabindex');
      element.removeAttribute('aria-label');
    }

    element.dataset.selected = String(selectedId.value === record.id);
  }

  function refreshAffordances(): void {
    for (const record of records.value) {
      const instance = instances.get(record.id);

      if (instance) {
        applyEraseAffordance(record, instance.element);
      }
    }
  }

  function overlapping(candidate: AnnotationRecord): boolean {
    return records.value.some(
      (record) =>
        record.block === candidate.block &&
        candidate.start <= record.end &&
        candidate.end >= record.start,
    );
  }

  function annotateSelection(): void {
    const container = root.value;
    const selection = window.getSelection();

    if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const described = describeRange(selection.getRangeAt(0), container);

    if (!described.ok) {
      if (described.reason === 'across-blocks') {
        status.value = 'Select within a single paragraph, list item or heading.';
      }

      return;
    }

    const record: AnnotationRecord = {
      id: crypto.randomUUID(),
      ...described.location,
      options: snapshot(options),
    };

    if (overlapping(record)) {
      status.value = 'That text already carries an annotation. Erase it first.';
      return;
    }

    selection.removeAllRanges();

    const annotation = draw(record);

    if (!annotation) {
      status.value = 'That selection could not be annotated.';
      return;
    }

    records.value = [...records.value, record];
    selectedId.value = record.id;
    refreshAffordances();
    persist();
    void annotation.show();
    status.value = `${typeLabel(record.options.type)} drawn over "${excerpt(record.text)}".`;
  }

  function select(id: string | null): void {
    selectedId.value = id;

    const record = records.value.find((candidate) => candidate.id === id);

    if (record) {
      syncing = true;
      Object.assign(options, snapshot(record.options));
      void nextTick(() => (syncing = false));
    }

    refreshAffordances();
  }

  function activate(id: string): void {
    if (mode.value === 'erase') {
      erase(id);
    } else {
      select(id);
      status.value = 'Editing this annotation. The toolbar now changes it.';
    }
  }

  function erase(id: string): void {
    const record = records.value.find((candidate) => candidate.id === id);

    destroy(id);
    records.value = records.value.filter((candidate) => candidate.id !== id);

    if (selectedId.value === id) {
      selectedId.value = null;
    }

    persist();

    if (record) {
      status.value = `Erased the ${typeLabel(record.options.type).toLowerCase()} over "${excerpt(record.text)}".`;
    }
  }

  function eraseAll(): void {
    for (const record of records.value) {
      destroy(record.id);
    }

    records.value = [];
    selectedId.value = null;
    persist();
    status.value = 'Every annotation was erased.';
  }

  watch(options, () => {
    const record = records.value.find((candidate) => candidate.id === selectedId.value);

    if (syncing || !record) {
      return;
    }

    const previousType = record.options.type;
    const instance = instances.get(record.id);

    record.options = snapshot(options);

    if (previousType === record.options.type && instance) {
      applyOptions(instance.annotation, record.options);
    } else {
      destroy(record.id);
      void draw(record)?.show();
    }

    refreshAffordances();
    persist();
  });

  watch(mode, refreshAffordances);

  onMounted(async () => {
    /* Annotations are measured from rendered text, so the fonts have to be in place first. */
    await document.fonts.ready;

    const container = root.value;

    if (!container) {
      return;
    }

    const stored = loadRecords();
    const initial = stored ?? buildSeedRecords(container);
    const drawn = initial.flatMap((record) => {
      const annotation = draw(record);

      return annotation ? [{ record, annotation }] : [];
    });

    records.value = drawn.map(({ record }) => record);

    if (stored) {
      drawn.forEach(({ annotation }) => void annotation.show());
    } else {
      void annotationGroup(drawn.map(({ annotation }) => annotation)).show();
      persist();
    }
  });

  const playground: Playground = {
    options,
    mode,
    records,
    selectedId,
    status,
    annotateSelection,
    activate,
    select,
    erase,
    eraseAll,
  };

  provide(playgroundKey, playground);

  return playground;
}

export function usePlayground(): Playground {
  const playground = inject(playgroundKey);

  if (!playground) {
    throw new Error('The playground has to be created by an ancestor component.');
  }

  return playground;
}

export function annotationIdOf(target: EventTarget | null): string | null {
  return target instanceof Element
    ? (target.closest(`[${ANNOTATION_ATTRIBUTE}]`)?.getAttribute(ANNOTATION_ATTRIBUTE) ?? null)
    : null;
}
