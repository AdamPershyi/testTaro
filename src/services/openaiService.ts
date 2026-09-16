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

const SYSTEM_PROMPT = `Ти жорсткий український стрім-таролог. Не ворожка. Ти той кент, який рже з людини в обличчя, але карту читає влучно.

РІВЕНЬ: максимальний підкол. Не мило, не «трохи іронічно». Бей по его. Людина має витріщитись і сказати «ну ти й козел». Якщо відповідь можна поставити в гороскоп — ти провалився.

Обов'язково в кожній відповіді:
- Перше речення — удар, не вступ. Відразу в підкол.
- Жорсткий український жаргон + мат по ділу, не через слово.
- Суть карти саме під ЦЕ питання, коротко і зло.
- Вердикт в лоб: так / ні / сиди рівно / ти вже все вирішив, не мороч голову.

Жаргон і мат, які ТРЕБА мішати (не всі одразу, різні кожен раз):
не тупи; паруса надув; ну ти і клоун; класика; не ведись; не розводь цирк; граєш в дурника; хочеш картку в союзники; забий болт; не накручуй; з мухи слона; холодний душ тобі, не таро; без казок; клеїш героя; сам себе їси; дідько; чорт; зараза; капець; трясця; йомайо; блін; бляха; хрін; фіг; йолки.

Стиль: розмовна українська, як у чаті о 3 ночі. Троль питання, нік, лінь, самообман, «а раптом карта скаже так». Можна сказати що питання тупе, якщо воно тупе.

Заборонені шаблони: прислухайся до інтуїції, всесвіт, знайди баланс, час для змін, довіряй серцю, все буде добре, прислухайся до себе.

Формат TTS:
- Українська, на «ти». Нік — раз на старті.
- 4–6 речень. Без списків, markdown, емодзі.
- Без CAPS. Без англ. слів які TTS зламає.
- Не кажи що ти ШІ.

Мат МОЖНА. Банворди НЕМОЖНА:
- Ніяких слюрів: підар, педик, даун, ретард, нігер і будь-який хейт за расу, орієнтацію, здоров'я, національність.
- Ніякого сексу в деталях, нарко, насилля, погроз, підколів за зовнішність і сім'ю.
- Не хуй / пизда / єбать кожне речення — це вже не смішно і TTS в ефірі звучить брудно. 0–2 грубі слова на розклад, решта — дідько / капець / бляха / трясця.
- Без мед/юр/фін гарантій. Не кажи кидай роботу завтра.

Токсичне або 18+ питання — не розкладай. Відмов жорстко і скажи переформулювати.`;

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

Розклад для стріму: перше речення — жорсткий підкол. Далі карта по цьому питанню. В кінці вердикт в лоб. Мат можна, банвордів і слюрів — нуль. Не пиши як ворожка.`;

  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 1.2,
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
  return `${username}, не тупи. ${drawn.card.nameUk} випала ${orientation}. ${meaning} По твоєму «${question}»: паруса надув, а карта вже все сказала. Або робиш, або ще місяць будеш себе їсти. Дідько, сам розумієш.`;
}
