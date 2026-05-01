import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../context/GameContext";
import type { Toast } from "../context/GameContext";

const TOAST_DURATION = 3500;

const typeStyles: Record<Toast["type"], string> = {
  success: "bg-green-500 text-white",
  info: "bg-blue-500 text-white",
  warning: "bg-amber-500 text-white",
  error: "bg-red-500 text-white",
};

export default function ToastContainer() {
  const { state, dispatch } = useGame();

  // Also render errorMessage as a toast-like element for backwards compat
  const allToasts = state.toasts;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {state.errorMessage && (
          <motion.div
            key="error-msg"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-red-500 text-white px-5 py-2.5 rounded-xl shadow-lg font-display font-bold text-sm pointer-events-auto cursor-pointer"
            onClick={() => dispatch({ type: "CLEAR_ERROR" })}
          >
            {state.errorMessage}
          </motion.div>
        )}
        {allToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { dispatch } = useGame();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "REMOVE_TOAST", id: toast.id });
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, dispatch]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`${typeStyles[toast.type]} px-5 py-2.5 rounded-xl shadow-lg font-display font-bold text-sm pointer-events-auto cursor-pointer`}
      onClick={() => dispatch({ type: "REMOVE_TOAST", id: toast.id })}
    >
      {toast.message}
    </motion.div>
  );
}
