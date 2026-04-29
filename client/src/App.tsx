import { Routes, Route } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "./pages/Landing";
import Join from "./pages/Join";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Results from "./pages/Results";
import { useGame } from "./context/GameContext";

function ErrorToast() {
  const { state, dispatch } = useGame();
  if (!state.errorMessage) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg font-display font-bold cursor-pointer"
      onClick={() => dispatch({ type: "CLEAR_ERROR" })}
    >
      {state.errorMessage}
    </motion.div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <AnimatePresence>
        <ErrorToast />
      </AnimatePresence>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/join/:roomId" element={<Join />} />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route path="/game/:roomId" element={<Game />} />
        <Route path="/results/:roomId" element={<Results />} />
      </Routes>
    </div>
  );
}
