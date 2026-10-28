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
  { id: 'cor-red', nome: 'Red Tiger', valor: 'red', custo: 3, cor: '#ef4444' },
  { id: 'cor-green', nome: 'Green Tiger', valor: 'green', custo: 3, cor: '#22c55e' },
  { id: 'cor-obsidian', nome: 'Obsidian (MW2019)', valor: 'obsidian', custo: 17, cor: '#334155' },
  { id: 'cor-pink', nome: 'Rosa', valor: 'pink', custo: 4, cor: '#ec4899' },
  { id: 'cor-cyan', nome: 'Ciano', valor: 'cyan', custo: 4, cor: '#22d3ee' },
  { id: 'cor-gold', nome: 'Gold (BO1)', valor: 'gold', custo: 5, cor: '#f59e0b' },
  { id: 'cor-damascus', nome: 'Damascus (MW19)', valor: 'damascus', custo: 6, cor: '#60a5fa' },
  { id: 'cor-interstellar', nome: 'Interstellar', valor: 'interstellar', custo: 17, cor: '#818cf8' },
  { id: 'cor-darkmatter', nome: 'Dark Matter', valor: 'darkmatter', custo: 8, cor: '#a855f7' },
  { id: 'cor-platinum', nome: 'Platinum', valor: 'platinum', custo: 8, cor: '#cbd5e1' },
  { id: 'cor-diamond', nome: 'Diamond (BO2)', valor: 'diamond', custo: 9, cor: '#fde68a' },
  { id: 'cor-chrome', nome: 'Chrome', valor: 'chrome', custo: 10, cor: '#e5e7eb' },
  { id: 'cor-rainbow', nome: 'Dark Aether', valor: 'rainbow', custo: 17, cor: '#c084fc' },
];

/* Camuflagens: textura real aplicada às letras (background-clip: text).
   O `valor` coincide com o nome do SVG em client/public/camo/ e com a
   classe .nome-cor-<valor> em index.css. */
const CAMOS = [
  { id: 'camo-gold', nome: 'Gold Camuflado', valor: 'camo-gold', custo: 6, cor: '#f5c542' },
  { id: 'camo-diamond', nome: 'Diamond Camuflado', valor: 'camo-diamond', custo: 10, cor: '#fde68a' },
  { id: 'camo-damascus', nome: 'Damascus Camuflado', valor: 'camo-damascus', custo: 7, cor: '#60a5fa' },
  { id: 'camo-darkmatter', nome: 'Dark Matter Camuflado', valor: 'camo-darkmatter', custo: 9, cor: '#a855f7' },
  { id: 'camo-interstellar', nome: 'Interstellar Camuflado', valor: 'camo-interstellar', custo: 8, cor: '#818cf8' },
  { id: 'camo-chrome', nome: 'Chrome Camuflado', valor: 'camo-chrome', custo: 11, cor: '#e5e7eb' },
  { id: 'camo-platinum', nome: 'Platinum Camuflado', valor: 'camo-platinum', custo: 9, cor: '#cbd5e1' },
  { id: 'camo-obsidian', nome: 'Obsidian Camuflado', valor: 'camo-obsidian', custo: 5, cor: '#334155' },
  { id: 'camo-redtiger', nome: 'Red Tiger Camuflado', valor: 'camo-redtiger', custo: 4, cor: '#ef4444' },
  { id: 'camo-greentiger', nome: 'Green Tiger Camuflado', valor: 'camo-greentiger', custo: 4, cor: '#22c55e' },
  { id: 'camo-digital', nome: 'Digital Camuflado', valor: 'camo-digital', custo: 4, cor: '#6b7f3a' },
  { id: 'camo-hex', nome: 'Hex Camuflado', valor: 'camo-hex', custo: 5, cor: '#f5c542' },
  { id: 'camo-woodland', nome: 'Woodland Camuflado', valor: 'camo-woodland', custo: 4, cor: '#3f5e2a' },
  { id: 'camo-desert', nome: 'Desert Camuflado', valor: 'camo-desert', custo: 4, cor: '#b08a55' },
  { id: 'camo-urban', nome: 'Urban Camuflado', valor: 'camo-urban', custo: 4, cor: '#6b6b6b' },
  { id: 'camo-neon', nome: 'Neon Camuflado', valor: 'camo-neon', custo: 7, cor: '#e879f9' },
  { id: 'camo-zebra', nome: 'Zebra Camuflado', valor: 'camo-zebra', custo: 5, cor: '#f5f5f5' },
  { id: 'camo-blue', nome: 'Azul Camuflado', valor: 'camo-blue', custo: 4, cor: '#3aa0d8' },
  { id: 'camo-red', nome: 'Vermelho Camuflado', valor: 'camo-red', custo: 4, cor: '#b91c1c' },
  { id: 'camo-purple', nome: 'Roxo Camuflado', valor: 'camo-purple', custo: 4, cor: '#a855f7' },
].map((x) => ({ ...x, textura: true }));

/* Cartas de perfil — mudam o estilo do cartão do perfil. */
const CARTAS = [
  { id: 'carta-license', nome: 'Carta Aimer License', valor: 'license', custo: 12, cor: '#e4e4e7' },
  { id: 'carta-kova', nome: 'Carta Kova', valor: 'kova', custo: 12, cor: '#a1a1aa' },
  { id: 'carta-neon', nome: 'Carta Neon', valor: 'neon', custo: 12, cor: '#e879f9' },
  { id: 'carta-dvd', nome: 'Carta Red DVD', valor: 'dvd', custo: 15, cor: '#ff4d4d' },
  { id: 'carta-felony', nome: 'Carta Felony', valor: 'felony', custo: 15, cor: '#c084fc' },
  { id: 'carta-blood', nome: 'Carta Blood', valor: 'blood', custo: 15, cor: '#ff3b3b' },
  { id: 'carta-cosmic', nome: 'Carta Cosmic', valor: 'cosmic', custo: 15, cor: '#60a5fa' },
  { id: 'carta-crimson', nome: 'Carta Crimson', valor: 'crimson', custo: 15, cor: '#ef4444' },
  { id: 'carta-violet', nome: 'Carta Violet', valor: 'violet', custo: 15, cor: '#c084fc' },
];

/* Estilos de perfil — mudam o design da página de perfil.
   Ainda estão "Em breve": aparecem na loja mas não podem ser comprados. */
const ESTILOS = [
  { id: 'estilo-felony', nome: 'Estilo Felony', valor: 'felony', custo: 18, cor: '#f5f5f5', emBreve: true },
  { id: 'estilo-neon', nome: 'Estilo Neon', valor: 'neon', custo: 18, cor: '#e879f9', emBreve: true },
  { id: 'estilo-blood', nome: 'Estilo Blood', valor: 'blood', custo: 18, cor: '#ff2d2d', emBreve: true },
  { id: 'estilo-cosmic', nome: 'Estilo Cosmic', valor: 'cosmic', custo: 18, cor: '#60a5fa', emBreve: true },
  { id: 'estilo-crimson', nome: 'Estilo Crimson', valor: 'crimson', custo: 18, cor: '#ef4444', emBreve: true },
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
