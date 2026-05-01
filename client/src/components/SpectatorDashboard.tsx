import { useState } from "react";
import { motion } from "framer-motion";
import type { PlayerProgress, Player } from "shared/types";
import { PREMADE_AVATARS } from "shared/types";
import type { Socket } from "socket.io-client";

interface SpectatorDashboardProps {
  progress: PlayerProgress[];
  players: Player[];
  socket: Socket | null;
  totalGroups: number;
}

export default function SpectatorDashboard({
  progress,
  players,
  socket,
  totalGroups,
}: SpectatorDashboardProps) {
  const [hintText, setHintText] = useState("");
  const [hintSent, setHintSent] = useState(false);

  const activePlayers = players.filter((p) => p.connected && !p.isHost);

  const merged = activePlayers
    .map((pl) => {
      const p = progress.find((pr) => pr.playerId === pl.id);
      return {
        player: pl,
        solvedCount: p?.solvedCount ?? 0,
        finished: p?.finished ?? false,
        score: p?.score ?? pl.score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const sendHint = () => {
    if (!hintText.trim() || !socket) return;
    socket.emit("host:give-hint", { hint: hintText.trim() });
    setHintText("");
    setHintSent(true);
    setTimeout(() => setHintSent(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <span className="text-4xl">👀</span>
        <p className="font-display font-bold text-lg text-gray-600 mt-1">
          Toeschouwer Dashboard
        </p>
      </div>

      {/* Live scoreboard */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-lg mb-4">
        <h4 className="font-display font-bold text-xs text-gray-500 mb-3 uppercase tracking-wide">
          Live Tussenstand
        </h4>
        <div className="space-y-2">
          {merged.map(({ player, solvedCount, finished, score }) => {
            const isEmoji =
              PREMADE_AVATARS.includes(player.avatarUrl) ||
              player.avatarUrl.length <= 2;
            const progressFraction =
              totalGroups > 0 ? Math.min(solvedCount / totalGroups, 1) : 0;

            // Status indicator
            let statusColor = "bg-yellow-400"; // thinking
            let statusLabel = "🤔";
            if (finished) {
              statusColor = "bg-green-400";
              statusLabel = "✅";
            } else if (solvedCount === 0 && progress.length > 0) {
              statusColor = "bg-red-400";
              statusLabel = "😵";
            }

            return (
              <div
                key={player.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-gray-50"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                  {isEmoji ? (
                    <span>{player.avatarUrl}</span>
                  ) : (
                    <img
                      src={player.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Name + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-xs text-gray-700 truncate">
                      {player.nickname}
                    </span>
                    <span className="text-xs font-bold text-brand-600">
                      {score} pt
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <motion.div
                      className="h-full bg-brand-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressFraction * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div
                  className="flex-shrink-0 text-sm"
                  title={
                    finished ? "Klaar" : solvedCount === 0 ? "Vast" : "Bezig"
                  }
                >
                  {statusLabel}
                </div>
              </div>
            );
          })}
          {merged.length === 0 && (
            <p className="text-sm text-gray-400 text-center">
              Wacht op spelers...
            </p>
          )}
        </div>
      </div>

      {/* Hint system */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
        <h4 className="font-display font-bold text-xs text-gray-500 mb-2 uppercase tracking-wide">
          💡 Hint geven
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={hintText}
            onChange={(e) => setHintText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendHint()}
            placeholder="Typ een hint..."
            maxLength={200}
            className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-brand-400
                       focus:outline-none font-display text-sm transition-colors"
          />
          <button
            onClick={sendHint}
            disabled={!hintText.trim()}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white font-display font-bold text-sm
                       hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {hintSent ? "✓" : "Stuur"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
