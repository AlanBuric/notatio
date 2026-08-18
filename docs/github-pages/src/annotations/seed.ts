import { BLOCK_ATTRIBUTE } from './ranges';
import { DEFAULT_OPTIONS } from './schema';
import type { AnnotationOptionValues, AnnotationRecord } from './types';

interface Seed {
  block: string;
  phrase: string;
  options: Partial<AnnotationOptionValues>;
}

const SEEDS: readonly Seed[] = [
  {
    block: 'lede',
    phrase: 'hand-drawn annotations',
    options: { type: 'highlight', color: '#fde047' },
  },
  {
    block: 'what-1',
    phrase: 'no two are identical',
    options: { type: 'underline', color: '#dc2626' },
  },
  {
    block: 'how-4',
    phrase: 'it simply appears',
    options: { type: 'circle', color: '#2563eb', padding: 7 },
  },
];

/** Whitespace in the markup is folded when it renders but not in the DOM text. */
function findPhrase(text: string, phrase: string): { start: number; end: number } | null {
  const pattern = new RegExp(
    phrase
      .split(/\s+/)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+'),
  );
  const match = pattern.exec(text);

  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

export function buildSeedRecords(root: HTMLElement): AnnotationRecord[] {
  return SEEDS.flatMap<AnnotationRecord>((seed, index) => {
    const block = root.querySelector(`[${BLOCK_ATTRIBUTE}="${seed.block}"]`);
    const found = block && findPhrase(block.textContent ?? '', seed.phrase);

    if (!found) {
      return [];
    }

    return [
      {
        id: `seed-${index}`,
        block: seed.block,
        start: found.start,
        end: found.end,
        text: (block.textContent ?? '').slice(found.start, found.end),
        options: { ...DEFAULT_OPTIONS, ...seed.options },
      },
    ];
  });
}
