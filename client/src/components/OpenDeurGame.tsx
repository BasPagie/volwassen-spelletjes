import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OpenDeurRoundState } from "shared/types";

interface OpenDeurGameProps {
  roundState: OpenDeurRoundState;
  onSubmitAnswer: (answer: string) => void;
  onSkipQuestion: () => void;
}

export default function OpenDeurGame({
  roundState,
  onSubmitAnswer,
  onSkipQuestion,
}: OpenDeurGameProps) {
  const [answer, setAnswer] = useState("");
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrongCountRef = useRef(0);

  // Focus input on mount and question change, reset wrong counter
  useEffect(() => {
    inputRef.current?.focus();
    wrongCountRef.current = 0;
    prevFoundRef.current = [];
  }, [roundState.currentQuestionIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    wrongCountRef.current++;
    onSubmitAnswer(answer.trim());
    setAnswer("");
  };

  // Track found answers to detect new ones (flash) or wrong answers (shake)
  const prevFoundRef = useRef<string[]>([]);
  useEffect(() => {
    const prev = prevFoundRef.current;
    if (roundState.foundAnswers.length > prev.length) {
      // Correct answer: reset wrong counter, flash
      wrongCountRef.current = 0;
      const newAnswer =
        roundState.foundAnswers[roundState.foundAnswers.length - 1];
      setFlash(newAnswer);
      setTimeout(() => setFlash(null), 600);
    } else if (
      roundState.foundAnswers.length === prev.length &&
      wrongCountRef.current > 0
    ) {
      // Server responded but no new answer found = wrong
      setShake(true);
      wrongCountRef.current = 0;
      setTimeout(() => setShake(false), 400);
    }
    prevFoundRef.current = roundState.foundAnswers;
  }, [roundState.foundAnswers, roundState.currentQuestionIndex]);

  const answersRemaining =
    roundState.totalAnswers - roundState.foundAnswers.length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Question progress */}
      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: roundState.totalQuestions }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < roundState.currentQuestionIndex
                ? "bg-green-400"
                : i === roundState.currentQuestionIndex
                  ? "bg-brand-500 scale-125"
                  : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <motion.div
        key={roundState.currentQuestionIndex}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="font-display font-black text-xl sm:text-2xl md:text-3xl text-gray-800">
          {roundState.question}
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Vraag {roundState.currentQuestionIndex + 1} van{" "}
          {roundState.totalQuestions} — nog {answersRemaining}{" "}
          {answersRemaining === 1 ? "antwoord" : "antwoorden"}
        </p>
      </motion.div>

      {/* Answer slots grid — each slot corresponds to an original answer */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {(roundState.answerHints ?? []).map((hint, i) => {
          const isFound = hint === null;
          // answerHints preserves original answer order (null = found, letter = unfound)
          // foundAnswerSlots maps each original position to the matched answer text
          const foundAnswer = isFound
            ? (roundState.foundAnswerSlots?.[i] ??
              roundState.foundAnswers[0] ??
              null)
            : null;
          const isFlashing = foundAnswer && flash === foundAnswer;

          return (
            <motion.div
              key={i}
              initial={false}
              animate={
                isFlashing
                  ? { scale: [1, 1.05, 1], backgroundColor: "#dcfce7" }
                  : {}
              }
              className={`h-11 sm:h-14 rounded-xl flex items-center justify-center font-display font-bold text-sm sm:text-lg
                transition-all duration-300
                ${
                  isFound
                    ? "bg-green-100 text-green-800 border-2 border-green-300"
                    : "bg-gray-100 text-gray-300 border-2 border-dashed border-gray-300"
                }`}
            >
              {isFound && foundAnswer ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                >
                  {foundAnswer}
                </motion.span>
              ) : (
                <span className="font-display font-black text-gray-400 tracking-wider">
                  {hint}_
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3 sm:mb-4">
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex-1"
        >
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Typ een antwoord..."
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400
                       focus:outline-none font-display text-base sm:text-lg transition-colors"
            autoComplete="off"
          />
        </motion.div>
        <button
          type="submit"
          disabled={!answer.trim()}
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-brand-500 text-white font-display font-bold
                     hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          ✓
        </button>
      </form>

      {/* Skip button */}
      <div className="text-center">
        <button
          onClick={onSkipQuestion}
          className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 
                     font-display font-bold text-sm transition-all active:scale-95"
        >
          Volgende vraag →
        </button>
      </div>
    </div>
  );
}
