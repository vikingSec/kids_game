import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import type { ServerMessage, GameStateMessage } from '@kids-game/shared';
import { GameState } from './GameState';
import { PlayerSession } from './PlayerSession';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const BROADCAST_INTERVAL = 50; // 20Hz = every 50ms

// Express for health check
const app = express();
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    players: gameState.playerCount,
  });
});

// Create HTTP server
const server = createServer(app);

// Game state
const gameState = new GameState();

// Connected player sessions
const sessions: Map<string, PlayerSession> = new Map();

// Broadcast a message to all connected players (optionally excluding one)
function broadcast(message: ServerMessage, excludeId?: string): void {
  sessions.forEach((session, id) => {
    if (id !== excludeId && session.isJoined) {
      session.send(message);
    }
  });
}

// Handle session disconnect
function handleDisconnect(id: string): void {
  sessions.delete(id);
}

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  const session = new PlayerSession(ws, gameState, broadcast, handleDisconnect);
  sessions.set(session.id, session);
  console.log(`Connection from ${session.id}`);
});

// Broadcast game state to all players at 20Hz
setInterval(() => {
  if (sessions.size === 0) return;

  const stateMessage: GameStateMessage = {
    type: 'state',
    players: gameState.getAllPlayerData(),
  };

  sessions.forEach((session) => {
    if (session.isJoined) {
      session.send(stateMessage);
    }
  });
}, BROADCAST_INTERVAL);

server.listen(PORT, () => {
  console.log('=================================');
  console.log('  Robot Spiderman Game Server');
  console.log('=================================');
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`WebSocket:    ws://localhost:${PORT}`);
  console.log(`Max players:  5`);
  console.log(`Tick rate:    20Hz`);
  console.log('=================================');
});
