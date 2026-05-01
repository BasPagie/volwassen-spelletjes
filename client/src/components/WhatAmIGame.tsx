import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WhatAmIClientGameState, Player } from "shared/types";
import CharacterCard from "./CharacterCard";
import { useSocket } from "../context/SocketContext";
import confetti from "canvas-confetti";

interface Props {
  gameState: WhatAmIClientGameState;
  currentPlayerId: string;
  currentPlayerIsHost: boolean;
  hostPlays: boolean;
  players: Player[];
  onGuess: (guess: string) => void;
  onSkipTurn: () => void;
  onGiveUp: () => void;
  onPlayAgain: () => void;
}

export default function WhatAmIGame({
  gameState,
  currentPlayerId,
  currentPlayerIsHost,
  hostPlays,
  players,
  onGuess,
  onSkipTurn,
  onGiveUp,
  onPlayAgain,
}: Props) {
  const [guess, setGuess] = useState("");
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    name?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isModeratorHost = currentPlayerIsHost && !hostPlays;
  const myState = gameState.players.find((p) => p.playerId === currentPlayerId);
  const isFinished = gameState.status === "finished";
  const isTurnBased = gameState.gameMode === "turns";
  const isMyTurn =
    isTurnBased && gameState.currentTurnPlayerId === currentPlayerId;
  const currentTurnPlayer = isTurnBased
    ? players.find((p) => p.id === gameState.currentTurnPlayerId)
    : null;

  // Cooldown
  const [cooldownLeft, setCooldownLeft] = useState(0);
  useEffect(() => {
    if (!myState?.cooldownUntil || Date.now() >= myState.cooldownUntil) {
      setCooldownLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.ceil(
        ((myState.cooldownUntil ?? 0) - Date.now()) / 1000,
      );
      setCooldownLeft(Math.max(0, remaining));
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [myState?.cooldownUntil]);

  // Fire confetti on correct guess
  const prevGuessed = useRef(false);
  useEffect(() => {
    if (myState?.guessedCorrectly && !prevGuessed.current) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });
    }
    prevGuessed.current = !!myState?.guessedCorrectly;
  }, [myState?.guessedCorrectly]);

  // Time remaining (free-for-all)
  const [timeLeft, setTimeLeft] = useState<number | null>(
    gameState.timeRemainingMs,
  );
  useEffect(() => {
    if (gameState.timeLimitSeconds === null || isTurnBased || isFinished) {
      setTimeLeft(null);
      return;
    }
    const end = gameState.startTime + gameState.timeLimitSeconds * 1000;
    const update = () => setTimeLeft(Math.max(0, end - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [
    gameState.startTime,
    gameState.timeLimitSeconds,
    isTurnBased,
    isFinished,
  ]);

  // Turn timer (turn-based)
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(
    gameState.turnTimeRemainingMs ?? null,
  );
  useEffect(() => {
    if (!isTurnBased || gameState.turnTimeRemainingMs == null || isFinished) {
      setTurnTimeLeft(null);
      return;
    }
    setTurnTimeLeft(gameState.turnTimeRemainingMs);
    // Count down locally between server ticks
    const interval = setInterval(() => {
      setTurnTimeLeft((prev) =>
        prev !== null ? Math.max(0, prev - 1000) : null,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isTurnBased, gameState.turnTimeRemainingMs, gameState.turnNumber]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const handleSubmitGuess = () => {
    if (!guess.trim() || cooldownLeft > 0 || myState?.guessedCorrectly) return;
    onGuess(guess.trim());
    setGuess("");
    inputRef.current?.focus();
  };

  // Sort: unguessed first, then by placement
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (a.guessedCorrectly && !b.guessedCorrectly) return 1;
    if (!a.guessedCorrectly && b.guessedCorrectly) return -1;
    if (a.placement !== null && b.placement !== null)
      return a.placement - b.placement;
    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-50 to-gray-50 px-2 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="max-w-6xl w-full">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl text-purple-800">
              🎭 Wie Ben Ik?
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {gameState.packName.split(" + ").map((name, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 text-xs font-display font-bold"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Timer */}
          {timeLeft !== null && (
            <div
              className={`font-display font-black text-lg sm:text-2xl rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shrink-0 ${
                timeLeft < 60000
                  ? "text-red-600 bg-red-100"
                  : "text-gray-700 bg-white border border-gray-200"
              }`}
            >
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
          {/* Turn timer */}
          {isTurnBased && turnTimeLeft !== null && (
            <div
              className={`font-display font-black text-lg sm:text-2xl rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shrink-0 ${
                turnTimeLeft < 10000
                  ? "text-red-600 bg-red-100"
                  : "text-gray-700 bg-white border border-gray-200"
              }`}
            >
              ⏱ {formatTime(turnTimeLeft)}
            </div>
          )}
        </div>

        {/* Turn indicator */}
        {isTurnBased && !isFinished && (
          <motion.div
            key={gameState.turnNumber}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3 rounded-xl text-center font-display font-bold ${
              isMyTurn
                ? "bg-yellow-100 border-2 border-yellow-400 text-yellow-800"
                : "bg-gray-100 border border-gray-300 text-gray-600"
            }`}
          >
            {isMyTurn ? (
              <span className="text-lg">
                🎯 Jij bent aan de beurt! Stel vragen en raad je karakter.
              </span>
            ) : (
              <span>
                🔄 Beurt van{" "}
                <span className="text-purple-700 inline-flex items-center gap-1">
                  {currentTurnPlayer?.avatarUrl &&
                  (currentTurnPlayer.avatarUrl.startsWith("data:") ||
                    currentTurnPlayer.avatarUrl.startsWith("http")) ? (
                    <img
                      src={currentTurnPlayer.avatarUrl}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover inline"
                    />
                  ) : (
                    <span>{currentTurnPlayer?.avatarUrl}</span>
                  )}{" "}
                  {currentTurnPlayer?.nickname ?? "..."}
                </span>
              </span>
            )}
          </motion.div>
        )}

        {/* Characters grid */}
        <div
          className={`grid gap-2 sm:gap-3 mb-4 sm:mb-6 ${
            sortedPlayers.length === 1
              ? "grid-cols-1 max-w-[200px] mx-auto"
              : sortedPlayers.length === 2
                ? "grid-cols-2 max-w-md mx-auto"
                : sortedPlayers.length === 3
                  ? "grid-cols-2 sm:grid-cols-3 max-w-2xl mx-auto"
                  : sortedPlayers.length <= 4
                    ? "grid-cols-2 sm:grid-cols-4 max-w-3xl mx-auto"
                    : sortedPlayers.length === 5
                      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                      : sortedPlayers.length === 6
                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
                        : sortedPlayers.length <= 8
                          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          }`}
        >
          {sortedPlayers.map((ps) => {
            const player = players.find((p) => p.id === ps.playerId);
            const isOwn = !isModeratorHost && ps.playerId === currentPlayerId;
            return (
              <CharacterCard
                key={ps.playerId}
                playerState={ps}
                player={player}
                isOwn={isOwn}
              />
            );
          })}
        </div>

        {/* Guess input (for non-moderator players who haven't guessed yet) */}
        {!isModeratorHost &&
          !myState?.guessedCorrectly &&
          !isFinished &&
          (!isTurnBased || isMyTurn) && (
            <div className="bg-white rounded-2xl border-2 border-purple-200 p-3 sm:p-4 mb-4">
              <p className="font-display font-bold text-sm text-gray-600 mb-2 sm:mb-3">
                Wie ben jij? Typ je antwoord hieronder:
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitGuess()}
                  placeholder={
                    cooldownLeft > 0
                      ? `Cooldown: nog ${cooldownLeft}s...`
                      : "Voer de naam in van jouw karakter..."
                  }
                  disabled={cooldownLeft > 0}
                  maxLength={100}
                  className="flex-1 min-w-0 basis-full sm:basis-0 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 
                           focus:ring-2 focus:ring-purple-100 outline-none transition-all font-display text-sm sm:text-base
                           disabled:bg-gray-100 disabled:text-gray-400"
                />
                <button
                  onClick={handleSubmitGuess}
                  disabled={!guess.trim() || cooldownLeft > 0}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-display 
                           font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {cooldownLeft > 0 ? `⏱ ${cooldownLeft}s` : "Raden!"}
                </button>
                {isTurnBased && (
                  <button
                    onClick={onSkipTurn}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 text-gray-600 
                             hover:text-gray-800 font-display font-bold transition-all text-xs sm:text-sm"
                  >
                    Pas ⏭
                  </button>
                )}
                <button
                  onClick={onGiveUp}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-red-200 hover:border-red-400 text-red-500 
                           hover:text-red-700 font-display font-bold transition-all text-xs sm:text-sm"
                >
                  🏳️ Geen idee
                </button>
              </div>
              {cooldownLeft > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm font-display mt-2"
                >
                  ❌ Fout geraden — wacht {cooldownLeft} seconden voordat je
                  opnieuw mag raden.
                </motion.p>
              )}
            </div>
          )}

        {/* Already guessed banner */}
        {!isModeratorHost && myState?.guessedCorrectly && !isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-100 border-2 border-green-400 rounded-2xl p-4 mb-4 text-center"
          >
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-display font-black text-green-800 text-xl">
              Gefeliciteerd! Je bent #{myState.placement} ({myState.score}{" "}
              punten)
            </p>
            <p className="text-green-600 font-display text-sm mt-1">
              Wacht tot de andere spelers klaar zijn...
            </p>
          </motion.div>
        )}

        {/* Moderator host banner + hint */}
        {isModeratorHost && !isFinished && <ModeratorPanel />}

        {/* Game end screen */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border-2 border-purple-200 p-6 text-center"
            >
              <div className="text-5xl mb-3">🏆</div>
              <h2 className="font-display font-black text-3xl text-gray-800 mb-6">
                Einde van het spel!
              </h2>

              <div className="space-y-3 mb-6 text-left">
                {[...gameState.players]
                  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                  .map((ps, idx) => {
                    const player = players.find((p) => p.id === ps.playerId);
                    return (
                      <div
                        key={ps.playerId}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          idx === 0
                            ? "bg-yellow-50 border border-yellow-300"
                            : "bg-gray-50"
                        }`}
                      >
                        <span className="font-display font-black text-2xl w-8 text-center">
                          {idx === 0
                            ? "🥇"
                            : idx === 1
                              ? "🥈"
                              : idx === 2
                                ? "🥉"
                                : `#${idx + 1}`}
                        </span>
                        <span className="text-xl">
                          {player?.avatarUrl &&
                          (player.avatarUrl.startsWith("data:") ||
                            player.avatarUrl.startsWith("http")) ? (
                            <img
                              src={player.avatarUrl}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover inline"
                            />
                          ) : (
                            <>{player?.avatarUrl ?? "👤"}</>
                          )}
                        </span>
                        <div className="flex-1">
                          <p className="font-display font-bold text-gray-800">
                            {player?.nickname ?? "Speler"}
                          </p>
                          {ps.assignedCharacter && (
                            <p className="text-xs text-gray-500 font-display">
                              Was: {ps.assignedCharacter.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-display font-black text-gray-800">
                            {ps.guessedCorrectly ? `${ps.score} pts` : "0 pts"}
                          </p>
                          {ps.guessedCorrectly && ps.placement && (
                            <p className="text-xs text-gray-400 font-display">
                              #{ps.placement}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {currentPlayerIsHost && (
                <button
                  onClick={onPlayAgain}
                  className="btn-primary text-lg px-8 py-3"
                >
                  🔄 Terug naar Lobby
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ModeratorPanel() {
  const socket = useSocket();
  const [hint, setHint] = useState("");
  const [sent, setSent] = useState(false);

  const sendHint = () => {
    if (!hint.trim() || !socket) return;
    socket.emit("host:give-hint", { hint: hint.trim() });
    setHint("");
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-4">
      <p className="font-display font-bold text-orange-700 text-center mb-3">
        👀 Je bent moderator — jij ziet alle karakters
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendHint()}
          placeholder="Geef een hint..."
          maxLength={200}
          className="flex-1 px-3 py-2 rounded-xl border-2 border-orange-200 focus:border-orange-400
                     focus:outline-none font-display text-sm transition-colors"
        />
        <button
          onClick={sendHint}
          disabled={!hint.trim()}
          className="px-4 py-2 rounded-xl bg-orange-500 text-white font-display font-bold text-sm
                     hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {sent ? "✓" : "💡"}
        </button>
      </div>
    </div>
  );
}
