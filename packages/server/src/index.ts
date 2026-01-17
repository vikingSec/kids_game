import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Express for health check
const app = express();
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Player connected');

  ws.on('message', (data) => {
    console.log('Received:', data.toString());
  });

  ws.on('close', () => {
    console.log('Player disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});
