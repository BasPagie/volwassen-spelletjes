import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getInstruction, hasSeen, markSeen } from "../lib/gameInstructions";
import type { RoundType, GameCategory } from "shared/types";

const BG_COLORS: Record<string, string> = {
  blue: "bg-blue-50",
  purple: "bg-purple-50",
  amber: "bg-amber-50",
  green: "bg-green-50",
  red: "bg-red-50",
  teal: "bg-teal-50",
};

const TEXT_COLORS: Record<string, string> = {
  blue: "text-blue-700",
  purple: "text-purple-700",
  amber: "text-amber-700",
  green: "text-green-700",
  red: "text-red-700",
  teal: "text-teal-700",
};

const BTN_COLORS: Record<string, string> = {
  blue: "bg-blue-500 hover:bg-blue-600",
  purple: "bg-purple-500 hover:bg-purple-600",
  amber: "bg-amber-500 hover:bg-amber-600",
  green: "bg-green-500 hover:bg-green-600",
  red: "bg-red-500 hover:bg-red-600",
  teal: "bg-teal-500 hover:bg-teal-600",
};

const GRADIENT_BG: Record<string, string> = {
  blue: "from-blue-600 to-blue-800",
  purple: "from-purple-600 to-purple-800",
  amber: "from-amber-500 to-amber-700",
  green: "from-green-600 to-green-800",
  red: "from-red-600 to-red-800",
  teal: "from-teal-600 to-teal-800",
};

interface Props {
  briefingKey: string;
  roundType?: RoundType;
  gameCategory: GameCategory;
  readyCount: number;
  totalCount: number;
  onReady: () => void;
}

export default function BriefingScreen({
  briefingKey,
  roundType,
  gameCategory,
  readyCount,
  totalCount,
  onReady,
}: Props) {
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const alreadySeen = hasSeen(briefingKey);

  // Auto-ready if player has already seen this briefing
  useEffect(() => {
    if (alreadySeen && !hasConfirmed) {
      setHasConfirmed(true);
      onReady();
    }
  }, [alreadySeen, hasConfirmed, onReady]);

  const instruction = getInstruction(roundType ?? gameCategory);
  if (!instruction) return null;

  const handleConfirm = () => {
    markSeen(briefingKey);
    setHasConfirmed(true);
    onReady();
  };

  // If already confirmed (auto or manual), show waiting screen
  if (hasConfirmed) {
    return (
      <div
        className={`h-screen flex items-center justify-center bg-gradient-to-b ${GRADIENT_BG[instruction.color] ?? "from-gray-700 to-gray-900"}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 14 }}
          className="text-center"
        >
          <div className="text-8xl sm:text-9xl mb-6">{instruction.icon}</div>
          <h1 className="font-display font-black text-5xl sm:text-7xl text-white mb-4">
            {instruction.title}
          </h1>
          {totalCount > 0 && readyCount < totalCount && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/70 font-display text-lg mt-4"
            >
              ⏳ Wachten op spelers... ({readyCount}/{totalCount})
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  // First-time instruction screen
  return (
    <div
      className={`h-screen flex items-center justify-center bg-gradient-to-b ${GRADIENT_BG[instruction.color] ?? "from-gray-700 to-gray-900"} px-4`}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 18 }}
        className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full"
      >
        {/* Header */}
        <div
          className={`rounded-xl p-4 mb-4 ${BG_COLORS[instruction.color] ?? "bg-gray-50"}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{instruction.icon}</span>
            <div>
              <h2
                className={`font-display font-black text-xl ${TEXT_COLORS[instruction.color] ?? "text-gray-700"}`}
              >
                {instruction.title}
              </h2>
              <p className="text-gray-600 text-sm mt-0.5">
                {instruction.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2.5 mb-5">
          {instruction.steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex gap-3 items-start"
            >
              <span className="text-lg shrink-0 mt-0.5">{step.emoji}</span>
              <p className="text-sm text-gray-600 leading-relaxed">
                {step.text}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Confirm button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={handleConfirm}
          className={`w-full py-3 rounded-xl font-display font-bold text-white text-lg transition-colors ${BTN_COLORS[instruction.color] ?? "bg-gray-600 hover:bg-gray-700"}`}
        >
          Ik snap het! 👍
        </motion.button>
      </motion.div>
    </div>
  );
}
