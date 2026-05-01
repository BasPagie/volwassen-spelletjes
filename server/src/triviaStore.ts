import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TriviaQuestion {
  question: string;
  answer: string;
  acceptedAnswers: string[];
  category: string;
}

export interface TriviaCategory {
  id: string;
  name: string;
  description: string;
  questionCount: number;
}

interface RawCategory {
  id: string;
  name: string;
  description: string;
  questions: { question: string; answer: string; acceptedAnswers: string[] }[];
}

function loadTriviaFromFile(): RawCategory[] {
  const devPath = join(__dirname, '..', 'data', 'trivia.json');
  const prodPath = join(__dirname, '..', '..', '..', 'data', 'trivia.json');
  const filePath = existsSync(devPath) ? devPath : prodPath;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

let categories: RawCategory[] = loadTriviaFromFile();
const isDev = process.env.DEV_MODE === 'true';

export function getAllTriviaCategories(): TriviaCategory[] {
  if (isDev) categories = loadTriviaFromFile();
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    questionCount: c.questions.length,
  }));
}

export function getQuestionsByCategories(categoryIds: string[], count: number): TriviaQuestion[] {
  if (isDev) categories = loadTriviaFromFile();

  const pool: TriviaQuestion[] = [];
  for (const cat of categories) {
    if (categoryIds.includes(cat.id)) {
      for (const q of cat.questions) {
        pool.push({ ...q, category: cat.name });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}
