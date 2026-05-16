# Spelletjeskamer — Architecture

## Table of Contents

1. [The Three Packages](#the-three-packages)
2. [How Multiplayer Works](#how-multiplayer-works-socketio)
3. [Server-Side Architecture](#server-side-architecture)
4. [Client-Side Architecture](#client-side-architecture)
5. [The Shared Contract](#the-shared-contract-sharedtypests)
6. [Game Flow Lifecycle](#game-flow-lifecycle)
7. [Game Engines In Detail](#game-engines-in-detail)
8. [Client State Management](#client-state-management-gamecontexttsx)
9. [Socket Event Wiring](#socket-event-wiring-usesocketeventsts)
10. [Data Files](#data-serverdata)
11. [Key Patterns](#key-patterns)

---

## The Three Packages

This project is a **monorepo** with 3 packages that work together:

| Package   | Role                                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/` | TypeScript types and interfaces. Both client and server import from here. This is the "contract" — it defines what data shapes look like everywhere. |
| `server/` | Node.js + Express + Socket.IO backend. Holds ALL game logic, ALL state, and ALL data. Runs on port 3001.                                             |
| `client/` | React SPA (Vite). The UI players see in their browser. Connects to the server via WebSocket. Runs on port 5173 in dev.                               |

**Important principle**: The client is "dumb" — it only renders what the server tells it. All game logic (scoring, answer validation, timers, turn rotation) happens on the server. The client just sends user actions and renders the resulting state.

---

## How Multiplayer Works (Socket.IO)

### What is Socket.IO?

Socket.IO is a library that creates a persistent two-way connection between browser and server (WebSocket). Unlike normal HTTP requests (client asks → server responds), both sides can send messages at any time.

### The Event Pattern

Every interaction follows this cycle:

1. **Client emits an event** → e.g., `socket.emit("muziek:buzz", { answer: "Rick Astley" })`
2. **Server receives it** in a handler registered with `socket.on("muziek:buzz", callback)`
3. **Server runs game logic** (is it correct? update scores, check if round ends)
4. **Server emits back** → sends results to one player, multiple players, or everyone

### Who Receives What

Socket.IO has different ways to send:

- `socket.emit(...)` → only to the socket that sent the message (private response)
- `io.to(roomId).emit(...)` → to everyone in a room
- `io.to(socketId).emit(...)` → to one specific player by their socket ID
- The "broadcast per player" pattern → loop through all players and emit personalized state to each

### The Event Contract

`shared/types.ts` contains two interfaces:

- **`ClientToServerEvents`** — every event the client can send (with parameter types)
- **`ServerToClientEvents`** — every event the server can send (with parameter types)

This means TypeScript enforces that both sides agree on what data is expected. If you add a new event, you add it to both interfaces.

---

## Server-Side Architecture

### index.ts — The Entry Point

What it does on startup:

1. Creates an Express app
2. Creates an HTTP server wrapping Express
3. Creates a Socket.IO server on top of that HTTP server
4. Configures CORS (which origins can connect)
5. Registers REST API endpoints
6. On each new socket connection, calls `registerSocketHandlers(io, socket)`
7. In production, serves the compiled React app as static files
8. Has a SPA fallback: any route that isn't `/api/*` returns `index.html` (so React Router works)

**REST endpoints** (non-WebSocket, regular HTTP):

- `GET /api/health` — status check
- `GET /api/packs` — returns all character packs (for Wie Ben Ik lobby settings)
- `GET /api/trivia-categories` — category list for Snelste Vinger settings
- `GET /api/drawing-categories` — category list for Drawing settings
- `GET /api/song-categories` — category list for Muziek settings
- `GET /api/songs` — all songs grouped by category
- `GET /api/song-preview/:deezerId` — fetches a fresh Deezer preview URL
- `PATCH /api/songs/offset` — saves a start offset for a song clip

### rooms.ts — Room & Player Management

**In-memory data stores:**

- `rooms: Map<string, GameRoom>` — all active rooms, keyed by room code
- `socketToRoom: Map<string, { roomId, playerId }>` — maps each socket ID to the room/player it belongs to
- `disconnectTimers: Map<string, setTimeout>` — cleanup timers for disconnected players

**Room code**: Random 4-letter uppercase string (e.g., "HKBX")

**Key functions:**

| Function                                     | What it does                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `createRoom(hostPlayer, gameCategory)`       | Creates a new GameRoom with the host as first player, status='lobby'                                |
| `joinRoom(roomId, player)`                   | Adds a player to a room. If someone with that nickname was disconnected, reconnects them instead    |
| `leaveRoom(roomId, playerId)`                | Removes player permanently. Transfers host to next connected player. Deletes room if empty          |
| `disconnectPlayer(roomId, playerId)`         | Sets `connected: false` but keeps them in the room. Transfers host immediately if host disconnected |
| `reconnectPlayer(roomId, playerId)`          | Sets `connected: true`, cancels the cleanup timer                                                   |
| `removeDisconnectedPlayer(roomId, playerId)` | Called after grace period expires — permanently removes the player                                  |
| `getSocketIdForPlayer(roomId, playerId)`     | Finds the socket ID for a given player (used when emitting per-player views)                        |

**Limits**: `MAX_PLAYERS_PER_ROOM = 20`

**Host transfer**: When the current host leaves or disconnects, the first connected non-bot player becomes the new host. If nobody's left, the room is deleted.

### socketHandlers.ts — The Central Router

This is the biggest file. It receives ALL socket events and routes them to the appropriate engine.

**Structure:**

- `registerSocketHandlers(io, socket)` — called once per connected socket
- Inside, it registers `socket.on("event-name", handler)` for every client→server event
- Each handler typically: validates input → finds the room → calls the engine → emits results

**Rate limiting:**

- `socketEventTimestamps: Map<string, number[]>` — stores timestamps of recent events per socket
- Max 10 events per 1000ms window. If exceeded, the event is silently dropped.

**The Briefing system** (managed in socketHandlers):

- When a game starts, server emits `briefing-start` with game instructions
- Collects `player-ready` events from each player
- Auto-readies bots
- When all ready (or 20 seconds pass), starts a 3-2-1 countdown
- After countdown, the game engine actually begins

**Important Maps managed here:**

- `roomCountdowns` — active countdown intervals (3-2-1-GO)
- `roomBriefings` — which players are ready for briefing
- `roomRoundResults` — accumulated results for building final scores
- `roomAdvancing` — prevents duplicate game-start clicks

### Game Engines (the 4 core files)

Each engine follows the same pattern:

1. Maintains a `Map<roomId, GameInstance>` of active game state
2. Exposes a `startGame()` function that initializes state
3. Exposes handler functions for player actions (guess, buzz, draw, etc.)
4. Uses callbacks (passed in at start) to emit state back to players
5. Manages its own timers (per-question timers, turn timers, etc.)
6. Has a `cleanup(roomId)` to remove state when game ends

### whatAmIBroadcast.ts — Personalized State

This helper exists because in Wie Ben Ik, each player MUST NOT see their own character. So you can't just broadcast one state to everyone.

**Functions:**

- `broadcastWhatAmIState(io, roomId)` — loops through all players, builds a personalized view for each, and emits individually
- `buildPlayerView(instance, playerId)` — shows all characters EXCEPT the requesting player's own
- `buildModeratorView(instance)` — shows ALL characters (for host in spectator mode)
- `checkAllGuessedAndFinish()` — checks if everyone has guessed, ends game if so
- `createOnTick()` — returns a callback that broadcasts state every second (for timers)
- `createOnTurnAdvance()` — returns a callback for when turns change

### Data Stores (\*Store.ts files)

Simple modules that:

1. Load JSON data from `server/data/` on startup
2. Expose getter functions for the engines to use
3. In dev mode: reload from disk on each call (so you can edit data without restarting)

| Store                 | Loads               | Provides                                          |
| --------------------- | ------------------- | ------------------------------------------------- |
| `characterStore.ts`   | `characters.json`   | Character packs, individual characters by pack ID |
| `songStore.ts`        | `songs.json`        | Songs by category, all songs, individual songs    |
| `triviaStore.ts`      | `trivia.json`       | Trivia questions by category, category metadata   |
| `drawingWordStore.ts` | `drawingWords.json` | Words by category and difficulty                  |

---

## Client-Side Architecture

### Bootstrap (main.tsx)

Wraps the app in providers (outermost → innermost):

1. **BrowserRouter** — enables React Router navigation
2. **SocketProvider** — creates and manages the Socket.IO connection
3. **GameProvider** — provides global game state to all components
4. **App** — renders routes

### Routes (App.tsx)

| Path               | Page           | Purpose                              |
| ------------------ | -------------- | ------------------------------------ |
| `/`                | Landing        | Home page — pick game, enter name    |
| `/join/:roomId`    | Join           | Join an existing room by code        |
| `/lobby/:roomId`   | Lobby          | Configure settings, wait for players |
| `/game/:roomId`    | Game           | Active gameplay                      |
| `/results/:roomId` | Results        | Final podium and scores              |
| `/test/characters` | TestCharacters | Dev tool: browse character packs     |
| `/test/songs`      | TestSongs      | Dev tool: browse songs               |

All routes are wrapped in `PageTransition` (Framer Motion) for smooth enter/exit animations.

### SocketContext.tsx — Connection Management

**What it does:**

- Creates a single Socket.IO client instance
- Connects to `localhost:3001` (dev) or `window.location.origin` (production)
- Uses WebSocket transport first, falls back to polling
- Saves `{ roomId, playerId }` to sessionStorage when you join a room
- On reconnect: automatically emits `reconnect-attempt` with saved session data

**What it exposes:**

- `useSocket()` hook → returns the Socket.IO client
- `saveSession()` / `clearSession()` / `getSession()` utilities

### Pages in Detail

**Landing.tsx** — Two-step creation flow:

1. Pick a game category (4 buttons)
2. Enter nickname + pick emoji avatar (persisted in localStorage)
3. Emits `create-room` → server responds with `room-created` → auto-navigates to lobby

**Lobby.tsx** — Pre-game waiting room:

- Shows player list with avatars
- Copy invite link button (copies `/join/XXXX` URL)
- Host sees game-specific settings panel (one per game type)
- Host clicks "Start" → emits `{game}:start-game`
- Watches for phase changes → navigates to `/game` when game starts
- Has a 4-second reconnect window (in case you refresh the page)

**Game.tsx** — Active game container:

- Checks the game category and renders the matching component
- Handles shared phases: briefing → countdown → playing → finished
- **Briefing phase**: Shows `BriefingScreen` (rules + "I'm ready" button → emits `player-ready`)
- **Countdown phase**: Shows 3-2-1-GO animation
- **Playing phase**: Renders game-specific component
- **Finished phase**: Redirects to `/results`
- Determines spectator mode (host with `hostPlays: false`)

**Results.tsx** — Podium reveal:

- Animated sequence: drumroll → 3rd place → 2nd place → 1st place → full leaderboard
- Sound effects: drum roll, victory fanfare, confetti bursts
- Auto-advances through phases on timers
- Host sees "Play Again" button (emits `play-again`) or "New Game" (back to home)

### Game Components

**MuziekGame.tsx** — Audio guessing:

- Uses Howler.js for audio playback (Web Audio API wrapper)
- Creates a new `Howl` instance per song (from `state.previewUrl`)
- In Heardle mode: stops audio after `heardlePhaseDuration` seconds
- Input: either free text with autocomplete suggestions OR multiple-choice buttons
- Emits `muziek:buzz` with the answer text
- Shows volume slider, progress timer, score table

**DrawingGame.tsx + DrawingCanvas.tsx** — Real-time drawing:

- Canvas uses logical size 800×500 (coordinates normalized 0–1)
- **If you're the drawer**: draw on canvas, emit strokes
- **If you're guessing**: see incoming strokes rendered, type guesses
- Tools: brush (3 sizes), eraser, fill bucket, undo, clear
- Colors: palette of preset colors
- Live points emitted as you draw (for real-time preview on other screens)
- Complete strokes emitted when you lift pen (finalized data)
- Message feed shows guesses, close guesses ("bijna!"), and correct answers

**WhatAmIGame.tsx** — Character guessing:

- In free-for-all: everyone guesses simultaneously, 30s cooldown on wrong guess
- In turn-based: only the active player can guess, timer per turn
- Shows other players' progress (who guessed correctly, who gave up)
- Host can reroll a player's character
- Players can take notes in a local textarea
- Skip turn / Give up buttons in turn-based mode

**SnelsteVingerGame.tsx** — Speed trivia:

- Shows question text + countdown timer
- Text input to type your answer and buzz in
- Timer changes color: normal → orange (≤10s) → red (≤5s)
- On wrong buzz: locked out for that question
- Shows winner name + correct answer in reveal phase
- Score table with streaks

---

## The Shared Contract (shared/types.ts)

This file is the single source of truth for all data shapes. Key sections:

### Game Category

The 4 supported games: `'muziek' | 'what-am-i' | 'drawing' | 'snelste-vinger'`

### Player

Every player has: `id`, `nickname`, `avatarUrl`, `isHost`, `isBot`, `score`, `connected`

### GameRoom

The room itself: `roomId`, `players[]`, `settings`, `status` (lobby/playing/finished), `currentRoundIndex`, `gameCategory`, plus optional per-game settings objects

### Per-Game Settings

Each game has its own settings interface with defaults:

- `WhatAmISettings` — packs, game mode, turn timing, questions per turn
- `SnelsteVingerSettings` — categories, question count, points, streak bonus
- `DrawingSettings` — rounds, draw time, categories, custom words
- `MuziekSettings` — categories, clip duration, guess mode, Heardle mode, multiple choice

### Per-Game Client State

What the client receives during gameplay:

- `WhatAmIClientGameState` — player states, current turn, time remaining
- `SnelsteVingerClientState` — current question, scores, who won, phase
- `DrawingClientState` — phase, drawer, word/hint, scores, correct guessers
- `MuziekClientState` — current song info, scores, phase, Heardle state

### Socket Events

Two interfaces that define EVERY possible event:

- `ClientToServerEvents` — ~30 events the client can emit
- `ServerToClientEvents` — ~40 events the server can emit

---

## Game Flow Lifecycle

### Detailed Step-by-Step:

```
1. HOST opens landing page
   └─ Picks game category (muziek/what-am-i/drawing/snelste-vinger)
   └─ Enters nickname, picks avatar
   └─ Client emits: "create-room" { nickname, avatarUrl, gameCategory }
   └─ Server creates room, responds: "room-created" { room, player }
   └─ Client saves session, navigates to /lobby/XXXX

2. PLAYERS join
   └─ Open /join/XXXX link or enter code on landing page
   └─ Enter nickname, pick avatar
   └─ Client emits: "join-room" { roomId, nickname, avatarUrl }
   └─ Server adds to room, responds: "room-joined" to joiner, "player-joined" to everyone else
   └─ Everyone's lobby updates with new player

3. HOST configures settings
   └─ Client emits: "{game}:update-settings" { ...settings }
   └─ Server validates (host only, room in lobby), stores settings
   └─ Server emits: "{game}:settings-updated" to all players

4. HOST starts game
   └─ Client emits: "{game}:start-game"
   └─ Server emits: "game-started" to all
   └─ Server emits: "briefing-start" { briefingKey, gameCategory }

5. BRIEFING
   └─ All players see game rules screen
   └─ Each player clicks "Ready" → emits "player-ready"
   └─ Server tracks ready count, emits "briefing-ready-count" { ready, total }
   └─ When all ready OR 20 seconds pass:

6. COUNTDOWN
   └─ Server emits "countdown" { count: 3 }, then { count: 2 }, then { count: 1 }
   └─ 1-second intervals
   └─ After countdown: server starts the actual game engine

7. PLAYING
   └─ Engine begins (questions/songs/turns/characters)
   └─ Server emits game-specific state updates
   └─ Players interact, server validates, broadcasts results
   └─ (details per game below)

8. GAME ENDS
   └─ Engine determines game is over
   └─ Server emits: "{game}:game-end" with final scores
   └─ Client reducer builds FinalResults, navigates to /results

9. RESULTS
   └─ Animated podium reveal (3rd → 2nd → 1st → full board)
   └─ Host can click "Play Again" → emits "play-again"
   └─ Server resets room to lobby status
   └─ All players navigate back to /lobby
```

---

## Game Engines In Detail

### Wie Ben Ik? (whatAmIEngine.ts)

**Game Instance State:**

- `trackers: Map<playerId, PlayerTracker>` — per-player state (character, guessed?, placement, score, cooldown)
- `characterPool` — remaining unused characters (for rerolls)
- `gameMode` — 'free-for-all' or 'turns'
- `turnOrder` — shuffled player IDs
- `currentTurnIndex` — whose turn it is
- `turnNumber` — how many total turns have happened
- `questionsBeforeGuess` — how many "asked-question" events before guessing is allowed
- `maxRounds` — game ends after this many full rounds (null = infinite)

**How characters are assigned:**

1. Collect characters from selected packs + custom characters
2. Shuffle the pool
3. Pop one character per player
4. Store assignment in the player's tracker (hidden from themselves)

**Guess matching logic:**

1. Normalize both guess and character name (lowercase, strip accents, remove special characters)
2. Exact match → correct
3. Last name only match (if character has 2+ name parts, and last name ≥ 4 chars)
4. First + last name ignoring middle names
5. Levenshtein distance ≤ 2 (fuzzy spelling tolerance, only for words ≥ 5 chars)

**Scoring:**

- Based purely on placement (1st to guess = most points)
- `PLACEMENT_BONUSES = [1000, 750, 500, 350, 250, 200, 150, 100, ...]`
- Give up = 0 points, no placement

**Free-for-all mode:**

- Everyone can guess at any time
- Wrong guess → 30-second cooldown (can't guess again until cooldown expires)
- Server ticks every second to broadcast updated time/cooldown state

**Turn-based mode:**

- Only the current player can guess
- Timer runs per turn (e.g., 120 seconds)
- `questionsPerTurn`: how many guesses allowed per turn (0 = turn ends on first wrong guess)
- Skip turn → advance to next player
- Give up → permanently out, advance to next player
- Timer expires → advance to next player

**Game ends when:**

- All players have guessed correctly or given up
- OR `maxRounds` full rounds have completed
- OR host force-ends the game

### Snelste Vinger (snelsteVingerEngine.ts)

**Game Instance State:**

- `questions: TriviaQuestion[]` — shuffled questions from selected categories
- `currentIndex` — which question we're on
- `scores: Map<playerId, { score, streak, correctCount, wrongCount }>`
- `answeredCorrectly: Set<playerId>` — who got this question right
- `buzzedWrong: Set<playerId>` — who buzzed wrong (locked out)
- `winnerId` — first correct answer this question
- `questionTimer` — setTimeout for question timeout
- `revealTimer` — setTimeout for auto-advance after reveal

**Question flow:**

1. Pick next question, emit state to all players
2. Timer starts (e.g., 15 seconds)
3. Players buzz in with answers
4. First correct → wins, emit winner info, enter reveal phase
5. Wrong → penalty points, player locked out for that question
6. Timer expires with no winner → emit timeout with correct answer
7. Short reveal phase (3 seconds), then advance to next question

**Answer matching:**

- Normalize: lowercase, strip accents, trim whitespace, remove punctuation
- Exact match after normalization → correct
- Levenshtein distance ≤ 1 for short strings, ≤ 2 for longer strings (≥ 4 chars)
- Numbers (years, counts) must match exactly — no fuzzy tolerance

**Scoring:**

- Correct: +`pointsCorrect` (default 100) + streak bonus (+25 per consecutive correct)
- Wrong: -`pointsWrongPenalty` (default 25), streak resets to 0

### Tekenwedstrijd (drawingEngine.ts)

**Game Instance State:**

- `turnOrder: string[]` — human player IDs (bots don't draw)
- `currentRound` / `totalRounds` — how many times each player draws
- `currentTurnInRound` — index into turnOrder for current round
- `phase: 'picking' | 'drawing' | 'reveal' | 'finished'`
- `currentDrawerId` / `currentWord` / `wordLength`
- `usedWords: Set<string>` — never repeat a word
- `strokes: DrawingStroke[]` — all canvas data
- `correctGuessers: string[]` — ordered by who guessed first
- `scores: Map<playerId, { score, roundScore, streak }>`

**Turn lifecycle:**

1. **Picking**: Server sends 3-4 word choices to the drawer (mixed difficulty). Drawer picks one.
2. **Drawing**: Drawer draws, guessers guess. Timer counts down. Hints reveal progressively.
3. **Reveal**: Word shown to all, scores awarded. Short pause.
4. **Next turn**: Move to next drawer. After everyone has drawn once = 1 round complete.

**Word choices:**

- `pickWordChoices()`: tries to pick 1 easy + 1-2 medium + 1 hard
- Custom words are treated as medium difficulty
- Never repeats words already used in this game session

**Hint system:**

- Reveals ~40% of the word's letters over the draw time
- Spaces in hints: revealed evenly at intervals
- Formula: `interval = (drawTimeSeconds * 1000) / (lettersToReveal + 1)` ms per hint update

**Guess processing:**

- Drawer cannot guess their own word
- Exact match (with minor Levenshtein tolerance) → correct
- If guess CONTAINS the word → silently rejected (prevents chat spoilers like "is it elephant?")
- If Levenshtein distance is small but not correct → marked as "close" (shown to everyone as "bijna!")
- Returns: correct, position, score, alreadyGuessed, isClose

**Scoring:**

- **Guesser**: Position-based diminishing returns
  - 1st guesser: hard=200, medium=150, easy=100
  - Later guessers: linear decrease down to minimum 25
- **Drawer**: 50–150 points based on percentage of players who guessed correctly

**Turn ends when:**

- All guessers have guessed correctly
- OR timer expires

### Raad het Nummer (muziekEngine.ts)

**Game Instance State:**

- `songs: SongEntry[]` — shuffled songs from selected categories
- `currentSongIndex`
- `scores: Map<playerId, { score, streak, correctCount, wrongCount }>`
- `answeredCorrectSet: Set<playerId>` — who got this song right
- `mediaGuessedSet: Set<playerId>` — who got media-only points
- `heardlePhase: 0-5` — current Heardle phase
- `heardleLockedOut: Set<playerId>` — locked out this phase (one-per-phase mode)
- `currentOptions: string[]` — 4 options for multiple choice mode
- Settings: heardleMode, guessMode, meerkeuze, snelsteRader, etc.

**Normal mode flow:**

1. Pick song, emit state with previewUrl, start timer
2. Players listen and buzz with answers
3. If `snelsteRader`: first correct answer ends the song immediately
4. If not: everyone can score, but later correct answers get fewer points
5. Timer expires → reveal correct answer

**Heardle mode flow:**

1. Start at phase 0 (1 second of audio)
2. Players guess or skip
3. If all remaining players skip/give up → advance to next phase
4. Phases: 1s → 2s → 4s → 7s → 11s → 20s
5. After phase 5 with no winner → song ends, reveal answer
6. Earlier phase = more points (multiplier decreases each phase)

**Answer validation:**

- `guessMode` determines what counts: 'title', 'artist', or 'both'
- Handles combined "Title – Artist" format (from autocomplete)
- Normalize: lowercase, strip accents, remove articles ("de", "het", "the")
- Checks: exact match → contains match (≥5 chars) → Levenshtein fuzzy → acceptedAnswers array
- Media match: if song has a `media` field (anime/game name), guessing that gives half points

**Scoring (normal mode, everyone scores):**

- 1st correct: 100% of points (default 100)
- 2nd correct: 75%
- 3rd correct: 50%
- 4th+: 25%
- Streak bonus: +25 per consecutive correct (if enabled)
- Wrong buzz: -penalty (default 25), streak resets

**Scoring (Heardle mode):**

- Phase multiplier: [1.0, 0.8, 0.6, 0.4, 0.2, 0.1] (earlier = more points)
- Points = basePoints × phaseMultiplier

**Multiple choice (meerkeuze):**

- `generateOptions()`: correct answer + 3 random distractors from same category
- Player must pick one of the 4 options (no free text)

**Autocomplete pool:**

- Server builds a list of all titles + artists from selected categories
- Sends to client as `muziek:autocomplete-pool`
- Client uses this for the autocomplete dropdown while typing

---

## Client State Management (GameContext.tsx)

### The State Shape

```
{
  player: Player | null              // Current user's player info
  room: GameRoom | null              // Full room data (players, settings, status)
  playerProgress: PlayerProgress[]   // Live progress updates during games
  roundResults: RoundResult[]        // Accumulated round results
  currentRoundResult: RoundResult | null
  finalResults: FinalResults | null  // End-of-game podium data
  countdown: number | null           // 3, 2, 1, or null
  phase: "idle" | "lobby" | "playing" | "countdown" | "briefing" | "round-end" | "finished"
  timeRemainingMs: number | null     // Server-synced timer
  errorMessage: string | null
  toasts: Toast[]                    // Pop-up notifications

  // Game-specific state (only one is active at a time)
  whatAmIState: WhatAmIClientGameState | null
  snelsteVingerState: SnelsteVingerClientState | null
  drawingState: DrawingClientState | null
  muziekState: MuziekClientState | null
  muziekAutocompletePool: string[]

  // Briefing
  briefing: { briefingKey, roundType, gameCategory, readyCount, totalCount } | null
}
```

### The Reducer (32 action types)

This is a single big switch statement. Each socket event maps to one action.

**Core lifecycle actions:**

- `SET_PLAYER` / `SET_ROOM` — store initial data on join
- `PLAYER_JOINED` — add player to room (with deduplication check)
- `PLAYER_LEFT` — remove player, handle host transfer
- `SETTINGS_UPDATED` — update room settings
- `GAME_STARTED` — set phase to 'playing'
- `COUNTDOWN` — store countdown number
- `SCORE_UPDATED` — update a player's score
- `ROUND_END` / `GAME_END` — phase transitions
- `TIME_UPDATE` — sync timer from server
- `RECONNECTED` — restore full state after disconnect (room, phase, game state, results)
- `RESET` — clear everything (kicked, room closed)
- `ADD_TOAST` / `REMOVE_TOAST` — notification management

**Game-specific actions:**

- `SET_WHATAMI_STATE` / `WHATAMI_GUESS_RESULT` / `WHATAMI_PLAYER_GUESSED` / `WHATAMI_GAME_END`
- `SET_SNELSTEVINGER_STATE` / `UPDATE_SNELSTEVINGER_STATE` / `SNELSTEVINGER_GAME_END`
- `SET_MUZIEK_STATE` / `UPDATE_MUZIEK_STATE` / `MUZIEK_GAME_END` / `SET_MUZIEK_AUTOCOMPLETE_POOL`
- `SET_DRAWING_STATE` / `DRAWING_GAME_END`

**Briefing actions:**

- `SET_BRIEFING` / `BRIEFING_READY_COUNT` / `CLEAR_BRIEFING`

### Key Pattern: Game-End → FinalResults

When a game ends, the reducer builds `FinalResults` from the game-specific scores. Each game does this differently:

- Wie Ben Ik: placement-based scores from player trackers
- Snelste Vinger: accumulated scores from quiz
- Muziek: accumulated scores from songs
- Drawing: accumulated scores from rounds

The `FinalResults` object has a standardized shape that the Results page can render regardless of which game was played.

---

## Socket Event Wiring (useSocketEvents.ts)

This hook is the bridge between the network and the state:

1. Runs on mount inside the Game page
2. Registers `socket.on(...)` listeners for every server→client event
3. Each listener dispatches the appropriate reducer action
4. Plays sound effects on certain events (correct/wrong/join/leave)
5. Shows toast notifications for key moments
6. Handles navigation (e.g., reconnect routes you to the right page)
7. Cleans up all listeners on unmount

**Navigation triggers:**

- `room-created` / `room-joined` → navigate to `/lobby`
- `reconnected` → navigate to correct page based on `phase` field
- `kicked` / `room-closed` → navigate to `/`

**Sound triggers:**

- `player-joined` → join sound
- `player-left` → wrong sound
- `countdown` ≤ 3 → tick sound
- `game-started` → game start sound
- `buzz-result` correct → correct sound
- `buzz-result` wrong → wrong sound
- Podium reveal → drumroll, victory

---

## Data (server/data/)

### characters.json

Array of character packs. Each pack:

```
{ id: "film", name: "🎬 Filmpersonages", description: "...", characters: [...] }
```

Each character: `{ id: "darth-vader", name: "Darth Vader", imageUrl?: "...", category?: "Star Wars" }`

### songs.json

Array of song entries. Each song:

```
{ id, title, artist, previewUrl, coverUrl, category, media?, acceptedAnswers[], startOffset? }
```

- `previewUrl`: 30-second Deezer clip URL
- `media`: source material (e.g., "Attack on Titan" for anime songs)
- `acceptedAnswers`: alternative correct answers (spellings, abbreviations)
- `startOffset`: where to start playing in the 30s clip (for Heardle)

### trivia.json

Array of categories. Each category has questions:

```
{ id: "gaming", name: "🎮 Gaming", questions: [...] }
```

Each question: `{ question: "...", answer: "...", acceptedAnswers: ["alt1", "alt2"] }`

### drawingWords.json

Array of categories. Each category has words:

```
{ id: "dieren", name: "🐾 Dieren", words: [...] }
```

Each word: `{ word: "olifant", difficulty: "easy" | "medium" | "hard" }`

---

## Key Patterns

### 1. Normalized Drawing Coordinates

Drawing points are stored as 0–1 float values (not pixel values). The canvas reference is 800×500 logical pixels. When rendering, multiply by the actual canvas size. This means drawings look identical on any screen size — a phone and a desktop show the same proportions.

### 2. Per-Player State Views

In Wie Ben Ik, you cannot see your own character. The server loops through every player and builds a UNIQUE state object for each one. Your own `assignedCharacter` field is set to `null` in your view, but other players can see yours. The moderator (host who's not playing) sees everything.

### 3. Server-Authoritative Timers

The server is the clock. It runs `setInterval` ticks and emits `timeRemainingMs` to clients. The client also runs its own local countdown (50ms tick) for smooth animation, but resyncs whenever the server sends an update. This prevents cheating — you can't manipulate your local clock to get more time.

### 4. Fuzzy Answer Matching

All answer validation uses the same pattern:

1. Normalize both strings (lowercase, remove accents like é→e, strip articles)
2. Try exact match
3. Try Levenshtein distance (allows minor typos: "elephnt" matches "elephant")
4. Try partial match for long strings (guess contains answer or vice versa)
5. Check `acceptedAnswers` array for known alternatives

### 5. Reconnection Flow

When a player disconnects (close tab, lose internet):

1. Server detects socket disconnect
2. Sets `player.connected = false`, starts cleanup timer
3. If player reconnects before timer: cancel timer, restore session
4. Server emits `reconnected` with full current state (room, game state, results)
5. Client receives it, populates the reducer, navigates to the correct page
6. Player continues as if nothing happened

If the timer expires: player is permanently removed from the room.

### 6. Host as Spectator

When `hostPlays: false`:

- Host doesn't get assigned a character / can't buzz / can't draw
- Host sees a "moderator view" with all answers visible
- Host can give hints, force-end games, control pacing
- Host's score doesn't count in final results
- Useful for a game master / party host who runs the evening

### 7. The Briefing System

Before every game, there's a "briefing" screen that:

1. Shows the game name and rules (from `gameInstructions.ts`)
2. Waits for all players to click "Ready" (or 20-second auto-start)
3. Prevents confused players from being thrown into a game they don't understand
4. Gives everyone time to get their phone ready

### 8. Toast Notifications

Transient pop-up messages (e.g., "🎉 Bas guessed correctly!"):

- Added via `ADD_TOAST` action with unique ID
- Auto-removed after a timeout
- Can be: success (green), error (red), info (blue)
- Prevent spam by deduplicating similar messages

### 9. Session Persistence

The client stores `{ roomId, playerId }` in `sessionStorage`:

- Survives page refresh within the same tab
- On page load: if session exists, attempt to reconnect to room
- If reconnect fails: clear session and go to home page
- This is why you can refresh during a game and not lose your spot
