import { useState } from "react";
import { motion } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { useSocketEvents } from "../hooks/useSocketEvents";
import AvatarPicker from "../components/AvatarPicker";
import { PREMADE_AVATARS } from "shared/types";

export default function Landing() {
  useSocketEvents();

  const socket = useSocket();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(
    () => PREMADE_AVATARS[Math.floor(Math.random() * PREMADE_AVATARS.length)],
  );
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (!socket || !nickname.trim()) return;
    setCreating(true);
    socket.emit("create-room", {
      nickname: nickname.trim(),
      avatarUrl: avatar,
    });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 sm:mb-10"
      >
        <h1
          className="font-display font-black text-4xl sm:text-6xl md:text-7xl text-transparent bg-clip-text 
                        bg-gradient-to-r from-brand-500 via-orange-500 to-pink-500 mb-3"
        >
          Woord
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 font-display">
          Connections, Lingo, Puzzelronde en meer. Met vrienden! 🎮
        </p>
      </motion.div>

      {/* Create Game Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="card w-full max-w-md"
      >
        <h2 className="font-display font-bold text-2xl text-gray-800 mb-6 text-center">
          Start Nieuw Spel
        </h2>

        <div className="flex flex-col items-center gap-6">
          {/* Avatar */}
          <AvatarPicker value={avatar} onChange={setAvatar} />

          {/* Nickname */}
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
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={!nickname.trim() || !socket || creating}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {creating ? (
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
                Maken...
              </span>
            ) : (
              "🎲 Start Nieuw Spel"
            )}
          </button>
        </div>
      </motion.div>

      {/* Footer info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-sm text-gray-400 text-center"
      >
        Maak een spel aan en deel de link met vrienden!
      </motion.p>
    </div>
  );
}
