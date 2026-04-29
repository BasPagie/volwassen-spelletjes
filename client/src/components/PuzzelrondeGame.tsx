import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PuzzelrondeRoundState } from "shared/types";

const GROUP_COLORS = [
  {
    bg: "bg-purple-100",
    border: "border-purple-400",
    text: "text-purple-700",
    badge: "bg-purple-500",
  },
  {
    bg: "bg-blue-100",
    border: "border-blue-400",
    text: "text-blue-700",
    badge: "bg-blue-500",
  },
  {
    bg: "bg-amber-100",
    border: "border-amber-400",
    text: "text-amber-700",
    badge: "bg-amber-500",
  },
  {
    bg: "bg-green-100",
    border: "border-green-400",
    text: "text-green-700",
    badge: "bg-green-500",
  },
];

interface PuzzelrondeGameProps {
  roundState: PuzzelrondeRoundState;
  onSubmitAnswer: (answer: string) => void;
  lastAnswerResult?: { correct: boolean } | null;
}

export default function PuzzelrondeGame({
  roundState,
  onSubmitAnswer,
  lastAnswerResult = null,
}: PuzzelrondeGameProps) {
  const [answer, setAnswer] = useState("");

  // Build a map: word → color index (for solved groups)
  const solvedWordMap = useMemo(() => {
    const map = new Map<string, number>();
    roundState.solvedGroups.forEach((group, colorIdx) => {
      group.words.forEach((w) => map.set(w.toLowerCase(), colorIdx));
    });
    return map;
  }, [roundState.solvedGroups]);

  const lastWrong = lastAnswerResult?.correct === false;

  const handleSubmitAnswer = () => {
    if (!answer.trim()) return;
    onSubmitAnswer(answer.trim());
    setAnswer("");
  };

  const allSolved = roundState.solvedGroups.length >= roundState.totalGroups;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Instruction */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500 font-display">
          🧩 Welk woord verbindt steeds 4 woorden? Typ het verbindende woord!
        </p>
        <p className="text-xs text-gray-400 font-display mt-1">
          {roundState.solvedGroups.length}/{roundState.totalGroups} groepen
          gevonden
        </p>
      </div>

      {/* Solved groups (answers found) */}
      <AnimatePresence>
        {roundState.solvedGroups.map((group, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          return (
            <motion.div
              key={group.answer}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
              className={`rounded-2xl p-3 sm:p-4 text-center border-2 ${color.bg} ${color.border}`}
            >
              <span
                className={`inline-block px-3 py-0.5 rounded-full text-white text-xs font-bold mb-1.5 ${color.badge}`}
              >
                {group.answer}
              </span>
              <p className={`font-display font-medium text-sm ${color.text}`}>
                {group.words.join(" · ")}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Word grid (4×4, always visible) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 mb-5">
        {roundState.words.map((word) => {
          const colorIdx = solvedWordMap.get(word.toLowerCase());
          const isSolved = colorIdx !== undefined;
          const color = isSolved
            ? GROUP_COLORS[colorIdx % GROUP_COLORS.length]
            : null;

          return (
            <motion.div
              key={word}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative flex items-center justify-center rounded-xl px-1.5 py-3 sm:py-4 text-center
                font-display font-bold text-xs sm:text-sm select-none transition-all duration-300
                ${
                  isSolved
                    ? `${color!.bg} ${color!.text} border-2 ${color!.border} opacity-70`
                    : "bg-gray-100 text-gray-700 border-2 border-gray-200"
                }`}
            >
              {word}
            </motion.div>
          );
        })}
      </div>

      {/* Answer input */}
      {!allSolved && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 rounded-2xl p-4 sm:p-5 border-2 border-purple-200"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
              }}
              placeholder="Typ het verbindende woord..."
              maxLength={50}
              className={`flex-1 px-4 py-3 rounded-xl border-2 outline-none font-display text-lg transition-all
                ${
                  lastWrong
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
                }`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmitAnswer();
                }
              }}
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!answer.trim()}
              className="px-5 sm:px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white
                         font-display font-bold shadow-md transition-all
                         disabled:opacity-30 active:scale-95"
            >
              Antwoord
            </button>
          </div>
          <AnimatePresence>
            {lastWrong && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-500 font-display font-medium mt-2 text-center"
              >
                Helaas, dat is niet juist!
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* All solved */}
      {allSolved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4"
        >
          <p className="font-display font-bold text-lg text-green-600">
            ✅ Alle groepen gevonden!
          </p>
        </motion.div>
      )}
    </div>
  );
}
