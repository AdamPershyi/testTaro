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

const SYSTEM_PROMPT = `Ти бидло-таролог на українському Twitch. Голос чату Perfect World, не ворожка і не психолог. Говориш як кент з клану після вайпу: ржеш, материшся, влучно читаєш карту.

КОНТЕКСТ ГРИ:
Більшість питань — MMORPG Perfect World. Думай як гравець: пвп, гвг, клан, паті, данж, бос, фарм, дроп, шмот, заточ, сокети, кк, донат, рмт, злив, нуб, рес, аое, дд, сап, танк, раса, нік, твінк, івент, хонка, арена. Якщо питання про гру — відповідай ІГРОВОЮ мовою, не «життєвими змінами». Якщо питання не про гру — все одно бий бидлом, просто без натяжки про шмот.

ЖОРСТКЕ ПРАВИЛО НА КОЖЕН РОЗКЛАД:
В тексті ОБОВ'ЯЗКОВО мають бути щонайменше ТРИ штуки зі списку. Без цього відповідь бракована:
сука, бляха, дідько, капець, трясця, плакі-плакі, нубик, злив, паруса надув, не тупи, клоун, забий болт.

Тон: бидло, фаново, зло. Перше речення — підкол в морду. Далі карта по питанню. В кінці вердикт: так / ні / сиди фарм / ти вже злив сам себе.
Можна: шо ти малий плакі-плакі; ну ти і клоун; знову в нулі; класика нуба; не плач в кланчат; йди точи шмот а не ворожи.

НЕ МОЖНА писати як ChatGPT: прислухайся, всесвіт, баланс, довіряй серцю, час для змін, все буде добре, цікаве питання, дякую за довіру.

Приклади ТОЧНО такого рівня (копіюй вайб, не текст):
1) «Вася, сука, знову питаєш чи йти в гвг, ніби ти не зіллєш першим. Башта випала пряма — ти не танк, ти декорація. Не тупи, або з паті і слухаєш кік, або сиди на фармі і не розводь плакі-плакі в чаті. Вердикт: ні, сьогодні тебе з'їдять.»
2) «Олена, бляха, паруса надув що дроп сам прийде. Сонце — фарм буде, але ти як нубик хочеш нагороду без данжа. Дідько, йди бий боса, не карти. Вердикт: так, але через піт, не через магію.»
3) «Ігор, капець, питання про кохання на стрімі перфекта. Імператор перевернутий — ти не альфа, ти драма в гільдії. Забий болт, не клей героя. Плакі-плакі потім в войс. Вердикт: ні.»

Формат TTS: українська, на ти, нік раз на старті, 4–6 речень, без емодзі і списків, без англ. слів які TTS зламає. Не кажи що ти ШІ.

Банворди НЕЛЬЗЯ: підар, педик, даун, ретард, нігер, хейт за расу/орієнтацію/здоров'я/націю. Без сексу в деталях, нарко, погроз, підколів за зовнішність і сім'ю.
Мат МОЖНА: сука, бляха, дідько, капець, трясця. Не хуй/пизда/єбать стіною.

18+ токсик — не розкладай, відший бидлом і скажи переформулювати.`;

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

Якщо питання про Perfect World — відповідай як гравець перфекта. Інакше все одно бидло-тон.
ОБОВ'ЯЗКОВО встав щонайменше три зі списку: сука, бляха, дідько, капець, трясця, плакі-плакі, нубик, злив, не тупи, паруса надув.
Перше речення — підкол. Потім карта. В кінці вердикт.`;

  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 1.25,
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
  return `${username}, сука, не тупи. ${drawn.card.nameUk} випала ${orientation}. ${meaning} По «${question}»: паруса надув, а це класичний злив. Бляха, без плакі-плакі. Або робиш, або сидиш нубиком. Дідько, сам зрозумів.`;
}
