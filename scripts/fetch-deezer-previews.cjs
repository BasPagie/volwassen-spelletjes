/**
 * Fetch Deezer preview URLs for a curated song list.
 * Run: node scripts/fetch-deezer-previews.cjs
 * Output: server/data/songs.json
 */
const fs = require('fs');
const path = require('path');

// ─── Curated Song List ──────────────────────────────────
const SONGS = [
  // ─── Pop Hits ─────────────────────────────────────────
  { title: "Blinding Lights", artist: "The Weeknd", category: "pop" },
  { title: "Shape of You", artist: "Ed Sheeran", category: "pop" },
  { title: "Levitating", artist: "Dua Lipa", category: "pop" },
  { title: "Bad Guy", artist: "Billie Eilish", category: "pop" },
  { title: "Uptown Funk", artist: "Bruno Mars", category: "pop" },
  { title: "Happy", artist: "Pharrell Williams", category: "pop" },
  { title: "Rolling in the Deep", artist: "Adele", category: "pop" },
  { title: "Someone Like You", artist: "Adele", category: "pop" },
  { title: "Shake It Off", artist: "Taylor Swift", category: "pop" },
  { title: "Anti-Hero", artist: "Taylor Swift", category: "pop" },
  { title: "As It Was", artist: "Harry Styles", category: "pop" },
  { title: "Stay", artist: "The Kid LAROI", category: "pop" },
  { title: "Dance Monkey", artist: "Tones and I", category: "pop" },
  { title: "Watermelon Sugar", artist: "Harry Styles", category: "pop" },
  { title: "drivers license", artist: "Olivia Rodrigo", category: "pop" },
  { title: "good 4 u", artist: "Olivia Rodrigo", category: "pop" },
  { title: "Flowers", artist: "Miley Cyrus", category: "pop" },
  { title: "Cruel Summer", artist: "Taylor Swift", category: "pop" },
  { title: "Heat Waves", artist: "Glass Animals", category: "pop" },
  { title: "Peaches", artist: "Justin Bieber", category: "pop" },

  // ─── Hip-Hop & Rap ────────────────────────────────────
  { title: "SICKO MODE", artist: "Travis Scott", category: "hiphop" },
  { title: "God's Plan", artist: "Drake", category: "hiphop" },
  { title: "HUMBLE.", artist: "Kendrick Lamar", category: "hiphop" },
  { title: "Lose Yourself", artist: "Eminem", category: "hiphop" },
  { title: "In Da Club", artist: "50 Cent", category: "hiphop" },
  { title: "Hotline Bling", artist: "Drake", category: "hiphop" },
  { title: "Old Town Road", artist: "Lil Nas X", category: "hiphop" },
  { title: "MONTERO", artist: "Lil Nas X", category: "hiphop" },
  { title: "Starboy", artist: "The Weeknd", category: "hiphop" },
  { title: "Rockstar", artist: "Post Malone", category: "hiphop" },
  { title: "Congratulations", artist: "Post Malone", category: "hiphop" },
  { title: "Mo Bamba", artist: "Sheck Wes", category: "hiphop" },
  { title: "Mask Off", artist: "Future", category: "hiphop" },
  { title: "XO Tour Llif3", artist: "Lil Uzi Vert", category: "hiphop" },
  { title: "Money Trees", artist: "Kendrick Lamar", category: "hiphop" },
  { title: "Not Like Us", artist: "Kendrick Lamar", category: "hiphop" },
  { title: "Family Ties", artist: "Baby Keem", category: "hiphop" },
  { title: "WAP", artist: "Cardi B", category: "hiphop" },
  { title: "Bodak Yellow", artist: "Cardi B", category: "hiphop" },
  { title: "Industry Baby", artist: "Lil Nas X", category: "hiphop" },

  // ─── Dutch Hits ───────────────────────────────────────
  { title: "Energie", artist: "Ronnie Flex", category: "dutch" },
  { title: "Dansen in het Donker", artist: "Tabitha", category: "dutch" },
  { title: "Zo Kan Het Dus Ook", artist: "Bløf", category: "dutch" },
  { title: "Ik Neem Je Mee", artist: "Gers Pardoel", category: "dutch" },
  { title: "Roller Coaster", artist: "Danny Vera", category: "dutch" },
  { title: "Ze Huilt Maar Ze Lacht", artist: "André Hazes", category: "dutch" },
  { title: "Leef", artist: "André Hazes Jr", category: "dutch" },
  { title: "Drank & Drugs", artist: "Lil Kleine", category: "dutch" },
  { title: "Later Als Ik Groot Ben", artist: "Kinderen voor Kinderen", category: "dutch" },
  { title: "Het Is Een Nacht", artist: "Guus Meeuwis", category: "dutch" },
  { title: "Avond", artist: "Boudewijn de Groot", category: "dutch" },
  { title: "Blauwe Dag", artist: "Suzan & Freek", category: "dutch" },
  { title: "Als Het Avond Is", artist: "Suzan & Freek", category: "dutch" },
  { title: "Ik Ga Zwemmen", artist: "Mart Hoogkamer", category: "dutch" },
  { title: "Uit M'n Bol", artist: "Donnie", category: "dutch" },
  { title: "Wakker in een vreemde stad", artist: "BLØF", category: "dutch" },
  { title: "Draai Het Om", artist: "Goldband", category: "dutch" },
  { title: "Noodgeval", artist: "Goldband", category: "dutch" },
  { title: "De Diepte", artist: "S10", category: "dutch" },
  { title: "Ben Je Wakker", artist: "Meau", category: "dutch" },

  // ─── 80s & 90s ────────────────────────────────────────
  { title: "Take On Me", artist: "a-ha", category: "80s-90s" },
  { title: "Billie Jean", artist: "Michael Jackson", category: "80s-90s" },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses", category: "80s-90s" },
  { title: "Like a Prayer", artist: "Madonna", category: "80s-90s" },
  { title: "Don't Stop Believin'", artist: "Journey", category: "80s-90s" },
  { title: "Smells Like Teen Spirit", artist: "Nirvana", category: "80s-90s" },
  { title: "Wannabe", artist: "Spice Girls", category: "80s-90s" },
  { title: "Everybody", artist: "Backstreet Boys", category: "80s-90s" },
  { title: "I Want It That Way", artist: "Backstreet Boys", category: "80s-90s" },
  { title: "MMMBop", artist: "Hanson", category: "80s-90s" },
  { title: "Livin' on a Prayer", artist: "Bon Jovi", category: "80s-90s" },
  { title: "Under Pressure", artist: "Queen", category: "80s-90s" },
  { title: "Blue (Da Ba Dee)", artist: "Eiffel 65", category: "80s-90s" },
  { title: "Bitter Sweet Symphony", artist: "The Verve", category: "80s-90s" },
  { title: "Jump", artist: "Van Halen", category: "80s-90s" },
  { title: "Africa", artist: "Toto", category: "80s-90s" },
  { title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper", category: "80s-90s" },
  { title: "Eye of the Tiger", artist: "Survivor", category: "80s-90s" },
  { title: "No Scrubs", artist: "TLC", category: "80s-90s" },
  { title: "Creep", artist: "Radiohead", category: "80s-90s" },

  // ─── 2000s ────────────────────────────────────────────
  { title: "Crazy in Love", artist: "Beyoncé", category: "2000s" },
  { title: "Hips Don't Lie", artist: "Shakira", category: "2000s" },
  { title: "Mr. Brightside", artist: "The Killers", category: "2000s" },
  { title: "Hey Ya!", artist: "OutKast", category: "2000s" },
  { title: "Toxic", artist: "Britney Spears", category: "2000s" },
  { title: "In the End", artist: "Linkin Park", category: "2000s" },
  { title: "Seven Nation Army", artist: "The White Stripes", category: "2000s" },
  { title: "Umbrella", artist: "Rihanna", category: "2000s" },
  { title: "Poker Face", artist: "Lady Gaga", category: "2000s" },
  { title: "Clocks", artist: "Coldplay", category: "2000s" },
  { title: "Feel Good Inc", artist: "Gorillaz", category: "2000s" },
  { title: "Yeah!", artist: "Usher", category: "2000s" },
  { title: "I Gotta Feeling", artist: "Black Eyed Peas", category: "2000s" },
  { title: "Numb", artist: "Linkin Park", category: "2000s" },
  { title: "Since U Been Gone", artist: "Kelly Clarkson", category: "2000s" },
  { title: "Bohemian Like You", artist: "The Dandy Warhols", category: "2000s" },
  { title: "Stronger", artist: "Kanye West", category: "2000s" },
  { title: "Paper Planes", artist: "M.I.A.", category: "2000s" },
  { title: "Gold Digger", artist: "Kanye West", category: "2000s" },
  { title: "Dani California", artist: "Red Hot Chili Peppers", category: "2000s" },

  // ─── 2010s & Nu ───────────────────────────────────────
  { title: "Get Lucky", artist: "Daft Punk", category: "2010s-nu" },
  { title: "Somebody That I Used to Know", artist: "Gotye", category: "2010s-nu" },
  { title: "Royals", artist: "Lorde", category: "2010s-nu" },
  { title: "Take Me to Church", artist: "Hozier", category: "2010s-nu" },
  { title: "Thinking Out Loud", artist: "Ed Sheeran", category: "2010s-nu" },
  { title: "Despacito", artist: "Luis Fonsi", category: "2010s-nu" },
  { title: "Happier", artist: "Marshmello", category: "2010s-nu" },
  { title: "Radioactive", artist: "Imagine Dragons", category: "2010s-nu" },
  { title: "Counting Stars", artist: "OneRepublic", category: "2010s-nu" },
  { title: "Lean On", artist: "Major Lazer", category: "2010s-nu" },
  { title: "Sorry", artist: "Justin Bieber", category: "2010s-nu" },
  { title: "Closer", artist: "The Chainsmokers", category: "2010s-nu" },
  { title: "Sunflower", artist: "Post Malone", category: "2010s-nu" },
  { title: "lovely", artist: "Billie Eilish", category: "2010s-nu" },
  { title: "Don't Start Now", artist: "Dua Lipa", category: "2010s-nu" },
  { title: "Riptide", artist: "Vance Joy", category: "2010s-nu" },
  { title: "Wake Me Up", artist: "Avicii", category: "2010s-nu" },
  { title: "Levels", artist: "Avicii", category: "2010s-nu" },
  { title: "Titanium", artist: "David Guetta", category: "2010s-nu" },
  { title: "This Is What You Came For", artist: "Calvin Harris", category: "2010s-nu" },

  // ─── Classics & Rock ──────────────────────────────────
  { title: "Bohemian Rhapsody", artist: "Queen", category: "classics" },
  { title: "Hotel California", artist: "Eagles", category: "classics" },
  { title: "Stairway to Heaven", artist: "Led Zeppelin", category: "classics" },
  { title: "Imagine", artist: "John Lennon", category: "classics" },
  { title: "Let It Be", artist: "The Beatles", category: "classics" },
  { title: "Hey Jude", artist: "The Beatles", category: "classics" },
  { title: "Wonderwall", artist: "Oasis", category: "classics" },
  { title: "Wish You Were Here", artist: "Pink Floyd", category: "classics" },
  { title: "Comfortably Numb", artist: "Pink Floyd", category: "classics" },
  { title: "Sultans of Swing", artist: "Dire Straits", category: "classics" },
  { title: "November Rain", artist: "Guns N' Roses", category: "classics" },
  { title: "Born to Run", artist: "Bruce Springsteen", category: "classics" },
  { title: "Piano Man", artist: "Billy Joel", category: "classics" },
  { title: "Knockin' on Heaven's Door", artist: "Bob Dylan", category: "classics" },
  { title: "Suspicious Minds", artist: "Elvis Presley", category: "classics" },
  { title: "Superstition", artist: "Stevie Wonder", category: "classics" },
  { title: "Stayin' Alive", artist: "Bee Gees", category: "classics" },
  { title: "Dancing Queen", artist: "ABBA", category: "classics" },
  { title: "I Will Survive", artist: "Gloria Gaynor", category: "classics" },
  { title: "Don't Stop Me Now", artist: "Queen", category: "classics" },
];

// ─── Category Metadata ──────────────────────────────────
const CATEGORIES = {
  pop: { name: "Pop Hits", description: "De grootste pophits" },
  hiphop: { name: "Hip-Hop & Rap", description: "Beats en bars" },
  dutch: { name: "Nederlandse Hits", description: "Van Hazes tot Goldband" },
  "80s-90s": { name: "80s & 90s", description: "Retro bangers" },
  "2000s": { name: "2000s", description: "Millennium classics" },
  "2010s-nu": { name: "2010s & Nu", description: "Moderne hits" },
  classics: { name: "Classics & Rock", description: "Tijdloze legendes" },
};

// ─── Deezer Fetch Logic ─────────────────────────────────
const DEEZER_SEARCH = "https://api.deezer.com/search";
const DELAY_MS = 350;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchDeezer(title, artist) {
  const query = encodeURIComponent(`${artist} ${title}`);
  const url = `${DEEZER_SEARCH}?q=${query}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.data || data.data.length === 0) return null;

  const titleLower = title.toLowerCase();
  let best = data.data.find(
    (t) =>
      t.title.toLowerCase().includes(titleLower) ||
      titleLower.includes(t.title.toLowerCase())
  );
  if (!best) best = data.data[0];
  if (!best.preview) return null;

  return {
    deezerId: best.id,
    previewUrl: best.preview,
    coverUrl: best.album?.cover_medium || best.album?.cover || null,
    deezerTitle: best.title,
    deezerArtist: best.artist?.name || artist,
  };
}

function buildAcceptedAnswers(title, artist) {
  const answers = new Set();
  answers.add(title.toLowerCase());
  answers.add(title.toLowerCase().replace(/[^a-z0-9\s]/g, ""));
  answers.add(artist.toLowerCase());
  answers.add(artist.toLowerCase().replace(/[^a-z0-9\s]/g, ""));
  answers.add(`${title} ${artist}`.toLowerCase());
  answers.add(`${artist} ${title}`.toLowerCase());
  return [...answers].filter((a) => a.length > 0);
}

async function main() {
  console.log(`\n🎵 Fetching Deezer previews for ${SONGS.length} songs...\n`);

  const results = {};
  let found = 0;
  let notFound = 0;

  for (const cat of Object.keys(CATEGORIES)) {
    results[cat] = [];
  }

  for (let i = 0; i < SONGS.length; i++) {
    const song = SONGS[i];
    process.stdout.write(
      `[${i + 1}/${SONGS.length}] ${song.artist} - ${song.title}... `
    );

    const result = await searchDeezer(song.title, song.artist);

    if (result) {
      found++;
      console.log("✓");
      results[song.category].push({
        title: song.title,
        artist: song.artist,
        acceptedAnswers: buildAcceptedAnswers(song.title, song.artist),
        deezerId: result.deezerId,
        previewUrl: result.previewUrl,
        coverUrl: result.coverUrl,
      });
    } else {
      notFound++;
      console.log("✗ No preview");
    }

    await sleep(DELAY_MS);
  }

  // Build output JSON
  const output = Object.entries(CATEGORIES).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description,
    songs: results[id],
  }));

  const outPath = path.join(__dirname, "..", "server", "data", "songs.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Done! ${found} found, ${notFound} missing`);
  console.log(`📁 Written to: ${outPath}`);
  output.forEach((cat) =>
    console.log(`   ${cat.id}: ${cat.songs.length} songs`)
  );
}

main().catch(console.error);
