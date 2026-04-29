import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectionsRoundState, ConnectionsGroup } from "shared/types";

const GROUP_COLORS: Record<
  number,
  { bg: string; text: string; border: string }
> = {
  1: {
    bg: "bg-game-yellow",
    text: "text-yellow-900",
    border: "border-yellow-400",
  },
  2: {
    bg: "bg-game-green",
    text: "text-green-900",
    border: "border-green-500",
  },
  3: { bg: "bg-game-blue", text: "text-blue-900", border: "border-blue-400" },
  4: {
    bg: "bg-game-purple",
    text: "text-purple-900",
    border: "border-purple-500",
  },
};

interface ConnectionsGameProps {
  roundState: ConnectionsRoundState;
  onSubmitGroup: (words: string[]) => void;
  maxAttempts?: number;
  hintWords?: string[];
}

export default function ConnectionsGame({
  roundState,
  onSubmitGroup,
  maxAttempts = 4,
  hintWords = [],
}: ConnectionsGameProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);
  const [lastWrong, setLastWrong] = useState<string[]>([]);

  const handleTileClick = useCallback((word: string) => {
    setSelected((prev) => {
      if (prev.includes(word)) {
        return prev.filter((w) => w !== word);
      }
      if (prev.length >= 4) return prev;
      return [...prev, word];
    });
  }, []);

  const handleSubmit = () => {
    if (selected.length !== 4) return;
    onSubmitGroup(selected);

    // Check if the guess was wrong after a short delay (state will update via socket)
    // We'll track wrong state via useEffect watching roundState changes
    setLastWrong(selected);
    setTimeout(() => {
      setSelected([]);
      setLastWrong([]);
    }, 600);
  };

  const handleDeselectAll = () => {
    setSelected([]);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Solved groups */}
      <AnimatePresence>
        {roundState.solvedGroups.map((group, i) => {
          const colors = GROUP_COLORS[group.difficulty] ?? GROUP_COLORS[1];
          return (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
              transition={{ duration: 0.4 }}
              className={`${colors.bg} rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center border-2 ${colors.border}`}
            >
              <p
                className={`font-display font-black text-sm sm:text-lg ${colors.text}`}
              >
                {group.label}
              </p>
              <p
                className={`font-display font-medium text-xs sm:text-sm ${colors.text} opacity-80`}
              >
                {group.words.join(", ")}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Hint message */}
      {hintWords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center"
        >
          <p className="text-sm text-amber-700 font-display font-medium">
            💡 Bijna! De gemarkeerde woorden horen bij elkaar — je mist er nog{" "}
            {4 - hintWords.length}!
          </p>
        </motion.div>
      )}

      {/* Word grid */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3 mb-4">
        <AnimatePresence>
          {roundState.words.map((word) => {
            const isSelected = selected.includes(word);
            const isHinted = hintWords
              .map((w) => w.toLowerCase())
              .includes(word.toLowerCase());
            const isWrong = lastWrong.includes(word) && !isSelected;
            return (
              <motion.button
                key={word}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: isWrong ? [0, -6, 6, -4, 4, 0] : 0,
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleTileClick(word)}
                className={
                  isSelected
                    ? "word-tile-selected"
                    : isHinted
                      ? "word-tile-hinted"
                      : "word-tile-default"
                }
              >
                {word}
                {isHinted && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-white" />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Lives */}
        {roundState.attemptsLeft !== null && (
          <div className="flex gap-0.5 sm:gap-1">
            {Array.from({ length: maxAttempts }).map((_, i) => (
              <span
                key={i}
                className={`text-base sm:text-xl transition-all duration-300
                  ${i < (roundState.attemptsLeft ?? 0) ? "opacity-100" : "opacity-20 grayscale"}`}
              >
                ❤️
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2 ml-auto">
          <button
            onClick={handleDeselectAll}
            disabled={selected.length === 0}
            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 
                       font-display font-bold text-xs sm:text-sm transition-all disabled:opacity-30"
          >
            Wissen
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.length !== 4}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white 
                       font-display font-bold text-xs sm:text-sm shadow-md transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:shadow-lg active:scale-95"
          >
            Controleer
          </button>
        </div>
      </div>
    </div>
  );
}
