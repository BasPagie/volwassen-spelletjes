import { useState, useEffect } from "react";
import type { Player } from "shared/types";
import { PREMADE_AVATARS } from "shared/types";

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  isHost?: boolean;
  hostPlays?: boolean;
  onUpdateScore?: (playerId: string, score: number) => void;
  onKickPlayer?: (playerId: string) => void;
}

export default function PlayerList({
  players,
  currentPlayerId,
  isHost,
  hostPlays = true,
  onUpdateScore,
  onKickPlayer,
}: PlayerListProps) {
  return (
    <div className="space-y-2">
      {players.map((player) => {
        const isEmoji =
          PREMADE_AVATARS.includes(player.avatarUrl) ||
          player.avatarUrl.length <= 2;
        const isMe = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all
                        ${isMe ? "bg-brand-50 border-2 border-brand-200" : "bg-gray-50 border-2 border-transparent"}`}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 
                            flex items-center justify-center text-xl overflow-hidden flex-shrink-0"
            >
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

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-gray-800">
                  {player.nickname}
                </span>
                {isMe && (
                  <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full font-medium">
                    Jij
                  </span>
                )}
                {player.isHost && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    👑 Host
                  </span>
                )}
                {player.isHost && !hostPlays && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                    👀
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            {isHost && onUpdateScore ? (
              <ScoreEditor
                playerId={player.id}
                score={player.score}
                onUpdate={onUpdateScore}
              />
            ) : (
              <span className="font-display font-bold text-sm text-brand-600 w-16 text-right">
                {player.score}
              </span>
            )}

            {/* Connection status */}
            <div
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 
                            ${player.connected ? "bg-green-400" : "bg-gray-300"}`}
            />

            {/* Kick button (host only, not on self or host) */}
            {isHost && !isMe && !player.isHost && onKickPlayer && (
              <button
                onClick={() => onKickPlayer(player.id)}
                className="ml-1 w-6 h-6 flex items-center justify-center rounded-full
                           text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                title="Verwijder speler"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreEditor({
  playerId,
  score,
  onUpdate,
}: {
  playerId: string;
  score: number;
  onUpdate: (playerId: string, score: number) => void;
}) {
  const [localScore, setLocalScore] = useState(String(score));

  useEffect(() => {
    setLocalScore(String(score));
  }, [score]);

  const commit = (val: string) => {
    const num = parseInt(val, 10);
    onUpdate(playerId, isNaN(num) ? 0 : num);
  };

  return (
    <input
      type="number"
      value={localScore}
      onChange={(e) => setLocalScore(e.target.value)}
      onBlur={() => commit(localScore)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(localScore);
      }}
      className="w-16 px-1 py-1 text-center text-sm font-display font-bold text-brand-600 
                 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
    />
  );
}
