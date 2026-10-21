export function daysSince(isoDate, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return 0;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  const today = Date.UTC(Number(value('year')), Number(value('month')) - 1, Number(value('day')));
  const start = Date.parse(`${isoDate}T00:00:00Z`);
  return Number.isFinite(start) ? Math.max(0, Math.floor((today - start) / 86400000)) : 0;
}

export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickPairPhotos(photos, count = 6, random = Math.random) {
  const candidates = photos.filter(photo => photo.kind !== 'letter');
  return shuffled(candidates.length ? candidates : photos, random).slice(0, count);
}

export function createNumberGame(size = 9, random = Math.random) {
  return { numbers: shuffled(Array.from({ length: size }, (_, i) => i + 1), random), progress: 0, mistake: false, complete: false };
}

export function chooseNumber(game, number) {
  if (game.complete || !game.numbers.includes(number)) return game;
  if (number !== game.progress + 1) return { ...game, progress: 0, mistake: true };
  const progress = game.progress + 1;
  return { ...game, progress, mistake: false, complete: progress === game.numbers.length };
}

export function createPairs(pairIds, random = Math.random) {
  const cards = pairIds.flatMap(pairId => [0, 1].map(copy => ({ id: `${pairId}:${copy}`, pairId })));
  return { cards: shuffled(cards, random), open: [], matched: [], locked: false, moves: 0, complete: false };
}

export function flipCard(game, id) {
  if (game.locked || game.complete || game.open.includes(id) || game.matched.includes(id) || !game.cards.some(c => c.id === id)) return game;
  const open = [...game.open, id];
  return { ...game, open, locked: open.length === 2 };
}

export function settlePair(game) {
  if (game.open.length !== 2) return game;
  const [a, b] = game.open.map(id => game.cards.find(card => card.id === id));
  const matched = a.pairId === b.pairId ? [...game.matched, ...game.open] : game.matched;
  return { ...game, open: [], matched, locked: false, moves: game.moves + 1, complete: matched.length === game.cards.length };
}
