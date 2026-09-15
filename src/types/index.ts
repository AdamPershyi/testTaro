export type TarotSuit = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

export interface TarotCard {
  id: string;
  name: string;
  nameUk: string;
  suit: TarotSuit;
  number: number | null;
  upright: string;
  reversed: string;
  keywords: string[];
}

export interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
}

export type ReadingStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'playing'
  | 'done'
  | 'failed';

export interface Reading {
  id: string;
  username: string;
  question: string;
  status: ReadingStatus;
  drawnCard: DrawnCard | null;
  interpretation: string | null;
  audioMimeType: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OverlayEventType =
  | 'reading:queued'
  | 'reading:drawing'
  | 'reading:reveal'
  | 'reading:reading'
  | 'reading:done'
  | 'reading:error';

export interface OverlayEvent {
  type: OverlayEventType;
  readingId: string;
  payload: Record<string, unknown>;
}

export interface CreateReadingRequest {
  username: string;
  question: string;
}

export interface CreateReadingResponse {
  id: string;
  status: ReadingStatus;
  queuePosition: number;
}
