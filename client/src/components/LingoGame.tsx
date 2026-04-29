import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  LingoRoundState,
  LingoLetterFeedback,
  LingoGuess,
} from "shared/types";

interface LingoGameProps {
  roundState: LingoRoundState;
  onSubmitGuess: (guess: string) => void;
}

const FEEDBACK_COLORS: Record<LingoLetterFeedback, string> = {
  correct: "bg-green-500 text-white border-green-600",
  present: "bg-yellow-400 text-yellow-900 border-yellow-500",
  absent: "bg-gray-500 text-white border-gray-600",
};

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export default function LingoGame({
  roundState,
  onSubmitGuess,
}: LingoGameProps) {
  const [currentInput, setCurrentInput] = useState("");
  const [shaking, setShaking] = useState(false);
  const [revealRow, setRevealRow] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevGuessCountRef = useRef(roundState.guesses.length);
  const prevWordIndexRef = useRef(roundState.currentWordIndex);

  // Buffer the roundState so animations can finish before transitioning
  const [displayState, setDisplayState] = useState(roundState);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Total reveal animation duration: (wordLength - 1) * stagger + flip duration
  const REVEAL_DURATION_MS = (roundState.wordLength - 1) * 150 + 500;

  // When roundState changes, decide whether to buffer or apply immediately
  useEffect(() => {
    const wordChanged =
      roundState.currentWordIndex !== displayState.currentWordIndex;
    const newGuess =
      roundState.guesses.length > displayState.guesses.length &&
      roundState.currentWordIndex === displayState.currentWordIndex;

    if (newGuess) {
      // New guess on same word — apply immediately so we can animate it
      setDisplayState(roundState);
    } else if (wordChanged && revealRow !== null) {
      // Word advanced while reveal is still playing — delay the transition
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setDisplayState(roundState);
        transitionTimerRef.current = null;
      }, REVEAL_DURATION_MS);
    } else {
      // Normal update (time, attempts, etc.)
      setDisplayState(roundState);
    }
  }, [roundState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [displayState.currentWordIndex]);

  // Detect new guess result — trigger reveal animation
  useEffect(() => {
    if (displayState.guesses.length > prevGuessCountRef.current) {
      const newRowIdx = displayState.guesses.length - 1;
      setRevealRow(newRowIdx);
      setCurrentInput("");
      setTimeout(() => setRevealRow(null), REVEAL_DURATION_MS);
    }
    prevGuessCountRef.current = displayState.guesses.length;
  }, [displayState.guesses.length, REVEAL_DURATION_MS]);

  // Detect word change — reset input
  useEffect(() => {
    if (displayState.currentWordIndex !== prevWordIndexRef.current) {
      setCurrentInput("");
      prevGuessCountRef.current = 0;
    }
    prevWordIndexRef.current = displayState.currentWordIndex;
  }, [displayState.currentWordIndex]);

  // Build letter status map for keyboard coloring
  const letterStatuses = useCallback((): Map<string, LingoLetterFeedback> => {
    const map = new Map<string, LingoLetterFeedback>();
    // Process completed words
    for (const word of displayState.completedWords) {
      // We don't have the guesses for completed words in roundState, only current word
    }
    // Process current word guesses
    for (const guess of displayState.guesses) {
      for (let i = 0; i < guess.word.length; i++) {
        const letter = guess.word[i];
        const fb = guess.feedback[i];
        const existing = map.get(letter);
        // Priority: correct > present > absent
        if (
          !existing ||
          fb === "correct" ||
          (fb === "present" && existing === "absent")
        ) {
          map.set(letter, fb);
        }
      }
    }
    return map;
  }, [displayState.guesses, displayState.completedWords]);

  const handleSubmit = () => {
    const guess = currentInput.toUpperCase().trim();
    if (guess.length !== displayState.wordLength) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    onSubmitGuess(guess);
  };

  // Global keyboard listener so physical keyboard always works
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in another input (e.g. chat)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        // Only allow our hidden sr-only input
        if (!(e.target as HTMLElement)?.classList.contains("sr-only")) return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitRef.current();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setCurrentInput((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        setCurrentInput((prev) => {
          if (prev.length >= displayState.wordLength) return prev;
          return prev + e.key.toUpperCase();
        });
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [displayState.wordLength]);

  // Keep a ref to handleSubmit so the global listener always calls the latest version
  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handled by global listener now, but prevent double-fire
    e.preventDefault();
  };

  const handleKeyboardClick = (letter: string) => {
    if (currentInput.length < displayState.wordLength) {
      setCurrentInput((prev) => prev + letter);
    }
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setCurrentInput((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const statuses = letterStatuses();
  const maxGuesses = displayState.maxGuessesPerWord;
  const guesses = displayState.guesses;

  // Build grid rows
  const rows:
    | { type: "guess"; guess: LingoGuess; rowIdx: number }[]
    | { type: "current" }[]
    | { type: "empty" }[] = [];
  const gridRows: JSX.Element[] = [];

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      {/* Word progress */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <span className="text-sm font-display font-bold text-gray-500">
          Woord {displayState.currentWordIndex + 1} van{" "}
          {displayState.totalWords}
        </span>
        <div className="flex gap-1 ml-2">
          {displayState.completedWords.map((w, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                w.guessed ? "bg-green-500" : "bg-red-400"
              }`}
              title={
                w.guessed
                  ? `Woord ${i + 1}: geraden in ${w.guessCount}`
                  : `Woord ${i + 1}: niet geraden`
              }
            />
          ))}
          {Array.from({
            length:
              displayState.totalWords - displayState.completedWords.length,
          }).map((_, i) => (
            <div
              key={`remaining-${i}`}
              className={`w-3 h-3 rounded-full ${
                i === 0 ? "bg-green-200 ring-2 ring-green-400" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Letter Grid (5 rows × 5 cols) */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: maxGuesses }).map((_, rowIdx) => {
          const isGuessRow = rowIdx < guesses.length;
          const isCurrentRow = rowIdx === guesses.length;
          const isRevealing = revealRow === rowIdx;

          return (
            <motion.div
              key={rowIdx}
              className="flex gap-1.5"
              animate={
                shaking && isCurrentRow ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}
              }
              transition={{ duration: 0.4 }}
            >
              {Array.from({ length: displayState.wordLength }).map(
                (_, colIdx) => {
                  if (isGuessRow) {
                    // Completed guess — show feedback
                    const guess = guesses[rowIdx];
                    const letter = guess.word[colIdx];
                    const fb = guess.feedback[colIdx];
                    return (
                      <motion.div
                        key={colIdx}
                        initial={isRevealing ? { rotateX: 0 } : false}
                        animate={isRevealing ? { rotateX: [0, 90, 0] } : {}}
                        transition={{
                          duration: 0.5,
                          delay: colIdx * 0.15,
                        }}
                        className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center 
                        rounded-lg border-2 font-display font-black text-xl sm:text-2xl
                        ${FEEDBACK_COLORS[fb]}`}
                      >
                        {letter}
                      </motion.div>
                    );
                  } else if (isCurrentRow) {
                    // Current input row
                    const letter =
                      colIdx === 0 && currentInput.length === 0
                        ? displayState.firstLetter
                        : currentInput[colIdx]?.toUpperCase();
                    const isHint = colIdx === 0 && currentInput.length === 0;
                    return (
                      <motion.div
                        key={colIdx}
                        initial={{ scale: 0.9, opacity: 0.5 }}
                        animate={{
                          scale: letter ? 1 : 0.9,
                          opacity: letter ? 1 : 0.5,
                        }}
                        className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center 
                        rounded-lg border-2 font-display font-black text-xl sm:text-2xl
                        ${
                          isHint
                            ? "bg-green-100 border-green-400 text-green-700"
                            : letter
                              ? "bg-white border-gray-400 text-gray-800"
                              : "bg-gray-50 border-gray-200 text-gray-300"
                        }`}
                      >
                        {letter ?? ""}
                      </motion.div>
                    );
                  } else {
                    // Empty future row
                    return (
                      <div
                        key={colIdx}
                        className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center 
                        rounded-lg border-2 border-gray-200 bg-gray-50"
                      />
                    );
                  }
                },
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Hidden input for mobile keyboard + typing */}
      <input
        ref={inputRef}
        value={currentInput}
        onChange={(e) => {
          const val = e.target.value
            .replace(/[^a-zA-Z]/g, "")
            .slice(0, displayState.wordLength);
          setCurrentInput(val);
        }}
        onKeyDown={handleKeyDown}
        maxLength={displayState.wordLength}
        className="sr-only"
        autoComplete="off"
        autoCapitalize="characters"
        aria-label="Typ je gok"
      />

      {/* Submit button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={currentInput.length !== displayState.wordLength}
        className={`px-6 py-2.5 rounded-xl font-display font-bold text-sm transition-all
          ${
            currentInput.length === displayState.wordLength
              ? "bg-green-500 text-white shadow-md hover:bg-green-600"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
      >
        Probeer
      </motion.button>

      {/* On-screen keyboard */}
      <div className="flex flex-col items-center gap-1 mt-1">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {rowIdx === 2 && (
              <button
                onClick={handleBackspace}
                className="px-2 py-2 rounded text-xs font-bold bg-gray-200 text-gray-600 
                  hover:bg-gray-300 transition-colors min-w-[2rem]"
              >
                ⌫
              </button>
            )}
            {row.map((letter) => {
              const status = statuses.get(letter);
              let bgClass = "bg-gray-100 text-gray-700 hover:bg-gray-200";
              if (status === "correct") bgClass = "bg-green-500 text-white";
              else if (status === "present")
                bgClass = "bg-yellow-400 text-yellow-900";
              else if (status === "absent") bgClass = "bg-gray-500 text-white";

              return (
                <button
                  key={letter}
                  onClick={() => handleKeyboardClick(letter)}
                  className={`w-7 h-9 sm:w-8 sm:h-10 rounded text-xs sm:text-sm font-bold 
                    transition-colors ${bgClass}`}
                >
                  {letter}
                </button>
              );
            })}
            {rowIdx === 2 && (
              <button
                onClick={handleSubmit}
                disabled={currentInput.length !== roundState.wordLength}
                className={`px-2 py-2 rounded text-xs font-bold transition-colors min-w-[2rem]
                  ${
                    currentInput.length === displayState.wordLength
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-gray-200 text-gray-400"
                  }`}
              >
                ↵
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
