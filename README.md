# Woord

Multiplayer Dutch word puzzle game for our weekly quiz night. Mixes NYT Connections with De Slimste Mens rounds. Real-time, browser-based, everyone plays on their own device.

## Game modes

Four modes, freely mixable per round:

- **🔗 Connections** — 16 words, group them into 4 categories of 4. +100 per group, −25 for wrong guesses. Partial-match hints when you're close.
- **🧩 Puzzelronde** — 16 words in 4 groups. Type the connecting word that links each group. +150 per correct word. Typos are forgiven.
- **🚪 Open Deur** — 3 trivia questions, each with 4 answers. Type them in, first letter shown as hint. +50 per answer. No penalty for guessing wrong.
- **🟩 Lingo** — Guess 5-letter Dutch words. First letter given, 5 attempts per word. Green/yellow/gray feedback. +100 per word + bonus for fewer guesses. 3 words per round.

## How it works

Host creates a room, shares the invite link. Everyone joins and the host configures:

- Game modes and difficulty per round (up to 5 rounds)
- Timer (1–5 min or no limit)
- Lives or unlimited attempts
- Host plays or spectates

Everyone plays at the same time. Finish early = speed bonus. Scores shown after each round, podium at the end.

First time joining? The rules popup shows automatically.

120 puzzles total (30 per mode), 3 difficulty levels, all in Dutch.

## Setup

```bash
npm run install:all
npm run dev
```

Client on `localhost:5173`, server on `localhost:3001`.

For bot testing: server starts with `DEV_MODE=true` by default in dev.

## Stack

- **Client**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Server**: Node.js, Express, Socket.IO, TypeScript
- **Shared**: TypeScript types + socket event contracts

## Project structure

```
client/src/
  components/    # ConnectionsGame, PuzzelrondeGame, OpenDeurGame, LingoGame, ...
  context/       # GameContext + SocketContext
  hooks/         # useSocketEvents
  pages/         # Landing, Join, Lobby, Game, Results

server/src/
  gameEngine.ts      # round logic, scoring, fuzzy matching
  puzzleStore.ts     # 120 puzzles
  socketHandlers.ts  # socket events, rate limiting
  rooms.ts           # room management

shared/
  types.ts           # shared types + socket event contracts
```
