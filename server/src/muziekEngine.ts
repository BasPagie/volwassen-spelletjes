import type { MuziekSettings, MuziekPlayerScore, MuziekClientState } from '../../shared/types.js';
import { HEARDLE_PHASES } from '../../shared/types.js';
import { getSongsByCategories, getSongsByCategoryName, refreshPreviewUrls, type SongEntry } from './songStore.js';

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
  players: { id: string; nickname: string; avatarUrl: string; isBot?: boolean }[];
  timer: ReturnType<typeof setInterval> | null;
  timeRemainingMs: number;
  songEnding: boolean;
  buzzedWrongThisSong: Set<string>;
  answeredCorrectThisSong: string | null;
  answeredCorrectSet: Set<string>;   // all players who answered correctly this song
  currentOptions: string[];          // meerkeuze: 4 shuffled options (empty if not meerkeuze)
  onSongEnd: ((instance: MuziekInstance) => void) | null;
  // Heardle mode
  heardlePhase: number;              // current phase index (0-5)
  heardleLockedOut: Set<string>;     // players locked out this phase (one-per-phase mode)
  heardleSkipped: Set<string>;       // players who voted to skip to next phase
  gaveUpThisSong: Set<string>;       // players who gave up on this song entirely
  onPhaseAdvance: ((instance: MuziekInstance) => void) | null;
}

const activeGames = new Map<string, MuziekInstance>();

export function getMuziekInstance(roomId: string): MuziekInstance | undefined {
  return activeGames.get(roomId);
}

export async function startMuziekGame(
  roomId: string,
  settings: MuziekSettings,
  players: { id: string; nickname: string; avatarUrl: string; isBot?: boolean }[],
  onSongEnd: (instance: MuziekInstance) => void,
  onPhaseAdvance?: (instance: MuziekInstance) => void,
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
    timeRemainingMs: settings.heardleMode
      ? (HEARDLE_PHASES[0] + 3) * 1000  // phase duration + 3s buffer
      : settings.clipDuration * 1000,
    songEnding: false,
    buzzedWrongThisSong: new Set(),
    answeredCorrectThisSong: null,
    answeredCorrectSet: new Set(),
    currentOptions: [],
    onSongEnd,
    heardlePhase: 0,
    heardleLockedOut: new Set(),
    heardleSkipped: new Set(),
    gaveUpThisSong: new Set(),
    onPhaseAdvance: onPhaseAdvance ?? null,
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
  instance.songEnding = false;

  if (instance.settings.heardleMode) {
    // Heardle mode: no automatic timer — players vote to skip
    instance.timeRemainingMs = 0;
    return;
  }

  instance.timeRemainingMs = instance.settings.clipDuration * 1000;

  instance.timer = setInterval(() => {
    instance.timeRemainingMs -= 100;
    if (instance.timeRemainingMs <= 0) {
      instance.timeRemainingMs = 0;
      endCurrentSong(instance);
    }
  }, 100);
}

function advanceHeardlePhase(instance: MuziekInstance): void {
  if (instance.songEnding) return;

  const nextPhase = instance.heardlePhase + 1;
  if (nextPhase >= HEARDLE_PHASES.length) {
    // All phases exhausted — end the song
    endCurrentSong(instance);
    return;
  }

  // Advance phase
  instance.heardlePhase = nextPhase;
  instance.heardleLockedOut.clear(); // unlock everyone for new phase
  instance.heardleSkipped.clear();   // reset skip votes

  // Notify clients of phase change
  instance.onPhaseAdvance?.(instance);
}

/** Player gives up on the current song (won't guess anymore). Returns true if phase advanced. */
export function processGiveUp(roomId: string, playerId: string): boolean {
  const instance = activeGames.get(roomId);
  if (!instance) return false;
  if (!instance.settings.heardleMode) return false;
  if (instance.songEnding) return false;
  if (instance.answeredCorrectSet.has(playerId)) return false;
  if (instance.gaveUpThisSong.has(playerId)) return false;

  instance.gaveUpThisSong.add(playerId);
  instance.heardleSkipped.add(playerId); // also counts as skip vote

  return checkHeardleAutoAdvance(instance);
}

/** Check if the heardle phase should auto-advance (all remaining players done). Returns true if advanced/ended. */
export function checkHeardleAutoAdvance(instance: MuziekInstance): boolean {
  if (!instance.settings.heardleMode) return false;
  if (instance.songEnding) return false;

  const remainingPlayers = instance.players.filter(
    p => !instance.answeredCorrectSet.has(p.id) && !instance.gaveUpThisSong.has(p.id)
  );

  if (remainingPlayers.length === 0) {
    // Everyone answered or gave up — end the song
    endCurrentSong(instance);
    return true;
  }

  const allSkipped = remainingPlayers.every(p => instance.heardleSkipped.has(p.id));
  if (allSkipped) {
    advanceHeardlePhase(instance);
    return true;
  }
  return false;
}

/** Player votes to skip to next phase. Returns true if phase advanced. */
export function processHeardleSkip(roomId: string, playerId: string): boolean {
  const instance = activeGames.get(roomId);
  if (!instance) return false;
  if (!instance.settings.heardleMode) return false;
  if (instance.songEnding) return false;
  if (instance.answeredCorrectSet.has(playerId)) return false;

  instance.heardleSkipped.add(playerId);

  return checkHeardleAutoAdvance(instance);
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

  // Build a pool of distractors from the same category (from the full song store)
  const sameCategorySongs = getSongsByCategoryName(song.category);
  const sameCategoryPool: string[] = [];
  for (const other of sameCategorySongs) {
    const option = guessMode === 'artist' ? other.artist : other.title;
    if (option !== correctAnswer && !sameCategoryPool.includes(option)) {
      sameCategoryPool.push(option);
    }
  }

  // Shuffle same-category pool
  for (let i = sameCategoryPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sameCategoryPool[i], sameCategoryPool[j]] = [sameCategoryPool[j], sameCategoryPool[i]];
  }

  // Fallback: other songs in the game playlist (different category)
  const fallbackPool: string[] = [];
  for (let i = 0; i < instance.songs.length; i++) {
    if (i === songIndex) continue;
    const other = instance.songs[i];
    const option = guessMode === 'artist' ? other.artist : other.title;
    if (option !== correctAnswer && !sameCategoryPool.includes(option) && !fallbackPool.includes(option)) {
      fallbackPool.push(option);
    }
  }
  for (let i = fallbackPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fallbackPool[i], fallbackPool[j]] = [fallbackPool[j], fallbackPool[i]];
  }

  // Pick 3 wrong answers: prefer same-category, fill with fallback
  const wrongOptions = sameCategoryPool.slice(0, 3);
  if (wrongOptions.length < 3) {
    const needed = 3 - wrongOptions.length;
    wrongOptions.push(...fallbackPool.slice(0, needed));
  }

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

  // Heardle one-per-phase: block if locked out this phase
  if (instance.settings.heardleMode && instance.settings.heardleGuessMode === 'one-per-phase') {
    if (instance.heardleLockedOut.has(playerId)) return null;
  }

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
    if (instance.settings.heardleMode) {
      // Heardle scoring: earlier phase = more points
      const phasePoints = getHeardlePhasePoints(instance.heardlePhase, instance.settings.pointsCorrect);
      playerScore.streak++;
      const streakBonus = instance.settings.streakBonus ? Math.max(0, (playerScore.streak - 1) * 25) : 0;
      playerScore.score += phasePoints + streakBonus;
      playerScore.correctCount++;

      if (instance.settings.snelsteRader) {
        endCurrentSong(instance);
      }
      // In "everyone scores" mode: don't end song, let others continue
    } else if (instance.settings.snelsteRader) {
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

    // Heardle one-per-phase: lock out until next phase
    if (instance.settings.heardleMode && instance.settings.heardleGuessMode === 'one-per-phase') {
      instance.heardleLockedOut.add(playerId);
    }

    return { correct: false, penalty: instance.settings.pointsWrongPenalty };
  }
}

// Heardle: points by phase (earlier = more)
function getHeardlePhasePoints(phase: number, basePoints: number): number {
  const multipliers = [1.0, 0.8, 0.6, 0.4, 0.2, 0.1];
  return Math.floor(basePoints * (multipliers[phase] ?? 0.1));
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

  // Reset heardle state
  instance.heardlePhase = 0;
  instance.heardleLockedOut.clear();
  instance.heardleSkipped.clear();
  instance.gaveUpThisSong.clear();

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
      let heardleStatus: 'guessing' | 'skipped' | 'gave-up' | 'correct' | 'locked-out' | undefined;
      if (instance.settings.heardleMode) {
        if (instance.answeredCorrectSet.has(p.id)) heardleStatus = 'correct';
        else if (instance.gaveUpThisSong.has(p.id)) heardleStatus = 'gave-up';
        else if (instance.heardleLockedOut.has(p.id)) heardleStatus = 'locked-out';
        else if (instance.heardleSkipped.has(p.id)) heardleStatus = 'skipped';
        else heardleStatus = 'guessing';
      }
      return {
        playerId: p.id,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl,
        score: s.score,
        streak: s.streak,
        correctCount: s.correctCount,
        wrongCount: s.wrongCount,
        heardleStatus,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildMuziekClientState(instance: MuziekInstance, playerId: string, showAnswer: boolean): MuziekClientState {
  const song = instance.songs[instance.currentSongIndex];
  const scores = getMuziekScores(instance);

  // In heardle mode, players who answered correctly see the reveal immediately
  const playerAnsweredCorrectly = instance.settings.heardleMode && instance.answeredCorrectSet.has(playerId);
  const revealForPlayer = showAnswer || playerAnsweredCorrectly;

  // Determine clip duration and offset
  let clipDuration: number;
  let clipStartOffset: number;

  if (instance.settings.heardleMode) {
    // In heardle mode: clip duration is current phase's audio length
    clipDuration = HEARDLE_PHASES[instance.heardlePhase];
    // Use song's startOffset or a consistent pseudo-random offset
    const maxOffset = Math.max(0, 30 - HEARDLE_PHASES[HEARDLE_PHASES.length - 1]);
    clipStartOffset = song?.startOffset ?? ((instance.currentSongIndex * 7) % Math.max(1, maxOffset));
  } else {
    clipDuration = instance.settings.clipDuration;
    const maxOffset = Math.max(0, 30 - instance.settings.clipDuration);
    clipStartOffset = song?.startOffset ?? ((instance.currentSongIndex * 7) % Math.max(1, maxOffset));
  }

  const totalTimeMs = instance.settings.heardleMode
    ? (HEARDLE_PHASES[instance.heardlePhase] + 3) * 1000
    : instance.settings.clipDuration * 1000;

  return {
    songIndex: instance.currentSongIndex,
    totalSongs: instance.songs.length,
    previewUrl: song?.previewUrl ?? '',
    clipDuration,
    clipStartOffset,
    category: song?.category ?? '',
    timeRemainingMs: instance.timeRemainingMs,
    totalTimeMs,
    answered: instance.answeredCorrectSet.has(playerId),
    buzzedWrong: instance.buzzedWrongThisSong.has(playerId),
    winnerId: revealForPlayer ? instance.answeredCorrectThisSong : null,
    winnerName: revealForPlayer && instance.answeredCorrectThisSong
      ? instance.players.find(p => p.id === instance.answeredCorrectThisSong)?.nickname ?? null
      : null,
    correctTitle: revealForPlayer ? (song?.title ?? null) : null,
    correctArtist: revealForPlayer ? (song?.artist ?? null) : null,
    coverUrl: revealForPlayer ? (song?.coverUrl ?? null) : null,
    scores,
    phase: 'listening',
    options: instance.settings.meerkeuze ? instance.currentOptions : undefined,
    // Heardle fields
    heardleMode: instance.settings.heardleMode || undefined,
    heardlePhase: instance.settings.heardleMode ? instance.heardlePhase : undefined,
    heardleTotalPhases: instance.settings.heardleMode ? HEARDLE_PHASES.length : undefined,
    heardlePhaseDuration: instance.settings.heardleMode ? HEARDLE_PHASES[instance.heardlePhase] : undefined,
    heardleLockedOut: instance.settings.heardleMode ? instance.heardleLockedOut.has(playerId) : undefined,
    heardleSkipped: instance.settings.heardleMode ? instance.heardleSkipped.has(playerId) : undefined,
    heardleGaveUp: instance.settings.heardleMode ? instance.gaveUpThisSong.has(playerId) : undefined,
    heardleSkipCount: instance.settings.heardleMode ? instance.heardleSkipped.size : undefined,
    heardlePlayersRemaining: instance.settings.heardleMode
      ? instance.players.filter(p => !instance.answeredCorrectSet.has(p.id) && !instance.gaveUpThisSong.has(p.id)).length
      : undefined,
  };
}

export function cleanupMuziekGame(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (instance?.timer) clearInterval(instance.timer);
  activeGames.delete(roomId);
}
