# Woord — Complete Codebase Architecture

> **Woord** is a real-time, multiplayer Dutch word puzzle game for browser-based quiz nights. It combines NYT Connections with rounds inspired by the Dutch TV show _De Slimste Mens_. Every player joins from their own device, the host configures and launches rounds, and everyone plays simultaneously.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Project Structure & Monorepo Layout](#2-project-structure--monorepo-layout)
3. [Shared Types (`shared/types.ts`)](#3-shared-types-sharedtypests)
   - 3.1 [Core Entities](#31-core-entities)
   - 3.2 [Game Settings & Round Config](#32-game-settings--round-config)
   - 3.3 [Puzzle Data Structures](#33-puzzle-data-structures)
   - 3.4 [Round State (Client View)](#34-round-state-client-view)
   - 3.5 [Results & Scoring Types](#35-results--scoring-types)
   - 3.6 [Socket Event Contracts](#36-socket-event-contracts)
4. [Server](#4-server)
   - 4.1 [Entry Point (`index.ts`)](#41-entry-point-indexts)
   - 4.2 [Room Management (`rooms.ts`)](#42-room-management-roomsts)
   - 4.3 [Game Engine (`gameEngine.ts`)](#43-game-engine-gameenginets)
   - 4.4 [Socket Handlers (`socketHandlers.ts`)](#44-socket-handlers-sockethandlersts)
   - 4.5 [Puzzle Store (`puzzleStore.ts`)](#45-puzzle-store-puzzlestorests)
5. [Client](#5-client)
   - 5.1 [Build & Configuration](#51-build--configuration)
   - 5.2 [App Entry & Routing](#52-app-entry--routing)
   - 5.3 [State Management (`GameContext`)](#53-state-management-gamecontext)
   - 5.4 [Socket Connection (`SocketContext`)](#54-socket-connection-socketcontext)
   - 5.5 [Socket Event Hook (`useSocketEvents`)](#55-socket-event-hook-usesocketevents)
   - 5.6 [Pages](#56-pages)
   - 5.7 [Game Components](#57-game-components)
   - 5.8 [Supporting UI Components](#58-supporting-ui-components)
6. [Game Modes — Rules & Scoring](#6-game-modes--rules--scoring)
7. [Complete Data Flow: A Round from Start to Finish](#7-complete-data-flow-a-round-from-start-to-finish)
8. [Networking, Resilience & Security](#8-networking-resilience--security)
9. [Deployment](#9-deployment)
10. [Development Setup](#10-development-setup)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────┐     WebSocket (Socket.IO)     ┌──────────────────────────────────┐
│           CLIENT                │ ◄──────────────────────────► │            SERVER                │
│                                 │                               │                                  │
│  React 18 + Vite                │                               │  Node.js + Express               │
│  Tailwind CSS + Framer Motion   │      HTTP (static assets,     │  Socket.IO                       │
│  Socket.IO Client               │ ◄───── SPA fallback) ──────► │                                  │
│                                 │                               │  In-memory state (Maps)          │
│  State: useReducer (GameContext)│                               │  No database                     │
│  Transport: SocketContext       │                               │                                  │
└─────────────────────────────────┘                               └──────────────────────────────────┘
         │                                                                     │
         └──────────── Both import from ──────────────┐                        │
                                                      ▼                        │
                                               shared/types.ts ◄──────────────┘
                                          (TypeScript interfaces,
                                           socket event contracts,
                                           premade avatar list)
```

**Key architectural decisions:**

- **No database.** All game state lives in server-side `Map` objects. This is fine because rooms are ephemeral — they exist only for the duration of a game session. If the server restarts, all rooms are lost.
- **Personalized round state.** The server builds a unique `RoundState` per player on every submission. Each player sees their own shuffled words, solved groups, found answers, and remaining attempts. Players never share a mutable view.
- **Server-authoritative.** All game logic (validation, scoring, fuzzy matching, timer) runs server-side. The client is a dumb renderer that sends user actions and displays the resulting state.
- **Socket.IO rooms.** Each game room maps to a Socket.IO room, allowing efficient `io.to(roomId).emit(...)` broadcasts.

---

## 2. Project Structure & Monorepo Layout

```
woord-game/
├── package.json              ← Root orchestrator (scripts: dev, build, start)
├── railway.json              ← Railway deployment config
├── README.md                 ← User-facing readme
├── TESTPLAN.md               ← Manual test plan (P0/P1/P2 priorities)
│
├── shared/                   ← Shared TypeScript types (imported by both client & server)
│   ├── package.json
│   └── types.ts              ← ALL interfaces, type unions, socket event contracts, avatars
│
├── server/                   ← Express + Socket.IO backend
│   ├── package.json          ← deps: express, socket.io, uuid | devDeps: tsx, typescript
│   ├── tsconfig.json         ← Compiles to ES2020/NodeNext, outputs to dist/
│   └── src/
│       ├── index.ts          ← HTTP server, Socket.IO setup, static file serving
│       ├── rooms.ts          ← Room CRUD, player join/leave/kick/reconnect, bot management
│       ├── gameEngine.ts     ← Core game logic, scoring, puzzle selection, fuzzy matching
│       ├── socketHandlers.ts ← All socket event handlers, rate limiting, validation
│       └── puzzleStore.ts    ← 120+ hardcoded Dutch puzzles across 4 game modes
│
└── client/                   ← React SPA
    ├── package.json          ← deps: react, react-router-dom, socket.io-client, framer-motion
    ├── vite.config.ts        ← Dev proxy to server, shared/ alias
    ├── tailwind.config.js    ← Brand colors, game colors, custom animations
    ├── postcss.config.js     ← Tailwind + Autoprefixer
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx          ← ReactDOM.createRoot, provider hierarchy
        ├── App.tsx           ← Routes + global error toast
        ├── index.css         ← Tailwind directives + custom component classes
        ├── context/
        │   ├── GameContext.tsx   ← useReducer store (30+ actions)
        │   └── SocketContext.tsx ← Socket.IO client, session persistence
        ├── hooks/
        │   └── useSocketEvents.ts ← Maps 22+ socket events → dispatch actions + navigation
        ├── pages/
        │   ├── Landing.tsx   ← Create game (nickname + avatar)
        │   ├── Join.tsx      ← Join via invite link
        │   ├── Lobby.tsx     ← Settings, player list, start game
        │   ├── Game.tsx      ← Active gameplay (countdown → intro → game → overlays)
        │   └── Results.tsx   ← Final leaderboard with podium reveal
        └── components/
            ├── ConnectionsGame.tsx   ← 4×4 word tile grid
            ├── PuzzelrondeGame.tsx   ← Word grid + answer input
            ├── OpenDeurGame.tsx      ← Trivia Q&A with answer slots
            ├── LingoGame.tsx         ← Wordle-style letter grid + keyboard
            ├── AvatarPicker.tsx      ← Emoji grid + custom image upload
            ├── GameSettingsPanel.tsx  ← Rounds, difficulty, timer, lives config
            ├── PlayerList.tsx        ← Player cards (scores, kick, connection status)
            ├── ProgressSidebar.tsx   ← Real-time player progress during gameplay
            ├── TimerBar.tsx          ← Animated countdown bar (green→orange→red)
            ├── RoundEndOverlay.tsx   ← Round scores + rankings modal
            └── WaitingOverlay.tsx    ← "Waiting for others" modal
```

### Root `package.json` Scripts

| Script                | What it does                                          |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Runs server (tsx watch) + client (vite) concurrently  |
| `npm run dev:server`  | `cd server && npm run dev` (tsx watch, hot reload)    |
| `npm run dev:client`  | `cd client && npm run dev` (vite dev server on :5173) |
| `npm run install:all` | Installs deps in root, shared, server, and client     |
| `npm run build`       | Builds client (vite build) then server (tsc)          |
| `npm start`           | `cd server && npm start` (runs compiled server)       |

---

## 3. Shared Types (`shared/types.ts`)

This single file is the **contract** between client and server. Both import from it. Every data structure that crosses the socket boundary is defined here.

### 3.1 Core Entities

#### `Player`

```typescript
interface Player {
  id: string; // UUID, generated server-side
  nickname: string; // Max 20 chars, HTML-entity-sanitized
  avatarUrl: string; // Emoji char (e.g. '🦊') or base64 data:image/ URL
  isHost: boolean; // Exactly one player per room is host
  isBot?: boolean; // Dev mode only — bots don't have real sockets
  score: number; // Cumulative across all rounds
  connected: boolean; // false during disconnect grace period
}
```

#### `GameRoom`

```typescript
interface GameRoom {
  roomId: string; // 6-char code (e.g. 'A3KF7B')
  players: Player[]; // All players including disconnected + bots
  settings: GameSettings; // Configurable by host in lobby
  status: RoomStatus; // 'lobby' | 'playing' | 'finished'
  currentRoundIndex: number; // 0-based index into settings.rounds[]
}
```

### 3.2 Game Settings & Round Config

#### `GameSettings`

```typescript
interface GameSettings {
  rounds: RoundConfig[]; // 1-5 rounds, each with type + difficulty
  attemptsMode: "limited" | "unlimited";
  maxAttempts: number; // 1-10, only used when attemptsMode = 'limited'
  timeLimitSeconds: number | null; // null = no timer, otherwise 60-300
  hostControl: boolean; // true = only host can start/advance
  hostPlays: boolean; // false = host spectates instead of playing
}
```

#### `RoundConfig`

```typescript
interface RoundConfig {
  type: RoundType; // 'connections' | 'puzzelronde' | 'opendeur' | 'lingo'
  difficulty: PuzzleDifficulty; // 'easy' | 'medium' | 'hard'
  puzzleId?: string; // Pick a specific puzzle (optional)
  customPuzzle?: Puzzle; // Bring your own puzzle (optional)
}
```

**Defaults** (set when creating a room):

- 3 rounds: Connections (medium), Puzzelronde (medium), Open Deur (medium)
- 6 lives (limited mode)
- 120 second timer
- Host control on, host plays

### 3.3 Puzzle Data Structures

Each game mode has its own puzzle shape. They're all tagged by a `type` discriminant.

#### Connections

```typescript
interface ConnectionsPuzzle {
  id: string;
  type: "connections";
  difficulty: PuzzleDifficulty;
  groups: [
    ConnectionsGroup,
    ConnectionsGroup,
    ConnectionsGroup,
    ConnectionsGroup,
  ];
  // Exactly 4 groups
}

interface ConnectionsGroup {
  label: string; // Category name (e.g. "Soorten fruit")
  words: string[]; // Exactly 4 words
  difficulty: 1 | 2 | 3 | 4; // 1=easiest(yellow), 2(green), 3(blue), 4=hardest(purple)
}
```

A puzzle has 16 total words (4 groups × 4 words). The client shuffles and displays them in a 4×4 grid.

#### Puzzelronde

```typescript
interface PuzzelrondePuzzle {
  id: string;
  type: "puzzelronde";
  difficulty: PuzzleDifficulty;
  groups: [
    PuzzelrondeGroup,
    PuzzelrondeGroup,
    PuzzelrondeGroup,
    PuzzelrondeGroup,
  ];
}

interface PuzzelrondeGroup {
  words: string[]; // A group of related words
  answer: string; // The connecting word players must guess
}
```

Unlike Connections, players don't select words — they see all 16 words and must type the connecting word. When they guess correctly, the corresponding group highlights.

#### Open Deur

```typescript
interface OpenDeurPuzzle {
  id: string;
  type: "opendeur";
  difficulty: PuzzleDifficulty;
  questions: [OpenDeurQuestion, OpenDeurQuestion, OpenDeurQuestion]; // Always 3
}

interface OpenDeurQuestion {
  question: string; // E.g. "Wat weet je van de Olympische Spelen?"
  answers: string[]; // Exactly 4 correct answers
}
```

Players see one question at a time, with 4 answer slots showing first-letter hints.

#### Lingo

```typescript
interface LingoPuzzle {
  id: string;
  type: "lingo";
  difficulty: PuzzleDifficulty;
  words: string[]; // Typically 3 five-letter Dutch words
}
```

Wordle-style: players guess 5-letter words with green/yellow/gray letter feedback.

### 3.4 Round State (Client View)

Each game mode produces a **personalized state object** that the server sends to each individual player. These are the shapes the client renders.

#### `ConnectionsRoundState`

```typescript
{
  type: 'connections';
  words: string[];                // Remaining unsolved words (shuffled per-player)
  solvedGroups: ConnectionsGroup[];// Groups this player has solved
  attemptsLeft: number | null;    // null = unlimited
  timeRemainingMs: number | null;
}
```

#### `PuzzelrondeRoundState`

```typescript
{
  type: 'puzzelronde';
  words: string[];                                // All 16 words (always visible, stable shuffle)
  solvedGroups: { words: string[]; answer: string }[];  // Groups solved so far
  totalGroups: number;                            // Always 4
  timeRemainingMs: number | null;
}
```

#### `OpenDeurRoundState`

```typescript
{
  type: 'opendeur';
  currentQuestionIndex: number;          // 0, 1, or 2
  question: string;                      // The current question text
  foundAnswers: string[];                // Answers found so far for this question
  answerHints: (string | null)[];        // Per-slot: first letter if unfound, null if found
  foundAnswerSlots: (string | null)[];   // Per-slot: answer text if found, null if unfound
  totalAnswers: number;                  // Always 4
  totalQuestions: number;                // Always 3
  timeRemainingMs: number | null;
}
```

The `answerHints` and `foundAnswerSlots` arrays are indexed by the **original answer order** in the puzzle. This means the UI can show hints in stable positions — when a player finds an answer, it fills into the correct slot without moving other hints around.

#### `LingoRoundState`

```typescript
{
  type: 'lingo';
  wordLength: number;                    // Always 5
  currentWordIndex: number;              // Which word (0, 1, 2...)
  totalWords: number;                    // Typically 3
  firstLetter: string;                   // Uppercase first letter hint
  guesses: LingoGuess[];                 // Guesses for current word
  maxGuessesPerWord: number;             // Always 5
  completedWords: LingoWordResult[];     // Results for previous words
  attemptsLeft: number | null;           // Lives remaining (failed words cost lives)
  timeRemainingMs: number | null;
}
```

### 3.5 Results & Scoring Types

#### `PlayerRoundResult`

```typescript
{
  playerId: string;
  nickname: string;
  avatarUrl: string;
  groupsFound: number; // Connections: groups, Puzzelronde: groups, Lingo: words, Open Deur: complete questions
  correctAnswers: number; // Puzzelronde: correct connecting words, Lingo: correct words, Open Deur: individual answers
  wrongGuesses: number;
  timeUsedMs: number;
  roundScore: number; // Points earned this round
}
```

#### `RoundResult`

```typescript
{
  roundIndex: number;
  roundType: RoundType;
  results: PlayerRoundResult[];      // Sorted by roundScore descending
  correctGroups: ConnectionsGroup[]  // The puzzle's correct answers (for review)
    | PuzzelrondeGroup[]
    | OpenDeurQuestion[]
    | string[];                      // Lingo: the target words
}
```

#### `FinalResults`

```typescript
{
  players: {
    playerId: string;
    nickname: string;
    avatarUrl: string;
    totalScore: number;
    roundScores: number[];  // Score per round
    rank: number;           // 1-based
  }[];                      // Sorted by totalScore descending
  roundResults: RoundResult[];
}
```

### 3.6 Socket Event Contracts

All 17 client→server events and 22+ server→client events are typed in two interfaces. This provides **compile-time safety** — if the server adds a new parameter, the client gets a type error until updated.

#### Client → Server (17 events)

| Event                    | Payload                           | Purpose                              |
| ------------------------ | --------------------------------- | ------------------------------------ |
| `create-room`            | `{ nickname, avatarUrl }`         | Create a new room, become host       |
| `join-room`              | `{ roomId, nickname, avatarUrl }` | Join existing room                   |
| `leave-room`             | _(none)_                          | Leave room cleanly                   |
| `update-settings`        | `GameSettings`                    | Host changes game config             |
| `start-game`             | _(none)_                          | Host starts the game                 |
| `submit-group`           | `{ words: string[] }`             | Connections: submit 4 selected words |
| `submit-answer`          | `{ answer: string }`              | Puzzelronde: submit connecting word  |
| `submit-opendeur-answer` | `{ answer: string }`              | Open Deur: submit answer             |
| `submit-lingo-guess`     | `{ guess: string }`               | Lingo: submit 5-letter word          |
| `skip-question`          | _(none)_                          | Open Deur: skip to next question     |
| `next-round`             | _(none)_                          | Host advances to next round          |
| `play-again`             | _(none)_                          | Host resets room back to lobby       |
| `update-score`           | `{ playerId, score }`             | Host edits a player's score in lobby |
| `kick-player`            | `{ playerId }`                    | Host kicks a player                  |
| `dev-add-bot`            | _(none)_                          | Dev: add a bot player                |
| `dev-remove-bot`         | `{ playerId }`                    | Dev: remove a bot                    |
| `reconnect-attempt`      | `{ roomId, playerId }`            | Attempt session reconnection         |
| `check-room`             | `{ roomId }`                      | Check if a room exists/is joinable   |

#### Server → Client (22+ events)

| Event                    | Payload                                                                          | When                                       |
| ------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------ |
| `room-created`           | `{ room, player }`                                                               | After `create-room`                        |
| `room-joined`            | `{ room, player }`                                                               | After `join-room` or `play-again`          |
| `player-joined`          | `{ player }`                                                                     | Broadcast: new player entered              |
| `player-left`            | `{ playerId, newHostId?, disconnected? }`                                        | Broadcast: player left/disconnected        |
| `settings-updated`       | `GameSettings`                                                                   | Broadcast: host changed settings           |
| `game-started`           | _(none)_                                                                         | Broadcast: game is beginning               |
| `countdown`              | `{ count }`                                                                      | 3, 2, 1, 0 (GO) — one per second           |
| `round-start`            | `{ roundIndex, roundState, roundType }`                                          | **Per-player**: personalized initial state |
| `group-result`           | `{ correct, group?, roundState, hintWords? }`                                    | Response to `submit-group`                 |
| `answer-result`          | `{ correct, groupWords?, roundState }`                                           | Response to `submit-answer`                |
| `opendeur-result`        | `{ correct, matchedAnswer?, roundState, questionComplete? }`                     | Response to `submit-opendeur-answer`       |
| `opendeur-next-question` | `{ roundState, previousAnswers }`                                                | Auto-sent after completing a question      |
| `lingo-result`           | `{ correct, feedback?, roundState }`                                             | Response to `submit-lingo-guess`           |
| `lingo-next-word`        | `{ roundState, previousWord }`                                                   | Auto-sent when moving to next word         |
| `player-progress`        | `PlayerProgress[]`                                                               | Broadcast after every submission           |
| `time-update`            | `{ timeRemainingMs }`                                                            | Broadcast every ~1 second                  |
| `round-end`              | `RoundResult`                                                                    | Broadcast: round is over                   |
| `game-end`               | `FinalResults`                                                                   | Broadcast: all rounds done                 |
| `score-updated`          | `{ playerId, score }`                                                            | Broadcast: host edited a score             |
| `error`                  | `{ message }`                                                                    | Sent to the triggering client only         |
| `kicked`                 | _(none)_                                                                         | Sent to kicked player                      |
| `room-closed`            | _(none)_                                                                         | Broadcast: room was deleted                |
| `dev-mode-status`        | `{ enabled }`                                                                    | Sent on join if DEV_MODE=true              |
| `reconnected`            | `{ room, player, roundState, phase, roundResult, finalResults, playerProgress }` | Full state snapshot on reconnect           |
| `reconnect-failed`       | _(none)_                                                                         | Session invalid, client should reset       |
| `room-check`             | `{ exists, joinable }`                                                           | Response to `check-room`                   |

#### Premade Avatars

20 emoji characters available for avatar selection:

```
🦊 🐻 🐼 🐨 🦁 🐯 🐸 🐵 🦄 🐙 🦋 🐢 🦜 🐳 🦩 🐘 🎃 🤖 👽 🎭
```

---

## 4. Server

### 4.1 Entry Point (`index.ts`)

Sets up a standard Express + Socket.IO server:

1. **Express app** — Serves the Vite-built client as static files from `client/dist/`. Has one API endpoint (`/api/health` → `{ status: 'ok' }`). All other routes fall through to `index.html` (SPA fallback for React Router).

2. **Socket.IO server** — Created with typed generics `Server<ClientToServerEvents, ServerToClientEvents>`. CORS configured via `CORS_ORIGIN` env var (comma-separated origins) or defaults to localhost:5173/5174.

3. **Connection handler** — On each new socket connection, logs the socket ID and calls `registerSocketHandlers(io, socket)` to wire up all event listeners.

4. **Port** — Reads from `PORT` env var (defaults to 3001). Binds to `0.0.0.0` for Railway compatibility.

### 4.2 Room Management (`rooms.ts`)

This file manages three core in-memory data structures:

```
rooms:             Map<roomId, GameRoom>                   — All active rooms
socketToRoom:      Map<socketId, { roomId, playerId }>     — Which socket → which player in which room
disconnectTimers:  Map<playerId, setTimeout handle>        — Grace period timers for disconnected players
```

#### Room Creation — `createRoom(socketId, nickname, avatarUrl)`

1. Generates a **6-character room code** using `generateRoomId()`:
   - Character set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no I, O, 0, 1 to avoid visual ambiguity)
   - Uses `crypto.randomInt()` for each character (cryptographically random)
   - Retries up to 10 times if code collides with existing room
2. Creates a `Player` (UUID via `uuid.v4()`, isHost: true)
3. Creates a `GameRoom` with default settings (3 rounds, 120s timer, 6 lives)
4. Stores in `rooms` and `socketToRoom` maps
5. Returns `{ room, player }`

#### Joining — `joinRoom(socketId, roomId, nickname, avatarUrl)`

1. Validates room exists and is in `'lobby'` status
2. **Reconnection check**: If a disconnected (non-bot) player with the same nickname exists, reclaims their slot. Cancels disconnect timer, marks as connected, updates avatar.
3. Checks player cap (max 20)
4. Creates new `Player` (isHost: false), adds to room
5. Returns `{ room, player }` or `null` on failure

#### Leaving — `leaveRoom(socketId)`

1. Removes player from room's `players[]`
2. Cleans up `socketToRoom` mapping
3. If room is now empty → deletes room entirely
4. If leaving player was host → transfers host to first remaining player
5. Returns `{ roomId, playerId, newHostId?, roomDeleted }`

#### Disconnect Grace Period

This is a three-stage process that allows players to rejoin after an accidental disconnect (e.g. page refresh, network hiccup):

**Stage 1: `disconnectPlayer(socketId)`**

- Marks player as `connected: false` (player stays in room)
- Removes socket mapping
- If player was host → immediately transfers host to next connected non-bot player

**Stage 2: `scheduleDisconnectCleanup(playerId, 30000, onExpire)`**

- Sets a 30-second `setTimeout`
- Stored in `disconnectTimers` map (so it can be cancelled)
- If timer fires, calls `onExpire` callback (which removes the player permanently)

**Stage 3a: `reconnectPlayer(socketId, roomId, playerId)` — Player comes back**

- Finds player in room, marks `connected: true`
- Cancels disconnect timer
- Updates `socketToRoom` with new socket ID
- Returns full `{ room, player }` state

**Stage 3b: `removeDisconnectedPlayer(roomId, playerId)` — Grace period expires**

- Fully removes player from room
- Handles host transfer if needed
- Deletes room if now empty

#### Bots — `addBotToRoom()` / `removeBotFromRoom()`

Dev-mode feature. Bots have names from a pool (`Bot Anna`, `Bot Bram`, `Bot Cees`, etc.) and premade emoji avatars (offset from player avatars). They're flagged with `isBot: true` and `connected: true`. During gameplay, the engine auto-completes their rounds with random scores.

#### Other Functions

| Function                                 | Purpose                                        |
| ---------------------------------------- | ---------------------------------------------- |
| `getRoom(roomId)`                        | Look up room from map                          |
| `getSocketMapping(socketId)`             | Look up `{ roomId, playerId }` from socket     |
| `updateSettings(roomId, settings)`       | Replace room settings (only in lobby)          |
| `getPlayerInRoom(roomId, playerId)`      | Find a specific player                         |
| `isHost(roomId, playerId)`               | Check if player is host                        |
| `getSocketIdForPlayer(roomId, playerId)` | Reverse lookup: player → socket (iterates map) |
| `kickPlayer(roomId, playerId)`           | Remove player, cancel timers, return socket ID |

### 4.3 Game Engine (`gameEngine.ts`)

The core game logic. Every action that affects game state goes through this file. The client never modifies game state directly — it sends events, the server validates and mutates here, then sends the new state back.

#### Internal Data Structures

```typescript
// One per active room (exists only while a round is in progress)
interface GameInstance {
  roomId: string;
  puzzle: Puzzle;                               // The current puzzle
  playerTrackers: Map<string, PlayerRoundTracker>; // Per-player state
  timer: setInterval handle | null;             // Server-side countdown
  roundStartTime: number;                       // Date.now() when round started
  timeRemainingMs: number | null;               // Countdown value
  roundEnding: boolean;                         // Guard against double-ending
}

// Tracks each player's progress within a single round
interface PlayerRoundTracker {
  playerId: string;
  solvedGroups: number[];               // Indices into puzzle.groups[]
  wrongGuesses: number;
  correctAnswers: number;               // Puzzelronde connecting words, Lingo words, Open Deur answers
  finished: boolean;
  startTime: number;                    // Date.now() at round start
  endTime: number | null;               // Date.now() when finished
  score: number;                        // Points earned this round
  pendingGroupIndex: number | null;     // Puzzelronde: just solved group, waiting for answer
  answerResults: Map<number, boolean>;  // Puzzelronde: group index → answer correctness
  shuffledWords?: string[];             // Puzzelronde: stable per-player word order

  // Open Deur
  currentQuestionIndex: number;
  foundAnswersPerQuestion: Map<number, string[]>;

  // Lingo
  lingoCurrentWordIndex: number;
  lingoGuessesPerWord: Map<number, LingoGuess[]>;
  lingoCompletedWords: LingoWordResult[];
}
```

Global state:

```typescript
const activeGames = new Map<string, GameInstance>();
const usedPuzzles = new Map<string, Set<string>>(); // roomId → Set of used puzzle IDs
```

#### `startRound(room)` — Initialize a Round

1. **Puzzle selection** (in priority order):
   - `roundConfig.customPuzzle` → use it directly
   - `roundConfig.puzzleId` → look up from puzzle store
   - Otherwise → **random selection**:
     - Get all puzzles of the correct type
     - Filter by configured difficulty (fall back to all if no matches)
     - Exclude previously used puzzles for this room (from `usedPuzzles` map)
     - Pick randomly from remaining pool
2. Mark puzzle as used for this room
3. Clean up any leftover `GameInstance` from a previous round (stops old timer)
4. **Create PlayerRoundTrackers** for each participating player (skip host if spectating)
5. Create `GameInstance` with initial `timeRemainingMs`
6. Build and return initial `RoundState` (generic, not player-specific)

#### `getPlayerRoundState(roomId, playerId, room)` — Build Personalized View

This is called every time a player needs to see the board after a submission. Each game mode builds its view differently:

**Connections:**

- Get solved group indices → map to actual `ConnectionsGroup` objects
- Collect all solved words into a Set
- Filter remaining words = all words minus solved words
- **Shuffle** remaining words (new shuffle each time — the unsolved tile order changes after every guess)
- Calculate `attemptsLeft = maxAttempts - wrongGuesses`

**Puzzelronde:**

- Map solved group indices to `{ words, answer }` objects
- Use **stable shuffle** stored in `tracker.shuffledWords` (set once on first call, never reshuffled — words stay in place)
- Show all 16 words always

**Lingo:**

- Get current word index from tracker
- Get guesses for current word
- Look up current target word for first-letter hint
- Include `completedWords` (previous word results)

**Open Deur:**

- Get current question from puzzle
- Get found answers for this question from tracker
- Build `answerHints`: for each answer slot, show first letter if unfound, `null` if found
- Build `foundAnswerSlots`: for each answer slot, show answer text if found, `null` if unfound
- This **preserves original slot order** so hints don't jump around

#### Submission Handlers

##### `submitGroupGuess()` — Connections

1. Normalize the 4 guessed words (trim + lowercase)
2. Iterate through all unsolved groups
3. Compare word sets: if exact match → **correct**
   - Push group index to `solvedGroups`, add 100 points
   - If all 4 groups solved → mark finished, calculate speed bonus
4. If no match → **wrong guess**
   - **Partial match hint**: iterate through unsolved groups, find the one with the most overlap (≥2 matching words, <4). Return those words as `hintWords` for the UI to highlight.
   - Increment `wrongGuesses`, subtract 25 points
   - If `wrongGuesses >= maxAttempts` → player eliminated (finished with penalty)

##### `submitAnswer()` — Puzzelronde

1. Iterate through all unsolved groups
2. Compare input against group's `answer` using `fuzzyMatch()` (see below)
3. If match → correct: +150 points, mark group solved
4. If all groups solved → finished + speed bonus
5. No penalty for wrong answers

##### `submitOpenDeurAnswer()` — Open Deur

1. Get current question (by `tracker.currentQuestionIndex`)
2. Iterate through question's 4 correct answers
3. Skip already-found answers
4. Compare input using `fuzzyMatch()`
5. If match → correct: +50 points, add to `foundAnswersPerQuestion`
6. If all 4 answers found (`questionComplete`):
   - If last question (index 2) → player finished + speed bonus
   - Otherwise → the socket handler will call `advanceOpenDeurQuestion()` after a short delay
7. No penalty for wrong answers

##### `skipOpenDeurQuestion()` — Open Deur Skip

1. If current question is the last → mark player finished
2. Otherwise → increment `currentQuestionIndex`
3. Returns the previous question's correct answers (shown to player as they skip)

##### `submitLingoGuess()` — Lingo

1. **Validate** guess is a real 5-letter Dutch word via `isValidLingoGuess()` (from puzzleStore)
2. **Compute feedback** using `computeLingoFeedback()`:
   - Two-pass algorithm:
     - **Pass 1**: Mark exact position matches as `'correct'` (green), flag those target letters as used
     - **Pass 2**: For non-correct letters, check if they exist elsewhere in the target (unused). If yes → `'present'` (yellow), flag as used. Otherwise → `'absent'` (gray)
3. Store guess in tracker
4. If correct:
   - **Scoring**: 100 base + 20 per unused guess (max 5 guesses, so bonus ranges 0–80)
   - Push `{ guessed: true, guessCount }` to `completedWords`
5. If wrong and used all 5 guesses:
   - Push `{ guessed: false, guessCount: 5 }` to `completedWords`
   - In limited mode: failed word costs a life (`wrongGuesses++`)
6. If word complete (correct or exhausted guesses):
   - Check elimination (lives exhausted)
   - Check if all words attempted → finished + speed bonus
   - Otherwise → advance `lingoCurrentWordIndex`

#### Fuzzy Matching (Dutch)

The `fuzzyMatch(input, target)` function handles approximate string matching for Dutch words. This is crucial because players might type slightly different forms of the correct answer.

**Algorithm:**

```
1. Exact match (case-insensitive, trimmed) → ✅
2. Levenshtein distance check:
   - Words ≥ 6 chars: allow distance ≤ 2
   - Shorter words: allow distance ≤ 1
   - Early exit if length difference > maxDist
3. Dutch stem comparison:
   - Strip common suffixes: -tjes, -jes, -eren, -ren, -enden, -anden, -en, -es, -s, -e
   - Compare stems with Levenshtein (same thresholds)
```

**Levenshtein implementation:** Standard dynamic programming with two rows (space-optimized). Computes edit distance (insertions, deletions, substitutions).

**`dutchStem(word)`** — Simple rule-based Dutch stemmer that strips inflectional suffixes:
| Suffix | Example | Stem |
|--------|---------|------|
| `-tjes` | "katjes" → "ka" | Diminutive plural |
| `-jes` | "boekjes" → "boek" | Diminutive |
| `-eren` | "kinderen" → "kind" | Irregular plural |
| `-ren` | "eieren" → "ei" | Irregular plural |
| `-en` | "schepen" → "schep" | Regular plural |
| `-es` | "vosses" → "voss" | Genitive/plural |
| `-s` | "boeken" → "boeke" | Plural |
| `-e` | "grote" → "groot" → "grot" | Adjective form |

All suffixes have minimum word length guards to avoid stripping too aggressively.

#### Timer Management

##### `startTimer(roomId, onTick, onExpire)`

- Creates a `setInterval` running every 1000ms
- Each tick decrements `instance.timeRemainingMs` by 1000
- Calls `onTick(timeRemainingMs)` — the socket handler uses this to broadcast `time-update`
- When time reaches 0 or below → clears interval, calls `onExpire()` — the socket handler uses this to `forceEndRound()` + `endCurrentRound()`

##### `forceEndRound(roomId)`

- Iterates all player trackers
- Any unfinished player gets `finished = true`, `endTime = Date.now()`
- Does not award any bonus points to unfinished players

#### Results Calculation

##### `getRoundResult(roomId, room)`

1. Sets `roundEnding = true` (prevents double-ending via race conditions)
2. For each player with a tracker:
   - Calculates `groupsFound`:
     - Connections/Puzzelronde: `solvedGroups.length`
     - Open Deur: number of questions where **all 4 answers** found
     - Lingo: number of correctly guessed words
   - Builds `PlayerRoundResult` with all stats
   - **Adds round score to player's cumulative score** on the `Player` object
3. Sorts results by `roundScore` descending
4. Cleans up: stops timer, deletes `GameInstance` from `activeGames`

##### `getFinalResults(room, allRoundResults)`

1. Filters to active players (excludes spectating host)
2. For each player: collects total score, per-round scores (with fallback to 0 if not present)
3. Sorts by `totalScore` descending
4. Assigns `rank` (1-based)

#### Other Functions

| Function                   | Purpose                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `getSpectatorRoundState()` | Build generic (non-personalized) view for spectating host                                        |
| `getPlayerProgress()`      | Returns `PlayerProgress[]` — solvedCount, finished, score per player                             |
| `isRoundComplete()`        | Returns true if ALL player trackers have `finished = true`                                       |
| `finishBotPlayers()`       | Auto-completes bots with random progress (connections: random groups, lingo: random words, etc.) |
| `cleanupGame()`            | Stops timer, deletes game instance and used puzzle tracking                                      |

### 4.4 Socket Handlers (`socketHandlers.ts`)

This file registers every Socket.IO event listener for a connected socket. It's the glue between the client, the room manager, and the game engine.

#### Module-Level State

```typescript
const roomRoundResults = new Map<string, RoundResult[]>(); // Accumulated round results per room
const roomCountdowns = new Map<string, setInterval>(); // Active countdown intervals
const roomAdvancing = new Set<string>(); // Guard against double next-round clicks
const socketEventTimestamps = new Map<string, number[]>(); // Rate limiting timestamps
```

#### Rate Limiting

```typescript
function isRateLimited(socketId: string): boolean;
```

- Maintains a sliding window of timestamps per socket
- Window: 1000ms, max events: 10
- Filters to only recent timestamps, pushes new one
- Returns `true` if count exceeds 10 → submission silently dropped
- Applied to all game submission events (submit-group, submit-answer, submit-opendeur-answer, skip-question, submit-lingo-guess)

#### Input Validation

**Nicknames:**

```typescript
function sanitizeNickname(raw: string): string;
```

- Trims whitespace
- Caps at 20 characters
- Strips HTML entities: `<`, `>`, `&`, `"`, `'` (XSS prevention)

**Avatars:**

```typescript
function isValidAvatar(raw: string): boolean;
```

- Must be a string
- Either a premade emoji (exact match from `PREMADE_AVATARS`)
- Or a `data:image/...` base64 URL under 100KB

**Settings:** Validated in the `update-settings` handler:

- `rounds`: must be array of 1-5 items
- Each round: `type` must be in `['connections','puzzelronde','opendeur','lingo']`, `difficulty` in `['easy','medium','hard']`
- `attemptsMode`: must be `'limited'` or `'unlimited'`
- `maxAttempts`: number, 1-10
- `timeLimitSeconds`: null or number 0-600
- `hostControl`, `hostPlays`: must be booleans

#### Event Handler Details

##### Room Creation & Joining

**`create-room`**: Sanitize nickname, validate avatar → `createRoom()` → join Socket.IO room → emit `room-created` → optionally emit `dev-mode-status`

**`join-room`**: Same validation → `joinRoom()` → join Socket.IO room → emit `room-joined` to joiner → emit `player-joined` to all others

**`leave-room`**: Calls `handleLeave()` helper → `leaveRoom()` → leave Socket.IO room → if room deleted: cleanup game + results + countdown. Otherwise: broadcast `player-left`

##### Game Flow

**`start-game`**:

1. Validate: must be host (if `hostControl`), room must have ≥1 active player
2. Set room status to `'playing'`, reset `currentRoundIndex` to 0
3. Initialize `roomRoundResults` for this room
4. Emit `game-started` broadcast
5. Start **countdown**: emit `{ count: 3 }` immediately, then `setInterval` every 1000ms: 2 → 1 → 0 (GO) → call `startNewRound()`

**`startNewRound(io, roomId)`** (helper):

1. Call `startRound(room)` from game engine
2. Send **personalized** `round-start` to each player:
   - For each player: call `getPlayerRoundState()` → find their socket ID → `io.to(sid).emit('round-start', ...)`
   - For spectating host: call `getSpectatorRoundState()` → send generic view
3. Start timer if configured: `startTimer(roomId, onTick, onExpire)`
   - `onTick`: broadcasts `time-update` to room
   - `onExpire`: calls `forceEndRound()` then `endCurrentRound()`
4. Dev mode: if bots present, `setTimeout(2-5s)` → `finishBotPlayers()` → broadcast progress → check if round complete

##### Submission Handlers (Connections example, others follow same pattern)

**`submit-group`**:

1. Rate limit check
2. Input validation: must be array of exactly 4 strings
3. Get socket mapping → room → validate room is `'playing'`
4. Call `submitGroupGuess()` on game engine
5. Call `getPlayerRoundState()` to build updated view
6. Emit `group-result` to submitting player: `{ correct, group?, roundState, hintWords? }`
7. Broadcast `player-progress` to entire room
8. Check `isRoundComplete()` → if yes, call `endCurrentRound()`

**Open Deur special behavior:**

- When `questionComplete` and not finished → emit `opendeur-result` with completed state first, then `advanceOpenDeurQuestion()`, then emit `opendeur-next-question` after 800ms delay (so the client can show the flash animation for the last answer before transitioning)

**Lingo special behavior:**

- When `wordComplete` with a `previousWord` and not finished → emit `lingo-next-word` instead of `lingo-result` (different UI treatment for word transitions)

##### Round & Game End

**`endCurrentRound(io, roomId)`** (helper):

1. Call `getRoundResult()` — marks round as ending, calculates scores, cleans up game instance
2. Store result in `roomRoundResults`
3. Broadcast `round-end` with `RoundResult`

**`next-round`**:

1. Guards: must be host, round result must exist (round actually ended), not already advancing (double-click prevention via `roomAdvancing` Set)
2. Increment `currentRoundIndex`
3. If more rounds → `startNewRound()`
4. If no more rounds → `endGame()`

**`endGame(io, roomId)`** (helper):

1. Set room status to `'finished'`
2. Call `getFinalResults(room, allRoundResults)`
3. Broadcast `game-end` with `FinalResults`
4. Call `cleanupGame()`

**`play-again`**:

1. Reset room to `'lobby'`, reset `currentRoundIndex` to 0
2. Reset all player scores to 0
3. Clear `roomRoundResults`
4. Send `room-joined` individually to each player (with their own player object)

##### Disconnect & Reconnect

**`disconnect`** event:

1. Clean up rate limit timestamps
2. Call `disconnectPlayer()` — marks player offline, transfers host if needed
3. Broadcast `player-left` with `disconnected: true` and optional `newHostId`
4. Schedule 30-second cleanup: on expiry, permanently remove player, broadcast, and check if round should end

**`reconnect-attempt`** event:

1. Validate input (string types, length limits)
2. Call `reconnectPlayer()` — restores session
3. Join Socket.IO room
4. **Determine phase**:
   - If room is `'playing'`: check if stored round results cover current index → `'round-end'`, else `'playing'`
   - If room is `'finished'`: compute final results
   - Otherwise: `'lobby'`
5. Emit `reconnected` with full state snapshot: room, player, roundState (personalized), phase, roundResult, finalResults, playerProgress
6. Broadcast `player-joined` to others (shows them as back online)

**`check-room`** event:

- Returns `{ exists, joinable }` where `joinable = exists && status === 'lobby'`

### 4.5 Puzzle Store (`puzzleStore.ts`)

Contains **120+ hardcoded Dutch-language puzzles** organized by game type and difficulty level.

| Type        | Count | Difficulties     | Notes                                            |
| ----------- | ----- | ---------------- | ------------------------------------------------ |
| Connections | 30+   | easy/medium/hard | 4 groups × 4 words, group labels, difficulty 1-4 |
| Puzzelronde | 30+   | easy/medium/hard | 4 groups × 4 words + connecting word answer      |
| Open Deur   | 30+   | easy/medium/hard | 3 questions × 4 answers each                     |
| Lingo       | 10+   | easy/medium/hard | 3 five-letter Dutch words each                   |

**Exports:**

- `getConnectionsPuzzles()` → `ConnectionsPuzzle[]`
- `getPuzzelrondePuzzles()` → `PuzzelrondePuzzle[]`
- `getOpenDeurPuzzles()` → `OpenDeurPuzzle[]`
- `getLingoPuzzles()` → `LingoPuzzle[]`
- `isValidLingoGuess(word)` → `boolean` — validates against a list of accepted 5-letter Dutch words

---

## 5. Client

### 5.1 Build & Configuration

#### Vite Configuration (`vite.config.ts`)

```typescript
{
  plugins: [react()],
  resolve: {
    alias: { shared: path.resolve(__dirname, '../shared') }  // Import shared types
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',           // API proxy
      '/socket.io': { target: 'http://localhost:3001', ws: true }  // WebSocket proxy
    }
  }
}
```

The proxy means the client can use relative URLs in development — same as production where the server serves the client build.

#### Tailwind Configuration (`tailwind.config.js`)

Custom design tokens:

| Token                     | Colors                              | Usage                          |
| ------------------------- | ----------------------------------- | ------------------------------ |
| `brand-50` to `brand-900` | Orange gradient (#fef3e2 → #7a4a0f) | Buttons, accents, primary UI   |
| `game-yellow`             | #f9df6d                             | Connections group difficulty 1 |
| `game-green`              | #a0c35a                             | Connections group difficulty 2 |
| `game-blue`               | #b0c4ef                             | Connections group difficulty 3 |
| `game-purple`             | #ba81c5                             | Connections group difficulty 4 |

Custom fonts: **Nunito** (display/headings) and **Inter** (body text).

Custom animations: `shake` (wrong guess), `pop` (correct answer), `slide-up` (overlays), `confetti` (celebration).

#### Custom CSS Classes (`index.css`)

| Class                 | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `.btn-primary`        | Orange filled button with hover scale, shadow, rounded-2xl          |
| `.btn-secondary`      | White outlined button with brand border                             |
| `.card`               | Semi-transparent white card with backdrop blur and rounded-3xl      |
| `.word-tile`          | Base tile style: centered text, cursor pointer, transitions, shadow |
| `.word-tile-default`  | White tile with gray border, hover brand highlight                  |
| `.word-tile-selected` | Brand-500 (orange) tile, white text, scaled up                      |
| `.word-tile-hinted`   | Amber-tinted tile with ring highlight (partial match hint)          |

### 5.2 App Entry & Routing

#### Provider Hierarchy (`main.tsx`)

```
<React.StrictMode>
  <BrowserRouter>
    <SocketProvider>       ← Creates Socket.IO connection, handles auto-reconnect
      <GameProvider>       ← Creates useReducer store for all game state
        <App />            ← Routes + error toast
      </GameProvider>
    </SocketProvider>
  </BrowserRouter>
</React.StrictMode>
```

#### Routes (`App.tsx`)

| Path               | Component | Purpose                                          |
| ------------------ | --------- | ------------------------------------------------ |
| `/`                | `Landing` | Home page — create new game                      |
| `/join/:roomId`    | `Join`    | Join page — enter nickname to join existing room |
| `/lobby/:roomId`   | `Lobby`   | Room setup — player list, settings, start button |
| `/game/:roomId`    | `Game`    | Active gameplay                                  |
| `/results/:roomId` | `Results` | Final leaderboard                                |

**Error Toast:** A fixed-position red bar at the top center. Appears when `state.errorMessage` is set, auto-clears after 5 seconds. Clickable to dismiss early. Uses Framer Motion for slide-in/out animation.

### 5.3 State Management (`GameContext`)

Centralized via `useReducer`. All socket events dispatch actions here. Components read state via `useGame()` hook.

#### State Shape

```typescript
interface GameState {
  player: Player | null; // Current user
  room: GameRoom | null; // Current room (with all players, settings)
  roundState: RoundState | null; // Active round data (personalized)
  hintWords: string[]; // Connections: words that belong to same group
  lastAnswerResult: { correct: boolean } | null; // Flash feedback for last submission
  playerProgress: PlayerProgress[]; // All players' progress (for sidebar)
  roundResults: RoundResult[]; // Accumulated round results
  currentRoundResult: RoundResult | null; // Latest round result (for overlay)
  finalResults: FinalResults | null; // End-of-game data
  countdown: number | null; // 3, 2, 1, 0
  phase: "idle" | "lobby" | "playing" | "countdown" | "round-end" | "finished";
  timeRemainingMs: number | null; // Server-synced timer
  errorMessage: string | null; // Global error toast
  devMode: boolean; // Dev features enabled
}
```

#### Key Actions & Their Effects

| Action               | Triggered By                                                     | State Changes                                                                                         |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SET_PLAYER`         | room-created, room-joined                                        | Sets `player`                                                                                         |
| `SET_ROOM`           | room-created, room-joined                                        | Sets `room`, phase → `'lobby'`                                                                        |
| `PLAYER_JOINED`      | player-joined broadcast                                          | Appends to `room.players`                                                                             |
| `PLAYER_LEFT`        | player-left broadcast                                            | If `disconnected`: marks player offline + transfers host. Otherwise: removes player + transfers host. |
| `SETTINGS_UPDATED`   | settings-updated                                                 | Updates `room.settings`                                                                               |
| `GAME_STARTED`       | game-started                                                     | Phase → `'countdown'`, resets results                                                                 |
| `COUNTDOWN`          | countdown                                                        | Sets `countdown` value                                                                                |
| `ROUND_START`        | round-start                                                      | Sets `roundState`, clears hints/answers/progress, phase → `'playing'`                                 |
| `UPDATE_ROUND_STATE` | group-result, answer-result, opendeur-result, lingo-result, etc. | Updates `roundState`, `hintWords`, `lastAnswerResult`                                                 |
| `PLAYER_PROGRESS`    | player-progress                                                  | Updates `playerProgress` array                                                                        |
| `ROUND_END`          | round-end                                                        | Sets `currentRoundResult`, appends to `roundResults`, phase → `'round-end'`                           |
| `GAME_END`           | game-end                                                         | Sets `finalResults`, phase → `'finished'`                                                             |
| `TIME_UPDATE`        | time-update                                                      | Updates `timeRemainingMs`                                                                             |
| `SET_ERROR`          | error                                                            | Sets `errorMessage`                                                                                   |
| `CLEAR_ERROR`        | timeout or click                                                 | Clears `errorMessage`                                                                                 |
| `RECONNECTED`        | reconnected                                                      | Restores full state: player, room, roundState, phase, results, progress                               |
| `RESET`              | kicked, room-closed, reconnect-failed                            | Returns to `initialState`                                                                             |

### 5.4 Socket Connection (`SocketContext`)

#### Connection Setup

Creates a Socket.IO client on mount:

- **Development** (`localhost`): connects to `http://localhost:3001`
- **Production**: connects to `window.location.origin` (same server)
- Transports: `['websocket', 'polling']` (prefers WebSocket, falls back to polling)

#### Session Persistence

Three functions manage session state in `sessionStorage` (survives page refresh but not new tab):

| Function                        | Key            | Purpose                                               |
| ------------------------------- | -------------- | ----------------------------------------------------- |
| `saveSession(roomId, playerId)` | `game-session` | Stored after room-created or room-joined              |
| `getSession()`                  | `game-session` | Read on connect for auto-reconnect                    |
| `clearSession()`                | `game-session` | Cleared on leave, kick, room-closed, reconnect-failed |

#### Auto-Reconnect

On every socket `connect` event:

1. Check `getSession()` for saved `{ roomId, playerId }`
2. If found → emit `reconnect-attempt` immediately
3. Server responds with `reconnected` (full state) or `reconnect-failed`

This handles: page refreshes, network reconnects, tab sleep/wake.

### 5.5 Socket Event Hook (`useSocketEvents`)

A single `useEffect` in a custom hook that:

1. Registers listeners for all 22+ server events
2. Each listener dispatches the appropriate `GameAction`
3. Some listeners also trigger navigation:
   - `room-created` / `room-joined` → `/lobby/:roomId`
   - `game-started` → uses countdown/round-start flow (Game page already mounted)
   - `game-end` → handled by Game page's `useEffect`
   - `reconnected` → navigates to appropriate page based on `phase`
   - `kicked` / `room-closed` / `reconnect-failed` → `/` (clear session first)
4. Error events: dispatch `SET_ERROR`, then `setTimeout(5000)` → dispatch `CLEAR_ERROR`
5. Cleanup function removes all listeners on unmount

### 5.6 Pages

#### Landing Page (`Landing.tsx`)

The home page. Contains:

- **Hero section**: Game title, subtitle
- **Create form**: Nickname input, `AvatarPicker` component, "Maak Spel" (Create Game) button
- On submit: emits `create-room` with `{ nickname, avatarUrl }`
- Navigation to lobby happens via the `room-created` socket event listener

#### Join Page (`Join.tsx`)

Accessed via invite link (`/join/ABC123`). Flow:

1. On mount: emits `check-room` with the `roomId` from URL params
2. Listens for `room-check` response:
   - `exists: false` → show "Kamer niet gevonden" error
   - `joinable: false` → show "Spel is al begonnen" error
   - Both true → show join form (nickname + avatar picker)
3. On submit: emits `join-room` with `{ roomId, nickname, avatarUrl }`
4. Navigation to lobby happens via the `room-joined` socket event listener

#### Lobby Page (`Lobby.tsx`)

Two-panel layout with:

**Left panel:**

- **PlayerList** component — shows all players with avatars, badges, scores, connection status
- Room code display (large, copy-able)
- "Kopieer Link" (Copy Link) button — copies `${origin}/join/${roomId}` to clipboard
- "Start Spel" button (host only, requires ≥1 active player)

**Right panel:**

- **GameSettingsPanel** component — rounds, difficulty, timer, lives (host editable, read-only for others)

**Special features:**

- First-time rules popup: dismissable modal explaining all 4 game modes
- Dev mode (if enabled): "Bot toevoegen" / "Bot verwijderen" buttons
- Host can click on player scores to edit them (inline number input)
- Host can kick non-host players

#### Game Page (`Game.tsx`)

The most complex page. Renders different content based on `state.phase` and other flags:

**Render priority (top to bottom, first match wins):**

1. **Countdown phase** (`state.phase === 'countdown'`):
   - Full-screen dark background
   - Large animated numbers: 3 → 2 → 1 → "GO!" with spring animations
   - Each number uses a Framer Motion `key` for enter/exit transitions

2. **Round intro splash** (`showRoundIntro` local state):
   - Full-screen gradient background (color depends on game type: blue/purple/amber/green)
   - Large emoji icon + game mode name + "Ronde X van Y"
   - Shows for 2500ms, controlled by local `useEffect` + `setTimeout`
   - Triggered when `state.room.currentRoundIndex` changes

3. **Round-end overlay** (`state.phase === 'round-end'`):
   - Can appear even without `roundState` (e.g., after reconnecting mid-round-end)
   - Renders `RoundEndOverlay` component with scores

4. **No round state / invalid session**:
   - Checks `sessionStorage` for valid session matching current `roomId`
   - If invalid → redirect to `/`
   - If valid but loading → show "Ronde wordt geladen..." spinner

5. **Active gameplay** (main render):
   - **Header**: Game type badge (colored pill), round counter, spectator badge if applicable, "← Lobby" button (host only)
   - **Timer**: `TimerBar` component at top
   - **Game area** (center): Conditionally renders one of:
     - `ConnectionsGame` (type `'connections'`)
     - `PuzzelrondeGame` (type `'puzzelronde'`)
     - `LingoGame` (type `'lingo'`)
     - `OpenDeurGame` (type `'opendeur'`)
   - **Spectator view**: If host is spectating, shows "👀 Je kijkt toe als host" instead of game component
   - **WaitingOverlay**: `AnimatePresence`-wrapped modal shown when `myProgress.finished && phase === 'playing'`
   - **ProgressSidebar**: Desktop (right side, `md:block`) + Mobile (bottom bar, `md:hidden`)
   - **RoundEndOverlay**: Overlaid on top when `phase === 'round-end'`

**Event handlers defined here:**

- `handleSubmitGroup(words)` → `socket.emit('submit-group', { words })`
- `handleSubmitAnswer(answer)` → `socket.emit('submit-answer', { answer })`
- `handleSubmitOpenDeurAnswer(answer)` → `socket.emit('submit-opendeur-answer', { answer })`
- `handleSkipQuestion()` → `socket.emit('skip-question')`
- `handleSubmitLingoGuess(guess)` → `socket.emit('submit-lingo-guess', { guess })`
- `handleNextRound()` → `socket.emit('next-round')`
- `handleBackToLobby()` → `socket.emit('play-again')`

#### Results Page (`Results.tsx`)

Dramatic podium reveal with phased animations:

| Phase            | Timing | What's shown                                 |
| ---------------- | ------ | -------------------------------------------- |
| Drumroll         | 0-1s   | Loading animation                            |
| 3rd place        | 1-2.5s | Bronze medal reveal                          |
| 2nd place        | 2.5-4s | Silver medal reveal                          |
| 1st place        | 4-5.5s | Gold medal reveal                            |
| Full leaderboard | 5.5s+  | All players ranked, round-by-round breakdown |

- Medals: 🥇 🥈 🥉
- Each podium entry: avatar, nickname, total score, animated entrance
- Score breakdown: per-round scores in a table
- "Opnieuw Spelen" (Play Again) button → emits `play-again`

### 5.7 Game Components

#### ConnectionsGame

**Props:** `roundState: ConnectionsRoundState`, `onSubmitGroup: (words) => void`, `maxAttempts: number`, `hintWords: string[]`

**Layout:**

```
┌────────────────────────────────────────────┐
│  [Solved Group 1 - colored banner]         │
│  [Solved Group 2 - colored banner]         │
│                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ word │ │ word │ │WORD  │ │ word │      │  ← 4×4 grid of remaining words
│  └──────┘ └──────┘ └──────┘ └──────┘     │    (selected tiles highlighted)
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ word │ │ word │ │ word │ │ word │      │
│  └──────┘ └──────┘ └──────┘ └──────┘     │
│  ...                                       │
│                                            │
│  "2 van deze woorden horen bij             │
│   dezelfde groep!"  (hint message)         │
│                                            │
│  [Wissen]  [Controleer (2/4)]  ❤️❤️❤️❤️❤️❤️│
│   (clear)   (submit)           (lives)     │
└────────────────────────────────────────────┘
```

**Interaction flow:**

1. Player taps tiles to select (max 4). Selected tiles get `.word-tile-selected` style.
2. Tiles mentioned in `hintWords` get `.word-tile-hinted` style (amber glow).
3. "Controleer" button enabled only when exactly 4 tiles selected. Shows count `(X/4)`.
4. "Wissen" button clears selection.
5. On correct group: tiles animate out, colored group banner appears at top.
6. On wrong guess: shake animation, lives decrease.
7. Group banner colors map to difficulty: 1=yellow, 2=green, 3=blue, 4=purple.

#### PuzzelrondeGame

**Props:** `roundState: PuzzelrondeRoundState`, `onSubmitAnswer: (answer) => void`, `lastAnswerResult: { correct } | null`

**Layout:**

```
┌────────────────────────────────────────────┐
│  [Solved Group - purple] woord: ANTWOORD   │
│  [Solved Group - blue]   woord: ANTWOORD   │
│                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ word │ │ word │ │ word │ │ word │      │  ← 4×4 grid (always all visible)
│  └──────┘ └──────┘ └──────┘ └──────┘     │    (solved words dimmed/grouped)
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ word │ │ word │ │ word │ │ word │      │
│  └──────┘ └──────┘ └──────┘ └──────┘     │
│  ...                                       │
│                                            │
│  [_________________] [Verstuur]            │
│   (type answer)      (submit)              │
│                                            │
│  2/4 groepen gevonden                      │
└────────────────────────────────────────────┘
```

**Key behavior:**

- All 16 words always visible (words don't disappear when groups are found)
- Solved groups display above with colored badges + the connecting word
- Text input with submit button. Input clears after submission.
- Flash feedback: green border on correct, red shake on incorrect.
- Word grid uses stable shuffle (words don't move between submissions).
- Color scheme: purple → blue → amber → green for groups 1-4.

#### OpenDeurGame

**Props:** `roundState: OpenDeurRoundState`, `onSubmitAnswer: (answer) => void`, `onSkipQuestion: () => void`

**Layout:**

```
┌────────────────────────────────────────────┐
│            Vraag 1 van 3                   │
│                                            │
│  "Wat weet je van de Olympische Spelen?"   │
│                                            │
│  ┌──────────────┐  ┌──────────────┐       │
│  │ A___         │  │ ✅ Amsterdam │       │  ← 2×2 answer grid
│  └──────────────┘  └──────────────┘       │    (hints or found answers)
│  ┌──────────────┐  ┌──────────────┐       │
│  │ M___         │  │ R___         │       │
│  └──────────────┘  └──────────────┘       │
│                                            │
│  [_________________] [Verstuur]            │
│                                            │
│  [Sla over →]                              │
│                                            │
│  ● ○ ○  (question progress dots)           │
└────────────────────────────────────────────┘
```

**Key behavior:**

- Question text displayed prominently at top
- 2×2 grid of answer slots in **fixed positions** (matching puzzle's answer order)
- Unfound slots: show first-letter hint (e.g., "A\_\_\_")
- Found slots: show full answer with green styling
- Text input + submit. Input clears after each attempt.
- "Sla over" (Skip) button → advances to next question, reveals all answers briefly
- Progress dots at bottom: filled = current/completed, empty = upcoming
- After completing all 4 answers or skipping: auto-advances after 800ms delay

#### LingoGame

**Props:** `roundState: LingoRoundState`, `onSubmitGuess: (guess) => void`

**Layout:**

```
┌────────────────────────────────────────────┐
│  Woord 1 van 3    ● ○ ○  (word progress)  │
│                                            │
│  ┌───┐┌───┐┌───┐┌───┐┌───┐               │
│  │ S ││   ││   ││   ││   │  ← Row 1 (first letter given, green)
│  └───┘└───┘└───┘└───┘└───┘               │
│  ┌───┐┌───┐┌───┐┌───┐┌───┐               │
│  │ S ││ T ││ O ││ E ││ L │  ← Row 2 (previous guess with feedback)
│  │grn││ylw││gry││grn││gry│               │
│  └───┘└───┘└───┘└───┘└───┘               │
│  ┌───┐┌───┐┌───┐┌───┐┌───┐               │
│  │ _ ││ _ ││ _ ││ _ ││ _ │  ← Row 3 (current input)
│  └───┘└───┘└───┘└───┘└───┘               │
│  (empty rows for remaining guesses)        │
│                                            │
│  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐    │
│  │ Q ││ W ││ E ││ R ││ T ││ Y ││...│    │  ← On-screen keyboard
│  └───┘└───┘└───┘└───┘└───┘└───┘└───┘    │    (keys colored by feedback)
│  ...                                       │
│  ┌────────┐  ┌────────────────────┐       │
│  │ ⌫ DEL  │  │     ENTER ✓       │       │
│  └────────┘  └────────────────────┘       │
└────────────────────────────────────────────┘
```

**Key behavior:**

- 5×5 letter grid. First letter of each word given as green hint.
- Physical keyboard input supported (captures keydown events)
- On-screen keyboard with QWERTY layout for mobile
- Each guess triggers a flip animation per letter (reveals feedback sequentially)
- Letter feedback colors: 🟩 green (correct), 🟨 yellow (present), ⬜ gray (absent)
- Keyboard keys update colors based on best known feedback for each letter
- Word progress dots: green = correctly guessed, red = failed (5 guesses used), gray = not yet attempted
- Max 5 guesses per word, then auto-advances to next word (with `lingo-next-word` event)

### 5.8 Supporting UI Components

#### TimerBar

**Props:** `totalSeconds`, `timeRemainingMs`

A horizontal bar at the top of the game area that shrinks from right to left.

**Implementation:**

- Receives `timeRemainingMs` from server (via `state.timeRemainingMs`)
- Uses CSS `transition` for smooth animation between server ticks (~1s intervals)
- Width calculated as `(timeRemaining / totalTime) * 100%`
- Color transitions based on time remaining:
  - `> 10s` → green (`bg-green-500`)
  - `5-10s` → orange (`bg-orange-500`)
  - `< 5s` → red (`bg-red-500`) with pulse animation
- Hidden when `timeRemainingMs` is `null` (no timer configured)

#### ProgressSidebar

**Props:** `progress: PlayerProgress[]`, `players: Player[]`, `currentPlayerId`, `totalGroups`

Shows real-time progress for all players during a round.

Each player row:

- Avatar + nickname
- Score (updated live)
- Progress bar: `solvedCount / totalGroups` filled
- Green checkmark (✅) when `finished === true`
- Highlighted differently for current player ("Jij")

Desktop: vertical sidebar on the right. Mobile: compact horizontal bar at the bottom.

#### WaitingOverlay

**Props:** `myScore`, `progress`, `players`, `currentPlayerId`

Shown when the current player finishes before others. A modal overlay:

- Celebration emoji (🎉)
- "Je bent klaar!" heading
- Player's current round score
- List of players still working (with "bezig..." label)
- Animated waiting spinner

#### RoundEndOverlay

**Props:** `result: RoundResult`, `currentPlayerId`, `isHost`, `isLastRound`, `isSpectating`, `onNextRound`

Full-screen modal shown after a round ends. Contents:

- Round type badge + "Ronde X resultaten"
- Ranked player list with:
  - Position number
  - Avatar + nickname
  - Round score
  - Stats: groups found, wrong guesses, time used
- Current player highlighted
- Button: "Volgende ronde" (Next round) for host, or "Bekijk resultaten" (View results) if last round
- If spectating: shows different text

#### PlayerList

**Props:** Used in Lobby, reads from `GameContext`

Per-player card:

- Avatar (emoji or image)
- Nickname
- Badges: "Host" (crown icon), "Toeschouwer" (spectating), "Jij" (you)
- Score (click to edit for host — inline number input with save/cancel)
- Connection indicator: green dot (connected) / red dot (disconnected) with animated pulse
- Kick button (❌) for host targeting non-host players
- Bot badge for bot players

#### AvatarPicker

**Props:** `selected`, `onSelect`

Two modes:

1. **Premade emojis**: 5×4 grid of the 20 premade avatars. Click to select. Selected has brand-colored ring.
2. **Custom upload**: File input accepting images. Processing pipeline:
   - Load image → create canvas (200×200)
   - Center-crop (take the smallest dimension, crop to square from center)
   - Draw on canvas at 200×200
   - Export as JPEG (quality 0.8) → base64 data URL
   - Validate under 100KB

#### GameSettingsPanel

**Props:** Reads from `GameContext`, emits `update-settings`

**Host view (editable):**

- **Round list**: Draggable/reorderable cards. Each card:
  - Type selector (dropdown: Connections/Puzzelronde/Open Deur/Lingo)
  - Difficulty selector (Easy/Medium/Hard pills)
  - Remove button (❌)
- "Ronde toevoegen" (Add round) button (max 5)
- **Time limit**: Button group (1 min, 1.5 min, 2 min, 3 min, 5 min, Geen)
- **Lives**: Stepper (1-10) or "Onbeperkt" toggle
- **Host speelt mee**: Toggle (yes/no) — if no, host spectates

**Non-host view (read-only):** Same layout but all controls disabled/grayed out.

---

## 6. Game Modes — Rules & Scoring

### Connections 🔗

| Aspect        | Detail                                                                         |
| ------------- | ------------------------------------------------------------------------------ |
| Objective     | Group 16 words into 4 categories of 4                                          |
| Interaction   | Select 4 tiles → submit                                                        |
| Correct group | +100 points                                                                    |
| Wrong guess   | −25 points (limited mode)                                                      |
| Lives         | Configurable 1-10 or unlimited                                                 |
| Elimination   | All lives used → finished (can't guess more)                                   |
| Speed bonus   | +2 pts per remaining second (only if all 4 found)                              |
| Hints         | If 2-3 guessed words share a group, those words are highlighted on next render |

### Puzzelronde 🧩

| Aspect         | Detail                                                     |
| -------------- | ---------------------------------------------------------- |
| Objective      | Type the connecting word for groups of related words       |
| Interaction    | Type answer → submit                                       |
| Correct answer | +150 points, group highlights with connecting word         |
| Wrong answer   | No penalty                                                 |
| Matching       | Fuzzy match: Levenshtein ≤2 for long words, Dutch stemming |
| Speed bonus    | +2 pts per remaining second (only if all 4 found)          |
| Word display   | All 16 words always visible, stable positions              |

### Open Deur 🚪

| Aspect         | Detail                                                     |
| -------------- | ---------------------------------------------------------- |
| Objective      | Answer 3 trivia questions (4 answers each)                 |
| Interaction    | Type answer → submit, or skip                              |
| Correct answer | +50 points                                                 |
| Wrong answer   | No penalty                                                 |
| Hints          | First letter of each unfound answer shown in its slot      |
| Matching       | Fuzzy match (same as Puzzelronde)                          |
| Auto-advance   | After all 4 answers found (800ms delay)                    |
| Skip           | Reveals all answers, advances to next question             |
| Speed bonus    | +2 pts per remaining second (only if all 12 answers found) |

### Lingo 🟩

| Aspect           | Detail                                                             |
| ---------------- | ------------------------------------------------------------------ |
| Objective        | Guess 5-letter Dutch words                                         |
| Words per puzzle | Typically 3                                                        |
| Guesses per word | Max 5                                                              |
| Correct word     | +100 base + 20 per unused guess (max bonus: +80 for first-try)     |
| Failed word      | 0 points, costs 1 life in limited mode                             |
| Hints            | First letter given (green). Green/yellow/gray feedback per letter. |
| Validation       | Must be a valid 5-letter Dutch word (server-side check)            |
| Keyboard         | Physical + on-screen. Keys colored by cumulative feedback.         |
| Speed bonus      | +2 pts per remaining second (only if all words attempted)          |

### Speed Bonus Formula (all modes)

```
bonus = max(0, floor((timeLimitMs - timeTakenMs) / 1000) * 2)
```

- Only applies when a time limit is set AND the player finishes all items
- If player runs out of time or doesn't finish: no bonus
- Example: 120s limit, finished in 90s → 30 remaining seconds → +60 bonus points

---

## 7. Complete Data Flow: A Round from Start to Finish

Here's exactly what happens, message by message, for a Connections round with 2 players:

```
Host clicks "Start Spel"
  ├─ Client: socket.emit('start-game')
  ├─ Server: validates host, sets room.status='playing', room.currentRoundIndex=0
  ├─ Server: io.to(roomId).emit('game-started')
  │   └─ Both clients: dispatch GAME_STARTED → phase='countdown'
  │
  ├─ Server: io.to(roomId).emit('countdown', { count: 3 })
  │   └─ Both clients: show "3" animation
  ├─ (1 second)
  ├─ Server: io.to(roomId).emit('countdown', { count: 2 })
  ├─ (1 second)
  ├─ Server: io.to(roomId).emit('countdown', { count: 1 })
  ├─ (1 second)
  ├─ Server: io.to(roomId).emit('countdown', { count: 0 })
  │   └─ Both clients: show "GO!" animation
  ├─ (1 second)
  │
  ├─ Server: startNewRound() → gameEngine.startRound(room)
  │   ├─ Selects puzzle, creates PlayerRoundTrackers
  │   ├─ For Player A: getPlayerRoundState() → shuffled words (shuffle A)
  │   │   └─ io.to(socketA).emit('round-start', { roundState: {..., words: shuffleA} })
  │   └─ For Player B: getPlayerRoundState() → shuffled words (shuffle B)
  │       └─ io.to(socketB).emit('round-start', { roundState: {..., words: shuffleB} })
  │   Both clients: dispatch ROUND_START → phase='playing', show round intro splash (2.5s)
  │
  ├─ Server: startTimer() → setInterval every 1000ms
  │   └─ Every tick: io.to(roomId).emit('time-update', { timeRemainingMs })
  │       └─ Both clients: dispatch TIME_UPDATE → TimerBar updates
  │
  │ ─── Player A submits a guess ───
  ├─ Player A: socket.emit('submit-group', { words: ['X','Y','Z','W'] })
  ├─ Server: rate limit check ✓, validate 4 strings ✓
  ├─ Server: submitGroupGuess() → WRONG (hintWords: ['X','Y'])
  ├─ Server: getPlayerRoundState(A) → new shuffle, updated attemptsLeft
  ├─ Server: socket.emit('group-result', { correct: false, roundState: ..., hintWords: ['X','Y'] })
  │   └─ Player A client: dispatch UPDATE_ROUND_STATE → shake animation, hint highlight
  ├─ Server: getPlayerProgress() → io.to(roomId).emit('player-progress', [...])
  │   └─ Both clients: dispatch PLAYER_PROGRESS → sidebar updates
  │
  │ ─── Player A submits correct guess ───
  ├─ Player A: socket.emit('submit-group', { words: ['A','B','C','D'] })
  ├─ Server: submitGroupGuess() → CORRECT (group: { label: "Fruit", words: [...], difficulty: 1 })
  ├─ Server: tracker.score += 100, tracker.solvedGroups = [0]
  ├─ Server: getPlayerRoundState(A) → 12 remaining words, 1 solved group
  ├─ Server: socket.emit('group-result', { correct: true, group: {...}, roundState: ... })
  │   └─ Player A client: group banner animates in, tiles removed
  ├─ Server: broadcast player-progress
  │
  │ ─── Player B finishes all groups ───
  ├─ (Player B solves all 4 groups)
  ├─ Server: tracker B finished=true, calculates speed bonus
  ├─ Server: broadcast player-progress (B shows ✅)
  │   └─ Player B client: shows WaitingOverlay ("Je bent klaar!")
  ├─ Server: isRoundComplete() → false (Player A still playing)
  │
  │ ─── Timer expires ───
  ├─ Server: timer callback fires, timeRemainingMs ≤ 0
  ├─ Server: forceEndRound() → marks Player A as finished
  ├─ Server: endCurrentRound()
  │   ├─ getRoundResult() → calculates scores, adds to player totals
  │   └─ io.to(roomId).emit('round-end', roundResult)
  │       └─ Both clients: dispatch ROUND_END → phase='round-end', show RoundEndOverlay
  │
  │ ─── Host clicks "Volgende ronde" ───
  ├─ Host: socket.emit('next-round')
  ├─ Server: validates, increments currentRoundIndex
  ├─ Server: startNewRound() → (same flow as above with next puzzle)
  │
  │ ─── After last round ───
  ├─ Server: endGame() → room.status='finished'
  ├─ Server: getFinalResults() → ranked players with totals
  ├─ Server: io.to(roomId).emit('game-end', finalResults)
  │   └─ Both clients: dispatch GAME_END → phase='finished', navigate to /results
```

---

## 8. Networking, Resilience & Security

### Rate Limiting

- **Mechanism**: Per-socket sliding window (1000ms window, max 10 events)
- **Applied to**: All game submission events
- **Behavior**: Excess events silently dropped (no error emitted)
- **Cleanup**: Timestamps map cleared on disconnect

### Disconnect Resilience

- **Grace period**: 30 seconds
- **Session storage**: `sessionStorage` preserves `{ roomId, playerId }` across page refreshes
- **Auto-reconnect**: On socket connect, checks for saved session and emits `reconnect-attempt`
- **State recovery**: Server sends full state snapshot on `reconnected` (room, player, roundState, phase, results)
- **Host transfer**: Immediate on host disconnect (to next connected non-bot player)
- **Visual indicator**: Other players see disconnected player with red connection dot

### Input Validation & Sanitization

- **Nicknames**: Trimmed, max 20 chars, HTML entities stripped (`<>&"'`)
- **Avatars**: Must be premade emoji (exact match) or base64 data URL under 100KB
- **Settings**: Every field validated against allowed types, enums, and ranges
- **Game submissions**: Array length checks, string type checks, max length limits
- **Room IDs**: Max 10 chars validation on client input
- **Player IDs**: Max 50 chars validation

### Socket.IO Configuration

- **Transports**: WebSocket preferred, HTTP long-polling fallback
- **CORS**: Configurable via `CORS_ORIGIN` env var, defaults to localhost
- **Rooms**: Socket.IO rooms used for efficient broadcasting

---

## 9. Deployment

### Railway Configuration (`railway.json`)

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "NODE_ENV=development npm run install:all && npm run build"
  },
  "deploy": {
    "startCommand": "node server/dist/server/src/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Build step:**

1. `NODE_ENV=development` ensures devDependencies are installed (needed for TypeScript compilation)
2. `npm run install:all` installs dependencies in all 4 package.json files
3. `npm run build` builds client (Vite → `client/dist/`) then server (tsc → `server/dist/`)

**Runtime:**

- Server serves client build as static files
- SPA fallback ensures React Router works
- Restarts on crash (up to 10 retries)
- Port from `PORT` env var (Railway sets this automatically)

---

## 10. Development Setup

### Prerequisites

- Node.js (v18+)
- npm

### Quick Start

```bash
npm run install:all    # Install all dependencies
npm run dev            # Start dev server (client:5173 + server:3001)
```

### Environment Variables

| Variable      | Default               | Purpose                         |
| ------------- | --------------------- | ------------------------------- |
| `PORT`        | `3001`                | Server port                     |
| `CORS_ORIGIN` | `localhost:5173,5174` | Comma-separated allowed origins |
| `DEV_MODE`    | `false`               | Enable bot player features      |

### Dev Mode

Set `DEV_MODE=true` to enable:

- "Bot toevoegen" button in lobby (adds AI players)
- "Bot verwijderen" button (removes bots)
- Bots auto-complete rounds with random scores after 2-5 seconds
- Useful for testing multiplayer flows without multiple browsers

### How the Dev Proxy Works

In development, Vite runs on `:5173` and the server on `:3001`. The Vite config proxies:

- `/api/*` → `http://localhost:3001` (API calls)
- `/socket.io/*` → `http://localhost:3001` (WebSocket + polling)

This means client code uses relative URLs everywhere, same as production.

### TypeScript Configuration

- **Server**: Compiles `server/src/` + `shared/` → `server/dist/` (ES2020, NodeNext modules)
- **Client**: Vite handles TS compilation (uses `shared` path alias for imports)
- Both share types from `shared/types.ts` — changes here affect both sides immediately
