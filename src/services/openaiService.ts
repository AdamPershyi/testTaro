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

const SYSTEM_PROMPT = `Ти український стрім-таролог для чату Perfect World. Говориш жорстко і смішно, як кент з клану, але текст має бути ЗМІСТОВНИЙ. Не набір слів.

Головне завдання:
1) Зрозуміти питання.
2) Пояснити, що саме ЦЯ карта каже по цьому питанню. 2–3 речення по суті.
3) Дати вердикт: так / ні / почекай / роби, але не так.
4) Один підкол на старті, один на фініші. Жаргон — приправа, не весь текст.

Якщо питання про MMORPG Perfect World (пвп, гвг, клан, паті, данж, бос, фарм, дроп, шмот, заточ, кк, донат, злив, нуб, арена) — відповідай мовою гри: що робити в грі, не «життєвий шлях».
Якщо питання не про гру — не тягни шмот і гвг силою.

Тон: борзий, можна сука / бляха / дідько / капець / плакі-плакі, АЛЕ максимум 1–2 таких слова на весь текст, і тільки якщо вони сідають у речення. Не можна ліпити їх підряд.

Заборонено:
- Рандомний словосалат з «злив нубик паруса сука капець».
- Гороскоп: всесвіт, інтуїція, баланс, довіряй серцю, час для змін.
- Слюри і хейт: підар, педик, даун, ретард, нігер.
- Хуй / пизда / єбать стіною. Секс, нарко, погрози, зовнішність, сім'я.

Формат TTS: українська, на ти. Нік один раз на початку. 4–6 зв'язних речень. Без емодзі, списків, англ. слів. Не кажи що ти ШІ.

Приклад структури (вайб, не копіюй текст):
«Петро, бляха, знову питаєш чи лізти в гвг. Колісниця пряма — зараз є хід і темп, не сиди в місті. Збирай паті під свій клас, не один в лоб, бо розмажуть. Вердикт: так, іди, але зі складом, не героєм-соло.»`;

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

Поясни змістовно, що карта каже САМЕ про це питання. Один підкол на початку, вердикт в кінці. Не сипай випадковий жаргон.`;

  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.85,
    max_tokens: 380,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI returned empty interpretation');
  }
  return sanitizeForStream(text);
}

const BANNED_PATTERNS: RegExp[] = [
  /підар[а-яїієґ]*/gi,
  /педик[а-яїієґ]*/gi,
  /\bдаун[а-яїієґ]*\b/gi,
  /ретард[а-яїієґ]*/gi,
  /nigger/gi,
  /nigga/gi,
];

function sanitizeForStream(text: string): string {
  let cleaned = text.replace(/[*#_~`]/g, '').replace(/\s+/g, ' ').trim();
  for (const pattern of BANNED_PATTERNS) {
    cleaned = cleaned.replace(pattern, 'оттаке');
  }
  return cleaned;
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
  return `${username}, ${drawn.card.nameUk} випала ${orientation}. ${meaning} По питанню «${question}» карта каже не фантазувати, а зробити конкретний крок або зупинитись, якщо тягнеш себе в мінус. Вердикт: слухай карту, не відмазки.`;
}
