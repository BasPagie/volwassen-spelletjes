import { useState, useEffect } from "react";
import type { DrawingSettings } from "shared/types";
import { DEFAULT_DRAWING_SETTINGS } from "shared/types";

interface DrawingCategory {
  id: string;
  name: string;
  description: string;
  wordCount: number;
}

interface Props {
  settings: DrawingSettings | undefined;
  onChange: (settings: DrawingSettings) => void;
  isHost: boolean;
}

export default function DrawingLobbySettings({
  settings,
  onChange,
  isHost,
}: Props) {
  const current = settings ?? DEFAULT_DRAWING_SETTINGS;
  const [categories, setCategories] = useState<DrawingCategory[]>([]);
  const [customText, setCustomText] = useState(current.customWords.join("\n"));

  useEffect(() => {
    fetch("/api/drawing-categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const update = (patch: Partial<DrawingSettings>) => {
    onChange({ ...current, ...patch });
  };

  const handleCustomWordsChange = (text: string) => {
    setCustomText(text);
    const words = text
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    update({ customWords: words });
  };

  const allCategoryIds = categories.map((c) => c.id);
  const standardCategoryIds = allCategoryIds.filter((id) => id !== "spicy");
  const usePresetWords = current.categoryIds.some((id) => id !== "spicy");
  const useSpicyWords = current.categoryIds.includes("spicy");
  const spicyCategory = categories.find((c) => c.id === "spicy");
  const presetWordCount = categories
    .filter((c) => c.id !== "spicy")
    .reduce((sum, c) => sum + c.wordCount, 0);

  const togglePresetWords = () => {
    if (!isHost) return;
    if (usePresetWords) {
      update({ categoryIds: useSpicyWords ? ["spicy"] : [] });
    } else {
      update({
        categoryIds: useSpicyWords
          ? [...standardCategoryIds, "spicy"]
          : standardCategoryIds,
      });
    }
  };

  const toggleSpicyWords = () => {
    if (!isHost) return;
    if (useSpicyWords) {
      update({
        categoryIds: current.categoryIds.filter((id) => id !== "spicy"),
      });
    } else {
      update({ categoryIds: [...current.categoryIds, "spicy"] });
    }
  };

  // ─── Non-host read-only view ─────────────────────────
  if (!isHost) {
    return (
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-gray-700">
          Spelinstellingen
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-600">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Rondes
              </span>
              <p className="font-medium mt-0.5">{current.rounds}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Tekentijd
              </span>
              <p className="font-medium mt-0.5">{current.drawTimeSeconds}s</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Host
              </span>
              <p className="font-medium mt-0.5">
                {current.hostPlays ? "🎮 Speelt mee" : "👀 Kijkt toe"}
              </p>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Woorden
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {usePresetWords && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 text-teal-700">
                  📦 Standaard ({presetWordCount})
                </span>
              )}
              {useSpicyWords && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700">
                  🔥 Spicy ({spicyCategory?.wordCount ?? 0})
                </span>
              )}
              {current.customWords.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700">
                  ✏️ Eigen ({current.customWords.length})
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 italic">
          Alleen de host kan instellingen wijzigen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Preset words toggle */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Standaard woordenlijst
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-sm text-gray-800">
                Gebruik standaard woorden
              </p>
              <p className="font-display text-xs text-gray-500">
                {presetWordCount} woorden in {categories.length} categorieën
              </p>
            </div>
            <button
              onClick={togglePresetWords}
              disabled={!isHost}
              className={`relative w-12 h-7 rounded-full transition-all ${
                usePresetWords ? "bg-teal-500" : "bg-gray-300"
              } ${!isHost ? "opacity-70 cursor-default" : ""}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  usePresetWords ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Spicy toggle */}
          {spicyCategory && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div>
                <p className="font-display font-bold text-sm text-gray-800">
                  🔥 Spicy woorden
                </p>
                <p className="font-display text-xs text-gray-500">
                  {spicyCategory.wordCount} volwassen woorden
                </p>
              </div>
              <button
                onClick={toggleSpicyWords}
                disabled={!isHost}
                className={`relative w-12 h-7 rounded-full transition-all ${
                  useSpicyWords ? "bg-red-500" : "bg-gray-300"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    useSpicyWords ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom words */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Eigen woorden (optioneel)
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <textarea
            value={customText}
            onChange={(e) => isHost && handleCustomWordsChange(e.target.value)}
            disabled={!isHost}
            placeholder={
              "Eén woord per regel, bijv.:\nstroopwafel\nbungee jumpen\nEiffeltoren"
            }
            className={`w-full h-24 bg-white border border-gray-200 rounded-xl p-3 text-sm font-display
              resize-none focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400
              ${!isHost ? "opacity-70 cursor-default" : ""}`}
          />
          {current.customWords.length > 0 && (
            <p className="text-xs text-teal-600 font-display mt-1">
              +{current.customWords.length} eigen woord
              {current.customWords.length > 1 ? "en" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Rounds */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Aantal rondes
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => isHost && update({ rounds: n })}
                disabled={!isHost}
                className={`px-4 py-2 rounded-xl text-sm font-display font-bold transition-all ${
                  current.rounds === n
                    ? "bg-teal-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 font-display mt-2">
            Elke ronde tekent iedereen 1x
          </p>
        </div>
      </div>

      {/* Draw time */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Tekentijd per beurt
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2 flex-wrap">
            {[30, 45, 60, 90, 120].map((s) => (
              <button
                key={s}
                onClick={() => isHost && update({ drawTimeSeconds: s })}
                disabled={!isHost}
                className={`px-4 py-2 rounded-xl text-sm font-display font-bold transition-all ${
                  current.drawTimeSeconds === s
                    ? "bg-teal-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Host plays toggle */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Host
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2">
            <button
              onClick={() => isHost && update({ hostPlays: true })}
              disabled={!isHost}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                current.hostPlays
                  ? "bg-teal-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } ${!isHost ? "opacity-70 cursor-default" : ""}`}
            >
              🎮 Speelt mee
            </button>
            <button
              onClick={() => isHost && update({ hostPlays: false })}
              disabled={!isHost}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                !current.hostPlays
                  ? "bg-teal-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } ${!isHost ? "opacity-70 cursor-default" : ""}`}
            >
              👀 Kijkt toe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
