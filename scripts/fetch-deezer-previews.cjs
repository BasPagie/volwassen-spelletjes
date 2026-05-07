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

  // ─── Anime OST (instrumental) ───────────────────────────
  { title: "Giorno's Theme", artist: "Yugo Kanno", category: "anime-ost", previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/3a/f3/3d/3af33d22-7b3e-07ce-4127-f074c0d5b01d/mzaf_5631586400418951555.plus.aac.p.m4a", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/9e/f3/0e/9ef30eac-41e4-456a-7c37-340bf3721791/cover.jpg/600x600bb.jpg" },
  { title: "Binks' Sake", artist: "One Piece", category: "anime-ost", deezerId: 4002100951 },
  { title: "Licht und Schatten", artist: "Hiroyuki Sawano", category: "anime-ost" },
  { title: "You Say Run", artist: "Yuki Hayashi", category: "anime-ost" },
  { title: "Vogel im Kafig", artist: "Hiroyuki Sawano", category: "anime-ost" },
  { title: "Sadness and Sorrow", artist: "Toshio Masuda", category: "anime-ost" },
  { title: "The Raising Fighting Spirit", artist: "Toshio Masuda", category: "anime-ost" },
  { title: "Next to You", artist: "Yoshihisa Hirano", category: "anime-ost" },
  { title: "Overtaken", artist: "Kohei Tanaka", category: "anime-ost" },
  { title: "Call of Silence", artist: "Hiroyuki Sawano", category: "anime-ost" },
  { title: "Dragon Ball Z - Prologue & Subtitle", artist: "Kenji Yamamoto", category: "anime-ost" },
  { title: "On the Precipice of Defeat", artist: "Shiro Sagisu", category: "anime-ost" },
  { title: "Fairy Tail Main Theme", artist: "Yasuharu Takanashi", category: "anime-ost" },
  { title: "Howl's Moving Castle - Merry Go Round of Life", artist: "Joe Hisaishi", category: "anime-ost" },
  { title: "One Summer's Day", artist: "Joe Hisaishi", category: "anime-ost" },
  { title: "My Hero Academia - You Can Become a Hero", artist: "Yuki Hayashi", category: "anime-ost" },
  { title: "Naruto Main Theme", artist: "Toshio Masuda", category: "anime-ost" },
  { title: "Demon Slayer - Kamado Tanjiro no Uta", artist: "Go Shiina", category: "anime-ost" },
  { title: "One Punch Man Theme", artist: "Makoto Miyazaki", category: "anime-ost" },
  { title: "Tokyo Ghoul - Glassy Sky", artist: "Donna Burke", category: "anime-ost" },

  // ─── JoJo endings (redistributed to proper categories) ──
  { title: "Roundabout", artist: "Yes", category: "classics" },
  { title: "Walk Like an Egyptian", artist: "The Bangles", category: "80s" },
  { title: "Distant Dreamer", artist: "Duffy", category: "2000s" },
  { title: "I Want You", artist: "Savage Garden", category: "90s" },
  { title: "Freek'n You", artist: "Jodeci", category: "90s" },
  { title: "Modern Crusaders", artist: "Enigma", category: "2000s" },
  { title: "Lost in Paradise", artist: "ALI", category: "anime" },

  // ─── Video Game Songs (vocals) ──────────────────────────
  { title: "Jump Up, Super Star!", artist: "Nintendo", category: "game-songs", previewUrl: "https://lambda.vgmtreasurechest.com/soundtracks/super-mario-odyssey-original-soundtrack/tvygjaci/2-12.%20Jump%20Up%2C%20Super%20Star%21%20-%20New%20Donk%20City%20Festival.mp3", coverUrl: "https://i1.sndcdn.com/artworks-000249363267-betlv6-t500x500.jpg", startOffset: 30 },
  { title: "Still Alive", artist: "Jonathan Coulton", category: "game-songs" },
  { title: "Bury the Light", artist: "Casey Edwards", category: "game-songs", deezerId: 2705769722 },
  { title: "Legends Never Die", artist: "Against the Current", category: "game-songs" },
  { title: "Simple and Clean", artist: "Hikaru Utada", category: "game-songs" },
  { title: "Rules of Nature", artist: "Jamie Christopherson", category: "game-songs", deezerId: 621146202 },
  { title: "Live and Learn", artist: "Crush 40", category: "game-songs" },
  { title: "Last Surprise", artist: "Lyn", category: "game-songs" },
  { title: "Snake Eater", artist: "Cynthia Harrell", category: "game-songs" },
  { title: "Life Will Change", artist: "Lyn", category: "game-songs" },
  { title: "Dragonborn Comes", artist: "Malukah", category: "game-songs" },
  { title: "Sanctuary", artist: "Hikaru Utada", category: "game-songs" },
  { title: "Fly Me to the Moon", artist: "Bayonetta", category: "game-songs", previewUrl: "https://jetta.vgmtreasurechest.com/soundtracks/bayonetta/jeteszwg/1-08.%20Fly%20Me%20To%20The%20Moon%20%28%E2%88%9E%20Climax%20Mix%29.mp3", startOffset: 10 },
  { title: "City Escape", artist: "Crush 40", category: "game-songs" },
  { title: "Weight of the World", artist: "Keiichi Okabe", category: "game-songs" },
  { title: "Baba Yetu", artist: "Christopher Tin", category: "game-songs" },
  { title: "Devils Never Cry", artist: "Capcom", category: "game-songs" },
  { title: "Dragonforce - Through the Fire and Flames", artist: "DragonForce", category: "game-songs" },
  { title: "Want You Gone", artist: "Jonathan Coulton", category: "game-songs" },
  { title: "Open Your Heart", artist: "Crush 40", category: "game-songs", deezerId: 1243877402 },

  // ─── Video Game OST (instrumental) ────────────────────
  { title: "Megalovania", artist: "Toby Fox", category: "game-ost" },
  { title: "Sweden", artist: "C418", category: "game-ost" },
  { title: "Dragonborn", artist: "Jeremy Soule", category: "game-ost" },
  { title: "One-Winged Angel", artist: "Nobuo Uematsu", category: "game-ost" },
  { title: "Ezio's Family", artist: "Jesper Kyd", category: "game-ost" },
  { title: "Dearly Beloved", artist: "Yoko Shimomura", category: "game-ost" },
  { title: "Silver For Monsters", artist: "Percival Schuttenbach", category: "game-ost", deezerId: 448311922 },
  { title: "His Theme", artist: "Toby Fox", category: "game-ost" },
  { title: "San Andreas Theme", artist: "Michael Hunter", category: "game-ost", deezerId: 2461610925 },
  { title: "Halo Theme", artist: "Martin O'Donnell", category: "game-ost" },
  { title: "Wet Hands", artist: "C418", category: "game-ost" },
  { title: "Song of Storms", artist: "Koji Kondo", category: "game-ost" },
  { title: "Main Theme", artist: "The Elder Scrolls", category: "game-ost" },
  { title: "Pigstep", artist: "Lena Raine", category: "game-ost" },
  { title: "BFG Division", artist: "Mick Gordon", category: "game-ost" },
  { title: "God of War", artist: "Bear McCreary", category: "game-ost" },
  { title: "Gusty Garden Galaxy", artist: "Mahito Yokota", category: "game-ost" },
  { title: "Undertale", artist: "Toby Fox", category: "game-ost" },
  { title: "Main Theme - The Witcher 3", artist: "Marcin Przybylowicz", category: "game-ost" },
  { title: "Persona 5 - Beneath the Mask", artist: "Lyn", category: "game-ost" },

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
  // ─── 80s ─────────────────────────────────────────────
  { title: "Take On Me", artist: "a-ha", category: "80s" },
  { title: "Billie Jean", artist: "Michael Jackson", category: "80s" },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses", category: "80s" },
  { title: "Like a Prayer", artist: "Madonna", category: "80s" },
  { title: "Don't Stop Believin'", artist: "Journey", category: "80s" },
  { title: "Livin' on a Prayer", artist: "Bon Jovi", category: "80s" },
  { title: "Under Pressure", artist: "Queen", category: "80s" },
  { title: "Jump", artist: "Van Halen", category: "80s" },
  { title: "Africa", artist: "Toto", category: "80s" },
  { title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper", category: "80s" },
  { title: "Eye of the Tiger", artist: "Survivor", category: "80s" },
  { title: "Thriller", artist: "Michael Jackson", category: "80s" },
  { title: "Every Breath You Take", artist: "The Police", category: "80s" },
  { title: "Tainted Love", artist: "Soft Cell", category: "80s" },
  { title: "Wake Me Up Before You Go-Go", artist: "Wham!", category: "80s" },
  { title: "I Wanna Dance with Somebody", artist: "Whitney Houston", category: "80s" },
  { title: "Come On Eileen", artist: "Dexys Midnight Runners", category: "80s" },
  { title: "99 Luftballons", artist: "Nena", category: "80s" },
  { title: "With or Without You", artist: "U2", category: "80s" },
  { title: "Karma Chameleon", artist: "Culture Club", category: "80s" },

  // ─── 90s ─────────────────────────────────────────────
  { title: "Smells Like Teen Spirit", artist: "Nirvana", category: "90s" },
  { title: "Wannabe", artist: "Spice Girls", category: "90s" },
  { title: "Everybody", artist: "Backstreet Boys", category: "90s" },
  { title: "I Want It That Way", artist: "Backstreet Boys", category: "90s" },
  { title: "MMMBop", artist: "Hanson", category: "90s" },
  { title: "Blue (Da Ba Dee)", artist: "Eiffel 65", category: "90s" },
  { title: "Bitter Sweet Symphony", artist: "The Verve", category: "90s" },
  { title: "No Scrubs", artist: "TLC", category: "90s" },
  { title: "Creep", artist: "Radiohead", category: "90s" },
  { title: "...Baby One More Time", artist: "Britney Spears", category: "90s" },
  { title: "Gangsta's Paradise", artist: "Coolio", category: "90s" },
  { title: "Wonderwall", artist: "Oasis", category: "90s" },
  { title: "Zombie", artist: "The Cranberries", category: "90s" },
  { title: "Waterfalls", artist: "TLC", category: "90s" },
  { title: "Losing My Religion", artist: "R.E.M.", category: "90s" },
  { title: "Ice Ice Baby", artist: "Vanilla Ice", category: "90s" },
  { title: "Livin' La Vida Loca", artist: "Ricky Martin", category: "90s" },
  { title: "My Heart Will Go On", artist: "Celine Dion", category: "90s" },
  { title: "Iris", artist: "Goo Goo Dolls", category: "90s" },
  { title: "Return of the Mack", artist: "Mark Morrison", category: "90s" },

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

  // ─── Disney ────────────────────────────────────────────
  { title: "Let It Go", artist: "Idina Menzel", category: "disney", deezerId: 73248591, altTitles: ["frozen"] },
  { title: "A Whole New World", artist: "Lea Salonga", category: "disney", deezerId: 120917666, altTitles: ["aladdin"] },
  { title: "Circle of Life", artist: "Elton John", category: "disney", deezerId: 540930, altTitles: ["lion king"] },
  { title: "Under the Sea", artist: "Samuel E. Wright", category: "disney", deezerId: 145187392, altTitles: ["kleine zeemeermin"] },
  { title: "Hakuna Matata", artist: "The Lion King", category: "disney", deezerId: 540932 },
  { title: "Once Upon a Dream", artist: "Mary Costa", category: "disney", deezerId: 13796248, altTitles: ["sleeping beauty"] },
  { title: "We Don't Talk About Bruno", artist: "Encanto", category: "disney", deezerId: 1578198647, altTitles: ["bruno"] },
  { title: "How Far I'll Go", artist: "Auli'i Cravalho", category: "disney", deezerId: 136349848, altTitles: ["moana", "vaiana"] },
  { title: "You've Got a Friend in Me", artist: "Toy Story", category: "disney", deezerId: 2304081, altTitles: ["randy newman"] },
  { title: "Beauty and the Beast", artist: "Celine Dion & Peabo Bryson", category: "disney", deezerId: 2942853, altTitles: ["belle en het beest"] },
  { title: "Can You Feel the Love Tonight", artist: "Elton John", category: "disney", deezerId: 97114650, altTitles: ["lion king"] },
  { title: "Remember Me", artist: "Anthony Gonzalez", category: "disney", deezerId: 424600092, altTitles: ["coco"] },
  { title: "Go the Distance", artist: "Roger Bart", category: "disney", deezerId: 531228861, altTitles: ["hercules"] },
  { title: "I'll Make a Man Out of You", artist: "Donny Osmond", category: "disney", deezerId: 1377537512, altTitles: ["mulan"] },
  { title: "Colors of the Wind", artist: "Judy Kuhn", category: "disney", deezerId: 3118641, altTitles: ["pocahontas"] },
  { title: "Friend Like Me", artist: "Robin Williams", category: "disney", deezerId: 120917660, altTitles: ["aladdin"] },
  { title: "Part of Your World", artist: "Jodi Benson", category: "disney", deezerId: 145187390, altTitles: ["little mermaid", "kleine zeemeermin"] },
  { title: "I See the Light", artist: "Mandy Moore", category: "disney", deezerId: 7599985, altTitles: ["tangled", "rapunzel"] },
  { title: "When You Wish Upon a Star", artist: "Cliff Edwards", category: "disney", deezerId: 677778432, altTitles: ["pinocchio"] },
  { title: "Be Our Guest", artist: "Angela Lansbury", category: "disney", deezerId: 7087380, altTitles: ["beauty and the beast"] },
  { title: "Almost There", artist: "Anika Noni Rose", category: "disney", deezerId: 534375642, altTitles: ["princess and the frog", "prinses en de kikker"] },
  { title: "So This Is Love", artist: "Ilene Woods", category: "disney", deezerId: 13796253, altTitles: ["cinderella", "assepoester"] },
  { title: "Reflection", artist: "Lea Salonga", category: "disney", deezerId: 1377537502, altTitles: ["mulan"] },
  { title: "You'll Be in My Heart", artist: "Phil Collins", category: "disney", deezerId: 561875132, altTitles: ["tarzan"] },
  { title: "I Just Can't Wait to Be King", artist: "Jason Weaver", category: "disney", deezerId: 24307581, altTitles: ["lion king"] },
  { title: "I Won't Say (I'm in Love)", artist: "Susan Egan", category: "disney", deezerId: 13796274, altTitles: ["hercules"] },
  { title: "Zero to Hero", artist: "Chorus - Hercules", category: "disney", deezerId: 531228901, altTitles: ["hercules"] },
  { title: "Prince Ali", artist: "Robin Williams", category: "disney", deezerId: 120917664, altTitles: ["aladdin"] },
  { title: "Bibbidi-Bobbidi-Boo", artist: "Verna Felton", category: "disney", deezerId: 1518135502, altTitles: ["cinderella", "assepoester"] },
  { title: "Kiss the Girl", artist: "Samuel E. Wright", category: "disney", deezerId: 3118575, altTitles: ["little mermaid", "kleine zeemeermin"] },

  // ─── Musical & Broadway ───────────────────────────────
  { title: "Defying Gravity", artist: "Wicked", category: "musical", deezerId: 2124211 },
  { title: "The Phantom of the Opera", artist: "Andrew Lloyd Webber", category: "musical", deezerId: 3582507891 },
  { title: "Memory", artist: "Cats", category: "musical", deezerId: 3582489451 },
  { title: "One Day More", artist: "Les Misérables", category: "musical", deezerId: 65153362, altTitles: ["les mis"] },
  { title: "My Shot", artist: "Hamilton", category: "musical", deezerId: 107832272 },
  { title: "Wait for It", artist: "Hamilton", category: "musical", deezerId: 107832292 },
  { title: "Seasons of Love", artist: "Rent", category: "musical", deezerId: 3664291, altTitles: ["525600 minutes"] },
  { title: "Mamma Mia", artist: "ABBA", category: "musical", deezerId: 884030 },
  { title: "You're the One That I Want", artist: "Grease", category: "musical", deezerId: 9242505, altTitles: ["john travolta"] },
  { title: "All That Jazz", artist: "Chicago", category: "musical", deezerId: 869160 },
  { title: "Don't Cry for Me Argentina", artist: "Evita", category: "musical", deezerId: 2794568, altTitles: ["madonna"] },
  { title: "Summer Nights", artist: "Grease", category: "musical", deezerId: 781563042 },
  { title: "The Music of the Night", artist: "Phantom of the Opera", category: "musical", deezerId: 3582507901 },
  { title: "Cabaret", artist: "Liza Minnelli", category: "musical", deezerId: 2512727 },
  { title: "Do You Hear the People Sing", artist: "Les Misérables", category: "musical", deezerId: 1188160, altTitles: ["les mis"] },
  { title: "The Greatest Show", artist: "The Greatest Showman", category: "musical", deezerId: 435175452, altTitles: ["hugh jackman"] },
  { title: "This Is Me", artist: "The Greatest Showman", category: "musical", deezerId: 435175512, altTitles: ["keala settle"] },
  { title: "I Dreamed a Dream", artist: "Les Misérables", category: "musical", deezerId: 1267066 },
  { title: "Alexander Hamilton", artist: "Hamilton", category: "musical", deezerId: 107832268 },
  { title: "Popular", artist: "Wicked", category: "musical", deezerId: 2124207 },

  // ─── Indie & Alternative ──────────────────────────────
  { title: "Do I Wanna Know?", artist: "Arctic Monkeys", category: "indie-alt", deezerId: 70322130 },
  { title: "Mr. Brightside", artist: "The Killers", category: "indie-alt", deezerId: 953097 },
  { title: "Somebody That I Used to Know", artist: "Gotye", category: "indie-alt", deezerId: 999163452 },
  { title: "The Less I Know the Better", artist: "Tame Impala", category: "indie-alt", deezerId: 103052662 },
  { title: "Creep", artist: "Radiohead", category: "indie-alt", deezerId: 138547415 },
  { title: "Pumped Up Kicks", artist: "Foster the People", category: "indie-alt", deezerId: 15546830 },
  { title: "Take Me Out", artist: "Franz Ferdinand", category: "indie-alt", deezerId: 4315684 },
  { title: "Instant Crush", artist: "Daft Punk ft. Julian Casablancas", category: "indie-alt", deezerId: 67238732 },
  { title: "Tongue Tied", artist: "Grouplove", category: "indie-alt", deezerId: 13544758 },
  { title: "Feel Good Inc.", artist: "Gorillaz", category: "indie-alt", deezerId: 3129407 },
  { title: "Seven Nation Army", artist: "The White Stripes", category: "indie-alt", deezerId: 1153182282 },
  { title: "Fluorescent Adolescent", artist: "Arctic Monkeys", category: "indie-alt", deezerId: 4315382 },
  { title: "Rebellion (Lies)", artist: "Arcade Fire", category: "indie-alt", deezerId: 374205521 },
  { title: "Bitter Sweet Symphony", artist: "The Verve", category: "indie-alt", deezerId: 398570642 },
  { title: "Last Nite", artist: "The Strokes", category: "indie-alt", deezerId: 958109, altTitles: ["last night"] },
  { title: "Electric Feel", artist: "MGMT", category: "indie-alt", deezerId: 536484 },
  { title: "Karma Police", artist: "Radiohead", category: "indie-alt", deezerId: 138539981 },
  { title: "Are You Gonna Be My Girl", artist: "Jet", category: "indie-alt", deezerId: 62166723 },
  { title: "Reptilia", artist: "The Strokes", category: "indie-alt", deezerId: 14880812 },
  { title: "Float On", artist: "Modest Mouse", category: "indie-alt", deezerId: 581923 },

  // ─── Metal & Rock ─────────────────────────────────────
  { title: "Enter Sandman", artist: "Metallica", category: "metal-rock", deezerId: 857297 },
  { title: "Back in Black", artist: "AC/DC", category: "metal-rock", deezerId: 637822 },
  { title: "Thunderstruck", artist: "AC/DC", category: "metal-rock", deezerId: 92720102 },
  { title: "Smells Like Teen Spirit", artist: "Nirvana", category: "metal-rock", deezerId: 466922 },
  { title: "Killing in the Name", artist: "Rage Against the Machine", category: "metal-rock", deezerId: 62082829, altTitles: ["rage against the machine", "ratm"] },
  { title: "Numb", artist: "Linkin Park", category: "metal-rock", deezerId: 540519 },
  { title: "Master of Puppets", artist: "Metallica", category: "metal-rock", deezerId: 424565232 },
  { title: "Chop Suey!", artist: "System of a Down", category: "metal-rock", deezerId: 2404306 },
  { title: "Welcome to the Jungle", artist: "Guns N' Roses", category: "metal-rock", deezerId: 2218492 },
  { title: "Highway to Hell", artist: "AC/DC", category: "metal-rock", deezerId: 582430 },
  { title: "Paranoid", artist: "Black Sabbath", category: "metal-rock", deezerId: 4398592 },
  { title: "Walk", artist: "Pantera", category: "metal-rock", deezerId: 1152833 },
  { title: "Crazy Train", artist: "Ozzy Osbourne", category: "metal-rock", deezerId: 906920 },
  { title: "The Trooper", artist: "Iron Maiden", category: "metal-rock", deezerId: 3183062 },
  { title: "Raining Blood", artist: "Slayer", category: "metal-rock", deezerId: 4297129 },
  { title: "Breaking the Law", artist: "Judas Priest", category: "metal-rock", deezerId: 6619289 },
  { title: "Du Hast", artist: "Rammstein", category: "metal-rock", deezerId: 630595142 },
  { title: "Bodies", artist: "Drowning Pool", category: "metal-rock", deezerId: 1269008, altTitles: ["let the bodies hit the floor"] },
  { title: "Toxicity", artist: "System of a Down", category: "metal-rock", deezerId: 15523793 },
  { title: "One", artist: "Metallica", category: "metal-rock", deezerId: 575867572 },
];

// ─── Category Metadata ──────────────────────────────────
const CATEGORIES = {
  pop: { name: "Pop Hits", description: "De grootste pophits" },
  memes: { name: "Memes & Guilty Pleasures", description: "Viral hits en guilty pleasures" },
  anime: { name: "Anime Openings", description: "De bekendste anime intros" },
  "anime-ost": { name: "Anime OST", description: "Iconische anime soundtracks" },
  "game-songs": { name: "Video Game Songs", description: "Games met zang en lyrics" },
  "game-ost": { name: "Video Game OST", description: "Iconische instrumentale game soundtracks" },
  edm: { name: "EDM & Dance", description: "Drops en dancefloor bangers" },
  dutch: { name: "Nederlandse Hits", description: "Van Hazes tot Goldband" },
  "80s": { name: "80s", description: "De beste hits uit de jaren 80" },
  "90s": { name: "90s", description: "De beste hits uit de jaren 90" },
  "2000s": { name: "2000s", description: "Millennium classics" },
  "2010s-nu": { name: "2010s & Nu", description: "Moderne hits" },
  classics: { name: "Classics & Rock", description: "Tijdloze legendes" },
  disney: { name: "Disney", description: "Iconische Disney-liedjes" },
  musical: { name: "Musical & Broadway", description: "Bekende musical- en Broadway-nummers" },
  "indie-alt": { name: "Indie & Alternative", description: "Indie rock en alternatieve muziek" },
  "metal-rock": { name: "Metal & Rock", description: "Heavy metal en hardrock klassiekers" },
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

function buildAcceptedAnswers(title, artist, altTitles) {
  const answers = new Set();
  answers.add(title.toLowerCase());
  answers.add(title.toLowerCase().replace(/[^a-z0-9\s]/g, ""));
  answers.add(artist.toLowerCase());
  answers.add(artist.toLowerCase().replace(/[^a-z0-9\s]/g, ""));
  answers.add(`${title} ${artist}`.toLowerCase());
  answers.add(`${artist} ${title}`.toLowerCase());
  if (altTitles) {
    for (const alt of altTitles) {
      answers.add(alt.toLowerCase());
      answers.add(alt.toLowerCase().replace(/[^a-z0-9\s]/g, ""));
    }
  }
  return [...answers].filter((a) => a.length > 0);
}

async function main() {
  const targetCategory = process.argv[2] || null;

  if (targetCategory && !CATEGORIES[targetCategory]) {
    console.error(`Unknown category: ${targetCategory}`);
    console.error(`Available: ${Object.keys(CATEGORIES).join(", ")}`);
    process.exit(1);
  }

  const songsToFetch = targetCategory
    ? SONGS.filter((s) => s.category === targetCategory)
    : SONGS;

  console.log(
    `\n🎵 Fetching Deezer previews for ${songsToFetch.length} songs${targetCategory ? ` (category: ${targetCategory})` : ""}...\n`
  );

  // Load existing data if doing a single category update
  const outPath = path.join(__dirname, "..", "server", "data", "songs.json");
  let existingData = [];
  if (targetCategory && fs.existsSync(outPath)) {
    existingData = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  }

  const results = {};
  let found = 0;
  let notFound = 0;

  for (const cat of Object.keys(CATEGORIES)) {
    results[cat] = [];
  }

  for (let i = 0; i < songsToFetch.length; i++) {
    const song = songsToFetch[i];
    process.stdout.write(
      `[${i + 1}/${songsToFetch.length}] ${song.artist} - ${song.title}... `
    );

    let result = null;

    // If a hardcoded previewUrl is set, use it directly
    if (song.previewUrl) {
      found++;
      console.log("✓ (hardcoded)");
      const entry = {
        title: song.title,
        artist: song.artist,
        acceptedAnswers: buildAcceptedAnswers(song.title, song.artist, song.altTitles),
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
        acceptedAnswers: buildAcceptedAnswers(song.title, song.artist, song.altTitles),
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
          acceptedAnswers: buildAcceptedAnswers(song.title, song.artist, song.altTitles),
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
  let output;
  if (targetCategory) {
    // Merge: replace only the target category in existing data
    const newCatEntry = {
      id: targetCategory,
      name: CATEGORIES[targetCategory].name,
      description: CATEGORIES[targetCategory].description,
      songs: results[targetCategory],
    };
    const idx = existingData.findIndex((c) => c.id === targetCategory);
    if (idx >= 0) {
      existingData[idx] = newCatEntry;
    } else {
      existingData.push(newCatEntry);
    }
    output = existingData;
  } else {
    output = Object.entries(CATEGORIES).map(([id, meta]) => ({
      id,
      name: meta.name,
      description: meta.description,
      songs: results[id],
    }));
  }

  const outPath2 = outPath;
  fs.writeFileSync(outPath2, JSON.stringify(output, null, 2));

  console.log(`\n✅ Done! ${found} found, ${notFound} missing`);
  console.log(`📁 Written to: ${outPath2}`);
  const categoriesToShow = targetCategory
    ? output.filter((c) => c.id === targetCategory)
    : output;
  categoriesToShow.forEach((cat) =>
    console.log(`   ${cat.id}: ${cat.songs.length} songs`)
  );
}

main().catch(console.error);
