import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { getSession } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import { useSocketEvents } from "../hooks/useSocketEvents";
import type { RoundType } from "shared/types";
import ConnectionsGame from "../components/ConnectionsGame";
import PuzzelrondeGame from "../components/PuzzelrondeGame";
import OpenDeurGame from "../components/OpenDeurGame";
import LingoGame from "../components/LingoGame";
import WhatAmIGame from "../components/WhatAmIGame";
import DrawingGame from "../components/DrawingGame";
import SnelsteVingerGame from "../components/SnelsteVingerGame";
import MuziekGame from "../components/MuziekGame";
import TimerBar from "../components/TimerBar";
import ProgressSidebar from "../components/ProgressSidebar";
import { isMuted, toggleMute } from "../hooks/useSoundEffect";
import BriefingScreen from "../components/BriefingScreen";
import HelpModal from "../components/HelpModal";
import RoundEndOverlay from "../components/RoundEndOverlay";
import WaitingOverlay from "../components/WaitingOverlay";
import SpectatorDashboard from "../components/SpectatorDashboard";
import SkeletonLoader from "../components/SkeletonLoader";
import type {
  ConnectionsRoundState,
  PuzzelrondeRoundState,
  OpenDeurRoundState,
  LingoRoundState,
} from "shared/types";

const ROUND_META: Record<
  RoundType,
  { icon: string; label: string; bg: string; text: string }
> = {
  connections: {
    icon: "🔗",
    label: "Connections",
    bg: "from-blue-600 to-blue-800",
    text: "text-blue-100",
  },
  puzzelronde: {
    icon: "🧩",
    label: "Puzzelronde",
    bg: "from-purple-600 to-purple-800",
    text: "text-purple-100",
  },
  opendeur: {
    icon: "🚪",
    label: "Open Deur",
    bg: "from-amber-500 to-amber-700",
    text: "text-amber-100",
  },
  lingo: {
    icon: "🟩",
    label: "Lingo",
    bg: "from-green-600 to-green-800",
    text: "text-green-100",
  },
};

const ROUND_INTRO_DURATION = 2500;

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
  const [showRoundIntro, setShowRoundIntro] = useState(false);
  const [introRoundType, setIntroRoundType] = useState<RoundType | null>(null);
  const [introRoundNumber, setIntroRoundNumber] = useState(0);
  const [introTotalRounds, setIntroTotalRounds] = useState(0);
  const lastRoundIndexRef = useRef<number | null>(null);
  const [muted, setMuted] = useState(isMuted());
  const [showHelp, setShowHelp] = useState(false);

  // Show round intro when a new round starts
  useEffect(() => {
    if (
      state.phase === "playing" &&
      state.roundState &&
      state.room &&
      state.room.currentRoundIndex !== lastRoundIndexRef.current
    ) {
      lastRoundIndexRef.current = state.room.currentRoundIndex;
      setIntroRoundType(state.roundState.type);
      setIntroRoundNumber(state.room.currentRoundIndex + 1);
      setIntroTotalRounds(state.room.settings.rounds.length);
      setShowRoundIntro(true);

      const timer = setTimeout(
        () => setShowRoundIntro(false),
        ROUND_INTRO_DURATION,
      );
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.roundState, state.room?.currentRoundIndex]);

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
    (!state.roundState &&
      !state.whatAmIState &&
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
      <DrawingGame state={state.drawingState} playerId={state.player!.id} />
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

  const handleSubmitGroup = useCallback(
    (words: string[]) => {
      if (!socket) return;
      socket.emit("submit-group", { words });
    },
    [socket],
  );

  const handleSubmitAnswer = useCallback(
    (answer: string) => {
      if (!socket) return;
      socket.emit("submit-answer", { answer });
    },
    [socket],
  );

  const handleSubmitOpenDeurAnswer = useCallback(
    (answer: string) => {
      if (!socket) return;
      socket.emit("submit-opendeur-answer", { answer });
    },
    [socket],
  );

  const handleSkipQuestion = useCallback(() => {
    if (!socket) return;
    socket.emit("skip-question");
  }, [socket]);

  const handleSubmitLingoGuess = useCallback(
    (guess: string) => {
      if (!socket) return;
      socket.emit("submit-lingo-guess", { guess });
    },
    [socket],
  );

  const handleNextRound = useCallback(() => {
    if (!socket) return;
    socket.emit("next-round");
  }, [socket]);

  const handleBackToLobby = useCallback(() => {
    if (!socket) return;
    socket.emit("play-again");
  }, [socket]);

  // Show round intro splash (Kahoot-style)
  if (showRoundIntro && introRoundType) {
    const meta = ROUND_META[introRoundType];
    return (
      <div
        className={`h-screen flex items-center justify-center bg-gradient-to-b ${meta.bg}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 120 }}
          className="text-center"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-8xl sm:text-9xl mb-6"
          >
            {meta.icon}
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 12 }}
            className="font-display font-black text-5xl sm:text-7xl text-white mb-4"
          >
            {meta.label}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={`font-display font-bold text-xl sm:text-2xl ${meta.text}`}
          >
            Ronde {introRoundNumber} van {introTotalRounds}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Show round-end overlay even without roundState (e.g. after reconnect)
  if (state.phase === "round-end" && state.currentRoundResult && state.room) {
    const totalRoundsRE = state.room.settings.rounds.length;
    const isLastRoundRE = state.room.currentRoundIndex >= totalRoundsRE - 1;
    const isSpectatingRE =
      state.player?.isHost && !state.room.settings.hostPlays;

    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <RoundEndOverlay
          result={state.currentRoundResult}
          currentPlayerId={state.player?.id}
          isHost={state.player?.isHost ?? false}
          isLastRound={isLastRoundRE}
          isSpectating={isSpectatingRE}
          onNextRound={handleNextRound}
        />
      </div>
    );
  }

  if (!state.roundState || !state.room) {
    return <GameSkeletonWithBack variant="game" roomId={roomId} />;
  }

  const roundConfig = state.room.settings.rounds[state.room.currentRoundIndex];
  const totalRounds = state.room.settings.rounds.length;
  const currentRound = state.room.currentRoundIndex + 1;
  const totalGroups =
    state.roundState.type === "connections"
      ? 4
      : state.roundState.type === "puzzelronde"
        ? 4
        : state.roundState.type === "lingo"
          ? 3 // 3 words
          : 12; // opendeur: 3 questions × 4 answers
  const isLastRound = state.room.currentRoundIndex >= totalRounds - 1;
  const isSpectating = state.player?.isHost && !state.room.settings.hostPlays;

  // Check if the current player finished early (but round isn't over yet)
  const myProgress = state.playerProgress.find(
    (p) => p.playerId === state.player?.id,
  );
  const isPlayerFinished =
    !isSpectating && myProgress?.finished === true && state.phase === "playing";

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
                onClick={handleBackToLobby}
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
            <span
              className={`px-3 py-1 rounded-full text-sm font-display font-bold
              ${
                roundConfig?.type === "connections"
                  ? "bg-blue-100 text-blue-700"
                  : roundConfig?.type === "puzzelronde"
                    ? "bg-purple-100 text-purple-700"
                    : roundConfig?.type === "lingo"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
              }`}
            >
              {roundConfig?.type === "connections"
                ? "🔗 Connections"
                : roundConfig?.type === "puzzelronde"
                  ? "🧩 Puzzelronde"
                  : roundConfig?.type === "lingo"
                    ? "🟩 Lingo"
                    : "🚪 Open Deur"}
            </span>
            <span className="text-sm text-gray-400 font-display">
              Ronde {currentRound} van {totalRounds}
            </span>
            {isSpectating && (
              <span className="px-3 py-1 rounded-full text-sm font-display font-bold bg-orange-100 text-orange-700">
                👀 Toeschouwer
              </span>
            )}
          </div>
        </motion.div>

        <div className="flex gap-3 sm:gap-6 flex-1 min-h-0 items-center">
          {/* Main game area */}
          <div className="flex-1 flex flex-col justify-center relative">
            {/* Timer */}
            <TimerBar
              totalSeconds={state.room.settings.timeLimitSeconds ?? 120}
              timeRemainingMs={
                state.timeRemainingMs ?? state.roundState.timeRemainingMs
              }
            />

            {isSpectating ? (
              <SpectatorDashboard
                progress={state.playerProgress}
                players={state.room.players}
                socket={socket}
                totalGroups={totalGroups}
              />
            ) : (
              <>
                {/* Game component */}
                {state.roundState.type === "connections" ? (
                  <ConnectionsGame
                    roundState={state.roundState as ConnectionsRoundState}
                    onSubmitGroup={handleSubmitGroup}
                    maxAttempts={state.room.settings.maxAttempts}
                    hintWords={state.hintWords}
                  />
                ) : state.roundState.type === "puzzelronde" ? (
                  <PuzzelrondeGame
                    roundState={state.roundState as PuzzelrondeRoundState}
                    onSubmitAnswer={handleSubmitAnswer}
                    lastAnswerResult={state.lastAnswerResult}
                  />
                ) : state.roundState.type === "lingo" ? (
                  <LingoGame
                    roundState={state.roundState as LingoRoundState}
                    onSubmitGuess={handleSubmitLingoGuess}
                  />
                ) : (
                  <OpenDeurGame
                    roundState={state.roundState as OpenDeurRoundState}
                    onSubmitAnswer={handleSubmitOpenDeurAnswer}
                    onSkipQuestion={handleSkipQuestion}
                  />
                )}
              </>
            )}

            {/* Waiting overlay when player finishes early */}
            <AnimatePresence>
              {isPlayerFinished && (
                <WaitingOverlay
                  myScore={myProgress?.score ?? 0}
                  progress={state.playerProgress}
                  players={state.room.players}
                  currentPlayerId={state.player?.id}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <ProgressSidebar
              progress={state.playerProgress}
              players={state.room.players}
              currentPlayerId={state.player?.id}
              totalGroups={totalGroups}
            />
          </div>
        </div>

        {/* Mobile progress bar (bottom) */}
        <div className="md:hidden py-2 flex-shrink-0">
          <ProgressSidebar
            progress={state.playerProgress}
            players={state.room.players}
            currentPlayerId={state.player?.id}
            totalGroups={totalGroups}
          />
        </div>
      </div>

      {/* Round End Overlay */}
      {state.phase === "round-end" && state.currentRoundResult && (
        <RoundEndOverlay
          result={state.currentRoundResult}
          currentPlayerId={state.player?.id}
          isHost={state.player?.isHost ?? false}
          isLastRound={isLastRound}
          isSpectating={isSpectating}
          onNextRound={handleNextRound}
        />
      )}
      <HelpModal
        instructionKey={roundConfig?.type ?? "connections"}
        open={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
