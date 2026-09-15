import fs from 'node:fs';
import path from 'node:path';
import type { DrawnCard, TarotCard } from '../types/index';
import { config } from '../config';

let deckCache: TarotCard[] | null = null;

function loadDeck(): TarotCard[] {
  if (deckCache) {
    return deckCache;
  }

  const deckPath = path.join(process.cwd(), 'data', 'tarot-deck.json');
  const raw = fs.readFileSync(deckPath, 'utf-8');
  const parsed = JSON.parse(raw) as TarotCard[];
  deckCache = parsed;
  return parsed;
}

export function getDeckSize(): number {
  return loadDeck().length;
}

export function drawRandomCard(): DrawnCard {
  const deck = loadDeck();
  const index = Math.floor(Math.random() * deck.length);
  const card = deck[index];

  if (!card) {
    throw new Error('Tarot deck is empty');
  }

  const reversed = config.allowReversed ? Math.random() < 0.3 : false;
  return { card, reversed };
}

export function getCardById(id: string): TarotCard | undefined {
  return loadDeck().find((card) => card.id === id);
}

export function getCardMeaning(drawn: DrawnCard): string {
  return drawn.reversed ? drawn.card.reversed : drawn.card.upright;
}
