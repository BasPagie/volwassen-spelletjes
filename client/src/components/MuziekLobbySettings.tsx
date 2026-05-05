import { useState, useEffect } from "react";
import type { MuziekSettings } from "shared/types";
import { DEFAULT_MUZIEK_SETTINGS } from "shared/types";

interface SongCategory {
  id: string;
  name: string;
  description: string;
  songCount: number;
}

interface Props {
  settings: MuziekSettings | undefined;
  onChange: (settings: MuziekSettings) => void;
  isHost: boolean;
}

export default function MuziekLobbySettings({
  settings,
  onChange,
  isHost,
}: Props) {
  const current = settings ?? DEFAULT_MUZIEK_SETTINGS;
  const [categories, setCategories] = useState<SongCategory[]>([]);

  useEffect(() => {
    fetch("/api/song-categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const update = (patch: Partial<MuziekSettings>) => {
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

  const totalSongs = categories
    .filter((c) => current.categoryIds.includes(c.id))
    .reduce((sum, c) => sum + c.songCount, 0);

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
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-gray-400">Nummers</span>
              <p className="font-semibold">{current.questionCount}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Clip duur</span>
              <p className="font-semibold">{current.clipDuration}s</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Raad modus</span>
              <p className="font-semibold">
                {current.guessMode === "title"
                  ? "Titel"
                  : current.guessMode === "artist"
                    ? "Artiest"
                    : "Beide"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Host speelt mee</span>
              <p className="font-semibold">
                {current.hostPlays ? "Ja" : "Nee"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Modus</span>
              <p className="font-semibold">
                {current.snelsteRader ? "Snelste wint" : "Iedereen scoort"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Meerkeuze</span>
              <p className="font-semibold">
                {current.meerkeuze ? "Aan" : "Uit"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="font-display font-bold text-lg text-gray-700">
        🎵 Muziek Instellingen
      </h3>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-600">
            Categorieën ({totalSongs} nummers)
          </label>
          <button
            onClick={() => {
              const allIds = categories.map((c) => c.id);
              const allSelected = allIds.every((id) =>
                current.categoryIds.includes(id),
              );
              update({ categoryIds: allSelected ? [] : allIds });
            }}
            className="text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
          >
            {categories.every((c) => current.categoryIds.includes(c.id))
              ? "Deselecteer alles"
              : "Selecteer alles"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const selected = current.categoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`inline-flex items-center px-3 py-1.5 rounded-full border transition-all text-xs font-semibold ${
                  selected
                    ? "border-purple-400 bg-purple-100 text-purple-800"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {cat.name}
                <span className="ml-1 text-[10px] opacity-60">
                  {cat.songCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question count */}
      <div>
        <label className="text-sm font-semibold text-gray-600 mb-2 block">
          Aantal nummers
        </label>
        <div className="flex gap-2">
          {[5, 10, 15, 20, 25].map((n) => (
            <button
              key={n}
              onClick={() => update({ questionCount: n })}
              className={`px-4 py-2 rounded-lg font-display font-bold text-sm transition-all ${
                current.questionCount === n
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Clip duration */}
      <div>
        <label className="text-sm font-semibold text-gray-600 mb-2 block">
          Clip duur (seconden)
        </label>
        <div className="flex gap-2">
          {[5, 10, 15, 20, 30].map((n) => (
            <button
              key={n}
              onClick={() => update({ clipDuration: n })}
              className={`px-4 py-2 rounded-lg font-display font-bold text-sm transition-all ${
                current.clipDuration === n
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {n}s
            </button>
          ))}
        </div>
      </div>

      {/* Guess mode */}
      <div>
        <label className="text-sm font-semibold text-gray-600 mb-2 block">
          Wat moet je raden?
        </label>
        <div className="flex gap-2">
          {(
            [
              ["title", "Titel"],
              ["artist", "Artiest"],
              ["both", "Beide"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => update({ guessMode: val })}
              className={`px-4 py-2 rounded-lg font-display font-bold text-sm transition-all ${
                current.guessMode === val
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Snelste Rader toggle */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Snelste Rader
        </span>
        <p className="text-xs text-gray-400 mb-2">
          Alleen de snelste scoort — nummer stopt bij eerste goede gok
        </p>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2">
            <button
              onClick={() => update({ snelsteRader: false })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                !current.snelsteRader
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              👥 Iedereen scoort
            </button>
            <button
              onClick={() => update({ snelsteRader: true })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                current.snelsteRader
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🏁 Snelste wint
            </button>
          </div>
        </div>
      </div>

      {/* Meerkeuze toggle */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Meerkeuze
        </span>
        <p className="text-xs text-gray-400 mb-2">
          Kies uit 4 opties in plaats van zelf typen
        </p>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2">
            <button
              onClick={() => update({ meerkeuze: false })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                !current.meerkeuze
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ⌨️ Typen
            </button>
            <button
              onClick={() => update({ meerkeuze: true })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                current.meerkeuze
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🔘 Meerkeuze
            </button>
          </div>
        </div>
      </div>

      {/* Streak bonus toggle */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Streak bonus
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2">
            <button
              onClick={() => update({ streakBonus: true })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                current.streakBonus
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🔥 Aan
            </button>
            <button
              onClick={() => update({ streakBonus: false })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                !current.streakBonus
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Uit
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
              onClick={() => update({ hostPlays: true })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                current.hostPlays
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🎮 Speelt mee
            </button>
            <button
              onClick={() => update({ hostPlays: false })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                !current.hostPlays
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              👀 Kijkt toe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
