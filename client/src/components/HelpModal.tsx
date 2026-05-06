import { motion, AnimatePresence } from "framer-motion";
import { getInstruction } from "../lib/gameInstructions";
import type { GameCategory } from "shared/types";

const BG_COLORS: Record<string, string> = {
  blue: "bg-blue-50",
  purple: "bg-purple-50",
  amber: "bg-amber-50",
  green: "bg-green-50",
  red: "bg-red-50",
};

const TEXT_COLORS: Record<string, string> = {
  blue: "text-blue-700",
  purple: "text-purple-700",
  amber: "text-amber-700",
  green: "text-green-700",
  red: "text-red-700",
};

interface Props {
  instructionKey: string | GameCategory;
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ instructionKey, open, onClose }: Props) {
  const instruction = getInstruction(instructionKey);
  if (!instruction) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
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
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-lg shrink-0 mt-0.5">{step.emoji}</span>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-display font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Sluiten
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
