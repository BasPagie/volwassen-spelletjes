# Spelletjeskamer

**De Verwarde Volwassenen**

Multiplayer Dutch party game platform for quiz nights with friends. Real-time, browser-based, everyone plays on their own device.

## Game Categories

### 🧠 Woordspellen

Four word game modes, freely mixable per round:

- **🔗 Connections** — 16 words, group them into 4 categories of 4. +100 per group, −25 for wrong guesses. Partial-match hints when you're close.
- **🧩 Puzzelronde** — 16 words in 4 groups. Type the connecting word that links each group. +150 per correct word. Typos are forgiven.
- **🚪 Open Deur** — 3 trivia questions, each with 4 answers. Type them in, first letter shown as hint. +50 per answer.
- **🟩 Lingo** — Guess 5-letter Dutch words. First letter given, 5 attempts per word. Green/yellow/gray feedback. +100 per word + bonus for fewer guesses.

### 🎭 Wie Ben Ik?

Everyone gets a character on their forehead (visible to others, hidden from yourself). Ask yes/no questions and guess who you are!

- **5 character packs** — Popcultuur, Muziek, Memes & Internet, Fictie & Series, Nederland Nu (24 characters each)
- **Custom characters** — Add your own, import/export JSON, auto-fetch Wikipedia images
- **Saved lists** — Save custom lists to localStorage, toggle them on/off like packs
- **Two game modes** — Free-for-all (everyone guesses simultaneously) or turn-based
- **Give up** — Reveals your character with an orange overlay
- **Scoring** — Points based on speed; earlier guesses = more points

## How it works

Host creates a room, shares the 6-character invite code. Everyone joins and the host configures game settings. Everyone plays at the same time. Scores shown after each round, podium at the end.

## Setup

```bash
npm run install:all
npm run dev
```

Client on `localhost:5173`, server on `localhost:3001`.

For bot testing: server starts with `DEV_MODE=true` by default in dev.

## Stack

- **Client**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Socket.IO
- **Server**: Node.js, Express, Socket.IO, TypeScript (tsx watch)
- **Shared**: TypeScript types + socket event contracts

## Project structure

```
client/src/
  components/    # ConnectionsGame, LingoGame, WhatAmIGame, WhatAmILobbySettings, ...
  context/       # GameContext + SocketContext
  hooks/         # useSocketEvents
  pages/         # Landing, Join, Lobby, Game, Results

server/src/
  gameEngine.ts      # round logic, scoring, fuzzy matching
  whatAmIEngine.ts   # Wie Ben Ik game logic, turns, timers
  characterStore.ts  # character packs, Wikipedia image resolution
  puzzleStore.ts     # 120+ word puzzles
  socketHandlers.ts  # socket events, rate limiting
  rooms.ts           # room management

server/data/
  characters.json    # 5 packs × 24 characters

shared/
  types.ts           # shared types + socket event contracts
```
