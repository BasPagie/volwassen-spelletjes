import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import type {
  GameRoom,
  Player,
  GameSettings,
} from '../../shared/types.js';
import { PREMADE_AVATARS } from '../../shared/types.js';

const MAX_PLAYERS_PER_ROOM = 20;

const BOT_NAMES = ['Bot Anna', 'Bot Bram', 'Bot Cees', 'Bot Daan', 'Bot Eva', 'Bot Fien', 'Bot Gijs', 'Bot Henk'];

// In-memory room storage
const rooms = new Map<string, GameRoom>();

// Map socket.id → { roomId, playerId }
const socketToRoom = new Map<string, { roomId: string; playerId: string }>();

// Track pending disconnects (playerId → timeout) for grace period
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function createRoom(socketId: string, nickname: string, avatarUrl: string): { room: GameRoom; player: Player } {
  const roomId = generateRoomId();
  const playerId = uuidv4();

  const player: Player = {
    id: playerId,
    nickname,
    avatarUrl,
    isHost: true,
    score: 0,
    connected: true,
  };

  const room: GameRoom = {
    roomId,
    players: [player],
    settings: {
      rounds: [
        { type: 'connections', difficulty: 'medium' },
        { type: 'puzzelronde', difficulty: 'medium' },
        { type: 'opendeur', difficulty: 'medium' },
      ],
      attemptsMode: 'limited',
      maxAttempts: 6,
      timeLimitSeconds: 120,
      hostControl: true,
      hostPlays: true,
    },
    status: 'lobby',
    currentRoundIndex: 0,
  };

  rooms.set(roomId, room);
  socketToRoom.set(socketId, { roomId, playerId });

  return { room, player };
}

export function joinRoom(socketId: string, roomId: string, nickname: string, avatarUrl: string): { room: GameRoom; player: Player } | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.status !== 'lobby') return null;

  // Check if there's a disconnected player with the same nickname — reclaim their slot
  const disconnected = room.players.find((p) => !p.connected && !p.isBot && p.nickname === nickname);
  if (disconnected) {
    disconnected.connected = true;
    disconnected.avatarUrl = avatarUrl;
    // Cancel any pending disconnect cleanup
    const timer = disconnectTimers.get(disconnected.id);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(disconnected.id);
    }
    socketToRoom.set(socketId, { roomId, playerId: disconnected.id });
    return { room, player: disconnected };
  }

  if (room.players.length >= MAX_PLAYERS_PER_ROOM) return null;

  const playerId = uuidv4();
  const player: Player = {
    id: playerId,
    nickname,
    avatarUrl,
    isHost: false,
    score: 0,
    connected: true,
  };

  room.players.push(player);
  socketToRoom.set(socketId, { roomId, playerId });

  return { room, player };
}

export function leaveRoom(socketId: string): { roomId: string; playerId: string; newHostId?: string; roomDeleted: boolean } | null {
  const mapping = socketToRoom.get(socketId);
  if (!mapping) return null;

  const { roomId, playerId } = mapping;
  const room = rooms.get(roomId);
  if (!room) {
    socketToRoom.delete(socketId);
    return null;
  }

  room.players = room.players.filter((p) => p.id !== playerId);
  socketToRoom.delete(socketId);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return { roomId, playerId, roomDeleted: true };
  }

  // Transfer host if the leaving player was host
  let newHostId: string | undefined;
  const wasHost = room.players.every((p) => !p.isHost);
  if (wasHost && room.players.length > 0) {
    room.players[0].isHost = true;
    newHostId = room.players[0].id;
  }

  return { roomId, playerId, newHostId, roomDeleted: false };
}

// Mark player as disconnected (but keep them in the room for reconnection)
// If the disconnected player was the host, immediately transfer host to another connected player.
export function disconnectPlayer(socketId: string): { roomId: string; playerId: string; newHostId?: string } | null {
  const mapping = socketToRoom.get(socketId);
  if (!mapping) return null;

  const { roomId, playerId } = mapping;
  const room = rooms.get(roomId);
  if (!room) {
    socketToRoom.delete(socketId);
    return null;
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    socketToRoom.delete(socketId);
    return null;
  }

  player.connected = false;
  socketToRoom.delete(socketId);

  // If this player was the host, transfer host immediately
  let newHostId: string | undefined;
  if (player.isHost) {
    const nextHost = room.players.find((p) => p.id !== playerId && p.connected && !p.isBot);
    if (nextHost) {
      player.isHost = false;
      nextHost.isHost = true;
      newHostId = nextHost.id;
    }
  }

  return { roomId, playerId, newHostId };
}

// Schedule a player removal after a grace period. Returns the playerId so caller can cancel.
export function scheduleDisconnectCleanup(
  playerId: string,
  delayMs: number,
  onExpire: () => void,
): void {
  // Clear any existing timer for this player
  const existing = disconnectTimers.get(playerId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    disconnectTimers.delete(playerId);
    onExpire();
  }, delayMs);
  disconnectTimers.set(playerId, timer);
}

// Reconnect a player with a new socket
export function reconnectPlayer(socketId: string, roomId: string, playerId: string): { room: GameRoom; player: Player } | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  // Cancel any pending disconnect cleanup
  const timer = disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(playerId);
  }

  // Mark player as connected and update socket mapping
  player.connected = true;
  socketToRoom.set(socketId, { roomId, playerId });

  return { room, player };
}

// Remove a disconnected player permanently (called when grace period expires)
export function removeDisconnectedPlayer(roomId: string, playerId: string): { newHostId?: string; roomDeleted: boolean } | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return { roomDeleted: true };
  }

  let newHostId: string | undefined;
  const wasHost = room.players.every((p) => !p.isHost);
  if (wasHost && room.players.length > 0) {
    room.players[0].isHost = true;
    newHostId = room.players[0].id;
  }

  return { newHostId, roomDeleted: false };
}

export function getRoom(roomId: string): GameRoom | undefined {
  return rooms.get(roomId);
}

export function getSocketMapping(socketId: string): { roomId: string; playerId: string } | undefined {
  return socketToRoom.get(socketId);
}

export function updateSettings(roomId: string, settings: GameSettings): boolean {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'lobby') return false;
  room.settings = settings;
  return true;
}

export function getPlayerInRoom(roomId: string, playerId: string): Player | undefined {
  const room = rooms.get(roomId);
  return room?.players.find((p) => p.id === playerId);
}

export function isHost(roomId: string, playerId: string): boolean {
  const player = getPlayerInRoom(roomId, playerId);
  return player?.isHost ?? false;
}

export function getSocketIdForPlayer(roomId: string, playerId: string): string | undefined {
  for (const [socketId, mapping] of socketToRoom) {
    if (mapping.roomId === roomId && mapping.playerId === playerId) {
      return socketId;
    }
  }
  return undefined;
}

export function addBotToRoom(roomId: string): Player | null {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'lobby') return null;
  if (room.players.length >= MAX_PLAYERS_PER_ROOM) return null;

  const existingBots = room.players.filter((p) => p.isBot);
  const nameIndex = existingBots.length % BOT_NAMES.length;
  const avatarIndex = (existingBots.length + 3) % PREMADE_AVATARS.length; // offset so bots get different avatars

  const player: Player = {
    id: uuidv4(),
    nickname: BOT_NAMES[nameIndex],
    avatarUrl: PREMADE_AVATARS[avatarIndex],
    isHost: false,
    isBot: true,
    score: 0,
    connected: true,
  };

  room.players.push(player);
  return player;
}

export function removeBotFromRoom(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'lobby') return false;

  const idx = room.players.findIndex((p) => p.id === playerId && p.isBot);
  if (idx === -1) return false;

  room.players.splice(idx, 1);
  return true;
}

// Kick a player from the room (host action). Returns the kicked player's socket ID if they were connected.
export function kickPlayer(roomId: string, playerId: string): { socketId?: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return null;

  const player = room.players[idx];
  // Can't kick the host
  if (player.isHost) return null;

  // Find and remove socket mapping
  let socketId: string | undefined;
  for (const [sid, mapping] of socketToRoom) {
    if (mapping.roomId === roomId && mapping.playerId === playerId) {
      socketId = sid;
      socketToRoom.delete(sid);
      break;
    }
  }

  // Cancel any pending disconnect cleanup
  const timer = disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(playerId);
  }

  room.players.splice(idx, 1);

  return { socketId };
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  const MAX_RETRIES = 10;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[randomInt(chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  // Fallback: UUID-based code (should never happen in practice)
  return Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join('');
}
