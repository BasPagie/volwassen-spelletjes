import type { GameCategory } from "shared/types";

export type AccentColorKey = "brand" | "purple" | "red" | "teal";

export interface CategoryTheme {
  gradient: string;        // title gradient classes
  badge: string;           // category badge bg + text
  badgeHover: string;      // badge with hover state (info button)
  accent: string;          // primary accent bg (buttons)
  accentHover: string;     // accent hover state
  accentText: string;      // text on white/light bg
  accentBg: string;        // light background tint
  colorKey: AccentColorKey; // key for components that accept a color prop
}

const themes: Record<GameCategory, CategoryTheme> = {
  muziek: {
    gradient: "from-purple-500 to-fuchsia-500",
    badge: "bg-purple-100 text-purple-700",
    badgeHover: "bg-purple-100 hover:bg-purple-200 text-purple-600",
    accent: "bg-purple-600",
    accentHover: "bg-purple-600 hover:bg-purple-700",
    accentText: "text-purple-700",
    accentBg: "bg-purple-50",
    colorKey: "purple",
  },
  "what-am-i": {
    gradient: "from-pink-500 via-rose-400 to-amber-400",
    badge: "bg-brand-100 text-brand-700",
    badgeHover: "bg-brand-100 hover:bg-brand-200 text-brand-600",
    accent: "bg-brand-500",
    accentHover: "bg-brand-500 hover:bg-brand-600",
    accentText: "text-brand-700",
    accentBg: "bg-brand-50",
    colorKey: "brand",
  },
  "snelste-vinger": {
    gradient: "from-red-500 to-rose-500",
    badge: "bg-red-100 text-red-700",
    badgeHover: "bg-red-100 hover:bg-red-200 text-red-600",
    accent: "bg-red-500",
    accentHover: "bg-red-500 hover:bg-red-600",
    accentText: "text-red-700",
    accentBg: "bg-red-50",
    colorKey: "red",
  },
  drawing: {
    gradient: "from-teal-500 to-cyan-500",
    badge: "bg-teal-100 text-teal-700",
    badgeHover: "bg-teal-100 hover:bg-teal-200 text-teal-600",
    accent: "bg-teal-500",
    accentHover: "bg-teal-500 hover:bg-teal-600",
    accentText: "text-teal-700",
    accentBg: "bg-teal-50",
    colorKey: "teal",
  },
};

export function getCategoryTheme(category: GameCategory): CategoryTheme {
  return themes[category] ?? themes.muziek;
}
