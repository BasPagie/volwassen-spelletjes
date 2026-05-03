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

  // ─── Non-host read-only view ─────────────────────────
  if (!isHost) {
    const selectedCats = categories.filter((c) =>
      current.categoryIds.includes(c.id),
    );
    return (
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-gray-700">
          Spelinstellingen
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-600">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Categorieën
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedCats.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700"
                >
                  {cat.name}
                </span>
              ))}
              {selectedCats.length === 0 && (
                <span className="text-xs text-gray-400 italic">
                  Geen geselecteerd
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Vragen
              </span>
              <p className="font-medium mt-0.5">{current.questionCount}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Tijd/vraag
              </span>
              <p className="font-medium mt-0.5">{current.timePerQuestion}s</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Punten
              </span>
              <p className="font-medium mt-0.5">
                +{current.pointsCorrect} / -{current.pointsWrongPenalty}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Streak
              </span>
              <p className="font-medium mt-0.5">
                {current.streakBonus ? "🔥 Aan" : "Uit"}
              </p>
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
        </div>
        <p className="text-xs text-gray-400 italic">
          Alleen de host kan instellingen wijzigen.
        </p>
      </div>
    );
  }

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
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const selected = current.categoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                disabled={!isHost}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-display font-bold transition-all ${
                  selected
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                {cat.name}
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
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">
              Goed antwoord
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {[50, 75, 100, 150, 200].map((pts) => (
                <button
                  key={pts}
                  onClick={() => isHost && update({ pointsCorrect: pts })}
                  disabled={!isHost}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    current.pointsCorrect === pts
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } ${!isHost ? "opacity-70 cursor-default" : ""}`}
                >
                  +{pts}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100" />
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">
              Fout antwoord
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {[0, 25, 50, 75, 100].map((pts) => (
                <button
                  key={pts}
                  onClick={() => isHost && update({ pointsWrongPenalty: pts })}
                  disabled={!isHost}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    current.pointsWrongPenalty === pts
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } ${!isHost ? "opacity-70 cursor-default" : ""}`}
                >
                  {pts === 0 ? "Geen" : `-${pts}`}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100" />
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
