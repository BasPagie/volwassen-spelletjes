import { useState, useCallback, useRef, useEffect } from "react";
import type { WhatAmISettings, WhatAmICharacter } from "shared/types";
import { DEFAULT_WHATAMI_SETTINGS } from "shared/types";

/** Fetch thumbnail + description from Wikipedia REST API */
async function fetchWikipediaImage(
  name: string,
): Promise<{ imageUrl?: string; description?: string }> {
  try {
    // Try English Wikipedia first
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
    );
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail?.source) {
        return {
          imageUrl: data.thumbnail.source,
          description: data.description,
        };
      }
    }
    // Fallback to Dutch Wikipedia
    const resNl = await fetch(
      `https://nl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
    );
    if (resNl.ok) {
      const dataNl = await resNl.json();
      if (dataNl.thumbnail?.source) {
        return {
          imageUrl: dataNl.thumbnail.source,
          description: dataNl.description,
        };
      }
    }
    return {};
  } catch {
    return {};
  }
}

const PACK_META_FALLBACK: {
  id: string;
  name: string;
  description: string;
  characterCount: number;
}[] = [];

interface Props {
  settings?: WhatAmISettings;
  onChange: (settings: WhatAmISettings) => void;
  isHost: boolean;
}

const LOCAL_STORAGE_KEY = "whatami-saved-characters";

export default function WhatAmILobbySettings({
  settings,
  onChange,
  isHost,
}: Props) {
  const current: WhatAmISettings = settings ?? DEFAULT_WHATAMI_SETTINGS;

  const [PACK_META, setPackMeta] = useState(PACK_META_FALLBACK);
  const [newCharName, setNewCharName] = useState("");
  const [newCharImage, setNewCharImage] = useState("");
  const [newCharCategory, setNewCharCategory] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [showCustomSection, setShowCustomSection] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookupCharacter = useCallback(
    async (name: string) => {
      if (!name.trim()) return;
      setSearching(true);
      setSearchDone(false);
      const result = await fetchWikipediaImage(name.trim());
      if (result.imageUrl) setNewCharImage(result.imageUrl);
      if (result.description && !newCharCategory)
        setNewCharCategory(result.description);
      setSearching(false);
      setSearchDone(true);
    },
    [newCharCategory],
  );

  const handleNameBlur = () => {
    if (newCharName.trim() && !newCharImage && !searchDone) {
      lookupCharacter(newCharName);
    }
  };

  const handleNameChange = (value: string) => {
    setNewCharName(value);
    setSearchDone(false);
    setNewCharImage("");
    setNewCharCategory("");
    // Debounced auto-search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        lookupCharacter(value);
      }, 800);
    }
  };

  const update = (patch: Partial<WhatAmISettings>) => {
    onChange({ ...current, ...patch });
  };

  const togglePack = (packId: string) => {
    if (!isHost) return;
    const already = current.packIds.includes(packId);
    const next = already
      ? current.packIds.filter((id) => id !== packId)
      : [...current.packIds, packId];
    update({ packIds: next });
  };

  const addCharacter = () => {
    if (!newCharName.trim()) return;
    const char: WhatAmICharacter = {
      id: `custom-${Date.now()}`,
      name: newCharName.trim(),
      imageUrl: newCharImage.trim() || undefined,
      category: newCharCategory.trim() || undefined,
    };
    update({ customCharacters: [...current.customCharacters, char] });
    setNewCharName("");
    setNewCharImage("");
    setNewCharCategory("");
    setSearchDone(false);
  };

  const removeCharacter = (id: string) => {
    update({
      customCharacters: current.customCharacters.filter((c) => c.id !== id),
    });
  };

  // ─── Import / Export / LocalStorage ──────────────────
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [resolving, setResolving] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSavedLists, setSelectedSavedLists] = useState<Set<string>>(
    new Set(),
  );
  const [savedLists, setSavedLists] = useState<
    { name: string; characters: WhatAmICharacter[] }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved lists from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) setSavedLists(JSON.parse(raw));
    } catch {
      /* ignore corrupt data */
    }
  }, []);

  // Fetch pack metadata from server
  useEffect(() => {
    fetch("/api/packs")
      .then((r) => r.json())
      .then(
        (
          data: {
            id: string;
            name: string;
            description: string;
            characters: unknown[];
          }[],
        ) => {
          setPackMeta(
            data.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              characterCount: p.characters.length,
            })),
          );
        },
      )
      .catch(() => {
        /* fallback to empty */
      });
  }, []);

  const saveListToStorage = (name: string, chars: WhatAmICharacter[]) => {
    const updated = [
      ...savedLists.filter((l) => l.name !== name),
      { name, characters: chars },
    ];
    setSavedLists(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteSavedList = (name: string) => {
    const updated = savedLists.filter((l) => l.name !== name);
    setSavedLists(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleSavedList = (listName: string) => {
    if (!isHost) return;
    const list = savedLists.find((l) => l.name === listName);
    if (!list) return;
    const isSelected = selectedSavedLists.has(listName);
    if (isSelected) {
      // Deselect: remove those characters from customCharacters
      const listIds = new Set(list.characters.map((c) => c.id));
      const filtered = current.customCharacters.filter(
        (c) => !listIds.has(c.id),
      );
      update({ customCharacters: filtered });
      setSelectedSavedLists((prev) => {
        const next = new Set(prev);
        next.delete(listName);
        return next;
      });
    } else {
      // Select: add characters (avoid duplicates by id)
      const existingIds = new Set(current.customCharacters.map((c) => c.id));
      const toAdd = list.characters.filter((c) => !existingIds.has(c.id));
      update({ customCharacters: [...current.customCharacters, ...toAdd] });
      setSelectedSavedLists((prev) => new Set(prev).add(listName));
    }
  };

  const exportCharacters = () => {
    const data = current.customCharacters.map((c) => ({
      name: c.name,
      ...(c.category ? { category: c.category } : {}),
      ...(c.imageUrl ? { imageUrl: c.imageUrl } : {}),
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wie-ben-ik-karakters.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseImport = (text: string): WhatAmICharacter[] | string => {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [];
      if (arr.length === 0) return "Geen karakters gevonden in de JSON.";
      return arr
        .map((item: any, i: number) => ({
          id: `import-${Date.now()}-${i}`,
          name:
            typeof item === "string" ? item : String(item.name ?? "").trim(),
          category:
            typeof item.category === "string"
              ? item.category.trim()
              : undefined,
          imageUrl:
            typeof item.imageUrl === "string" &&
            item.imageUrl.startsWith("https://")
              ? item.imageUrl
              : undefined,
        }))
        .filter((c: WhatAmICharacter) => c.name.length > 0);
    } catch {
      // Try as simple line-separated list
      const lines = text
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) return "Geen karakters gevonden.";
      return lines.map((line, i) => {
        const parts = line.split(/[,;|]/).map((p) => p.trim());
        return {
          id: `import-${Date.now()}-${i}`,
          name: parts[0],
          category: parts[1] || undefined,
        } as WhatAmICharacter;
      });
    }
  };

  const handleImportSubmit = () => {
    const result = parseImport(importText);
    if (typeof result === "string") {
      setImportError(result);
      return;
    }
    const merged = [...current.customCharacters, ...result];
    update({ customCharacters: merged });
    setImportText("");
    setImportError("");
    setShowImport(false);
    resolveImportedImages(result, merged);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = parseImport(text);
      if (typeof result === "string") {
        setImportError(result);
      } else {
        const merged = [...current.customCharacters, ...result];
        update({ customCharacters: merged });
        setShowImport(false);
        setImportError("");
        resolveImportedImages(result, merged);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /** Resolve Wikipedia images for imported characters that don't have one */
  const resolveImportedImages = async (
    newChars: WhatAmICharacter[],
    allChars: WhatAmICharacter[],
  ) => {
    const needsImage = newChars.filter((c) => !c.imageUrl);
    if (needsImage.length === 0) return;

    setResolving({ done: 0, total: needsImage.length });
    setFailedImages(new Set());
    let updatedChars = [...allChars];
    const failed = new Set<string>();

    for (let i = 0; i < needsImage.length; i++) {
      const char = needsImage[i];
      const result = await fetchWikipediaImage(char.name);
      if (result.imageUrl) {
        updatedChars = updatedChars.map((c) =>
          c.id === char.id
            ? {
                ...c,
                imageUrl: result.imageUrl,
                category: c.category || result.description,
              }
            : c,
        );
      } else {
        failed.add(char.id);
      }
      setResolving({ done: i + 1, total: needsImage.length });
    }

    update({ customCharacters: updatedChars });
    setResolving(null);
    if (failed.size > 0) setFailedImages(failed);
  };

  const updateCharacter = (
    charId: string,
    patch: Partial<WhatAmICharacter>,
  ) => {
    const updatedChars = current.customCharacters.map((c) =>
      c.id === charId ? { ...c, ...patch } : c,
    );
    update({ customCharacters: updatedChars });
    if (patch.imageUrl) {
      setFailedImages((prev) => {
        const next = new Set(prev);
        next.delete(charId);
        return next;
      });
    }
  };

  const handleSaveCurrent = () => {
    if (current.customCharacters.length === 0) return;
    const name = prompt(
      "Geef deze lijst een naam:",
      `Lijst ${savedLists.length + 1}`,
    );
    if (!name?.trim()) return;
    saveListToStorage(name.trim(), current.customCharacters);
  };

  const totalPackChars = PACK_META.filter((p) =>
    current.packIds.includes(p.id),
  ).reduce((sum, p) => sum + p.characterCount, 0);
  const savedListChars = savedLists
    .filter((l) => selectedSavedLists.has(l.name))
    .reduce((sum, l) => sum + l.characters.length, 0);
  const manualCustomChars = current.customCharacters.length - savedListChars;
  const totalChars = totalPackChars + current.customCharacters.length;

  // ─── Non-host read-only view ─────────────────────────
  if (!isHost) {
    const selectedPacks = PACK_META.filter((p) =>
      current.packIds.includes(p.id),
    );
    return (
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-gray-700">
          🎭 Wie Ben Ik? Instellingen
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-600">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Pakketten
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedPacks.map((pack) => (
                <span
                  key={pack.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 text-orange-700"
                >
                  {pack.name}
                </span>
              ))}
              {current.customCharacters.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700">
                  ✏️ Eigen ({current.customCharacters.length})
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {totalChars} karakters totaal
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Modus
              </span>
              <p className="font-medium mt-0.5">
                {current.gameMode === "turns"
                  ? "🔄 Beurten"
                  : "⚡ Free-for-all"}
              </p>
            </div>
            {current.gameMode === "turns" && (
              <>
                <div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Tijd/beurt
                  </span>
                  <p className="font-medium mt-0.5">
                    {current.turnSeconds >= 60
                      ? `${current.turnSeconds / 60} min`
                      : `${current.turnSeconds}s`}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Gokken/beurt
                  </span>
                  <p className="font-medium mt-0.5">
                    {current.questionsPerTurn}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Max rondes
                  </span>
                  <p className="font-medium mt-0.5">
                    {current.maxRounds
                      ? `${current.maxRounds} rondes`
                      : "♾️ Oneindig"}
                  </p>
                </div>
              </>
            )}
            {current.gameMode === "free-for-all" && (
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Tijdslimiet
                </span>
                <p className="font-medium mt-0.5">
                  {current.timeLimitSeconds
                    ? `${Math.round(current.timeLimitSeconds / 60)} min`
                    : "♾️ Geen"}
                </p>
              </div>
            )}
            {current.questionsBeforeGuess > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Vragen voor gok
                </span>
                <p className="font-medium mt-0.5">
                  {current.questionsBeforeGuess}
                </p>
              </div>
            )}
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
    <div className="space-y-6">
      <h3 className="font-display font-bold text-lg text-gray-700">
        🎭 Wie Ben Ik? Instellingen
      </h3>

      {/* Pack selector */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Karakter pakketten
          <span className="ml-2 normal-case text-gray-300 font-normal">
            {totalChars} karakters totaal
          </span>
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3 max-h-56 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {PACK_META.map((pack) => {
              const selected = current.packIds.includes(pack.id);
              return (
                <button
                  key={pack.id}
                  onClick={() => togglePack(pack.id)}
                  disabled={!isHost}
                  title={`${pack.description} · ${pack.characterCount} karakters`}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-display font-semibold text-xs transition-all
                    ${
                      selected
                        ? "border-orange-400 bg-orange-50 text-orange-700 shadow-sm"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    } ${!isHost ? "opacity-70 cursor-default" : "cursor-pointer"}`}
                >
                  <span>{pack.name}</span>
                  <span className="text-[10px] opacity-50">
                    {pack.characterCount}
                  </span>
                </button>
              );
            })}
            {/* Saved custom lists as pills */}
            {savedLists.map((list) => {
              const isSelected = selectedSavedLists.has(list.name);
              return (
                <div
                  key={`saved-${list.name}`}
                  className={`inline-flex items-center gap-1 rounded-lg border font-display font-semibold text-xs transition-all
                    ${
                      isSelected
                        ? "border-amber-400 bg-amber-50 text-amber-700 shadow-sm"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <button
                    onClick={() => toggleSavedList(list.name)}
                    disabled={!isHost}
                    className={`px-2.5 py-1.5 transition-all ${!isHost ? "opacity-70 cursor-default" : "cursor-pointer"}`}
                    title={`${list.characters.map((c) => c.name).join(", ")}`}
                  >
                    💾 {list.name}
                    <span className="text-[10px] opacity-50 ml-1">
                      {list.characters.length}
                    </span>
                  </button>
                  {isHost && (
                    <button
                      onClick={() => deleteSavedList(list.name)}
                      className="pr-2 text-gray-400 hover:text-red-500 font-bold text-xs leading-none"
                      title="Verwijder opgeslagen lijst"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom character builder */}
      <div>
        {!(showCustomSection || current.customCharacters.length > 0) ? (
          <button
            onClick={() => setShowCustomSection(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/50 
                       text-orange-600 font-display font-bold text-sm hover:border-orange-400 hover:bg-orange-100/50 transition-all"
          >
            + Eigen karakters toevoegen
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                Extra karakters
                {current.customCharacters.length > 0 && (
                  <span className="ml-2 normal-case text-orange-500 font-bold">
                    {current.customCharacters.length} toegevoegd
                  </span>
                )}
              </span>
              {current.customCharacters.length === 0 && (
                <button
                  onClick={() => setShowCustomSection(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 font-display transition-colors"
                >
                  Sluiten ×
                </button>
              )}
            </div>
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3 space-y-3">
              {current.customCharacters.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {current.customCharacters.map((c) => {
                    const isEditing = editingId === c.id;
                    const hasFailed = failedImages.has(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`rounded-lg border ${hasFailed && !isEditing ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-gray-50"}`}
                      >
                        {/* Collapsed view */}
                        <div className="flex items-center gap-2 p-2">
                          {c.imageUrl ? (
                            <img
                              src={c.imageUrl}
                              alt={c.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                              {hasFailed ? "⚠️" : "👤"}
                            </div>
                          )}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() =>
                              isHost && setEditingId(isEditing ? null : c.id)
                            }
                          >
                            <p className="font-display font-bold text-sm text-gray-800 truncate">
                              {c.name}
                            </p>
                            {c.category && (
                              <p className="font-display text-xs text-gray-400 truncate">
                                {c.category}
                              </p>
                            )}
                            {hasFailed && !isEditing && (
                              <p className="font-display text-xs text-orange-500 font-bold">
                                Geen afbeelding — klik om te bewerken
                              </p>
                            )}
                          </div>
                          {isHost && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setEditingId(isEditing ? null : c.id)
                                }
                                className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all text-sm"
                                title="Bewerken"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => removeCharacter(c.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all font-bold text-lg leading-none"
                                title="Verwijderen"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Expanded edit view */}
                        {isEditing && isHost && (
                          <div className="px-2 pb-2 pt-1 space-y-1.5 border-t border-gray-200">
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) =>
                                updateCharacter(c.id, { name: e.target.value })
                              }
                              placeholder="Naam"
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-display outline-none focus:border-orange-400"
                            />
                            <input
                              type="text"
                              value={c.category || ""}
                              onChange={(e) =>
                                updateCharacter(c.id, {
                                  category: e.target.value || undefined,
                                })
                              }
                              placeholder="Categorie (optioneel)"
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-display outline-none focus:border-orange-400"
                            />
                            <div className="flex gap-1.5">
                              <input
                                type="url"
                                value={c.imageUrl || ""}
                                onChange={(e) =>
                                  updateCharacter(c.id, {
                                    imageUrl: e.target.value || undefined,
                                  })
                                }
                                placeholder="Afbeelding URL (https://...)"
                                className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-display outline-none ${hasFailed ? "border-orange-300 bg-orange-50 focus:border-orange-400" : "border-gray-200 focus:border-orange-400"}`}
                              />
                            </div>
                            {hasFailed && (
                              <p className="text-xs text-orange-500 font-display">
                                ⚠️ Wikipedia had geen afbeelding — plak hier een
                                URL of laat leeg
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Import / Export / Save buttons */}
              {isHost && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setShowImport(!showImport)}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 font-display font-bold text-xs hover:bg-blue-100 transition-all"
                  >
                    📥 Importeren
                  </button>
                  {current.customCharacters.length > 0 && (
                    <>
                      <button
                        onClick={exportCharacters}
                        className="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-600 font-display font-bold text-xs hover:bg-green-100 transition-all"
                      >
                        📤 Exporteren
                      </button>
                      <button
                        onClick={handleSaveCurrent}
                        className="px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-600 font-display font-bold text-xs hover:bg-orange-100 transition-all"
                      >
                        💾 Opslaan
                      </button>
                      <button
                        onClick={() => update({ customCharacters: [] })}
                        className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 font-display font-bold text-xs hover:bg-red-100 transition-all"
                      >
                        🗑️ Alles wissen
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Import panel */}
              {isHost && showImport && (
                <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <p className="text-xs font-display font-bold text-blue-700">
                    Plak JSON of een lijst met namen (1 per regel):
                  </p>
                  <p className="text-xs font-display text-blue-500">
                    JSON: [{"{"}"name": "...", "category": "..."{"}"}, ...] of
                    simpel: naam per regel
                  </p>
                  <textarea
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      setImportError("");
                    }}
                    placeholder={
                      '[\n  {"name": "Shrek", "category": "Film"},\n  {"name": "Harry Potter"}\n]\n\nOf simpel:\nShrek, Film\nHarry Potter'
                    }
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm font-mono outline-none focus:border-blue-400 resize-y"
                  />
                  {importError && (
                    <p className="text-xs text-red-500 font-display font-bold">
                      ❌ {importError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleImportSubmit}
                      disabled={!importText.trim()}
                      className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-display font-bold text-sm transition-all disabled:opacity-40"
                    >
                      Importeer tekst
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg border-2 border-blue-300 text-blue-600 font-display font-bold text-sm hover:bg-blue-100 transition-all"
                    >
                      📁 Bestand
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.txt,.csv"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Image resolving progress */}
              {resolving && (
                <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-display font-bold text-amber-700 mb-1.5">
                    🔍 Afbeeldingen ophalen van Wikipedia... ({resolving.done}/
                    {resolving.total})
                  </p>
                  <div className="w-full h-2 rounded-full bg-amber-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${(resolving.done / resolving.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {isHost && (
                <div className="space-y-2 p-3 rounded-xl bg-orange-50 border border-orange-200">
                  <div className="relative">
                    <input
                      type="text"
                      value={newCharName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onBlur={handleNameBlur}
                      onKeyDown={(e) => e.key === "Enter" && addCharacter()}
                      placeholder="Naam karakter (bijv. Napoleon)*"
                      maxLength={80}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-display outline-none focus:border-orange-400"
                    />
                    {searching && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-500 font-display">
                        Zoeken...
                      </span>
                    )}
                  </div>

                  {/* Preview found image */}
                  {newCharImage && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200">
                      <img
                        src={newCharImage}
                        alt="Preview"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-600 font-display font-bold">
                          ✓ Afbeelding gevonden via Wikipedia
                        </p>
                        {newCharCategory && (
                          <p className="text-xs text-gray-500 font-display truncate">
                            {newCharCategory}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setNewCharImage("")}
                        className="text-gray-400 hover:text-red-500 text-sm font-bold"
                        title="Verwijder afbeelding"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Show category input if not auto-filled */}
                  {!newCharCategory && (
                    <input
                      type="text"
                      value={newCharCategory}
                      onChange={(e) => setNewCharCategory(e.target.value)}
                      placeholder="Categorie (bijv. Historisch) — optioneel"
                      maxLength={50}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-display outline-none focus:border-orange-400"
                    />
                  )}

                  {/* Manual URL fallback */}
                  {!newCharImage && searchDone && (
                    <input
                      type="url"
                      value={newCharImage}
                      onChange={(e) => setNewCharImage(e.target.value)}
                      placeholder="Geen afbeelding gevonden — plak handmatig een URL"
                      maxLength={500}
                      className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-sm font-display outline-none focus:border-orange-400"
                    />
                  )}

                  <button
                    onClick={addCharacter}
                    disabled={!newCharName.trim() || searching}
                    className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-display font-bold text-sm 
                         transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {searching
                      ? "Afbeelding zoeken..."
                      : "+ Karakter toevoegen"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── SECTION: Spelmodus ───────────────────── */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Spelmodus
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2">
            <button
              onClick={() => isHost && update({ gameMode: "free-for-all" })}
              disabled={!isHost}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                ${
                  current.gameMode === "free-for-all"
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
            >
              ⚡ Iedereen tegelijk
            </button>
            <button
              onClick={() => isHost && update({ gameMode: "turns" })}
              disabled={!isHost}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                ${
                  current.gameMode === "turns"
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
            >
              🔄 Om de beurt
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION: Turn-based settings ─────────── */}
      {current.gameMode === "turns" && (
        <div>
          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Beurt-instellingen
          </span>
          <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3 space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                Tijd per beurt
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { v: 30, l: "30s" },
                  { v: 60, l: "1 min" },
                  { v: 90, l: "1½ min" },
                  { v: 120, l: "2 min" },
                  { v: 180, l: "3 min" },
                  { v: 300, l: "5 min" },
                ].map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => isHost && update({ turnSeconds: v })}
                    disabled={!isHost}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all
                      ${
                        current.turnSeconds === v
                          ? "bg-orange-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      } ${!isHost ? "opacity-70 cursor-default" : ""}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100" />
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                Gokken per beurt
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      isHost && update({ questionsPerTurn: n as 1 | 2 | 3 })
                    }
                    disabled={!isHost}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all
                      ${
                        current.questionsPerTurn === n
                          ? "bg-orange-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      } ${!isHost ? "opacity-70 cursor-default" : ""}`}
                  >
                    {n} {n === 1 ? "gok" : "gokken"}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100" />
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                Max rondes
              </span>
              <p className="text-xs text-gray-400 mb-2">
                Na dit aantal volledige rondes stopt het spel automatisch.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {[3, 5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => isHost && update({ maxRounds: n })}
                    disabled={!isHost}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all
                      ${
                        current.maxRounds === n
                          ? "bg-orange-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      } ${!isHost ? "opacity-70 cursor-default" : ""}`}
                  >
                    {n} rondes
                  </button>
                ))}
                <button
                  onClick={() => isHost && update({ maxRounds: null })}
                  disabled={!isHost}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all
                    ${
                      current.maxRounds === null
                        ? "bg-orange-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    } ${!isHost ? "opacity-70 cursor-default" : ""}`}
                >
                  ♾️ Oneindig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: Tijdslimiet (free-for-all) ──── */}
      {current.gameMode === "free-for-all" && (
        <div>
          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Tijdslimiet
          </span>
          <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
            <div className="flex gap-1.5 flex-wrap">
              {[5, 10, 15, 20, 30].map((min) => (
                <button
                  key={min}
                  onClick={() =>
                    isHost && update({ timeLimitSeconds: min * 60 })
                  }
                  disabled={!isHost}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all
                    ${
                      current.timeLimitSeconds === min * 60
                        ? "bg-orange-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    } ${!isHost ? "opacity-70 cursor-default" : ""}`}
                >
                  {min} min
                </button>
              ))}
              <button
                onClick={() => isHost && update({ timeLimitSeconds: null })}
                disabled={!isHost}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all
                  ${
                    current.timeLimitSeconds === null
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                ♾️ Geen limiet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: Questions before guessing ── */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Vragen voor je mag raden
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-2">
            Spelers moeten eerst dit aantal vragen stellen voordat ze mogen
            gokken (op eer-systeem).
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {[0, 1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => isHost && update({ questionsBeforeGuess: n })}
                disabled={!isHost}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all
                  ${
                    current.questionsBeforeGuess === n
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  } ${!isHost ? "opacity-70 cursor-default" : ""}`}
              >
                {n === 0 ? "Uit" : `${n} vragen`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION: Host ──────────────────────── */}
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Host
        </span>
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2">
            <button
              onClick={() => isHost && update({ hostPlays: true })}
              disabled={!isHost}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                ${
                  current.hostPlays
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
            >
              🎭 Meespelen
            </button>
            <button
              onClick={() => isHost && update({ hostPlays: false })}
              disabled={!isHost}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                ${
                  !current.hostPlays
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!isHost ? "opacity-70 cursor-default" : ""}`}
            >
              👀 Toekijken
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
