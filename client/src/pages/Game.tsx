import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { getSession } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import { useSocketEvents } from "../hooks/useSocketEvents";
import WhatAmIGame from "../components/WhatAmIGame";
import DrawingGame from "../components/DrawingGame";
import SnelsteVingerGame from "../components/SnelsteVingerGame";
import MuziekGame from "../components/MuziekGame";
import { isMuted, toggleMute } from "../hooks/useSoundEffect";
import BriefingScreen from "../components/BriefingScreen";
import HelpModal from "../components/HelpModal";
import SkeletonLoader from "../components/SkeletonLoader";

function GameSkeletonWithBack({
  variant,
  roomId,
}: {
  variant: "game" | "whatami";
  roomId?: string;
}) {
  const [showBack, setShowBack] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShowBack(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-screen">
      <SkeletonLoader variant={variant} />
      {showBack && roomId && (
        <div className="absolute left-0 top-0 px-2 sm:px-4 py-2 sm:py-3">
          <button
            onClick={() => navigate(`/lobby/${roomId}`)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg
                       bg-gray-100 hover:bg-gray-200 text-gray-600 font-display font-bold text-xs transition-colors"
          >
            ← Lobby
          </button>
        </div>
      )}
    </div>
  );
}

export default function Game() {
  useSocketEvents();

  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const { state, dispatch } = useGame();
  const [muted, setMuted] = useState(isMuted());
  const [showHelp, setShowHelp] = useState(false);

  // Navigate to results when game ends
  useEffect(() => {
    if (state.phase === "finished" && roomId) {
      navigate(`/results/${roomId}`);
    }
  }, [state.phase, roomId, navigate]);

  // Redirect to home if no session for this room
  useEffect(() => {
    const session = getSession();
    if (!state.room && !session?.roomId) {
      navigate("/");
    }
  }, [state.room, navigate]);

  // ─── Callbacks (must be before conditional returns) ──
  const handleBackToLobby = useCallback(() => {
    if (!socket) return;
    socket.emit("play-again");
  }, [socket]);

  // ─── Briefing (pre-round instructions for new players) ──
  if (state.phase === "briefing" && state.briefing) {
    return (
      <BriefingScreen
        briefingKey={state.briefing.briefingKey}
        roundType={state.briefing.roundType}
        gameCategory={state.briefing.gameCategory}
        readyCount={state.briefing.readyCount}
        totalCount={state.briefing.totalCount}
        onReady={() => socket?.emit("player-ready")}
      />
    );
  }

  // ─── Countdown (shared by all game types) ───────────
  if (
    state.phase === "countdown" ||
    (!state.whatAmIState &&
      !state.snelsteVingerState &&
      !state.drawingState &&
      state.countdown !== null)
  ) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          {state.countdown !== null && state.countdown > 0 ? (
            <motion.div
              key={state.countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="text-9xl font-display font-black text-white"
            >
              {state.countdown}
            </motion.div>
          ) : state.countdown === 0 ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="font-display font-black text-6xl text-transparent bg-clip-text 
                          bg-gradient-to-r from-yellow-400 to-orange-500"
            >
              GO!
            </motion.div>
          ) : (
            <div className="text-6xl animate-bounce">🎮</div>
          )}
        </motion.div>
      </div>
    );
  }

  // ─── Wie Ben Ik? branch ─────────────────────────────
  if (state.room?.gameCategory === "what-am-i") {
    if (!state.whatAmIState) {
      return <GameSkeletonWithBack variant="whatami" roomId={roomId} />;
    }
    return (
      <WhatAmIGame
        gameState={state.whatAmIState}
        currentPlayerId={state.player?.id ?? ""}
        currentPlayerIsHost={state.player?.isHost ?? false}
        hostPlays={state.room.whatAmISettings?.hostPlays ?? true}
        players={state.room.players}
        onGuess={(guess) => socket?.emit("whatami:guess", { guess })}
        onSkipTurn={() => socket?.emit("whatami:skip-turn")}
        onGiveUp={() => socket?.emit("whatami:give-up")}
        onPlayAgain={() => socket?.emit("play-again")}
        onGoToResults={() => dispatch({ type: "WHATAMI_GO_TO_RESULTS" })}
      />
    );
  }

  // ─── Drawing branch ──────────────────────────────────
  if (state.room?.gameCategory === "drawing") {
    if (!state.drawingState) {
      return <GameSkeletonWithBack variant="game" roomId={roomId} />;
    }
    return (
      <DrawingGame
        state={state.drawingState}
        playerId={state.player!.id}
        isHost={state.player!.isHost}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  // ─── Snelste Vinger branch ────────────────────────────
  if (state.room?.gameCategory === "snelste-vinger") {
    if (!state.snelsteVingerState) {
      return <GameSkeletonWithBack variant="game" roomId={roomId} />;
    }

    const svState = state.snelsteVingerState;
    const isSpectator = !!(
      state.player?.isHost && !state.room?.snelsteVingerSettings?.hostPlays
    );
    const handleBackToLobbySV = () => socket?.emit("play-again");

    return (
      <div className="h-screen flex flex-col overflow-hidden px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-3 relative"
          >
            <div className="absolute left-0 top-0 flex items-center gap-1">
              {state.player?.isHost && (
                <button
                  onClick={handleBackToLobbySV}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg
                             bg-gray-100 hover:bg-gray-200 text-gray-600 font-display font-bold text-xs transition-colors"
                >
                  ← Lobby
                </button>
              )}
            </div>
            <div className="absolute right-0 top-0 flex items-center gap-1">
              <button
                onClick={() => setShowHelp(true)}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-display font-bold text-xs transition-colors"
                title="Speluitleg"
              >
                ❓
              </button>
              <button
                onClick={() => setMuted(toggleMute())}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-display font-bold text-xs transition-colors"
                title={muted ? "Geluid aan" : "Geluid uit"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-sm font-display font-bold bg-red-100 text-red-700">
                🏃 Snelste Vinger
              </span>
              <span className="text-sm text-gray-400 font-display">
                Vraag {svState.questionIndex + 1} van {svState.totalQuestions}
              </span>
              {svState.category && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-red-50 text-red-600 border border-red-200">
                  {svState.category}
                </span>
              )}
            </div>
          </motion.div>

          <SnelsteVingerGame state={svState} isSpectator={isSpectator} />
        </div>
        <HelpModal
          instructionKey="snelste-vinger"
          open={showHelp}
          onClose={() => setShowHelp(false)}
        />
      </div>
    );
  }

  // ─── Muziek branch ────────────────────────────────────
  if (state.room?.gameCategory === "muziek") {
    if (!state.muziekState) {
      return <GameSkeletonWithBack variant="game" roomId={roomId} />;
    }

    const mState = state.muziekState;
    const isSpectator = !!(
      state.player?.isHost && state.room?.muziekSettings?.hostPlays === false
    );
    const handleBackToLobbyM = () => socket?.emit("play-again");

    return (
      <div className="h-screen flex flex-col overflow-hidden px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-3 relative"
          >
            <div className="absolute left-0 top-0 flex items-center gap-1">
              {state.player?.isHost && (
                <button
                  onClick={handleBackToLobbyM}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg
                             bg-gray-100 hover:bg-gray-200 text-gray-600 font-display font-bold text-xs transition-colors"
                >
                  ← Lobby
                </button>
              )}
            </div>
            <div className="absolute right-0 top-0 flex items-center gap-1">
              <button
                onClick={() => setShowHelp(true)}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-display font-bold text-xs transition-colors"
                title="Speluitleg"
              >
                ❓
              </button>
              <button
                onClick={() => setMuted(toggleMute())}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-display font-bold text-xs transition-colors"
                title={muted ? "Geluid aan" : "Geluid uit"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-sm font-display font-bold bg-purple-100 text-purple-700">
                🎵 Raad het Nummer
              </span>
              <span className="text-sm text-gray-400 font-display">
                Nummer {mState.songIndex + 1} van {mState.totalSongs}
              </span>
            </div>
          </motion.div>

          <MuziekGame state={mState} isSpectator={isSpectator} />
        </div>
        <HelpModal
          instructionKey="muziek"
          open={showHelp}
          onClose={() => setShowHelp(false)}
        />
      </div>
    );
  }

  // Fallback: no matching game state
  return <GameSkeletonWithBack variant="game" roomId={roomId} />;
}
