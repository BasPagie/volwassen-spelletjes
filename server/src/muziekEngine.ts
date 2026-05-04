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
    onSongEnd,
  };

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

export function processMuziekBuzz(
  roomId: string,
  playerId: string,
  answer: string,
): { correct: boolean; penalty?: number } | null {
  const instance = activeGames.get(roomId);
  if (!instance) return null;
  if (instance.songEnding) return null;
  if (instance.answeredCorrectThisSong) return null;

  const song = instance.songs[instance.currentSongIndex];
  if (!song) return null;

  const correct = isAnswerCorrect(answer, song, instance.settings.guessMode);
  const playerScore = instance.scores.get(playerId);
  if (!playerScore) return null;

  if (correct) {
    instance.answeredCorrectThisSong = playerId;
    playerScore.streak++;
    const streakBonus = instance.settings.streakBonus ? Math.max(0, (playerScore.streak - 1) * 25) : 0;
    playerScore.score += instance.settings.pointsCorrect + streakBonus;
    playerScore.correctCount++;
    // End the song immediately on correct answer
    endCurrentSong(instance);
    return { correct: true };
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
  instance.songEnding = false;

  // Reset streaks for players who didn't answer correctly
  if (!instance.answeredCorrectThisSong) {
    for (const [, score] of instance.scores) {
      // streak already handled per-buzz
    }
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
    answered: instance.answeredCorrectThisSong === playerId,
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
  };
}

export function cleanupMuziekGame(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (instance?.timer) clearInterval(instance.timer);
  activeGames.delete(roomId);
}
