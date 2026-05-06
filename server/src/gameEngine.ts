import type {
  GameRoom,
  PlayerProgress,
  PlayerRoundResult,
  RoundResult,
  FinalResults,
} from '../../shared/types.js';

// ─── Per-player round tracking ─────────────────────────
interface PlayerRoundTracker {
  playerId: string;
  solvedGroups: number[];
  wrongGuesses: number;
  correctAnswers: number;
  finished: boolean;
  startTime: number;
  endTime: number | null;
  score: number;
}

// ─── Game instance per room ────────────────────────────
interface GameInstance {
  roomId: string;
  roundType: string;
  playerTrackers: Map<string, PlayerRoundTracker>;
  timer: ReturnType<typeof setInterval> | null;
  roundStartTime: number;
  timeRemainingMs: number | null;
  roundEnding: boolean;
}

const activeGames = new Map<string, GameInstance>();

// ─── Start a round (placeholder for future game types) ─
export function startRound(room: GameRoom): { roundState: unknown } | null {
  void room;
  return null;
}

// ─── Get player-specific round state ───────────────────
export function getPlayerRoundState(roomId: string, _playerId: string, _room: GameRoom): unknown | null {
  const instance = activeGames.get(roomId);
  if (!instance) return null;
  return null;
}

// ─── Get spectator round state ─────────────────────────
export function getSpectatorRoundState(roomId: string, _room: GameRoom): unknown | null {
  const instance = activeGames.get(roomId);
  if (!instance) return null;
  return null;
}

// ─── Finish bot players (dev mode) ─────────────────────
export function finishBotPlayers(roomId: string, room: GameRoom): void {
  const instance = activeGames.get(roomId);
  if (!instance) return;

  for (const player of room.players) {
    if (!player.isBot) continue;
    const tracker = instance.playerTrackers.get(player.id);
    if (!tracker || tracker.finished) continue;
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
    progress.push({
      playerId,
      solvedCount: tracker.solvedGroups.length,
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
  if (!instance) return null;
  if (instance.roundEnding) return null;
  instance.roundEnding = true;

  const results: PlayerRoundResult[] = [];
  for (const [playerId, tracker] of instance.playerTrackers) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) continue;

    const timeUsedMs = (tracker.endTime ?? Date.now()) - tracker.startTime;
    player.score += tracker.score;

    results.push({
      playerId,
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
      groupsFound: tracker.solvedGroups.length,
      correctAnswers: tracker.correctAnswers,
      wrongGuesses: tracker.wrongGuesses,
      timeUsedMs,
      roundScore: tracker.score,
    });
  }

  results.sort((a, b) => b.roundScore - a.roundScore);

  const roundResult: RoundResult = {
    roundIndex: room.currentRoundIndex,
    roundType: instance.roundType,
    results,
  };

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
}
