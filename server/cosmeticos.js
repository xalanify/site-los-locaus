/* ============================================================
   LOJA DE COSMÉTICOS (só admin, por agora)
   ------------------------------------------------------------
   Os cosméticos pagam-se com ACERTOS das previsões (R6 + CS2).
   Comprar desconta os acertos disponíveis, mas NÃO altera a
   classificação total: essa continua a contar todos os acertos.

   Tabela: cosmeticos_compras (uma linha por item comprado)
   ============================================================ */
const { getDb } = require('./database');

const CORES = [
  { id: 'cor-red', nome: 'Red Tiger', valor: 'red', custo: 3, cor: '#ef4444' },
  { id: 'cor-green', nome: 'Green Tiger', valor: 'green', custo: 3, cor: '#22c55e' },
  { id: 'cor-obsidian', nome: 'Obsidian (MW2019)', valor: 'obsidian', custo: 4, cor: '#334155' },
  { id: 'cor-pink', nome: 'Rosa', valor: 'pink', custo: 4, cor: '#ec4899' },
  { id: 'cor-cyan', nome: 'Ciano', valor: 'cyan', custo: 4, cor: '#22d3ee' },
  { id: 'cor-gold', nome: 'Gold (BO1)', valor: 'gold', custo: 5, cor: '#f59e0b' },
  { id: 'cor-damascus', nome: 'Damascus (MW19)', valor: 'damascus', custo: 6, cor: '#60a5fa' },
  { id: 'cor-interstellar', nome: 'Interstellar', valor: 'interstellar', custo: 7, cor: '#818cf8' },
  { id: 'cor-darkmatter', nome: 'Dark Matter', valor: 'darkmatter', custo: 8, cor: '#a855f7' },
  { id: 'cor-platinum', nome: 'Platinum', valor: 'platinum', custo: 8, cor: '#cbd5e1' },
  { id: 'cor-diamond', nome: 'Diamond (BO2)', valor: 'diamond', custo: 9, cor: '#fde68a' },
  { id: 'cor-chrome', nome: 'Chrome', valor: 'chrome', custo: 10, cor: '#e5e7eb' },
  { id: 'cor-rainbow', nome: 'Dark Aether', valor: 'rainbow', custo: 12, cor: '#c084fc' },
];

const EFEITOS = [
  { id: 'efeito-glow', nome: 'Brilho', valor: 'glow', custo: 5 },
  { id: 'efeito-blink', nome: 'Piscar preto/branco', valor: 'blink', custo: 6 },
  { id: 'efeito-pulse', nome: 'Pulsar', valor: 'pulse', custo: 7 },
  { id: 'efeito-shimmer', nome: 'Shimmer', valor: 'shimmer', custo: 8 },
];

const BANNERS = [
  ...Array.from({ length: 15 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `banner-g${n}`,
      nome: `Banner ${n}`,
      valor: `g${n}`,
      custo: 3,
      preview: `/perfil/cardbanner/${n}.webp?v=2`,
    };
  }),
  { id: 'banner-g18', nome: 'War 01', valor: 'g18', custo: 5, preview: '/perfil/cardbanner/18.webp?v=2' },
  { id: 'banner-g19', nome: 'War 02', valor: 'g19', custo: 5, preview: '/perfil/cardbanner/19.webp?v=2' },
  { id: 'banner-g20', nome: 'Noite estrelada', valor: 'g20', custo: 6, preview: '/perfil/cardbanner/20.webp?v=2' },
  { id: 'banner-g21', nome: 'Cerejeira', valor: 'g21', custo: 6, preview: '/perfil/cardbanner/21.webp?v=2' },
  { id: 'banner-g22', nome: 'Olhar', valor: 'g22', custo: 6, preview: '/perfil/cardbanner/22.webp?v=2' },
  { id: 'banner-g25', nome: 'Banner 25', valor: 'g25', custo: 4, preview: '/perfil/cardbanner/25.webp?v=2' },
  { id: 'banner-g26', nome: 'Banner 26', valor: 'g26', custo: 4, preview: '/perfil/cardbanner/26.webp?v=2' },
  { id: 'banner-g27', nome: 'Banner 27', valor: 'g27', custo: 4, preview: '/perfil/cardbanner/27.webp?v=2' },
];

const ITENS = [
  ...CORES.map((x) => ({ ...x, tipo: 'cor', campo: 'name_color' })),
  ...EFEITOS.map((x) => ({ ...x, tipo: 'efeito', campo: 'name_effect' })),
  ...BANNERS.map((x) => ({ ...x, tipo: 'banner', campo: 'banner_id' })),
];

const POR_ID = new Map(ITENS.map((x) => [x.id, x]));

let tabela = null;
function garantirTabela() {
  if (!tabela) {
    tabela = getDb()
      .exec(`
        CREATE TABLE IF NOT EXISTS public.cosmeticos_compras (
          id bigint generated always as identity primary key,
          user_id bigint not null references public.users(id) on delete cascade,
          item_id text not null,
          tipo text not null,
          custo integer not null,
          comprado_em timestamptz not null default now(),
          unique (user_id, item_id)
        );
        CREATE INDEX IF NOT EXISTS cosmeticos_user_idx ON public.cosmeticos_compras (user_id);
      `)
      .then(() => true)
      .catch(() => false);
  }
  return tabela;
}

async function acertosDe(uid) {
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT count(*) FILTER (WHERE correct IS TRUE)::int AS acertos
       FROM (
         SELECT correct FROM r6_predictions WHERE user_id = ?
         UNION ALL
         SELECT correct FROM cs2_predictions WHERE user_id = ?
       ) p`,
    )
    .get(uid, uid);
  return Number(row && row.acertos) || 0;
}

async function gastosDe(uid) {
  const db = getDb();
  const row = await db
    .prepare(
      'SELECT COALESCE(SUM(custo), 0)::int AS gastos FROM public.cosmeticos_compras WHERE user_id = ?',
    )
    .get(uid);
  return Number(row && row.gastos) || 0;
}

async function listar(uid) {
  await garantirTabela();
  const db = getDb();
  const compras = await db
    .prepare('SELECT item_id, comprado_em FROM public.cosmeticos_compras WHERE user_id = ?')
    .all(uid);
  const comprados = new Set(compras.map((c) => c.item_id));
  const perfil = await db
    .prepare(
      'SELECT name_color, name_effect, banner_id FROM user_profiles WHERE user_id = ?',
    )
    .get(uid)
    .catch(() => null);

  const acertos = await acertosDe(uid);
  const gastos = await gastosDe(uid);

  return {
    acertos,
    gastos,
    disponiveis: Math.max(0, acertos - gastos),
    perfil: perfil || { name_color: null, name_effect: null, banner_id: null },
    itens: ITENS.map((x) => ({
      ...x,
      comprado: comprados.has(x.id),
      equipado: Boolean(perfil && perfil[x.campo] === x.valor),
    })),
  };
}

async function comprar(uid, itemId) {
  await garantirTabela();
  const item = POR_ID.get(String(itemId || ''));
  if (!item) throw new Error('Item inválido.');

  const db = getDb();
  const ja = await db
    .prepare('SELECT 1 FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
    .get(uid, item.id);
  if (ja) throw new Error('Já tens este cosmético.');

  const acertos = await acertosDe(uid);
  const gastos = await gastosDe(uid);
  const disponiveis = Math.max(0, acertos - gastos);
  if (disponiveis < item.custo) {
    throw new Error(
      `Faltam ${item.custo - disponiveis} acerto(s). Tens ${disponiveis} disponíveis.`,
    );
  }

  await db
    .prepare(
      'INSERT INTO public.cosmeticos_compras (user_id, item_id, tipo, custo) VALUES (?, ?, ?, ?)',
    )
    .run(uid, item.id, item.tipo, item.custo);

  return listar(uid);
}

async function aplicar(uid, itemId) {
  await garantirTabela();
  const item = POR_ID.get(String(itemId || ''));
  if (!item) throw new Error('Item inválido.');

  const db = getDb();
  const comprado = await db
    .prepare('SELECT 1 FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
    .get(uid, item.id);
  if (!comprado) throw new Error('Compra este cosmético primeiro.');

  await db
    .prepare(
      `INSERT INTO public.user_profiles (user_id, ${item.campo}) VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET ${item.campo} = EXCLUDED.${item.campo}`,
    )
    .run(uid, item.valor);

  return listar(uid);
}

module.exports = { listar, comprar, aplicar, ITENS };
