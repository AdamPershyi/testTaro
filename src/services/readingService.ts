import { v4 as uuidv4 } from 'uuid';
import type { CreateReadingRequest, Reading } from '../types/index';
import { config } from '../config';
import { drawRandomCard } from './deckService';
import {
  buildFallbackInterpretation,
  generateInterpretation,
  generateSpeech,
} from './openaiService';
import { buildGagInterpretation, pickReadingGag } from './gagService';
import type { OverlayHub } from '../websocket/overlayHub';

const readings = new Map<string, Reading>();
const audioStore = new Map<string, { buffer: Buffer; mimeType: string; expiresAt: number }>();

let processing = false;
const queue: string[] = [];

function nowIso(): string {
  return new Date().toISOString();
}

function createReadingRecord(input: CreateReadingRequest): Reading {
  const reading: Reading = {
    id: uuidv4(),
    username: input.username.trim(),
    question: input.question.trim(),
    status: 'queued',
    drawnCard: null,
    interpretation: null,
    audioMimeType: null,
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  readings.set(reading.id, reading);
  return reading;
}

function updateReading(id: string, patch: Partial<Reading>): Reading {
  const current = readings.get(id);
  if (!current) {
    throw new Error(`Reading ${id} not found`);
  }
  const updated: Reading = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
  readings.set(id, updated);
  return updated;
}

export function getReading(id: string): Reading | undefined {
  return readings.get(id);
}

export function getQueuePosition(id: string): number {
  const index = queue.indexOf(id);
  return index === -1 ? 0 : index + 1;
}

export function getAudio(id: string): { buffer: Buffer; mimeType: string } | undefined {
  const entry = audioStore.get(id);
  if (!entry) {
    return undefined;
  }
  if (Date.now() > entry.expiresAt) {
    audioStore.delete(id);
    return undefined;
  }
  return { buffer: entry.buffer, mimeType: entry.mimeType };
}

function storeAudio(id: string, buffer: Buffer, mimeType: string): void {
  audioStore.set(id, {
    buffer,
    mimeType,
    expiresAt: Date.now() + config.audioTtlMs,
  });
}

export function enqueueReading(
  input: CreateReadingRequest,
  overlay: OverlayHub,
): { reading: Reading; queuePosition: number } {
  if (queue.length >= config.maxQueueSize) {
    throw new Error('Черга розкладів переповнена. Спробуй пізніше.');
  }

  const reading = createReadingRecord(input);
  queue.push(reading.id);

  overlay.broadcast({
    type: 'reading:queued',
    readingId: reading.id,
    payload: {
      username: reading.username,
      question: reading.question,
      queuePosition: queue.length,
    },
  });

  void processQueue(overlay);

  return { reading, queuePosition: queue.length };
}

async function processQueue(overlay: OverlayHub): Promise<void> {
  if (processing) {
    return;
  }
  processing = true;

  while (queue.length > 0) {
    const id = queue[0];
    if (!id) {
      break;
    }

    try {
      await runReading(id, overlay);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateReading(id, { status: 'failed', error: message });
      overlay.broadcast({
        type: 'reading:error',
        readingId: id,
        payload: { message },
      });
    } finally {
      queue.shift();
    }
  }

  processing = false;
}

async function runReading(id: string, overlay: OverlayHub): Promise<void> {
  const reading = readings.get(id);
  if (!reading) {
    return;
  }

  updateReading(id, { status: 'processing' });

  overlay.broadcast({
    type: 'reading:drawing',
    readingId: id,
    payload: {
      username: reading.username,
      question: reading.question,
    },
  });

  await delay(2500);

  const drawn = drawRandomCard();
  updateReading(id, { drawnCard: drawn });

  overlay.broadcast({
    type: 'reading:reveal',
    readingId: id,
    payload: {
      username: reading.username,
      question: reading.question,
      card: {
        id: drawn.card.id,
        nameUk: drawn.card.nameUk,
        reversed: drawn.reversed,
        keywords: drawn.card.keywords,
        baseMeaning: drawn.reversed ? drawn.card.reversed : drawn.card.upright,
      },
    },
  });

  await delay(1500);

  let interpretation: string;
  const gag = pickReadingGag();
  if (gag !== 'none') {
    interpretation = buildGagInterpretation(reading.username, drawn, gag);
  } else {
    try {
      interpretation = await generateInterpretation(
        reading.username,
        reading.question,
        drawn,
      );
    } catch {
      interpretation = buildFallbackInterpretation(
        reading.username,
        reading.question,
        drawn,
      );
    }
  }

  updateReading(id, { interpretation, status: 'ready' });

  let audioBuffer: Buffer;
  try {
    audioBuffer = await generateSpeech(interpretation);
  } catch {
    audioBuffer = await generateSpeech(interpretation);
  }

  storeAudio(id, audioBuffer, 'audio/mpeg');
  updateReading(id, { audioMimeType: 'audio/mpeg', status: 'playing' });

  overlay.broadcast({
    type: 'reading:reading',
    readingId: id,
    payload: {
      username: reading.username,
      question: reading.question,
      interpretation,
      card: {
        id: drawn.card.id,
        nameUk: drawn.card.nameUk,
        reversed: drawn.reversed,
      },
      audioUrl: `/api/readings/${id}/audio`,
    },
  });

  const estimatedDurationMs = Math.max(8000, interpretation.length * 70);
  await delay(estimatedDurationMs);

  updateReading(id, { status: 'done' });
  overlay.broadcast({
    type: 'reading:done',
    readingId: id,
    payload: { username: reading.username },
  });

  await delay(2000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getHealthStats(): {
  queueLength: number;
  processing: boolean;
  storedReadings: number;
} {
  return {
    queueLength: queue.length,
    processing,
    storedReadings: readings.size,
  };
}
