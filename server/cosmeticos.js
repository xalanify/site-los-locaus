/* ============================================================
   LOJA DE COSMÉTICOS (aberta a todos os membros)
   ------------------------------------------------------------
   Os cosméticos pagam-se com ACERTOS das previsões (R6 + CS2).
   Comprar desconta os acertos disponíveis, mas NÃO altera a
   classificação total: essa continua a contar todos os acertos.

   Só há três categorias: cores de nome, cartas e estilos de
   perfil. Os estilos de perfil estão marcados "Em breve" e ainda
   não podem ser comprados.

   Tabela: cosmeticos_compras (uma linha por item comprado)
   ============================================================ */
const { getDb } = require('./database');

const CORES = [
  { id: 'cor-red', nome: 'Red Tiger', valor: 'red', custo: 7, cor: '#ef4444' },
  { id: 'cor-green', nome: 'Green Tiger', valor: 'green', custo: 8, cor: '#22c55e' },
  { id: 'cor-obsidian', nome: 'Obsidian (MW2019)', valor: 'obsidian', custo: 26, cor: '#334155' },
  { id: 'cor-pink', nome: 'Rosa', valor: 'pink', custo: 9, cor: '#ec4899' },
  { id: 'cor-cyan', nome: 'Ciano', valor: 'cyan', custo: 10, cor: '#22d3ee' },
  { id: 'cor-gold', nome: 'Gold (BO1)', valor: 'gold', custo: 38, cor: '#f59e0b' },
  { id: 'cor-damascus', nome: 'Damascus (MW19)', valor: 'damascus', custo: 22, cor: '#60a5fa' },
  { id: 'cor-interstellar', nome: 'Interstellar', valor: 'interstellar', custo: 32, cor: '#818cf8' },
  { id: 'cor-darkmatter', nome: 'Dark Matter', valor: 'darkmatter', custo: 24, cor: '#a855f7' },
  { id: 'cor-platinum', nome: 'Platinum', valor: 'platinum', custo: 20, cor: '#cbd5e1' },
  { id: 'cor-diamond', nome: 'Diamond (BO2)', valor: 'diamond', custo: 28, cor: '#fde68a' },
  { id: 'cor-chrome', nome: 'Chrome', valor: 'chrome', custo: 25, cor: '#e5e7eb' },
  { id: 'cor-rainbow', nome: 'Dark Aether', valor: 'rainbow', custo: 34, cor: '#c084fc' },
];

/* Camuflagens: textura real aplicada às letras (background-clip: text).
   O `valor` coincide com o nome do SVG em client/public/camo/ e com a
   classe .nome-cor-<valor> em index.css. */
const CAMOS = [
  { id: 'camo-gold', nome: 'Gold Camuflado', valor: 'camo-gold', custo: 39, cor: '#f5c542' },
  { id: 'camo-diamond', nome: 'Diamond Camuflado', valor: 'camo-diamond', custo: 33, cor: '#fde68a' },
  { id: 'camo-damascus', nome: 'Damascus Camuflado', valor: 'camo-damascus', custo: 23, cor: '#60a5fa' },
  { id: 'camo-darkmatter', nome: 'Dark Matter Camuflado', valor: 'camo-darkmatter', custo: 27, cor: '#a855f7' },
  { id: 'camo-interstellar', nome: 'Interstellar Camuflado', valor: 'camo-interstellar', custo: 31, cor: '#818cf8' },
  { id: 'camo-chrome', nome: 'Chrome Camuflado', valor: 'camo-chrome', custo: 35, cor: '#e5e7eb' },
  { id: 'camo-platinum', nome: 'Platinum Camuflado', valor: 'camo-platinum', custo: 21, cor: '#cbd5e1' },
  { id: 'camo-obsidian', nome: 'Obsidian Camuflado', valor: 'camo-obsidian', custo: 19, cor: '#334155' },
  { id: 'camo-redtiger', nome: 'Red Tiger Camuflado', valor: 'camo-redtiger', custo: 12, cor: '#ef4444' },
  { id: 'camo-greentiger', nome: 'Green Tiger Camuflado', valor: 'camo-greentiger', custo: 13, cor: '#22c55e' },
  { id: 'camo-digital', nome: 'Digital Camuflado', valor: 'camo-digital', custo: 14, cor: '#6b7f3a' },
  { id: 'camo-hex', nome: 'Hex Camuflado', valor: 'camo-hex', custo: 15, cor: '#f5c542' },
  { id: 'camo-woodland', nome: 'Woodland Camuflado', valor: 'camo-woodland', custo: 16, cor: '#3f5e2a' },
  { id: 'camo-desert', nome: 'Desert Camuflado', valor: 'camo-desert', custo: 17, cor: '#b08a55' },
  { id: 'camo-urban', nome: 'Urban Camuflado', valor: 'camo-urban', custo: 18, cor: '#6b6b6b' },
  { id: 'camo-neon', nome: 'Neon Camuflado', valor: 'camo-neon', custo: 36, cor: '#e879f9' },
  { id: 'camo-zebra', nome: 'Zebra Camuflado', valor: 'camo-zebra', custo: 37, cor: '#f5f5f5' },
  { id: 'camo-blue', nome: 'Azul Camuflado', valor: 'camo-blue', custo: 30, cor: '#3aa0d8' },
  { id: 'camo-red', nome: 'Vermelho Camuflado', valor: 'camo-red', custo: 29, cor: '#b91c1c' },
  { id: 'camo-purple', nome: 'Roxo Camuflado', valor: 'camo-purple', custo: 40, cor: '#a855f7' },
].map((x) => ({ ...x, textura: true }));

/* Cartas de perfil — mudam o estilo do cartão do perfil. */
const CARTAS = [
  { id: 'carta-license', nome: 'Carta Aimer License', valor: 'license', custo: 50, cor: '#e4e4e7' },
  { id: 'carta-kova', nome: 'Carta Kova', valor: 'kova', custo: 52, cor: '#a1a1aa' },
  { id: 'carta-neon', nome: 'Carta Neon', valor: 'neon', custo: 55, cor: '#e879f9' },
  { id: 'carta-dvd', nome: 'Carta Red DVD', valor: 'dvd', custo: 58, cor: '#ff4d4d' },
  { id: 'carta-felony', nome: 'Carta Felony', valor: 'felony', custo: 60, cor: '#c084fc' },
  { id: 'carta-blood', nome: 'Carta Blood', valor: 'blood', custo: 62, cor: '#ff3b3b' },
  { id: 'carta-cosmic', nome: 'Carta Cosmic', valor: 'cosmic', custo: 65, cor: '#60a5fa' },
  { id: 'carta-crimson', nome: 'Carta Crimson', valor: 'crimson', custo: 68, cor: '#ef4444' },
  { id: 'carta-violet', nome: 'Carta Violet', valor: 'violet', custo: 70, cor: '#c084fc' },
  { id: 'carta-sleepin', nome: 'Carta Sleepin', valor: 'sleepin', custo: 75, cor: '#e4e4e7' },
  { id: 'carta-river', nome: 'Carta River', valor: 'river', custo: 80, cor: '#f9a8d4' },
];

/* Estilos de perfil — mudam o design da página de perfil.
   Ainda estão "Em breve": aparecem na loja mas não podem ser comprados. */
const ESTILOS = [
  { id: 'estilo-felony', nome: 'Estilo Felony', valor: 'felony', custo: 120, cor: '#f5f5f5', emBreve: true },
  { id: 'estilo-neon', nome: 'Estilo Neon', valor: 'neon', custo: 125, cor: '#e879f9', emBreve: true },
  { id: 'estilo-blood', nome: 'Estilo Blood', valor: 'blood', custo: 130, cor: '#ff2d2d', emBreve: true },
  { id: 'estilo-cosmic', nome: 'Estilo Cosmic', valor: 'cosmic', custo: 135, cor: '#60a5fa', emBreve: true },
  { id: 'estilo-crimson', nome: 'Estilo Crimson', valor: 'crimson', custo: 140, cor: '#ef4444', emBreve: true },
  // Coleção nova (7) — aproximações dos layouts de perfil da referência
  { id: 'estilo-m1key', nome: 'Estilo M1KEY', valor: 'm1key', custo: 120, cor: '#ef4444', emBreve: true },
  { id: 'estilo-monarcs', nome: 'Estilo Monarcs', valor: 'monarcs', custo: 122, cor: '#ddd6c8', emBreve: true },
  { id: 'estilo-pyvno', nome: 'Estilo Pyvno', valor: 'pyvno', custo: 126, cor: '#a78bfa', emBreve: true },
  { id: 'estilo-speedy', nome: 'Estilo Speedy', valor: 'speedy', custo: 128, cor: '#facc15', emBreve: true },
  { id: 'estilo-lafayette', nome: 'Estilo Lafayette', valor: 'lafayette', custo: 134, cor: '#d4af37', emBreve: true },
  { id: 'estilo-saowur', nome: 'Estilo Saowur', valor: 'saowur', custo: 136, cor: '#f472b6', emBreve: true },
  { id: 'estilo-kichies', nome: 'Estilo Kichies', valor: 'kichies', custo: 140, cor: '#22c55e', emBreve: true },
];

/* Os banners e os efeitos saíram da loja. Os banners continuam
   disponíveis no editor de perfil; os efeitos já comprados ficam
   guardados na conta, mas deixam de aparecer para compra. */
const ITENS = [
  ...CORES.map((x) => ({ ...x, tipo: 'cor', campo: 'name_color' })),
  ...CAMOS.map((x) => ({ ...x, tipo: 'cor', campo: 'name_color' })),
  ...CARTAS.map((x) => ({ ...x, tipo: 'carta', campo: 'card_style' })),
  ...ESTILOS.map((x) => ({ ...x, tipo: 'estilo', campo: 'profile_style' })),
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
      `SELECT
         COALESCE(SUM(base), 0)::int AS base,
         COALESCE(SUM(payout), 0)::int AS payout,
         COALESCE(SUM(stakes), 0)::int AS stakes
       FROM (
         SELECT
           count(*) FILTER (WHERE correct IS TRUE AND COALESCE(stake, 0) = 0)::int AS base,
           COALESCE(SUM(CASE WHEN correct IS TRUE AND COALESCE(stake, 0) > 0 THEN 2 * stake ELSE 0 END), 0)::int AS payout,
           COALESCE(SUM(COALESCE(stake, 0)), 0)::int AS stakes
         FROM r6_predictions WHERE user_id = ?
         UNION ALL
         SELECT
           count(*) FILTER (WHERE correct IS TRUE AND COALESCE(stake, 0) = 0)::int AS base,
           COALESCE(SUM(CASE WHEN correct IS TRUE AND COALESCE(stake, 0) > 0 THEN 2 * stake ELSE 0 END), 0)::int AS payout,
           COALESCE(SUM(COALESCE(stake, 0)), 0)::int AS stakes
         FROM cs2_predictions WHERE user_id = ?
       ) x`,
    )
    .get(uid, uid);
  const base = Number(row && row.base) || 0;
  const payout = Number(row && row.payout) || 0;
  const stakes = Number(row && row.stakes) || 0;
  return Math.max(0, base + payout - stakes);
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
      'SELECT name_color, name_effect, banner_id, card_style, profile_style FROM user_profiles WHERE user_id = ?',
    )
    .get(uid)
    .catch(() => null);

  const acertos = await acertosDe(uid);
  const gastos = await gastosDe(uid);

  return {
    acertos,
    gastos,
    disponiveis: Math.max(0, acertos - gastos),
    perfil: perfil || {
      name_color: null,
      name_effect: null,
      banner_id: null,
      card_style: 'padrao',
      profile_style: 'padrao',
    },
    itens: [...ITENS]
      .sort((a, b) => a.custo - b.custo || String(a.nome).localeCompare(String(b.nome), 'pt'))
      .map((x) => ({
        ...x,
        comprado: comprados.has(x.id),
        equipado: Boolean(perfil && perfil[x.campo] === x.valor),
      })),
  };
}

/* Saldo de Moedas Locaus (1 acerto = 1 moeda). Igual para a loja e
   para o indicador do site; os acertos continuam a contar na
   classificação — só as moedas é que são gastas. */
async function saldo(uid) {
  await garantirTabela();
  const acertos = await acertosDe(uid);
  const gastos = await gastosDe(uid);
  return { acertos, gastos, disponiveis: Math.max(0, acertos - gastos) };
}

async function comprar(uid, itemId) {
  await garantirTabela();
  const item = POR_ID.get(String(itemId || ''));
  if (!item) throw new Error('Item inválido.');
  if (item.emBreve) throw new Error('Este estilo de perfil chega em breve.');

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
      `Faltam ${item.custo - disponiveis} moeda(s) Locaus. Tens ${disponiveis} disponíveis.`,
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
  if (item.emBreve) throw new Error('Este estilo de perfil chega em breve.');

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

module.exports = { listar, comprar, aplicar, saldo, ITENS };
