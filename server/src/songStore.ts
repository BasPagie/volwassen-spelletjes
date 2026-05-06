import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Song {
  title: string;
  artist: string;
  acceptedAnswers: string[];
  deezerId: number;
  previewUrl: string;
  coverUrl: string | null;
  startOffset?: number;
}

interface SongCategory {
  id: string;
  name: string;
  description: string;
  songs: Song[];
}

const DEV_MODE = process.env.DEV_MODE === 'true' || process.env.NODE_ENV !== 'production';

function loadSongsFromFile(): SongCategory[] {
  // Try dev path first, then prod path
  const paths = [
    path.join(__dirname, '../data/songs.json'),
    path.join(__dirname, '../../server/data/songs.json'),
    path.join(__dirname, '../../../../server/data/songs.json'),
  ];

  for (const p of paths) {
    try {
      const raw = readFileSync(p, 'utf-8');
      return JSON.parse(raw);
    } catch {}
  }
  console.warn('[songStore] Could not find songs.json');
  return [];
}

let categories: SongCategory[] = loadSongsFromFile();

function getCategories(): SongCategory[] {
  if (DEV_MODE) {
    categories = loadSongsFromFile();
  }
  return categories;
}

export function getAllSongCategories(): { id: string; name: string; description: string; songCount: number }[] {
  return getCategories().map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    songCount: c.songs.length,
  }));
}

export function getAllSongsGrouped() {
  return getCategories().map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    songs: c.songs.map((s) => ({
      title: s.title,
      artist: s.artist,
      coverUrl: s.coverUrl,
      previewUrl: s.previewUrl,
      startOffset: s.startOffset,
      deezerId: s.deezerId,
    })),
  }));
}

/**
 * Get all songs grouped by category with freshly refreshed Deezer preview URLs.
 */
export async function getAllSongsGroupedFresh() {
  const cats = getCategories();
  // Collect all songs that need refreshing
  const allSongs: Song[] = [];
  for (const cat of cats) {
    for (const song of cat.songs) {
      if (song.deezerId) allSongs.push(song);
    }
  }
  // Refresh in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < allSongs.length; i += BATCH_SIZE) {
    const batch = allSongs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (song) => {
        const freshUrl = await fetchFreshPreviewUrl(song.deezerId);
        if (freshUrl) {
          song.previewUrl = freshUrl;
        }
      }),
    );
  }
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    songs: c.songs.map((s) => ({
      title: s.title,
      artist: s.artist,
      coverUrl: s.coverUrl,
      previewUrl: s.previewUrl,
      startOffset: s.startOffset,
      deezerId: s.deezerId,
    })),
  }));
}

export interface SongEntry {
  title: string;
  artist: string;
  acceptedAnswers: string[];
  deezerId: number;
  previewUrl: string;
  coverUrl: string | null;
  category: string;
  startOffset?: number;
}

export function getSongsByCategories(categoryIds: string[], count: number): SongEntry[] {
  const cats = getCategories();
  const pool: SongEntry[] = [];

  for (const cat of cats) {
    if (categoryIds.includes(cat.id)) {
      for (const song of cat.songs) {
        pool.push({ ...song, category: cat.name });
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

/** Get all songs belonging to a category by its display name */
export function getSongsByCategoryName(categoryName: string): SongEntry[] {
  const cats = getCategories();
  for (const cat of cats) {
    if (cat.name === categoryName) {
      return cat.songs.map((s) => ({ ...s, category: cat.name }));
    }
  }
  return [];
}

/**
 * Fetch a fresh preview URL from Deezer's API for a given track ID.
 * Returns the fresh URL or null on failure.
 */
async function fetchFreshPreviewUrl(deezerId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.deezer.com/track/${deezerId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.preview || null;
  } catch {
    return null;
  }
}

/**
 * Refresh preview URLs for the given songs by fetching from Deezer's API.
 * Falls back to the stored (possibly expired) URL if the fetch fails.
 */
export async function refreshPreviewUrls(songs: SongEntry[]): Promise<void> {
  const BATCH_SIZE = 5;
  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    const batch = songs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (song) => {
        if (!song.deezerId) return; // iTunes songs don't need refresh
        const freshUrl = await fetchFreshPreviewUrl(song.deezerId);
        if (freshUrl) {
          song.previewUrl = freshUrl;
        }
      }),
    );
  }
}
