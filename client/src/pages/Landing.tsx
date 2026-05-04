import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { useSocketEvents } from "../hooks/useSocketEvents";
import AvatarPicker from "../components/AvatarPicker";
import { PREMADE_AVATARS } from "shared/types";
import type { GameCategory } from "shared/types";
import { getCategoryTheme } from "../lib/categoryThemes";

const GAME_CATEGORIES: {
  id: GameCategory;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  available: boolean;
}[] = [
  {
    id: "woord",
    icon: "🧠",
    title: "Woordspellen",
    subtitle: "Connections, Lingo, Puzzelronde & meer",
    color: "text-brand-700",
    bg: "bg-brand-50 border-brand-300 hover:bg-brand-100",
    available: true,
  },
  {
    id: "what-am-i",
    icon: "🎭",
    title: "Wie Ben Ik?",
    subtitle: "Raad je eigen karakter met ja/nee vragen",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-300 hover:bg-purple-100",
    available: true,
  },
  {
    id: "snelste-vinger",
    icon: "🏃",
    title: "Snelste Vinger",
    subtitle: "Buzz als eerste het juiste antwoord!",
    color: "text-red-700",
    bg: "bg-red-50 border-red-300 hover:bg-red-100",
    available: true,
  },
  {
    id: "drawing",
    icon: "✏️",
    title: "Tekenwedstrijd",
    subtitle: "Teken & raad, wie raadt het snelst?",
    color: "text-teal-500",
    bg: "bg-teal-50 border-teal-300 hover:bg-teal-100",
    available: true,
  },
];

export default function Landing() {
  useSocketEvents();

  const socket = useSocket();
  const navigate = useNavigate();
  const [step, setStep] = useState<"pick" | "create">("pick");
  const [joinCode, setJoinCode] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | null>(
    null,
  );
  const [nickname, setNickname] = useState(
    () => localStorage.getItem("player-nickname") ?? "",
  );
  const [avatar, setAvatar] = useState(() => {
    const savedAvatar = localStorage.getItem("player-avatar");
    if (savedAvatar) return savedAvatar;
    try {
      const saved = localStorage.getItem("custom-avatars");
      if (saved) {
        const arr = JSON.parse(saved);
        if (arr[0]) return arr[0];
      }
    } catch {
      /* ignore */
    }
    const old = localStorage.getItem("custom-avatar");
    if (old) return old;
    return PREMADE_AVATARS[Math.floor(Math.random() * PREMADE_AVATARS.length)];
  });
  const [creating, setCreating] = useState(false);

  const handleSelectCategory = (cat: GameCategory) => {
    setSelectedCategory(cat);
    setStep("create");
  };

  const handleCreate = () => {
    if (!socket || !nickname.trim() || !selectedCategory) return;
    setCreating(true);
    localStorage.setItem("player-nickname", nickname.trim());
    localStorage.setItem("player-avatar", avatar);
    socket.emit("create-room", {
      nickname: nickname.trim(),
      avatarUrl: avatar,
      gameCategory: selectedCategory,
    });
  };

  const selectedCat = GAME_CATEGORIES.find((c) => c.id === selectedCategory);
  const theme = getCategoryTheme(selectedCategory ?? "woord");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 sm:mb-8"
      >
        <img
          src="/logo.webp"
          alt="Verwarde Volwassenen"
          className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 border-2 border-gray-800"
          style={{ borderRadius: "1rem" }}
        />
        <p className="text-sm sm:text-base text-gray-500 font-display font-semibold tracking-wide uppercase mb-1">
          De Verwarde Volwassenen
        </p>
        <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl">
          <span>🎮</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-amber-400">
            &nbsp;Spelletjeskamer
          </span>
        </h1>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === "pick" ? (
          /* Step 1: Game Category Picker */
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-3xl flex flex-col items-center"
          >
            <p className="text-center text-sm font-display font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Kies een spel
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {GAME_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => cat.available && handleSelectCategory(cat.id)}
                  disabled={!cat.available}
                  className={`rounded-2xl border-2 p-5 text-left transition-all w-44 ${cat.bg}`}
                >
                  <div className="text-4xl mb-3">{cat.icon}</div>
                  <div
                    className={`font-display font-black text-lg ${cat.color}`}
                  >
                    {cat.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-display">
                    {cat.subtitle}
                  </div>
                </button>
              ))}
            </div>

            {/* Join by code */}
            <div className="mt-6 w-full max-w-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-display font-semibold text-gray-400 uppercase tracking-wide">
                  Of join een spel
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .slice(0, 4),
                    )
                  }
                  placeholder="ABCD"
                  maxLength={4}
                  className="min-w-0 flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 outline-none transition-all text-center text-lg font-display font-bold tracking-[0.3em] uppercase
                  focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && joinCode.length === 4) {
                      navigate(`/join/${joinCode}`);
                    }
                  }}
                />
                <button
                  onClick={() =>
                    joinCode.length === 4 && navigate(`/join/${joinCode}`)
                  }
                  disabled={joinCode.length !== 4}
                  className="px-5 py-2.5 rounded-xl bg-gray-800 text-white font-display font-bold text-sm
                  hover:bg-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Join
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Step 2: Create Game Card */
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="card w-full max-w-md"
          >
            <div className="relative flex items-center justify-center mb-5">
              <button
                onClick={() => {
                  setStep("pick");
                }}
                className={`absolute left-0 flex items-center gap-1.5 text-sm font-display font-semibold text-gray-500 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 ${theme.badgeHover}`}
              >
                ← Terug
              </button>
              <h2 className="font-display font-bold text-xl text-gray-800">
                {selectedCat?.icon} {selectedCat?.title}
              </h2>
            </div>

            <div className="flex flex-col items-center gap-5">
              {/* Avatar */}
              <AvatarPicker
                value={avatar}
                onChange={setAvatar}
                accentColor={theme.colorKey}
              />

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
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none transition-all text-lg font-display
                    focus:border-current focus:ring-2 focus:ring-current/20 ${theme.accentText}`}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={!nickname.trim() || !socket || creating}
                className={`w-full font-display font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-2xl text-base sm:text-lg shadow-lg hover:shadow-xl 
                           transform hover:scale-105 active:scale-95 transition-all duration-200 text-white
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${theme.accentHover}`}
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
                    Aanmaken...
                  </span>
                ) : (
                  "🎲 Start Nieuw Spel"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
