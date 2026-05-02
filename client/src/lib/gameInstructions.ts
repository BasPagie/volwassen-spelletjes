import type { RoundType, GameCategory } from "shared/types";

export interface InstructionStep {
  emoji: string;
  text: string;
}

export interface GameInstruction {
  icon: string;
  title: string;
  color: string; // tailwind color key: blue, purple, amber, green, red
  summary: string;
  steps: InstructionStep[];
}

const ROUND_INSTRUCTIONS: Record<RoundType, GameInstruction> = {
  connections: {
    icon: "🔗",
    title: "Connections",
    color: "blue",
    summary: "Verdeel 16 woorden in 4 groepen van 4.",
    steps: [
      { emoji: "👆", text: "Tik 4 woorden aan die bij elkaar horen" },
      { emoji: "✅", text: "Druk op 'Controleer' om je keuze te bevestigen" },
      { emoji: "🎯", text: "+100 punten per goede groep, −25 bij fout" },
      { emoji: "💡", text: "Bijna goed? Juiste woorden kleuren geel als hint" },
    ],
  },
  puzzelronde: {
    icon: "🧩",
    title: "Puzzelronde",
    color: "purple",
    summary: "16 woorden, 4 groepen — raad het verbindende woord.",
    steps: [
      { emoji: "👀", text: "Je ziet 16 woorden die in 4 groepen van 4 horen" },
      { emoji: "⌨️", text: "Typ het woord dat de groep verbindt" },
      { emoji: "🎯", text: "+150 punten per goed antwoord" },
      { emoji: "✅", text: "Geen straf voor fout, typfoutjes worden geaccepteerd" },
    ],
  },
  opendeur: {
    icon: "🚪",
    title: "Open Deur",
    color: "amber",
    summary: "3 vragen, typ zoveel goede antwoorden als je kan.",
    steps: [
      { emoji: "❓", text: "Elke vraag heeft 4 juiste antwoorden" },
      { emoji: "💡", text: "Je ziet de eerste letter van elk antwoord als hint" },
      { emoji: "🎯", text: "+50 punten per goed antwoord" },
      { emoji: "➡️", text: "Vastzit? Ga door naar de volgende vraag" },
    ],
  },
  lingo: {
    icon: "🟩",
    title: "Lingo",
    color: "green",
    summary: "Raad het 5-letter woord in zo min mogelijk beurten.",
    steps: [
      { emoji: "🔤", text: "Je krijgt de eerste letter, raad het woord in 5 pogingen" },
      { emoji: "🟩", text: "Groen = juiste letter op de juiste plek" },
      { emoji: "🟨", text: "Geel = letter zit in het woord, verkeerde plek" },
      { emoji: "🎯", text: "+100 per woord + 20 bonus per overgebleven poging" },
    ],
  },
};

const CATEGORY_INSTRUCTIONS: Partial<Record<GameCategory, GameInstruction>> = {
  "what-am-i": {
    icon: "🎭",
    title: "Wie Ben Ik?",
    color: "purple",
    summary: "Raad welk karakter op jouw hoofd staat!",
    steps: [
      { emoji: "👀", text: "Je ziet de karakters van anderen, maar niet die van jezelf" },
      { emoji: "⌨️", text: "Typ je gok in en druk op Enter — typfoutjes worden geaccepteerd" },
      { emoji: "❌", text: "Fout? 30 seconden wachten voor je opnieuw mag raden" },
      { emoji: "🏆", text: "Sneller raden + minder fouten = meer punten" },
    ],
  },
  "snelste-vinger": {
    icon: "🏃",
    title: "Snelste Vinger",
    color: "red",
    summary: "Buzz als eerste het juiste antwoord!",
    steps: [
      { emoji: "⌨️", text: "Typ je antwoord en druk op BUZZ — eerste correct wint!" },
      { emoji: "❌", text: "Fout geantwoord? Strafpunten, maar je mag opnieuw proberen" },
      { emoji: "🔥", text: "Meerdere vragen achter elkaar goed = streak bonus" },
      { emoji: "⏱️", text: "Elke vraag heeft een tijdslimiet — wees snel!" },
    ],
  },
};

export function getInstruction(key: RoundType | GameCategory): GameInstruction | null {
  if (key in ROUND_INSTRUCTIONS) {
    return ROUND_INSTRUCTIONS[key as RoundType];
  }
  return CATEGORY_INSTRUCTIONS[key as GameCategory] ?? null;
}

export function getBriefingStorageKey(key: string): string {
  return `briefing-seen-${key}`;
}

export function hasSeen(key: string): boolean {
  return localStorage.getItem(getBriefingStorageKey(key)) === "1";
}

export function markSeen(key: string): void {
  localStorage.setItem(getBriefingStorageKey(key), "1");
}
