# Spelletjeskamer

**De Verwarde Volwassenen**

Multiplayer Dutch party game platform. Real-time, browser-based, everyone plays on their own device.

## Games

- **🔗 Woordspellen** — Connections, Puzzelronde, Open Deur, Lingo. Mix and match per round.
- **🎭 Wie Ben Ik?** — Character on your forehead, ask yes/no questions, guess who you are. Multiple packs + custom characters. Reroll if someone doesn't know theirs.
- **✏️ Tekenwedstrijd** — One player draws, the rest guesses.
- **🏃 Snelste Vinger** — Buzz in first with the correct answer.

## How it works

Host creates a room, shares the invite code. Everyone joins, host picks the games, and you play. Scores after each round, podium at the end.

## Setup

```bash
npm run install:all
npm run dev
```

Client on `localhost:5173`, server on `localhost:3001`.

## Stack

- **Client**: React, TypeScript, Vite, Tailwind CSS, Framer Motion, Socket.IO
- **Server**: Node.js, Express, Socket.IO, TypeScript
- **Shared**: TypeScript types + socket event contracts
