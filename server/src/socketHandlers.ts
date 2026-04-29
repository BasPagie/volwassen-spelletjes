import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSettings,
  RoundResult,
} from '../../shared/types.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getSocketMapping,
  getSocketIdForPlayer,
  updateSettings,
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

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const DEV_MODE = process.env.DEV_MODE === 'true';

// Store round results per room for final results
const roomRoundResults = new Map<string, RoundResult[]>();

// Store countdown intervals per room for cleanup
const roomCountdowns = new Map<string, ReturnType<typeof setInterval>>();

// Guard against duplicate next-round clicks
const roomAdvancing = new Set<string>();

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
  socket.on('create-room', ({ nickname, avatarUrl }) => {
    const safeName = sanitizeNickname(nickname);
    if (!safeName || !isValidAvatar(avatarUrl)) {
      socket.emit('error', { message: 'Ongeldige naam of avatar.' });
      return;
    }
    const result = createRoom(socket.id, safeName, avatarUrl);
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

    // Countdown 3-2-1-GO before starting the first round
    const roomId = room.roomId;
    let count = 3;
    // Emit first count immediately, then tick every second
    io.to(roomId).emit('countdown', { count });
    count--;
    const countdownInterval = setInterval(() => {
      // Stop if room was deleted during countdown
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
        startNewRound(io, roomId);
      }
    }, 1000);
    roomCountdowns.set(roomId, countdownInterval);
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

    room.currentRoundIndex++;

    if (room.currentRoundIndex >= room.settings.rounds.length) {
      // Game over
      roomAdvancing.delete(room.roomId);
      endGame(io, room.roomId);
    } else {
      startNewRound(io, room.roomId);
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

    // Notify each player individually with their own player object
    for (const player of room.players) {
      const playerSocketId = getSocketIdForPlayer(room.roomId, player.id);
      if (playerSocketId) {
        io.to(playerSocketId).emit('room-joined', { room, player });
      }
    }
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

  // ─── Check Room ───────────────────────────────────────
  socket.on('check-room', ({ roomId }) => {
    if (typeof roomId !== 'string' || roomId.length > 10) return;
    const room = getRoom(roomId);
    socket.emit('room-check', {
      exists: !!room,
      joinable: !!room && room.status === 'lobby',
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
