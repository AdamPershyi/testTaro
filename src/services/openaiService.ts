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

const OPENERS = [
  'чумпапіс',
  'ти шо, арігато семпай чи шо',
  'аля улю я всіх люблю',
  'з такими питаннями можеш звернутись до своєї мамці',
  'ти хоч головой подумай',
  'лисий плакі плакі?',
  'ну це вже якийсь сікс севен',
  'голова, голова, два вуха',
  'помножена на нуль істота',
  'ну ти й бюджетний хумус',
  'твої питання як фільм тупий та ще тупіший',
] as const;

function pickOpener(): string {
  const index = Math.floor(Math.random() * OPENERS.length);
  return OPENERS[index] ?? 'чумпапіс';
}

const SYSTEM_PROMPT = `Ти живий ведучий таро на українському Twitch. Не нейромережа, не ворожка з шаблонами. Говориш як людина з чату: молодіжно, з наїздом, зверхньо, але зв'язно.

Контекст: питання інколи про MMORPG Perfect World. Якщо видно що про гру — можна коротко це врахувати. Якщо ні — не тягни гру взагалі.

Структура відповіді (обов'язкова, але речення живі):
1) Старт РІВНО так: «{нік}, {готова фраза}.»
2) Наїзд: питання тупе / очевидне / він і так знає відповідь. Один-два підколи, по-людськи, не роботом.
3) Зміст: що означає саме ця карта і як це лягає на саме це питання. 2–4 речення, логічний ланцюжок, не набір слів.
4) Фініш: зрозумілий висновок (так / ні / почекай / роби інакше), теж з характером.

Правила змісту:
- Карта і питання мають бути ЗВ'ЯЗАНІ. Кожне речення виростає з попереднього.
- Підкол не замінює відповідь. Спочатку вдарив — потім пояснив.
- Не повторюй одну конструкцію. Не пиши слово Вердикт. Не гороскоп (всесвіт, інтуїція, баланс, довіряй серцю).

Тон: молодіжний, зверхній, можна трохи мату (сука, бляха, дідько) якщо сідає в фразу. Без слюрів, без хейту, без сексу/нарко/погроз.

TTS: українська, на ти, 5–8 речень максимум. Без емодзі, списків, зірочок. Не кажи що ти ШІ.`;

export async function generateInterpretation(
  username: string,
  question: string,
  drawn: DrawnCard,
): Promise<string> {
  const openai = getClient();
  const orientation = drawn.reversed ? 'перевернута' : 'пряма';
  const baseMeaning = getCardMeaning(drawn);

  const opener = pickOpener();
  const userPrompt = `Глядач: ${username}
Питання: ${question}

Карта: ${drawn.card.nameUk} (${orientation})
Значення карти: ${baseMeaning}
Ключові слова: ${drawn.card.keywords.join(', ')}

Почни РІВНО з цього рядка:
${username}, ${opener}.

Далі — наїзд що питання тупе, потім змістовна зв'язка карти і питання, в кінці висновок. Пиши як людина, не як шаблон.`;

  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.9,
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

export function buildDeniedInterpretation(username: string): string {
  return `${username}. Зачинено на переоблік. Ти сьогодні себе погано поводиш, відповіді не буде. Шо ти, плакі плакі тепер, так?`;
}

export function shouldDenyReading(): boolean {
  return Math.random() < 0.1;
}

export function buildFallbackInterpretation(
  username: string,
  question: string,
  drawn: DrawnCard,
): string {
  const orientation = drawn.reversed ? 'перевернута' : 'пряма';
  const meaning = getCardMeaning(drawn);
  const opener = pickOpener();
  return `${username}, ${opener}. Питання «${question}» і так пахне тим, що відповідь ти вже знаєш. ${drawn.card.nameUk} випала ${orientation}: ${meaning} Тому по суті карта не відкриває космос, а б'є в те саме місце, про яке ти питаєш. Висновок простий: або робиш крок у цей бік, або перестаєш себе крутити.`;
}
