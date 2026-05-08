// ─── Game Category ─────────────────────────────────────
export type GameCategory = 'muziek' | 'what-am-i' | 'drawing' | 'snelste-vinger';

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
export type AttemptsMode = 'limited' | 'unlimited';

export interface GameSettings {
  attemptsMode: AttemptsMode;
  maxAttempts: number; // only used when attemptsMode = 'limited'
  timeLimitSeconds: number | null; // null = no limit
  hostControl: boolean; // true = host controls, false = democratic
  hostPlays: boolean; // false = host spectates instead of playing
}

export const DEFAULT_SETTINGS: GameSettings = {
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
  drawingSettings?: DrawingSettings;
  muziekSettings?: MuziekSettings;
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
  questionsBeforeGuess: number;    // 0 = no limit, otherwise must ask this many questions before guessing
}

export const DEFAULT_WHATAMI_SETTINGS: WhatAmISettings = {
  packIds: ['popculture', 'muziek', 'memes-internet', 'film', 'series', 'games', 'superhelden', 'mythologie', 'geschiedenis', 'cartoon', 'disney', 'anime', 'nederland-nu', 'league-of-legends'],
  customCharacters: [],
  timeLimitSeconds: 600,
  hostPlays: true,
  gameMode: 'turns',
  turnSeconds: 120,
  questionsPerTurn: 1,
  questionsBeforeGuess: 3,
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
  questionsAsked: number;         // self-tracked questions asked before guessing
}

export interface WhatAmIClientGameState {
  status: 'playing' | 'finished';
  gameMode: WhatAmIGameMode;
  packName: string;
  timeLimitSeconds: number | null;
  startTime: number;              // epoch ms
  timeRemainingMs: number | null;
  players: WhatAmIPlayerState[];
  questionsBeforeGuess: number;   // 0 = no limit
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
  categoryIds: ['popcultuur', 'gaming', 'muziek', 'internet', 'series', 'wetenschap', 'random', 'eten-drinken', 'aardrijkskunde', 'geschiedenis', 'nederland', 'league-of-legends', 'dwergen'],
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

// ─── Tekenwedstrijd (Drawing / Pictionary) ─────────────
export interface DrawingSettings {
  rounds: number;                  // how many rounds (each round = every player draws once)
  drawTimeSeconds: number;         // seconds per turn to draw
  categoryIds: string[];           // selected word categories
  customWords: string[];           // host-added custom words
  hostPlays: boolean;
}

export const DEFAULT_DRAWING_SETTINGS: DrawingSettings = {
  rounds: 2,
  drawTimeSeconds: 60,
  categoryIds: ['dieren', 'eten', 'voorwerpen', 'acties', 'films', 'gaming-popculture', 'spicy'],
  customWords: [],
  hostPlays: true,
};

export interface DrawingPoint {
  x: number;  // 0-1 normalized
  y: number;  // 0-1 normalized
}

export interface DrawingStroke {
  points: DrawingPoint[];
  color: string;
  width: number;  // px (on a 600px-wide canvas reference)
}

export interface DrawingPlayerScore {
  playerId: string;
  nickname: string;
  avatarUrl: string;
  score: number;
  roundScore: number;
  streak: number;
}

export interface DrawingWordChoice {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DrawingClientState {
  phase: 'picking' | 'drawing' | 'reveal' | 'finished';
  drawerId: string;
  drawerName: string;
  currentRound: number;
  totalRounds: number;
  turnInRound: number;
  totalTurnsInRound: number;
  word: string | null;             // shown to drawer only, null for guessers
  wordLength: number;
  hint: string;                    // e.g. "_ l _ _ a _ t" — progressive reveal
  timeRemainingMs: number;
  totalTimeMs: number;
  scores: DrawingPlayerScore[];
  correctGuessers: string[];       // playerIds who guessed correctly this turn
  guessersRemaining: number;       // how many still need to guess
  revealWord?: string;             // shown to all during reveal phase
  wordChoices?: DrawingWordChoice[]; // sent to drawer during picking phase
}

// ─── Muziek (Raad het Nummer) ──────────────────────────
export interface MuziekSettings {
  categoryIds: string[];           // selected song categories
  questionCount: number;           // how many songs per game
  clipDuration: number;            // seconds of audio to play (5, 10, 15)
  guessMode: 'title' | 'artist' | 'both'; // what counts as correct
  hostPlays: boolean;
  pointsCorrect: number;
  pointsWrongPenalty: number;
  streakBonus: boolean;
  snelsteRader: boolean;           // true = first correct ends song (old behavior)
  meerkeuze: boolean;              // true = show 4 multiple-choice options
  heardleMode: boolean;            // true = progressive reveal (1s→2s→4s→7s→11s→16s)
  heardleGuessMode: 'one-per-phase' | 'unlimited'; // one guess per phase or unlimited
}

export const HEARDLE_PHASES = [1, 2, 4, 7, 11, 16] as const;

export const DEFAULT_MUZIEK_SETTINGS: MuziekSettings = {
  categoryIds: ['pop', 'memes', 'anime', 'gaming', 'edm', 'dutch', '80s-90s', '2000s', '2010s-nu', 'classics'],
  questionCount: 15,
  clipDuration: 15,
  guessMode: 'both',
  hostPlays: true,
  pointsCorrect: 100,
  pointsWrongPenalty: 25,
  streakBonus: true,
  snelsteRader: false,
  meerkeuze: false,
  heardleMode: false,
  heardleGuessMode: 'unlimited',
};

export interface MuziekPlayerScore {
  playerId: string;
  nickname: string;
  avatarUrl: string;
  score: number;
  streak: number;
  correctCount: number;
  wrongCount: number;
  heardleStatus?: 'guessing' | 'skipped' | 'gave-up' | 'correct' | 'locked-out';
}

export interface MuziekClientState {
  songIndex: number;
  totalSongs: number;
  previewUrl: string;
  clipDuration: number;            // seconds
  clipStartOffset: number;         // where in the 30s preview to start (seconds)
  category: string;
  timeRemainingMs: number;
  totalTimeMs: number;
  answered: boolean;
  buzzedWrong: boolean;
  winnerId: string | null;
  winnerName: string | null;
  correctTitle: string | null;     // revealed after song ends
  correctArtist: string | null;    // revealed after song ends
  coverUrl: string | null;         // revealed after song ends
  media: string | null;            // source game/anime (revealed after song ends)
  scores: MuziekPlayerScore[];
  phase: 'listening' | 'reveal' | 'finished';
  options?: string[];              // multiple-choice options (meerkeuze mode)
  // Heardle mode fields
  heardleMode?: boolean;
  heardlePhase?: number;           // 0-5 (which phase we're in)
  heardleTotalPhases?: number;     // 6
  heardlePhaseDuration?: number;   // current phase's audio length in seconds
  heardleLockedOut?: boolean;      // one-per-phase: player is locked out this phase
  heardleSkipped?: boolean;        // this player has voted to skip
  heardleGaveUp?: boolean;          // this player gave up on this song
  heardleSkipCount?: number;       // how many players have voted to skip
  heardlePlayersRemaining?: number; // players who haven't answered correctly yet
}

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
  correctAnswers: number;
  wrongGuesses: number;
  timeUsedMs: number;
  roundScore: number;
}

export interface RoundResult {
  roundIndex: number;
  roundType: string;
  results: PlayerRoundResult[];
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
    characterName?: string;
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
  'whatami:asked-question': () => void;
  'whatami:skip-turn': () => void;
  'whatami:give-up': () => void;
  'whatami:force-end': () => void;
  'whatami:reroll': (data: { targetPlayerId: string }) => void;
  'whatami:request-state': () => void;
  'host:give-hint': (data: { hint: string }) => void;
  // ─── Snelste Vinger ────────────────────────────────
  'snelstevinger:update-settings': (settings: SnelsteVingerSettings) => void;
  'snelstevinger:start-game': () => void;
  'snelstevinger:buzz': (data: { answer: string }) => void;
  // ─── Tekenwedstrijd ────────────────────────────────
  'drawing:update-settings': (settings: DrawingSettings) => void;
  'drawing:start-game': () => void;
  'drawing:pick-word': (data: { word: string }) => void;
  'drawing:stroke': (data: { stroke: DrawingStroke }) => void;
  'drawing:fill': (data: { color: string; x: number; y: number }) => void;
  'drawing:clear-canvas': () => void;
  'drawing:undo': () => void;
  'drawing:guess': (data: { guess: string }) => void;
  // ─── Muziek ────────────────────────────────────────
  'muziek:update-settings': (settings: MuziekSettings) => void;
  'muziek:start-game': () => void;
  'muziek:buzz': (data: { answer: string }) => void;
  'muziek:heardle-skip': () => void;
  'muziek:give-up': () => void;
  // ─── Briefing ──────────────────────────────────────
  'player-ready': () => void;
}

export interface ServerToClientEvents {
  'room-created': (data: { room: GameRoom; player: Player }) => void;
  'room-joined': (data: { room: GameRoom; player: Player }) => void;
  'player-joined': (data: { player: Player }) => void;
  'player-left': (data: { playerId: string; newHostId?: string; disconnected?: boolean }) => void;
  'settings-updated': (settings: GameSettings) => void;
  'game-started': () => void;
  'countdown': (data: { count: number }) => void;
  'player-progress': (data: PlayerProgress[]) => void;
  'time-update': (data: { timeRemainingMs: number }) => void;
  'round-end': (data: RoundResult) => void;
  'game-end': (data: FinalResults) => void;
  'score-updated': (data: { playerId: string; score: number }) => void;
  'error': (data: { message: string }) => void;
  'kicked': () => void;
  'room-closed': () => void;
  'reconnected': (data: { room: GameRoom; player: Player; phase: 'lobby' | 'playing' | 'round-end' | 'finished'; roundResult: RoundResult | null; finalResults: FinalResults | null; playerProgress: PlayerProgress[] }) => void;
  'reconnect-failed': () => void;
  'room-check': (data: { exists: boolean; joinable: boolean; gameCategory?: string | null }) => void;
  // ─── Wie Ben Ik? ───────────────────────────────────
  'whatami:settings-updated': (settings: WhatAmISettings) => void;
  'whatami:state-update': (state: WhatAmIClientGameState) => void;
  'whatami:guess-result': (data: { correct: boolean; cooldownUntil?: number; characterName?: string }) => void;
  'whatami:player-guessed': (data: { playerId: string; placement: number; score: number }) => void;
  'whatami:game-end': (data: WhatAmIClientGameState) => void;
  'whatami:reroll-result': (data: { success: boolean; error?: string }) => void;
  'hint-given': (data: { hint: string }) => void;
  // ─── Snelste Vinger ────────────────────────────────
  'snelstevinger:settings-updated': (settings: SnelsteVingerSettings) => void;
  'snelstevinger:question': (data: SnelsteVingerClientState) => void;
  'snelstevinger:buzz-result': (data: { correct: boolean; penalty?: number }) => void;
  'snelstevinger:question-won': (data: { winnerId: string; winnerName: string; correctAnswer: string; scores: SnelsteVingerPlayerScore[] }) => void;
  'snelstevinger:question-timeout': (data: { correctAnswer: string; scores: SnelsteVingerPlayerScore[] }) => void;
  'snelstevinger:game-end': (data: { scores: SnelsteVingerPlayerScore[] }) => void;
  // ─── Tekenwedstrijd ────────────────────────────────
  'drawing:settings-updated': (settings: DrawingSettings) => void;
  'drawing:state-update': (data: DrawingClientState) => void;
  'drawing:word-choices': (data: { choices: DrawingWordChoice[] }) => void;
  'drawing:stroke': (data: { stroke: DrawingStroke }) => void;
  'drawing:fill': (data: { color: string; x: number; y: number }) => void;
  'drawing:clear-canvas': () => void;
  'drawing:undo': () => void;
  'drawing:guess-result': (data: { correct: boolean; word?: string }) => void;
  'drawing:guess-broadcast': (data: { playerName: string; guess: string; isClose: boolean }) => void;
  'drawing:player-guessed': (data: { playerId: string; playerName: string; position: number; score: number }) => void;
  'drawing:turn-end': (data: { word: string; scores: DrawingPlayerScore[] }) => void;
  'drawing:game-end': (data: { scores: DrawingPlayerScore[] }) => void;
  // ─── Muziek ────────────────────────────────────────
  'muziek:settings-updated': (settings: MuziekSettings) => void;
  'muziek:song': (data: MuziekClientState) => void;
  'muziek:buzz-result': (data: { correct: boolean; penalty?: number; position?: number; mediaOnly?: boolean; points?: number }) => void;
  'muziek:song-won': (data: { winnerId: string; winnerName: string; correctTitle: string; correctArtist: string; coverUrl: string | null; media: string | null; scores: MuziekPlayerScore[] }) => void;
  'muziek:song-timeout': (data: { correctTitle: string; correctArtist: string; coverUrl: string | null; media: string | null; scores: MuziekPlayerScore[] }) => void;
  'muziek:scores-updated': (data: { scores: MuziekPlayerScore[] }) => void;
  'muziek:game-end': (data: { scores: MuziekPlayerScore[] }) => void;
  // ─── Briefing ──────────────────────────────────────
  'briefing-start': (data: { briefingKey: string; roundType?: string; gameCategory: GameCategory }) => void;
  'briefing-ready-count': (data: { ready: number; total: number }) => void;
}

// ─── Pre-made Avatars ──────────────────────────────────
export const PREMADE_AVATARS = [
  '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵',
  '🦄', '🐙', '🦋', '🐢', '🦜', '🐳', '🦩', '🐘',
  '🎃', '🤖', '👽', '🎭',
];
