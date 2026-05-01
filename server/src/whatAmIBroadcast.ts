import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, WhatAmISettings } from '../../shared/types.js';
import { getRoom, getSocketIdForPlayer } from './rooms.js';
import {
  buildPlayerView,
  buildModeratorView,
  isAllGuessed,
  finishGame,
  cleanupWhatAmIGame,
  getWhatAmIInstance,
} from './whatAmIEngine.js';
import { DEFAULT_WHATAMI_SETTINGS } from '../../shared/types.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Broadcast personalized What Am I state to every player in a room.
 */
export function broadcastWhatAmIState(io: IOServer, roomId: string, settings?: WhatAmISettings): void {
  const inst = getWhatAmIInstance(roomId);
  if (!inst) return;
  const room = getRoom(roomId);
  if (!room) return;

  const s = settings ?? room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;

  for (const player of room.players) {
    const sid = getSocketIdForPlayer(roomId, player.id);
    if (!sid) continue;
    const isModeratorHost = player.isHost && !s.hostPlays;
    const state = isModeratorHost ? buildModeratorView(inst) : buildPlayerView(inst, player.id);
    io.to(sid).emit('whatami:state-update', state);
  }
}

/**
 * Broadcast game-end state to every player in a room.
 */
export function broadcastWhatAmIGameEnd(io: IOServer, roomId: string, inst: ReturnType<typeof getWhatAmIInstance>, settings?: WhatAmISettings): void {
  if (!inst) return;
  const room = getRoom(roomId);
  if (!room) return;

  const s = settings ?? room.whatAmISettings ?? DEFAULT_WHATAMI_SETTINGS;

  room.status = 'finished';
  for (const player of room.players) {
    const sid = getSocketIdForPlayer(roomId, player.id);
    if (!sid) continue;
    const isModeratorHost = player.isHost && !s.hostPlays;
    const state = isModeratorHost ? buildModeratorView(inst) : buildPlayerView(inst, player.id);
    io.to(sid).emit('whatami:game-end', state);
  }
  cleanupWhatAmIGame(roomId);
}

/**
 * Check if all players have guessed and, if so, finish the game and broadcast the end state.
 * Returns true if the game ended.
 */
export function checkAllGuessedAndFinish(io: IOServer, roomId: string, settings?: WhatAmISettings): boolean {
  const inst = getWhatAmIInstance(roomId);
  if (!inst || !isAllGuessed(inst)) return false;

  const finished = finishGame(roomId);
  if (!finished) return false;

  broadcastWhatAmIGameEnd(io, roomId, finished, settings);
  return true;
}

/**
 * Create the onTick callback for What Am I game.
 * Used for turn timer ticks — broadcasts state to all players.
 */
export function createOnTick(io: IOServer, settings?: WhatAmISettings): (roomId: string) => void {
  return (roomId: string) => broadcastWhatAmIState(io, roomId, settings);
}

/**
 * Create the onTurnAdvance callback for What Am I game.
 * Checks if all guessed (finishes if so), otherwise broadcasts state.
 */
export function createOnTurnAdvance(io: IOServer, settings?: WhatAmISettings): (roomId: string) => void {
  return (roomId: string) => {
    if (checkAllGuessedAndFinish(io, roomId, settings)) return;
    broadcastWhatAmIState(io, roomId, settings);
  };
}
