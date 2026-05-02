// ─── Game Category ─────────────────────────────────────
export type GameCategory = 'woord' | 'what-am-i' | 'drawing' | 'snelste-vinger';

// ─── Player ────────────────────────────────────────────
export interface Player {
  id: string;
  nickname: string;
  avatarUrl: string; // base64 data URL or path to pre-made avatar
  isHost: boolean;
  isBot?: boolean;
  score: number;
  connected: boolean;
}

// ─── Game Settings ─────────────────────────────────────
export type RoundType = 'connections' | 'puzzelronde' | 'opendeur' | 'lingo';
export type AttemptsMode = 'limited' | 'unlimited';
export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export interface RoundConfig {
  type: RoundType;
  difficulty: PuzzleDifficulty;
  puzzleId?: string; // undefined = random
  customPuzzle?: ConnectionsPuzzle | PuzzelrondePuzzle | OpenDeurPuzzle | LingoPuzzle;
}

export interface GameSettings {
  rounds: RoundConfig[];
  attemptsMode: AttemptsMode;
  maxAttempts: number; // only used when attemptsMode = 'limited'
  timeLimitSeconds: number | null; // null = no limit
  hostControl: boolean; // true = host controls, false = democratic
  hostPlays: boolean; // false = host spectates instead of playing
}

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: [
    { type: 'connections', difficulty: 'medium' },
    { type: 'opendeur', difficulty: 'medium' },
    { type: 'puzzelronde', difficulty: 'medium' },
    { type: 'lingo', difficulty: 'medium' },
  ],
  attemptsMode: 'limited',
  maxAttempts: 6,
  timeLimitSeconds: 120,
  hostControl: true,
  hostPlays: true,
};

// ─── Room ──────────────────────────────────────────────
export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface GameRoom {
  roomId: string;
  players: Player[];
  settings: GameSettings;
  status: RoomStatus;
  currentRoundIndex: number;
  gameCategory: GameCategory;
  whatAmISettings?: WhatAmISettings;
  snelsteVingerSettings?: SnelsteVingerSettings;
}

// ─── Wie Ben Ik? (What Am I?) ──────────────────────────
export interface WhatAmICharacter {
  id: string;
  name: string;
  imageUrl?: string;
  category?: string;
}

export interface WhatAmICharacterPack {
  id: string;
  name: string;
  description: string;
  characters: WhatAmICharacter[];
}

export type WhatAmIGameMode = 'free-for-all' | 'turns';

export interface WhatAmISettings {
  packIds: string[];               // selected packs (can be multiple); empty = packs only via customCharacters
  customCharacters: WhatAmICharacter[]; // always merged in if non-empty
  timeLimitSeconds: number | null; // null = until everyone guessed (free-for-all only)
  hostPlays: boolean;
  gameMode: WhatAmIGameMode;       // free-for-all or turn-based
  turnSeconds: number;             // seconds per turn in turn-based mode
  questionsPerTurn: number;        // how many guesses per round (1, 2, or 3)
}

export const DEFAULT_WHATAMI_SETTINGS: WhatAmISettings = {
  packIds: ['popculture', 'muziek', 'memes-internet', 'fictiepersonages', 'nederland-nu'],
  customCharacters: [],
  timeLimitSeconds: 600,
  hostPlays: true,
  gameMode: 'free-for-all',
  turnSeconds: 60,
  questionsPerTurn: 1,
};

export interface WhatAmIPlayerState {
  playerId: string;
  /** The character assigned to this player — null when sent to the player themselves */
  assignedCharacter: WhatAmICharacter | null;
  guessedCorrectly: boolean;
  gaveUp: boolean;
  placement: number | null;       // 1-based, null = not finished yet
  wrongGuesses: number;
  cooldownUntil: number | null;   // epoch ms, null = not in cooldown
  score: number;
}

export interface WhatAmIClientGameState {
  status: 'playing' | 'finished';
  gameMode: WhatAmIGameMode;
  packName: string;
  timeLimitSeconds: number | null;
  startTime: number;              // epoch ms
  timeRemainingMs: number | null;
  players: WhatAmIPlayerState[];
  // Turn-based fields (only set when gameMode === 'turns')
  currentTurnPlayerId?: string;   // whose turn it is
  turnTimeRemainingMs?: number | null;   // ms left in current turn
  turnNumber?: number;            // overall turn count
}

// ─── Snelste Vinger (Fastest Finger) ───────────────────
export interface SnelsteVingerSettings {
  categoryIds: string[];           // selected trivia categories
  questionCount: number;           // how many questions per game
  timePerQuestion: number;         // seconds per question
  hostPlays: boolean;
  pointsCorrect: number;           // points for correct buzz
  pointsWrongPenalty: number;      // penalty for wrong buzz (positive number, subtracted)
  streakBonus: boolean;            // +25 per consecutive correct answer
}

export const DEFAULT_SNELSTEVINGER_SETTINGS: SnelsteVingerSettings = {
  categoryIds: ['popcultuur', 'gaming', 'muziek', 'internet', 'series', 'wetenschap', 'random'],
  questionCount: 15,
  timePerQuestion: 15,
  hostPlays: true,
  pointsCorrect: 100,
  pointsWrongPenalty: 25,
  streakBonus: true,
};

export interface SnelsteVingerPlayerScore {
  playerId: string;
  nickname: string;
  avatarUrl: string;
  score: number;
  streak: number;
  correctCount: number;
  wrongCount: number;
}

export interface SnelsteVingerClientState {
  questionIndex: number;
  totalQuestions: number;
  question: string;
  category: string;
  timeRemainingMs: number;
  totalTimeMs: number;              // total time per question in ms
  answered: boolean;              // current player already answered correctly this question
  buzzedWrong: boolean;           // current player buzzed wrong this question
  winnerId: string | null;        // who won this question (null = still open)
  winnerName: string | null;
  correctAnswer: string | null;   // revealed after question ends
  scores: SnelsteVingerPlayerScore[];
  phase: 'question' | 'reveal' | 'finished';
}

// ─── Puzzles ───────────────────────────────────────────
export interface ConnectionsGroup {
  label: string;
  words: string[];
  difficulty: 1 | 2 | 3 | 4; // 1=easiest(yellow), 4=hardest(purple)
}

export interface ConnectionsPuzzle {
  id: string;
  type: 'connections';
  difficulty: PuzzleDifficulty;
  groups: [ConnectionsGroup, ConnectionsGroup, ConnectionsGroup, ConnectionsGroup];
}

export interface PuzzelrondeGroup {
  words: string[];
  answer: string; // the connecting word players must guess
}

export interface PuzzelrondePuzzle {
  id: string;
  type: 'puzzelronde';
  difficulty: PuzzleDifficulty;
  groups: [PuzzelrondeGroup, PuzzelrondeGroup, PuzzelrondeGroup, PuzzelrondeGroup];
}

// ─── Open Deur ─────────────────────────────────────────
export interface OpenDeurQuestion {
  question: string; // e.g. "Wat weet je van de Olympische Spelen?"
  answers: string[]; // 4 correct answers
}

export interface OpenDeurPuzzle {
  id: string;
  type: 'opendeur';
  difficulty: PuzzleDifficulty;
  questions: [OpenDeurQuestion, OpenDeurQuestion, OpenDeurQuestion];
}

// ─── Lingo ─────────────────────────────────────────────
export type LingoLetterFeedback = 'correct' | 'present' | 'absent';

export interface LingoGuess {
  word: string;
  feedback: LingoLetterFeedback[];
}

export interface LingoWordResult {
  guessed: boolean;
  guessCount: number;
}

export interface LingoPuzzle {
  id: string;
  type: 'lingo';
  difficulty: PuzzleDifficulty;
  words: string[]; // 5 five-letter Dutch words
}

export type Puzzle = ConnectionsPuzzle | PuzzelrondePuzzle | OpenDeurPuzzle | LingoPuzzle;

// ─── Round State (sent to clients) ────────────────────
export interface ConnectionsRoundState {
  type: 'connections';
  words: string[]; // shuffled 16 words
  solvedGroups: ConnectionsGroup[];
  attemptsLeft: number | null; // null = unlimited
  timeRemainingMs: number | null;
}

export interface PuzzelrondeRoundState {
  type: 'puzzelronde';
  words: string[]; // shuffled 16 words (always all visible)
  solvedGroups: { words: string[]; answer: string }[];
  totalGroups: number;
  timeRemainingMs: number | null;
}

export interface OpenDeurRoundState {
  type: 'opendeur';
  currentQuestionIndex: number;
  question: string;
  foundAnswers: string[]; // answers the player has found so far
  answerHints: (string | null)[]; // per-slot: first letter hint if unfound, null if found (original answer order)
  foundAnswerSlots: (string | null)[]; // per-slot: matched answer text if found, null if unfound (original answer order)
  totalAnswers: number; // always 4
  totalQuestions: number; // always 3
  timeRemainingMs: number | null;
}

export interface LingoRoundState {
  type: 'lingo';
  wordLength: number;
  currentWordIndex: number;
  totalWords: number;
  firstLetter: string;
  guesses: LingoGuess[];
  maxGuessesPerWord: number;
  completedWords: LingoWordResult[];
  attemptsLeft: number | null;
  timeRemainingMs: number | null;
}

export type RoundState = ConnectionsRoundState | PuzzelrondeRoundState | OpenDeurRoundState | LingoRoundState;

// ─── Player Progress (shown to other players) ─────────
export interface PlayerProgress {
  playerId: string;
  solvedCount: number;
  finished: boolean;
  score: number;
}

// ─── Round Results ─────────────────────────────────────
export interface PlayerRoundResult {
  playerId: string;
  nickname: string;
  avatarUrl: string;
  groupsFound: number;
  correctAnswers: number; // puzzelronde: correct connecting words
  wrongGuesses: number;
  timeUsedMs: number;
  roundScore: number;
}

export interface RoundResult {
  roundIndex: number;
  roundType: RoundType;
  results: PlayerRoundResult[];
  correctGroups: ConnectionsGroup[] | PuzzelrondeGroup[] | OpenDeurQuestion[] | string[];
}

// ─── Final Results ─────────────────────────────────────
export interface FinalResults {
  players: {
    playerId: string;
    nickname: string;
    avatarUrl: string;
    totalScore: number;
    roundScores: number[];
    rank: number;
  }[];
  roundResults: RoundResult[];
}

// ─── Socket Events ─────────────────────────────────────
export interface ClientToServerEvents {
  'create-room': (data: { nickname: string; avatarUrl: string; gameCategory: GameCategory }) => void;
  'join-room': (data: { roomId: string; nickname: string; avatarUrl: string }) => void;
  'leave-room': () => void;
  'update-settings': (settings: GameSettings) => void;
  'start-game': () => void;
  'submit-group': (data: { words: string[] }) => void;
  'submit-answer': (data: { answer: string }) => void;
  'submit-opendeur-answer': (data: { answer: string }) => void;
  'submit-lingo-guess': (data: { guess: string }) => void;
  'skip-question': () => void;
  'next-round': () => void;
  'play-again': () => void;
  'update-score': (data: { playerId: string; score: number }) => void;
  'kick-player': (data: { playerId: string }) => void;
  'dev-add-bot': () => void;
  'dev-remove-bot': (data: { playerId: string }) => void;
  'reconnect-attempt': (data: { roomId: string; playerId: string }) => void;
  'check-room': (data: { roomId: string }) => void;
  // ─── Wie Ben Ik? ───────────────────────────────────
  'whatami:update-settings': (settings: WhatAmISettings) => void;
  'whatami:start-game': () => void;
  'whatami:guess': (data: { guess: string }) => void;
  'whatami:skip-turn': () => void;
  'whatami:give-up': () => void;
  'whatami:request-state': () => void;
  'host:give-hint': (data: { hint: string }) => void;
  // ─── Snelste Vinger ────────────────────────────────
  'snelstevinger:update-settings': (settings: SnelsteVingerSettings) => void;
  'snelstevinger:start-game': () => void;
  'snelstevinger:buzz': (data: { answer: string }) => void;
}

export interface ServerToClientEvents {
  'room-created': (data: { room: GameRoom; player: Player }) => void;
  'room-joined': (data: { room: GameRoom; player: Player }) => void;
  'player-joined': (data: { player: Player }) => void;
  'player-left': (data: { playerId: string; newHostId?: string; disconnected?: boolean }) => void;
  'settings-updated': (settings: GameSettings) => void;
  'game-started': () => void;
  'countdown': (data: { count: number }) => void;
  'round-start': (data: { roundIndex: number; roundState: RoundState; roundType: RoundType }) => void;
  'group-result': (data: { correct: boolean; group?: ConnectionsGroup | { words: string[] }; roundState: RoundState; hintWords?: string[] }) => void;
  'answer-result': (data: { correct: boolean; groupWords?: string[]; roundState: RoundState }) => void;
  'opendeur-result': (data: { correct: boolean; matchedAnswer?: string; roundState: RoundState; questionComplete?: boolean }) => void;
  'opendeur-next-question': (data: { roundState: RoundState; previousAnswers: string[] }) => void;
  'lingo-result': (data: { correct: boolean; feedback?: LingoLetterFeedback[]; roundState: RoundState }) => void;
  'lingo-next-word': (data: { roundState: RoundState; previousWord: string }) => void;
  'player-progress': (data: PlayerProgress[]) => void;
  'time-update': (data: { timeRemainingMs: number }) => void;
  'round-end': (data: RoundResult) => void;
  'game-end': (data: FinalResults) => void;
  'score-updated': (data: { playerId: string; score: number }) => void;
  'error': (data: { message: string }) => void;
  'kicked': () => void;
  'room-closed': () => void;
  'dev-mode-status': (data: { enabled: boolean }) => void;
  'reconnected': (data: { room: GameRoom; player: Player; roundState: RoundState | null; phase: 'lobby' | 'playing' | 'round-end' | 'finished'; roundResult: RoundResult | null; finalResults: FinalResults | null; playerProgress: PlayerProgress[] }) => void;
  'reconnect-failed': () => void;
  'room-check': (data: { exists: boolean; joinable: boolean; gameCategory?: string | null }) => void;
  // ─── Wie Ben Ik? ───────────────────────────────────
  'whatami:settings-updated': (settings: WhatAmISettings) => void;
  'whatami:state-update': (state: WhatAmIClientGameState) => void;
  'whatami:guess-result': (data: { correct: boolean; cooldownUntil?: number; characterName?: string }) => void;
  'whatami:player-guessed': (data: { playerId: string; placement: number; score: number }) => void;
  'whatami:game-end': (data: WhatAmIClientGameState) => void;
  'hint-given': (data: { hint: string }) => void;
  // ─── Snelste Vinger ────────────────────────────────
  'snelstevinger:settings-updated': (settings: SnelsteVingerSettings) => void;
  'snelstevinger:question': (data: SnelsteVingerClientState) => void;
  'snelstevinger:buzz-result': (data: { correct: boolean; penalty?: number }) => void;
  'snelstevinger:question-won': (data: { winnerId: string; winnerName: string; correctAnswer: string; scores: SnelsteVingerPlayerScore[] }) => void;
  'snelstevinger:question-timeout': (data: { correctAnswer: string; scores: SnelsteVingerPlayerScore[] }) => void;
  'snelstevinger:game-end': (data: { scores: SnelsteVingerPlayerScore[] }) => void;
}

// ─── Pre-made Avatars ──────────────────────────────────
export const PREMADE_AVATARS = [
  '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵',
  '🦄', '🐙', '🦋', '🐢', '🦜', '🐳', '🦩', '🐘',
  '🎃', '🤖', '👽', '🎭',
];
