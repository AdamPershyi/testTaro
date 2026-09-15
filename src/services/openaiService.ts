import OpenAI from 'openai';
import { config } from '../config';
import type { DrawnCard } from '../types/index';
import { getCardMeaning } from './deckService';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `Ти містичний таролог для Twitch-стріму. Відповідай ТІЛЬКИ українською.

Правила:
- Дай персональну інтерпретацію: питання глядача + значення карти саме для цього питання.
- 3–5 речень, живо і атмосферно, але без зайвої води.
- Не кажи, що ти ШІ. Не давай медичних, юридичних чи фінансових гарантій.
- Якщо питання токсичне або неприйнятне — м'яко відмов і запропонуй переформулювати.
- Звертайся до глядача на "ти".`;

export async function generateInterpretation(
  username: string,
  question: string,
  drawn: DrawnCard,
): Promise<string> {
  const openai = getClient();
  const orientation = drawn.reversed ? 'перевернута' : 'пряма';
  const baseMeaning = getCardMeaning(drawn);

  const userPrompt = `Глядач: ${username}
Питання: ${question}

Карта: ${drawn.card.nameUk} (${orientation})
Базове значення карти: ${baseMeaning}
Ключові слова: ${drawn.card.keywords.join(', ')}

Дай таро-відповідь для цього питання.`;

  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.85,
    max_tokens: 350,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI returned empty interpretation');
  }
  return text;
}

export async function generateSpeech(text: string): Promise<Buffer> {
  const openai = getClient();

  const response = await openai.audio.speech.create({
    model: config.openai.ttsModel,
    voice: config.openai.ttsVoice,
    input: text,
    response_format: 'mp3',
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function buildFallbackInterpretation(
  username: string,
  question: string,
  drawn: DrawnCard,
): string {
  const orientation = drawn.reversed ? 'перевернута' : 'пряма';
  const meaning = getCardMeaning(drawn);
  return `${username}, карта ${drawn.card.nameUk} (${orientation}) говорить про те, що ${meaning.toLowerCase()} У контексті твого питання «${question}» — прислухайся до інтуїції й зверни увагу на знаки навколо.`;
}
