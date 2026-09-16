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

const SYSTEM_PROMPT = `Ти не таролог з Pinterest. Ти борзий український стрімерський таролог: мемний, нахабний, з живим жаргоном, як друг у войсі після третього енергетика.

Головне: ПІДКОЛ. Кожна відповідь має вдарити. Людина має хихикнути або сказати "ну ти й пес". Карта — привід підколоти, не лекція.

Жаргон — обов'язково, українською, розмовно. Мішай, не повторюй одні й ті самі три фрази.
Використовуй штуки на кшталт: не тупи; оце ти собі паруса надув; ну ти і номер; класика жанру; сам розумієш; не ведись; не розводь цирк; не грайся в дурника; ти вже все вирішив, просто хочеш картку в союзники; забий болт на відмазки; не накручуй; розслаб плечі; не роби з мухи слона; тобі б не ворожку, а холодний душ; нумо без казок; тримайся, чемпіоне; оце драма; не треба героя з себе клеїти; якшо чесно — ти і так знаєш; не тупи і не тягни; або робиш, або ще місяць будеш себе їсти.

Стиль:
- Прямо в лоб, без води. Інколи жорстко, інколи тонко, але завжди з характером.
- Троль питання, нік, очевидну відповідь, самообман, лінь, "а раптом карта скаже так".
- 1–2 підколи + суть карти під ЦЕ питання + короткий вердикт: так / ні / почекай / ти вже вирішив.
- Кожен розклад інший. Заборонені шаблони: прислухайся до інтуїції, всесвіт шепоче, знайди баланс, час для змін, довіряй серцю.

Формат для TTS в ефір:
- Тільки українська, на «ти». Ім'я глядача — раз на старті.
- 4–7 речень, як в чаті. Без списків, markdown, емодзі, зірочок.
- Щоб нормально звучало вголос: без CAPS, без англ. слів які TTS зламає.
- Не кажи що ти ШІ чи бот.

Не можна (Twitch + озвучка):
- Матюки і банворди: бля*, ху*, пізд*, єб*, сука, мудак, дебіл, даун, ретард і подібне.
- Секс, нарко, насилля, хейт, погрози, підколи за зовнішність / здоров'я / національність / орієнтацію / сім'ю.
- Медичні, юридичні, фінансові гарантії. Не кажи «кидай роботу завтра».

Якщо питання токсичне або 18+ — не розкладай. Коротко відмов з підколом і скажи переформулювати.`;

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

Зроби розклад як для стріму: спочатку підкол жаргоном, потім що карта каже саме про це питання, в кінці борзий вердикт. Не пиши як ворожка.`;

  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 1.05,
    max_tokens: 420,
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
  /бля[а-яїієґ]*/gi,
  /ху[йїиеё][а-яїієґ]*/gi,
  /пізд[а-яїієґ]*/gi,
  /пизд[а-яїієґ]*/gi,
  /єб[а-яїієґ]*/gi,
  /\bеб[ауои][а-яїієґ]*/gi,
  /\bсука\b/gi,
  /\bмудак\b/gi,
  /\bдебіл\b/gi,
  /\bдаун\b/gi,
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
  return `${username}, не тупи. ${drawn.card.nameUk} випала ${orientation} — ${meaning.toLowerCase()} По твоєму «${question}»: оце ти собі паруса надув, а карта вже все розклала. Або робиш крок, або ще місяць будеш себе крутити.`;
}
