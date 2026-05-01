import { useState, useEffect } from "react";
import type { SnelsteVingerSettings } from "shared/types";
import { DEFAULT_SNELSTEVINGER_SETTINGS } from "shared/types";

interface TriviaCategory {
  id: string;
  name: string;
  description: string;
  questionCount: number;
}

interface Props {
  settings: SnelsteVingerSettings | undefined;
  onChange: (settings: SnelsteVingerSettings) => void;
  isHost: boolean;
}

export default function SnelsteVingerLobbySettings({
  settings,
  onChange,
  isHost,
}: Props) {
  const current = settings ?? DEFAULT_SNELSTEVINGER_SETTINGS;
  const [categories, setCategories] = useState<TriviaCategory[]>([]);

  useEffect(() => {
    fetch("/api/trivia-categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const update = (patch: Partial<SnelsteVingerSettings>) => {
    onChange({ ...current, ...patch });
  };

  const toggleCategory = (catId: string) => {
    if (!isHost) return;
    const already = current.categoryIds.includes(catId);
    const next = already
      ? current.categoryIds.filter((id) => id !== catId)
      : [...current.categoryIds, catId];
    update({ categoryIds: next });
  };

  const totalQuestions = categories
    .filter((c) => current.categoryIds.includes(c.id))
    .reduce((sum, c) => sum + c.questionCount, 0);

  return (
    <div className="space-y-5">
      {/* Category picker */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Categorieën
          {current.categoryIds.length > 0 && (
            <span className="ml-2 normal-case text-red-600 font-bold">
              {totalQuestions} vragen beschikbaar
            </span>
          )}
        </span>
        <div className="grid grid-cols-1 gap-2">
          {categories.map((cat) => {
            const selected = current.categoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                disabled={!isHost}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selected
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-sm text-gray-800">
                      {cat.name}
                    </p>
                    <p className="font-display text-xs text-gray-500">
                      {cat.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-display">
                      {cat.questionCount}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        selected
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {selected && <span className="text-xs font-bold">✓</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question count */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Aantal vragen
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 15, 20, 25].map((n) => (
              <button
                key={n}
                onClick={() => isHost && update({ questionCount: n })}
                disabled={!isHost}
                className={`px-4 py-2 rounded-xl text-sm font-display font-bold transition-all ${
                  current.questionCount === n
                    ? "bg-red-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time per question */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Tijd per vraag
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2 flex-wrap">
            {[10, 15, 20, 30].map((s) => (
              <button
                key={s}
                onClick={() => isHost && update({ timePerQuestion: s })}
                disabled={!isHost}
                className={`px-4 py-2 rounded-xl text-sm font-display font-bold transition-all ${
                  current.timePerQuestion === s
                    ? "bg-red-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scoring */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Punten
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-display text-gray-700">
              Goed antwoord
            </span>
            <span className="text-sm font-display font-bold text-green-600">
              +{current.pointsCorrect} pt
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-display text-gray-700">
              Fout antwoord
            </span>
            <span className="text-sm font-display font-bold text-red-500">
              -{current.pointsWrongPenalty} pt
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-display text-gray-700">
              Streak bonus
            </span>
            <button
              onClick={() =>
                isHost && update({ streakBonus: !current.streakBonus })
              }
              disabled={!isHost}
              className={`px-3 py-1 rounded-lg text-xs font-display font-bold transition-all ${
                current.streakBonus
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-gray-100 text-gray-500 border border-gray-200"
              } ${!isHost ? "opacity-70 cursor-default" : ""}`}
            >
              {current.streakBonus ? "🔥 Aan (+25/streak)" : "Uit"}
            </button>
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
                  ? "bg-red-500 text-white shadow-md"
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
                  ? "bg-red-500 text-white shadow-md"
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
