const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

const tracks = [
  {
    url: 'https://nu.vgmtreasurechest.com/soundtracks/super-smash-bros.-ultimate-expanded-vol.-29-castlevania-switch-gamerip-2018/ctonzhlj/1-01.%20Vampire%20Killer%20%28New%20Remix%29.mp3',
    out: 'vampire-killer-ssbu.mp3',
    start: 0
  },
  {
    url: 'https://nu.vgmtreasurechest.com/soundtracks/super-smash-bros.-ultimate-expanded-vol.-29-castlevania-switch-gamerip-2018/rbfxwqqf/1-16.%20Divine%20Bloodlines.mp3',
    out: 'divine-bloodlines-ssbu.mp3',
    start: 0
  }
];

const outDir = path.join(__dirname, '..', '..', 'client', 'public', 'audio');

async function run() {
  for (const t of tracks) {
    console.log('Downloading:', t.out);
    const res = await fetch(t.url);
    if (!res.ok) { console.log('FAILED:', res.status); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const tmp = path.join(outDir, 'tmp_' + t.out);
    fs.writeFileSync(tmp, buf);
    console.log('Downloaded:', (buf.length / 1024 / 1024).toFixed(1), 'MB');

    const final = path.join(outDir, t.out);
    const cmd = `"${ffmpeg}" -y -i "${tmp}" -ss ${t.start} -t 30 -acodec libmp3lame -b:a 192k "${final}"`;
    console.log('Trimming...');
    execSync(cmd, { stdio: 'pipe' });
    fs.unlinkSync(tmp);
    const stat = fs.statSync(final);
    console.log('Done:', t.out, (stat.size / 1024).toFixed(0), 'KB');
  }
}

run().catch(e => console.error(e));
