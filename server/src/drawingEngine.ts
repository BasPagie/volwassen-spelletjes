import type {
  GameRoom,
  DrawingSettings,
  DrawingPlayerScore,
  DrawingClientState,
  DrawingStroke,
  DrawingWordChoice,
} from '../../shared/types.js';
import { pickWordChoices } from './drawingWordStore.js';

// ─── Game Instance ─────────────────────────────────────
interface DrawingInstance {
  roomId: string;
  settings: DrawingSettings;
  turnOrder: string[];           // player IDs in draw order
  playerInfo: Map<string, { nickname: string; avatarUrl: string }>;
  scores: Map<string, { score: number; roundScore: number; streak: number }>;

  currentRound: number;          // 1-based
  totalRounds: number;
  currentTurnInRound: number;    // 0-based index into turnOrder
  phase: 'picking' | 'drawing' | 'reveal' | 'finished';

  currentDrawerId: string;
  currentWord: string | null;
  wordLength: number;
  usedWords: Set<string>;
  wordChoices: DrawingWordChoice[];

  strokes: DrawingStroke[];
  correctGuessers: string[];     // ordered by time
  guessTimestamps: Map<string, number>; // playerId -> epoch ms when they guessed correctly

  turnStartTime: number;         // epoch ms
  turnTimer: ReturnType<typeof setInterval> | null;
  revealTimer: ReturnType<typeof setTimeout> | null;
  hintRevealedIndices: Set<number>;
  hintTimer: ReturnType<typeof setInterval> | null;

  finished: boolean;
}

const activeGames = new Map<string, DrawingInstance>();

// ─── Answer Matching ───────────────────────────────────
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isGuessCorrect(guess: string, word: string): boolean {
  const normalizedGuess = normalize(guess);
  const normalizedWord = normalize(word);
  if (!normalizedGuess || !normalizedWord) return false;
  return normalizedGuess === normalizedWord;
}

// Detect if guess contains the word (prevent giving away answer in chat)
function guessContainsWord(guess: string, word: string): boolean {
  const normalizedGuess = normalize(guess);
  const normalizedWord = normalize(word);
  // Only block if the full word appears as a substring but is NOT an exact match (not for very short words)
  if (normalizedWord.length >= 4 && normalizedGuess.includes(normalizedWord) && normalizedGuess !== normalizedWord) return true;
  return false;
}

// ─── Hint Generation ───────────────────────────────────
function generateHint(word: string, revealedIndices: Set<number>): string {
  return word
    .split('')
    .map((ch, i) => {
      if (ch === ' ') return '\u00A0\u00A0\u00A0\u00A0';
      if (revealedIndices.has(i)) return ch;
      return '_';
    })
    .join(' ');
}

function getLetterIndicesToReveal(word: string): number[] {
  // Get indices of non-space characters that can be revealed
  const indices: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== ' ') indices.push(i);
  }
  // Shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

// ─── Scoring ───────────────────────────────────────────
function calculateGuesserScore(position: number, totalGuessers: number, difficulty: string): number {
  // First guesser gets max, decreasing for later guessers
  const baseMax = difficulty === 'hard' ? 200 : difficulty === 'medium' ? 150 : 100;
  const minScore = 25;
  if (totalGuessers <= 1) return baseMax;
  const decrement = Math.floor((baseMax - minScore) / totalGuessers);
  return Math.max(minScore, baseMax - decrement * (position - 1));
}

function calculateDrawerScore(correctGuessers: number, totalGuessers: number): number {
  if (correctGuessers === 0) return 0;
  // Drawer gets bonus proportional to how many guessed correctly
  const ratio = correctGuessers / totalGuessers;
  return Math.round(50 + 100 * ratio); // 50-150 points
}

// ─── Game Lifecycle ────────────────────────────────────
export function startDrawingGame(
  room: GameRoom,
  settings: DrawingSettings,
): DrawingInstance | { error: string } {
  const players = settings.hostPlays
    ? room.players.filter((p) => p.connected || p.isBot)
    : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

  // Need at least 2 players total (bots count as guessers)
  if (players.length < 2) {
    return { error: 'Minimaal 2 spelers nodig voor de tekenwedstrijd' };
  }

  // Turn order: only humans draw (bots are guessers only)
  const humanPlayers = players.filter((p) => !p.isBot);
  const turnOrder = humanPlayers.length > 0
    ? humanPlayers.map((p) => p.id)
    : [players[0].id]; // fallback: first player draws
  // Shuffle turn order
  for (let i = turnOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [turnOrder[i], turnOrder[j]] = [turnOrder[j], turnOrder[i]];
  }

  const playerInfo = new Map<string, { nickname: string; avatarUrl: string }>();
  const scores = new Map<string, { score: number; roundScore: number; streak: number }>();
  for (const p of players) {
    playerInfo.set(p.id, { nickname: p.nickname, avatarUrl: p.avatarUrl });
    scores.set(p.id, { score: 0, roundScore: 0, streak: 0 });
  }

  const instance: DrawingInstance = {
    roomId: room.roomId,
    settings,
    turnOrder,
    playerInfo,
    scores,
    currentRound: 1,
    totalRounds: settings.rounds,
    currentTurnInRound: 0,
    phase: 'picking',
    currentDrawerId: turnOrder[0],
    currentWord: null,
    wordLength: 0,
    usedWords: new Set(),
    wordChoices: [],
    strokes: [],
    correctGuessers: [],
    guessTimestamps: new Map(),
    turnStartTime: 0,
    turnTimer: null,
    revealTimer: null,
    hintRevealedIndices: new Set(),
    hintTimer: null,
    finished: false,
  };

  activeGames.set(room.roomId, instance);
  return instance;
}

export function getDrawingInstance(roomId: string): DrawingInstance | undefined {
  return activeGames.get(roomId);
}

export function cleanupDrawingGame(roomId: string): void {
  const inst = activeGames.get(roomId);
  if (!inst) return;
  if (inst.turnTimer) clearInterval(inst.turnTimer);
  if (inst.revealTimer) clearTimeout(inst.revealTimer);
  if (inst.hintTimer) clearInterval(inst.hintTimer);
  activeGames.delete(roomId);
}

// ─── Turn Management ───────────────────────────────────
export function getWordChoicesForDrawer(roomId: string): DrawingWordChoice[] {
  const inst = activeGames.get(roomId);
  if (!inst) return [];

  const choices = pickWordChoices(inst.settings.categoryIds, inst.settings.customWords, inst.usedWords);
  inst.wordChoices = choices;
  inst.phase = 'picking';
  return choices;
}

export function selectWord(roomId: string, word: string): boolean {
  const inst = activeGames.get(roomId);
  if (!inst || inst.phase !== 'picking') return false;

  // Validate the word is one of the choices
  const valid = inst.wordChoices.some((c) => c.word === word);
  if (!valid) return false;

  inst.currentWord = word;
  inst.wordLength = word.length;
  inst.usedWords.add(word.toLowerCase());
  inst.phase = 'drawing';
  inst.strokes = [];
  inst.correctGuessers = [];
  inst.guessTimestamps.clear();
  inst.hintRevealedIndices = new Set();
  inst.turnStartTime = Date.now();

  return true;
}

export function addStroke(roomId: string, stroke: DrawingStroke): boolean {
  const inst = activeGames.get(roomId);
  if (!inst || inst.phase !== 'drawing') return false;
  inst.strokes.push(stroke);
  return true;
}

export function clearCanvas(roomId: string): boolean {
  const inst = activeGames.get(roomId);
  if (!inst || inst.phase !== 'drawing') return false;
  inst.strokes = [];
  return true;
}

export function undoStroke(roomId: string): boolean {
  const inst = activeGames.get(roomId);
  if (!inst || inst.phase !== 'drawing') return false;
  if (inst.strokes.length === 0) return false;
  inst.strokes.pop();
  return true;
}

export interface GuessResult {
  correct: boolean;
  alreadyGuessed: boolean;
  isDrawer: boolean;
  containsWord: boolean;
  isClose: boolean;
  position?: number;
  score?: number;
}

function isGuessClose(guess: string, word: string): boolean {
  const g = normalize(guess);
  const w = normalize(word);
  if (!g || !w) return false;
  // Close if levenshtein distance is small but not correct
  const dist = levenshtein(g, w);
  const threshold = w.length <= 5 ? 2 : w.length <= 8 ? 3 : 4;
  return dist > 0 && dist <= threshold;
}

export function processGuess(roomId: string, playerId: string, guess: string): GuessResult {
  const inst = activeGames.get(roomId);
  if (!inst || inst.phase !== 'drawing' || !inst.currentWord) {
    return { correct: false, alreadyGuessed: false, isDrawer: false, containsWord: false, isClose: false };
  }

  // Drawer can't guess
  if (playerId === inst.currentDrawerId) {
    return { correct: false, alreadyGuessed: false, isDrawer: true, containsWord: false, isClose: false };
  }

  // Already guessed
  if (inst.correctGuessers.includes(playerId)) {
    return { correct: false, alreadyGuessed: true, isDrawer: false, containsWord: false, isClose: false };
  }

  // Check correctness first (before containsWord, so exact matches are never silently rejected)
  if (isGuessCorrect(guess, inst.currentWord)) {
    inst.correctGuessers.push(playerId);
    inst.guessTimestamps.set(playerId, Date.now());
    const position = inst.correctGuessers.length;
    const totalGuessers = getGuesserCount(inst);
    const difficulty = inst.wordChoices.find((c) => c.word === inst.currentWord)?.difficulty || 'medium';
    const score = calculateGuesserScore(position, totalGuessers, difficulty);

    // Update score
    const playerScore = inst.scores.get(playerId);
    if (playerScore) {
      playerScore.score += score;
      playerScore.roundScore += score;
      playerScore.streak += 1;
    }

    return { correct: true, alreadyGuessed: false, isDrawer: false, containsWord: false, isClose: false, position, score };
  }

  // Check if guess contains the word (block showing in chat)
  if (guessContainsWord(guess, inst.currentWord)) {
    return { correct: false, alreadyGuessed: false, isDrawer: false, containsWord: true, isClose: false };
  }

  // Wrong guess — check if close
  const close = isGuessClose(guess, inst.currentWord);

  const playerScore = inst.scores.get(playerId);
  if (playerScore) {
    playerScore.streak = 0;
  }

  return { correct: false, alreadyGuessed: false, isDrawer: false, containsWord: false, isClose: close };
}

function getGuesserCount(inst: DrawingInstance): number {
  // All players minus the drawer
  return inst.scores.size - 1;
}

export function allGuessersCorrect(roomId: string): boolean {
  const inst = activeGames.get(roomId);
  if (!inst) return false;
  return inst.correctGuessers.length >= getGuesserCount(inst);
}

export function endTurn(roomId: string): { word: string; drawerScore: number } | null {
  const inst = activeGames.get(roomId);
  if (!inst || !inst.currentWord) return null;

  // Stop timers
  if (inst.turnTimer) { clearInterval(inst.turnTimer); inst.turnTimer = null; }
  if (inst.hintTimer) { clearInterval(inst.hintTimer); inst.hintTimer = null; }

  // Award drawer score
  const totalGuessers = getGuesserCount(inst);
  const drawerScore = calculateDrawerScore(inst.correctGuessers.length, totalGuessers);
  const drawerScoreEntry = inst.scores.get(inst.currentDrawerId);
  if (drawerScoreEntry) {
    drawerScoreEntry.score += drawerScore;
    drawerScoreEntry.roundScore += drawerScore;
  }

  inst.phase = 'reveal';
  return { word: inst.currentWord, drawerScore };
}

export function advanceTurn(roomId: string): 'next-turn' | 'next-round' | 'game-over' {
  const inst = activeGames.get(roomId);
  if (!inst) return 'game-over';

  inst.currentTurnInRound++;

  if (inst.currentTurnInRound >= inst.turnOrder.length) {
    // Round done
    inst.currentRound++;
    inst.currentTurnInRound = 0;

    // Reset round scores
    for (const [, s] of inst.scores) {
      s.roundScore = 0;
    }

    if (inst.currentRound > inst.totalRounds) {
      inst.phase = 'finished';
      inst.finished = true;
      return 'game-over';
    }

    // Shuffle turn order for new round
    for (let i = inst.turnOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [inst.turnOrder[i], inst.turnOrder[j]] = [inst.turnOrder[j], inst.turnOrder[i]];
    }
  }

  // Set up next drawer
  inst.currentDrawerId = inst.turnOrder[inst.currentTurnInRound];
  inst.currentWord = null;
  inst.wordLength = 0;
  inst.strokes = [];
  inst.correctGuessers = [];
  inst.guessTimestamps.clear();
  inst.hintRevealedIndices = new Set();
  inst.phase = 'picking';

  return inst.currentTurnInRound === 0 ? 'next-round' : 'next-turn';
}

// ─── Hint System ───────────────────────────────────────
export function startHintTimer(
  roomId: string,
  onHintReveal: (hint: string) => void,
): void {
  const inst = activeGames.get(roomId);
  if (!inst || !inst.currentWord) return;

  const word = inst.currentWord;
  const revealOrder = getLetterIndicesToReveal(word);
  // Reveal ~40% of letters over the draw time, spaced evenly
  const lettersToReveal = Math.floor(revealOrder.length * 0.4);
  const intervalMs = (inst.settings.drawTimeSeconds * 1000) / (lettersToReveal + 1);
  let revealIndex = 0;

  inst.hintTimer = setInterval(() => {
    if (revealIndex >= lettersToReveal || inst.phase !== 'drawing') {
      if (inst.hintTimer) clearInterval(inst.hintTimer);
      inst.hintTimer = null;
      return;
    }
    inst.hintRevealedIndices.add(revealOrder[revealIndex]);
    revealIndex++;
    const hint = generateHint(word, inst.hintRevealedIndices);
    onHintReveal(hint);
  }, intervalMs);
}

// ─── State Building ────────────────────────────────────
export function buildDrawerState(roomId: string): DrawingClientState | null {
  const inst = activeGames.get(roomId);
  if (!inst) return null;

  const elapsed = inst.phase === 'drawing' ? Date.now() - inst.turnStartTime : 0;
  const totalTimeMs = inst.settings.drawTimeSeconds * 1000;
  const timeRemainingMs = Math.max(0, totalTimeMs - elapsed);

  const drawerInfo = inst.playerInfo.get(inst.currentDrawerId);
  return {
    phase: inst.phase,
    drawerId: inst.currentDrawerId,
    drawerName: drawerInfo?.nickname || '???',
    currentRound: inst.currentRound,
    totalRounds: inst.totalRounds,
    turnInRound: inst.currentTurnInRound + 1,
    totalTurnsInRound: inst.turnOrder.length,
    word: inst.currentWord,              // drawer sees the word
    wordLength: inst.wordLength,
    hint: inst.currentWord ? generateHint(inst.currentWord, inst.hintRevealedIndices) : '',
    timeRemainingMs,
    totalTimeMs,
    scores: buildScores(inst),
    correctGuessers: inst.correctGuessers,
    guessersRemaining: getGuesserCount(inst) - inst.correctGuessers.length,
    revealWord: inst.phase === 'reveal' ? inst.currentWord || undefined : undefined,
    wordChoices: inst.phase === 'picking' ? inst.wordChoices : undefined,
  };
}

export function buildGuesserState(roomId: string): DrawingClientState | null {
  const inst = activeGames.get(roomId);
  if (!inst) return null;

  const elapsed = inst.phase === 'drawing' ? Date.now() - inst.turnStartTime : 0;
  const totalTimeMs = inst.settings.drawTimeSeconds * 1000;
  const timeRemainingMs = Math.max(0, totalTimeMs - elapsed);

  const drawerInfo = inst.playerInfo.get(inst.currentDrawerId);
  return {
    phase: inst.phase,
    drawerId: inst.currentDrawerId,
    drawerName: drawerInfo?.nickname || '???',
    currentRound: inst.currentRound,
    totalRounds: inst.totalRounds,
    turnInRound: inst.currentTurnInRound + 1,
    totalTurnsInRound: inst.turnOrder.length,
    word: null,                           // guessers don't see the word
    wordLength: inst.wordLength,
    hint: inst.currentWord ? generateHint(inst.currentWord, inst.hintRevealedIndices) : '',
    timeRemainingMs,
    totalTimeMs,
    scores: buildScores(inst),
    correctGuessers: inst.correctGuessers,
    guessersRemaining: getGuesserCount(inst) - inst.correctGuessers.length,
    revealWord: inst.phase === 'reveal' ? inst.currentWord || undefined : undefined,
  };
}

export function buildScores(inst: DrawingInstance): DrawingPlayerScore[] {
  const result: DrawingPlayerScore[] = [];
  for (const [playerId, score] of inst.scores) {
    const info = inst.playerInfo.get(playerId);
    if (!info) continue;
    result.push({
      playerId,
      nickname: info.nickname,
      avatarUrl: info.avatarUrl,
      score: score.score,
      roundScore: score.roundScore,
      streak: score.streak,
    });
  }
  // Sort by total score descending
  result.sort((a, b) => b.score - a.score);
  return result;
}

export function getFinalScores(roomId: string): DrawingPlayerScore[] | null {
  const inst = activeGames.get(roomId);
  if (!inst) return null;
  return buildScores(inst);
}

export function getStrokes(roomId: string): DrawingStroke[] {
  const inst = activeGames.get(roomId);
  if (!inst) return [];
  return inst.strokes;
}

export function getDrawerId(roomId: string): string | null {
  const inst = activeGames.get(roomId);
  if (!inst) return null;
  return inst.currentDrawerId;
}
