/**
 * Fetch game cover images from Wikipedia for the games pack.
 * Searches for specific game articles that have cover/box art.
 */
const fs = require('fs');
const CHARACTERS_PATH = 'server/data/characters.json';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Map character -> Wikipedia article for their most iconic game
const GAME_MAP = {
  'Mario': 'Super Mario Bros.',
  'Link': 'The Legend of Zelda: Breath of the Wild',
  'Pikachu': 'Pokémon Yellow',
  'Sonic the Hedgehog': 'Sonic the Hedgehog (1991 video game)',
  'Crash Bandicoot': 'Crash Bandicoot (video game)',
  'Pac-Man': 'Pac-Man (video game)',
  'Kratos': 'God of War (2018 video game)',
  'Master Chief': 'Halo: Combat Evolved',
  'Lara Croft': 'Tomb Raider (2013 video game)',
  'Steve': 'Minecraft',
  'Kirby': "Kirby's Dream Land",
  'Cloud Strife': 'Final Fantasy VII',
  'Donkey Kong': 'Donkey Kong Country',
  'Bowser': 'Super Mario 64',
  'Ezio Auditore': "Assassin's Creed II",
  'Joel Miller': 'The Last of Us',
  'Arthur Morgan': 'Red Dead Redemption 2',
  'Mega Man': 'Mega Man (video game)',
  'Yoshi': "Yoshi's Island",
  'Toad': 'Captain Toad: Treasure Tracker',
  'Luigi': "Luigi's Mansion",
  'Princess Peach': 'Princess Peach: Showtime!',
  'Creeper': 'Minecraft',
  'Samus Aran': 'Metroid Dread',
};

async function fetchBatch(titles) {
  const params = new URLSearchParams({
    action: 'query',
    titles: titles.join('|'),
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '500',
    format: 'json',
    redirects: '1',
  });
  const r = await fetch('https://en.wikipedia.org/w/api.php?' + params, {
    headers: { 'User-Agent': 'VolwassenSpelletjesBot/1.0' }
  });
  const data = await r.json();
  const results = new Map();

  const redirectMap = new Map();
  if (data.query?.redirects) {
    for (const rd of data.query.redirects) redirectMap.set(rd.from, rd.to);
  }
  const normalizeMap = new Map();
  if (data.query?.normalized) {
    for (const n of data.query.normalized) normalizeMap.set(n.from, n.to);
  }

  for (const page of Object.values(data.query?.pages || {})) {
    if (page.thumbnail?.source) {
      results.set(page.title, page.thumbnail.source);
    }
  }

  const finalResults = new Map();
  for (const title of titles) {
    let resolved = title;
    if (normalizeMap.has(resolved)) resolved = normalizeMap.get(resolved);
    if (redirectMap.has(resolved)) resolved = redirectMap.get(resolved);
    if (results.has(resolved)) {
      finalResults.set(title, results.get(resolved));
    }
  }
  return finalResults;
}

async function main() {
  const characters = JSON.parse(fs.readFileSync(CHARACTERS_PATH, 'utf-8'));
  const pack = characters.find(p => p.id === 'games');

  const titles = pack.characters.map(c => GAME_MAP[c.name]).filter(Boolean);
  const uniqueTitles = [...new Set(titles)];

  console.log(`Fetching ${uniqueTitles.length} game covers from Wikipedia...\n`);

  // Batch in groups of 20
  const allResults = new Map();
  for (let i = 0; i < uniqueTitles.length; i += 20) {
    const batch = uniqueTitles.slice(i, i + 20);
    const results = await fetchBatch(batch);
    for (const [k, v] of results) allResults.set(k, v);
    await delay(500);
  }

  let updated = 0, failed = 0;
  for (const ch of pack.characters) {
    const gameTitle = GAME_MAP[ch.name];
    if (!gameTitle) { console.log(`  ⚠️  No mapping: ${ch.name}`); failed++; continue; }
    const url = allResults.get(gameTitle);
    if (url) {
      ch.imageUrl = url;
      console.log(`  ✅ ${ch.name} (${gameTitle})`);
      updated++;
    } else {
      console.log(`  ❌ No image: ${ch.name} (${gameTitle})`);
      failed++;
    }
  }

  fs.writeFileSync(CHARACTERS_PATH, JSON.stringify(characters, null, 2) + '\n');
  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}, Failed: ${failed}`);
}

main().catch(console.error);
