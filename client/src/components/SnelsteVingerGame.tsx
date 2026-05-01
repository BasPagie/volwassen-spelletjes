import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SnelsteVingerClientState } from "shared/types";
import { useSocket } from "../context/SocketContext";

interface Props {
  state: SnelsteVingerClientState;
}

export default function SnelsteVingerGame({ state }: Props) {
  const socket = useSocket();
  const [input, setInput] = useState("");
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const resultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on new question
  useEffect(() => {
    if (state.phase === "question" && inputRef.current) {
      inputRef.current.focus();
    }
    setInput("");
    setLastResult(null);
  }, [state.questionIndex, state.phase]);

  // Clear result flash after delay
  useEffect(() => {
    if (lastResult) {
      if (resultTimeout.current) clearTimeout(resultTimeout.current);
      resultTimeout.current = setTimeout(() => setLastResult(null), 1500);
    }
    return () => {
      if (resultTimeout.current) clearTimeout(resultTimeout.current);
    };
  }, [lastResult]);

  const handleBuzz = () => {
    if (!socket || !input.trim() || state.answered || state.winnerId) return;
    socket.emit("snelstevinger:buzz", { answer: input.trim() });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBuzz();
    }
  };

  const progressPct = state.timeRemainingMs / (15 * 1000); // approximate
  const timerColor =
    progressPct > 0.5
      ? "bg-green-500"
      : progressPct > 0.25
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Top bar: progress + scores */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-display font-bold text-red-400 uppercase tracking-wider">
            Vraag {state.questionIndex + 1}/{state.totalQuestions}
          </span>
          <span className="text-xs font-display text-gray-400 px-2 py-0.5 bg-gray-700/50 rounded-full">
            {state.category}
          </span>
        </div>

        {/* Timer bar */}
        {state.phase === "question" && (
          <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${timerColor}`}
              initial={{ width: "100%" }}
              animate={{ width: `${Math.max(0, progressPct * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
        <AnimatePresence mode="wait">
          {/* Question */}
          <motion.div
            key={`q-${state.questionIndex}-${state.phase}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-2xl w-full"
          >
            <h2 className="font-display font-black text-2xl sm:text-3xl md:text-4xl leading-tight mb-6">
              {state.question}
            </h2>

            {/* Reveal phase: show correct answer + winner */}
            {(state.phase === "reveal" || state.winnerId) &&
              state.correctAnswer && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-4"
                >
                  <p className="text-lg font-display text-gray-400 mb-1">
                    Antwoord:
                  </p>
                  <p className="font-display font-black text-3xl text-red-400">
                    {state.correctAnswer}
                  </p>
                  {state.winnerName && (
                    <p className="mt-3 font-display text-green-400 font-bold">
                      🏆 {state.winnerName} was het snelst!
                    </p>
                  )}
                  {!state.winnerName && (
                    <p className="mt-3 font-display text-red-400 font-bold">
                      ⏱️ Tijd voorbij — niemand had het goed!
                    </p>
                  )}
                </motion.div>
              )}

            {/* Finished */}
            {state.phase === "finished" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-2"
              >
                <p className="text-2xl font-display font-black text-red-400">
                  🎉 Spel Afgelopen!
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Input section */}
        {state.phase === "question" && !state.answered && !state.winnerId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mt-8"
          >
            {/* Result flash */}
            <AnimatePresence>
              {lastResult === "wrong" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center mb-3"
                >
                  <span className="font-display font-bold text-red-400 text-sm">
                    ❌ Fout! Probeer opnieuw
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Typ je antwoord..."
                maxLength={200}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-700/80 border-2 border-gray-600 
                           text-white font-display text-lg outline-none focus:border-red-400 
                           placeholder:text-gray-500 transition-all"
              />
              <button
                onClick={handleBuzz}
                disabled={!input.trim()}
                className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-gray-900 
                           font-display font-black text-lg transition-all 
                           disabled:opacity-40 disabled:cursor-not-allowed
                           active:scale-95"
              >
                BUZZ!
              </button>
            </div>
          </motion.div>
        )}

        {/* Already answered correctly */}
        {state.phase === "question" && state.answered && (
          <div className="mt-8 text-center">
            <span className="font-display font-bold text-green-400 text-lg">
              ✓ Goed geantwoord!
            </span>
          </div>
        )}
      </div>

      {/* Bottom scoreboard */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-3">
          <div className="flex gap-3 overflow-x-auto">
            {state.scores.map((s, i) => (
              <div
                key={s.playerId}
                className={`flex items-center gap-2 flex-shrink-0 px-3 py-1.5 rounded-lg ${
                  s.playerId === state.winnerId
                    ? "bg-red-500/20 border border-red-500/50"
                    : "bg-gray-700/50"
                }`}
              >
                <span className="text-sm">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ""}
                </span>
                <span className="text-xs font-display text-gray-300 truncate max-w-[80px]">
                  {s.nickname}
                </span>
                <span className="text-xs font-display font-bold text-red-400">
                  {s.score}
                </span>
                {s.streak >= 2 && <span className="text-xs">🔥{s.streak}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
