import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { WhatAmICharacter, WhatAmICharacterPack } from '../../shared/types.js';

// ─── Load packs from JSON file ─────────────────────────
interface RawPack {
  id: string;
  name: string;
  description: string;
  characters: { name: string; category?: string; imageUrl?: string }[];
}

function loadPacksFromFile(): WhatAmICharacterPack[] {
  // In dev (tsx): __dirname = server/src → ../data
  // In prod (compiled): __dirname = server/dist/server/src → ../../../data
  const devPath = join(__dirname, '..', 'data', 'characters.json');
  const prodPath = join(__dirname, '..', '..', '..', 'data', 'characters.json');
  const filePath = existsSync(devPath) ? devPath : prodPath;
  const raw: RawPack[] = JSON.parse(readFileSync(filePath, 'utf-8'));

  return raw.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    characters: pack.characters.map((c, idx) => ({
      id: `${pack.id}-${idx + 1}`,
      name: c.name,
      category: c.category,
      imageUrl: c.imageUrl,
    })),
  }));
}

let packs: WhatAmICharacterPack[] = loadPacksFromFile();

const isDev = process.env.DEV_MODE === 'true';

export function getAllPacks(): WhatAmICharacterPack[] {
  if (isDev) packs = loadPacksFromFile();
  return packs;
}

export function getPackById(packId: string): WhatAmICharacterPack | undefined {
  if (isDev) packs = loadPacksFromFile();
  return packs.find((p) => p.id === packId);
}

/** Pack metadata without full character lists — safe to send to all clients */
export function getPackMeta(): { id: string; name: string; description: string; characterCount: number }[] {
  return packs.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    characterCount: p.characters.length,
  }));
}

/** No-op: images are now hardcoded in characters.json */
export async function resolvePackImages(): Promise<void> {
  const total = packs.reduce((s, p) => s + p.characters.length, 0);
  const withImage = packs.reduce((s, p) => s + p.characters.filter((c) => c.imageUrl).length, 0);
  console.log(`[Packs] Loaded ${total} characters (${withImage} with images) from characters.json`);
}
