import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SnelsteVingerClientState } from "shared/types";
import { useSocket } from "../context/SocketContext";

interface Props {
  state: SnelsteVingerClientState;
  isSpectator?: boolean;
}

export default function SnelsteVingerGame({ state, isSpectator }: Props) {
  const socket = useSocket();
  const [input, setInput] = useState("");
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const resultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Smooth client-side timer ────────────────────────
  const [displayMs, setDisplayMs] = useState(state.timeRemainingMs);
  const lastServerMs = useRef(state.timeRemainingMs);
  const lastSyncTime = useRef(Date.now());

  // Sync when server sends a new value (new question)
  useEffect(() => {
    lastServerMs.current = state.timeRemainingMs;
    lastSyncTime.current = Date.now();
    setDisplayMs(state.timeRemainingMs);
  }, [state.questionIndex, state.timeRemainingMs]);

  // Tick down smoothly
  useEffect(() => {
    if (state.phase !== "question" || displayMs <= 0) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSyncTime.current;
      const remaining = Math.max(0, lastServerMs.current - elapsed);
      setDisplayMs(remaining);
    }, 50);
    return () => clearInterval(interval);
  }, [state.phase, displayMs > 0]);

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

  // Timer calculations
  const totalMs = state.totalTimeMs || 15000;
  const fraction = Math.max(0, Math.min(1, displayMs / totalMs));
  const seconds = Math.ceil(displayMs / 1000);
  const isLow = seconds <= 10;
  const isCritical = seconds <= 5;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Timer bar */}
      {state.phase === "question" && (
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-display font-bold text-gray-500">
              ⏱️ Tijd
            </span>
            <span
              className={`font-display font-black text-lg tabular-nums ${
                isCritical
                  ? "text-red-500 animate-pulse"
                  : isLow
                    ? "text-orange-500"
                    : "text-gray-700"
              }`}
            >
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors duration-500 ${
                isCritical
                  ? "bg-red-500"
                  : isLow
                    ? "bg-orange-400"
                    : "bg-red-400"
              }`}
              style={{ width: `${fraction * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`q-${state.questionIndex}-${state.phase}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-2xl w-full px-4"
          >
            {/* Question text */}
            <h2 className="font-display font-black text-2xl sm:text-3xl md:text-4xl leading-tight text-gray-800 mb-6">
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
                  <p className="text-sm font-display font-semibold text-gray-400 mb-1 uppercase tracking-wide">
                    Antwoord
                  </p>
                  <p className="font-display font-black text-3xl text-red-600">
                    {state.correctAnswer}
                  </p>
                  {state.winnerName ? (
                    <p className="mt-3 font-display text-green-600 font-bold text-lg">
                      🏆 {state.winnerName} was het snelst!
                    </p>
                  ) : (
                    <p className="mt-3 font-display text-gray-500 font-bold">
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
                <p className="text-2xl font-display font-black text-red-600">
                  🎉 Spel Afgelopen!
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Input section */}
        {state.phase === "question" &&
          !state.answered &&
          !state.winnerId &&
          !isSpectator && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md mt-8 px-4"
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
                    <span className="font-display font-bold text-red-500 text-sm">
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
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 
                           text-gray-800 font-display text-lg outline-none 
                           focus:border-red-400 focus:ring-2 focus:ring-red-100
                           placeholder:text-gray-400 transition-all"
                />
                <button
                  onClick={handleBuzz}
                  disabled={!input.trim()}
                  className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white 
                           font-display font-black text-lg transition-all 
                           disabled:opacity-40 disabled:cursor-not-allowed
                           active:scale-95 shadow-md"
                >
                  BUZZ!
                </button>
              </div>
            </motion.div>
          )}

        {/* Already answered correctly */}
        {state.phase === "question" && state.answered && !isSpectator && (
          <div className="mt-8 text-center">
            <span className="font-display font-bold text-green-600 text-lg">
              ✓ Goed geantwoord!
            </span>
          </div>
        )}

        {/* Spectator label */}
        {isSpectator && state.phase === "question" && (
          <div className="mt-8 text-center">
            <span className="font-display font-bold text-gray-400 text-lg">
              👀 Je kijkt toe
            </span>
          </div>
        )}
      </div>

      {/* Bottom scoreboard */}
      <div className="flex-shrink-0 pt-2 pb-1">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
          <div className="flex gap-3 overflow-x-auto justify-center">
            {state.scores.map((s, i) => (
              <div
                key={s.playerId}
                className={`flex items-center gap-2 flex-shrink-0 px-3 py-1.5 rounded-lg ${
                  s.playerId === state.winnerId
                    ? "bg-red-50 border border-red-200"
                    : "bg-white border border-gray-100"
                }`}
              >
                <span className="text-sm">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ""}
                </span>
                <span className="text-xs font-display text-gray-600 truncate max-w-[80px]">
                  {s.nickname}
                </span>
                <span className="text-xs font-display font-bold text-red-600">
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
