import { motion } from "framer-motion";
import type { PlayerProgress, Player } from "shared/types";
import { PREMADE_AVATARS } from "shared/types";

interface WaitingOverlayProps {
  myScore: number;
  progress: PlayerProgress[];
  players: Player[];
  currentPlayerId?: string;
}

export default function WaitingOverlay({
  myScore,
  progress,
  players,
  currentPlayerId,
}: WaitingOverlayProps) {
  const busyPlayers = progress.filter(
    (p) => p.playerId !== currentPlayerId && !p.finished,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-30 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 120 }}
        className="text-center px-6 py-8 max-w-sm w-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg"
      >
        {/* Celebration */}
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl mb-3"
        >
          🎉
        </motion.div>

        <h2 className="font-display font-black text-2xl text-gray-800 mb-1">
          Klaar!
        </h2>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 10 }}
          className="inline-block bg-brand-100 text-brand-700 font-display font-black text-xl px-5 py-2 rounded-2xl mb-5"
        >
          +{myScore} punten
        </motion.div>

        {/* Busy players */}
        {busyPlayers.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 font-display font-bold mb-3">
              ⏳ Wacht op {busyPlayers.length}{" "}
              {busyPlayers.length === 1 ? "speler" : "spelers"}...
            </p>

            <div className="space-y-1.5">
              {busyPlayers.map((p) => {
                const player = players.find((pl) => pl.id === p.playerId);
                if (!player) return null;
                const isEmoji =
                  PREMADE_AVATARS.includes(player.avatarUrl) ||
                  player.avatarUrl.length <= 2;

                return (
                  <motion.div
                    key={p.playerId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
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
                    <span className="font-display font-bold text-xs text-gray-600 flex-1 text-left truncate">
                      {player.nickname}
                    </span>
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-amber-500 font-display font-bold text-xs"
                    >
                      Bezig...
                    </motion.span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
