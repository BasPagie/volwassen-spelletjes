import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  Player,
  GameRoom,
  GameSettings,
  RoundState,
  PlayerProgress,
  RoundResult,
  FinalResults,
  WhatAmIClientGameState,
  WhatAmISettings,
  SnelsteVingerClientState,
  SnelsteVingerSettings,
  DrawingClientState,
  DrawingSettings,
  RoundType,
  GameCategory,
} from "shared/types";

// ─── State ─────────────────────────────────────────────
export interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
}

export interface GameState {
  player: Player | null;
  room: GameRoom | null;
  roundState: RoundState | null;
  hintWords: string[];
  lastAnswerResult: { correct: boolean } | null;
  playerProgress: PlayerProgress[];
  roundResults: RoundResult[];
  currentRoundResult: RoundResult | null;
  finalResults: FinalResults | null;
  countdown: number | null;
  phase:
    | "idle"
    | "lobby"
    | "playing"
    | "countdown"
    | "briefing"
    | "round-end"
    | "finished";
  timeRemainingMs: number | null;
  errorMessage: string | null;
  devMode: boolean;
  toasts: Toast[];
  // Wie Ben Ik?
  whatAmIState: WhatAmIClientGameState | null;
  // Snelste Vinger
  snelsteVingerState: SnelsteVingerClientState | null;
  // Tekenwedstrijd
  drawingState: DrawingClientState | null;
  // Briefing
  briefing: {
    briefingKey: string;
    roundType?: RoundType;
    gameCategory: GameCategory;
    readyCount: number;
    totalCount: number;
  } | null;
}

const initialState: GameState = {
  player: null,
  room: null,
  roundState: null,
  hintWords: [],
  lastAnswerResult: null,
  playerProgress: [],
  roundResults: [],
  currentRoundResult: null,
  finalResults: null,
  countdown: null,
  phase: "idle",
  timeRemainingMs: null,
  errorMessage: null,
  devMode: false,
  toasts: [],
  whatAmIState: null,
  snelsteVingerState: null,
  drawingState: null,
  briefing: null,
};

// ─── Actions ───────────────────────────────────────────
export type GameAction =
  | { type: "SET_PLAYER"; player: Player }
  | { type: "SET_ROOM"; room: GameRoom }
  | { type: "PLAYER_JOINED"; player: Player }
  | {
      type: "PLAYER_LEFT";
      playerId: string;
      newHostId?: string;
      disconnected?: boolean;
    }
  | { type: "SETTINGS_UPDATED"; settings: GameSettings }
  | { type: "GAME_STARTED" }
  | { type: "COUNTDOWN"; count: number }
  | { type: "SCORE_UPDATED"; playerId: string; score: number }
  | { type: "ROUND_START"; roundState: RoundState; roundIndex?: number }
  | {
      type: "UPDATE_ROUND_STATE";
      roundState: RoundState;
      hintWords?: string[];
      answerResult?: { correct: boolean; correctAnswer?: string };
    }
  | { type: "PLAYER_PROGRESS"; progress: PlayerProgress[] }
  | { type: "ROUND_END"; result: RoundResult }
  | { type: "GAME_END"; results: FinalResults }
  | { type: "NEXT_ROUND" }
  | { type: "TIME_UPDATE"; timeRemainingMs: number }
  | { type: "SET_ERROR"; message: string }
  | { type: "CLEAR_ERROR" }
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string }
  | { type: "SET_DEV_MODE"; enabled: boolean }
  | {
      type: "RECONNECTED";
      room: GameRoom;
      player: Player;
      roundState: RoundState | null;
      phase: "lobby" | "playing" | "round-end" | "finished";
      roundResult: RoundResult | null;
      finalResults: FinalResults | null;
      playerProgress: PlayerProgress[];
    }
  | { type: "RESET" }
  // ─── Wie Ben Ik? ─────────────────────────────────────
  | { type: "SET_WHATAMI_STATE"; state: WhatAmIClientGameState }
  | {
      type: "WHATAMI_GUESS_RESULT";
      correct: boolean;
      cooldownUntil?: number;
      characterName?: string;
    }
  | {
      type: "WHATAMI_PLAYER_GUESSED";
      playerId: string;
      placement: number;
      score: number;
    }
  | { type: "WHATAMI_GAME_END"; state: WhatAmIClientGameState }
  | { type: "WHATAMI_GO_TO_RESULTS" }
  | { type: "WHATAMI_SETTINGS_UPDATED"; settings: WhatAmISettings }
  // ─── Snelste Vinger ───────────────────────────────
  | { type: "SET_SNELSTEVINGER_STATE"; state: SnelsteVingerClientState }
  | {
      type: "UPDATE_SNELSTEVINGER_STATE";
      patch: Partial<SnelsteVingerClientState>;
    }
  | { type: "SNELSTEVINGER_GAME_END"; state: SnelsteVingerClientState }
  | { type: "SNELSTEVINGER_SETTINGS_UPDATED"; settings: SnelsteVingerSettings }
  // ─── Tekenwedstrijd ─────────────────────────────────
  | { type: "DRAWING_SETTINGS_UPDATED"; settings: DrawingSettings }
  | { type: "SET_DRAWING_STATE"; state: DrawingClientState }
  | { type: "DRAWING_GAME_END"; scores: DrawingClientState["scores"] }
  // ─── Briefing ─────────────────────────────────────
  | {
      type: "SET_BRIEFING";
      briefingKey: string;
      roundType?: RoundType;
      gameCategory: GameCategory;
    }
  | { type: "BRIEFING_READY_COUNT"; ready: number; total: number }
  | { type: "CLEAR_BRIEFING" };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_PLAYER":
      return { ...state, player: action.player };

    case "SET_ROOM":
      return { ...state, room: action.room, phase: "lobby" };

    case "PLAYER_JOINED":
      if (!state.room) return state;
      // Deduplicate: if player already exists (reconnect), update instead of append
      if (state.room.players.some((p) => p.id === action.player.id)) {
        return {
          ...state,
          room: {
            ...state.room,
            players: state.room.players.map((p) =>
              p.id === action.player.id ? action.player : p,
            ),
          },
        };
      }
      return {
        ...state,
        room: {
          ...state.room,
          players: [...state.room.players, action.player],
        },
      };

    case "PLAYER_LEFT":
      if (!state.room) return state;
      // If disconnected (grace period), mark as offline and handle host transfer
      if (action.disconnected) {
        return {
          ...state,
          room: {
            ...state.room,
            players: state.room.players.map((p) => {
              if (p.id === action.playerId)
                return { ...p, connected: false, isHost: false };
              if (action.newHostId && p.id === action.newHostId)
                return { ...p, isHost: true };
              return p;
            }),
          },
          player:
            state.player && action.newHostId === state.player.id
              ? { ...state.player, isHost: true }
              : state.player,
        };
      }
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players
            .filter((p) => p.id !== action.playerId)
            .map((p) => ({
              ...p,
              isHost: action.newHostId ? p.id === action.newHostId : p.isHost,
            })),
        },
        player:
          state.player && action.newHostId === state.player.id
            ? { ...state.player, isHost: true }
            : state.player,
      };

    case "SETTINGS_UPDATED":
      if (!state.room) return state;
      return {
        ...state,
        room: { ...state.room, settings: action.settings },
      };

    case "GAME_STARTED":
      return {
        ...state,
        phase: "countdown",
        countdown: null,
        roundResults: [],
        finalResults: null,
      };

    case "COUNTDOWN":
      return {
        ...state,
        countdown: action.count,
        phase: "countdown",
        briefing: null,
      };

    case "SCORE_UPDATED":
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.map((p) =>
            p.id === action.playerId ? { ...p, score: action.score } : p,
          ),
        },
      };

    case "ROUND_START":
      return {
        ...state,
        roundState: action.roundState,
        timeRemainingMs: null,
        hintWords: [],
        lastAnswerResult: null,
        playerProgress: [],
        currentRoundResult: null,
        phase: "playing",
        room:
          state.room && action.roundIndex != null
            ? { ...state.room, currentRoundIndex: action.roundIndex }
            : state.room,
      };

    case "UPDATE_ROUND_STATE":
      return {
        ...state,
        roundState: action.roundState,
        hintWords: action.hintWords ?? [],
        lastAnswerResult: action.answerResult ?? state.lastAnswerResult,
      };

    case "PLAYER_PROGRESS":
      return { ...state, playerProgress: action.progress };

    case "ROUND_END":
      return {
        ...state,
        currentRoundResult: action.result,
        roundResults: [...state.roundResults, action.result],
        phase: "round-end",
      };

    case "GAME_END":
      return {
        ...state,
        finalResults: action.results,
        phase: "finished",
      };

    case "NEXT_ROUND":
      return {
        ...state,
        roundState: null,
        timeRemainingMs: null,
        currentRoundResult: null,
        phase: "playing",
      };

    case "TIME_UPDATE":
      return { ...state, timeRemainingMs: action.timeRemainingMs };

    case "SET_ERROR":
      return { ...state, errorMessage: action.message };

    case "CLEAR_ERROR":
      return { ...state, errorMessage: null };

    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };

    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };

    case "SET_DEV_MODE":
      return { ...state, devMode: action.enabled };

    case "RECONNECTED":
      return {
        ...state,
        player: action.player,
        room: action.room,
        roundState: action.roundState,
        timeRemainingMs: null,
        currentRoundResult: action.roundResult,
        finalResults: action.finalResults,
        playerProgress: action.playerProgress,
        phase: action.phase,
        countdown: null,
        hintWords: [],
        lastAnswerResult: null,
        errorMessage: null,
      };

    case "RESET":
      return initialState;

    case "SET_WHATAMI_STATE":
      return { ...state, whatAmIState: action.state, phase: "playing" };

    case "WHATAMI_GUESS_RESULT":
      if (!state.whatAmIState || !state.player) return state;
      return {
        ...state,
        whatAmIState: {
          ...state.whatAmIState,
          players: state.whatAmIState.players.map((p) =>
            p.playerId === state.player!.id
              ? { ...p, cooldownUntil: action.cooldownUntil ?? p.cooldownUntil }
              : p,
          ),
        },
      };

    case "WHATAMI_PLAYER_GUESSED":
      if (!state.whatAmIState) return state;
      return {
        ...state,
        whatAmIState: {
          ...state.whatAmIState,
          players: state.whatAmIState.players.map((p) =>
            p.playerId === action.playerId
              ? {
                  ...p,
                  guessedCorrectly: true,
                  placement: action.placement,
                  score: action.score,
                }
              : p,
          ),
        },
      };

    case "WHATAMI_GAME_END": {
      // Build finalResults from WhatAmI state so Results page works
      const sortedPlayers = [...action.state.players].sort(
        (a, b) =>
          b.score - a.score || (a.placement ?? 999) - (b.placement ?? 999),
      );
      const finalResults: FinalResults = {
        players: sortedPlayers.map((p, idx) => {
          const roomPlayer = state.room?.players.find(
            (rp) => rp.id === p.playerId,
          );
          return {
            playerId: p.playerId,
            nickname: roomPlayer?.nickname ?? "Speler",
            avatarUrl: roomPlayer?.avatarUrl ?? "",
            totalScore: p.score,
            roundScores: [p.score],
            rank: idx + 1,
            characterName: p.assignedCharacter?.name,
          };
        }),
        roundResults: [],
      };
      // Don't set phase:"finished" yet — let players see the reveal screen first
      return {
        ...state,
        whatAmIState: { ...action.state, status: "finished" },
        finalResults,
      };
    }

    case "WHATAMI_GO_TO_RESULTS":
      return { ...state, phase: "finished" };

    case "WHATAMI_SETTINGS_UPDATED":
      if (!state.room) return state;
      return {
        ...state,
        room: { ...state.room, whatAmISettings: action.settings },
      };

    case "SET_SNELSTEVINGER_STATE":
      return {
        ...state,
        snelsteVingerState: action.state,
        phase: "playing",
        countdown: null,
      };

    case "UPDATE_SNELSTEVINGER_STATE":
      if (!state.snelsteVingerState) return state;
      return {
        ...state,
        snelsteVingerState: { ...state.snelsteVingerState, ...action.patch },
      };

    case "SNELSTEVINGER_GAME_END": {
      const scores = action.state.scores;
      const finalResults: FinalResults = {
        players: scores.map((s, idx) => ({
          playerId: s.playerId,
          nickname: s.nickname,
          avatarUrl: s.avatarUrl,
          totalScore: s.score,
          roundScores: [s.score],
          rank: idx + 1,
        })),
        roundResults: [],
      };
      return {
        ...state,
        snelsteVingerState: { ...action.state, phase: "finished" },
        phase: "finished",
        finalResults,
      };
    }

    case "SNELSTEVINGER_SETTINGS_UPDATED":
      if (!state.room) return state;
      return {
        ...state,
        room: { ...state.room, snelsteVingerSettings: action.settings },
      };

    case "DRAWING_SETTINGS_UPDATED":
      if (!state.room) return state;
      return {
        ...state,
        room: { ...state.room, drawingSettings: action.settings },
      };

    case "SET_DRAWING_STATE":
      return {
        ...state,
        drawingState: action.state,
        phase: action.state.phase === "finished" ? "finished" : "playing",
        countdown: null,
      };

    case "DRAWING_GAME_END": {
      const finalResults: FinalResults = {
        players: action.scores.map((s, i) => ({
          playerId: s.playerId,
          nickname: s.nickname,
          avatarUrl: s.avatarUrl,
          totalScore: s.score,
          roundScores: [s.score],
          rank: i + 1,
        })),
        roundResults: [],
      };
      return {
        ...state,
        drawingState: null,
        phase: "finished",
        finalResults,
      };
    }

    case "SET_BRIEFING":
      return {
        ...state,
        briefing: {
          briefingKey: action.briefingKey,
          roundType: action.roundType,
          gameCategory: action.gameCategory,
          readyCount: 0,
          totalCount: 0,
        },
        phase: "briefing",
        countdown: null,
      };

    case "BRIEFING_READY_COUNT":
      if (!state.briefing) return state;
      return {
        ...state,
        briefing: {
          ...state.briefing,
          readyCount: action.ready,
          totalCount: action.total,
        },
      };

    case "CLEAR_BRIEFING":
      return { ...state, briefing: null };

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────
const GameContext = createContext<{
  state: GameState;
  dispatch: Dispatch<GameAction>;
}>({
  state: initialState,
  dispatch: () => {},
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  return useContext(GameContext);
}
