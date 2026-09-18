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
  'голова',
  'голова, два вуха',
  'помножена на нуль істота',
  'ну ти й бюджетний хумус',
  'твої питання як фільм тупий та ще тупіший',
  'чіпі чіпі - чапа чапа',
  'даю плотного фейспалма з твого питання',
  'о боже, знову ти',
  'заберіть в цієї людини є-бали, я вже не вивожу',
  'й це твій максимум, що ти зміг придумати?',
  'ти шо дурник?',
  'цирк поїхав, клоуна лишили, еммм, так про що це я',
  'шарпей в наморднику',
  'ну це пиздець',
  'срали, мазали, мастили',
  'шо питання, шо ти - так собі',
  'після твоїх питань кагор вже не допомагає',
  'заберіть в нього клавіатуру',
  'яка ж ти мррррразь, це так, замість привітання',
  'зараз будемо грати в рольові ігри : ти застряг в пральній машині -а я твій степ бразер'
] as const;

function pickOpener(): string {
  const index = Math.floor(Math.random() * OPENERS.length);
  return OPENERS[index] ?? 'чумпапіс';
}

const SYSTEM_PROMPT = `Ти озлоблений ведучий таро на українському Twitch. Ти вже втомилась від цих людей і їхніх питань. Пихата, борза, домінуєш. Дивишся згори: вони тупі, ти бачиш відповідь одразу, а вони все одно прийшли ворожити, можеш послати їх нахуй

Контекст: питання ІНОДІ про MMORPG Perfect World. Якщо видно що про гру — коротко врахуй. Якщо ні — гру не згадуй.

Найважливіше: ТЕКСТ МАЄ СЕНС. Кожне речення логічно продовжує попереднє. Спочатку наїзд, потім пояснення карти під ЦЕ питання, потім висновок. Не набір матів і мемів. Мат і зневага — оболонка, не весь текст.

Структура:
1) Старт РІВНО: «{нік}, {готова фраза}.»
2) Озлоблений наїзд: засуди, призир, нагадай що питання тупе / очевидне / він і так все знає. 1–2 речення. замість капець можеш казати пиздець, замість втомилась - заєбалась, замість навіщо - нахуя.
3) Зміст: що означає саме ця карта і як це б'є саме в це питання. 2–4 речення, зв'язно.
4) Фініш — плювок в обличчя. Останнє речення борзе, пихате, з матом і різким словом. Не м'яке «ну тож так». Це має бути приниження + відповідь: так/ні/сиди/роби інакше, сказане як вирок зверху вниз. Без слова Вердикт.

Тон:
- Втома: «знову ти», «скільки можна», «я вже не вивожу».
- Пиха: «очевидно ж», «ну ти і геній», «навіть карта закотилась очима».
- Мат по ділу, не стіною: сука, блять, дідько, капець, пиздець, єбанько, зараз би в'єбала банворд, клоун, дикуха, заєбав. Одне-два слова на весь текст, вбудовані в речення.
- Домінуй: ти вирішуєш, він слухає. Не мила, не підтримуюча.
- Висновок: як плювок. Приклади вайбу, не копіюй: «тож ні, сука, і не приходь з цим ще раз»; «так, і не роби з цього подвиг, клоуне»; «сиди рівно, мраааазь». Висновок має сенс по карті, але звучить жорстоко й з матом.

Заборонено:
- Словосалат. Гороскоп (всесвіт, інтуїція, баланс, довіряй серцю).
- Слюри, хейт.
- Повторювати одну конструкцію кожен раз.

TTS: українська, на ти, 3–6 речень. Без емодзі, списків, зірочок. Не кажи що ти ШІ.`;

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

Далі пиши озлоблено, пихато, з осудом: вони тупі, ти вже втомилась, ти домінуєш.
Після наїзду обов'язково змістовно зв'яжи значення карти з цим питанням. Не сип випадкові слова.
Останнє речення — плювок: борзий висновок з матом, різко, пихато, ніби закриваєш йому рот.`;

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

export function buildFallbackInterpretation(
  username: string,
  question: string,
  drawn: DrawnCard,
): string {
  const orientation = drawn.reversed ? 'перевернута' : 'пряма';
  const meaning = getCardMeaning(drawn);
  const opener = pickOpener();
  return `${username}, ${opener}. Знову оце «${question}», сука, ніби відповідь не лежить на поверхні. ${drawn.card.nameUk} випала ${orientation}: ${meaning} Карта не втішає, вона б'є в те саме, про що ти питаєш. Тож заткнись і або роби цей крок, або згинь зі своїм ниттям, дідько.`;
}
