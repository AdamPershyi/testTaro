import type { DrawnCard } from '../types/index';

export type ReadingGag =
  | 'none'
  | 'denied'
  | 'dirty-ace'
  | 'gnomes'
  | 'nice-try';

const GAG_CHANCE = 0.1;

export function pickReadingGag(): ReadingGag {
  const roll = Math.random();
  if (roll < GAG_CHANCE) {
    return 'denied';
  }
  if (roll < GAG_CHANCE * 2) {
    return 'dirty-ace';
  }
  if (roll < GAG_CHANCE * 3) {
    return 'gnomes';
  }
  if (roll < GAG_CHANCE * 4) {
    return 'nice-try';
  }
  return 'none';
}

function cardLine(drawn: DrawnCard): string {
  const orientation = drawn.reversed ? 'перевернута' : 'пряма';
  return `${drawn.card.nameUk}, ${orientation}`;
}

export function buildGagInterpretation(
  username: string,
  drawn: DrawnCard,
  gag: Exclude<ReadingGag, 'none'>,
): string {
  const card = cardLine(drawn);

  switch (gag) {
    case 'denied':
      return `${username}. Зачинено на переоблік. Ти сьогодні себе погано поводиш, відповіді не буде. Шо ти, плакі плакі тепер, так?`;
    case 'dirty-ace':
      return `${username}. Тобі випала карта ${card}. А краще б продірявили туз. На відповідь можеш не чекати.`;
    case 'gnomes':
      return `${username}. Тобі випала карта ${card}. Але з гномами я не співпрацюю. Шапка в двері.`;
    case 'nice-try':
      return `${username}. Тобі випала карта ${card}. Але мені похуй. Найс трай.`;
  }
}
