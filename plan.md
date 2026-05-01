# Spelletjeskamer — Improvement Plan

## 1. Code Quality Review

### Architecture Issues

**A. Monolithic `socketHandlers.ts` (900+ lines)**

The biggest DRY violation is the repeated "broadcast state to all players" pattern — it appears ~12 times with nearly identical code:

```typescript
for (const player of room.players) {
  const sid = getSocketIdForPlayer(roomId, player.id);
  if (!sid) continue;
  const isModeratorHost = player.isHost && !settings.hostPlays;
  const state = isModeratorHost
    ? buildModeratorView(inst)
    : buildPlayerView(inst, player.id);
  io.to(sid).emit("whatami:state-update", state);
}
```

**Fix**: Extract a `broadcastWhatAmIState(io, roomId, settings)` helper. Same for the "check all guessed → finish game" pattern (~5 occurrences).

Split into:

- `server/src/handlers/roomHandlers.ts` — create/join/leave/reconnect
- `server/src/handlers/gameHandlers.ts` — woord game events
- `server/src/handlers/whatAmIHandlers.ts` — wie ben ik events

**B. Memory leak: `socketEventTimestamps` Map**

Entries are deleted on disconnect, but if the server receives events from sockets that never properly disconnect, timestamps accumulate. Add periodic pruning or use a TTL-cache.

**C. No error boundaries in React**

A crash in any game component (e.g., unexpected null from server) shows a white screen. Add an `<ErrorBoundary>` wrapping routes.

**D. In-memory state with no persistence**

All game state lives in Maps. On Render free tier, the server sleeps after 15min — all active games are lost. For v2, consider Redis or at minimum warn users that games are ephemeral.

**E. GameContext reducer is 40+ actions in one switch**

Split into composed reducers by domain (`roomReducer`, `roundReducer`, `whatAmIReducer`) and combine them.

**F. Testing strategy**

Currently zero tests. Prioritize:

1. Unit tests for `gameEngine.ts` scoring/state logic (pure functions, easy to test)
2. Unit tests for `whatAmIEngine.ts` fuzzy matching
3. Integration tests for socket event flows (use `socket.io-client` in tests)

---

## 2. UI/UX Improvements

| Suggestion                          | Impact | Effort | Details                                                                                                                                                         |
| ----------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sound effects**                   | 5      | 2      | Correct/wrong buzzer, countdown beep, game start fanfare. Use Howler.js with a mute toggle. Huge polish for party atmosphere.                                   |
| **Haptic feedback on mobile**       | 3      | 1      | `navigator.vibrate(50)` on wrong guess, `vibrate(200)` on correct. One-liner per interaction.                                                                   |
| **Confetti on win/correct**         | 4      | 1      | Use `canvas-confetti` on round wins, final podium reveal. Instant delight.                                                                                      |
| **Toast notifications**             | 4      | 2      | When someone joins/leaves/guesses correctly — show a brief animated toast. Replace the current `error` emissions with proper UI feedback.                       |
| **Onboarding tutorial**             | 4      | 3      | First-time modal explaining the game mode when entering lobby. Expand the `rulesKey` localStorage check to a multi-step coach marks overlay.                    |
| **Loading skeletons**               | 3      | 1      | Replace the spinning 🎲 emoji with proper skeleton UI (gray pulse boxes) for a more polished feel.                                                              |
| **Dark mode**                       | 3      | 3      | Your audience plays at parties (often in dim rooms). Add a dark theme toggle using Tailwind's `dark:` classes.                                                  |
| **Live player status indicators**   | 4      | 2      | Show "typing..." or "thinking..." status when a player is actively inputting. Green dot for connected, gray for disconnected.                                   |
| **Better mobile keyboard handling** | 4      | 2      | In Lingo/Open Deur, the virtual keyboard pushes the game off-screen. Use `visualViewport` API to adjust layout, or build a custom on-screen keyboard for Lingo. |
| **Spectator dashboard for host**    | 3      | 3      | When hostPlays=false, show a real-time overview: who's stuck, live scores, ability to give hints.                                                               |
| **Share results as image**          | 4      | 2      | After game ends, generate a shareable image (using `html2canvas`) with scores, like Wordle's grid share.                                                        |
| **Animated page transitions**       | 3      | 2      | Add `<AnimatePresence>` route transitions (fade/slide between pages).                                                                                           |

---

## 3. Feature Brainstorm

### New Game Modes

| Feature                             | Impact | Effort | Description                                                                                                                                          |
| ----------------------------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **30 Seconds**                      | 5      | 3      | Classic Dutch party game. One player describes 5 words/names in 30 seconds, others guess. Server picks words, player sees them, others type guesses. |
| **Taboe (Taboo)**                   | 5      | 3      | Describe a word without using 5 forbidden words. Host/spectators see forbidden words and can buzz.                                                   |
| **Snelste Vinger (Fastest Finger)** | 4      | 2      | Quick-fire trivia — first to buzz in and answer correctly gets points. Server broadcasts question, first correct answer wins.                        |
| **Pictionary / Tekenen**            | 4      | 4      | Canvas drawing with Socket.IO broadcast. High effort but massive engagement. (`DrawingGameStub` already exists.)                                     |
| **Music Round (Raad het Nummer)**   | 4      | 3      | Play a short audio clip, players guess song/artist. Use Spotify preview URLs (30s clips, free API).                                                  |
| **Geheime Rol (Secret Role)**       | 3      | 4      | Werewolf/Mafia-lite: assign secret roles, vote each round. Complex but high replay value.                                                            |

### Meta-Features

| Feature                        | Impact | Effort | Description                                                                                                                                |
| ------------------------------ | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Persistent player profiles** | 4      | 3      | LocalStorage profile with stats: games played, win rate, favorite game mode. Show on join screen. No backend needed.                       |
| **Custom room themes**         | 3      | 2      | Let host pick a color scheme/emoji theme for the room. Cosmetic but feels personal.                                                        |
| **Achievement badges**         | 3      | 2      | "First Win", "5 in a row", "Speed Demon" — stored in localStorage, shown on player card.                                                   |
| **Game history**               | 3      | 3      | After game ends, store results in localStorage. "Rematch" button that pre-loads same settings.                                             |
| **Custom puzzle creation**     | 5      | 3      | Let hosts create their own Connections puzzles, Open Deur questions, Lingo words. Store as JSON, shareable via link. Massive replay value. |

### Quality-of-Life

| Feature                        | Impact | Effort | Description                                                                                                            |
| ------------------------------ | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| **QR code for room invite**    | 5      | 1      | Generate a QR code on the lobby screen. For in-person play, everyone just scans. Use `qrcode` npm package.             |
| **Lobby chat**                 | 3      | 2      | Simple text chat in lobby while waiting. Keeps people engaged before game starts.                                      |
| **Ready check**                | 4      | 2      | "Ready" button for each player. Game starts when all ready (or host overrides). Prevents starting when someone is AFK. |
| **Adjustable round order**     | 3      | 1      | Drag-and-drop to reorder rounds in settings.                                                                           |
| **Rematch with same settings** | 4      | 1      | One-click "Opnieuw spelen" that keeps settings + players pre-filled.                                                   |
| **Offline/PWA support**        | 2      | 3      | Service worker for instant loading. Limited value since it's multiplayer, but faster cold start helps.                 |
| **Room PIN instead of URL**    | 4      | 1      | Show a 4-digit PIN prominently. Players go to the site and enter PIN. Easier than sharing links verbally at a party.   |

### Retention & Replay

| Feature                    | Impact | Effort | Description                                                                                           |
| -------------------------- | ------ | ------ | ----------------------------------------------------------------------------------------------------- |
| **Daily challenge**        | 4      | 3      | One shared puzzle per day (like Wordle). All players compete on the same puzzle, compare scores.      |
| **Puzzle rating system**   | 3      | 2      | After each round, thumbs up/down. Track which puzzles are best, serve highest-rated ones more often.  |
| **Seasonal content packs** | 3      | 2      | Holiday-themed character packs (Sinterklaas, Carnaval), seasonal word sets. Easy JSON data additions. |

---

## Priority Recommendations (Quick Wins)

Top 5 highest-impact, lowest-effort items:

1. **QR code in lobby** — Impact 5, Effort 1
2. **Sound effects** — Impact 5, Effort 2
3. **30 Seconds game mode** — Impact 5, Effort 3
4. **Custom puzzle creation** — Impact 5, Effort 3
5. **Confetti + toast notifications** — Impact 4, Effort 1

These would transform the app from "functional prototype" to "polished party tool" with relatively low effort.
