import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSettings,
  RoundResult,
  WhatAmISettings,
  RoundType,
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
  startRound,
  getPlayerRoundState,
  getSpectatorRoundState,
  submitGroupGuess,
  submitAnswer,
  submitOpenDeurAnswer,
  skipOpenDeurQuestion,
  advanceOpenDeurQuestion,
  submitLingoGuess,
  getPlayerProgress,
  isRoundComplete,
  forceEndRound,
  getRoundResult,
  getFinalResults,
  startTimer,
  cleanupGame,
  finishBotPlayers,
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

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const DEV_MODE = process.env.DEV_MODE === 'true';

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
  roundType: RoundType | undefined,
  gameCategory: GameCategory,
  activePlayers: { id: string }[],
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
    if ('isBot' in p && (p as any).isBot) {
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
function startCountdownThenRun(io: IOServer, roomId: string, fn: () => void): void {
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
    const validCategories = ['woord', 'what-am-i', 'drawing', 'snelste-vinger'];
    const safeCategory = validCategories.includes(gameCategory) ? gameCategory : 'woord';
    const result = createRoom(socket.id, safeName, avatarUrl, safeCategory as import('../../shared/types.js').GameCategory);
    socket.join(result.room.roomId);
    socket.emit('room-created', { room: result.room, player: result.player });
    if (DEV_MODE) socket.emit('dev-mode-status', { enabled: true });
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
    if (DEV_MODE) socket.emit('dev-mode-status', { enabled: true });
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
    if (!settings || !Array.isArray(settings.rounds) || settings.rounds.length === 0 || settings.rounds.length > 5) return;
    const validTypes = ['connections', 'puzzelronde', 'opendeur', 'lingo'];
    const validDifficulties = ['easy', 'medium', 'hard'];
    for (const round of settings.rounds) {
      if (!validTypes.includes(round.type) || !validDifficulties.includes(round.difficulty)) return;
    }
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

    if (room.players.length < 1) {
      socket.emit('error', { message: 'Er zijn niet genoeg spelers.' });
      return;
    }

    // Ensure at least one player is actually playing
    const activePlayers = room.players.filter(
      (p) => !(p.isHost && !room.settings.hostPlays)
    );
    if (activePlayers.length < 1) {
      socket.emit('error', { message: 'Er moet minstens 1 speler meedoen.' });
      return;
    }

    room.status = 'playing';
    room.currentRoundIndex = 0;
    roomRoundResults.set(room.roomId, []);

    io.to(room.roomId).emit('game-started');

    // Show briefing first, then countdown, then start the round
    const roomId = room.roomId;
    const roundConfig = room.settings.rounds[room.currentRoundIndex];
    const active = activePlayers.filter((p) => p.connected || p.isBot);
    startBriefing(io, roomId, roundConfig.type, roundConfig.type, 'woord', active, () => {
      startCountdownThenRun(io, roomId, () => {
        startNewRound(io, roomId);
      });
    });
  });

  // ─── Submit Group Guess ──────────────────────────────
  socket.on('submit-group', ({ words }) => {
    if (isRateLimited(socket.id)) return;
    if (!Array.isArray(words) || words.length !== 4 || !words.every(w => typeof w === 'string')) return;
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.status !== 'playing') return;

    const result = submitGroupGuess(mapping.roomId, mapping.playerId, words, room);
    if (!result) return;

    // Get updated state for this player
    const roundState = getPlayerRoundState(mapping.roomId, mapping.playerId, room);
    if (!roundState) return;

    socket.emit('group-result', {
      correct: result.correct,
      group: result.group,
      roundState,
      hintWords: result.hintWords,
    });

    // Broadcast progress to all
    const progress = getPlayerProgress(mapping.roomId);
    io.to(mapping.roomId).emit('player-progress', progress);

    // Check if round is complete
    if (isRoundComplete(mapping.roomId)) {
      endCurrentRound(io, mapping.roomId);
    }
  });

  // ─── Submit Answer (Puzzelronde) ─────────────────────
  socket.on('submit-answer', ({ answer }) => {
    if (isRateLimited(socket.id)) return;
    if (typeof answer !== 'string' || answer.length > 100) return;
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.status !== 'playing') return;

    const result = submitAnswer(mapping.roomId, mapping.playerId, answer, room);
    if (!result) return;

    const roundState = getPlayerRoundState(mapping.roomId, mapping.playerId, room);
    if (!roundState) return;

    socket.emit('answer-result', {
      correct: result.correct,
      groupWords: result.groupWords,
      roundState,
    });

    // Broadcast progress
    const progress = getPlayerProgress(mapping.roomId);
    io.to(mapping.roomId).emit('player-progress', progress);

    if (isRoundComplete(mapping.roomId)) {
      endCurrentRound(io, mapping.roomId);
    }
  });

  // ─── Submit Open Deur Answer ─────────────────────────
  socket.on('submit-opendeur-answer', ({ answer }) => {
    if (isRateLimited(socket.id)) return;
    if (typeof answer !== 'string' || answer.length > 200) return;
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.status !== 'playing') return;

    const result = submitOpenDeurAnswer(mapping.roomId, mapping.playerId, answer, room);
    if (!result) return;

    // Get round state BEFORE advancing (so completed question view is included)
    const roundState = getPlayerRoundState(mapping.roomId, mapping.playerId, room);
    if (!roundState) return;

    if (result.correct && result.questionComplete) {
      // Emit the completed state so client can flash the last answer
      socket.emit('opendeur-result', {
        correct: true,
        matchedAnswer: result.matchedAnswer,
        roundState,
        questionComplete: true,
      });
      // Now advance to next question (if not finished) and send the new state after a delay
      if (!result.playerFinished) {
        advanceOpenDeurQuestion(mapping.roomId, mapping.playerId);
        const nextRoundState = getPlayerRoundState(mapping.roomId, mapping.playerId, room);
        if (nextRoundState) {
          setTimeout(() => {
            socket.emit('opendeur-next-question', {
              roundState: nextRoundState,
              previousAnswers: [],
            });
          }, 800);
        }
      }
    } else {
      socket.emit('opendeur-result', {
        correct: result.correct,
        matchedAnswer: result.matchedAnswer,
        roundState,
        questionComplete: false,
      });
    }

    // Broadcast progress
    const progress = getPlayerProgress(mapping.roomId);
    io.to(mapping.roomId).emit('player-progress', progress);

    if (isRoundComplete(mapping.roomId)) {
      endCurrentRound(io, mapping.roomId);
    }
  });

  // ─── Skip Open Deur Question ─────────────────────────
  socket.on('skip-question', () => {
    if (isRateLimited(socket.id)) return;
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.status !== 'playing') return;

    const result = skipOpenDeurQuestion(mapping.roomId, mapping.playerId);
    if (!result) return;

    const roundState = getPlayerRoundState(mapping.roomId, mapping.playerId, room);
    if (!roundState) return;

    socket.emit('opendeur-next-question', {
      roundState,
      previousAnswers: result.previousAnswers,
    });

    // Broadcast progress
    const progress = getPlayerProgress(mapping.roomId);
    io.to(mapping.roomId).emit('player-progress', progress);

    if (isRoundComplete(mapping.roomId)) {
      endCurrentRound(io, mapping.roomId);
    }
  });

  // ─── Submit Lingo Guess ──────────────────────────────
  socket.on('submit-lingo-guess', ({ guess }) => {
    if (isRateLimited(socket.id)) return;
    if (typeof guess !== 'string' || guess.length > 10) return;
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room || room.status !== 'playing') return;

    const result = submitLingoGuess(mapping.roomId, mapping.playerId, guess, room);
    if (!result) return;

    const roundState = getPlayerRoundState(mapping.roomId, mapping.playerId, room);
    if (!roundState) return;

    if (result.wordComplete && result.previousWord && !result.playerFinished) {
      // Word complete, advancing to next word
      socket.emit('lingo-next-word', {
        roundState,
        previousWord: result.previousWord,
      });
    } else {
      socket.emit('lingo-result', {
        correct: result.correct,
        feedback: result.feedback,
        roundState,
      });
    }

    // Broadcast progress
    const progress = getPlayerProgress(mapping.roomId);
    io.to(mapping.roomId).emit('player-progress', progress);

    if (isRoundComplete(mapping.roomId)) {
      endCurrentRound(io, mapping.roomId);
    }
  });

  // ─── Next Round ──────────────────────────────────────
  socket.on('next-round', () => {
    const mapping = getSocketMapping(socket.id);
    if (!mapping) return;

    const room = getRoom(mapping.roomId);
    if (!room) return;

    if (room.settings.hostControl && !isHost(mapping.roomId, mapping.playerId)) return;

    // Guard: only allow advancing if the current round has actually ended
    const storedResults = roomRoundResults.get(room.roomId) ?? [];
    if (storedResults.length <= room.currentRoundIndex) return; // round hasn't ended yet

    // Guard: prevent rapid double-clicks
    if (roomAdvancing.has(room.roomId)) return;
    roomAdvancing.add(room.roomId);

    try {
      room.currentRoundIndex++;

      if (room.currentRoundIndex >= room.settings.rounds.length) {
        // Game over
        endGame(io, room.roomId);
      } else {
        const roundConfig = room.settings.rounds[room.currentRoundIndex];
        const active = room.players.filter(
          (p) => (p.connected || p.isBot) && !(p.isHost && !room.settings.hostPlays)
        );
        startBriefing(io, room.roomId, roundConfig.type, roundConfig.type, 'woord', active, () => {
          startCountdownThenRun(io, room.roomId, () => {
            startNewRound(io, room.roomId);
          });
        });
      }
    } finally {
      roomAdvancing.delete(room.roomId);
    }
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
    cleanupBriefing(room.roomId);

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
    if (!DEV_MODE) return;
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
    if (!DEV_MODE) return;
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
    let roundState: import('../../shared/types.js').RoundState | null = null;
    let roundResult: import('../../shared/types.js').RoundResult | null = null;
    let finalResultsData: import('../../shared/types.js').FinalResults | null = null;
    let progress: import('../../shared/types.js').PlayerProgress[] = [];

    if (room.status === 'playing') {
      // Check if there's an active game
      const playerState = getPlayerRoundState(roomId, playerId, room);
      const spectatorState = player.isHost && !room.settings.hostPlays
        ? getSpectatorRoundState(roomId, room)
        : null;
      roundState = playerState ?? spectatorState ?? null;

      // Check if we're between rounds (round-end)
      const storedResults = roomRoundResults.get(roomId) ?? [];
      if (storedResults.length > room.currentRoundIndex) {
        // We have a result for the current round → round-end phase
        phase = 'round-end';
        roundResult = storedResults[storedResults.length - 1];
      } else if (roundState) {
        phase = 'playing';
      } else {
        phase = 'playing'; // maybe between rounds, client will show loading
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
      roundState,
      phase,
      roundResult,
      finalResults: finalResultsData,
      playerProgress: progress,
    });

    if (DEV_MODE) socket.emit('dev-mode-status', { enabled: true });

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
    const safePackIds = Array.isArray((settings as any).packIds)
      ? (settings as any).packIds.filter((id: unknown) => typeof id === 'string' && loadedPackIds.includes(id as string))
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

        if (DEV_MODE) {
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

  // ─── Disconnect ──────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    socketEventTimestamps.delete(socket.id);
    handleDisconnect(io, socket);
  });
}

// ─── Helpers ───────────────────────────────────────────

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
    }

    console.log(`[Room] Player ${playerId} permanently removed from ${roomId} (timeout)`);
  });
}

function startNewRound(io: IOServer, roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  const result = startRound(room);
  if (!result) {
    io.to(roomId).emit('error', { message: 'Kon de ronde niet starten. Geen puzzels beschikbaar.' });
    return;
  }

  const roundConfig = room.settings.rounds[room.currentRoundIndex];

  // Send personalized round state to each player
  for (const player of room.players) {
    // Skip spectating host — handled below
    if (player.isHost && !room.settings.hostPlays) continue;

    const playerState = getPlayerRoundState(roomId, player.id, room);
    if (!playerState) continue;
    const sid = getSocketIdForPlayer(roomId, player.id);
    if (sid) {
      io.to(sid).emit('round-start', {
        roundIndex: room.currentRoundIndex,
        roundState: playerState,
        roundType: roundConfig.type,
      });
    }
  }

  // Send spectator view to host if they are not playing
  if (!room.settings.hostPlays) {
    const host = room.players.find((p) => p.isHost);
    if (host) {
      const spectatorState = getSpectatorRoundState(roomId, room);
      if (spectatorState) {
        const sid = getSocketIdForPlayer(roomId, host.id);
        if (sid) {
          io.to(sid).emit('round-start', {
            roundIndex: room.currentRoundIndex,
            roundState: spectatorState,
            roundType: roundConfig.type,
          });
        }
      }
    }
  }

  // Start timer if configured
  if (room.settings.timeLimitSeconds) {
    startTimer(
      roomId,
      (timeRemainingMs) => {
        io.to(roomId).emit('time-update', { timeRemainingMs });
      },
      () => {
        forceEndRound(roomId);
        endCurrentRound(io, roomId);
      }
    );
  }

  // Dev mode: auto-finish bot players after a short delay
  if (DEV_MODE && room.players.some((p) => p.isBot)) {
    const delay = 2000 + Math.floor(Math.random() * 3000); // 2-5 seconds
    setTimeout(() => {
      const currentRoom = getRoom(roomId);
      if (!currentRoom) return;
      finishBotPlayers(roomId, currentRoom);
      const progress = getPlayerProgress(roomId);
      io.to(roomId).emit('player-progress', progress);
      if (isRoundComplete(roomId)) {
        endCurrentRound(io, roomId);
      }
    }, delay);
  }
}

function endCurrentRound(io: IOServer, roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  const roundResult = getRoundResult(roomId, room);
  if (!roundResult) return; // already ended (roundEnding flag or no instance)

  // Store round result
  const results = roomRoundResults.get(roomId) ?? [];
  results.push(roundResult);
  roomRoundResults.set(roomId, results);

  io.to(roomId).emit('round-end', roundResult);
}

function endGame(io: IOServer, roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  room.status = 'finished';

  const allResults = roomRoundResults.get(roomId) ?? [];
  const finalResults = getFinalResults(room, allResults);

  io.to(roomId).emit('game-end', finalResults);
  cleanupGame(roomId);
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
