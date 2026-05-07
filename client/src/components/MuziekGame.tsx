import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import type { MuziekClientState, MuziekPlayerScore } from "shared/types";
import { PREMADE_AVATARS, HEARDLE_PHASES } from "shared/types";
import { useSocket } from "../context/SocketContext";

function isEmojiAvatar(url: string): boolean {
  return PREMADE_AVATARS.includes(url) || url.length <= 2;
}

interface Props {
  state: MuziekClientState;
  isSpectator?: boolean;
}

export default function MuziekGame({ state, isSpectator }: Props) {
  const socket = useSocket();
  const [input, setInput] = useState("");
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(
    null,
  );
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const inputRef = useRef<HTMLInputElement>(null);
  const howlRef = useRef<Howl | null>(null);
  const resultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Smooth client-side timer ────────────────────────
  const [displayMs, setDisplayMs] = useState(state.timeRemainingMs);
  const lastServerMs = useRef(state.timeRemainingMs);
  const lastSyncTime = useRef(Date.now());

  useEffect(() => {
    lastServerMs.current = state.timeRemainingMs;
    lastSyncTime.current = Date.now();
    setDisplayMs(state.timeRemainingMs);
  }, [state.songIndex, state.timeRemainingMs]);

  useEffect(() => {
    if (state.phase !== "listening" || displayMs <= 0) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSyncTime.current;
      const remaining = Math.max(0, lastServerMs.current - elapsed);
      setDisplayMs(remaining);
    }, 50);
    return () => clearInterval(interval);
  }, [state.phase, displayMs > 0]);

  // ─── Audio playback ──────────────────────────────────
  const heardleStopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Stop previous audio
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (heardleStopTimeout.current) {
      clearTimeout(heardleStopTimeout.current);
      heardleStopTimeout.current = null;
    }

    setAudioError(false);

    if (!state.previewUrl || state.phase === "finished") return;

    const howl = new Howl({
      src: [state.previewUrl],
      html5: true,
      volume: volume,
      onplay: () => {
        // Seek to the clip start offset once playing
        if (state.clipStartOffset > 0) {
          // Use a small delay to ensure HTML5 audio is ready to seek
          setTimeout(() => {
            howl.seek(state.clipStartOffset);
          }, 150);
        }
        // Heardle mode: stop audio after phase duration
        if (state.heardleMode && state.heardlePhaseDuration) {
          const stopDelay = state.heardlePhaseDuration * 1000 + 150; // account for seek delay
          heardleStopTimeout.current = setTimeout(() => {
            howl.stop();
          }, stopDelay);
        }
      },
      onloaderror: (_id: unknown, err: unknown) => {
        console.warn("[Muziek] Failed to load audio preview", err);
        setAudioError(true);
      },
      onplayerror: (_id: unknown, err: unknown) => {
        console.warn("[Muziek] Failed to play audio preview", err);
        setAudioError(true);
      },
    });

    howl.play();
    howlRef.current = howl;

    return () => {
      howl.stop();
      howl.unload();
      if (heardleStopTimeout.current) {
        clearTimeout(heardleStopTimeout.current);
        heardleStopTimeout.current = null;
      }
    };
  }, [state.songIndex, state.previewUrl, state.heardlePhase]);

  // ─── Volume change ───────────────────────────────────
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.volume(volume);
    }
  }, [volume]);

  // Stop audio on reveal
  useEffect(() => {
    if (state.phase === "reveal" || state.winnerId || state.correctTitle) {
      // Let audio keep playing during reveal for atmosphere
    }
  }, [state.phase, state.winnerId, state.correctTitle]);

  // Focus input on new song / new heardle phase
  useEffect(() => {
    if (state.phase === "listening" && inputRef.current) {
      inputRef.current.focus();
    }
    setInput("");
    setLastResult(null);
    setSelectedOption(null);
  }, [state.songIndex, state.phase, state.heardlePhase]);

  // Listen for buzz results to show inline flash
  useEffect(() => {
    if (!socket) return;
    const handler = ({ correct }: { correct: boolean }) => {
      setLastResult(correct ? "correct" : "wrong");
    };
    socket.on("muziek:buzz-result", handler);
    return () => {
      socket.off("muziek:buzz-result", handler);
    };
  }, [socket]);

  // Clear result flash (only for text input mode, not multiple choice)
  useEffect(() => {
    if (lastResult && !selectedOption) {
      if (resultTimeout.current) clearTimeout(resultTimeout.current);
      resultTimeout.current = setTimeout(() => {
        setLastResult(null);
      }, 1500);
    }
    return () => {
      if (resultTimeout.current) clearTimeout(resultTimeout.current);
    };
  }, [lastResult, selectedOption]);

  const handleBuzz = useCallback(() => {
    if (!socket || !input.trim() || state.answered) return;
    socket.emit("muziek:buzz", { answer: input.trim() });
    setInput("");
  }, [socket, input, state.answered]);

  const handleOptionClick = useCallback(
    (option: string) => {
      if (!socket || state.answered || selectedOption) return;
      setSelectedOption(option);
      socket.emit("muziek:buzz", { answer: option });
    },
    [socket, state.answered, selectedOption],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBuzz();
    }
  };

  // Timer calculations
  const totalMs = state.totalTimeMs || 10000;
  const fraction = Math.max(0, Math.min(1, displayMs / totalMs));
  const seconds = Math.ceil(displayMs / 1000);
  const isLow = seconds <= 5;
  const isCritical = seconds <= 3;

  const isRevealing = !!state.correctTitle;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {/* Timer bar */}
      {state.phase === "listening" && !isRevealing && (
        <div className="flex-shrink-0 mb-4">
          {/* Heardle phase indicator */}
          {state.heardleMode ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-display font-bold text-gray-500">
                  🎵 Fase {(state.heardlePhase ?? 0) + 1}/
                  {state.heardleTotalPhases ?? HEARDLE_PHASES.length}
                </span>
                <span className="text-xs font-display font-semibold text-purple-600">
                  {state.heardlePhaseDuration}s fragment
                </span>
              </div>
              <div className="flex gap-1 mb-3">
                {HEARDLE_PHASES.map((dur, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      i < (state.heardlePhase ?? 0)
                        ? "bg-gray-300"
                        : i === (state.heardlePhase ?? 0)
                          ? "bg-purple-500"
                          : "bg-gray-100"
                    }`}
                    title={`${dur}s`}
                  />
                ))}
              </div>
              {/* Skip vote info */}
              {!isSpectator && !state.answered && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {state.heardleSkipCount ?? 0}/
                    {state.heardlePlayersRemaining ?? 0} willen door
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-display font-bold text-gray-500">
                  🎵 Luister...
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
                  {seconds}s
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-colors duration-500 ${
                    isCritical
                      ? "bg-red-500"
                      : isLow
                        ? "bg-orange-400"
                        : "bg-purple-500"
                  }`}
                  style={{ width: `${fraction * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="flex-shrink-0 mb-3 flex items-center justify-between">
        <span className="text-sm font-display font-semibold text-gray-500">
          Nummer {state.songIndex + 1} / {state.totalSongs}
        </span>
        <span className="text-sm font-display font-semibold text-purple-600">
          {state.category}
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`song-${state.songIndex}-${isRevealing ? "reveal" : "listen"}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-2xl w-full px-4"
          >
            {/* Listening phase — audio visualizer placeholder */}
            {!isRevealing && (
              <div className="mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center"
                >
                  <span className="text-5xl">{audioError ? "⚠️" : "🎧"}</span>
                </motion.div>
                <p className="mt-4 font-display font-bold text-lg text-gray-600">
                  {audioError
                    ? "Audio kon niet geladen worden — typ je gok!"
                    : "Welk nummer is dit?"}
                </p>
                {/* Volume slider */}
                <div className="mt-3 flex items-center justify-center gap-2 max-w-[200px] mx-auto">
                  <span className="text-sm">🔈</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none bg-purple-200 accent-purple-600 cursor-pointer"
                  />
                  <span className="text-sm">🔊</span>
                </div>
                {/* Heardle replay button */}
                {state.heardleMode && !audioError && (
                  <button
                    onClick={() => {
                      const howl = howlRef.current;
                      if (!howl) return;
                      if (heardleStopTimeout.current) {
                        clearTimeout(heardleStopTimeout.current);
                      }
                      howl.stop();
                      howl.play();
                    }}
                    className="mt-3 px-4 py-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-display font-bold text-sm transition-colors"
                  >
                    🔁 Opnieuw afspelen
                  </button>
                )}
              </div>
            )}

            {/* Reveal phase */}
            {isRevealing && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-4"
              >
                {state.coverUrl && (
                  <img
                    src={state.coverUrl}
                    alt="Album cover"
                    className="w-32 h-32 mx-auto rounded-xl shadow-lg mb-4"
                  />
                )}
                <p className="font-display font-black text-2xl sm:text-3xl text-purple-700">
                  {state.correctTitle}
                </p>
                <p className="font-display font-bold text-lg text-gray-500 mt-1">
                  {state.correctArtist}
                </p>
                {state.winnerName ? (
                  <p className="mt-3 text-green-600 font-display font-bold">
                    🏆 {state.winnerName} raadde het!
                  </p>
                ) : (
                  <p className="mt-3 text-orange-500 font-display font-bold">
                    Niemand raadde het! ⏱️
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Input area */}
      {!isRevealing && !isSpectator && (
        <div className="flex-shrink-0 mt-4">
          {state.answered ? (
            <p className="text-center text-green-500 font-display font-bold text-sm">
              ✅ Correct!
            </p>
          ) : state.heardleLockedOut ? (
            <p className="text-center text-orange-500 font-display font-bold text-sm">
              ⏳ Wacht op volgende fase...
            </p>
          ) : state.options && state.options.length > 0 ? (
            /* Meerkeuze mode: 4 option buttons */
            <div className="grid grid-cols-2 gap-3">
              {state.options.map((option) => {
                const isSelected = selectedOption === option;
                const showCorrect = isSelected && lastResult === "correct";
                const showWrong = isSelected && lastResult === "wrong";
                return (
                  <button
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!selectedOption}
                    className={`px-4 py-3 rounded-xl border-2 font-display font-semibold text-sm transition-all text-left
                      ${
                        showCorrect
                          ? "border-green-400 bg-green-50 text-green-800"
                          : showWrong
                            ? "border-red-400 bg-red-50 text-red-800 animate-shake"
                            : "border-gray-200 hover:border-purple-400 hover:bg-purple-50 text-gray-800"
                      }
                      ${selectedOption && !isSelected ? "opacity-50" : ""}
                    `}
                  >
                    {showCorrect && "✅ "}
                    {showWrong && "❌ "}
                    {option}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Text input mode */
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Typ je antwoord..."
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none font-display font-semibold text-lg"
                maxLength={200}
                autoComplete="off"
              />
              <button
                onClick={handleBuzz}
                disabled={!input.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-display font-bold rounded-xl transition-colors"
              >
                Raad!
              </button>
            </div>
          )}

          {/* Result flash */}
          <AnimatePresence>
            {lastResult && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-center mt-2 font-display font-bold text-sm ${
                  lastResult === "correct" ? "text-green-500" : "text-red-500"
                }`}
              >
                {lastResult === "correct"
                  ? "✅ Goed!"
                  : "❌ Fout! Probeer opnieuw"}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Heardle Skip + Give Up buttons */}
          {state.heardleMode && !state.answered && !state.heardleGaveUp && (
            <div className="flex gap-2 mt-3">
              {!state.heardleSkipped ? (
                <button
                  onClick={() => socket?.emit("muziek:heardle-skip")}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-600 font-display font-bold text-sm transition-all"
                >
                  ⏭️ Skip ({state.heardleSkipCount ?? 0}/
                  {state.heardlePlayersRemaining ?? 0})
                </button>
              ) : (
                <span className="flex-1 py-2.5 text-center text-gray-400 font-display font-semibold text-sm">
                  ⏳ Wachten... ({state.heardleSkipCount ?? 0}/
                  {state.heardlePlayersRemaining ?? 0})
                </span>
              )}
              <button
                onClick={() => socket?.emit("muziek:give-up")}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-500 font-display font-bold text-sm transition-all"
              >
                🤷 Weet ik niet
              </button>
            </div>
          )}
          {state.heardleMode && !state.answered && state.heardleGaveUp && (
            <p className="text-center mt-3 text-red-400 font-display font-semibold text-sm">
              Je hebt opgegeven voor dit nummer
            </p>
          )}
        </div>
      )}

      {/* Scoreboard */}
      <div className="flex-shrink-0 mt-4 border-t pt-3">
        <h3 className="text-xs font-display font-bold text-gray-400 uppercase mb-2">
          Scorebord
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {state.scores.slice(0, 6).map((s: MuziekPlayerScore, i: number) => (
            <div
              key={s.playerId}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                i === 0 ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50"
              }`}
            >
              {isEmojiAvatar(s.avatarUrl) ? (
                <span className="text-lg">{s.avatarUrl}</span>
              ) : (
                <img
                  src={s.avatarUrl}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-display font-bold truncate">
                  {s.nickname}
                </p>
                <p className="text-xs text-gray-500">{s.score} pts</p>
              </div>
              {s.heardleStatus === "correct" && (
                <span className="text-xs">✅</span>
              )}
              {s.heardleStatus === "gave-up" && (
                <span className="text-xs">🤷</span>
              )}
              {s.heardleStatus === "skipped" && (
                <span className="text-xs">⏭️</span>
              )}
              {s.heardleStatus === "locked-out" && (
                <span className="text-xs">❌</span>
              )}
              {s.heardleStatus === "guessing" && (
                <span className="text-xs">💭</span>
              )}
              {s.streak > 1 && (
                <span className="text-xs font-bold text-orange-500">
                  🔥{s.streak}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
