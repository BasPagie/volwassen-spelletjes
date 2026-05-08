const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/songs.json', 'utf8'));

const gameMap = {
  'Megalovania': ['undertale'],
  'Sweden': ['minecraft'],
  'Dragonborn': ['skyrim', 'elder scrolls'],
  'One-Winged Angel': ['final fantasy', 'final fantasy 7', 'ff7'],
  "Ezio's Family": ['assassins creed', "assassin's creed"],
  'Dearly Beloved': ['kingdom hearts'],
  'His Theme': ['undertale'],
  'Wet Hands': ['minecraft'],
  'BFG Division': ['doom'],
  'Gusty Garden Galaxy': ['super mario galaxy', 'mario'],
};

const animeMap = {
  'Unravel': ['tokyo ghoul'],
  'Gurenge': ['demon slayer', 'kimetsu no yaiba'],
  "Cruel Angel's Thesis": ['evangelion', 'neon genesis evangelion'],
  'Blue Bird': ['naruto', 'naruto shippuden'],
  'Guren no Yumiya': ['attack on titan', 'shingeki no kyojin'],
  'The Rumbling': ['attack on titan'],
  'Again': ['fullmetal alchemist', 'fullmetal alchemist brotherhood'],
  'Silhouette': ['naruto', 'naruto shippuden'],
  'Crossing Field': ['sword art online', 'sao'],
  'We Are!': ['one piece'],
  'Cha-La Head-Cha-La': ['dragon ball z', 'dragon ball'],
  'Colors': ['code geass'],
  'Tank!': ['cowboy bebop'],
  'Shinzou wo Sasageyo!': ['attack on titan'],
  "Gotta Catch 'Em All": ['pokemon'],
  'SPECIALZ': ['jujutsu kaisen'],
  'Kaikai Kitan': ['jujutsu kaisen'],
  'Kick Back': ['chainsaw man'],
  'Idol': ['oshi no ko'],
  'Renai Circulation': ['bakemonogatari', 'monogatari'],
  'Lost in Paradise': ['jujutsu kaisen'],
};

function addSources(catId, map) {
  const cat = d.find(x => x.id === catId);
  if (!cat) { console.log('Category not found:', catId); return; }
  for (const song of cat.songs) {
    const toAdd = map[song.title];
    if (!toAdd) continue;
    for (const ans of toAdd) {
      if (!song.acceptedAnswers.includes(ans)) {
        song.acceptedAnswers.push(ans);
        console.log(`${catId}: ${song.title} += "${ans}"`);
      }
    }
  }
}

addSources('game-ost', gameMap);
addSources('anime', animeMap);

fs.writeFileSync('data/songs.json', JSON.stringify(d, null, 2) + '\n');
console.log('Done!');
