import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { useSocketEvents } from "../hooks/useSocketEvents";
import AvatarPicker from "../components/AvatarPicker";
import { PREMADE_AVATARS } from "shared/types";

export default function Join() {
  useSocketEvents();

  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(
    PREMADE_AVATARS[Math.floor(Math.random() * PREMADE_AVATARS.length)],
  );
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [roomStatus, setRoomStatus] = useState<
    "checking" | "joinable" | "started" | "not-found"
  >("checking");

  // Check if room exists on mount
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleCheck = ({
      exists,
      joinable,
    }: {
      exists: boolean;
      joinable: boolean;
    }) => {
      if (!exists) setRoomStatus("not-found");
      else if (!joinable) setRoomStatus("started");
      else setRoomStatus("joinable");
    };

    socket.on("room-check", handleCheck);
    socket.emit("check-room", { roomId });

    // Also check on reconnect (socket may not be connected yet on first render)
    const handleConnect = () => socket.emit("check-room", { roomId });
    socket.on("connect", handleConnect);

    return () => {
      socket.off("room-check", handleCheck);
      socket.off("connect", handleConnect);
    };
  }, [socket, roomId]);

  const handleJoin = () => {
    if (!socket || !nickname.trim() || !roomId) return;
    setJoining(true);
    setError("");

    socket.emit("join-room", {
      roomId,
      nickname: nickname.trim(),
      avatarUrl: avatar,
    });

    // Listen for error
    socket.once("error", ({ message }) => {
      setError(message);
      setJoining(false);
    });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1
          className="font-display font-black text-4xl sm:text-5xl text-transparent bg-clip-text 
                        bg-gradient-to-r from-brand-500 via-orange-500 to-pink-500 mb-2"
        >
          Woord
        </h1>
        {roomStatus === "joinable" && (
          <p className="text-lg text-gray-600 font-display">
            Je bent uitgenodigd! 🎉
          </p>
        )}
      </motion.div>

      {/* Room doesn't exist */}
      {roomStatus === "not-found" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card w-full max-w-md text-center"
        >
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="font-display font-black text-2xl text-gray-800 mb-2">
            Lobby niet gevonden
          </h2>
          <p className="text-gray-500 font-display text-sm mb-6">
            Deze kamer bestaat niet of is al afgelopen. Controleer of je de
            juiste link hebt.
          </p>
          <button onClick={() => navigate("/")} className="btn-primary w-full">
            ← Terug naar home
          </button>
        </motion.div>
      )}

      {/* Game already started */}
      {roomStatus === "started" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card w-full max-w-md text-center"
        >
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="font-display font-black text-2xl text-gray-800 mb-2">
            Spel is al begonnen
          </h2>
          <p className="text-gray-500 font-display text-sm mb-6">
            Je kunt niet meer deelnemen aan dit spel. Wacht tot de host een
            nieuw spel start.
          </p>
          <button onClick={() => navigate("/")} className="btn-primary w-full">
            ← Terug naar home
          </button>
        </motion.div>
      )}

      {/* Still checking */}
      {roomStatus === "checking" && (
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎲</div>
          <p className="text-gray-600 font-display">Laden...</p>
        </div>
      )}

      {/* Room is joinable — show join form */}
      {roomStatus === "joinable" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card w-full max-w-md"
        >
          <div className="text-center mb-4">
            <span
              className="inline-block bg-brand-100 text-brand-700 font-display font-bold 
                           px-4 py-1.5 rounded-full text-sm"
            >
              Kamer: {roomId}
            </span>
          </div>

          <h2 className="font-display font-bold text-2xl text-gray-800 mb-6 text-center">
            Doe Mee!
          </h2>

          <div className="flex flex-col items-center gap-6">
            <AvatarPicker value={avatar} onChange={setAvatar} />

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Jouw naam
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Voer je naam in..."
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400 
                         focus:ring-2 focus:ring-brand-200 outline-none transition-all text-lg font-display"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm font-medium bg-red-50 px-4 py-2 rounded-xl w-full text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              onClick={handleJoin}
              disabled={!nickname.trim() || !socket || joining}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Deelnemen...
                </span>
              ) : (
                "🎮 Doe Mee!"
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
