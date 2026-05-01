import { Howl, Howler } from "howler";

const SOUNDS = {
  correct: { src: "/sounds/correct.mp3", volume: 0.5 },
  wrong: { src: "/sounds/wrong.mp3", volume: 0.4 },
  roundEnd: { src: "/sounds/round-end.mp3", volume: 0.5 },
  victory: { src: "/sounds/victory.mp3", volume: 0.6 },
  drumroll: { src: "/sounds/drumroll.mp3", volume: 0.4 },
  gameStart: { src: "/sounds/game-start.mp3", volume: 0.5 },
  join: { src: "/sounds/join.mp3", volume: 0.35 },
  tick: { src: "/sounds/tick.mp3", volume: 0.25 },
} as const;

export type SoundName = keyof typeof SOUNDS;

const STORAGE_KEY = "sound-muted";

let muted = localStorage.getItem(STORAGE_KEY) === "true";
Howler.mute(muted);

const howlCache = new Map<SoundName, Howl>();

function getHowl(name: SoundName): Howl {
  let howl = howlCache.get(name);
  if (!howl) {
    const cfg = SOUNDS[name];
    howl = new Howl({
      src: [cfg.src],
      volume: cfg.volume,
      preload: true,
    });
    howlCache.set(name, howl);
  }
  return howl;
}

export function playSound(name: SoundName) {
  if (muted) return;
  const howl = getHowl(name);
  howl.play();
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem(STORAGE_KEY, String(muted));
  Howler.mute(muted);
  return muted;
}
