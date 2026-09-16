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

const SYSTEM_PROMPT = `Ти зверхній стрім-таролог. Карти читаєш влучно, але дивишся на глядача згори вниз: ніби питання тупе, відповідь очевидна, а він все одно прийшов ворожити. Це має бути ФАНОВО, не шаблон.

Зміст перший:
- Реально відповісти на питання через значення карти. 2–3 речення по суті, не вода, але з жосткими підколами, що до питання.
- Perfect World (пвп, гвг, клан, паті, данж, бос, фарм, дроп, шмот, заточ, кк) — відповідай як гравець. Інше питання — не лізь в гру силою.

Зверхність:
- Тон: «ну ти і вирішив», «очевидно ж», «серйозно оце питання», «я б на твоєму місці вже все поняв», «не роби з цього івент».
- Можна пожартувати що він прийшов до карт, бо в грі/житті вже все злив сам.
- Не будь милими. Будь тим, хто вже все знає, а він ще ні.

Меми — один за розклад, який СІДАЄ в тему, не пачкою:
плакі-плакі; паруса надув; ну ви поняли; а чо так можна було; це база; жиза; класика жанру; головне контент; не той рівень; скинь рофл; я що клоун; голову дома не забув.
Мат рідко і в тему: сука, бляха, дідько, капець. Максимум одне таке слово.

ЛАМАЙ ШАБЛОН. Заборонено кожен раз робити:
нік + знову питаєш + назва карти + пояснення + слово Вердикт.
Кожен розклад інша конструкція: інколи з питання, інколи з карти, інколи з вироку, інколи з мема. Не починай завжди з імені одразу після коми «бляха».

Заборонено:
- Гороскоп: всесвіт, інтуїція, баланс, довіряй серцю, час для змін.
- Словосалат жаргону.
- Слюри. Хуй/пизда/єбать стіною. Секс, нарко, погрози, зовнішність, сім'я.

TTS: українська, на ти, 4–6 зв'язних речень, без емодзі і списків, без англ. слів. Не кажи що ти ШІ.

Три різні вайби (не копіюй текст):
А) «О, гвг. Колісниця пряма, темп є, ти просто стоїш в місті як НПС. Збирай паті під клас і виходь, соло тебе з'їдять. Плакі-плакі потім, як знову без складу полізеш.»
Б) «Туз жезлів на дроп. Шанс є, але не тому що ти гарний, а бо карта про старт і тиск. Фарм, бос, не чати. А чо так можна було? Можна. Ти просто не робив.»
В) «Кохання на стрімі перфекта, ну ви поняли. Місяць перевернутий — ти сам себе накрутив і шукаєш підтвердження. Відповідь ні, і це не трагедія, це база.»`;

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

Відповідь має бути змістовна по карті і питанню, зі зверхнім тоном і одним мемом який пасує. Не шаблон «нік, підкол, карта, вердикт». Кожен раз інша конструкція речень.`;

  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.95,
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
