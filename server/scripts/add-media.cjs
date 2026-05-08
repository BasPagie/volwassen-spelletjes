const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/songs.json', 'utf8'));

const mediaMap = {
  'game-ost': {
    'Megalovania': 'Undertale',
    'Sweden': 'Minecraft',
    'Dragonborn': 'The Elder Scrolls V: Skyrim',
    'One-Winged Angel': 'Final Fantasy VII',
    "Ezio's Family": "Assassin's Creed II",
    'Dearly Beloved': 'Kingdom Hearts',
    'His Theme': 'Undertale',
    'San Andreas Theme': 'Grand Theft Auto: San Andreas',
    'Halo Theme': 'Halo: Combat Evolved',
    'Wet Hands': 'Minecraft',
    'Song of Storms': 'The Legend of Zelda: Ocarina of Time',
    'BFG Division': 'DOOM (2016)',
    'God of War': 'God of War (2018)',
    'Gusty Garden Galaxy': 'Super Mario Galaxy',
    'Undertale': 'Undertale',
    'Ludwig, the Holy Blade': 'Bloodborne',
    'Cleric Beast': 'Bloodborne',
    'Gwyn, Lord of Cinder': 'Dark Souls',
    'Soul of Cinder': 'Dark Souls III',
    'The Other Promise': 'Kingdom Hearts II',
    'Elden Ring': 'Elden Ring',
    'Malenia, Blade of Miquella': 'Elden Ring',
    'BIG SHOT': 'Deltarune',
    'THE WORLD REVOLVING': 'Deltarune',
    'Aquatic Ambiance': 'Donkey Kong Country',
    "Guile's Theme": 'Street Fighter II',
    'Katamari on the Rocks': 'Katamari Damacy',
    'The Last of Us': 'The Last of Us',
    'Divine Bloodlines': 'Castlevania: Rondo of Blood',
    'Vampire Killer': 'Castlevania',
    "Let's Dance, Boys!": 'Bayonetta',
    'Majula': 'Dark Souls II',
    'Vector to the Heavens': 'Kingdom Hearts 358/2 Days',
    'Dancer of the Boreal Valley': 'Dark Souls III',
    'Slave Knight Gael': 'Dark Souls III',
    'Forze del Male': 'Kingdom Hearts',
  },
  'game-songs': {
    'Jump Up, Super Star!': 'Super Mario Odyssey',
    'Still Alive': 'Portal',
    'Bury the Light': 'Devil May Cry 5',
    'Legends Never Die': 'League of Legends',
    'Simple and Clean': 'Kingdom Hearts',
    'Rules of Nature': 'Metal Gear Rising: Revengeance',
    'Live and Learn': 'Sonic Adventure 2',
    'Last Surprise': 'Persona 5',
    'Snake Eater': 'Metal Gear Solid 3: Snake Eater',
    'Life Will Change': 'Persona 5',
    'Devil Trigger': 'Devil May Cry 5',
    'Sanctuary': 'Kingdom Hearts II',
    'Fly Me to the Moon': 'Bayonetta',
    'City Escape': 'Sonic Adventure 2',
    'Weight of the World': 'NieR: Automata',
    'Baba Yetu': 'Civilization IV',
    'First Light': 'Alan Wake 2',
    'Dragonforce - Through the Fire and Flames': 'Guitar Hero III',
    'Want You Gone': 'Portal 2',
    'Open Your Heart': 'Sonic Adventure',
    'Down by the River': "Baldur's Gate 3",
    'Lumière': "Baldur's Gate 3",
  },
  'anime': {
    'Unravel': 'Tokyo Ghoul',
    'Gurenge': 'Demon Slayer',
    "Cruel Angel's Thesis": 'Neon Genesis Evangelion',
    'Blue Bird': 'Naruto Shippuden',
    'Guren no Yumiya': 'Attack on Titan',
    'The Rumbling': 'Attack on Titan',
    'Again': 'Fullmetal Alchemist: Brotherhood',
    'Silhouette': 'Naruto Shippuden',
    'Crossing Field': 'Sword Art Online',
    'We Are!': 'One Piece',
    'Sono Chi no Sadame': "JoJo's Bizarre Adventure",
    'Colors': 'Code Geass',
    'Tank!': 'Cowboy Bebop',
    'Shinzou wo Sasageyo!': 'Attack on Titan',
    "Gotta Catch 'Em All": 'Pokémon',
    'SPECIALZ': 'Jujutsu Kaisen',
    'Kaikai Kitan': 'Jujutsu Kaisen',
    'Kick Back': 'Chainsaw Man',
    'Idol': 'Oshi no Ko',
    'Renai Circulation': 'Bakemonogatari',
    'Lost in Paradise': 'Jujutsu Kaisen',
    'Bloody Stream': "JoJo's Bizarre Adventure",
    'Stand Proud': "JoJo's Bizarre Adventure",
    '99': 'Mob Psycho 100',
    'UUUUUS!': 'One Piece',
  },
  'anime-ost': {
    "il vento d'oro": "JoJo's Bizarre Adventure: Golden Wind",
    "Binks' Sake": 'One Piece',
    'Licht und Schatten': 'Attack on Titan',
    'You Say Run': 'My Hero Academia',
    'Vogel im Kafig': 'Attack on Titan',
    'Sadness and Sorrow': 'Naruto',
    'The Raising Fighting Spirit': 'Naruto',
    'Next to You': 'Death Note',
    'Overtaken': 'One Piece',
    'Call of Silence': 'Attack on Titan',
    'Dragon Ball Z - Prologue & Subtitle': 'Dragon Ball Z',
    'On the Precipice of Defeat': 'Bleach',
    'Fairy Tail Main Theme': 'Fairy Tail',
    "Howl's Moving Castle - Merry Go Round of Life": "Howl's Moving Castle",
    "One Summer's Day": 'Spirited Away',
    'My Hero Academia - You Can Become a Hero': 'My Hero Academia',
    'Naruto Main Theme': 'Naruto',
    'Demon Slayer - Kamado Tanjiro no Uta': 'Demon Slayer',
    'One Punch Man Theme': 'One Punch Man',
    'Tokyo Ghoul - Glassy Sky': 'Tokyo Ghoul',
  },
};

let count = 0;
for (const [catId, map] of Object.entries(mediaMap)) {
  const cat = d.find(x => x.id === catId);
  if (!cat) { console.log('Category not found:', catId); continue; }
  for (const song of cat.songs) {
    const media = map[song.title];
    if (media) {
      song.media = media;
      count++;
      console.log(`${catId}: ${song.title} → ${media}`);
    } else {
      console.log(`WARNING: No media mapping for "${song.title}" in ${catId}`);
    }
  }
}

fs.writeFileSync('data/songs.json', JSON.stringify(d, null, 2) + '\n');
console.log(`\nDone! Added media to ${count} songs.`);
