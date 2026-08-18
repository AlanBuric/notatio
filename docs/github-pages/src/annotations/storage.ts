import { DEFAULT_OPTIONS } from './schema';
import type { AnnotationRecord } from './types';

const STORAGE_KEY = 'notatio.playground.annotations.v1';

function isRecord(value: unknown): value is AnnotationRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<AnnotationRecord>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.block === 'string' &&
    typeof candidate.start === 'number' &&
    typeof candidate.end === 'number' &&
    typeof candidate.text === 'string' &&
    typeof candidate.options === 'object' &&
    candidate.options !== null
  );
}

/** Returns null when nothing has been stored yet, which is what seeds the document. */
export function loadRecords(): AnnotationRecord[] | null {
  let stored: string | null = null;

  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (stored === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter(isRecord).map((record) => ({
      ...record,
      options: { ...DEFAULT_OPTIONS, ...record.options },
    }));
  } catch {
    return null;
  }
}

export function saveRecords(records: readonly AnnotationRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* A browser with storage turned off still gets a working playground. */
  }
}
