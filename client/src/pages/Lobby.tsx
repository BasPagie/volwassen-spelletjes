import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { clearSession, getSession } from "../context/SocketContext";
import { useGame } from "../context/GameContext";
import { useSocketEvents } from "../hooks/useSocketEvents";
import PlayerList from "../components/PlayerList";
import GameSettingsPanel from "../components/GameSettingsPanel";
import type { GameSettings } from "shared/types";

export default function Lobby() {
  useSocketEvents();

  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const { state } = useGame();
  const [copied, setCopied] = useState(false);
  const isFirstVisit = !localStorage.getItem("woord-rules-seen");
  const [showInfo, setShowInfo] = useState(isFirstVisit);
  const [waitExpired, setWaitExpired] = useState(false);

  const session = getSession();
  const hasSessionForRoom = session?.roomId === roomId;

  // If we have a session, give a few seconds for reconnect to complete
  useEffect(() => {
    if (state.room || !hasSessionForRoom) return;
    const timer = setTimeout(() => setWaitExpired(true), 4000);
    return () => clearTimeout(timer);
  }, [state.room, hasSessionForRoom]);

  const inviteUrl = `${window.location.origin}/join/${roomId}`;
  const isPlayerHost = state.player?.isHost ?? false;

  // Navigate to game when game starts
  useEffect(() => {
    if ((state.phase === "playing" || state.phase === "countdown") && roomId) {
      navigate(`/game/${roomId}`);
    }
  }, [state.phase, roomId, navigate]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSettingsChange = (settings: GameSettings) => {
    if (!socket) return;
    socket.emit("update-settings", settings);
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit("start-game");
  };

  if (!state.room) {
    // No session at all → redirect to home immediately
    if (!hasSessionForRoom) {
      navigate("/");
      return null;
    }

    // Has session but reconnect hasn't completed yet — show geen toegang after timeout
    if (waitExpired) {
      return (
        <div className="h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="font-display font-black text-2xl text-gray-800 mb-2">
              Geen toegang
            </h2>
            <p className="text-gray-500 font-display text-sm mb-6">
              Je zit niet meer in deze kamer. Vraag de host om een nieuwe
              uitnodigingslink.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate(`/join/${roomId}`)}
                className="btn-primary w-full"
              >
                🔗 Opnieuw deelnemen
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 
                           text-gray-600 font-display font-bold text-sm transition-colors w-full"
              >
                ← Terug naar home
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎲</div>
          <p className="text-gray-600 font-display">Herverbinden...</p>
        </div>
      </div>
    );
  }

  const handleLeave = () => {
    if (socket) socket.emit("leave-room");
    clearSession();
    navigate("/");
  };

  return (
    <div className="h-screen overflow-y-auto py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Title row with back button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center relative mb-3"
        >
          <button
            onClick={handleLeave}
            className="absolute left-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg 
                       bg-gray-100 hover:bg-gray-200 text-gray-600 font-display font-bold text-xs transition-colors"
          >
            ← Terug
          </button>
          <h1
            className="font-display font-black text-3xl text-transparent bg-clip-text 
                        bg-gradient-to-r from-brand-500 to-orange-500"
          >
            Wachtkamer
          </h1>
          <button
            onClick={() => setShowInfo(true)}
            className="ml-3 px-3 py-1 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-600 
                       font-display font-bold text-xs transition-colors"
          >
            📖 Uitleg
          </button>
        </motion.div>

        {/* Room code + invite | spelers klaar + start button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4"
        >
          {/* Left: room code + invite link */}
          <div className="flex items-center gap-2">
            <span
              className="bg-brand-100 text-brand-700 font-display font-bold 
                         px-3 py-1.5 rounded-full text-xs shrink-0"
            >
              {roomId}
            </span>
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 min-w-0 sm:w-40 lg:w-56 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 
                         text-xs font-mono text-gray-500 truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-lg font-display font-bold text-xs transition-all shrink-0
                ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-brand-500 hover:bg-brand-600 text-white"
                }`}
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>

          {/* Right: spelers klaar + start button */}
          <div className="flex items-center gap-3 justify-end">
            {isPlayerHost ? (
              <>
                <span className="text-sm text-gray-400 font-display whitespace-nowrap hidden sm:inline">
                  {state.room.players.length === 1
                    ? "Wacht op spelers..."
                    : `${state.room.players.length} spelers klaar!`}
                </span>
                <button
                  onClick={handleStartGame}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-10 py-2.5 sm:py-3 whitespace-nowrap w-full sm:w-auto"
                >
                  🚀 Start Spel!
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-500 font-display whitespace-nowrap">
                ⏳ Wachten op host...
              </span>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Players */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h3 className="font-display font-bold text-lg text-gray-700 mb-4">
              Spelers ({state.room.players.length})
            </h3>
            <PlayerList
              players={state.room.players}
              currentPlayerId={state.player?.id}
              isHost={isPlayerHost}
              hostPlays={state.room.settings.hostPlays}
              onUpdateScore={(playerId, score) => {
                if (!socket) return;
                socket.emit("update-score", { playerId, score });
              }}
              onKickPlayer={(playerId) => {
                if (!socket) return;
                socket.emit("kick-player", { playerId });
              }}
            />
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <GameSettingsPanel
              settings={state.room.settings}
              onChange={handleSettingsChange}
              isHost={isPlayerHost}
            />
          </motion.div>
        </div>

        {/* Dev Tools Panel */}
        {state.devMode && isPlayerHost && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 card border-2 border-dashed border-orange-300 bg-orange-50"
          >
            <h3 className="font-display font-bold text-sm text-orange-700 mb-3">
              🛠️ Dev Tools
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => socket?.emit("dev-add-bot")}
                className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-display font-bold text-xs transition-colors"
              >
                + Bot toevoegen
              </button>
              {state.room.players
                .filter((p) => p.isBot)
                .map((bot) => (
                  <span
                    key={bot.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-display"
                  >
                    {bot.avatarUrl} {bot.nickname}
                    <button
                      onClick={() =>
                        socket?.emit("dev-remove-bot", {
                          playerId: bot.id,
                        })
                      }
                      className="ml-1 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={() => {
              setShowInfo(false);
              localStorage.setItem("woord-rules-seen", "1");
            }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-md md:max-w-lg w-full max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display font-black text-xl text-gray-800 mb-4 text-center">
                📖 Hoe werkt het?
              </h2>

              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <GameModeCard
                  icon="🔗"
                  name="Connections"
                  color="blue"
                  short="16 woorden, 4 groepen. Ken je van de NYT."
                  details={[
                    "Verdeel 16 woorden in 4 groepen van 4",
                    "Tik 4 woorden aan en bevestig je keuze",
                    "🎯 +100 punten per goede groep",
                    "❌ -25 punten bij een foute gok",
                    "💡 Bijna goed? Juiste woorden kleuren geel als hint",
                  ]}
                />

                <GameModeCard
                  icon="🧩"
                  name="Puzzelronde"
                  color="purple"
                  short="16 woorden, raad het verbindende woord."
                  details={[
                    "Je ziet 16 woorden die in 4 groepen van 4 horen",
                    "Elk groepje deelt een verbindend woord",
                    "Typ het verbindende woord in om de groep op te lossen",
                    "🎯 +150 punten per goed antwoord",
                    "✅ Geen straf voor fout, typfoutjes worden geaccepteerd",
                  ]}
                />

                <GameModeCard
                  icon="🚪"
                  name="Open Deur"
                  color="amber"
                  short="3 vragen, typ zoveel goede antwoorden als je kan."
                  details={[
                    "3 vragen met elk 4 juiste antwoorden",
                    "Je ziet de eerste letter van elk antwoord als hint",
                    "🎯 +50 punten per goed antwoord",
                    "✅ Geen straf voor fout, gewoon proberen!",
                    "➡️ Vastzit? Ga naar de volgende vraag",
                  ]}
                />

                <GameModeCard
                  icon="🟩"
                  name="Lingo"
                  color="green"
                  short="Raad het 5-letter woord in zo min mogelijk beurten."
                  details={[
                    "Je krijgt de eerste letter als hint, 5 pogingen per woord",
                    "🟩 Groen = juiste letter, juiste plek",
                    "🟨 Geel = letter zit in het woord, verkeerde plek",
                    "⬜ Grijs = letter zit niet in het woord",
                    "🎯 +100 punten per woord + 20 bonus per overgebleven poging",
                    "🔢 3 woorden per ronde",
                  ]}
                />

                <div className="border-t border-gray-100 pt-3">
                  <p className="font-display font-bold text-gray-700 mb-1.5">
                    💡 Goed om te weten
                  </p>
                  <ul className="space-y-1 text-gray-500">
                    <li>• Iedereen speelt tegelijk, dus snelheid telt</li>
                    <li>• Eerder klaar = bonuspunten</li>
                    <li>• Typfoutjes worden door de vingers gezien</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowInfo(false);
                  localStorage.setItem("woord-rules-seen", "1");
                }}
                className="btn-primary w-full mt-4"
              >
                Begrepen! 👍
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Expandable game mode card for the info modal ──────
const BG_COLORS: Record<string, string> = {
  blue: "bg-blue-50",
  purple: "bg-purple-50",
  amber: "bg-amber-50",
  green: "bg-green-50",
};
const TEXT_COLORS: Record<string, string> = {
  blue: "text-blue-700",
  purple: "text-purple-700",
  amber: "text-amber-700",
  green: "text-green-700",
};

function GameModeCard({
  icon,
  name,
  color,
  short,
  details,
}: {
  icon: string;
  name: string;
  color: string;
  short: string;
  details: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left rounded-xl p-3 transition-all ${BG_COLORS[color]} hover:brightness-95 active:scale-[0.99]`}
    >
      <div className="flex gap-3 items-start">
        <span className="text-lg shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`font-display font-bold ${TEXT_COLORS[color]}`}>
              {name}
            </span>
            <span
              className={`flex items-center gap-1 text-xs font-display font-bold ${TEXT_COLORS[color]} opacity-60`}
            >
              {expanded ? "Minder" : "Meer info"}
              <svg
                className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </div>
          <p className="text-gray-600 mt-0.5">{short}</p>
          <AnimatePresence>
            {expanded && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 space-y-1 overflow-hidden text-gray-500"
              >
                {details.map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-gray-300 select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
}
