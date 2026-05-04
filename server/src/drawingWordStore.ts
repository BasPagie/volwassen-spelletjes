import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DrawingWord {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DrawingCategory {
  id: string;
  name: string;
  description: string;
  wordCount: number;
}

interface RawCategory {
  id: string;
  name: string;
  description: string;
  words: DrawingWord[];
}

function loadWordsFromFile(): RawCategory[] {
  const devPath = join(__dirname, '..', 'data', 'drawingWords.json');
  const prodPath = join(__dirname, '..', '..', '..', 'data', 'drawingWords.json');
  const filePath = existsSync(devPath) ? devPath : prodPath;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

let categories: RawCategory[] = loadWordsFromFile();
const isDev = process.env.DEV_MODE === 'true';

export function getAllDrawingCategories(): DrawingCategory[] {
  if (isDev) categories = loadWordsFromFile();
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    wordCount: c.words.length,
  }));
}

export function getRandomWords(
  categoryIds: string[],
  count: number,
  customWords: string[],
): DrawingWord[] {
  if (isDev) categories = loadWordsFromFile();

  const pool: DrawingWord[] = [];

  // Add words from selected categories
  for (const cat of categories) {
    if (categoryIds.includes(cat.id)) {
      pool.push(...cat.words);
    }
  }

  // Add custom words as medium difficulty
  for (const w of customWords) {
    if (w.trim()) {
      pool.push({ word: w.trim(), difficulty: 'medium' });
    }
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}

/** Pick 3 word choices (ideally one of each difficulty) for the drawer to choose from. */
export function pickWordChoices(
  categoryIds: string[],
  customWords: string[],
  usedWords: Set<string>,
): DrawingWord[] {
  if (isDev) categories = loadWordsFromFile();

  const pool: DrawingWord[] = [];
  for (const cat of categories) {
    if (categoryIds.includes(cat.id)) {
      for (const w of cat.words) {
        if (!usedWords.has(w.word.toLowerCase())) {
          pool.push(w);
        }
      }
    }
  }
  for (const w of customWords) {
    if (w.trim() && !usedWords.has(w.trim().toLowerCase())) {
      pool.push({ word: w.trim(), difficulty: 'medium' });
    }
  }

  // Try to get one easy, one medium, one hard
  const easy = pool.filter((w) => w.difficulty === 'easy');
  const medium = pool.filter((w) => w.difficulty === 'medium');
  const hard = pool.filter((w) => w.difficulty === 'hard');

  const pick = (arr: DrawingWord[]): DrawingWord | null => {
    if (arr.length === 0) return null;
    const idx = Math.floor(Math.random() * arr.length);
    return arr[idx];
  };

  const choices: DrawingWord[] = [];
  const e = pick(easy);
  if (e) choices.push(e);
  const m = pick(medium);
  if (m) choices.push(m);
  const m2 = pick(medium.filter((w) => w !== m));
  if (m2) choices.push(m2);
  const h = pick(hard);
  if (h) choices.push(h);

  // Fill up to 4 from remaining pool if we didn't get 4
  if (choices.length < 4) {
    const remaining = pool.filter((w) => !choices.includes(w));
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    while (choices.length < 4 && remaining.length > 0) {
      choices.push(remaining.pop()!);
    }
  }

  return choices;
}
