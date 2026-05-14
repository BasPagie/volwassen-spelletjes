import type { GameRoom, WhatAmICharacter, WhatAmIClientGameState, WhatAmIGameMode, WhatAmIPlayerState, WhatAmISettings } from '../../shared/types.js';
import { getPackById, getAllPacks } from './characterStore.js';

// ─── State ────────────────────────────────────────────

interface WhatAmIPlayerTracker {
  playerId: string;
  assignedCharacter: WhatAmICharacter;
  guessedCorrectly: boolean;
  gaveUp: boolean;
  placement: number | null;
  wrongGuesses: number;
  cooldownUntil: number | null;
  score: number;
  finishTimeMs: number | null;
  questionsAsked: number;
}

interface WhatAmIGameInstance {
  roomId: string;
  packName: string;
  startTime: number;
  timeLimitSeconds: number | null;
  trackers: Map<string, WhatAmIPlayerTracker>;
  characterPool: WhatAmICharacter[];  // full pool for re-rolls
  timer: ReturnType<typeof setInterval> | null;
  finished: boolean;
  placementCounter: number;
  // Turn-based mode
  gameMode: WhatAmIGameMode;
  turnOrder: string[];             // shuffled player IDs
  currentTurnIndex: number;        // index into turnOrder
  turnNumber: number;              // overall turn counter
  turnSeconds: number;             // seconds per turn
  questionsPerTurn: number;        // 0 = until wrong guess
  questionsAskedThisTurn: number;  // counter for current turn
  turnStartTime: number | null;    // epoch ms when current turn started
  turnTimer: ReturnType<typeof setTimeout> | null;
  questionsBeforeGuess: number;    // 0 = no limit
  maxRounds: number | null;        // null = infinite
}

const activeGames = new Map<string, WhatAmIGameInstance>();

const PLACEMENT_BONUSES = [1000, 750, 500, 350, 250, 175, 125, 100, 75, 50]; // 1st through 10th+

// ─── Fuzzy matching ──────────────────────────────────

function normalise(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9 ]/g, '')      // keep alphanumeric + spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns true if the guess is close enough to the target name */
export function isGuessCorrect(guess: string, characterName: string): boolean {
  const g = normalise(guess);
  const t = normalise(characterName);
  if (g === t) return true;

  // Allow matching last name only (e.g. "messi" for "lionel messi")
  const tParts = t.split(' ');
  if (tParts.length > 1) {
    const lastName = tParts[tParts.length - 1];
    if (g === lastName && lastName.length >= 4) return true;
    // Also allow first + last without middle
    const firstLast = `${tParts[0]} ${tParts[tParts.length - 1]}`;
    if (g === firstLast) return true;
  }

  // Simple edit-distance tolerance for short differences (typos)
  if (Math.abs(g.length - t.length) <= 2 && levenshtein(g, t) <= 2 && t.length >= 5) return true;

  return false;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i]);
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

// ─── Scoring ─────────────────────────────────────────

function calculateScore(_startTime: number, _wrongGuesses: number, placement: number): number {
  const bonus = PLACEMENT_BONUSES[Math.min(placement - 1, PLACEMENT_BONUSES.length - 1)];
  return bonus;
}

// ─── Game Lifecycle ───────────────────────────────────

export function startWhatAmIGame(
  room: GameRoom,
  settings: WhatAmISettings,
  onTick: (roomId: string) => void,
  onExpire: (roomId: string) => void,
  onTurnAdvance?: (roomId: string) => void,
): WhatAmIGameInstance | { error: string } {
  const { packIds, customCharacters, timeLimitSeconds, hostPlays, gameMode, turnSeconds, questionsPerTurn, questionsBeforeGuess, maxRounds } = settings as any;

  // Pool characters from all selected packs + always merge custom characters
  let packName = '';
  const pooled: WhatAmICharacter[] = [];

  for (const packId of (packIds ?? [])) {
    const pack = getPackById(packId);
    if (pack) {
      pooled.push(...pack.characters);
      packName = packName ? `${packName} + ${pack.name}` : pack.name;
    }
  }

  if (customCharacters && customCharacters.length > 0) {
    const custom = customCharacters.map((c: WhatAmICharacter, i: number) => ({ ...c, id: c.id || `custom-${i}` }));
    pooled.push(...custom);
    packName = packName ? `${packName} + ✏️ Eigen` : '✏️ Eigen pakket';
  }

  if (pooled.length === 0) {
    return { error: 'Selecteer minimaal één karakter pakket of voeg eigen karakters toe.' };
  }

  const characters = pooled;

  // Determine participating players (bots always included when present)
  const players = hostPlays
    ? room.players.filter((p) => p.connected || p.isBot)
    : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

  if (players.length < 2) return { error: 'Er zijn minimaal 2 spelers nodig voor Wie Ben Ik?' };
  if (characters.length < players.length) {
    return { error: `Niet genoeg karakters. Pak heeft ${characters.length} maar er zijn ${players.length} spelers.` };
  }

  // Shuffle and assign characters
  const shuffled = shuffle([...characters]);
  const trackers = new Map<string, WhatAmIPlayerTracker>();
  players.forEach((player, idx) => {
    trackers.set(player.id, {
      playerId: player.id,
      assignedCharacter: shuffled[idx],
      guessedCorrectly: false,
      gaveUp: false,
      placement: null,
      wrongGuesses: 0,
      cooldownUntil: null,
      score: 0,
      finishTimeMs: null,
      questionsAsked: 0,
    });
  });

  const startTime = Date.now();

  const instance: WhatAmIGameInstance = {
    roomId: room.roomId,
    packName,
    startTime,
    characterPool: characters,
    timeLimitSeconds,
    trackers,
    timer: null,
    finished: false,
    placementCounter: 0,
    // Turn-based
    gameMode: gameMode ?? 'free-for-all',
    turnOrder: shuffle(players.map((p) => p.id)),
    currentTurnIndex: 0,
    turnNumber: 1,
    turnSeconds: turnSeconds ?? 60,
    questionsPerTurn: questionsPerTurn ?? 0,
    questionsAskedThisTurn: 0,
    turnStartTime: null,
    turnTimer: null,
    questionsBeforeGuess: questionsBeforeGuess ?? 0,
    maxRounds: maxRounds ?? null,
  };

  if (instance.gameMode === 'free-for-all') {
    // Every second: tick for cooldown countdown + time updates
    instance.timer = setInterval(() => {
      if (instance.finished) {
        clearInterval(instance.timer!);
        return;
      }
      onTick(room.roomId);

      // Check time limit
      if (timeLimitSeconds !== null) {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= timeLimitSeconds) {
          clearInterval(instance.timer!);
          instance.timer = null;
          onExpire(room.roomId);
        }
      }
    }, 1000);
  } else {
    // Turn-based mode: start first turn
    startTurn(instance, onTick, onTurnAdvance);
  }

  activeGames.set(room.roomId, instance);
  return instance;
}

// ─── Turn-based helpers ───────────────────────────────

function startTurn(
  instance: WhatAmIGameInstance,
  onTick: (roomId: string) => void,
  onTurnAdvance?: (roomId: string) => void,
): void {
  if (instance.finished) return;

  instance.turnStartTime = Date.now();
  instance.questionsAskedThisTurn = 0;

  // Reset the current player's questionsAsked counter for the new turn
  const currentPlayerId = instance.turnOrder[instance.currentTurnIndex];
  if (currentPlayerId) {
    const tracker = instance.trackers.get(currentPlayerId);
    if (tracker) tracker.questionsAsked = 0;
  }

  // Tick every second for UI updates
  if (instance.timer) clearInterval(instance.timer);
  instance.timer = setInterval(() => {
    if (instance.finished) {
      clearInterval(instance.timer!);
      return;
    }
    onTick(instance.roomId);
  }, 1000);

  // Turn timeout
  if (instance.turnTimer) clearTimeout(instance.turnTimer);
  instance.turnTimer = setTimeout(() => {
    advanceTurn(instance, onTick, onTurnAdvance);
  }, instance.turnSeconds * 1000);
}

function advanceTurn(
  instance: WhatAmIGameInstance,
  onTick: (roomId: string) => void,
  onTurnAdvance?: (roomId: string) => void,
): void {
  if (instance.finished) return;
  if (instance.turnTimer) { clearTimeout(instance.turnTimer); instance.turnTimer = null; }
  if (instance.timer) { clearInterval(instance.timer); instance.timer = null; }

  // Find next player who hasn't guessed yet
  const activePlayers = instance.turnOrder.filter((id) => {
    const t = instance.trackers.get(id);
    return t && !t.guessedCorrectly;
  });

  if (activePlayers.length === 0) {
    // Everyone has guessed — trigger game-end check via onTurnAdvance
    if (onTurnAdvance) onTurnAdvance(instance.roomId);
    return;
  }

  // Check max rounds limit: a "round" = one full cycle through all active players
  if (instance.maxRounds !== null) {
    const currentRound = Math.ceil(instance.turnNumber / activePlayers.length);
    if (currentRound >= instance.maxRounds) {
      // Max rounds reached — end the game
      if (onTurnAdvance) onTurnAdvance(instance.roomId);
      return;
    }
  }

  // Move to next in circular order
  let nextIndex = (instance.currentTurnIndex + 1) % instance.turnOrder.length;
  let attempts = 0;
  while (attempts < instance.turnOrder.length) {
    const nextId = instance.turnOrder[nextIndex];
    const tracker = instance.trackers.get(nextId);
    if (tracker && !tracker.guessedCorrectly) break;
    nextIndex = (nextIndex + 1) % instance.turnOrder.length;
    attempts++;
  }

  instance.currentTurnIndex = nextIndex;
  instance.turnNumber++;

  startTurn(instance, onTick, onTurnAdvance);
  if (onTurnAdvance) onTurnAdvance(instance.roomId);
}

export function skipTurn(
  roomId: string,
  playerId: string,
  onTick: (roomId: string) => void,
  onTurnAdvance?: (roomId: string) => void,
): boolean {
  const instance = activeGames.get(roomId);
  if (!instance || instance.finished || instance.gameMode !== 'turns') return false;
  const currentTurnId = instance.turnOrder[instance.currentTurnIndex];
  if (playerId !== currentTurnId) return false;
  advanceTurn(instance, onTick, onTurnAdvance);
  return true;
}

export function processGuess(
  roomId: string,
  playerId: string,
  guess: string,
  onTick?: (roomId: string) => void,
  onTurnAdvance?: (roomId: string) => void,
): { correct: boolean; cooldownUntil?: number; characterName?: string; placement?: number; score?: number; turnAdvanced?: boolean } | null {
  const instance = activeGames.get(roomId);
  if (!instance || instance.finished) return null;

  const tracker = instance.trackers.get(playerId);
  if (!tracker) return null;
  if (tracker.guessedCorrectly) return null;

  // Block guessing if not enough questions asked
  if (instance.questionsBeforeGuess > 0 && tracker.questionsAsked < instance.questionsBeforeGuess) {
    return null;
  }

  // Turn-based: only the active player can guess
  if (instance.gameMode === 'turns') {
    const currentTurnId = instance.turnOrder[instance.currentTurnIndex];
    if (playerId !== currentTurnId) return null;
  }

  // Check cooldown (free-for-all only)
  if (instance.gameMode === 'free-for-all' && tracker.cooldownUntil !== null && Date.now() < tracker.cooldownUntil) {
    return { correct: false, cooldownUntil: tracker.cooldownUntil };
  }

  const correct = isGuessCorrect(guess, tracker.assignedCharacter.name);

  if (correct) {
    instance.placementCounter++;
    const placement = instance.placementCounter;
    const score = calculateScore(instance.startTime, tracker.wrongGuesses, placement);

    tracker.guessedCorrectly = true;
    tracker.placement = placement;
    tracker.score = score;
    tracker.finishTimeMs = Date.now();
    tracker.cooldownUntil = null;

    // In turns mode, advance to next player after correct guess
    if (instance.gameMode === 'turns') {
      advanceTurn(instance, onTick ?? (() => {}), onTurnAdvance);
      return { correct: true, characterName: tracker.assignedCharacter.name, placement, score, turnAdvanced: true };
    }

    return { correct: true, characterName: tracker.assignedCharacter.name, placement, score };
  } else {
    tracker.wrongGuesses++;

    if (instance.gameMode === 'turns') {
      // questionsPerTurn === 0 means turn ends on wrong guess
      instance.questionsAskedThisTurn++;
      if (instance.questionsPerTurn === 0 || instance.questionsAskedThisTurn >= instance.questionsPerTurn) {
        advanceTurn(instance, onTick ?? (() => {}), onTurnAdvance);
        return { correct: false, turnAdvanced: true };
      }
      return { correct: false };
    }

    // Free-for-all: cooldown
    const cooldownUntil = Date.now() + 30_000;
    tracker.cooldownUntil = cooldownUntil;
    return { correct: false, cooldownUntil };
  }
}

export function recordQuestion(roomId: string, playerId: string): boolean {
  const instance = activeGames.get(roomId);
  if (!instance || instance.finished) return false;
  const tracker = instance.trackers.get(playerId);
  if (!tracker || tracker.guessedCorrectly || tracker.gaveUp) return false;
  tracker.questionsAsked++;
  return true;
}

export function buildPlayerView(instance: WhatAmIGameInstance, playerId: string): WhatAmIClientGameState {
  const elapsed = Date.now() - instance.startTime;
  const timeRemainingMs = instance.timeLimitSeconds !== null
    ? Math.max(0, instance.timeLimitSeconds * 1000 - elapsed)
    : null;

  const players: WhatAmIPlayerState[] = Array.from(instance.trackers.values()).map((t) => ({
    playerId: t.playerId,
    // Hide this player's own character unless they gave up, guessed correctly, or game is finished
    assignedCharacter: t.playerId === playerId && !t.gaveUp && !t.guessedCorrectly && !instance.finished ? null : t.assignedCharacter,
    guessedCorrectly: t.guessedCorrectly,
    gaveUp: t.gaveUp,
    placement: t.placement,
    wrongGuesses: t.wrongGuesses,
    cooldownUntil: t.cooldownUntil,
    score: t.score,
    questionsAsked: t.questionsAsked,
  }));

  const state: WhatAmIClientGameState = {
    status: instance.finished ? 'finished' : 'playing',
    gameMode: instance.gameMode,
    packName: instance.packName,
    timeLimitSeconds: instance.timeLimitSeconds,
    startTime: instance.startTime,
    timeRemainingMs,
    players,
    questionsBeforeGuess: instance.questionsBeforeGuess,
    maxRounds: instance.maxRounds,
  };

  if (instance.gameMode === 'turns') {
    state.currentTurnPlayerId = instance.turnOrder[instance.currentTurnIndex];
    state.turnNumber = instance.turnNumber;
    state.turnTimeRemainingMs = instance.turnStartTime !== null
      ? Math.max(0, instance.turnSeconds * 1000 - (Date.now() - instance.turnStartTime))
      : null;
  }

  return state;
}

/** Build the host moderator view — reveals all characters */
export function buildModeratorView(instance: WhatAmIGameInstance): WhatAmIClientGameState {
  const elapsed = Date.now() - instance.startTime;
  const timeRemainingMs = instance.timeLimitSeconds !== null
    ? Math.max(0, instance.timeLimitSeconds * 1000 - elapsed)
    : null;

  const players: WhatAmIPlayerState[] = Array.from(instance.trackers.values()).map((t) => ({
    playerId: t.playerId,
    assignedCharacter: t.assignedCharacter, // host sees all
    guessedCorrectly: t.guessedCorrectly,
    gaveUp: t.gaveUp,
    placement: t.placement,
    wrongGuesses: t.wrongGuesses,
    cooldownUntil: t.cooldownUntil,
    score: t.score,
    questionsAsked: t.questionsAsked,
  }));

  const state: WhatAmIClientGameState = {
    status: instance.finished ? 'finished' : 'playing',
    gameMode: instance.gameMode,
    packName: instance.packName,
    timeLimitSeconds: instance.timeLimitSeconds,
    startTime: instance.startTime,
    timeRemainingMs,
    players,
    questionsBeforeGuess: instance.questionsBeforeGuess,
    maxRounds: instance.maxRounds,
  };

  if (instance.gameMode === 'turns') {
    state.currentTurnPlayerId = instance.turnOrder[instance.currentTurnIndex];
    state.turnNumber = instance.turnNumber;
    state.turnTimeRemainingMs = instance.turnStartTime !== null
      ? Math.max(0, instance.turnSeconds * 1000 - (Date.now() - instance.turnStartTime))
      : null;
  }

  return state;
}

export function isAllGuessed(instance: WhatAmIGameInstance): boolean {
  return Array.from(instance.trackers.values()).every((t) => t.guessedCorrectly);
}

export function giveUp(
  roomId: string,
  playerId: string,
  onTick?: (roomId: string) => void,
  onTurnAdvance?: (roomId: string) => void,
): { characterName: string; turnAdvanced?: boolean } | null {
  const instance = activeGames.get(roomId);
  if (!instance || instance.finished) return null;

  const tracker = instance.trackers.get(playerId);
  if (!tracker || tracker.guessedCorrectly) return null;

  // Mark as "guessed" with 0 score (gave up)
  tracker.guessedCorrectly = true;
  tracker.gaveUp = true;
  tracker.placement = null; // no placement for give-up
  tracker.score = 0;
  tracker.finishTimeMs = Date.now();
  tracker.cooldownUntil = null;

  const characterName = tracker.assignedCharacter.name;

  // In turns mode, advance to next player
  if (instance.gameMode === 'turns') {
    advanceTurn(instance, onTick ?? (() => {}), onTurnAdvance);
    return { characterName, turnAdvanced: true };
  }

  return { characterName };
}

export function finishGame(roomId: string): WhatAmIGameInstance | undefined {
  const instance = activeGames.get(roomId);
  if (!instance) return undefined;

  instance.finished = true;
  if (instance.timer) {
    clearInterval(instance.timer);
    instance.timer = null;
  }

  return instance;
}

export function cleanupWhatAmIGame(roomId: string): void {
  const instance = activeGames.get(roomId);
  if (instance?.timer) clearInterval(instance.timer);
  if (instance?.turnTimer) clearTimeout(instance.turnTimer);
  activeGames.delete(roomId);
}

export function getWhatAmIInstance(roomId: string): WhatAmIGameInstance | undefined {
  return activeGames.get(roomId);
}

// ─── Dev Mode: schedule bot auto-guesses ─────────────
export function scheduleWhatAmIBotGuesses(
  roomId: string,
  bots: { id: string }[],
  onBotGuessed: (roomId: string, playerId: string, placement: number, score: number) => void,
  onTick?: (roomId: string) => void,
  onTurnAdvance?: (roomId: string) => void,
): void {
  for (const bot of bots) {
    const delay = 3000 + Math.random() * 10_000; // 3–13 s
    setTimeout(() => {
      const inst = activeGames.get(roomId);
      if (!inst || inst.finished) return;
      const tracker = inst.trackers.get(bot.id);
      if (!tracker || tracker.guessedCorrectly) return;

      // In turns mode, bot can only guess on its own turn
      if (inst.gameMode === 'turns') {
        const currentTurnId = inst.turnOrder[inst.currentTurnIndex];
        if (bot.id !== currentTurnId) {
          // Not this bot's turn — reschedule
          scheduleWhatAmIBotGuesses(roomId, [bot], onBotGuessed, onTick, onTurnAdvance);
          return;
        }
      }

      // Auto-guess correctly
      inst.placementCounter++;
      const placement = inst.placementCounter;
      const score = calculateScore(inst.startTime, 0, placement);
      tracker.guessedCorrectly = true;
      tracker.placement = placement;
      tracker.score = score;
      tracker.finishTimeMs = Date.now();

      onBotGuessed(roomId, bot.id, placement, score);

      // In turns mode, advance to the next player
      if (inst.gameMode === 'turns') {
        advanceTurn(inst, onTick ?? (() => {}), onTurnAdvance);
      }
    }, delay);
  }
}

/** Re-roll a player's character — called by another player who sees it's too hard */
export function rerollCharacter(
  roomId: string,
  targetPlayerId: string,
  requesterId: string,
): { success: boolean; error?: string } {
  const instance = activeGames.get(roomId);
  if (!instance || instance.finished) return { success: false, error: 'Game niet actief.' };

  // Requester cannot reroll themselves
  if (requesterId === targetPlayerId) return { success: false, error: 'Je kunt niet je eigen karakter opnieuw rollen.' };

  const tracker = instance.trackers.get(targetPlayerId);
  if (!tracker) return { success: false, error: 'Speler niet gevonden.' };
  if (tracker.guessedCorrectly || tracker.gaveUp) return { success: false, error: 'Speler is al klaar.' };

  // Get currently assigned character names to avoid duplicates
  const assignedNames = new Set(
    Array.from(instance.trackers.values()).map((t) => t.assignedCharacter.name.toLowerCase())
  );

  // Find a replacement from the pool that isn't already in use
  const available = instance.characterPool.filter(
    (c) => !assignedNames.has(c.name.toLowerCase())
  );

  if (available.length === 0) return { success: false, error: 'Geen karakters meer beschikbaar om te wisselen.' };

  // Pick a random replacement
  const replacement = available[Math.floor(Math.random() * available.length)];
  tracker.assignedCharacter = replacement;

  return { success: true };
}

export function getPackMeta() {
  return getAllPacks().map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    characterCount: p.characters.length,
  }));
}

// ─── Utils ────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
