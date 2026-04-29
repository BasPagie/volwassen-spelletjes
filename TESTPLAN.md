# Woord — Manual Test Plan

> **Last updated:** 2026-03-29
> **App:** Woord (multiplayer Dutch word puzzle game)
> **Stack:** React + Vite + Tailwind (client) / Node + Express + Socket.IO (server)
> **Test URL:** `http://localhost:5173` (client) / `http://localhost:3001` (server)

---

## Priority Legend

| Priority | Meaning                              | When to run                 |
| -------- | ------------------------------------ | --------------------------- |
| **P0**   | Critical — game-breaking if broken   | Every playtest (smoke test) |
| **P1**   | Important — poor UX if broken        | Before each release         |
| **P2**   | Nice-to-have — cosmetic or edge case | Full regression only        |

---

## 🔥 Smoke Test (P0 only — run before every playtest)

Run these in order. If any fail, stop and fix before playtesting.

| #   | Test                                                                          | Pass? |
| --- | ----------------------------------------------------------------------------- | ----- |
| 1   | Create room → lobby loads with room code                                      |       |
| 2   | Copy invite link → open in incognito → join page shows "Je bent uitgenodigd!" |       |
| 3   | Enter name + join → both players visible in lobby                             |       |
| 4   | Host starts game → 3-2-1 countdown → round intro → game loads on all clients  |       |
| 5   | Submit a correct answer → score updates, progress shows                       |       |
| 6   | Timer counts down smoothly (no jumping)                                       |       |
| 7   | Round ends → round-end overlay shows scores                                   |       |
| 8   | Host clicks "Volgende Ronde" → next round starts (not skipped)                |       |
| 9   | After final round → podium results screen shows                               |       |
| 10  | `/join/FAKECODE` → shows "Lobby niet gevonden" immediately (no join form)     |       |

---

## 1. Room Management

### 1.1 Create Room

```
[RM-01] [P0] Create room successfully
Preconditions: Server running, on landing page
Steps:
  1. Enter nickname and pick avatar
  2. Click "Maak Kamer"
Expected:
  - Redirected to /lobby/:roomId
  - Room code visible in header
  - Player shown in player list with 👑 Host badge
  - Invite link displayed and correct
```

```
[RM-02] [P1] Create room with empty nickname
Preconditions: On landing page
Steps:
  1. Leave nickname field empty
  2. Click "Maak Kamer"
Expected:
  - Button is disabled or error shown
  - No room created
```

```
[RM-03] [P1] Create room with special characters in nickname
Preconditions: On landing page
Steps:
  1. Enter nickname: <script>alert(1)</script>
  2. Click "Maak Kamer"
Expected:
  - Nickname sanitized (no HTML/script injection)
  - Room created normally with cleaned name
```

### 1.2 Join Room

```
[RM-04] [P0] Join room via invite link
Preconditions: Room exists, in lobby state
Steps:
  1. Open invite link /join/:roomId in new browser/incognito
  2. Enter nickname, pick avatar
  3. Click "Doe Mee!"
Expected:
  - Redirected to /lobby/:roomId
  - Player appears in lobby for all players
  - Player count updated
```

```
[RM-05] [P0] Join invalid room code
Preconditions: No room with code "FAKECODE"
Steps:
  1. Navigate to /join/FAKECODE
Expected:
  - "Lobby niet gevonden" message shown IMMEDIATELY
  - No name input or join button visible
  - "Terug naar home" button works
```

```
[RM-06] [P1] Join room where game already started
Preconditions: Room exists, game is in progress
Steps:
  1. Navigate to /join/:roomId
Expected:
  - "Spel is al begonnen" message shown immediately
  - No join form visible
  - "Terug naar home" button works
```

### 1.3 Lobby Access Control

```
[RM-07] [P0] Navigate to /lobby/:roomId without session
Preconditions: No session in sessionStorage, room exists
Steps:
  1. Open /lobby/:validRoomId directly in browser
Expected:
  - Immediately redirected to home page (/)
```

```
[RM-08] [P1] Navigate to /lobby/:roomId with expired/invalid session
Preconditions: Have a session for this room but player was removed (>30s disconnect)
Steps:
  1. Wait for disconnect grace period to expire
  2. Refresh the lobby page
Expected:
  - Brief "Herverbinden..." loading (up to 4s)
  - Then "Geen toegang" page with explanation
  - "Opnieuw deelnemen" and "Terug naar home" buttons visible
```

```
[RM-09] [P1] Navigate to /game/:roomId without session
Preconditions: No session in sessionStorage
Steps:
  1. Open /game/:validRoomId directly
Expected:
  - Immediately redirected to home page
```

```
[RM-10] [P1] Navigate to /results/:roomId without session
Preconditions: No session in sessionStorage
Steps:
  1. Open /results/:validRoomId directly
Expected:
  - Immediately redirected to home page
```

### 1.4 Room Code & Invite Link

```
[RM-11] [P1] Copy invite link
Preconditions: In lobby as host
Steps:
  1. Click copy button next to invite link
Expected:
  - Button changes to ✓ briefly
  - Clipboard contains correct URL: {origin}/join/{roomId}
```

```
[RM-12] [P2] Room code format
Preconditions: Create multiple rooms
Steps:
  1. Create 5 rooms, note room codes
Expected:
  - All codes are 6 characters
  - Only uppercase letters and digits (no I/O/0/1)
  - No duplicates
```

---

## 2. Host Controls

### 2.1 Start Game

```
[HC-01] [P0] Host starts game
Preconditions: 2+ players in lobby
Steps:
  1. Host clicks "Start Spel!"
Expected:
  - All players see 3-2-1-GO countdown
  - Then round intro splash (2.5s)
  - Then game loads
```

```
[HC-02] [P1] Non-host cannot start game (hostControl=true)
Preconditions: 2 players in lobby, hostControl enabled
Steps:
  1. Non-host player looks for start button
Expected:
  - No start button visible for non-host
  - "Wachten op host..." message shown
```

```
[HC-03] [P2] Start game with only host (single player)
Preconditions: Host alone in lobby, hostPlays=true
Steps:
  1. Click "Start Spel!"
Expected:
  - Game starts normally for single player
  - All game modes work solo
```

### 2.2 Settings

```
[HC-04] [P1] Change round configuration
Preconditions: In lobby as host
Steps:
  1. Add/remove rounds
  2. Change round types and difficulties
Expected:
  - Settings update for all players in real-time
  - Max 5 rounds enforced
  - Min 1 round enforced
```

```
[HC-05] [P1] Change timer setting
Preconditions: In lobby as host
Steps:
  1. Set timer to 30 seconds
  2. Start game
Expected:
  - Timer starts at 0:30 in game
  - Timer bar starts full
```

```
[HC-06] [P1] Disable timer
Preconditions: In lobby as host
Steps:
  1. Set timer to "Geen limiet"
  2. Start game
Expected:
  - No timer bar visible during gameplay
```

```
[HC-07] [P2] Non-host cannot change settings
Preconditions: In lobby as non-host
Steps:
  1. Try to interact with settings panel
Expected:
  - Settings are view-only / disabled for non-host
```

### 2.3 Kick Player

```
[HC-08] [P1] Host kicks player from lobby
Preconditions: 2+ players in lobby
Steps:
  1. Host clicks ✕ button next to a non-host player
Expected:
  - Player removed from player list for all
  - Kicked player redirected to home page
  - Kicked player's session cleared
```

```
[HC-09] [P1] Host cannot kick themselves
Preconditions: In lobby as host
Steps:
  1. Look for ✕ button next to own name
Expected:
  - No ✕ button visible next to host
```

```
[HC-10] [P2] Kick button not visible for non-host
Preconditions: In lobby as non-host
Steps:
  1. Look for ✕ buttons next to other players
Expected:
  - No kick buttons visible
```

```
[HC-11] [P2] Kick disconnected player from lobby
Preconditions: Player disconnected (shown as gray dot) in lobby
Steps:
  1. Host clicks ✕ next to disconnected player
Expected:
  - Player removed immediately
  - Disconnect timer cancelled
```

### 2.4 Next Round & Play Again

```
[HC-12] [P0] Next round advances correctly
Preconditions: Round just ended, round-end overlay visible
Steps:
  1. Host clicks "Volgende Ronde"
Expected:
  - Next round starts with correct round type
  - Round counter increments (e.g. "Ronde 2 van 3")
  - Previous round is NOT skipped
```

```
[HC-13] [P0] Double-click "Volgende Ronde" does not skip rounds
Preconditions: Round just ended
Steps:
  1. Host rapidly double-clicks "Volgende Ronde"
Expected:
  - Only advances by 1 round
  - No round skipped
```

```
[HC-14] [P1] Play again returns to lobby
Preconditions: Final results screen shown
Steps:
  1. Host clicks "Opnieuw Spelen" or similar
Expected:
  - All players returned to lobby
  - Scores reset to 0
  - Settings preserved
```

---

## 3. Game Flow

### 3.1 Countdown & Round Intro

```
[GF-01] [P0] Countdown sequence
Preconditions: Host clicks start
Steps:
  1. Observe countdown
Expected:
  - Shows 3 → 2 → 1 → GO! with animations
  - Visible on all clients simultaneously
```

```
[GF-02] [P0] Round intro splash
Preconditions: Countdown finished / next round starting
Steps:
  1. Observe round intro
Expected:
  - Shows correct game mode icon and name
  - Shows "Ronde X van Y"
  - Displays for ~2.5 seconds
  - Automatically transitions to gameplay
```

### 3.2 Waiting Overlay

```
[GF-03] [P1] Early finisher sees waiting overlay
Preconditions: 2+ players, one finishes early
Steps:
  1. Player A completes all groups/answers before Player B
Expected:
  - Player A sees 🎉 celebration + score
  - "Wacht op X spelers..." message
  - List of still-busy players with "Bezig..." indicator
  - Game content still visible behind the overlay card
```

```
[GF-04] [P1] Waiting overlay updates as players finish
Preconditions: 3 players, Player A finished
Steps:
  1. Player B finishes
Expected:
  - Player B disappears from "busy" list on Player A's screen
  - Count updates ("Wacht op 1 speler...")
```

### 3.3 Round End

```
[GF-05] [P0] Round-end overlay shows correct scores
Preconditions: Round just ended
Steps:
  1. Observe round-end overlay
Expected:
  - All players listed with round scores
  - Sorted by score descending
  - Groups found, correct answers shown
```

### 3.4 Final Results

```
[GF-06] [P0] Podium results after last round
Preconditions: Last round just ended, host clicks next
Steps:
  1. Observe results screen
Expected:
  - Drumroll animation → 3rd place → 2nd place → 1st place → full leaderboard
  - Correct total scores and rankings
  - Medal emojis (🥇🥈🥉)
```

---

## 4. Game Modes

### 4.1 Connections

```
[GM-01] [P0] Submit correct group
Preconditions: Connections round active
Steps:
  1. Select 4 words that form a group
  2. Submit
Expected:
  - Group revealed with label and color
  - Words removed from selection
  - Score +100
```

```
[GM-02] [P0] Submit incorrect group
Preconditions: Connections round active
Steps:
  1. Select 4 words that don't form a group
  2. Submit
Expected:
  - Error feedback shown
  - Attempts counter decremented (if limited)
  - Hint: words that belong together highlighted (if ≥2 match)
```

```
[GM-03] [P1] Complete all 4 groups
Preconditions: 3 groups already solved
Steps:
  1. Submit the last correct group
Expected:
  - Player marked as finished
  - Speed bonus applied
  - Waiting overlay appears (if others still playing)
```

```
[GM-04] [P1] Run out of attempts
Preconditions: attemptsMode=limited, 1 attempt remaining
Steps:
  1. Submit incorrect group
Expected:
  - Player eliminated
  - Marked as finished
  - Score penalty applied (-25)
```

### 4.2 Puzzelronde

```
[GM-05] [P0] Type correct connecting word
Preconditions: Puzzelronde round active, 16 words visible in 4×4 grid
Steps:
  1. Identify 4 words that share a connecting word
  2. Type the connecting word in the input field
  3. Submit
Expected:
  - Group revealed with color highlighting and answer badge
  - +150 points
  - Progress updates ("X/4 groepen gevonden")
  - All 16 words remain visible (solved ones highlighted)
```

```
[GM-05b] [P1] Type wrong connecting word
Preconditions: Puzzelronde round active
Steps:
  1. Type a word that doesn't connect any unsolved group
  2. Submit
Expected:
  - Brief red "Niet goed..." feedback
  - No score penalty
  - Input cleared, can try again
```

```
[GM-06] [P1] Fuzzy matching on connecting word
Preconditions: Correct answer is "schrift"
Steps:
  1. Type "schrift" or "Schrift" or "schrift " (trailing space)
Expected:
  - Accepted as correct (case-insensitive, trimmed, Levenshtein distance ≤ 2 for words ≥ 6 chars)
```

```
[GM-06b] [P1] Puzzelronde word grid stays stable
Preconditions: Puzzelronde round active
Steps:
  1. Note the position of all 16 words
  2. Submit a correct connecting word
  3. Check word positions again
Expected:
  - Words remain in the same positions (no re-shuffle)
  - Solved group words are highlighted but not moved
```

### 4.3 Open Deur

```
[GM-07] [P0] Answer trivia correctly
Preconditions: Open Deur round active
Steps:
  1. Type a correct answer for the current question
Expected:
  - Answer appears in the correct slot (matching original answer position)
  - Hint letter replaced with full answer
  - +50 points
```

```
[GM-08] [P1] Answer hints show correct first letters
Preconditions: Open Deur question with 4 answers
Steps:
  1. Observe answer hints before answering
  2. Answer one correctly
Expected:
  - Each hint shows first letter of the answer at THAT position
  - Answered slot shows full answer (not just hint)
  - Remaining slots keep their correct first letter
```

```
[GM-09] [P1] Skip question (Volgende vraag)
Preconditions: Open Deur round active
Steps:
  1. Click "Volgende vraag →" button
Expected:
  - Advances to next question
  - Previous answers revealed
  - If last question → player finished
```

```
[GM-09b] [P1] Last answer completes question with visual feedback
Preconditions: Open Deur question with 3 of 4 answers found
Steps:
  1. Type the 4th correct answer
Expected:
  - Answer appears in the correct slot with green flash animation
  - Brief pause (~0.8s) showing all 4 found answers
  - Then automatically transitions to next question (or finishes)
```

### 4.4 Lingo

```
[GM-10] [P0] Submit correct Lingo guess
Preconditions: Lingo round active
Steps:
  1. Type the correct 5-letter word
  2. Submit
Expected:
  - All letters show green (correct)
  - +100 points + bonus for fewer guesses
  - Advances to next word (or finishes)
```

```
[GM-11] [P0] Lingo letter feedback accuracy
Preconditions: Target word is "STOEL", guess is "STOEP"
Steps:
  1. Submit "STOEP"
Expected:
  - S: correct (green)
  - T: correct (green)
  - O: correct (green)
  - E: present (yellow) — it's in the word but wrong position
  - P: absent (gray)
```

```
[GM-12] [P1] Lingo max guesses per word
Preconditions: Lingo round, failed to guess in 4 tries
Steps:
  1. Submit 5th incorrect guess
Expected:
  - Word marked as failed
  - Advances to next word
  - No points for this word
```

```
[GM-13] [P1] Lingo first letter shown
Preconditions: Lingo round starts
Steps:
  1. Observe the input area
Expected:
  - First letter of the target word is shown as a hint
```

---

## 5. Timer

```
[TM-01] [P0] Timer starts at correct duration
Preconditions: Timer set to 120s in settings
Steps:
  1. Start game, observe timer after round intro
Expected:
  - Timer shows 2:00
  - Timer bar is full width
```

```
[TM-02] [P0] Timer counts down smoothly
Preconditions: Round in progress with timer
Steps:
  1. Watch timer for 10+ seconds
Expected:
  - Seconds count down evenly (no jumping or stuttering)
  - Bar width decreases proportionally
```

```
[TM-03] [P0] Timer resets between rounds
Preconditions: Timer was at 0:45 when round ended
Steps:
  1. Start next round
Expected:
  - Timer resets to full configured duration
  - No flash of old value before reset
```

```
[TM-04] [P1] Timer forces round end
Preconditions: Round in progress, timer at ~5s
Steps:
  1. Wait for timer to reach 0
Expected:
  - All unfinished players auto-finished
  - Round-end overlay appears
  - Timer shows warning colors (orange at ≤10s, red at ≤5s)
```

```
[TM-05] [P1] Timer syncs across clients
Preconditions: 2 players in same round
Steps:
  1. Compare timer display on both screens
Expected:
  - Timers within ~1 second of each other
  - No significant drift over 60 seconds
```

```
[TM-06] [P2] No timer when disabled
Preconditions: Timer set to null/none in settings
Steps:
  1. Start game
Expected:
  - No timer bar visible
  - Round continues indefinitely until all players finish
```

---

## 6. Reconnection

```
[RC-01] [P0] Reconnect after page refresh
Preconditions: Player in active game
Steps:
  1. Refresh browser (F5)
Expected:
  - Automatically reconnects to same room
  - Returns to correct page (game/lobby/results)
  - Game state restored (score, progress, etc.)
```

```
[RC-02] [P0] Reconnect after tab close (within 30s)
Preconditions: Player in active game
Steps:
  1. Close browser tab
  2. Reopen app within 30 seconds
Expected:
  - Auto-reconnect via sessionStorage
  - Player restored to game with correct state
```

```
[RC-03] [P1] Disconnect grace period expires
Preconditions: Player disconnected
Steps:
  1. Wait >30 seconds without reconnecting
  2. Try to reconnect
Expected:
  - Player was permanently removed from room
  - Reconnect fails → session cleared → redirected to home
```

```
[RC-04] [P1] Other players see disconnect indicator
Preconditions: Player A disconnects
Steps:
  1. Observe Player A in other players' views
Expected:
  - Green dot → gray dot for Player A
  - Player NOT removed from list (grace period)
```

```
[RC-05] [P1] Rejoin lobby with same nickname reclaims slot
Preconditions: Player disconnected from lobby, within grace period
Steps:
  1. Open join link again
  2. Enter SAME nickname as before
  3. Click join
Expected:
  - Reclaims existing player slot (not duplicated)
  - Score and state preserved
```

```
[RC-06] [P2] Host disconnect triggers auto-transfer
Preconditions: Host disconnects
Steps:
  1. Host closes tab
Expected:
  - Host badge (👑) transfers to next connected non-bot player
  - New host can control rounds/settings
  - Other players see host change
```

---

## 7. Spectator Mode

```
[SP-01] [P1] Host spectates when hostPlays=false
Preconditions: Host set hostPlays to false, game started
Steps:
  1. Observe host's screen during round
Expected:
  - Shows 👀 spectator view
  - "Je kijkt toe als host" message
  - No interactive game elements
```

```
[SP-02] [P1] Spectating host not in scores
Preconditions: Round ended, host was spectating
Steps:
  1. Check round-end overlay
Expected:
  - Host not listed in round results
  - Host not on final podium
```

```
[SP-03] [P1] Spectating host still controls game
Preconditions: Round ended, host spectating
Steps:
  1. Check for "Volgende Ronde" button
Expected:
  - Host sees and can click next round / play again buttons
```

---

## 8. Scoring

```
[SC-01] [P1] Base score for correct group (Connections)
Preconditions: Connections round active
Steps:
  1. Submit a correct group of 4 words
Expected:
  - +100 points per group
```

```
[SC-01b] [P1] Base score for connecting word (Puzzelronde)
Preconditions: Puzzelronde round active
Steps:
  1. Type a correct connecting word
Expected:
  - +150 points per correct connecting word
  - No penalty for wrong guesses
```

```
[SC-02] [P1] Open Deur scoring
Preconditions: Open Deur round active
Steps:
  1. Type correct answers to questions
Expected:
  - +50 points per correct answer
  - No penalty for wrong answers
```

```
[SC-02b] [P1] Lingo scoring
Preconditions: Lingo round active
Steps:
  1. Guess a word correctly in 3 attempts
Expected:
  - +100 base points for correct word
  - +20 bonus per unused attempt (2 unused × 20 = +40)
  - Total: +140 points for this word
```

```
[SC-03] [P1] Speed bonus on round completion
Preconditions: Timer enabled, player finished early
Steps:
  1. Complete round quickly (any game mode)
Expected:
  - Speed bonus = 2 points per second remaining
  - Applied to all 4 game modes
  - Visible in round-end results
```

```
[SC-04] [P1] Wrong guess penalty (Connections, limited attempts)
Preconditions: attemptsMode=limited, Connections round
Steps:
  1. Submit incorrect group
Expected:
  - -25 points penalty
  - Attempts counter decremented
```

```
[SC-05] [P2] Scores persist across rounds
Preconditions: Complete round 1 with some score
Steps:
  1. Check score at start of round 2
Expected:
  - Total score carried over from Round 1
  - Visible in sidebar/progress
```

---

## 9. Edge Cases

```
[EC-01] [P1] All players disconnect during round
Preconditions: Game in progress
Steps:
  1. All players close their tabs
  2. All reconnect within 30s
Expected:
  - Game resumes normally
  - Timer continues (or round force-ended if timer expired)
```

```
[EC-02] [P1] Submit after finishing
Preconditions: Player already marked as finished
Steps:
  1. Try to submit another answer (if UI allows)
Expected:
  - Submission ignored
  - No score change
  - No errors
```

```
[EC-03] [P2] Max players (20)
Preconditions: Room with 20 players
Steps:
  1. Try to join with 21st player
Expected:
  - Join rejected with appropriate error message
```

```
[EC-04] [P2] Rapid submit clicks
Preconditions: Game active
Steps:
  1. Click submit button rapidly multiple times
Expected:
  - Rate limited (max 10 events/second)
  - No duplicate submissions processed
  - No errors or crashes
```

```
[EC-05] [P2] Very long nickname attempt
Preconditions: On join page
Steps:
  1. Enter 100+ character nickname
Expected:
  - Truncated to 20 characters
  - No overflow in UI
```

---

## 10. Multi-Device & Cross-Browser

```
[MD-01] [P1] Mobile + Desktop simultaneous play
Preconditions: 1 host on desktop, 1 player on mobile
Steps:
  1. Create room on desktop
  2. Join on mobile via invite link
  3. Play through a full game
Expected:
  - UI responsive on both devices
  - Game syncs correctly
  - All interactions work on mobile (tap for selection)
```

```
[MD-02] [P2] Different browsers
Preconditions: Room created
Steps:
  1. Host in Chrome, Player 2 in Firefox, Player 3 in Safari
  2. Play through game
Expected:
  - No browser-specific rendering issues
  - Socket connections stable on all browsers
```

```
[MD-03] [P2] Simulate network issues (DevTools)
Preconditions: Game in progress
Steps:
  1. Open DevTools → Network tab
  2. Set to "Slow 3G" or toggle offline/online
Expected:
  - Graceful handling of slow/dropped connections
  - Reconnection works when connection restored
  - No crash or white screen
```

---

## 11. DEV_MODE (Bot Testing)

```
[DM-01] [P2] Add bot players
Preconditions: DEV_MODE=true, in lobby as host
Steps:
  1. Click "+ Bot toevoegen" in Dev Tools panel
Expected:
  - Bot appears in player list with bot name and avatar
  - Bot shown as connected
```

```
[DM-02] [P2] Bots auto-play during rounds
Preconditions: Game started with bots
Steps:
  1. Observe round progress
Expected:
  - Bots auto-finish after 2-5 seconds
  - Progress bar updates for bots
  - Bot scores appear in round results
```

```
[DM-03] [P2] Remove bot from lobby
Preconditions: Bot in lobby, DEV_MODE=true
Steps:
  1. Click × next to bot name in Dev Tools
Expected:
  - Bot removed from player list
```

## 12. Rules Modal

```
[RL-01] [P1] Rules modal auto-shows on first visit
Preconditions: Never visited before (clear localStorage)
Steps:
  1. Create or join a room for the first time
Expected:
  - Rules modal ("📖 Hoe werkt het?") opens automatically
  - All 4 game modes explained with expandable cards
  - "Begrepen! 👍" button visible
```

```
[RL-02] [P1] Rules modal does not auto-show on subsequent visits
Preconditions: Have dismissed rules modal once before
Steps:
  1. Create or join another room
Expected:
  - Rules modal does NOT open automatically
  - "📖 Uitleg" button still visible in lobby header
  - Clicking "📖 Uitleg" opens the modal manually
```

```
[RL-03] [P2] Rules modal content is accurate
Preconditions: Open rules modal
Steps:
  1. Read each game mode explanation
Expected:
  - Connections: 16 words, 4 groups, +100 per group, -25 penalty
  - Puzzelronde: 16 words, 4 groups, type connecting word, +150 per answer
  - Open Deur: 3 questions, 4 answers each, +50 per answer
  - Lingo: 5-letter words, first letter hint, 🟩🟨⬜ feedback, +100 + bonus
```

---

## 13. Round End Overlay

```
[RE-01] [P1] Correct game mode label shown
Preconditions: Any round just ended
Steps:
  1. Observe round-end overlay
Expected:
  - Connections round shows: "🔗 Connections"
  - Puzzelronde shows: "🧩 Puzzelronde"
  - Open Deur shows: "🚪 Open Deur"
  - Lingo shows: "🟩 Lingo"
```

```
[RE-02] [P1] Correct stats shown per game mode
Preconditions: Last round just ended
Steps:
  1. Check own stats in round-end overlay
Expected:
  - Connections/Puzzelronde: shows groups found + words
  - Open Deur: shows number of answers
  - Lingo: shows "X woorden geraden"
```

---

## Test Run Checklist

| Date | Tester | Smoke Test  | Full Test   | Issues Found |
| ---- | ------ | ----------- | ----------- | ------------ |
|      |        | ☐ Pass/Fail | ☐ Pass/Fail |              |
|      |        | ☐ Pass/Fail | ☐ Pass/Fail |              |
|      |        | ☐ Pass/Fail | ☐ Pass/Fail |              |
