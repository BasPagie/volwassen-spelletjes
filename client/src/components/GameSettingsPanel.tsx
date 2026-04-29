import { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from "framer-motion";
import type {
  GameSettings,
  RoundConfig,
  RoundType,
  PuzzleDifficulty,
} from "shared/types";

interface GameSettingsPanelProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  isHost: boolean;
}

const ROUND_TYPES: {
  type: RoundType;
  icon: string;
  label: string;
  color: string;
  activeBg: string;
}[] = [
  {
    type: "connections",
    icon: "🔗",
    label: "Connections",
    color: "text-blue-700",
    activeBg: "bg-blue-500",
  },
  {
    type: "puzzelronde",
    icon: "🧩",
    label: "Puzzelronde",
    color: "text-purple-700",
    activeBg: "bg-purple-500",
  },
  {
    type: "opendeur",
    icon: "🚪",
    label: "Open Deur",
    color: "text-amber-700",
    activeBg: "bg-amber-500",
  },
  {
    type: "lingo",
    icon: "🟩",
    label: "Lingo",
    color: "text-green-700",
    activeBg: "bg-green-600",
  },
];

const DIFFICULTIES: { value: PuzzleDifficulty; label: string; dot: string }[] =
  [
    { value: "easy", label: "Makkelijk", dot: "bg-green-400" },
    { value: "medium", label: "Gemiddeld", dot: "bg-yellow-400" },
    { value: "hard", label: "Moeilijk", dot: "bg-red-400" },
  ];

const TIME_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Geen" },
  { value: 60, label: "1 min" },
  { value: 90, label: "1.5 min" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
  { value: 300, label: "5 min" },
];

function getRoundMeta(type: RoundType) {
  return ROUND_TYPES.find((r) => r.type === type)!;
}

function getDiffMeta(d: PuzzleDifficulty) {
  return DIFFICULTIES.find((x) => x.value === d)!;
}

export default function GameSettingsPanel({
  settings,
  onChange,
  isHost,
}: GameSettingsPanelProps) {
  // ─── Non-host read-only view ─────────────────────────
  if (!isHost) {
    return (
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-gray-700">
          Spelinstellingen
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-600">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Rondes
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {settings.rounds.map((r, i) => {
                const meta = getRoundMeta(r.type);
                const diff = getDiffMeta(r.difficulty);
                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
                      ${
                        r.type === "connections"
                          ? "bg-blue-50 text-blue-700"
                          : r.type === "puzzelronde"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                  >
                    {meta.icon} {meta.label}
                    <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Pogingen
              </span>
              <p className="font-medium mt-0.5">
                {settings.attemptsMode === "limited"
                  ? `${settings.maxAttempts} ❤️`
                  : "♾️ Onbeperkt"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Tijd
              </span>
              <p className="font-medium mt-0.5">
                {settings.timeLimitSeconds
                  ? `${settings.timeLimitSeconds >= 60 ? `${settings.timeLimitSeconds / 60} min` : `${settings.timeLimitSeconds}s`}`
                  : "Geen"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Host
              </span>
              <p className="font-medium mt-0.5">
                {settings.hostPlays ? "🎮 Speelt mee" : "👀 Kijkt toe"}
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

  // ─── Host editable view ──────────────────────────────
  return <HostSettingsEditor settings={settings} onChange={onChange} />;
}

// ─── Host Editor ───────────────────────────────────────
interface DraggableRound {
  id: string;
  config: RoundConfig;
}

function HostSettingsEditor({
  settings,
  onChange,
}: {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
}) {
  const nextId = useRef(0);
  const [items, setItems] = useState<DraggableRound[]>(() =>
    settings.rounds.map((config) => ({
      id: String(nextId.current++),
      config,
    })),
  );
  const [editingRound, setEditingRound] = useState<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const emitChange = (overrides: Partial<GameSettings>) => {
    const currentRounds = itemsRef.current.map((i) => i.config);
    onChange({ ...settings, ...overrides, rounds: currentRounds });
  };

  const pushItems = (newItems: DraggableRound[]) => {
    setItems(newItems);
    itemsRef.current = newItems;
    onChange({ ...settings, rounds: newItems.map((i) => i.config) });
  };

  const handleReorder = (newItems: DraggableRound[]) => {
    setItems(newItems);
    itemsRef.current = newItems;
    setEditingRound(null);
  };

  const handleDragEnd = () => {
    onChange({
      ...settings,
      rounds: itemsRef.current.map((i) => i.config),
    });
  };

  const addRound = () => {
    if (items.length >= 5) return;
    const newItem: DraggableRound = {
      id: String(nextId.current++),
      config: {
        type: "connections" as RoundType,
        difficulty: "medium" as PuzzleDifficulty,
      },
    };
    const newItems = [...items, newItem];
    pushItems(newItems);
    setEditingRound(newItems.length - 1);
  };

  const removeRound = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    pushItems(newItems);
    setEditingRound(null);
  };

  const setRoundType = (index: number, type: RoundType) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, config: { ...item.config, type } } : item,
    );
    pushItems(newItems);
  };

  const setRoundDifficulty = (index: number, difficulty: PuzzleDifficulty) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, config: { ...item.config, difficulty } } : item,
    );
    pushItems(newItems);
  };

  return (
    <div className="space-y-6">
      <h3 className="font-display font-bold text-lg text-gray-700">
        Spelinstellingen
      </h3>

      {/* ── SECTION: Rounds ─────────────────────────── */}
      <Section label="Rondes">
        <Reorder.Group
          as="div"
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {items.map((item, i) => (
            <RoundCard
              key={item.id}
              item={item}
              index={i}
              total={items.length}
              isEditing={editingRound === i}
              onToggleEdit={() =>
                setEditingRound(editingRound === i ? null : i)
              }
              onRemove={() => removeRound(i)}
              onSetType={(type) => setRoundType(i, type)}
              onSetDifficulty={(diff) => setRoundDifficulty(i, diff)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </Reorder.Group>

        {/* Add round */}
        {items.length < 5 && (
          <button
            onClick={addRound}
            className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-display 
                       font-bold text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-all"
          >
            + Ronde toevoegen
          </button>
        )}
      </Section>

      {/* ── SECTION: Lives & Time ───────────────────── */}
      <Section label="Regels">
        {/* Attempts */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() =>
                emitChange({
                  attemptsMode: "limited",
                  maxAttempts: settings.maxAttempts || 4,
                })
              }
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                ${
                  settings.attemptsMode === "limited"
                    ? "bg-red-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              ❤️ Levens
            </button>
            <button
              onClick={() => emitChange({ attemptsMode: "unlimited" })}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                ${
                  settings.attemptsMode === "unlimited"
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              ♾️ Onbeperkt
            </button>
          </div>

          {/* Lives stepper */}
          <AnimatePresence>
            {settings.attemptsMode === "limited" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-center gap-4 py-2">
                  <button
                    onClick={() =>
                      emitChange({
                        maxAttempts: Math.max(1, settings.maxAttempts - 1),
                      })
                    }
                    disabled={settings.maxAttempts <= 1}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center
                               text-lg font-bold text-gray-500 disabled:opacity-30 transition-all"
                  >
                    −
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="font-display font-black text-2xl text-red-500 w-8 text-center">
                      {settings.maxAttempts}
                    </span>
                    <span className="text-red-400 text-lg">❤️</span>
                  </div>
                  <button
                    onClick={() =>
                      emitChange({
                        maxAttempts: Math.min(10, settings.maxAttempts + 1),
                      })
                    }
                    disabled={settings.maxAttempts >= 10}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center
                               text-lg font-bold text-gray-500 disabled:opacity-30 transition-all"
                  >
                    +
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-3" />

        {/* Time limit */}
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
            Tijdslimiet
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => emitChange({ timeLimitSeconds: opt.value })}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all
                  ${
                    settings.timeLimitSeconds === opt.value
                      ? "bg-brand-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {opt.value === null ? "⏱️ " : ""}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── SECTION: Host role ──────────────────────── */}
      <Section label="Host">
        <div className="flex gap-2">
          <button
            onClick={() => emitChange({ hostPlays: true })}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
              ${
                settings.hostPlays
                  ? "bg-green-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            🎮 Meespelen
          </button>
          <button
            onClick={() => emitChange({ hostPlays: false })}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
              ${
                !settings.hostPlays
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            👀 Toekijken
          </button>
        </div>
      </Section>
    </div>
  );
}

// ─── Draggable Round Card ──────────────────────────────
function RoundCard({
  item,
  index,
  total,
  isEditing,
  onToggleEdit,
  onRemove,
  onSetType,
  onSetDifficulty,
  onDragEnd,
}: {
  item: DraggableRound;
  index: number;
  total: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onSetType: (type: RoundType) => void;
  onSetDifficulty: (d: PuzzleDifficulty) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const meta = getRoundMeta(item.config.type);
  const diff = getDiffMeta(item.config.difficulty);

  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="list-none"
    >
      {/* Collapsed round card */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleEdit();
          }
        }}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer
          ${isEditing ? "bg-gray-100 ring-2 ring-brand-300" : "bg-gray-50 hover:bg-gray-100"}`}
      >
        {/* Drag handle */}
        <div
          onPointerDown={(e) => controls.start(e)}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing touch-none select-none p-0.5 -ml-1 text-gray-300 hover:text-gray-400 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>

        <span className="text-lg">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-display font-bold text-sm text-gray-700">
            {meta.label}
          </span>
          <span className="mx-2 text-gray-300">·</span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
            {diff.label}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-display font-bold">
          {index + 1}/{total}
        </span>
        {total > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 
                       hover:bg-red-50 hover:text-red-400 transition-all"
            title="Ronde verwijderen"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isEditing ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Expanded editor */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1 px-1 space-y-3">
              {/* Type selector */}
              <div className="flex gap-1.5">
                {ROUND_TYPES.map((rt) => (
                  <button
                    key={rt.type}
                    onClick={() => onSetType(rt.type)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
                      ${
                        item.config.type === rt.type
                          ? `${rt.activeBg} text-white shadow-md`
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                  >
                    {rt.icon} {rt.label}
                  </button>
                ))}
              </div>

              {/* Difficulty selector */}
              <div className="flex gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => onSetDifficulty(d.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5
                      ${
                        item.config.difficulty === d.value
                          ? "bg-gray-800 text-white shadow-md"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${d.dot}`} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// ─── Section wrapper ───────────────────────────────────
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </span>
      <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3">
        {children}
      </div>
    </div>
  );
}
