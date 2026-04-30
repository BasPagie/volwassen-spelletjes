import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { WhatAmIPlayerState, Player } from "shared/types";

interface Props {
  playerState: WhatAmIPlayerState;
  player: Player | undefined;
  isOwn: boolean;
}

export default function CharacterCard({ playerState, player, isOwn }: Props) {
  const {
    assignedCharacter,
    guessedCorrectly,
    gaveUp,
    placement,
    cooldownUntil,
    score,
  } = playerState;

  const [imgFailed, setImgFailed] = useState(false);

  // Reset imgFailed when character changes
  useEffect(() => {
    setImgFailed(false);
  }, [assignedCharacter?.imageUrl]);

  // Cooldown countdown
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!cooldownUntil || Date.now() >= cooldownUntil) {
      setSecondsLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, remaining));
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const isInCooldown = secondsLeft > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
        gaveUp
          ? "border-orange-400 bg-orange-50"
          : guessedCorrectly
            ? "border-green-400 bg-green-50"
            : isOwn
              ? "border-purple-300 bg-purple-50"
              : "border-gray-200 bg-white"
      }`}
    >
      {/* Character image / placeholder */}
      <div className="relative aspect-[4/5] sm:aspect-[3/4] bg-gray-100 overflow-hidden">
        {isOwn && !gaveUp && !guessedCorrectly ? (
          // Hide own character
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-purple-200 to-purple-400">
            <div className="text-4xl sm:text-6xl md:text-7xl mb-1 sm:mb-2">
              ❓
            </div>
            <p className="font-display font-black text-white text-xs sm:text-sm text-center px-2">
              Jij weet het niet!
            </p>
          </div>
        ) : assignedCharacter?.imageUrl && !imgFailed ? (
          <img
            src={assignedCharacter.imageUrl}
            alt={assignedCharacter.name}
            className="w-full h-full object-cover object-top"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-200 to-gray-300">
            <span className="text-5xl mb-1">👤</span>
            {assignedCharacter?.name && (
              <p className="font-display font-bold text-gray-600 text-xs text-center px-2 mt-1">
                {assignedCharacter.name}
              </p>
            )}
          </div>
        )}

        {/* Guessed overlay */}
        {guessedCorrectly && !gaveUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-green-500/80 flex flex-col items-center justify-center"
          >
            <div className="text-4xl mb-1">✅</div>
            <p className="font-display font-black text-white text-lg">
              #{placement}
            </p>
            <p className="font-display font-bold text-white text-sm">
              {score} pts
            </p>
          </motion.div>
        )}

        {/* Gave up overlay */}
        {gaveUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-orange-500/80 flex flex-col items-center justify-center"
          >
            <div className="text-4xl mb-1">🏳️</div>
            <p className="font-display font-black text-white text-sm text-center px-2">
              Opgegeven
            </p>
          </motion.div>
        )}

        {/* Cooldown badge */}
        {isOwn && isInCooldown && (
          <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-display font-bold">
            ⏱ {secondsLeft}s
          </div>
        )}
      </div>

      {/* Player name + character name */}
      <div className="p-2 sm:p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-lg">{player?.avatarUrl ?? "👤"}</span>
          <span className="font-display font-bold text-sm text-gray-700 truncate">
            {player?.nickname ?? "Speler"}
          </span>
        </div>
        {!isOwn && assignedCharacter && (
          <p className="font-display font-black text-sm text-gray-900 truncate">
            {assignedCharacter.name}
          </p>
        )}
        {!isOwn && assignedCharacter?.category && (
          <p className="font-display text-xs text-gray-400 truncate">
            {assignedCharacter.category}
          </p>
        )}
        {isOwn && gaveUp && assignedCharacter && (
          <>
            <p className="font-display font-black text-sm text-orange-700 truncate">
              {assignedCharacter.name}
            </p>
            {assignedCharacter.category && (
              <p className="font-display text-xs text-orange-400 truncate">
                {assignedCharacter.category}
              </p>
            )}
          </>
        )}
        {isOwn && !gaveUp && !guessedCorrectly && (
          <p className="font-display text-xs text-purple-600 font-semibold">
            Stel vragen om te raden!
          </p>
        )}
      </div>
    </motion.div>
  );
}
