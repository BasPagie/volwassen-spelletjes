import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { getSession } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import { useSocketEvents } from "../hooks/useSocketEvents";
import { PREMADE_AVATARS } from "shared/types";

// Phases: drumroll → 3rd → 2nd → 1st → leaderboard
type RevealPhase = "drumroll" | "third" | "second" | "first" | "leaderboard";

function getPhaseOrder(playerCount: number): RevealPhase[] {
  const phases: RevealPhase[] = ["drumroll"];
  if (playerCount >= 3) phases.push("third");
  if (playerCount >= 2) phases.push("second");
  phases.push("first", "leaderboard");
  return phases;
}

const PHASE_TIMINGS: Record<RevealPhase, number> = {
  drumroll: 2500,
  third: 1800,
  second: 1800,
  first: 2200,
  leaderboard: 0,
};

export default function Results() {
  useSocketEvents();

  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const { state } = useGame();
  const [phase, setPhase] = useState<RevealPhase>("drumroll");
  const playerCount = state.finalResults?.players.length ?? 0;
  const phaseOrder = getPhaseOrder(playerCount);

  // Auto-advance through phases
  useEffect(() => {
    const timing = PHASE_TIMINGS[phase];
    if (timing === 0) return; // leaderboard = final, stop

    const timer = setTimeout(() => {
      const idx = phaseOrder.indexOf(phase);
      if (idx < phaseOrder.length - 1) {
        setPhase(phaseOrder[idx + 1]);
      }
    }, timing);

    return () => clearTimeout(timer);
  }, [phase, phaseOrder]);

  const handlePlayAgain = () => {
    if (!socket) return;
    socket.emit("play-again");
  };

  const handleNewGame = () => {
    navigate("/");
  };

  useEffect(() => {
    if (state.phase === "lobby" && roomId) {
      navigate(`/lobby/${roomId}`);
    }
  }, [state.phase, roomId, navigate]);

  if (!state.finalResults) {
    const session = getSession();
    if (!session || session.roomId !== roomId) {
      navigate("/");
      return null;
    }

    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <p className="font-display font-bold text-xl text-gray-600">
            Resultaten laden...
          </p>
        </div>
      </div>
    );
  }

  const { players } = state.finalResults;
  const top3 = players.slice(0, 3);
  const showThird =
    phase === "third" ||
    phase === "second" ||
    phase === "first" ||
    phase === "leaderboard";
  const showSecond =
    phase === "second" || phase === "first" || phase === "leaderboard";
  const showFirst = phase === "first" || phase === "leaderboard";
  const showLeaderboard = phase === "leaderboard";

  // Drumroll intro
  if (phase === "drumroll") {
    return (
      <div className="h-screen flex items-center justify-center px-4 bg-gradient-to-b from-gray-900 to-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.1, 1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-8xl mb-6"
          >
            🥁
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display font-black text-4xl sm:text-5xl text-white mb-3"
          >
            Wie wint?
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="flex justify-center gap-2 mt-4"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.15,
                  repeat: Infinity,
                }}
                className="w-3 h-3 rounded-full bg-yellow-400"
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`h-screen overflow-y-auto px-4 ${!showLeaderboard ? "flex flex-col items-center justify-center" : "py-6"}`}
    >
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1
            className="font-display font-black text-4xl sm:text-5xl text-transparent bg-clip-text
                        bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 mb-2"
          >
            Eindstand
          </h1>
        </motion.div>

        {/* Podium reveal */}
        <div
          className={`flex items-end justify-center gap-2 sm:gap-6 ${showLeaderboard ? "mb-10" : "mb-0"} min-h-[280px] sm:min-h-[340px]`}
        >
          {/* 2nd place */}
          <div className="text-center w-24 sm:w-32">
            <AnimatePresence>
              {showSecond && top3[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                >
                  <PodiumPlayer player={top3[1]} medal="🥈" />
                  <div className="bg-gray-300 rounded-t-2xl w-24 sm:w-32 h-20 sm:h-28 flex items-center justify-center mt-2">
                    <span className="font-display font-black text-3xl sm:text-4xl text-white">
                      2
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 1st place */}
          <div className="text-center w-28 sm:w-36">
            <AnimatePresence>
              {showFirst && top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 80, scale: 0.3 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 10, stiffness: 100 }}
                >
                  <PodiumPlayer player={top3[0]} medal="🥇" isWinner />
                  <motion.div
                    className="bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-t-2xl w-28 sm:w-36 h-28 sm:h-36 
                                flex items-center justify-center mt-2 shadow-lg"
                    animate={{
                      boxShadow: [
                        "0 0 0px #facc15",
                        "0 0 30px #facc15",
                        "0 0 0px #facc15",
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <span className="font-display font-black text-4xl sm:text-5xl text-white">
                      1
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3rd place */}
          <div className="text-center w-24 sm:w-32">
            <AnimatePresence>
              {showThird && top3[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                >
                  <PodiumPlayer player={top3[2]} medal="🥉" />
                  <div className="bg-orange-300 rounded-t-2xl w-24 sm:w-32 h-16 sm:h-20 flex items-center justify-center mt-2">
                    <span className="font-display font-black text-3xl sm:text-4xl text-white">
                      3
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Full leaderboard — appears after all podium reveals */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="card mb-6">
                <h3 className="font-display font-bold text-lg text-gray-700 mb-4">
                  Ranglijst
                </h3>
                <div className="space-y-2">
                  {players.map((p, i) => {
                    const isMe = p.playerId === state.player?.id;
                    const isEmoji =
                      PREMADE_AVATARS.includes(p.avatarUrl) ||
                      p.avatarUrl.length <= 2;

                    return (
                      <motion.div
                        key={p.playerId}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className={`flex items-center gap-3 p-3 rounded-xl
                          ${isMe ? "bg-brand-50 border-2 border-brand-200" : "bg-gray-50"}`}
                      >
                        <span className="font-display font-black text-lg text-gray-400 w-8 text-center">
                          {i === 0
                            ? "🥇"
                            : i === 1
                              ? "🥈"
                              : i === 2
                                ? "🥉"
                                : `${i + 1}`}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl overflow-hidden">
                          {isEmoji ? (
                            <span>{p.avatarUrl}</span>
                          ) : (
                            <img
                              src={p.avatarUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-display font-bold text-gray-800">
                            {p.nickname}
                            {isMe && (
                              <span className="text-xs text-brand-500 ml-1">
                                (Jij)
                              </span>
                            )}
                          </span>
                          <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                            {p.roundScores.map((score, ri) => (
                              <span key={ri}>
                                R{ri + 1}: {score}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="font-display font-black text-2xl text-brand-600">
                          {p.totalScore}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-4 justify-center"
              >
                {state.player?.isHost && (
                  <button onClick={handlePlayAgain} className="btn-primary">
                    🔄 Opnieuw Spelen
                  </button>
                )}
                <button onClick={handleNewGame} className="btn-secondary">
                  🏠 Nieuw Spel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Podium Player sub-component ──────────────────────
function PodiumPlayer({
  player,
  medal,
  isWinner,
}: {
  player: { nickname: string; avatarUrl: string; totalScore: number };
  medal: string;
  isWinner?: boolean;
}) {
  const isEmoji =
    PREMADE_AVATARS.includes(player.avatarUrl) || player.avatarUrl.length <= 2;

  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-4xl mb-1">{medal}</span>
      <div
        className={`rounded-full flex items-center justify-center overflow-hidden border-4 
        ${isWinner ? "w-16 h-16 sm:w-24 sm:h-24 border-yellow-400 shadow-lg" : "w-14 h-14 sm:w-20 sm:h-20 border-gray-300"}
        bg-white`}
      >
        {isEmoji ? (
          <span
            className={
              isWinner ? "text-3xl sm:text-5xl" : "text-2xl sm:text-4xl"
            }
          >
            {player.avatarUrl}
          </span>
        ) : (
          <img
            src={player.avatarUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <p className="font-display font-bold text-xs sm:text-sm text-gray-800 mt-1 max-w-28 sm:max-w-32 text-center break-words leading-tight">
        {player.nickname}
      </p>
      <p className="font-display font-black text-base sm:text-lg text-brand-600">
        {player.totalScore}
      </p>
    </div>
  );
}
