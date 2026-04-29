import type { PlayerProgress, Player } from "shared/types";
import { PREMADE_AVATARS } from "shared/types";

interface ProgressSidebarProps {
  progress: PlayerProgress[];
  players: Player[];
  currentPlayerId?: string;
  totalGroups: number;
}

export default function ProgressSidebar({
  progress,
  players,
  currentPlayerId,
  totalGroups,
}: ProgressSidebarProps) {
  // Merge players with progress data so everyone shows from the start
  const merged = players
    .filter((pl) => {
      // Exclude spectating host (no progress entry will ever exist)
      const hasProgress = progress.some((p) => p.playerId === pl.id);
      return hasProgress || progress.length === 0;
    })
    .map((pl) => {
      const p = progress.find((pr) => pr.playerId === pl.id);
      return {
        playerId: pl.id,
        solvedCount: p?.solvedCount ?? 0,
        finished: p?.finished ?? false,
        score: p?.score ?? pl.score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
      <h4 className="font-display font-bold text-sm text-gray-500 mb-3 uppercase tracking-wide">
        Tussenstand
      </h4>
      <div className="space-y-2">
        {merged.map((p) => {
          const player = players.find((pl) => pl.id === p.playerId);
          if (!player) return null;
          const isMe = p.playerId === currentPlayerId;
          const isEmoji =
            PREMADE_AVATARS.includes(player.avatarUrl) ||
            player.avatarUrl.length <= 2;
          const progressFraction = Math.min(p.solvedCount / totalGroups, 1);

          return (
            <div
              key={p.playerId}
              className={`flex items-center gap-2 p-2 rounded-xl transition-all text-sm
                ${isMe ? "bg-brand-50" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-gray-700 text-xs break-all leading-tight">
                    {player.nickname}
                  </span>
                  <span className="font-display font-bold text-brand-600 text-xs ml-1">
                    {p.score}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500
                      ${p.finished ? "bg-green-400" : "bg-brand-400"}`}
                    style={{ width: `${progressFraction * 100}%` }}
                  />
                </div>
              </div>
              {p.finished && <span className="text-green-500 text-xs">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
