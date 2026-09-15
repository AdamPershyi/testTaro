import http from 'node:http';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { createApiRouter } from './routes/api';
import { OverlayHub } from './websocket/overlayHub';

const app = express();
const server = http.createServer(app);
const overlay = new OverlayHub(server);

app.use(cors());
app.use(express.json({ limit: '32kb' }));

app.use('/overlay', express.static(path.join(process.cwd(), 'public', 'overlay')));
app.use('/api', createApiRouter(overlay));

app.get('/', (_req, res) => {
  res.json({
    name: 'Tarot Twitch Bot',
    overlay: '/overlay',
    health: '/api/health',
    docs: 'See README.md for Streamer.bot setup',
  });
});

server.listen(config.port, () => {
  console.log(`Tarot bot running on port ${config.port}`);
  console.log(`Overlay: http://localhost:${config.port}/overlay`);
  console.log(`WebSocket: ws://localhost:${config.port}/ws/overlay`);

  if (!config.openai.apiKey) {
    console.warn('WARNING: OPENAI_API_KEY is not set. Readings will use fallback text only.');
  }
});
