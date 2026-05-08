const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'songs.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let added = 0;
let renamed = 0;
let kept = 0;

for (const category of data) {
  for (const song of category.songs) {
    // Rename misnamed clipStartOffset → startOffset
    if (song.clipStartOffset !== undefined && song.startOffset === undefined) {
      song.startOffset = song.clipStartOffset;
      delete song.clipStartOffset;
      renamed++;
    } else if (song.startOffset !== undefined) {
      kept++;
    } else {
      song.startOffset = 0;
      added++;
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Done! Added: ${added}, Renamed: ${renamed}, Kept: ${kept}`);
console.log(`Total songs: ${added + renamed + kept}`);
