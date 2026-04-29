import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  RoundResult,
  ConnectionsGroup,
  PuzzelrondeGroup,
  OpenDeurQuestion,
} from "shared/types";

interface RoundEndOverlayProps {
  result: RoundResult;
  currentPlayerId?: string;
  isHost: boolean;
  isLastRound: boolean;
  isSpectating?: boolean;
  onNextRound: () => void;
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-800",
  2: "bg-green-100 text-green-800",
  3: "bg-blue-100 text-blue-800",
  4: "bg-purple-100 text-purple-800",
};

export default function RoundEndOverlay({
  result,
  currentPlayerId,
  isHost,
  isLastRound,
  isSpectating,
  onNextRound,
}: RoundEndOverlayProps) {
  const myResult = result.results.find((r) => r.playerId === currentPlayerId);
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display font-black text-3xl text-center mb-2">
          <span
            className="text-transparent bg-clip-text
                        bg-gradient-to-r from-brand-500 to-orange-500"
          >
            {isLastRound
              ? "Ronde Klaar!"
              : `Ronde ${result.roundIndex + 1} Klaar!`}
          </span>
          {isLastRound && " 🎉"}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          {result.roundType === "connections"
            ? "🔗 Connections"
            : result.roundType === "puzzelronde"
              ? "🧩 Puzzelronde"
              : result.roundType === "lingo"
                ? "🟩 Lingo"
                : "🚪 Open Deur"}
        </p>

        {/* Last round: show own score or spectator message */}
        {isLastRound ? (
          <div className="text-center py-6">
            {isSpectating ? (
              <p className="text-gray-400 font-display">
                👀 Je keek toe als toeschouwer
              </p>
            ) : (
              <>
                <p className="text-gray-500 font-display mb-2">
                  Jij hebt verdiend:
                </p>
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 10, delay: 0.2 }}
                  className="font-display font-black text-6xl text-brand-600 mb-1"
                >
                  +{myResult?.roundScore ?? 0}
                </motion.p>
                <p className="text-gray-400 font-display text-sm">
                  punten deze ronde
                </p>
                {myResult && (
                  <div className="flex justify-center gap-4 text-sm text-gray-500 mt-4">
                    {result.roundType === "opendeur" ? (
                      <span>
                        💡 {myResult.correctAnswers}{" "}
                        {myResult.correctAnswers === 1
                          ? "antwoord"
                          : "antwoorden"}
                      </span>
                    ) : result.roundType === "lingo" ? (
                      <>
                        <span>
                          🟩 {myResult.correctAnswers}{" "}
                          {myResult.correctAnswers === 1 ? "woord" : "woorden"}{" "}
                          geraden
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          🎯 {myResult.groupsFound}{" "}
                          {myResult.groupsFound === 1 ? "groep" : "groepen"}
                        </span>
                        {myResult.correctAnswers > 0 && (
                          <span>
                            💡 {myResult.correctAnswers}{" "}
                            {myResult.correctAnswers === 1
                              ? "woord"
                              : "woorden"}
                          </span>
                        )}
                      </>
                    )}
                    {myResult.wrongGuesses > 0 && (
                      <span>❌ {myResult.wrongGuesses} fout</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Normal rounds: show rankings */
          <div className="space-y-2 mb-6">
            {result.results.map((r, i) => {
              const isMe = r.playerId === currentPlayerId;
              return (
                <motion.div
                  key={r.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-xl
                  ${isMe ? "bg-brand-50 border-2 border-brand-200" : "bg-gray-50"}`}
                >
                  <span className="font-display font-black text-2xl text-gray-300 w-8">
                    {i === 0
                      ? "🥇"
                      : i === 1
                        ? "🥈"
                        : i === 2
                          ? "🥉"
                          : `${i + 1}.`}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg overflow-hidden">
                    {r.avatarUrl.length <= 2 ? (
                      <span>{r.avatarUrl}</span>
                    ) : (
                      <img
                        src={r.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-display font-bold text-gray-800">
                      {r.nickname}
                    </span>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      {result.roundType === "opendeur" ? (
                        <span>
                          💡 {r.correctAnswers}{" "}
                          {r.correctAnswers === 1 ? "antwoord" : "antwoorden"}
                        </span>
                      ) : (
                        <>
                          <span>
                            🎯 {r.groupsFound}{" "}
                            {r.groupsFound === 1 ? "groep" : "groepen"}
                          </span>
                          {r.correctAnswers > 0 && (
                            <span>
                              💡 {r.correctAnswers}{" "}
                              {r.correctAnswers === 1 ? "woord" : "woorden"}
                            </span>
                          )}
                        </>
                      )}
                      {r.wrongGuesses > 0 && (
                        <span>❌ {r.wrongGuesses} fout</span>
                      )}
                    </div>
                  </div>
                  <span className="font-display font-black text-xl text-brand-600">
                    +{r.roundScore}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Answers toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-display font-bold text-sm text-gray-600">
              📖 Antwoorden bekijken
            </span>
            <span className="text-gray-400 text-sm">
              {showAnswers ? "▲" : "▼"}
            </span>
          </button>
          <AnimatePresence>
            {showAnswers && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-2">
                  {result.correctGroups.map((group, i) => {
                    const isConnections = result.roundType === "connections";
                    const isOpenDeur = result.roundType === "opendeur";
                    const isLingo = result.roundType === "lingo";
                    const cGroup = group as ConnectionsGroup;
                    const pGroup = group as PuzzelrondeGroup;
                    const oGroup = group as OpenDeurQuestion;

                    if (isLingo) {
                      return (
                        <div key={i} className="p-3 rounded-xl bg-green-50">
                          <p className="font-display font-bold text-sm">
                            Woord {i + 1}: {group as string}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl ${
                          isConnections
                            ? DIFFICULTY_COLORS[cGroup.difficulty] ||
                              "bg-gray-100"
                            : isOpenDeur
                              ? "bg-amber-50"
                              : "bg-gray-100"
                        }`}
                      >
                        <p className="font-display font-bold text-sm mb-1">
                          {isConnections
                            ? cGroup.label
                            : isOpenDeur
                              ? oGroup.question
                              : `Verbindend woord: ${pGroup.answer}`}
                        </p>
                        <p className="text-xs opacity-75">
                          {isOpenDeur
                            ? oGroup.answers.join(" · ")
                            : (isConnections
                                ? cGroup.words
                                : pGroup.words
                              ).join(" · ")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Button */}
        {isHost && (
          <button onClick={onNextRound} className="btn-primary w-full">
            {isLastRound ? "🏆 Bekijk Eindstand" : "➡️ Volgende Ronde"}
          </button>
        )}

        {!isHost && (
          <p className="text-center text-gray-400 font-display">
            Wachten op de host...
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
