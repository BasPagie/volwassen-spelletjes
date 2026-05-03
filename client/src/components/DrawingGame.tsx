import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  DrawingClientState,
  DrawingStroke,
  DrawingWordChoice,
} from "shared/types";
import { PREMADE_AVATARS } from "shared/types";
import { useSocket } from "../context/SocketContext";
import DrawingCanvas from "./DrawingCanvas";
import TimerBar from "./TimerBar";
import { playSound } from "../hooks/useSoundEffect";

interface Props {
  state: DrawingClientState;
  playerId: string;
}

export default function DrawingGame({ state, playerId }: Props) {
  const socket = useSocket();
  const [guessInput, setGuessInput] = useState("");
  const [messages, setMessages] = useState<
    {
      id: number;
      text: string;
      type: "correct" | "wrong" | "close" | "system";
    }[]
  >([]);
  const [wordChoices, setWordChoices] = useState<DrawingWordChoice[]>(
    state.wordChoices ?? [],
  );
  const [incomingStroke, setIncomingStroke] = useState<DrawingStroke | null>(
    null,
  );
  const [incomingFill, setIncomingFill] = useState<{
    color: string;
    x: number;
    y: number;
  } | null>(null);
  const [clearSignal, setClearSignal] = useState(0);
  const msgId = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync word choices from state update (in case socket event was missed)
  useEffect(() => {
    if (state.wordChoices && state.wordChoices.length > 0) {
      setWordChoices(state.wordChoices);
    }
  }, [state.wordChoices]);

  const isDrawer = playerId === state.drawerId;
  const hasGuessedCorrectly = state.correctGuessers.includes(playerId);

  // Listen for drawing-specific socket events
  useEffect(() => {
    if (!socket) return;

    const handleWordChoices = ({
      choices,
    }: {
      choices: DrawingWordChoice[];
    }) => {
      setWordChoices(choices);
    };

    const handleStroke = ({ stroke }: { stroke: DrawingStroke }) => {
      setIncomingStroke(stroke);
    };

    const handleClearCanvas = () => {
      setClearSignal((s) => s + 1);
    };

    const handlePlayerGuessed = ({
      playerName,
      position,
    }: {
      playerId: string;
      playerName: string;
      position: number;
      score: number;
    }) => {
      msgId.current++;
      setMessages((prev) => [
        ...prev.slice(-20),
        {
          id: msgId.current,
          text: `🎉 ${playerName} raadde het! (#${position})`,
          type: "correct",
        },
      ]);
      playSound("correct");
    };

    const handleGuessResult = ({ correct }: { correct: boolean }) => {
      if (correct) {
        playSound("correct");
      }
    };

    const handleGuessBroadcast = ({
      playerName,
      guess,
      isClose,
    }: {
      playerName: string;
      guess: string;
      isClose: boolean;
    }) => {
      msgId.current++;
      const newMessages: typeof messages = [
        {
          id: msgId.current,
          text: `${playerName}: ${guess}`,
          type: "wrong",
        },
      ];
      if (isClose) {
        msgId.current++;
        newMessages.push({
          id: msgId.current,
          text: `"${guess}" is heel dichtbij!`,
          type: "close",
        });
      }
      setMessages((prev) => [...prev.slice(-20), ...newMessages]);
    };

    const handleTurnEnd = ({ word }: { word: string }) => {
      msgId.current++;
      setMessages((prev) => [
        ...prev.slice(-20),
        {
          id: msgId.current,
          text: `Het woord was: ${word}`,
          type: "system",
        },
      ]);
      setWordChoices([]);
    };

    const handleFill = ({
      color,
      x,
      y,
    }: {
      color: string;
      x: number;
      y: number;
    }) => {
      setIncomingFill({ color, x, y });
    };

    socket.on("drawing:word-choices", handleWordChoices);
    socket.on("drawing:stroke", handleStroke);
    socket.on("drawing:fill", handleFill);
    socket.on("drawing:clear-canvas", handleClearCanvas);
    socket.on("drawing:player-guessed", handlePlayerGuessed);
    socket.on("drawing:guess-result", handleGuessResult);
    socket.on("drawing:guess-broadcast", handleGuessBroadcast);
    socket.on("drawing:turn-end", handleTurnEnd);

    return () => {
      socket.off("drawing:word-choices", handleWordChoices);
      socket.off("drawing:stroke", handleStroke);
      socket.off("drawing:fill", handleFill);
      socket.off("drawing:clear-canvas", handleClearCanvas);
      socket.off("drawing:player-guessed", handlePlayerGuessed);
      socket.off("drawing:guess-result", handleGuessResult);
      socket.off("drawing:guess-broadcast", handleGuessBroadcast);
      socket.off("drawing:turn-end", handleTurnEnd);
    };
  }, [socket]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear canvas & messages on new turn
  useEffect(() => {
    if (state.phase === "picking") {
      setClearSignal((s) => s + 1);
    }
  }, [state.phase, state.drawerId]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || !socket || isDrawer || hasGuessedCorrectly)
      return;
    socket.emit("drawing:guess", { guess: guessInput.trim() });
    setGuessInput("");
  };

  const handlePickWord = (word: string) => {
    if (!socket) return;
    socket.emit("drawing:pick-word", { word });
    setWordChoices([]);
  };

  const handleStroke = (stroke: DrawingStroke) => {
    socket?.emit("drawing:stroke", { stroke });
  };

  const handleFill = (color: string, x: number, y: number) => {
    socket?.emit("drawing:fill", { color, x, y });
  };

  const handleClear = () => {
    socket?.emit("drawing:clear-canvas");
  };

  const handleUndo = () => {
    socket?.emit("drawing:undo");
  };

  // ─── Picking Phase ───────────────────────────────────
  if (state.phase === "picking") {
    return (
      <div className="h-screen flex flex-col overflow-hidden px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="text-center mb-3 shrink-0">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1">
              <span className="px-3 py-1 rounded-full text-sm font-display font-bold bg-teal-100 text-teal-700">
                ✏️ Tekenwedstrijd
              </span>
              <span className="text-sm text-gray-400 font-display">
                Ronde {state.currentRound}/{state.totalRounds} • Beurt{" "}
                {state.turnInRound}/{state.totalTurnsInRound}
              </span>
            </div>
            {isDrawer ? (
              <h2 className="text-gray-800 font-display font-black text-lg">
                Kies een woord om te tekenen
              </h2>
            ) : (
              <h2 className="text-gray-800 font-display font-black text-lg">
                🎨 {state.drawerName} kiest een woord...
              </h2>
            )}
          </div>

          {/* Main area + sidebar */}
          <div className="flex gap-4 flex-1 min-h-0 items-center">
            {/* Main content */}
            <div className="flex-1 flex items-center justify-center">
              {isDrawer && wordChoices.length > 0 ? (
                <div className="w-full max-w-[800px] rounded-2xl border border-gray-200 bg-white/25 p-8 flex flex-col items-center gap-3">
                  {wordChoices.map((choice, i) => (
                    <motion.button
                      key={choice.word}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handlePickWord(choice.word)}
                      className="w-full max-w-xs px-4 py-3 rounded-xl bg-white border border-gray-200
                        text-gray-800 font-display font-bold text-base text-center 
                        hover:bg-teal-50 hover:border-teal-300 transition-all"
                    >
                      {choice.word}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="w-full max-w-[800px] p-12 flex flex-col items-center justify-center">
                  <p className="text-gray-500 font-display font-bold text-sm mb-3">
                    🎨 {state.drawerName} kiest een woord...
                  </p>
                  <div className="text-5xl animate-bounce mb-3">✏️</div>
                  <p className="text-gray-400 font-display text-sm">
                    Even geduld...
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar: scores */}
            <div className="hidden md:block w-56 flex-shrink-0">
              <ScoreSidebar
                scores={state.scores}
                playerId={playerId}
                drawerId={state.drawerId}
              />
            </div>
          </div>

          {/* Mobile scores (bottom) */}
          <div className="md:hidden shrink-0 pt-2">
            <ScoreBar scores={state.scores} playerId={playerId} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Drawing / Reveal Phase ──────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden px-2 sm:px-4 py-2 sm:py-3">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="text-center mb-2 shrink-0">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1">
            <span className="px-3 py-1 rounded-full text-sm font-display font-bold bg-teal-100 text-teal-700">
              ✏️ Tekenwedstrijd
            </span>
            <span className="text-sm text-gray-400 font-display">
              Ronde {state.currentRound}/{state.totalRounds} • Beurt{" "}
              {state.turnInRound}/{state.totalTurnsInRound}
            </span>
          </div>
          <div>
            {isDrawer ? (
              <p className="text-gray-800 font-display font-black text-lg">
                Teken: <span className="text-teal-600">{state.word}</span>
              </p>
            ) : state.phase === "reveal" ? (
              <p className="text-gray-800 font-display font-black text-lg">
                Het was:{" "}
                <span className="text-teal-600">{state.revealWord}</span>
              </p>
            ) : hasGuessedCorrectly ? (
              <p className="text-green-600 font-display font-bold text-lg">
                ✓ Goed geraden!
              </p>
            ) : (
              <p className="text-gray-800 font-display font-black text-lg tracking-widest">
                {state.hint}
              </p>
            )}
            {!isDrawer && (
              <p className="text-gray-400 font-display text-xs mt-0.5">
                🎨 {state.drawerName} tekent
              </p>
            )}
          </div>
        </div>

        {/* Timer */}
        {state.phase === "drawing" && (
          <div className="shrink-0 mb-2">
            <TimerBar
              timeRemainingMs={state.timeRemainingMs}
              totalSeconds={state.totalTimeMs / 1000}
            />
          </div>
        )}

        {/* Main area + sidebar */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Canvas + input */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col items-center min-h-0">
              <DrawingCanvas
                isDrawer={isDrawer && state.phase === "drawing"}
                onStroke={handleStroke}
                onFill={handleFill}
                onClear={handleClear}
                onUndo={handleUndo}
                incomingStroke={incomingStroke}
                incomingFill={incomingFill}
                clearSignal={clearSignal}
              />
              {/* Guess input — always directly below canvas */}
              {!isDrawer &&
                !hasGuessedCorrectly &&
                state.phase === "drawing" && (
                  <form
                    onSubmit={handleGuessSubmit}
                    className="flex gap-2 mt-2 shrink-0 w-full max-w-[800px]"
                  >
                    <input
                      type="text"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder="Typ je antwoord..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 
                      text-gray-800 placeholder-gray-400 font-display text-sm
                      focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-teal-500 text-white font-display font-bold text-sm
                      hover:bg-teal-600 transition-colors"
                    >
                      Raad
                    </button>
                  </form>
                )}
            </div>
          </div>

          {/* Sidebar: scores + messages */}
          <div className="hidden md:flex md:flex-col w-56 flex-shrink-0 gap-3 min-h-0">
            {/* Scores */}
            <ScoreSidebar
              scores={state.scores}
              playerId={playerId}
              drawerId={state.drawerId}
            />

            {/* Messages */}
            <div className="max-h-40 overflow-y-auto bg-white/60 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg text-xs space-y-0.5">
              <p className="font-display font-bold text-xs text-gray-400 uppercase tracking-wide mb-1">
                Chat
              </p>
              {messages.length === 0 && (
                <p className="text-gray-300 font-display italic text-xs">
                  Gokken verschijnen hier...
                </p>
              )}
              {messages.slice(-15).map((msg) => (
                <div
                  key={msg.id}
                  className={`font-display ${
                    msg.type === "correct"
                      ? "text-green-600 font-bold"
                      : msg.type === "system"
                        ? "text-teal-600 font-semibold"
                        : msg.type === "close"
                          ? "text-amber-500 font-semibold"
                          : "text-gray-500"
                  }`}
                >
                  {msg.text}
                  {msg.type === "close" && " 🔥"}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Mobile: messages + scores (bottom) */}
        <div className="md:hidden shrink-0 pt-2 space-y-2">
          <div className="h-14 overflow-y-auto bg-gray-50 rounded-xl border border-gray-100 px-3 py-2 text-xs space-y-0.5">
            {messages.slice(-5).map((msg) => (
              <div
                key={msg.id}
                className={`font-display ${
                  msg.type === "correct"
                    ? "text-green-600 font-bold"
                    : msg.type === "system"
                      ? "text-teal-600"
                      : msg.type === "close"
                        ? "text-amber-500 font-semibold"
                        : "text-gray-500"
                }`}
              >
                {msg.text}
                {msg.type === "close" && " 🔥"}
              </div>
            ))}
          </div>
          <ScoreBar scores={state.scores} playerId={playerId} />
        </div>
      </div>
    </div>
  );
}

// ─── Score Sidebar (vertical, for desktop) ─────────────
function ScoreSidebar({
  scores,
  playerId,
  drawerId,
}: {
  scores: DrawingClientState["scores"];
  playerId: string;
  drawerId: string;
}) {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
      <h4 className="font-display font-bold text-sm text-gray-500 mb-3 uppercase tracking-wide">
        Spelers
      </h4>
      <div className="space-y-1.5">
        {scores.map((s) => {
          const isEmoji =
            PREMADE_AVATARS.includes(s.avatarUrl) || s.avatarUrl.length <= 2;
          const isMe = s.playerId === playerId;
          const isCurrentDrawer = s.playerId === drawerId;
          return (
            <div
              key={s.playerId}
              className={`flex items-center gap-2 p-2 rounded-xl transition-all text-sm
                ${isMe ? "bg-teal-50" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                {isEmoji ? (
                  <span>{s.avatarUrl}</span>
                ) : (
                  <img
                    src={s.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-gray-700 text-xs truncate">
                    {s.nickname}
                    {isCurrentDrawer && <span className="ml-1">🎨</span>}
                  </span>
                  <span className="font-display font-bold text-teal-600 text-xs ml-1">
                    {s.score}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Score Bar (horizontal, for mobile) ────────────────
function ScoreBar({
  scores,
  playerId,
}: {
  scores: DrawingClientState["scores"];
  playerId: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
      {scores.slice(0, 6).map((s) => {
        const isEmoji =
          PREMADE_AVATARS.includes(s.avatarUrl) || s.avatarUrl.length <= 2;
        return (
          <div
            key={s.playerId}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-display shrink-0 ${
              s.playerId === playerId
                ? "bg-teal-50 border border-teal-200"
                : "bg-gray-50 border border-gray-100"
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
              {isEmoji ? (
                <span>{s.avatarUrl}</span>
              ) : (
                <img
                  src={s.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <span className="text-gray-700 font-bold truncate max-w-[60px]">
              {s.nickname}
            </span>
            <span className="text-teal-600 font-bold">{s.score}</span>
          </div>
        );
      })}
    </div>
  );
}
