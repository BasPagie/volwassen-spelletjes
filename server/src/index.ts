import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { registerSocketHandlers } from './socketHandlers.js';
import { resolvePackImages, getAllPacks } from './characterStore.js';
import { getAllTriviaCategories } from './triviaStore.js';
import { getAllDrawingCategories } from './drawingWordStore.js';
import { getAllSongCategories, getAllSongsGrouped, getAllSongsGroupedFresh } from './songStore.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types.js';

const app = express();
const server = http.createServer(app);

const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

const isProduction = process.env.NODE_ENV === 'production';

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: isProduction
    ? { origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : false, methods: ['GET', 'POST'] }
    : { origin: CORS_ORIGINS, methods: ['GET', 'POST'] },
});

app.use(express.json());

// Serve the client build in production
// __dirname at runtime = server/dist/server/src → go up 4 levels to project root
const clientDist = path.join(__dirname, '../../../../client/dist');
app.use(express.static(clientDist));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/packs', (_req, res) => {
  const packs = getAllPacks();
  res.json(packs);
});

app.get('/api/trivia-categories', (_req, res) => {
  res.json(getAllTriviaCategories());
});

app.get('/api/drawing-categories', (_req, res) => {
  res.json(getAllDrawingCategories());
});

app.get('/api/song-categories', (_req, res) => {
  res.json(getAllSongCategories());
});

app.get('/api/songs', (_req, res) => {
  // Return songs without refreshing — URLs will be fetched on-demand when played
  res.json(getAllSongsGrouped());
});

app.get('/api/song-preview/:deezerId', async (req, res) => {
  const deezerId = parseInt(req.params.deezerId, 10);
  if (!deezerId || isNaN(deezerId)) {
    res.status(400).json({ error: 'Invalid deezerId' });
    return;
  }
  try {
    const response = await fetch(`https://api.deezer.com/track/${deezerId}`);
    if (!response.ok) {
      res.status(502).json({ error: 'Deezer API error' });
      return;
    }
    const data = await response.json();
    if (!data.preview) {
      res.status(404).json({ error: 'No preview available' });
      return;
    }
    res.json({ previewUrl: data.preview });
  } catch {
    res.status(502).json({ error: 'Failed to fetch preview' });
  }
});

app.patch('/api/songs/offset', (req, res) => {
  const { category, songIndex, startOffset } = req.body;
  if (typeof category !== 'string' || typeof songIndex !== 'number' || typeof startOffset !== 'number') {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }
  if (startOffset < 0 || startOffset > 29) {
    res.status(400).json({ error: 'startOffset must be between 0 and 29' });
    return;
  }
  const songsPath = path.join(__dirname, '..', 'data', 'songs.json');
  try {
    const data = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
    const cat = data.find((c: { id: string }) => c.id === category);
    if (!cat) { res.status(404).json({ error: 'Category not found' }); return; }
    if (songIndex < 0 || songIndex >= cat.songs.length) { res.status(404).json({ error: 'Song not found' }); return; }
    cat.songs[songIndex].startOffset = startOffset;
    fs.writeFileSync(songsPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    res.json({ ok: true, startOffset });
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// SPA fallback — let React Router handle all non-API, non-static routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🎮 Server running on port ${PORT}`);
  // Resolve Wikipedia images in background (non-blocking)
  resolvePackImages().catch((err) => {
    console.error('[resolvePackImages] Failed:', err);
  });
});
