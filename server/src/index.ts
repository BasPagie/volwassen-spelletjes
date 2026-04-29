import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types.js';

const app = express();
const server = http.createServer(app);

const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

// Serve the client build in production
// __dirname at runtime = server/dist/server/src → go up 4 levels to project root
const clientDist = path.join(__dirname, '../../../../client/dist');
app.use(express.static(clientDist));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
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
});
