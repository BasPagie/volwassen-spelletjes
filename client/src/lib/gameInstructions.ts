import type { GameCategory } from "shared/types";

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
  "drawing": {
    icon: "✏️",
    title: "Tekenwedstrijd",
    color: "teal",
    summary: "Eén speler tekent, de rest raadt!",
    steps: [
      { emoji: "✏️", text: "De tekenaar kiest een woord en tekent het — zonder letters of cijfers!" },
      { emoji: "💬", text: "Typ je antwoord — hoe sneller je raadt, hoe meer punten" },
      { emoji: "💡", text: "Na verloop van tijd verschijnen hints (letters van het woord)" },
      { emoji: "🔄", text: "Iedereen komt aan de beurt om te tekenen" },
    ],
  },
  "muziek": {
    icon: "🎵",
    title: "Raad het Nummer",
    color: "purple",
    summary: "Luister naar een clip en raad het nummer!",
    steps: [
      { emoji: "🎧", text: "Je hoort een kort fragment van een nummer" },
      { emoji: "⌨️", text: "Typ de titel of artiest en druk op Raad!" },
      { emoji: "❌", text: "Fout? Je kunt dat nummer niet meer raden" },
      { emoji: "🔥", text: "Meerdere nummers achter elkaar goed = streak bonus" },
    ],
  },
};

export function getInstruction(key: string | GameCategory): GameInstruction | null {
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
