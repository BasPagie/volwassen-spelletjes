import type { GameRoom, SnelsteVingerSettings, SnelsteVingerPlayerScore, SnelsteVingerClientState } from '../../shared/types.js';
import { getQuestionsByCategories, type TriviaQuestion } from './triviaStore.js';

// ─── Game Instance ─────────────────────────────────────
interface SnelsteVingerInstance {
  roomId: string;
  questions: TriviaQuestion[];
  currentIndex: number;
  scores: Map<string, { score: number; streak: number; correctCount: number; wrongCount: number }>;
  playerInfo: Map<string, { nickname: string; avatarUrl: string }>;
  questionStartTime: number;
  questionTimer: ReturnType<typeof setInterval> | null;
  revealTimer: ReturnType<typeof setTimeout> | null;
  winnerId: string | null;
  answeredCorrectly: Set<string>;  // players who answered correctly this question
  buzzedWrong: Set<string>;        // players who buzzed wrong this question
  settings: SnelsteVingerSettings;
  finished: boolean;
}

const activeGames = new Map<string, SnelsteVingerInstance>();

// ─── Answer Matching ───────────────────────────────────
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, '')     // strip punctuation
    .replace(/\s+/g, ' ');
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

function isAnswerCorrect(guess: string, acceptedAnswers: string[]): boolean {
  const normalizedGuess = normalize(guess);
  if (!normalizedGuess) return false;

  for (const accepted of acceptedAnswers) {
    const normalizedAccepted = normalize(accepted);
    // Exact match
    if (normalizedGuess === normalizedAccepted) return true;
    // Levenshtein tolerance: allow distance ≤ 2 for strings of length ≥ 4
    if (normalizedAccepted.length >= 4 && normalizedGuess.length >= 4) {
      const maxDist = normalizedAccepted.length <= 6 ? 1 : 2;
      if (levenshtein(normalizedGuess, normalizedAccepted) <= maxDist) return true;
    }
  }
  return false;
}

// ─── Game Lifecycle ────────────────────────────────────
export function startSnelsteVingerGame(
  room: GameRoom,
  settings: SnelsteVingerSettings,
): SnelsteVingerInstance | { error: string } {
  const players = settings.hostPlays
    ? room.players.filter((p) => p.connected || p.isBot)
    : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

  if (players.length < 2) {
    return { error: 'Er zijn minimaal 2 spelers nodig voor Snelste Vinger.' };
  }

  if ((settings.categoryIds ?? []).length === 0) {
    return { error: 'Selecteer minimaal één trivia-categorie.' };
  }

  const questions = getQuestionsByCategories(settings.categoryIds, settings.questionCount);
  if (questions.length === 0) {
    return { error: 'Geen vragen gevonden voor de geselecteerde categorieën.' };
  }

  const scores = new Map<string, { score: number; streak: number; correctCount: number; wrongCount: number }>();
  const playerInfo = new Map<string, { nickname: string; avatarUrl: string }>();

  for (const p of players) {
    scores.set(p.id, { score: 0, streak: 0, correctCount: 0, wrongCount: 0 });
    playerInfo.set(p.id, { nickname: p.nickname, avatarUrl: p.avatarUrl });
  }

  const instance: SnelsteVingerInstance = {
    roomId: room.roomId,
    questions,
    currentIndex: 0,
    scores,
    playerInfo,
    questionStartTime: Date.now(),
    questionTimer: null,
    revealTimer: null,
    winnerId: null,
    answeredCorrectly: new Set(),
    buzzedWrong: new Set(),
    settings,
    finished: false,
  };

  activeGames.set(room.roomId, instance);
  return instance;
}

export function processSnelsteVingerBuzz(
  roomId: string,
  playerId: string,
  answer: string,
): { correct: boolean; penalty?: number } | { error: string } {
  const instance = activeGames.get(roomId);
  if (!instance) return { error: 'Geen actief spel gevonden.' };
  if (instance.finished) return { error: 'Spel is afgelopen.' };
  if (instance.winnerId) return { error: 'Deze vraag is al beantwoord.' };
  if (instance.answeredCorrectly.has(playerId)) return { error: 'Je hebt al goed geantwoord.' };

  const question = instance.questions[instance.currentIndex];
  if (!question) return { error: 'Geen actieve vraag.' };

  const correct = isAnswerCorrect(answer, question.acceptedAnswers);
  const playerScore = instance.scores.get(playerId);
  if (!playerScore) return { error: 'Speler niet gevonden.' };

  if (correct) {
    instance.winnerId = playerId;
    instance.answeredCorrectly.add(playerId);

    let points = instance.settings.pointsCorrect;
    if (instance.settings.streakBonus) {
      points += playerScore.streak * 25;
    }
    playerScore.score += points;
    playerScore.streak += 1;
    playerScore.correctCount += 1;

    return { correct: true };
  } else {
    instance.buzzedWrong.add(playerId);
    playerScore.score -= instance.settings.pointsWrongPenalty;
    playerScore.streak = 0;
    playerScore.wrongCount += 1;

    return { correct: false, penalty: instance.settings.pointsWrongPenalty };
  }
}

export function advanceQuestion(roomId: string): 'next' | 'finished' {
  const instance = activeGames.get(roomId);
  if (!instance) return 'finished';

  instance.currentIndex += 1;
  if (instance.currentIndex >= instance.questions.length) {
    instance.finished = true;
    return 'finished';
  }

  // Reset per-question state
  instance.winnerId = null;
  instance.answeredCorrectly.clear();
  instance.buzzedWrong.clear();
  instance.questionStartTime = Date.now();

  return 'next';
}

export function getSnelsteVingerInstance(roomId: string): SnelsteVingerInstance | undefined {
  return activeGames.get(roomId);
}

export function cleanupSnelsteVingerGame(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (!instance) return;
  if (instance.questionTimer) clearInterval(instance.questionTimer);
  if (instance.revealTimer) clearTimeout(instance.revealTimer);
  activeGames.delete(roomId);
}

// ─── State Builders ────────────────────────────────────
export function buildScores(instance: SnelsteVingerInstance): SnelsteVingerPlayerScore[] {
  const scores: SnelsteVingerPlayerScore[] = [];
  for (const [playerId, data] of instance.scores) {
    const info = instance.playerInfo.get(playerId);
    scores.push({
      playerId,
      nickname: info?.nickname ?? 'Onbekend',
      avatarUrl: info?.avatarUrl ?? '🎮',
      score: data.score,
      streak: data.streak,
      correctCount: data.correctCount,
      wrongCount: data.wrongCount,
    });
  }
  return scores.sort((a, b) => b.score - a.score);
}

export function buildClientState(
  instance: SnelsteVingerInstance,
  playerId: string,
): SnelsteVingerClientState {
  const question = instance.questions[instance.currentIndex];
  const elapsed = Date.now() - instance.questionStartTime;
  const timeRemainingMs = Math.max(0, instance.settings.timePerQuestion * 1000 - elapsed);

  return {
    questionIndex: instance.currentIndex,
    totalQuestions: instance.questions.length,
    question: question?.question ?? '',
    category: question?.category ?? '',
    timeRemainingMs,
    totalTimeMs: instance.settings.timePerQuestion * 1000,
    answered: instance.answeredCorrectly.has(playerId),
    buzzedWrong: instance.buzzedWrong.has(playerId),
    winnerId: instance.winnerId,
    winnerName: instance.winnerId ? (instance.playerInfo.get(instance.winnerId)?.nickname ?? null) : null,
    correctAnswer: instance.winnerId ? question?.answer ?? null : null,
    scores: buildScores(instance),
    phase: instance.finished ? 'finished' : instance.winnerId ? 'reveal' : 'question',
  };
}

export function getCurrentAnswer(roomId: string): string | null {
  const instance = activeGames.get(roomId);
  if (!instance) return null;
  return instance.questions[instance.currentIndex]?.answer ?? null;
}

export function setQuestionTimer(roomId: string, timer: ReturnType<typeof setInterval>): void {
  const instance = activeGames.get(roomId);
  if (instance) instance.questionTimer = timer;
}

export function clearQuestionTimer(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (!instance) return;
  if (instance.questionTimer) {
    clearInterval(instance.questionTimer);
    instance.questionTimer = null;
  }
}

export function setRevealTimer(roomId: string, timer: ReturnType<typeof setTimeout>): void {
  const instance = activeGames.get(roomId);
  if (instance) instance.revealTimer = timer;
}

export function clearRevealTimer(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (!instance) return;
  if (instance.revealTimer) {
    clearTimeout(instance.revealTimer);
    instance.revealTimer = null;
  }
}
