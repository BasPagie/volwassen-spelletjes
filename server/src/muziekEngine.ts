import type { MuziekSettings, MuziekPlayerScore, MuziekClientState } from '../../shared/types.js';
import { getSongsByCategories, refreshPreviewUrls, type SongEntry } from './songStore.js';

// ─── Levenshtein distance (same as snelsteVingerEngine) ─
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
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

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function isAnswerCorrect(guess: string, song: SongEntry, guessMode: 'title' | 'artist' | 'both'): boolean {
  const normalizedGuess = normalize(guess);
  if (normalizedGuess.length < 2) return false;

  const targets: string[] = [];
  if (guessMode === 'title' || guessMode === 'both') {
    targets.push(normalize(song.title));
  }
  if (guessMode === 'artist' || guessMode === 'both') {
    targets.push(normalize(song.artist));
  }
  // Also check acceptedAnswers
  for (const ans of song.acceptedAnswers) {
    const normalizedAns = normalize(ans);
    if (guessMode === 'both' || targets.some(t => normalizedAns.includes(t) || t.includes(normalizedAns))) {
      targets.push(normalizedAns);
    }
  }

  for (const target of targets) {
    if (target.length === 0) continue;
    // Exact match
    if (normalizedGuess === target) return true;
    // Contains match (for longer titles/artists)
    if (target.length >= 5 && normalizedGuess.includes(target)) return true;
    if (normalizedGuess.length >= 5 && target.includes(normalizedGuess)) return true;
    // Fuzzy match with Levenshtein
    const maxDist = target.length >= 8 ? 2 : target.length >= 5 ? 1 : 0;
    if (levenshtein(normalizedGuess, target) <= maxDist) return true;
  }

  return false;
}

// ─── Game Instance ──────────────────────────────────────
interface MuziekInstance {
  roomId: string;
  settings: MuziekSettings;
  songs: SongEntry[];
  currentSongIndex: number;
  scores: Map<string, { score: number; streak: number; correctCount: number; wrongCount: number }>;
  players: { id: string; nickname: string; avatarUrl: string }[];
  timer: ReturnType<typeof setInterval> | null;
  timeRemainingMs: number;
  songEnding: boolean;
  buzzedWrongThisSong: Set<string>;
  answeredCorrectThisSong: string | null;
  answeredCorrectSet: Set<string>;   // all players who answered correctly this song
  currentOptions: string[];          // meerkeuze: 4 shuffled options (empty if not meerkeuze)
  onSongEnd: ((instance: MuziekInstance) => void) | null;
}

const activeGames = new Map<string, MuziekInstance>();

export function getMuziekInstance(roomId: string): MuziekInstance | undefined {
  return activeGames.get(roomId);
}

export async function startMuziekGame(
  roomId: string,
  settings: MuziekSettings,
  players: { id: string; nickname: string; avatarUrl: string }[],
  onSongEnd: (instance: MuziekInstance) => void,
): Promise<MuziekInstance> {
  // Cleanup any existing game
  cleanupMuziekGame(roomId);

  const songs = getSongsByCategories(settings.categoryIds, settings.questionCount);

  // Fetch fresh preview URLs from Deezer (tokens expire)
  await refreshPreviewUrls(songs);
  const scores = new Map<string, { score: number; streak: number; correctCount: number; wrongCount: number }>();
  for (const p of players) {
    scores.set(p.id, { score: 0, streak: 0, correctCount: 0, wrongCount: 0 });
  }

  const instance: MuziekInstance = {
    roomId,
    settings,
    songs,
    currentSongIndex: 0,
    scores,
    players,
    timer: null,
    timeRemainingMs: settings.clipDuration * 1000,
    songEnding: false,
    buzzedWrongThisSong: new Set(),
    answeredCorrectThisSong: null,
    answeredCorrectSet: new Set(),
    currentOptions: [],
    onSongEnd,
  };

  // Generate meerkeuze options for first song
  if (settings.meerkeuze) {
    instance.currentOptions = generateOptions(instance, 0);
  }

  activeGames.set(roomId, instance);
  startSongTimer(instance);
  return instance;
}

function startSongTimer(instance: MuziekInstance): void {
  if (instance.timer) clearInterval(instance.timer);
  instance.timeRemainingMs = instance.settings.clipDuration * 1000;
  instance.songEnding = false;

  instance.timer = setInterval(() => {
    instance.timeRemainingMs -= 100;
    if (instance.timeRemainingMs <= 0) {
      instance.timeRemainingMs = 0;
      endCurrentSong(instance);
    }
  }, 100);
}

function endCurrentSong(instance: MuziekInstance): void {
  if (instance.songEnding) return;
  instance.songEnding = true;
  if (instance.timer) {
    clearInterval(instance.timer);
    instance.timer = null;
  }
  instance.onSongEnd?.(instance);
}

// ─── Meerkeuze: generate 4 options ─────────────────────
function generateOptions(instance: MuziekInstance, songIndex: number): string[] {
  const song = instance.songs[songIndex];
  if (!song) return [];

  // Determine the correct answer based on guessMode
  const guessMode = instance.settings.guessMode;
  let correctAnswer: string;
  if (guessMode === 'artist') {
    correctAnswer = song.artist;
  } else {
    // 'title' or 'both' → use title as the displayed option
    correctAnswer = song.title;
  }

  // Collect wrong options from other songs in the game
  const wrongPool: string[] = [];
  for (let i = 0; i < instance.songs.length; i++) {
    if (i === songIndex) continue;
    const other = instance.songs[i];
    const option = guessMode === 'artist' ? other.artist : other.title;
    // Avoid duplicates
    if (option !== correctAnswer && !wrongPool.includes(option)) {
      wrongPool.push(option);
    }
  }

  // Shuffle and pick 3
  for (let i = wrongPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrongPool[i], wrongPool[j]] = [wrongPool[j], wrongPool[i]];
  }
  const wrongOptions = wrongPool.slice(0, 3);

  // Combine and shuffle all 4 options
  const options = [correctAnswer, ...wrongOptions];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

export function processMuziekBuzz(
  roomId: string,
  playerId: string,
  answer: string,
): { correct: boolean; penalty?: number; position?: number } | null {
  const instance = activeGames.get(roomId);
  if (!instance) return null;
  if (instance.songEnding) return null;

  // In snelsteRader mode: block after first correct (old behavior)
  if (instance.settings.snelsteRader && instance.answeredCorrectThisSong) return null;

  // Skip players who already answered correctly this song
  if (instance.answeredCorrectSet.has(playerId)) return null;

  const song = instance.songs[instance.currentSongIndex];
  if (!song) return null;

  // In meerkeuze mode: exact match against one of the options
  let correct: boolean;
  if (instance.settings.meerkeuze && instance.currentOptions.length > 0) {
    const normalizedAnswer = normalize(answer);
    correct = instance.currentOptions.some(opt => normalize(opt) === normalizedAnswer) &&
      isAnswerCorrect(answer, song, instance.settings.guessMode);
  } else {
    correct = isAnswerCorrect(answer, song, instance.settings.guessMode);
  }

  const playerScore = instance.scores.get(playerId);
  if (!playerScore) return null;

  if (correct) {
    const position = instance.answeredCorrectSet.size + 1; // 1st, 2nd, 3rd...
    instance.answeredCorrectSet.add(playerId);

    // Set first winner for display purposes
    if (!instance.answeredCorrectThisSong) {
      instance.answeredCorrectThisSong = playerId;
    }

    // Calculate points based on mode
    if (instance.settings.snelsteRader) {
      // Old behavior: full points, end song
      playerScore.streak++;
      const streakBonus = instance.settings.streakBonus ? Math.max(0, (playerScore.streak - 1) * 25) : 0;
      playerScore.score += instance.settings.pointsCorrect + streakBonus;
      playerScore.correctCount++;
      endCurrentSong(instance);
    } else {
      // Everyone scores: diminishing points based on position
      const multiplier = position === 1 ? 1.0 : position === 2 ? 0.75 : position === 3 ? 0.5 : 0.25;
      const basePoints = Math.floor(instance.settings.pointsCorrect * multiplier);
      playerScore.streak++;
      const streakBonus = instance.settings.streakBonus && position <= 2 ? Math.max(0, (playerScore.streak - 1) * 25) : 0;
      playerScore.score += basePoints + streakBonus;
      playerScore.correctCount++;
      // Don't end song — let timer expire
    }

    return { correct: true, position };
  } else {
    instance.buzzedWrongThisSong.add(playerId);
    playerScore.streak = 0;
    playerScore.wrongCount++;
    playerScore.score = Math.max(0, playerScore.score - instance.settings.pointsWrongPenalty);
    return { correct: false, penalty: instance.settings.pointsWrongPenalty };
  }
}

export function advanceToNextSong(roomId: string): boolean {
  const instance = activeGames.get(roomId);
  if (!instance) return false;

  instance.currentSongIndex++;
  if (instance.currentSongIndex >= instance.songs.length) {
    return false; // Game over
  }

  // Reset for next song
  instance.buzzedWrongThisSong.clear();
  instance.answeredCorrectThisSong = null;
  instance.answeredCorrectSet.clear();
  instance.songEnding = false;

  // Generate meerkeuze options for new song
  if (instance.settings.meerkeuze) {
    instance.currentOptions = generateOptions(instance, instance.currentSongIndex);
  } else {
    instance.currentOptions = [];
  }

  startSongTimer(instance);
  return true;
}

export function getMuziekScores(instance: MuziekInstance): MuziekPlayerScore[] {
  return instance.players
    .map((p) => {
      const s = instance.scores.get(p.id)!;
      return {
        playerId: p.id,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl,
        score: s.score,
        streak: s.streak,
        correctCount: s.correctCount,
        wrongCount: s.wrongCount,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildMuziekClientState(instance: MuziekInstance, playerId: string, showAnswer: boolean): MuziekClientState {
  const song = instance.songs[instance.currentSongIndex];
  const scores = getMuziekScores(instance);
  // Random offset within the 30s preview (leave room for clipDuration)
  const maxOffset = Math.max(0, 30 - instance.settings.clipDuration);
  // Use song index as seed for consistent offset across clients
  const clipStartOffset = song?.startOffset ?? ((instance.currentSongIndex * 7) % Math.max(1, maxOffset));

  return {
    songIndex: instance.currentSongIndex,
    totalSongs: instance.songs.length,
    previewUrl: song?.previewUrl ?? '',
    clipDuration: instance.settings.clipDuration,
    clipStartOffset,
    category: song?.category ?? '',
    timeRemainingMs: instance.timeRemainingMs,
    totalTimeMs: instance.settings.clipDuration * 1000,
    answered: instance.answeredCorrectSet.has(playerId),
    buzzedWrong: instance.buzzedWrongThisSong.has(playerId),
    winnerId: showAnswer ? instance.answeredCorrectThisSong : null,
    winnerName: showAnswer && instance.answeredCorrectThisSong
      ? instance.players.find(p => p.id === instance.answeredCorrectThisSong)?.nickname ?? null
      : null,
    correctTitle: showAnswer ? (song?.title ?? null) : null,
    correctArtist: showAnswer ? (song?.artist ?? null) : null,
    coverUrl: showAnswer ? (song?.coverUrl ?? null) : null,
    scores,
    phase: 'listening',
    options: instance.settings.meerkeuze ? instance.currentOptions : undefined,
  };
}

export function cleanupMuziekGame(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (instance?.timer) clearInterval(instance.timer);
  activeGames.delete(roomId);
}
