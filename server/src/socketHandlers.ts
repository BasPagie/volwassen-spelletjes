import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSettings,
  RoundResult,
  WhatAmISettings,
  GameCategory,
} from '../../shared/types.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getSocketMapping,
  getSocketIdForPlayer,
  updateSettings,
  updateWhatAmISettings,
  isHost,
  addBotToRoom,
  removeBotFromRoom,
  kickPlayer,
  disconnectPlayer,
  scheduleDisconnectCleanup,
  reconnectPlayer,
  removeDisconnectedPlayer,
} from './rooms.js';
import {
  getPlayerProgress,
  getRoundResult,
  getFinalResults,
  cleanupGame,
} from './gameEngine.js';
import { PREMADE_AVATARS } from '../../shared/types.js';
import {
  startWhatAmIGame,
  processGuess,
  buildPlayerView,
  buildModeratorView,
  finishGame,
  cleanupWhatAmIGame,
  getWhatAmIInstance,
  getPackMeta,
  scheduleWhatAmIBotGuesses,
  skipTurn,
  giveUp,
  recordQuestion,
  rerollCharacter,
} from './whatAmIEngine.js';
import { DEFAULT_WHATAMI_SETTINGS } from '../../shared/types.js';
import { DEFAULT_SNELSTEVINGER_SETTINGS } from '../../shared/types.js';
import {
  broadcastWhatAmIState,
  broadcastWhatAmIGameEnd,
  checkAllGuessedAndFinish,
  createOnTick,
  createOnTurnAdvance,
} from './whatAmIBroadcast.js';
import {
  startSnelsteVingerGame,
  processSnelsteVingerBuzz,
  advanceQuestion,
  getSnelsteVingerInstance,
  cleanupSnelsteVingerGame,
  buildClientState,
  buildScores,
  getCurrentAnswer,
  setQuestionTimer,
  clearQuestionTimer,
  setRevealTimer,
  clearRevealTimer,
} from './snelsteVingerEngine.js';
import { updateSnelsteVingerSettings } from './rooms.js';
import { updateDrawingSettings } from './rooms.js';
import { DEFAULT_DRAWING_SETTINGS } from '../../shared/types.js';
import {
  startDrawingGame,
  getDrawingInstance,
  cleanupDrawingGame,
  getWordChoicesForDrawer,
  selectWord,
  addStroke,
  clearCanvas as clearDrawingCanvas,
  undoStroke,
  processGuess as processDrawingGuess,
  allGuessersCorrect,
  endTurn,
  advanceTurn,
  startHintTimer,
  buildDrawerState,
  buildGuesserState,
  getFinalScores,
  getDrawerId,
  getStrokes,
} from './drawingEngine.js';
import { updateMuziekSettings } from './rooms.js';
import { DEFAULT_MUZIEK_SETTINGS } from '../../shared/types.js';
import {
  startMuziekGame,
  getMuziekInstance,
  getAutocompletePool,
  processMuziekBuzz,
  processHeardleSkip,
  processGiveUp,
  checkHeardleAutoAdvance,
  advanceToNextSong,
  getMuziekScores,
  buildMuziekClientState,
  cleanupMuziekGame,
} from './muziekEngine.js';
import { getAllSongCategories } from './songStore.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Store round results per room for final results
const roomRoundResults = new Map<string, RoundResult[]>();

// Store countdown intervals per room for cleanup
const roomCountdowns = new Map<string, ReturnType<typeof setInterval>>();

// Guard against duplicate next-round clicks
const roomAdvancing = new Set<string>();

// ─── Briefing state ────────────────────────────────────
interface BriefingState {
  readyPlayers: Set<string>;
  totalPlayers: number;
  timeoutHandle: ReturnType<typeof setTimeout>;
  startFn: () => void;
}
const roomBriefings = new Map<string, BriefingState>();

function startBriefing(
  io: IOServer,
  roomId: string,
  briefingKey: string,
  roundType: string | undefined,
  gameCategory: GameCategory,
  activePlayers: { id: string; isBot?: boolean }[],
  startFn: () => void,
): void {
  // Clean up any leftover briefing
  cleanupBriefing(roomId);

  const total = activePlayers.length;

  const timeoutHandle = setTimeout(() => {
    // Auto-start after 20s regardless
    const briefing = roomBriefings.get(roomId);
    if (briefing) {
      roomBriefings.delete(roomId);
      briefing.startFn();
    }
  }, 20_000);

  roomBriefings.set(roomId, {
    readyPlayers: new Set(),
    totalPlayers: total,
    timeoutHandle,
    startFn,
  });

  io.to(roomId).emit('briefing-start', { briefingKey, roundType, gameCategory });

  // Auto-ready bots (they can't click the button)
  for (const p of activePlayers) {
    if (p.isBot) {
      handlePlayerReady(io, roomId, p.id);
    }
  }
}

function handlePlayerReady(io: IOServer, roomId: string, playerId: string): void {
  const briefing = roomBriefings.get(roomId);
  if (!briefing) return;

  briefing.readyPlayers.add(playerId);
  io.to(roomId).emit('briefing-ready-count', {
    ready: briefing.readyPlayers.size,
    total: briefing.totalPlayers,
  });

  if (briefing.readyPlayers.size >= briefing.totalPlayers) {
    clearTimeout(briefing.timeoutHandle);
    roomBriefings.delete(roomId);
    briefing.startFn();
  }
}

function cleanupBriefing(roomId: string): void {
  const briefing = roomBriefings.get(roomId);
  if (briefing) {
    clearTimeout(briefing.timeoutHandle);
    roomBriefings.delete(roomId);
  }
}

/** Run a 3-2-1-GO countdown, then call `fn`. */
function startCountdownThenRun(io: IOServer, roomId: string, fn: () => void | Promise<void>): void {
  let count = 3;
  io.to(roomId).emit('countdown', { count });
  count--;
  const countdownInterval = setInterval(() => {
    if (!getRoom(roomId)) {
      clearInterval(countdownInterval);
      roomCountdowns.delete(roomId);
      return;
    }
    if (count >= 0) {
      io.to(roomId).emit('countdown', { count });
      count--;
    } else {
      clearInterval(countdownInterval);
      roomCountdowns.delete(roomId);
      fn();
    }
  }, 1000);
  roomCountdowns.set(roomId, countdownInterval);
}

// Simple per-socket rate limiter
const socketEventTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_EVENTS = 10;

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const timestamps = socketEventTimestamps.get(socketId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  socketEventTimestamps.set(socketId, recent);
  return recent.length > RATE_LIMIT_MAX_EVENTS;
}

const MAX_NICKNAME_LENGTH = 20;

function sanitizeNickname(raw: string): string {
  return raw.trim().slice(0, MAX_NICKNAME_LENGTH).replace(/[<>&"']/g, '');
}

const MAX_AVATAR_BYTES = 100_000; // ~100KB max for custom avatar images

function isValidAvatar(raw: string): boolean {
  if (typeof raw !== 'string') return false;
  if (PREMADE_AVATARS.includes(raw)) return true;
  // Allow base64 data URL images (JPEG/PNG/WebP) up to size limit
  if (raw.startsWith('data:image/') && raw.length <= MAX_AVATAR_BYTES) return true;
  return false;
}

export function registerSocketHandlers(io: IOServer, socket: IOSocket): void {

  // ─── Create Room ─────────────────────────────────────
  socket.on('create-room', ({ nickname, avatarUrl, gameCategory }) => {
    const safeName = sanitizeNickname(nickname);
    if (!safeName || !isValidAvatar(avatarUrl)) {
      socket.emit('error', { message: 'Ongeldige naam of avatar.' });
      return;
    }
    const validCategories = ['muziek', 'what-am-i', 'drawing', 'snelste-vinger'];
    const safeCategory = validCategories.includes(gameCategory) ? gameCategory : 'muziek';
    const result = createRoom(socket.id, safeName, avatarUrl, safeCategory as import('../../shared/types.js').GameCategory);
    socket.join(result.room.roomId);
    socket.emit('room-created', { room: result.room, player: result.player });
    console.log(`[Room] Created: ${result.room.roomId} by ${safeName}`);
  });

  // ─── Join Room ───────────────────────────────────────
  socket.on('join-room', ({ roomId, nickname, avatarUrl }) => {
    const safeName = sanitizeNickname(nickname);
    if (!safeName || !isValidAvatar(avatarUrl)) {
      socket.emit('error', { message: 'Ongeldige naam of avatar.' });
      return;
    }
    const result = joinRoom(socket.id, roomId, safeName, avatarUrl);
    if (!result) {
      socket.emit('error', { message: 'Deze lobby bestaat niet of het spel is al begonnen.' });
      return;
    }
    socket.join(roomId);
    socket.emit('room-joined', { room: result.room, player: result.player });
    socket.to(roomId).emit('player-joined', { player: result.player });
    console.log(`[Room] ${safeName} joined ${roomId}`);
  });

  // ─── Leave Room ──────────────────────────────────────
  socket.on('leave-room', () => {
    handleLeave(io, socket);
  });

  // ─── Update Settings ─────────────────────────────────
  socket.on('update-settings', (settings: GameSettings) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    if (!isHost(mapping.roomId, mapping.playerId)) {
      socket.emit('error', { message: 'Alleen de host kan instellingen wijzigen.' });
      return;
    }

    // Validate settings shape to prevent malformed data
    if (!settings) return;
    if (settings.attemptsMode !== 'limited' && settings.attemptsMode !== 'unlimited') return;
    if (typeof settings.maxAttempts !== 'number' || settings.maxAttempts < 1 || settings.maxAttempts > 10) return;
    if (settings.timeLimitSeconds !== null && (typeof settings.timeLimitSeconds !== 'number' || settings.timeLimitSeconds < 0 || settings.timeLimitSeconds > 600)) return;
    if (typeof settings.hostControl !== 'boolean' || typeof settings.hostPlays !== 'boolean') return;

    const success = updateSettings(mapping.roomId, settings);
    if (success) {
      io.to(mapping.roomId).emit('settings-updated', settings);
    }
  });

  // ─── Update Score (Lobby) ────────────────────────────
  socket.on('update-score', ({ playerId, score }) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    if (!isHost(mapping.roomId, mapping.playerId)) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.status !== 'lobby') return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    const clampedScore = Math.max(0, Math.min(10000, Math.round(score)));
    player.score = clampedScore;
    io.to(mapping.roomId).emit('score-updated', { playerId, score: clampedScore });
  });

  // ─── Start Game ──────────────────────────────────────
  socket.on('start-game', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room) return;

    if (room.settings.hostControl && !isHost(mapping.roomId, mapping.playerId)) {
      socket.emit('error', { message: 'Alleen de host kan het spel starten.' });
      return;
    }

    // No round-based games currently active — use game-specific start events instead
    socket.emit('error', { message: 'Gebruik de specifieke start-knop voor dit speltype.' });
  });

  // ─── Next Round ──────────────────────────────────────
  // ─── Next Round (reserved for future round-based games) ─
  socket.on('next-round', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    // No round-based games currently active
  });

  // ─── Play Again ──────────────────────────────────────
  socket.on('play-again', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room) return;

    if (room.settings.hostControl && !isHost(mapping.roomId, mapping.playerId)) return;

    // Reset room
    room.status = 'lobby';
    room.currentRoundIndex = 0;
    for (const player of room.players) {
      player.score = 0;
    }
    roomRoundResults.delete(room.roomId);

    // Cancel any active game
    cleanupBriefing(room.roomId);
    cleanupGame(room.roomId);
    cleanupWhatAmIGame(room.roomId);
    cleanupSnelsteVingerGame(room.roomId);
    cleanupDrawingGame(room.roomId);
    cleanupMuziekGame(room.roomId);
    const countdown = roomCountdowns.get(room.roomId);
    if (countdown) {
      clearInterval(countdown);
      roomCountdowns.delete(room.roomId);
    }
    roomAdvancing.delete(room.roomId);

    // Notify each player individually with their own player object
    for (const player of room.players) {
      const playerSocketId = getSocketIdForPlayer(room.roomId, player.id);
      if (playerSocketId) {
        io.to(playerSocketId).emit('room-joined', { room, player });
      }
    }
  });

  // ─── Player Ready (Briefing) ─────────────────────────
  socket.on('player-ready', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    handlePlayerReady(io, mapping.roomId, mapping.playerId);
  });

  // ─── Dev: Add Bot ────────────────────────────────────
  socket.on('dev-add-bot', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;

    const bot = addBotToRoom(mapping.roomId);
    if (!bot) {
      socket.emit('error', { message: 'Kon geen bot toevoegen.' });
      return;
    }
    io.to(mapping.roomId).emit('player-joined', { player: bot });
  });

  // ─── Dev: Remove Bot ────────────────────────────────
  socket.on('dev-remove-bot', ({ playerId }) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;

    if (removeBotFromRoom(mapping.roomId, playerId)) {
      io.to(mapping.roomId).emit('player-left', { playerId });
    }
  });

  // ─── Kick Player ────────────────────────────────────
  socket.on('kick-player', ({ playerId }) => {
    if (typeof playerId !== 'string' || playerId.length > 50) return;
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.status !== 'lobby') return;

    const result = kickPlayer(mapping.roomId, playerId);
    if (!result) return;

    // Notify the kicked player and remove them from the room channel
    if (result.socketId) {
      io.to(result.socketId).emit('kicked');
      io.in(result.socketId).socketsLeave(mapping.roomId);
    }

    // Notify remaining players
    io.to(mapping.roomId).emit('player-left', { playerId });
    console.log(`[Room] Player ${playerId} kicked from ${mapping.roomId}`);
  });

  // ─── Host Hint ────────────────────────────────────────
  socket.on('host:give-hint', ({ hint }) => {
    if (typeof hint !== 'string' || hint.length === 0 || hint.length > 200) return;
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;
    const room = getRoom(mapping.roomId);
    if (!room || room.status !== 'playing') return;
    if (room.settings.hostPlays) return; // host must be spectating
    io.to(mapping.roomId).emit('hint-given', { hint });
    console.log(`[Room] Host gave hint in ${mapping.roomId}: ${hint}`);
  });

  // ─── Check Room ───────────────────────────────────────
  socket.on('check-room', ({ roomId }) => {
    if (typeof roomId !== 'string' || roomId.length > 10) return;
    const room = getRoom(roomId);
    socket.emit('room-check', {
      exists: !!room,
      joinable: !!room && room.status === 'lobby',
      gameCategory: room?.gameCategory ?? null,
    });
  });

  // ─── Reconnect ────────────────────────────────────────
  socket.on('reconnect-attempt', ({ roomId, playerId }) => {
    if (typeof roomId !== 'string' || typeof playerId !== 'string') return;
    if (roomId.length > 10 || playerId.length > 50) return;

    const result = reconnectPlayer(socket.id, roomId, playerId);
    if (!result) {
      socket.emit('reconnect-failed');
      return;
    }

    const { room, player } = result;
    socket.join(roomId);

    // Determine current phase and gather state
    let phase: 'lobby' | 'playing' | 'round-end' | 'finished' = 'lobby';
    let roundResult: import('../../shared/types.js').RoundResult | null = null;
    let finalResultsData: import('../../shared/types.js').FinalResults | null = null;
    let progress: import('../../shared/types.js').PlayerProgress[] = [];

    if (room.status === 'playing') {
      phase = 'playing';

      // Check if we're between rounds (round-end)
      const storedResults = roomRoundResults.get(roomId) ?? [];
      if (storedResults.length > room.currentRoundIndex) {
        phase = 'round-end';
        roundResult = storedResults[storedResults.length - 1];
      }

      progress = getPlayerProgress(roomId);
    } else if (room.status === 'finished') {
      phase = 'finished';
      const allResults = roomRoundResults.get(roomId) ?? [];
      finalResultsData = getFinalResults(room, allResults);
    }

    socket.emit('reconnected', {
      room,
      player,
      phase,
      roundResult,
      finalResults: finalResultsData,
      playerProgress: progress,
    });

    // Notify others that the player is back
    socket.to(roomId).emit('player-joined', { player });

    console.log(`[Room] Player ${player.nickname} reconnected to ${roomId}`);
  });

  // ─── Wie Ben Ik? — Update Settings ──────────────────
  socket.on('whatami:update-settings', (settings) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) {
      socket.emit('error', { message: 'Alleen de host kan instellingen wijzigen.' });
      return;
    }
    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i') return;

    // Basic validation
    if (settings.timeLimitSeconds !== null && (typeof settings.timeLimitSeconds !== 'number' || settings.timeLimitSeconds < 60 || settings.timeLimitSeconds > 3600)) return;
    if (typeof settings.hostPlays !== 'boolean') return;
    if (!Array.isArray(settings.customCharacters)) return;

    // Validate packIds against loaded packs
    const loadedPackIds = getPackMeta().map((p) => p.id);
    const safePackIds = Array.isArray(settings.packIds)
      ? settings.packIds.filter((id: unknown) => typeof id === 'string' && loadedPackIds.includes(id as string))
      : [];

    // Sanitize custom characters
    const safeCustom = settings.customCharacters
      .filter((c) => typeof c.name === 'string' && c.name.trim().length > 0)
      .slice(0, 50)
      .map((c, i) => ({
        id: `custom-${i}`,
        name: c.name.trim().slice(0, 80),
        imageUrl: typeof c.imageUrl === 'string' && c.imageUrl.startsWith('https://') ? c.imageUrl.slice(0, 500) : undefined,
        category: typeof c.category === 'string' ? c.category.slice(0, 50) : undefined,
      }));

    const safeSettings: WhatAmISettings = {
      packIds: safePackIds,
      customCharacters: safeCustom,
      timeLimitSeconds: settings.timeLimitSeconds,
      hostPlays: settings.hostPlays,
      gameMode: settings.gameMode ?? 'free-for-all',
      turnSeconds: settings.turnSeconds ?? 60,
      questionsPerTurn: settings.questionsPerTurn ?? 0,
      questionsBeforeGuess: settings.questionsBeforeGuess ?? 0,
    };

    updateWhatAmISettings(mapping.roomId, safeSettings);
    room.whatAmISettings = safeSettings;
    io.to(mapping.roomId).emit('whatami:settings-updated', safeSettings);
  });

  // ─── Wie Ben Ik? — Start Game ────────────────────────
  socket.on('whatami:start-game', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) {
      socket.emit('error', { message: 'Alleen de host kan het spel starten.' });
      return;
    }

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i') return;
    if (room.status !== 'lobby') return;

    const settings = room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;
    const roomId = room.roomId;

    // Pre-validate before starting countdown
    const players = settings.hostPlays
      ? room.players.filter((p) => p.connected || p.isBot)
      : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

    if (players.length < 2) {
      socket.emit('error', { message: 'Er zijn minimaal 2 spelers nodig voor Wie Ben Ik?' });
      return;
    }

    if ((settings.packIds ?? []).length === 0 && (settings.customCharacters ?? []).length === 0) {
      socket.emit('error', { message: 'Selecteer minimaal één karakter pakket of voeg eigen karakters toe.' });
      return;
    }

    // Emit game-started, then show briefing, then countdown, then start
    io.to(roomId).emit('game-started');

    const active = settings.hostPlays
      ? room.players.filter((p) => p.connected || p.isBot)
      : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

    startBriefing(io, roomId, 'what-am-i', undefined, 'what-am-i', active, () => {
      startCountdownThenRun(io, roomId, () => {
        const currentRoom = getRoom(roomId);
        if (!currentRoom) return;

        const result = startWhatAmIGame(
          currentRoom,
          settings,
          createOnTick(io, settings),
          (rid) => {
            const inst = finishGame(rid);
            if (!inst) return;
            broadcastWhatAmIGameEnd(io, rid, inst, settings);
            console.log(`[WieBenikl] Time expired: ${rid}`);
          },
          createOnTurnAdvance(io, settings),
        );

        if ('error' in result) {
          io.to(roomId).emit('error', { message: result.error });
          return;
        }

        currentRoom.status = 'playing';
        broadcastWhatAmIState(io, roomId, settings);

        {
          const bots = currentRoom.players.filter((p) => p.isBot);
          if (bots.length > 0) {
            scheduleWhatAmIBotGuesses(roomId, bots, (rid, playerId, placement, score) => {
              const inst = getWhatAmIInstance(rid);
              const r = getRoom(rid);
              if (!inst || !r) return;
              io.to(rid).emit('whatami:player-guessed', { playerId, placement, score });
              broadcastWhatAmIState(io, rid, settings);
              checkAllGuessedAndFinish(io, rid, settings);
            });
          }
        }
      });
    });

    console.log(`[WieBenik] Started: ${room.roomId}`);
  });

  // ─── Wie Ben Ik? — Guess ─────────────────────────────
  socket.on('whatami:guess', ({ guess }) => {
    if (isRateLimited(socket.id)) return;
    if (typeof guess !== 'string' || guess.length === 0 || guess.length > 100) return;

    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i' || room.status !== 'playing') return;

    const settings = room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;

    // Build onTick and onTurnAdvance for turn-based processGuess
    const onTick = createOnTick(io, settings);
    const onTurnAdvance = createOnTurnAdvance(io, settings);

    const result = processGuess(mapping.roomId, mapping.playerId, guess, onTick, onTurnAdvance);
    if (!result) return;

    // Send result to guesser
    socket.emit('whatami:guess-result', {
      correct: result.correct,
      cooldownUntil: result.cooldownUntil,
      characterName: result.characterName,
    });

    if (result.correct) {
      // Broadcast to all that this player guessed
      io.to(mapping.roomId).emit('whatami:player-guessed', {
        playerId: mapping.playerId,
        placement: result.placement!,
        score: result.score!,
      });
    }

    // Always send updated state (turn may have advanced)
    broadcastWhatAmIState(io, mapping.roomId, settings);

    // Check if all players have guessed
    if (checkAllGuessedAndFinish(io, mapping.roomId, settings)) {
      console.log(`[WieBenik] All guessed: ${mapping.roomId}`);
    }
  });

  // ─── Wie Ben Ik? — Asked Question ─────────────────────
  socket.on('whatami:asked-question', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i' || room.status !== 'playing') return;

    if (recordQuestion(mapping.roomId, mapping.playerId)) {
      const settings = room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;
      broadcastWhatAmIState(io, mapping.roomId, settings);
    }
  });

  // ─── Wie Ben Ik? — Skip Turn ──────────────────────────
  socket.on('whatami:skip-turn', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i' || room.status !== 'playing') return;

    const settings = room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;
    skipTurn(mapping.roomId, mapping.playerId, createOnTick(io, settings), createOnTurnAdvance(io, settings));
  });

  // ─── Wie Ben Ik? — Give Up ───────────────────────────
  socket.on('whatami:give-up', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i' || room.status !== 'playing') return;

    const settings = room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;

    const result = giveUp(mapping.roomId, mapping.playerId, createOnTick(io, settings), createOnTurnAdvance(io, settings));
    if (!result) return;

    // Tell the player their character
    socket.emit('whatami:guess-result', {
      correct: false,
      characterName: result.characterName,
    });

    // Broadcast updated state
    broadcastWhatAmIState(io, mapping.roomId, settings);
    checkAllGuessedAndFinish(io, mapping.roomId, settings);
  });

  // ─── Wie Ben Ik? — Reroll Character ──────────────────
  socket.on('whatami:reroll', (data: { targetPlayerId: string }) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i' || room.status !== 'playing') return;

    const result = rerollCharacter(mapping.roomId, data.targetPlayerId, mapping.playerId);
    if (!result.success) {
      socket.emit('whatami:reroll-result', { success: false, error: result.error });
      return;
    }

    socket.emit('whatami:reroll-result', { success: true });

    // Broadcast updated state so everyone sees the new character (except the target)
    const settings = room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;
    broadcastWhatAmIState(io, mapping.roomId, settings);
  });

  // ─── Wie Ben Ik? — Request State (reconnect) ─────────
  socket.on('whatami:request-state', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i') return;

    const inst = getWhatAmIInstance(mapping.roomId);
    if (!inst) return;

    const settings = room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;
    const player = room.players.find((p) => p.id === mapping.playerId);
    if (!player) return;

    const isModeratorHost = player.isHost && !settings.hostPlays;
    const state = isModeratorHost ? buildModeratorView(inst) : buildPlayerView(inst, mapping.playerId);
    socket.emit('whatami:state-update', state);
  });

  // ─── Wie Ben Ik? — Force End (host only) ─────────────
  socket.on('whatami:force-end', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'what-am-i' || room.status !== 'playing') return;

    const inst = getWhatAmIInstance(mapping.roomId);
    if (!inst || inst.finished) return;

    const finished = finishGame(mapping.roomId);
    if (!finished) return;

    const settings = room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;
    broadcastWhatAmIGameEnd(io, mapping.roomId, finished, settings);
    console.log(`[WieBenik] Force-ended by host: ${mapping.roomId}`);
  });

  // ─── Snelste Vinger — Update Settings ────────────────
  socket.on('snelstevinger:update-settings', (settings) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'snelste-vinger') return;

    if (updateSnelsteVingerSettings(mapping.roomId, settings)) {
      io.to(mapping.roomId).emit('snelstevinger:settings-updated', settings);
    }
  });

  // ─── Snelste Vinger — Start Game ─────────────────────
  socket.on('snelstevinger:start-game', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) {
      socket.emit('error', { message: 'Alleen de host kan het spel starten.' });
      return;
    }

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'snelste-vinger') return;
    if (room.status !== 'lobby') return;

    const settings = room.snelsteVingerSettings ?? DEFAULT_SNELSTEVINGER_SETTINGS;
    const roomId = room.roomId;

    // Pre-validate
    const players = settings.hostPlays
      ? room.players.filter((p) => p.connected || p.isBot)
      : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

    if (players.length < 2) {
      socket.emit('error', { message: 'Er zijn minimaal 2 spelers nodig voor Snelste Vinger.' });
      return;
    }

    if ((settings.categoryIds ?? []).length === 0) {
      socket.emit('error', { message: 'Selecteer minimaal één trivia-categorie.' });
      return;
    }

    // Show briefing first, then countdown, then start
    io.to(roomId).emit('game-started');

    const active = settings.hostPlays
      ? room.players.filter((p) => p.connected || p.isBot)
      : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

    startBriefing(io, roomId, 'snelste-vinger', undefined, 'snelste-vinger', active, () => {
      startCountdownThenRun(io, roomId, () => {
        const currentRoom = getRoom(roomId);
        if (!currentRoom) return;

        const result = startSnelsteVingerGame(currentRoom, settings);
        if ('error' in result) {
          io.to(roomId).emit('error', { message: result.error });
          return;
        }

        currentRoom.status = 'playing';
        startSnelsteVingerQuestion(io, roomId);
      });
    });

    console.log(`[SnelsteVinger] Started: ${roomId}`);
  });

  // ─── Snelste Vinger — Buzz ───────────────────────────
  socket.on('snelstevinger:buzz', ({ answer }) => {
    if (isRateLimited(socket.id)) return;
    if (typeof answer !== 'string' || answer.length === 0 || answer.length > 200) return;

    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'snelste-vinger' || room.status !== 'playing') return;

    const instance = getSnelsteVingerInstance(mapping.roomId);
    if (!instance) return;

    const result = processSnelsteVingerBuzz(mapping.roomId, mapping.playerId, answer);
    if ('error' in result) return;

    socket.emit('snelstevinger:buzz-result', { correct: result.correct, penalty: result.penalty });

    if (result.correct) {
      // Someone won this question — stop the timer and broadcast
      clearQuestionTimer(mapping.roomId);
      const scores = buildScores(instance);
      const correctAnswer = getCurrentAnswer(mapping.roomId) ?? '';
      const winnerName = instance.playerInfo.get(mapping.playerId)?.nickname ?? '';

      io.to(mapping.roomId).emit('snelstevinger:question-won', {
        winnerId: mapping.playerId,
        winnerName,
        correctAnswer,
        scores,
      });

      // Auto-advance after 3s reveal
      const revealTimeout = setTimeout(() => {
        handleSnelsteVingerAdvance(io, mapping.roomId);
      }, 3000);
      setRevealTimer(mapping.roomId, revealTimeout);
    }
  });

  // ─── Tekenwedstrijd Events ─────────────────────────────
  socket.on('drawing:update-settings', (settings) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;
    const ok = updateDrawingSettings(mapping.roomId, settings);
    if (ok) {
      io.to(mapping.roomId).emit('drawing:settings-updated', settings);
    }
  });

  socket.on('drawing:start-game', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'drawing') return;
    if (room.status !== 'lobby') return;

    const settings = room.drawingSettings ?? DEFAULT_DRAWING_SETTINGS;
    const roomId = room.roomId;

    // Pre-validate
    const activePlayers = room.players.filter((p) => (p.connected || p.isBot) && !(p.isHost && !settings.hostPlays));
    if (activePlayers.length < 2) {
      socket.emit('error', { message: 'Minimaal 2 spelers nodig voor de tekenwedstrijd.' });
      return;
    }

    if ((settings.categoryIds ?? []).length === 0 && (settings.customWords ?? []).length === 0) {
      socket.emit('error', { message: 'Selecteer minimaal één categorie of voeg eigen woorden toe.' });
      return;
    }

    io.to(roomId).emit('game-started');

    const active = settings.hostPlays
      ? room.players.filter((p) => p.connected || p.isBot)
      : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

    startBriefing(io, roomId, 'drawing', undefined, 'drawing', active, () => {
      startCountdownThenRun(io, roomId, () => {
        const currentRoom = getRoom(roomId);
        if (!currentRoom) return;

        const result = startDrawingGame(currentRoom, settings);
        if ('error' in result) {
          io.to(roomId).emit('error', { message: result.error });
          return;
        }

        currentRoom.status = 'playing';
        startDrawingTurn(io, roomId);
      });
    });

    console.log(`[Drawing] Started: ${roomId}`);
  });

  socket.on('drawing:pick-word', ({ word }) => {
    if (typeof word !== 'string' || word.length === 0 || word.length > 100) return;
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const drawerId = getDrawerId(mapping.roomId);
    if (mapping.playerId !== drawerId) return;

    const ok = selectWord(mapping.roomId, word);
    if (!ok) return;

    // Start drawing phase
    startDrawingTimer(io, mapping.roomId);
    broadcastDrawingState(io, mapping.roomId);
  });

  socket.on('drawing:stroke', ({ stroke }) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const drawerId = getDrawerId(mapping.roomId);
    if (mapping.playerId !== drawerId) return;

    const ok = addStroke(mapping.roomId, stroke);
    if (!ok) return;

    // Relay stroke to all others in the room (not back to drawer)
    socket.to(mapping.roomId).emit('drawing:stroke', { stroke });
  });

  socket.on('drawing:fill', ({ color, x, y }) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const drawerId = getDrawerId(mapping.roomId);
    if (mapping.playerId !== drawerId) return;

    if (typeof color !== 'string' || typeof x !== 'number' || typeof y !== 'number') return;

    // Relay fill to all others in the room
    socket.to(mapping.roomId).emit('drawing:fill', { color, x, y });
  });

  socket.on('drawing:clear-canvas', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const drawerId = getDrawerId(mapping.roomId);
    if (mapping.playerId !== drawerId) return;

    const ok = clearDrawingCanvas(mapping.roomId);
    if (!ok) return;

    socket.to(mapping.roomId).emit('drawing:clear-canvas');
  });

  socket.on('drawing:undo', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const drawerId = getDrawerId(mapping.roomId);
    if (mapping.playerId !== drawerId) return;

    const ok = undoStroke(mapping.roomId);
    if (!ok) return;

    // Send full strokes buffer to re-render (simpler than tracking undo on client)
    const strokes = getStrokes(mapping.roomId);
    const room = getRoom(mapping.roomId);
    if (!room) return;
    for (const player of room.players) {
      if (player.id === mapping.playerId) continue;
      const sid = getSocketIdForPlayer(mapping.roomId, player.id);
      if (!sid) continue;
      // Clear and re-send all strokes
      io.to(sid).emit('drawing:clear-canvas');
      for (const s of strokes) {
        io.to(sid).emit('drawing:stroke', { stroke: s });
      }
    }
  });

  socket.on('drawing:guess', ({ guess }) => {
    if (isRateLimited(socket.id)) return;
    if (typeof guess !== 'string' || guess.length === 0 || guess.length > 200) return;

    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'drawing' || room.status !== 'playing') return;

    const result = processDrawingGuess(mapping.roomId, mapping.playerId, guess);

    if (result.isDrawer || result.alreadyGuessed) return;

    if (result.containsWord) {
      // Don't reveal the word — silently reject
      socket.emit('drawing:guess-result', { correct: false });
      return;
    }

    const inst = getDrawingInstance(mapping.roomId);
    const playerName = inst?.playerInfo.get(mapping.playerId)?.nickname ?? '';

    // Broadcast guess to all players (so everyone sees who guessed what)
    if (!result.correct) {
      io.to(mapping.roomId).emit('drawing:guess-broadcast', {
        playerName,
        guess,
        isClose: result.isClose,
      });
    }

    socket.emit('drawing:guess-result', { correct: result.correct });

    if (result.correct && result.position != null && result.score != null) {
      io.to(mapping.roomId).emit('drawing:player-guessed', {
        playerId: mapping.playerId,
        playerName,
        position: result.position,
        score: result.score,
      });

      // Update clients with new state (correctGuessers, scores)
      broadcastDrawingState(io, mapping.roomId);

      // Check if all guessers got it
      if (allGuessersCorrect(mapping.roomId)) {
        handleDrawingTurnEnd(io, mapping.roomId);
      }
    }
  });

  // ─── Muziek — Update Settings ────────────────────────
  socket.on('muziek:update-settings', (settings) => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'muziek') return;

    if (updateMuziekSettings(mapping.roomId, settings)) {
      io.to(mapping.roomId).emit('muziek:settings-updated', settings);
    }
  });

  // ─── Muziek — Start Game ─────────────────────────────
  socket.on('muziek:start-game', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;
    if (!isHost(mapping.roomId, mapping.playerId)) {
      socket.emit('error', { message: 'Alleen de host kan het spel starten.' });
      return;
    }

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'muziek') return;
    if (room.status !== 'lobby') return;

    const settings = room.muziekSettings ?? DEFAULT_MUZIEK_SETTINGS;
    const roomId = room.roomId;

    // Pre-validate
    const players = settings.hostPlays
      ? room.players.filter((p) => p.connected || p.isBot)
      : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

    if (players.length < 2) {
      socket.emit('error', { message: 'Er zijn minimaal 2 spelers nodig.' });
      return;
    }

    if ((settings.categoryIds ?? []).length === 0) {
      socket.emit('error', { message: 'Selecteer minimaal één muziekcategorie.' });
      return;
    }

    io.to(roomId).emit('game-started');

    const active = settings.hostPlays
      ? room.players.filter((p) => p.connected || p.isBot)
      : room.players.filter((p) => (p.connected || p.isBot) && !p.isHost);

    startBriefing(io, roomId, 'muziek', undefined, 'muziek', active, () => {
      startCountdownThenRun(io, roomId, async () => {
        const currentRoom = getRoom(roomId);
        if (!currentRoom) return;

        const playerList = active.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          avatarUrl: p.avatarUrl,
          isBot: p.isBot,
        }));

        const instance = await startMuziekGame(roomId, settings, playerList, (inst) => {
          // Song ended (timeout or correct answer)
          const song = inst.songs[inst.currentSongIndex];
          const scores = getMuziekScores(inst);

          if (inst.answeredCorrectThisSong) {
            const winnerName = inst.players.find(p => p.id === inst.answeredCorrectThisSong)?.nickname ?? '';
            io.to(roomId).emit('muziek:song-won', {
              winnerId: inst.answeredCorrectThisSong,
              winnerName,
              correctTitle: song?.title ?? '',
              correctArtist: song?.artist ?? '',
              coverUrl: song?.coverUrl ?? null,
              media: song?.media ?? null,
              scores,
            });
          } else {
            io.to(roomId).emit('muziek:song-timeout', {
              correctTitle: song?.title ?? '',
              correctArtist: song?.artist ?? '',
              coverUrl: song?.coverUrl ?? null,
              media: song?.media ?? null,
              scores,
            });
          }

          // Auto-advance after 4s reveal
          setTimeout(() => {
            const hasNext = advanceToNextSong(roomId);
            if (!hasNext) {
              // Game over
              const finalScores = getMuziekScores(inst);
              io.to(roomId).emit('muziek:game-end', { scores: finalScores });
              cleanupMuziekGame(roomId);
              const r = getRoom(roomId);
              if (r) r.status = 'finished';
            } else {
              // Send next song to all players
              broadcastMuziekSong(io, roomId);
            }
          }, 4000);
        }, (inst) => {
          // Heardle phase advanced — broadcast updated state to all players
          broadcastMuziekSong(io, roomId);
        });

        currentRoom.status = 'playing';
        broadcastMuziekSong(io, roomId);

        // Send autocomplete pool for text input mode (not meerkeuze)
        // Emitted AFTER broadcastMuziekSong so the client has mounted MuziekGame first
        if (!settings.meerkeuze) {
          const pool = getAutocompletePool(instance);
          io.to(roomId).emit('muziek:autocomplete-pool', { pool });
        }
      });
    });

    console.log(`[Muziek] Started: ${roomId}`);
  });

  // ─── Muziek — Buzz ───────────────────────────────────
  socket.on('muziek:buzz', ({ answer }) => {
    if (isRateLimited(socket.id)) return;
    if (typeof answer !== 'string' || answer.length === 0 || answer.length > 200) return;

    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'muziek' || room.status !== 'playing') return;

    const instance = getMuziekInstance(mapping.roomId);
    if (!instance) return;

    const result = processMuziekBuzz(mapping.roomId, mapping.playerId, answer);
    if (!result) return;

    socket.emit('muziek:buzz-result', { correct: result.correct, penalty: result.penalty, position: result.position, mediaOnly: result.mediaOnly, points: result.points });

    // Media-only match: broadcast updated scores but don't end/advance
    if (result.mediaOnly) {
      broadcastMuziekSong(io, mapping.roomId);
      return;
    }

    // In everyone-scores mode, broadcast updated state when someone gets it right
    if (result.correct && !instance.settings.snelsteRader) {
      if (instance.settings.heardleMode) {
        // Check if phase should auto-advance now that this player answered
        const advanced = checkHeardleAutoAdvance(instance);
        if (!advanced) {
          // Full state broadcast so the guesser sees the reveal + bots re-schedule
          broadcastMuziekSong(io, mapping.roomId);
        }
        // If advanced, onPhaseAdvance callback already broadcasts
      } else {
        const scores = getMuziekScores(instance);
        io.to(mapping.roomId).emit('muziek:scores-updated', { scores });
      }
    }
  });

  // ─── Muziek — Heardle Skip ───────────────────────────
  socket.on('muziek:heardle-skip', () => {
    if (isRateLimited(socket.id)) return;

    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'muziek' || room.status !== 'playing') return;

    const instance = getMuziekInstance(mapping.roomId);
    if (!instance || !instance.settings.heardleMode) return;

    const advanced = processHeardleSkip(mapping.roomId, mapping.playerId);

    if (!advanced) {
      // Phase didn't advance yet, but broadcast updated skip count to all
      broadcastMuziekSong(io, mapping.roomId);
    }
    // If phase advanced, onPhaseAdvance callback already broadcasts
  });

  // ─── Muziek — Give Up ────────────────────────────────
  socket.on('muziek:give-up', () => {
    if (isRateLimited(socket.id)) return;

    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.gameCategory !== 'muziek' || room.status !== 'playing') return;

    const instance = getMuziekInstance(mapping.roomId);
    if (!instance || !instance.settings.heardleMode) return;

    const advanced = processGiveUp(mapping.roomId, mapping.playerId);

    if (!advanced) {
      broadcastMuziekSong(io, mapping.roomId);
    }
  });

  // ─── Disconnect ──────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    socketEventTimestamps.delete(socket.id);
    handleDisconnect(io, socket);
  });
}

// ─── Helpers ───────────────────────────────────────────

function broadcastMuziekSong(io: IOServer, roomId: string): void {
  const instance = getMuziekInstance(roomId);
  if (!instance) return;
  const room = getRoom(roomId);
  if (!room) return;

  for (const player of room.players) {
    const sid = getSocketIdForPlayer(roomId, player.id);
    if (!sid) continue;
    const state = buildMuziekClientState(instance, player.id, false);
    io.to(sid).emit('muziek:song', state);
  }

  // Auto-skip for bots in heardle mode
  if (instance.settings.heardleMode) {
    scheduleBotHeardleSkips(io, roomId, instance);
  }
}

function scheduleBotHeardleSkips(io: IOServer, roomId: string, instance: ReturnType<typeof getMuziekInstance>): void {
  if (!instance) return;
  const bots = instance.players.filter(p => p.isBot);
  for (const bot of bots) {
    // Skip after a short random delay (1-3s) to simulate "listening"
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      const inst = getMuziekInstance(roomId);
      if (!inst || inst.songEnding) return;
      if (inst.answeredCorrectSet.has(bot.id)) return;
      if (inst.gaveUpThisSong.has(bot.id)) return;
      if (inst.heardleSkipped.has(bot.id)) return;

      // Randomly: 30% guess correct, 20% give up, 50% skip
      const roll = Math.random();
      if (roll < 0.3) {
        // Bot guesses correctly
        const song = inst.songs[inst.currentSongIndex];
        if (song) {
          processMuziekBuzz(roomId, bot.id, song.title);
          // Check if phase should advance now that bot answered
          const advanced = checkHeardleAutoAdvance(inst);
          if (!advanced) {
            broadcastMuziekSong(io, roomId);
          }
        }
      } else if (roll < 0.5) {
        // Bot gives up
        const advanced = processGiveUp(roomId, bot.id);
        if (!advanced) {
          broadcastMuziekSong(io, roomId);
        }
      } else {
        // Bot skips
        const advanced = processHeardleSkip(roomId, bot.id);
        if (!advanced) {
          broadcastMuziekSong(io, roomId);
        }
      }
    }, delay);
  }
}

function handleLeave(io: IOServer, socket: IOSocket): void {
  const result = leaveRoom(socket.id);
  if (!result) return;

  socket.leave(result.roomId);

  if (result.roomDeleted) {
    // Clean up all resources for this room
    cleanupGame(result.roomId);
    cleanupWhatAmIGame(result.roomId);
    cleanupSnelsteVingerGame(result.roomId);
    cleanupDrawingGame(result.roomId);
    cleanupMuziekGame(result.roomId);
    roomRoundResults.delete(result.roomId);
    const countdown = roomCountdowns.get(result.roomId);
    if (countdown) {
      clearInterval(countdown);
      roomCountdowns.delete(result.roomId);
    }
  } else {
    io.to(result.roomId).emit('player-left', {
      playerId: result.playerId,
      newHostId: result.newHostId,
    });
  }

  console.log(`[Room] Player ${result.playerId} left ${result.roomId}`);
}

const DISCONNECT_GRACE_MS = 30_000; // 30 seconds to reconnect

function handleDisconnect(io: IOServer, socket: IOSocket): void {
  const result = disconnectPlayer(socket.id);
  if (!result) return;

  const { roomId, playerId, newHostId } = result;
  socket.leave(roomId);

  if (newHostId) {
    console.log(`[Room] Host ${playerId} disconnected from ${roomId}, host transferred to ${newHostId}`);
  } else {
    console.log(`[Room] Player ${playerId} disconnected from ${roomId}, waiting ${DISCONNECT_GRACE_MS / 1000}s for reconnect...`);
  }

  // Notify others that this player disconnected (but don't remove yet)
  const room = getRoom(roomId);
  if (room) {
    // Tell other players this player disconnected (they'll see connected: false)
    io.to(roomId).emit('player-left', { playerId, disconnected: true, newHostId });
  }

  // Schedule permanent removal after grace period
  scheduleDisconnectCleanup(playerId, DISCONNECT_GRACE_MS, () => {
    const currentRoom = getRoom(roomId);
    if (!currentRoom) return;

    // Player didn't reconnect in time — remove permanently
    const removeResult = removeDisconnectedPlayer(roomId, playerId);
    if (!removeResult) return;

    if (removeResult.roomDeleted) {
      cleanupGame(roomId);
      cleanupWhatAmIGame(roomId);
      cleanupSnelsteVingerGame(roomId);
      cleanupDrawingGame(roomId);
      roomRoundResults.delete(roomId);
      const countdown = roomCountdowns.get(roomId);
      if (countdown) {
        clearInterval(countdown);
        roomCountdowns.delete(roomId);
      }
    } else {
      io.to(roomId).emit('player-left', {
        playerId,
        newHostId: removeResult.newHostId,
      });

      // If a What Am I game is running, mark the disconnected player as gave-up
      // so the game can still end for remaining players
      const whatAmIInst = getWhatAmIInstance(roomId);
      if (whatAmIInst && !whatAmIInst.finished) {
        const tracker = whatAmIInst.trackers.get(playerId);
        if (tracker && !tracker.guessedCorrectly) {
          tracker.guessedCorrectly = true;
          tracker.gaveUp = true;
          tracker.score = 0;
          tracker.finishTimeMs = Date.now();
        }
        const settings = currentRoom.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;
        checkAllGuessedAndFinish(io, roomId, settings);
      }
    }

    console.log(`[Room] Player ${playerId} permanently removed from ${roomId} (timeout)`);
  });
}

// ─── Snelste Vinger Helpers ────────────────────────────

function startSnelsteVingerQuestion(io: IOServer, roomId: string): void {
  const instance = getSnelsteVingerInstance(roomId);
  if (!instance) return;

  const room = getRoom(roomId);
  if (!room) return;

  const settings = room.snelsteVingerSettings ?? DEFAULT_SNELSTEVINGER_SETTINGS;

  // Broadcast personalized state to each player
  for (const player of room.players) {
    if (!settings.hostPlays && player.isHost) continue;
    const playerSocketId = getSocketIdForPlayer(roomId, player.id);
    if (playerSocketId) {
      const state = buildClientState(instance, player.id);
      io.to(playerSocketId).emit('snelstevinger:question', state);
    }
  }

  // Also send to spectating host if applicable
  if (!settings.hostPlays) {
    const host = room.players.find((p) => p.isHost);
    if (host) {
      const hostSocketId = getSocketIdForPlayer(roomId, host.id);
      if (hostSocketId) {
        const state = buildClientState(instance, host.id);
        io.to(hostSocketId).emit('snelstevinger:question', state);
      }
    }
  }

  // Start question timer
  const questionTimer = setInterval(() => {
    const inst = getSnelsteVingerInstance(roomId);
    if (!inst || inst.winnerId) {
      clearInterval(questionTimer);
      return;
    }

    const elapsed = Date.now() - inst.questionStartTime;
    const remaining = settings.timePerQuestion * 1000 - elapsed;

    if (remaining <= 0) {
      clearInterval(questionTimer);
      clearQuestionTimer(roomId);

      // Time's up — nobody answered
      const correctAnswer = getCurrentAnswer(roomId) ?? '';
      const scores = buildScores(inst);
      io.to(roomId).emit('snelstevinger:question-timeout', { correctAnswer, scores });

      // Reset all streaks (nobody won)
      for (const [, data] of inst.scores) {
        data.streak = 0;
      }

      // Auto-advance after 3s reveal
      const revealTimeout = setTimeout(() => {
        handleSnelsteVingerAdvance(io, roomId);
      }, 3000);
      setRevealTimer(roomId, revealTimeout);
    }
  }, 250);
  setQuestionTimer(roomId, questionTimer);
}

function handleSnelsteVingerAdvance(io: IOServer, roomId: string): void {
  clearRevealTimer(roomId);

  const result = advanceQuestion(roomId);
  if (result === 'finished') {
    // Game over
    const instance = getSnelsteVingerInstance(roomId);
    const room = getRoom(roomId);
    if (instance && room) {
      const scores = buildScores(instance);
      io.to(roomId).emit('snelstevinger:game-end', { scores });

      // Update player scores on room for results page
      for (const s of scores) {
        const player = room.players.find((p) => p.id === s.playerId);
        if (player) player.score = s.score;
      }

      room.status = 'finished';

      // Build final results for the Results page
      const finalResults = {
        players: scores.map((s, i) => ({
          playerId: s.playerId,
          nickname: s.nickname,
          avatarUrl: s.avatarUrl,
          totalScore: s.score,
          roundScores: [s.score],
          rank: i + 1,
        })),
        roundResults: [],
      };
      io.to(roomId).emit('game-end', finalResults);
    }
    cleanupSnelsteVingerGame(roomId);
  } else {
    // Next question
    startSnelsteVingerQuestion(io, roomId);
  }
}

// ─── Tekenwedstrijd Helpers ────────────────────────────
function broadcastDrawingState(io: IOServer, roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;
  const drawerId = getDrawerId(roomId);
  const drawerState = buildDrawerState(roomId);
  const guesserState = buildGuesserState(roomId);
  if (!drawerState || !guesserState) return;

  for (const player of room.players) {
    const sid = getSocketIdForPlayer(roomId, player.id);
    if (!sid) continue;
    if (player.id === drawerId) {
      io.to(sid).emit('drawing:state-update', drawerState);
    } else {
      io.to(sid).emit('drawing:state-update', guesserState);
    }
  }
}

function startDrawingTurn(io: IOServer, roomId: string): void {
  const choices = getWordChoicesForDrawer(roomId);
  if (choices.length === 0) {
    // No more words available — end the game
    finishDrawingGame(io, roomId);
    return;
  }

  // Send word choices to drawer
  const drawerId = getDrawerId(roomId);
  if (!drawerId) return;
  const sid = getSocketIdForPlayer(roomId, drawerId);
  if (sid) {
    io.to(sid).emit('drawing:word-choices', { choices });
  }

  // Broadcast state (phase = picking)
  broadcastDrawingState(io, roomId);
}

function startDrawingTimer(io: IOServer, roomId: string): void {
  const inst = getDrawingInstance(roomId);
  if (!inst) return;

  const settings = inst.settings;
  const totalMs = settings.drawTimeSeconds * 1000;

  // Countdown timer — check every second
  inst.turnTimer = setInterval(() => {
    const remaining = Date.now() - inst.turnStartTime;
    if (remaining >= totalMs) {
      // Time's up!
      handleDrawingTurnEnd(io, roomId);
    }
  }, 1000);

  // Start hint reveal timer
  startHintTimer(roomId, (hint) => {
    // Broadcast updated hint to guessers
    const guesserState = buildGuesserState(roomId);
    if (!guesserState) return;
    const room = getRoom(roomId);
    if (!room) return;
    const drawerId = getDrawerId(roomId);
    for (const player of room.players) {
      if (player.id === drawerId) continue;
      const sid = getSocketIdForPlayer(roomId, player.id);
      if (sid) {
        io.to(sid).emit('drawing:state-update', { ...guesserState, hint });
      }
    }
  });
}

function handleDrawingTurnEnd(io: IOServer, roomId: string): void {
  const result = endTurn(roomId);
  if (!result) return;

  // Broadcast turn-end with reveal
  const inst = getDrawingInstance(roomId);
  if (!inst) return;

  const scores = getFinalScores(roomId) || [];
  io.to(roomId).emit('drawing:turn-end', { word: result.word, scores });

  // Broadcast reveal state
  broadcastDrawingState(io, roomId);

  // After 5 seconds, advance to next turn
  inst.revealTimer = setTimeout(() => {
    const advancement = advanceTurn(roomId);
    if (advancement === 'game-over') {
      finishDrawingGame(io, roomId);
    } else {
      startDrawingTurn(io, roomId);
    }
  }, 5000);
}

function finishDrawingGame(io: IOServer, roomId: string): void {
  const scores = getFinalScores(roomId) || [];
  io.to(roomId).emit('drawing:game-end', { scores });

  // Update room player scores
  const room = getRoom(roomId);
  if (room) {
    for (const s of scores) {
      const player = room.players.find((p) => p.id === s.playerId);
      if (player) player.score = s.score;
    }
    room.status = 'finished';

    // Build and emit final results
    const finalResults = {
      players: scores.map((s, i) => ({
        playerId: s.playerId,
        nickname: s.nickname,
        avatarUrl: s.avatarUrl,
        totalScore: s.score,
        roundScores: [s.score],
        rank: i + 1,
      })),
      roundResults: [],
    };
    io.to(roomId).emit('game-end', finalResults);
  }

  cleanupDrawingGame(roomId);
}
