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

  // ─── Memes & Guilty Pleasures ─────────────────────────
  { title: "WAP", artist: "Cardi B", category: "memes" },
  { title: "Old Town Road", artist: "Lil Nas X", category: "memes" },
  { title: "MONTERO", artist: "Lil Nas X", category: "memes" },
  { title: "Industry Baby", artist: "Lil Nas X", category: "memes" },
  { title: "Never Gonna Give You Up", artist: "Rick Astley", category: "memes" },
  { title: "Gangnam Style", artist: "PSY", category: "memes" },
  { title: "What Does The Fox Say", artist: "Ylvis", category: "memes" },
  { title: "Baby Shark", artist: "Pinkfong", category: "memes" },
  { title: "Dragostea Din Tei", artist: "O-Zone", category: "memes" },
  { title: "Sandstorm", artist: "Darude", category: "memes" },
  { title: "Caramelldansen", artist: "Caramell", category: "memes" },
  { title: "All Star", artist: "Smash Mouth", category: "memes" },
  { title: "Tequila", artist: "The Champs", category: "memes" },
  { title: "Axel F", artist: "Crazy Frog", category: "memes", deezerId: 387670601 },
  { title: "Gummy Bear Song", artist: "Gummibär", category: "memes" },
  { title: "Witch Doctor", artist: "Cartoons", category: "memes" },
  { title: "Who Let The Dogs Out", artist: "Baha Men", category: "memes" },
  { title: "Cotton Eye Joe", artist: "Rednex", category: "memes" },
  { title: "Barbie Girl", artist: "Aqua", category: "memes" },
  { title: "Friday", artist: "Rebecca Black", category: "memes" },

  // ─── Anime Openings ───────────────────────────────────
  { title: "Unravel", artist: "TK from Ling Tosite Sigure", category: "anime" },
  { title: "Gurenge", artist: "LiSA", category: "anime" },
  { title: "Cruel Angel's Thesis", artist: "Yoko Takahashi", category: "anime" },
  { title: "Blue Bird", artist: "Ikimono-gakari", category: "anime" },
  { title: "Guren no Yumiya", artist: "Linked Horizon", category: "anime" },
  { title: "The Rumbling", artist: "SiM", category: "anime" },
  { title: "Again", artist: "YUI", category: "anime" },
  { title: "Silhouette", artist: "KANA-BOON", category: "anime" },
  { title: "Crossing Field", artist: "LiSA", category: "anime" },
  { title: "We Are!", artist: "Hiroshi Kitadani", category: "anime" },
  { title: "Cha-La Head-Cha-La", artist: "Hironobu Kageyama", category: "anime" },
  { title: "Colors", artist: "FLOW", category: "anime" },
  { title: "Tank!", artist: "Seatbelts", category: "anime" },
  { title: "Shinzou wo Sasageyo!", artist: "Linked Horizon", category: "anime" },
  { title: "Gotta Catch 'Em All", artist: "Jason Paige", category: "anime", deezerId: 433396562 },
  { title: "SPECIALZ", artist: "King Gnu", category: "anime" },
  { title: "Kaikai Kitan", artist: "Eve", category: "anime" },
  { title: "Kick Back", artist: "Kenshi Yonezu", category: "anime" },
  { title: "Idol", artist: "YOASOBI", category: "anime", deezerId: 2210493097 },
  { title: "Renai Circulation", artist: "Kana Hanazawa", category: "anime" },

  // ─── Video Game Music ─────────────────────────────────
  { title: "Megalovania", artist: "Toby Fox", category: "gaming" },
  { title: "Sweden", artist: "C418", category: "gaming" },
  { title: "Jump Up, Super Star!", artist: "Nintendo", category: "gaming", previewUrl: "https://lambda.vgmtreasurechest.com/soundtracks/super-mario-odyssey-original-soundtrack/tvygjaci/2-12.%20Jump%20Up%2C%20Super%20Star%21%20-%20New%20Donk%20City%20Festival.mp3", coverUrl: "https://i1.sndcdn.com/artworks-000249363267-betlv6-t500x500.jpg", startOffset: 30 },
  { title: "Dragonborn", artist: "Jeremy Soule", category: "gaming" },
  { title: "One-Winged Angel", artist: "Nobuo Uematsu", category: "gaming" },
  { title: "Still Alive", artist: "Jonathan Coulton", category: "gaming" },
  { title: "Want You Gone", artist: "Jonathan Coulton", category: "gaming" },
  { title: "Baba Yetu", artist: "Christopher Tin", category: "gaming" },
  { title: "Simple and Clean", artist: "Hikaru Utada", category: "gaming" },
  { title: "Ezio's Family", artist: "Jesper Kyd", category: "gaming" },
  { title: "The Only Thing They Fear Is You", artist: "Mick Gordon", category: "gaming" },
  { title: "Dearly Beloved", artist: "Yoko Shimomura", category: "gaming" },
  { title: "Live and Learn", artist: "Crush 40", category: "gaming" },
  { title: "Silver For Monsters", artist: "Percival Schuttenbach", category: "gaming", deezerId: 448311922 },
  { title: "His Theme", artist: "Toby Fox", category: "gaming" },
  { title: "Last Surprise", artist: "Lyn", category: "gaming" },
  { title: "Weight of the World", artist: "Keiichi Okabe", category: "gaming" },
  { title: "Halo Theme", artist: "Martin O'Donnell", category: "gaming" },
  { title: "Snake Eater", artist: "Cynthia Harrell", category: "gaming" },
  { title: "Life Will Change", artist: "Lyn", category: "gaming" },

  // ─── EDM & Dance ──────────────────────────────────────
  { title: "Clarity", artist: "Zedd", category: "edm" },
  { title: "Faded", artist: "Alan Walker", category: "edm" },
  { title: "Animals", artist: "Martin Garrix", category: "edm" },
  { title: "Tremor", artist: "Dimitri Vegas", category: "edm" },
  { title: "Turn Down for What", artist: "DJ Snake", category: "edm" },
  { title: "Lean On", artist: "Major Lazer", category: "edm" },
  { title: "Where Are Ü Now", artist: "Jack Ü", category: "edm" },
  { title: "Scary Monsters and Nice Sprites", artist: "Skrillex", category: "edm" },
  { title: "Bangarang", artist: "Skrillex", category: "edm" },
  { title: "Satisfaction", artist: "Benny Benassi", category: "edm" },
  { title: "Ghosts 'n' Stuff", artist: "deadmau5", category: "edm" },
  { title: "Strobe", artist: "deadmau5", category: "edm" },
  { title: "In My Mind", artist: "Dynoro", category: "edm" },
  { title: "Summer", artist: "Calvin Harris", category: "edm" },
  { title: "Don't You Worry Child", artist: "Swedish House Mafia", category: "edm" },
  { title: "Greyhound", artist: "Swedish House Mafia", category: "edm" },
  { title: "Tsunami", artist: "DVBBS", category: "edm" },
  { title: "Epic", artist: "Sandro Silva", category: "edm" },
  { title: "Ping Pong", artist: "Armin van Buuren", category: "edm" },
  { title: "Kernkraft 400", artist: "Zombie Nation", category: "edm" },

  // ─── Dutch Hits ───────────────────────────────────────
  { title: "Energie", artist: "Ronnie Flex", category: "dutch" },
  { title: "Dansen in het Donker", artist: "Tabitha", category: "dutch" },
  { title: "Zo Kan Het Dus Ook", artist: "Bløf", category: "dutch" },
  { title: "Ik Neem Je Mee", artist: "Gers Pardoel", category: "dutch" },
  { title: "Roller Coaster", artist: "Danny Vera", category: "dutch" },
  { title: "Ze Huilt Maar Ze Lacht", artist: "André Hazes", category: "dutch" },
  { title: "Leef", artist: "André Hazes Jr", category: "dutch" },
  { title: "Drank & Drugs", artist: "Lil Kleine", category: "dutch" },
  { title: "Hallo Wereld", artist: "Kinderen Voor Kinderen", category: "dutch", deezerId: 1095873782 },
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
  { title: "Starboy", artist: "The Weeknd", category: "2010s-nu" },

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
  memes: { name: "Memes & Guilty Pleasures", description: "Viral hits en guilty pleasures" },
  anime: { name: "Anime Openings", description: "De bekendste anime intros" },
  gaming: { name: "Video Game Music", description: "Iconische game soundtracks" },
  edm: { name: "EDM & Dance", description: "Drops en dancefloor bangers" },
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

// ─── iTunes Fallback ────────────────────────────────────
async function searchItunes(title, artist) {
  const query = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=5&country=NL`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    const titleLower = title.toLowerCase();
    let best = data.results.find(
      (t) =>
        t.trackName?.toLowerCase().includes(titleLower) ||
        titleLower.includes(t.trackName?.toLowerCase() || "")
    );
    if (!best) best = data.results[0];
    if (!best.previewUrl) return null;

    return {
      previewUrl: best.previewUrl,
      coverUrl: best.artworkUrl100?.replace("100x100", "250x250") || null,
    };
  } catch {
    return null;
  }
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

    let result = null;

    // If a hardcoded previewUrl is set, use it directly
    if (song.previewUrl) {
      found++;
      console.log("✓ (hardcoded)");
      const entry = {
        title: song.title,
        artist: song.artist,
        acceptedAnswers: buildAcceptedAnswers(song.title, song.artist),
        deezerId: 0,
        previewUrl: song.previewUrl,
        coverUrl: song.coverUrl || null,
      };
      if (song.startOffset) entry.startOffset = song.startOffset;
      results[song.category].push(entry);
      await sleep(DELAY_MS);
      continue;
    }

    // If a forced deezerId is set, fetch that track directly
    if (song.deezerId) {
      const res = await fetch(`https://api.deezer.com/track/${song.deezerId}`);
      if (res.ok) {
        const t = await res.json();
        if (t.preview) {
          result = {
            deezerId: t.id,
            previewUrl: t.preview,
            coverUrl: t.album?.cover_medium || t.album?.cover || null,
          };
        }
      }
    } else {
      result = await searchDeezer(song.title, song.artist);
    }

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
      // Try iTunes as fallback
      await sleep(DELAY_MS);
      const itunesResult = await searchItunes(song.title, song.artist);
      if (itunesResult) {
        found++;
        console.log("✓ (iTunes)");
        results[song.category].push({
          title: song.title,
          artist: song.artist,
          acceptedAnswers: buildAcceptedAnswers(song.title, song.artist),
          deezerId: 0,
          previewUrl: itunesResult.previewUrl,
          coverUrl: itunesResult.coverUrl,
        });
      } else {
        notFound++;
        console.log("✗ No preview");
      }
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
