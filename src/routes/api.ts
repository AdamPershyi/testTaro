import { Router } from 'express';
import { z } from 'zod';
import { config, getPublicBaseUrl } from '../config';
import {
  enqueueReading,
  getAudio,
  getHealthStats,
  getQueuePosition,
  getReading,
} from '../services/readingService';
import { getDeckSize } from '../services/deckService';
import type { OverlayHub } from '../websocket/overlayHub';
import { requireApiSecret } from '../middleware/auth';

const createReadingSchema = z.object({
  username: z.string().min(1).max(50),
  question: z.string().min(3).max(config.maxQuestionLength),
});

export function createApiRouter(overlay: OverlayHub): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const stats = getHealthStats();
    res.json({
      ok: true,
      deckSize: getDeckSize(),
      overlayClients: overlay.getClientCount(),
      ...stats,
    });
  });

  router.get('/trigger', requireApiSecret, (req, res) => {
    const parsed = createReadingSchema.safeParse({
      username: req.query.username,
      question: req.query.question,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten(),
        hint: 'Use ?username=...&question=...&key=API_SECRET',
      });
      return;
    }

    try {
      const { reading, queuePosition } = enqueueReading(parsed.data, overlay);
      res.status(202).json({
        id: reading.id,
        status: reading.status,
        queuePosition,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enqueue reading';
      res.status(429).json({ error: message });
    }
  });

  router.post('/readings', requireApiSecret, (req, res) => {
    const parsed = createReadingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const { reading, queuePosition } = enqueueReading(parsed.data, overlay);
      res.status(202).json({
        id: reading.id,
        status: reading.status,
        queuePosition,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enqueue reading';
      res.status(429).json({ error: message });
    }
  });

  router.get('/readings/:id', requireApiSecret, (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Missing reading id' });
      return;
    }

    const reading = getReading(id);
    if (!reading) {
      res.status(404).json({ error: 'Reading not found' });
      return;
    }

    res.json({
      ...reading,
      queuePosition: getQueuePosition(reading.id),
    });
  });

  router.get('/readings/:id/audio', (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Missing reading id' });
      return;
    }

    const audio = getAudio(id);
    if (!audio) {
      res.status(404).json({ error: 'Audio not found or expired' });
      return;
    }

    res.setHeader('Content-Type', audio.mimeType);
    res.setHeader('Cache-Control', 'no-store');
    res.send(audio.buffer);
  });

  router.get('/info', (req, res) => {
    const baseUrl = getPublicBaseUrl(req.get('host'));
    res.json({
      overlayUrl: `${baseUrl}/overlay`,
      websocketUrl: `${baseUrl.replace(/^http/, 'ws')}/ws/overlay`,
      deckSize: getDeckSize(),
    });
  });

  return router;
}
