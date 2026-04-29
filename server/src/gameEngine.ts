import type {
  GameRoom,
  ConnectionsPuzzle,
  PuzzelrondePuzzle,
  OpenDeurPuzzle,
  LingoPuzzle,
  Puzzle,
  RoundState,
  ConnectionsRoundState,
  PuzzelrondeRoundState,
  OpenDeurRoundState,
  LingoRoundState,
  LingoGuess,
  LingoLetterFeedback,
  LingoWordResult,
  PlayerProgress,
  PlayerRoundResult,
  RoundResult,
  FinalResults,
  ConnectionsGroup,
  OpenDeurQuestion,
} from '../../shared/types.js';
import { getConnectionsPuzzles, getPuzzelrondePuzzles, getOpenDeurPuzzles, getLingoPuzzles, isValidLingoGuess } from './puzzleStore.js';

// ─── Per-player round tracking ─────────────────────────
interface PlayerRoundTracker {
  playerId: string;
  solvedGroups: number[];    // indices of solved groups
  wrongGuesses: number;
  correctAnswers: number;    // puzzelronde connecting words correct
  finished: boolean;
  startTime: number;
  endTime: number | null;
  score: number;
  pendingGroupIndex: number | null; // puzzelronde: group just solved, waiting for answer
  answerResults: Map<number, boolean>; // puzzelronde: groupIndex → was answer correct
  // Open Deur tracking
  currentQuestionIndex: number;
  foundAnswersPerQuestion: Map<number, string[]>;
  // Lingo tracking
  lingoCurrentWordIndex: number;
  lingoGuessesPerWord: Map<number, LingoGuess[]>;
  lingoCompletedWords: LingoWordResult[];
  shuffledWords?: string[]; // stable shuffle for puzzelronde
}

// ─── Game instance per room ────────────────────────────
interface GameInstance {
  roomId: string;
  puzzle: Puzzle;
  playerTrackers: Map<string, PlayerRoundTracker>;
  timer: ReturnType<typeof setInterval> | null;
  roundStartTime: number;
  timeRemainingMs: number | null;
  roundEnding: boolean;
}

const activeGames = new Map<string, GameInstance>();

// Track used puzzle IDs per room to avoid repeats
const usedPuzzles = new Map<string, Set<string>>();

// ─── Shuffle array ─────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Start a round ─────────────────────────────────────
export function startRound(room: GameRoom): { roundState: RoundState; puzzle: Puzzle } | null {
  const roundConfig = room.settings.rounds[room.currentRoundIndex];
  if (!roundConfig) return null;

  let puzzle: Puzzle;

  if (roundConfig.customPuzzle) {
    puzzle = roundConfig.customPuzzle;
  } else if (roundConfig.puzzleId) {
    const allPuzzles: Puzzle[] = roundConfig.type === 'connections'
      ? getConnectionsPuzzles()
      : roundConfig.type === 'puzzelronde'
        ? getPuzzelrondePuzzles()
        : roundConfig.type === 'lingo'
          ? getLingoPuzzles()
          : getOpenDeurPuzzles();
    const found = allPuzzles.find((p) => p.id === roundConfig.puzzleId);
    if (!found) return null;
    puzzle = found;
  } else {
    // Random puzzle filtered by difficulty
    const allPuzzles: Puzzle[] = roundConfig.type === 'connections'
      ? getConnectionsPuzzles()
      : roundConfig.type === 'puzzelronde'
        ? getPuzzelrondePuzzles()
        : roundConfig.type === 'lingo'
          ? getLingoPuzzles()
          : getOpenDeurPuzzles();
    const filtered = allPuzzles.filter((p) => p.difficulty === roundConfig.difficulty);
    const pool = filtered.length > 0 ? filtered : allPuzzles;
    // Exclude previously used puzzles in this game
    const used = usedPuzzles.get(room.roomId) ?? new Set();
    const available = pool.filter((p) => !used.has(p.id));
    const finalPool = available.length > 0 ? available : pool;
    if (finalPool.length === 0) return null;
    puzzle = finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  // Track this puzzle as used for this room
  const used = usedPuzzles.get(room.roomId) ?? new Set();
  used.add(puzzle.id);
  usedPuzzles.set(room.roomId, used);

  // Clean up any leftover game instance from a previous round (stops old timer)
  const oldInstance = activeGames.get(room.roomId);
  if (oldInstance?.timer) clearInterval(oldInstance.timer);

  // Initialize player trackers
  const playerTrackers = new Map<string, PlayerRoundTracker>();
  for (const player of room.players) {
    // Skip host if they are spectating
    if (player.isHost && !room.settings.hostPlays) continue;
    playerTrackers.set(player.id, {
      playerId: player.id,
      solvedGroups: [],
      wrongGuesses: 0,
      correctAnswers: 0,
      finished: false,
      startTime: Date.now(),
      endTime: null,
      score: 0,
      pendingGroupIndex: null,
      answerResults: new Map(),
      currentQuestionIndex: 0,
      foundAnswersPerQuestion: new Map(),
      lingoCurrentWordIndex: 0,
      lingoGuessesPerWord: new Map(),
      lingoCompletedWords: [],
    });
  }

  const timeRemainingMs = room.settings.timeLimitSeconds
    ? room.settings.timeLimitSeconds * 1000
    : null;

  const instance: GameInstance = {
    roomId: room.roomId,
    puzzle,
    playerTrackers,
    timer: null,
    roundStartTime: Date.now(),
    timeRemainingMs,
    roundEnding: false,
  };

  activeGames.set(room.roomId, instance);

  // Build initial round state
  const roundState = buildRoundState(instance, room);

  return { roundState, puzzle };
}

// ─── Build round state for a player (generic view) ────
function buildRoundState(instance: GameInstance, room: GameRoom): RoundState {
  const puzzle = instance.puzzle;
  const attemptsLeft = room.settings.attemptsMode === 'limited' ? room.settings.maxAttempts : null;
  const timeRemainingMs = instance.timeRemainingMs;

  if (puzzle.type === 'connections') {
    const words = shuffle(puzzle.groups.flatMap((g) => g.words));
    return {
      type: 'connections',
      words,
      solvedGroups: [],
      attemptsLeft,
      timeRemainingMs,
    };
  } else if (puzzle.type === 'puzzelronde') {
    const words = shuffle(puzzle.groups.flatMap((g) => g.words));
    return {
      type: 'puzzelronde',
      words,
      solvedGroups: [],
      totalGroups: puzzle.groups.length,
      timeRemainingMs,
    };
  } else if (puzzle.type === 'lingo') {
    return {
      type: 'lingo',
      wordLength: 5,
      currentWordIndex: 0,
      totalWords: puzzle.words.length,
      firstLetter: puzzle.words[0][0].toUpperCase(),
      guesses: [],
      maxGuessesPerWord: 5,
      completedWords: [],
      attemptsLeft,
      timeRemainingMs,
    };
  } else {
    const firstQuestion = puzzle.questions[0];
    return {
      type: 'opendeur',
      currentQuestionIndex: 0,
      question: firstQuestion.question,
      foundAnswers: [],
      answerHints: firstQuestion.answers.map((a) => a[0].toUpperCase()),
      foundAnswerSlots: firstQuestion.answers.map(() => null),
      totalAnswers: firstQuestion.answers.length,
      totalQuestions: puzzle.questions.length,
      timeRemainingMs,
    };
  }
}

// ─── Build spectator round state (read-only generic view) ──
export function getSpectatorRoundState(roomId: string, room: GameRoom): RoundState | null {
  const instance = activeGames.get(roomId);
  if (!instance) return null;
  return buildRoundState(instance, room);
}

// ─── Build player-specific round state ─────────────────
export function getPlayerRoundState(roomId: string, playerId: string, room: GameRoom): RoundState | null {
  const instance = activeGames.get(roomId);
  if (!instance) return null;

  const tracker = instance.playerTrackers.get(playerId);
  if (!tracker) return null;

  const puzzle = instance.puzzle;
  const attemptsLeft = room.settings.attemptsMode === 'limited'
    ? room.settings.maxAttempts - tracker.wrongGuesses
    : null;
  const timeRemainingMs = instance.timeRemainingMs;

  if (puzzle.type === 'connections') {
    const solvedGroups = tracker.solvedGroups.map((i) => puzzle.groups[i]);
    const solvedWords = new Set(solvedGroups.flatMap((g) => g.words));
    const remainingWords = shuffle(
      puzzle.groups.flatMap((g) => g.words).filter((w) => !solvedWords.has(w))
    );

    return {
      type: 'connections',
      words: remainingWords,
      solvedGroups,
      attemptsLeft,
      timeRemainingMs,
    };
  } else if (puzzle.type === 'puzzelronde') {
    const solvedGroups = tracker.solvedGroups.map((i) => ({
      words: puzzle.groups[i].words,
      answer: puzzle.groups[i].answer,
    }));
    // Use stable shuffled order from tracker (set on first call)
    if (!tracker.shuffledWords) {
      tracker.shuffledWords = shuffle(puzzle.groups.flatMap((g) => g.words));
    }

    return {
      type: 'puzzelronde',
      words: tracker.shuffledWords,
      solvedGroups,
      totalGroups: puzzle.groups.length,
      timeRemainingMs,
    };
  } else if (puzzle.type === 'lingo') {
    const wordIdx = tracker.lingoCurrentWordIndex;
    const currentGuesses = tracker.lingoGuessesPerWord.get(wordIdx) ?? [];
    const currentWord = wordIdx < puzzle.words.length ? puzzle.words[wordIdx] : puzzle.words[puzzle.words.length - 1];

    return {
      type: 'lingo',
      wordLength: 5,
      currentWordIndex: wordIdx,
      totalWords: puzzle.words.length,
      firstLetter: currentWord[0].toUpperCase(),
      guesses: currentGuesses,
      maxGuessesPerWord: 5,
      completedWords: tracker.lingoCompletedWords,
      attemptsLeft,
      timeRemainingMs,
    };
  } else {
    const qIdx = tracker.currentQuestionIndex;
    const question = puzzle.questions[qIdx];
    const found = tracker.foundAnswersPerQuestion.get(qIdx) ?? [];
    const foundLower = new Set(found.map((f) => f.toLowerCase()));
    // Per-slot hints: null if found, first letter if still unfound (preserves original answer order)
    const answerHints = question.answers.map((a) =>
      foundLower.has(a.toLowerCase()) ? null : a[0].toUpperCase()
    );
    // Map found answers to their original positions
    const foundAnswerSlots = question.answers.map((a) =>
      foundLower.has(a.toLowerCase()) ? a : null
    );

    return {
      type: 'opendeur',
      currentQuestionIndex: qIdx,
      question: question.question,
      foundAnswers: found,
      answerHints,
      foundAnswerSlots,
      totalAnswers: question.answers.length,
      totalQuestions: puzzle.questions.length,
      timeRemainingMs,
    };
  }
}

// ─── Submit a group guess ──────────────────────────────
export interface GroupGuessResult {
  correct: boolean;
  groupIndex?: number;
  group?: ConnectionsGroup | { words: string[] };
  playerFinished: boolean;
  playerEliminated: boolean;
  hintWords?: string[]; // words from the guess that DO belong to the same group (partial match hint)
}

export function submitGroupGuess(
  roomId: string,
  playerId: string,
  guessedWords: string[],
  room: GameRoom
): GroupGuessResult | null {
  const instance = activeGames.get(roomId);
  if (!instance) return null;

  // Open Deur, Lingo, and Puzzelronde don't use group guesses
  if (instance.puzzle.type === 'opendeur' || instance.puzzle.type === 'lingo' || instance.puzzle.type === 'puzzelronde') return null;

  const tracker = instance.playerTrackers.get(playerId);
  if (!tracker || tracker.finished) return null;

  const puzzle = instance.puzzle;
  const normalizedGuess = new Set(guessedWords.map((w) => w.trim().toLowerCase()));

  // Check against each group
  for (let i = 0; i < puzzle.groups.length; i++) {
    if (tracker.solvedGroups.includes(i)) continue;

    const groupWords = new Set(puzzle.groups[i].words.map((w) => w.toLowerCase()));
    if (normalizedGuess.size === groupWords.size && [...normalizedGuess].every((w) => groupWords.has(w))) {
      // Correct!
      tracker.solvedGroups.push(i);
      tracker.score += 100;

      const totalGroups = puzzle.groups.length;
      let playerFinished = false;

      if (tracker.solvedGroups.length === totalGroups) {
        tracker.finished = true;
        tracker.endTime = Date.now();
        playerFinished = true;
        // Speed bonus
        const timeTaken = tracker.endTime - tracker.startTime;
        if (room.settings.timeLimitSeconds) {
          const bonus = Math.max(0, Math.floor((room.settings.timeLimitSeconds * 1000 - timeTaken) / 1000) * 2);
          tracker.score += bonus;
        }
      }

      return {
        correct: true,
        groupIndex: i,
        group: puzzle.groups[i],
        playerFinished,
        playerEliminated: false,
      };
    }
  }

  // Wrong guess — check for partial matches (hint: which guessed words belong together)
  let hintWords: string[] | undefined;
  let bestOverlap = 0;
  for (let i = 0; i < puzzle.groups.length; i++) {
    if (tracker.solvedGroups.includes(i)) continue;
    const groupWords = new Set(puzzle.groups[i].words.map((w) => w.toLowerCase()));
    const matching = guessedWords.filter((w) => groupWords.has(w.trim().toLowerCase()));
    if (matching.length > bestOverlap && matching.length >= 2 && matching.length < groupWords.size) {
      bestOverlap = matching.length;
      // Return the original-cased words from the guess
      hintWords = matching;
    }
  }

  tracker.wrongGuesses++;
  const playerEliminated = room.settings.attemptsMode === 'limited' &&
    tracker.wrongGuesses >= room.settings.maxAttempts;

  if (playerEliminated) {
    tracker.finished = true;
    tracker.endTime = Date.now();
    tracker.score -= 25; // penalty for last wrong guess
  } else if (room.settings.attemptsMode === 'limited') {
    tracker.score -= 25;
  }

  return {
    correct: false,
    playerFinished: false,
    playerEliminated,
    hintWords,
  };
}

// ─── Submit connecting word answer (puzzelronde) ──────
export interface AnswerResult {
  correct: boolean;
  groupWords?: string[];
  playerFinished: boolean;
}

export function submitAnswer(
  roomId: string,
  playerId: string,
  answer: string,
  room: GameRoom
): AnswerResult | null {
  const instance = activeGames.get(roomId);
  if (!instance || instance.puzzle.type !== 'puzzelronde') return null;

  const tracker = instance.playerTrackers.get(playerId);
  if (!tracker || tracker.finished) return null;

  const puzzle = instance.puzzle as PuzzelrondePuzzle;

  // Check answer against all unsolved groups
  for (let i = 0; i < puzzle.groups.length; i++) {
    if (tracker.solvedGroups.includes(i)) continue;

    const group = puzzle.groups[i];
    if (fuzzyMatch(answer, group.answer)) {
      tracker.solvedGroups.push(i);
      tracker.correctAnswers++;
      tracker.score += 150;

      const allGroupsSolved = tracker.solvedGroups.length === puzzle.groups.length;
      let playerFinished = false;

      if (allGroupsSolved) {
        tracker.finished = true;
        tracker.endTime = Date.now();
        playerFinished = true;
        // Speed bonus
        const timeTaken = tracker.endTime - tracker.startTime;
        if (room.settings.timeLimitSeconds) {
          const bonus = Math.max(0, Math.floor((room.settings.timeLimitSeconds * 1000 - timeTaken) / 1000) * 2);
          tracker.score += bonus;
        }
      }

      return {
        correct: true,
        groupWords: group.words,
        playerFinished,
      };
    }
  }

  // Wrong answer
  return {
    correct: false,
    playerFinished: false,
  };
}

// ─── Submit Open Deur answer ───────────────────────────
export interface OpenDeurAnswerResult {
  correct: boolean;
  matchedAnswer?: string;
  playerFinished: boolean;
  questionComplete: boolean;
  previousAnswers?: string[]; // all answers for the completed question
}

export function submitOpenDeurAnswer(
  roomId: string,
  playerId: string,
  answer: string,
  room: GameRoom,
): OpenDeurAnswerResult | null {
  const instance = activeGames.get(roomId);
  if (!instance || instance.puzzle.type !== 'opendeur') return null;

  const tracker = instance.playerTrackers.get(playerId);
  if (!tracker || tracker.finished) return null;

  const puzzle = instance.puzzle as OpenDeurPuzzle;
  const qIdx = tracker.currentQuestionIndex;
  const question = puzzle.questions[qIdx];
  if (!question) return null;

  const found = tracker.foundAnswersPerQuestion.get(qIdx) ?? [];

  // Check if answer matches any of the remaining correct answers
  for (const correctAnswer of question.answers) {
    // Skip already found answers
    if (found.some((f) => f.toLowerCase() === correctAnswer.toLowerCase())) continue;

    if (fuzzyMatch(answer, correctAnswer)) {
      found.push(correctAnswer);
      tracker.foundAnswersPerQuestion.set(qIdx, found);
      tracker.correctAnswers++;
      tracker.score += 50;

      const questionComplete = found.length >= question.answers.length;

      // Don't auto-advance here — let the socket handler get the completed state first,
      // then call advanceOpenDeurQuestion() to move to the next question.

      if (questionComplete) {
        const isLastQuestion = qIdx >= puzzle.questions.length - 1;
        if (isLastQuestion) {
          tracker.finished = true;
          tracker.endTime = Date.now();
          // Speed bonus for finishing early
          if (room.settings.timeLimitSeconds) {
            const timeTakenMs = tracker.endTime - tracker.startTime;
            const bonus = Math.max(0, Math.floor((room.settings.timeLimitSeconds * 1000 - timeTakenMs) / 1000) * 2);
            tracker.score += bonus;
          }
        }
      }

      return {
        correct: true,
        matchedAnswer: correctAnswer,
        playerFinished: tracker.finished,
        questionComplete,
      };
    }
  }

  // Wrong answer — no penalty for opendeur
  return {
    correct: false,
    playerFinished: false,
    questionComplete: false,
  };
}

// ─── Skip Open Deur question ───────────────────────────
export function skipOpenDeurQuestion(
  roomId: string,
  playerId: string,
): { playerFinished: boolean; previousAnswers: string[] } | null {
  const instance = activeGames.get(roomId);
  if (!instance || instance.puzzle.type !== 'opendeur') return null;

  const tracker = instance.playerTrackers.get(playerId);
  if (!tracker || tracker.finished) return null;

  const puzzle = instance.puzzle as OpenDeurPuzzle;
  const qIdx = tracker.currentQuestionIndex;
  const previousAnswers = puzzle.questions[qIdx].answers;
  const isLastQuestion = qIdx >= puzzle.questions.length - 1;

  if (isLastQuestion) {
    tracker.finished = true;
    tracker.endTime = Date.now();
  } else {
    tracker.currentQuestionIndex++;
  }

  return {
    playerFinished: tracker.finished,
    previousAnswers,
  };
}

// ─── Advance Open Deur to next question (after questionComplete) ──
export function advanceOpenDeurQuestion(
  roomId: string,
  playerId: string,
): void {
  const instance = activeGames.get(roomId);
  if (!instance || instance.puzzle.type !== 'opendeur') return;

  const tracker = instance.playerTrackers.get(playerId);
  if (!tracker || tracker.finished) return;

  const puzzle = instance.puzzle as OpenDeurPuzzle;
  const qIdx = tracker.currentQuestionIndex;
  const isLastQuestion = qIdx >= puzzle.questions.length - 1;

  if (!isLastQuestion) {
    tracker.currentQuestionIndex++;
  }
}

// ─── Submit Lingo guess ────────────────────────────────
export interface LingoGuessResult {
  correct: boolean;
  feedback: LingoLetterFeedback[];
  wordComplete: boolean;
  previousWord?: string;
  playerFinished: boolean;
  playerEliminated: boolean;
}

function computeLingoFeedback(guess: string, target: string): LingoLetterFeedback[] {
  const g = guess.toUpperCase().split('');
  const t = target.toUpperCase().split('');
  const feedback: LingoLetterFeedback[] = new Array(g.length).fill('absent');
  const targetUsed = new Array(t.length).fill(false);

  // First pass: mark exact matches
  for (let i = 0; i < g.length; i++) {
    if (g[i] === t[i]) {
      feedback[i] = 'correct';
      targetUsed[i] = true;
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < g.length; i++) {
    if (feedback[i] === 'correct') continue;
    for (let j = 0; j < t.length; j++) {
      if (!targetUsed[j] && g[i] === t[j]) {
        feedback[i] = 'present';
        targetUsed[j] = true;
        break;
      }
    }
  }

  return feedback;
}

export function submitLingoGuess(
  roomId: string,
  playerId: string,
  guess: string,
  room: GameRoom
): LingoGuessResult | null {
  const instance = activeGames.get(roomId);
  if (!instance || instance.puzzle.type !== 'lingo') return null;

  const tracker = instance.playerTrackers.get(playerId);
  if (!tracker || tracker.finished) return null;

  const puzzle = instance.puzzle as LingoPuzzle;
  const wordIdx = tracker.lingoCurrentWordIndex;
  if (wordIdx >= puzzle.words.length) return null;

  // Validate guess
  if (!isValidLingoGuess(guess)) return null;

  const normalizedGuess = guess.toUpperCase().trim();
  const targetWord = puzzle.words[wordIdx].toUpperCase();

  // Compute feedback
  const feedback = computeLingoFeedback(normalizedGuess, targetWord);

  // Store the guess
  const guesses = tracker.lingoGuessesPerWord.get(wordIdx) ?? [];
  guesses.push({ word: normalizedGuess, feedback });
  tracker.lingoGuessesPerWord.set(wordIdx, guesses);

  const correct = normalizedGuess === targetWord;
  const maxGuesses = 5;
  const wordComplete = correct || guesses.length >= maxGuesses;

  if (correct) {
    // Award points: 100 base + 20 per unused guess
    const unusedGuesses = maxGuesses - guesses.length;
    tracker.score += 100 + (unusedGuesses * 20);
    tracker.correctAnswers++;
    tracker.lingoCompletedWords.push({ guessed: true, guessCount: guesses.length });
  } else if (guesses.length >= maxGuesses) {
    // Failed this word
    tracker.lingoCompletedWords.push({ guessed: false, guessCount: maxGuesses });
    // In limited mode, each failed word costs a life
    if (room.settings.attemptsMode === 'limited') {
      tracker.wrongGuesses++;
    }
  }

  let playerFinished = false;
  let playerEliminated = false;
  let previousWord: string | undefined;

  if (wordComplete) {
    previousWord = targetWord;

    // Check elimination
    if (room.settings.attemptsMode === 'limited' && tracker.wrongGuesses >= room.settings.maxAttempts) {
      playerEliminated = true;
      tracker.finished = true;
      tracker.endTime = Date.now();
      playerFinished = true;
    } else if (wordIdx + 1 >= puzzle.words.length) {
      // All words attempted
      tracker.finished = true;
      tracker.endTime = Date.now();
      playerFinished = true;
      // Speed bonus
      const timeTaken = tracker.endTime - tracker.startTime;
      if (room.settings.timeLimitSeconds) {
        const bonus = Math.max(0, Math.floor((room.settings.timeLimitSeconds * 1000 - timeTaken) / 1000) * 2);
        tracker.score += bonus;
      }
    } else {
      // Advance to next word
      tracker.lingoCurrentWordIndex++;
    }
  }

  return {
    correct,
    feedback,
    wordComplete,
    previousWord,
    playerFinished,
    playerEliminated,
  };
}

// ─── Fuzzy matching ────────────────────────────────────
function dutchStem(word: string): string {
  const w = word.toLowerCase().trim();
  if (w.endsWith('tjes') && w.length > 5) return w.slice(0, -4);
  if (w.endsWith('jes') && w.length > 4) return w.slice(0, -3);
  if (w.endsWith('eren') && w.length > 5) return w.slice(0, -4);
  if (w.endsWith('ren') && w.length > 4) return w.slice(0, -3);
  if (w.endsWith('enden') && w.length > 6) return w.slice(0, -5);
  if (w.endsWith('anden') && w.length > 6) return w.slice(0, -5);
  if (w.endsWith('en') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
  if (w.endsWith('e') && w.length > 3) return w.slice(0, -1);
  return w;
}

function fuzzyMatch(input: string, target: string): boolean {
  const a = input.trim().toLowerCase();
  const b = target.trim().toLowerCase();

  if (a === b) return true;

  // Direct Levenshtein check
  const maxDist = b.length >= 6 ? 2 : 1;
  if (Math.abs(a.length - b.length) <= maxDist && levenshtein(a, b) <= maxDist) return true;

  // Stem-based: strip Dutch inflectional suffixes (-en, -s, -jes, etc.) then compare
  // This handles e.g. "schepen" → stem "schep" ≈ "schip" (Lev 1)
  const aStem = dutchStem(a);
  const bStem = dutchStem(b);
  if (aStem === bStem) return true;
  const stemMaxDist = bStem.length >= 5 ? 2 : 1;
  if (Math.abs(aStem.length - bStem.length) <= stemMaxDist && levenshtein(aStem, bStem) <= stemMaxDist) return true;

  return false;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

// ─── Finish bot players (dev mode) ─────────────────────
export function finishBotPlayers(roomId: string, room: GameRoom): void {
  const instance = activeGames.get(roomId);
  if (!instance) return;

  for (const player of room.players) {
    if (!player.isBot) continue;
    const tracker = instance.playerTrackers.get(player.id);
    if (!tracker || tracker.finished) continue;

    const puzzle = instance.puzzle;

    if (puzzle.type === 'connections') {
      // Solve some groups randomly (1 to all)
      const totalGroups = puzzle.groups.length;
      const groupsToSolve = 1 + Math.floor(Math.random() * totalGroups);
      for (let i = 0; i < groupsToSolve && tracker.solvedGroups.length < totalGroups; i++) {
        const unsolved = Array.from({ length: totalGroups }, (_, idx) => idx)
          .filter((idx) => !tracker.solvedGroups.includes(idx));
        if (unsolved.length === 0) break;
        const pick = unsolved[Math.floor(Math.random() * unsolved.length)];
        tracker.solvedGroups.push(pick);
        tracker.score += 100;
      }
    } else if (puzzle.type === 'puzzelronde') {
      // Answer some connecting words randomly (1 to all)
      const totalGroups = puzzle.groups.length;
      const groupsToSolve = 1 + Math.floor(Math.random() * totalGroups);
      for (let i = 0; i < groupsToSolve && tracker.solvedGroups.length < totalGroups; i++) {
        const unsolved = Array.from({ length: totalGroups }, (_, idx) => idx)
          .filter((idx) => !tracker.solvedGroups.includes(idx));
        if (unsolved.length === 0) break;
        const pick = unsolved[Math.floor(Math.random() * unsolved.length)];
        tracker.solvedGroups.push(pick);
        tracker.correctAnswers++;
        tracker.score += 150;
      }
    } else if (puzzle.type === 'opendeur') {
      // Find some answers per question
      for (let q = 0; q < puzzle.questions.length; q++) {
        const answers = puzzle.questions[q].answers;
        const found: string[] = [];
        for (const a of answers) {
          if (Math.random() > 0.3) {
            found.push(a);
            tracker.correctAnswers++;
            tracker.score += 50;
          }
        }
        tracker.foundAnswersPerQuestion.set(q, found);
      }
    } else if (puzzle.type === 'lingo') {
      // Complete some words
      for (let w = 0; w < puzzle.words.length; w++) {
        const guessed = Math.random() > 0.3;
        const guessCount = guessed ? 1 + Math.floor(Math.random() * 4) : 5;
        tracker.lingoCompletedWords.push({ guessed, guessCount });
        if (guessed) {
          tracker.score += 100 + (5 - guessCount) * 20;
          tracker.correctAnswers++;
        }
      }
      tracker.lingoCurrentWordIndex = puzzle.words.length;
    }

    // Add some random wrong guesses
    tracker.wrongGuesses = Math.floor(Math.random() * 3);
    tracker.finished = true;
    tracker.endTime = Date.now();
  }
}

// ─── Get player progress (for broadcasting) ───────────
export function getPlayerProgress(roomId: string): PlayerProgress[] {
  const instance = activeGames.get(roomId);
  if (!instance) return [];

  const progress: PlayerProgress[] = [];
  for (const [playerId, tracker] of instance.playerTrackers) {
    let solvedCount = tracker.solvedGroups.length;
    // For opendeur, count total answers found across all questions
    if (instance.puzzle.type === 'opendeur') {
      solvedCount = 0;
      for (const answers of tracker.foundAnswersPerQuestion.values()) {
        solvedCount += answers.length;
      }
    }
    // For lingo, count correctly guessed words
    if (instance.puzzle.type === 'lingo') {
      solvedCount = tracker.lingoCompletedWords.filter((w) => w.guessed).length;
    }
    progress.push({
      playerId,
      solvedCount,
      finished: tracker.finished,
      score: tracker.score,
    });
  }
  return progress;
}

// ─── Check if round is complete (all players finished) ─
export function isRoundComplete(roomId: string): boolean {
  const instance = activeGames.get(roomId);
  if (!instance || instance.roundEnding) return false;

  for (const tracker of instance.playerTrackers.values()) {
    if (!tracker.finished) return false;
  }
  return true;
}

// ─── Force end round (timer expired) ──────────────────
export function forceEndRound(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (!instance) return;

  for (const tracker of instance.playerTrackers.values()) {
    if (!tracker.finished) {
      tracker.finished = true;
      tracker.endTime = Date.now();
    }
  }
}

// ─── Get round result ──────────────────────────────────
export function getRoundResult(roomId: string, room: GameRoom): RoundResult | null {
  const instance = activeGames.get(roomId);
  if (!instance || instance.roundEnding) return null;

  instance.roundEnding = true;

  const results: PlayerRoundResult[] = [];

  for (const player of room.players) {
    const tracker = instance.playerTrackers.get(player.id);
    if (!tracker) continue;

    let groupsFound = tracker.solvedGroups.length;
    let correctAnswers = tracker.correctAnswers;
    // For opendeur, groupsFound = number of questions where all answers found
    if (instance.puzzle.type === 'opendeur') {
      const puzzle = instance.puzzle as OpenDeurPuzzle;
      groupsFound = 0;
      for (let q = 0; q < puzzle.questions.length; q++) {
        const found = tracker.foundAnswersPerQuestion.get(q) ?? [];
        if (found.length >= puzzle.questions[q].answers.length) {
          groupsFound++;
        }
      }
    }
    // For lingo, groupsFound = correctly guessed words
    if (instance.puzzle.type === 'lingo') {
      groupsFound = tracker.lingoCompletedWords.filter((w) => w.guessed).length;
      correctAnswers = groupsFound;
    }

    results.push({
      playerId: player.id,
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
      groupsFound,
      correctAnswers,
      wrongGuesses: tracker.wrongGuesses,
      timeUsedMs: (tracker.endTime ?? Date.now()) - tracker.startTime,
      roundScore: tracker.score,
    });

    // Add round score to player's total
    player.score += tracker.score;
  }

  // Sort by score descending
  results.sort((a, b) => b.roundScore - a.roundScore);

  const roundResult: RoundResult = {
    roundIndex: room.currentRoundIndex,
    roundType: instance.puzzle.type,
    results,
    correctGroups: instance.puzzle.type === 'opendeur'
      ? (instance.puzzle as OpenDeurPuzzle).questions
      : instance.puzzle.type === 'connections'
        ? (instance.puzzle as ConnectionsPuzzle).groups
        : instance.puzzle.type === 'lingo'
          ? (instance.puzzle as LingoPuzzle).words
          : (instance.puzzle as PuzzelrondePuzzle).groups,
  };

  // Clean up game instance
  if (instance.timer) clearInterval(instance.timer);
  activeGames.delete(roomId);

  return roundResult;
}

// ─── Get final results ─────────────────────────────────
export function getFinalResults(room: GameRoom, allRoundResults: RoundResult[]): FinalResults {
  const activePlayers = room.players.filter(
    (p) => !(p.isHost && !room.settings.hostPlays)
  );
  const playerScores = activePlayers
    .map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
      totalScore: p.score,
      roundScores: allRoundResults.map(
        (rr) => rr.results.find((r) => r.playerId === p.id)?.roundScore ?? 0
      ),
      rank: 0,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  playerScores.forEach((p, i) => {
    p.rank = i + 1;
  });

  return {
    players: playerScores,
    roundResults: allRoundResults,
  };
}

// ─── Timer management ──────────────────────────────────
export function startTimer(
  roomId: string,
  onTick: (timeRemainingMs: number) => void,
  onExpire: () => void
): void {
  const instance = activeGames.get(roomId);
  if (!instance || instance.timeRemainingMs === null) return;

  const startTime = Date.now();
  const totalMs = instance.timeRemainingMs;

  instance.timer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, totalMs - elapsed);
    instance.timeRemainingMs = remaining;

    onTick(remaining);

    if (remaining <= 0) {
      if (instance.timer) clearInterval(instance.timer);
      instance.timer = null;
      onExpire();
    }
  }, 1000);
}

export function cleanupGame(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (instance?.timer) clearInterval(instance.timer);
  activeGames.delete(roomId);
  usedPuzzles.delete(roomId);
}
