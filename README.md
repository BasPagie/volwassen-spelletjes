# Spelletjeskamer

**De Verwarde Volwassenen**

Multiplayer Dutch party game platform. Real-time, browser-based, everyone plays on their own device.

## Games

### 🎭 Wie Ben Ik?

Character on your forehead, ask yes/no questions, guess who you are.

- **Modes**: Free-for-all or turn-based
- **14 character packs**: Acteurs, Artiesten, Memes & Internet, Filmpersonages, Seriepersonages, Gamepersonages, Superhelden, Mythologie, Geschiedenis, Cartoon, Disney, Anime, Nederland Nu, League of Legends
- **Custom characters**: Host can add their own
- **Reroll**: If someone doesn't know their character
- **Configurable**: Questions per turn, questions before guessing allowed, max rounds, time limits

### 🏃 Snelste Vinger

Buzz in first with the correct answer. Trivia across 13 categories.

- **Categories**: Popcultuur, Gaming, Muziek, Internet, Series, Wetenschap, Random, Eten & Drinken, Aardrijkskunde, Geschiedenis, Nederland, League of Legends, Dwergen
- **390 questions** across all categories
- **Streak bonus**: Consecutive correct answers earn extra points
- **Configurable**: Points per answer, wrong answer penalty, time per question, question count

### ✏️ Tekenwedstrijd

One player draws, the rest guesses. Pictionary-style with live drawing.

- **14 word categories**: Dieren, Eten, Beroepen, Sport, Voorwerpen, Films, Series, Disney, Acties, Plaatsen, Gaming & Popculture, Spicy, League of Legends, Smash Bros
- **Custom words**: Host can add their own
- **Live strokes**: Drawing appears in real-time for guessers
- **Progressive hints**: Word letters revealed over time
- **Tools**: Multiple colors, brush sizes, fill, undo, clear

### 🎵 Raad het Nummer

Listen to a song clip and guess the title, artist, or both.

- **Song categories**: Memes & Guilty Pleasures, Anime Openings, Anime OST (70+ songs)
- **3 game modes**:
  - **Snelste Rader**: First correct answer wins the round
  - **Meerkeuze**: Multiple-choice options
  - **Heardle mode**: Progressive reveal (1s → 2s → 4s → 7s → 11s → 16s)
- **Autocomplete**: Suggestions while typing
- **Configurable**: Clip duration, guess mode (title/artist/both), streak bonus

## How it works

Host creates a room, shares the 4-letter invite code. Everyone joins on their own device, host picks a game mode and configures settings, then you play. Live scoreboard, podium at the end.

**Features**:

- Emoji avatars (20 options)
- Reconnection support (rejoin after disconnect)
- Host can spectate or play
- Bot players for testing
- Briefing screen before each game with rules
- Responsive mobile-first design

## Setup

```bash
npm run install:all
npm run dev
```

Client on `localhost:5173`, server on `localhost:3001`.

## Deployment

Hosted on Render (free tier). Single web service serving the built client and WebSocket server.

```bash
npm run build
npm start
```

## Stack

- **Client**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Socket.IO, Howler.js
- **Server**: Node.js 22, Express, Socket.IO, TypeScript
- **Shared**: TypeScript types + full socket event contracts
- **Deployment**: Render
