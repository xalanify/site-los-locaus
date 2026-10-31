/* ============================================================
   MERCADO + LOCAUS PACKS
   ------------------------------------------------------------
   O mercado usa os mesmos cosméticos da loja, mas com preço
   variável (sobe e desce como uma moeda), histórico para o
   gráfico e registo das últimas vendas.

   Os packs são dados pelo admin; ao abrir, saem por raridade.
   ============================================================ */
const { getDb } = require('./database');
const cosmeticos = require('./cosmeticos');

const CATALOGO = cosmeticos.ITENS;

const POR_ID = new Map(CATALOGO.map((x) => [x.id, x]));

const RARIDADES = ['comum', 'raro', 'epico', 'lendario'];

const RARIDADE_INFO = {
  comum: { nome: 'Comum', cor: '#a1a1aa' },
  raro: { nome: 'Raro', cor: '#60a5fa' },
  epico: { nome: 'Épico', cor: '#c084fc' },
  lendario: { nome: 'Lendário', cor: '#f5c542' },
};

const raridadeDe = (custo) => {
  const v = Number(custo) || 0;
  if (v < 20) return 'comum';
  if (v < 45) return 'raro';
  if (v < 75) return 'epico';
  return 'lendario';
};

/* Mercado a sério: há spread entre compra e venda e cada negócio
   mexe no preço. Assim não dá para comprar e vender logo a seguir
   para "puxar" o gráfico. */
const SPREAD = 0.02;
const IMPACTO = 0.015;
const COOLDOWN_MS = 10 * 60 * 1000;
const TAXA = 0.03; // 3% de taxa em cada venda

/* Tesouro do mercado: paga as compras automáticas e recebe as taxas. */
async function tesouroSaldo(db) {
  const r = await db
    .prepare('SELECT saldo FROM public.mercado_tesouro WHERE id = 1')
    .get()
    .catch(() => null);
  return Number(r && r.saldo) || 0;
}

async function tesouroAjustar(db, delta) {
  await db
    .prepare('UPDATE public.mercado_tesouro SET saldo = GREATEST(0, saldo + ?::numeric) WHERE id = 1')
    .run(delta)
    .catch(() => {});
}

const arred = (n) => Math.round(Number(n) * 100) / 100;
const precoCompra = (preco) => arred(Number(preco) * (1 + SPREAD));
const precoVenda = (preco) => arred(Number(preco) * (1 - SPREAD));

/* Probabilidades por tipo de pack (ordem: comum, raro, epico, lendario) */
const PESOS = {
  basico: [70, 22, 7, 1],
  epico: [30, 45, 22, 3],
  lendario: [5, 25, 45, 25],
};

let tabelas = null;
function garantirTabelas() {
  if (!tabelas) {
    tabelas = getDb()
      .exec(`
        CREATE TABLE IF NOT EXISTS public.mercado_precos (
          item_id text PRIMARY KEY,
          base numeric NOT NULL,
          preco numeric NOT NULL,
          atualizado_em timestamptz NOT NULL DEFAULT now()
        );
        ALTER TABLE public.mercado_precos ADD COLUMN IF NOT EXISTS tendencia numeric NOT NULL DEFAULT 0;
        CREATE TABLE IF NOT EXISTS public.mercado_historico (
          id bigserial PRIMARY KEY,
          item_id text NOT NULL,
          preco numeric NOT NULL,
          em timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS mercado_hist_idx ON public.mercado_historico (item_id, em DESC);
        CREATE TABLE IF NOT EXISTS public.mercado_vendas (
          id bigserial PRIMARY KEY,
          item_id text NOT NULL,
          user_id bigint,
          preco numeric NOT NULL,
          tipo text NOT NULL,
          em timestamptz NOT NULL DEFAULT now()
        );
        ALTER TABLE public.mercado_vendas ADD COLUMN IF NOT EXISTS contraparte_id bigint;
        CREATE TABLE IF NOT EXISTS public.mercado_anuncios (
          id bigserial PRIMARY KEY,
          user_id bigint NOT NULL,
          item_id text NOT NULL,
          preco numeric NOT NULL,
          estado text NOT NULL DEFAULT 'ativo',
          comprador_id bigint,
          criado_em timestamptz NOT NULL DEFAULT now(),
          vendido_em timestamptz
        );
        CREATE INDEX IF NOT EXISTS mercado_anuncios_item_idx ON public.mercado_anuncios (item_id, estado);
        CREATE INDEX IF NOT EXISTS mercado_vendas_idx ON public.mercado_vendas (em DESC);
        CREATE TABLE IF NOT EXISTS public.mercado_ledger (
          id bigserial PRIMARY KEY,
          user_id bigint NOT NULL,
          valor numeric NOT NULL,
          motivo text,
          em timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS mercado_ledger_idx ON public.mercado_ledger (user_id);
        CREATE TABLE IF NOT EXISTS public.locaus_packs (          id bigserial PRIMARY KEY,
          user_id bigint NOT NULL,
          tipo text NOT NULL DEFAULT 'basico',
          aberto boolean NOT NULL DEFAULT false,
          item_id text,
          raridade text,
          criado_em timestamptz NOT NULL DEFAULT now(),
          aberto_em timestamptz
        );
        CREATE INDEX IF NOT EXISTS locaus_packs_user_idx ON public.locaus_packs (user_id, aberto);
        CREATE TABLE IF NOT EXISTS public.mercado_settings (
          chave text PRIMARY KEY,
          valor text
        );
        CREATE TABLE IF NOT EXISTS public.mercado_tesouro (
          id int PRIMARY KEY,
          saldo numeric NOT NULL DEFAULT 0
        );
        INSERT INTO public.mercado_tesouro (id, saldo) VALUES (1, 500)
        ON CONFLICT (id) DO NOTHING;
      `)
      .then(() => true)
      .catch((e) => {
        console.error('Mercado (tabelas):', e.message);
        return false;
      });
  }
  return tabelas;
}

/* Cria preços iniciais e um histórico de 24h para os gráficos. */
let semeado = null;
async function semear() {
  if (semeado) return semeado;
  semeado = (async () => {
    await garantirTabelas();
    const db = getDb();

    // preços base (atualiza se o catálogo mudou de valores)
    for (const item of CATALOGO) {
      const base = Number(item.custo) || 10;
      await db
        .prepare(
          `INSERT INTO public.mercado_precos (item_id, base, preco)
           VALUES (?, ?, ?)
           ON CONFLICT (item_id) DO UPDATE
             SET base = EXCLUDED.base,
                 preco = CASE
                   WHEN mercado_precos.base <> EXCLUDED.base THEN EXCLUDED.preco
                   ELSE mercado_precos.preco
                 END`,
        )
        .run(item.id, base, base)
        .catch(() => {});
    }

    // Quando os preços base mudam (ex.: cores especiais mais caras),
    // limpa o histórico antigo para os gráficos não mentirem.
    const VERSAO = '7';
    const ver = await db
      .prepare("SELECT valor FROM public.mercado_settings WHERE chave = 'versao'")
      .get()
      .catch(() => null);
    if (!ver || ver.valor !== VERSAO) {
      await db.prepare('DELETE FROM public.mercado_historico').run().catch(() => {});
      await db
        .prepare('UPDATE public.mercado_precos SET preco = base, atualizado_em = now()')
        .run()
        .catch(() => {});
      await db
        .prepare(
          `INSERT INTO public.mercado_settings (chave, valor) VALUES ('versao', ?)
           ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
        )
        .run(VERSAO)
        .catch(() => {});
    }

    // histórico de 24h de uma só vez (rápido: 1 query para todos)
    const ids = CATALOGO.map((x) => x.id);
    await db
      .prepare(
        `INSERT INTO public.mercado_historico (item_id, preco, em)
         SELECT p.item_id,
                ROUND(GREATEST(p.base * 0.6, LEAST(p.base * 1.8, p.base * (0.88 + random() * 0.24)))::numeric, 2),
                now() - (g || ' hours')::interval
         FROM public.mercado_precos p
         CROSS JOIN generate_series(1, 24) g
         WHERE p.item_id = ANY(?::text[])
           AND NOT EXISTS (
             SELECT 1 FROM public.mercado_historico h WHERE h.item_id = p.item_id
           )`,
      )
      .run(ids)
      .catch((e) => console.error('Mercado (histórico):', e.message));

    return true;
  })().catch((e) => {
    console.error('Mercado (semear):', e.message);
    semeado = null;
    return false;
  });
  return semeado;
}

/* Um "tick": tendência com memória + ruído pequeno. */
async function tick() {
  await garantirTabelas();
  const db = getDb();

  const atualizados = await db
    .prepare(
      `WITH novos AS (
         SELECT item_id,
                GREATEST(-0.02, LEAST(0.02, tendencia * 0.85 + (random() - 0.5) * 0.012)) AS nova
         FROM public.mercado_precos
       )
       UPDATE public.mercado_precos p
       SET tendencia = n.nova,
           preco = ROUND(
             GREATEST(p.base * 0.55, LEAST(p.base * 2.2, p.preco * (1 + n.nova + (random() - 0.5) * 0.006)))::numeric,
             2
           ),
           atualizado_em = now()
       FROM novos n
       WHERE p.item_id = n.item_id
       RETURNING p.item_id, p.preco`,
    )
    .all();

  if (atualizados.length) {
    const ids = atualizados.map((x) => x.item_id);
    const precos = atualizados.map((x) => Number(x.preco));
    await db
      .prepare(
        `INSERT INTO public.mercado_historico (item_id, preco)
         SELECT * FROM unnest(?::text[], ?::numeric[])`,
      )
      .run(ids, precos)
      .catch(() => {});
  }

  // "market maker": alguns negócios simulados para o mercado não morrer
  await simularNegocios(db, atualizados).catch(() => {});
  // e o mercado também compra anúncios de users, se o preço for razoável
  await simularCompraAnuncios(db).catch(() => {});

  // limpa histórico com mais de 7 dias
  await db
    .prepare("DELETE FROM public.mercado_historico WHERE em < now() - interval '7 days'")
    .run()
    .catch(() => {});
  await db
    .prepare("DELETE FROM public.mercado_vendas WHERE em < now() - interval '7 days'")
    .run()
    .catch(() => {});
  return true;
}

/* Negócios de liquidez (aparecem como "Mercado", não como membros). */
async function simularNegocios(db, atualizados) {
  if (!atualizados.length) return;
  const escolhas = [...atualizados].sort(() => Math.random() - 0.5).slice(0, 4);
  for (const item of escolhas) {
    if (Math.random() > 0.55) continue;
    const compra = Math.random() > 0.45;
    const fator = compra ? 0.008 : -0.008;
    const r = await db
      .prepare(
        `UPDATE public.mercado_precos
         SET preco = ROUND(GREATEST(base * 0.55, LEAST(base * 2.2, preco * (1 + ?::numeric)))::numeric, 2),
             atualizado_em = now()
         WHERE item_id = ?
         RETURNING preco`,
      )
      .get(fator, item.item_id)
      .catch(() => null);
    if (!r) continue;
    const preco = Number(r.preco);
    await db
      .prepare('INSERT INTO public.mercado_historico (item_id, preco) VALUES (?, ?)')
      .run(item.item_id, preco)
      .catch(() => {});
    await db
      .prepare(
        'INSERT INTO public.mercado_vendas (item_id, user_id, preco, tipo) VALUES (?, NULL, ?, ?)',
      )
      .run(item.item_id, preco, compra ? 'compra' : 'venda')
      .catch(() => {});
  }
}

/* O "Mercado" também compra anúncios de users quando o preço é
   razoável. Quanto mais acima do valor de mercado, menos chance
   (e acima de 1,5x nunca compra — aí só mesmo um membro). */
async function simularCompraAnuncios(db) {
  const anuncios = await db
    .prepare(
      `SELECT a.id, a.user_id, a.item_id, a.preco,
              EXTRACT(EPOCH FROM (now() - a.criado_em))::int AS idade
       FROM public.mercado_anuncios a
       WHERE a.estado = 'ativo'
       ORDER BY a.criado_em ASC
       LIMIT 20`,
    )
    .all()
    .catch(() => []);

  for (const a of anuncios) {
    if (Number(a.idade) < 60) continue; // dá tempo de um membro ver primeiro

    const p = await db
      .prepare('SELECT preco FROM public.mercado_precos WHERE item_id = ?')
      .get(a.item_id)
      .catch(() => null);
    const mercado = Number(p && p.preco) || Number(a.preco);
    const ratio = Number(a.preco) / mercado;

    let chance = 0;
    if (ratio <= 0.95) chance = 0.7;
    else if (ratio <= 1.1) chance = 0.4;
    else if (ratio <= 1.25) chance = 0.15;
    else if (ratio <= 1.5) chance = 0.04;
    else chance = 0;

    if (Math.random() > chance) continue;

    const preco = Math.round(Number(a.preco));
    const taxa = Math.max(1, Math.round(preco * TAXA));
    const liquido = Math.max(0, Math.round(preco - taxa));

    // o tesouro tem de ter saldo para pagar ao vendedor
    const tesouro = await tesouroSaldo(db);
    if (tesouro < liquido) continue;

    await db
      .prepare('DELETE FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
      .run(a.user_id, a.item_id)
      .catch(() => {});
    await db
      .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
      .run(a.user_id, liquido, `anuncio-bot:${a.id}`)
      .catch(() => {});
    await tesouroAjustar(db, -liquido);
    await db
      .prepare(
        "UPDATE public.mercado_anuncios SET estado = 'vendido', vendido_em = now(), comprador_id = NULL WHERE id = ?",
      )
      .run(a.id)
      .catch(() => {});
    await db
      .prepare(
        'INSERT INTO public.mercado_vendas (item_id, user_id, preco, tipo, contraparte_id) VALUES (?, NULL, ?, ?, ?)',
      )
      .run(a.item_id, preco, 'compra', a.user_id)
      .catch(() => {});
    await db
      .prepare('UPDATE public.mercado_precos SET preco = ?, atualizado_em = now() WHERE item_id = ?')
      .run(preco, a.item_id)
      .catch(() => {});
    await db
      .prepare('INSERT INTO public.mercado_historico (item_id, preco) VALUES (?, ?)')
      .run(a.item_id, preco)
      .catch(() => {});
  }
}

/* Só mexe nos preços se já passou ~1 minuto (funciona também na Vercel,
   onde não há processos em segundo plano). */
async function talvezTick() {
  const db = getDb();
  const r = await db
    .prepare(
      `SELECT EXTRACT(EPOCH FROM (now() - COALESCE(MAX(atualizado_em), now() - interval '1 hour')))::int AS seg
       FROM public.mercado_precos`,
    )
    .get()
    .catch(() => null);
  const seg = Number(r && r.seg) || 999;
  if (seg >= 60) await tick().catch(() => {});
}

async function listar(uid) {
  await semear();
  await talvezTick();
  const db = getDb();

  const precos = await db
    .prepare('SELECT item_id, base, preco, atualizado_em FROM public.mercado_precos')
    .all();
  const mapaPrecos = new Map(precos.map((p) => [p.item_id, p]));

  const hist = await db
    .prepare(
      `SELECT item_id, preco, em FROM public.mercado_historico
       WHERE em > now() - interval '2 days'
       ORDER BY em ASC`,
    )
    .all();
  const porItem = new Map();
  for (const h of hist) {
    if (!porItem.has(h.item_id)) porItem.set(h.item_id, []);
    porItem.get(h.item_id).push({ preco: Number(h.preco), em: h.em });
  }

  const vendas = await db
    .prepare(
      `SELECT v.item_id, v.preco, v.tipo, v.em,
              u.username, c.username AS contraparte
       FROM public.mercado_vendas v
       LEFT JOIN users u ON u.id = v.user_id
       LEFT JOIN users c ON c.id = v.contraparte_id
       ORDER BY v.em DESC LIMIT 40`,
    )
    .all();

  const anuncios = await db
    .prepare(
      `SELECT a.id, a.item_id, a.preco, a.user_id, u.username
       FROM public.mercado_anuncios a
       JOIN users u ON u.id = a.user_id
       WHERE a.estado = 'ativo'
       ORDER BY a.preco ASC`,
    )
    .all()
    .catch(() => []);
  const anunciosPorItem = new Map();
  for (const a of anuncios) {
    if (!anunciosPorItem.has(a.item_id)) anunciosPorItem.set(a.item_id, []);
    anunciosPorItem.get(a.item_id).push({
      id: Number(a.id),
      preco: Number(a.preco),
      username: a.username,
      meu: Number(a.user_id) === Number(uid),
    });
  }

  const compras = await db
    .prepare('SELECT item_id FROM public.cosmeticos_compras WHERE user_id = ?')
    .all(uid)
    .catch(() => []);
  const comprados = new Set(compras.map((c) => c.item_id));

  const saldo = await cosmeticos.saldo(uid);

  const itens = CATALOGO.map((item) => {
    const p = mapaPrecos.get(item.id) || { base: item.custo, preco: item.custo };
    const base = Number(p.base) || Number(item.custo) || 10;
    const preco = Math.round(Number(p.preco) * 100) / 100;
    const serie = (porItem.get(item.id) || []).slice(-60);
    const primeiro = serie.length ? serie[0].preco : preco;
    const variacao = primeiro ? ((preco - primeiro) / primeiro) * 100 : 0;
    return {
      ...item,
      base,
      preco,
      preco_compra: precoCompra(preco),
      preco_venda: precoVenda(preco),
      variacao: Math.round(variacao * 10) / 10,
      historico: serie,
      raridade: raridadeDe(base),
      comprado: comprados.has(item.id),
      anuncios: anunciosPorItem.get(item.id) || [],
      minhasVendas: vendas
        .filter((v) => v.item_id === item.id)
        .slice(0, 6)
        .map((v) => ({
          preco: Number(v.preco),
          tipo: v.tipo,
          em: v.em,
          username: v.username,
          contraparte: v.contraparte,
        })),
    };
  }).sort((a, b) => b.preco - a.preco);

  return {
    saldo,
    itens,
    ultimasVendas: vendas.slice(0, 20).map((v) => ({
      item_id: v.item_id,
      nome: (POR_ID.get(v.item_id) || {}).nome || v.item_id,
      preco: Number(v.preco),
      tipo: v.tipo,
      em: v.em,
      username: v.username || 'Mercado',
      contraparte: v.contraparte || null,
    })),
    atualizado_em: new Date().toISOString(),
  };
}

async function ajustarPreco(itemId, fator) {
  const db = getDb();
  const r = await db
    .prepare(
      `UPDATE public.mercado_precos
       SET preco = ROUND(GREATEST(base * 0.55, LEAST(base * 2.2, preco * (1 + ?::numeric)))::numeric, 2),
           atualizado_em = now()
       WHERE item_id = ?
       RETURNING preco`,
    )
    .get(fator, itemId)
    .catch(() => null);
  if (r) {
    await db
      .prepare('INSERT INTO public.mercado_historico (item_id, preco) VALUES (?, ?)')
      .run(itemId, Number(r.preco))
      .catch(() => {});
  }
  return r ? Number(r.preco) : null;
}

/* Impede comprar e vender o mesmo item em loop (pump-and-dump). */
async function podeNegociar(uid, itemId) {
  const db = getDb();
  const r = await db
    .prepare(
      `SELECT EXTRACT(EPOCH FROM (now() - em))::int AS seg
       FROM public.mercado_vendas
       WHERE user_id = ? AND item_id = ?
       ORDER BY em DESC LIMIT 1`,
    )
    .get(uid, itemId)
    .catch(() => null);
  const seg = Number(r && r.seg);
  if (!Number.isFinite(seg)) return { ok: true };
  const falta = COOLDOWN_MS / 1000 - seg;
  if (falta > 0) return { ok: false, minutos: Math.ceil(falta / 60) };
  return { ok: true };
}

async function comprar(uid, itemId) {
  await semear();
  await talvezTick();
  const item = POR_ID.get(String(itemId || ''));
  if (!item) throw new Error('Item inválido.');
  if (item.emBreve) throw new Error('Este estilo de perfil chega em breve.');

  const db = getDb();
  const ja = await db
    .prepare('SELECT 1 FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
    .get(uid, item.id);
  if (ja) throw new Error('Já tens este cosmético.');

  const cooldown = await podeNegociar(uid, item.id);
  if (!cooldown.ok) {
    throw new Error(`Espera ${cooldown.minutos} min antes de negociar outra vez este item.`);
  }

  const p = await db.prepare('SELECT preco FROM public.mercado_precos WHERE item_id = ?').get(item.id);
  const preco = precoCompra(Number(p && p.preco) || item.custo);
  const saldo = await cosmeticos.saldo(uid);
  if (saldo.disponiveis < preco) {
    throw new Error(
      `Faltam ${preco - saldo.disponiveis} moeda(s). Tens ${saldo.disponiveis} disponíveis.`,
    );
  }

  await db
    .prepare('INSERT INTO public.cosmeticos_compras (user_id, item_id, tipo, custo) VALUES (?, ?, ?, 0)')
    .run(uid, item.id, item.tipo);
  await db
    .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
    .run(uid, -preco, `compra:${item.id}`);
  await db
    .prepare('INSERT INTO public.mercado_vendas (item_id, user_id, preco, tipo) VALUES (?, ?, ?, ?)')
    .run(item.id, uid, preco, 'compra');

  // a compra empurra o preço para cima (procura)
  const novo = await ajustarPreco(item.id, IMPACTO);

  return {
    ok: true,
    preco,
    preco_venda: precoVenda(novo || preco),
    item,
    ...(await cosmeticos.saldo(uid)),
  };
}

async function vender(uid, itemId) {
  await semear();
  await talvezTick();
  const item = POR_ID.get(String(itemId || ''));
  if (!item) throw new Error('Item inválido.');
  if (item.emBreve) throw new Error('Este estilo de perfil chega em breve.');

  const db = getDb();
  const comprado = await db
    .prepare('SELECT 1 FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
    .get(uid, item.id);
  if (!comprado) throw new Error('Não tens este cosmético.');

  const cooldown = await podeNegociar(uid, item.id);
  if (!cooldown.ok) {
    throw new Error(`Espera ${cooldown.minutos} min antes de negociar outra vez este item.`);
  }

  const p = await db.prepare('SELECT preco FROM public.mercado_precos WHERE item_id = ?').get(item.id);
  const preco = precoVenda(Number(p && p.preco) || item.custo);
  const taxa = Math.max(1, Math.round(preco * TAXA));
  const liquido = Math.max(0, Math.round(preco - taxa));

  const tesouro = await tesouroSaldo(db);
  if (tesouro < liquido) {
    throw new Error('O mercado não tem saldo para comprar agora. Tenta mais tarde.');
  }

  await db
    .prepare('DELETE FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
    .run(uid, item.id);
  await db
    .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
    .run(uid, liquido, `venda:${item.id}`);
  await db
    .prepare('INSERT INTO public.mercado_vendas (item_id, user_id, preco, tipo) VALUES (?, ?, ?, ?)')
    .run(item.id, uid, preco, 'venda');
  await tesouroAjustar(db, -liquido);

  // a venda empurra o preço para baixo (oferta)
  const novo = await ajustarPreco(item.id, -IMPACTO);

  return {
    ok: true,
    preco,
    taxa,
    recebido: liquido,
    preco_compra: precoCompra(novo || preco),
    item,
    ...(await cosmeticos.saldo(uid)),
  };
}

/* ---------------- Anúncios (o user escolhe o preço) ---------------- */

async function meusItens(uid) {
  const m = await listar(uid);
  return {
    saldo: m.saldo,
    itens: m.itens.filter((x) => x.comprado),
    atualizado_em: m.atualizado_em,
  };
}

async function anunciar(uid, itemId, preco) {
  await semear();
  const item = POR_ID.get(String(itemId || ''));
  if (!item) throw new Error('Item inválido.');
  if (item.emBreve) throw new Error('Este estilo de perfil chega em breve.');
  const valor = Math.round(Number(preco));
  if (!Number.isFinite(valor) || valor <= 0) throw new Error('Preço inválido.');
  if (valor > 100000) throw new Error('Preço demasiado alto.');

  const db = getDb();
  const comprado = await db
    .prepare('SELECT 1 FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
    .get(uid, item.id);
  if (!comprado) throw new Error('Não tens este cosmético.');

  const ativo = await db
    .prepare(
      "SELECT id FROM public.mercado_anuncios WHERE user_id = ? AND item_id = ? AND estado = 'ativo'",
    )
    .get(uid, item.id);
  if (ativo) throw new Error('Já tens este item à venda.');

  const r = await db
    .prepare('INSERT INTO public.mercado_anuncios (user_id, item_id, preco) VALUES (?, ?, ?) RETURNING id')
    .run(uid, item.id, valor);

  // o mercado passa a acompanhar o valor pedido
  await db
    .prepare('UPDATE public.mercado_precos SET preco = ?, atualizado_em = now() WHERE item_id = ?')
    .run(valor, item.id);
  await db
    .prepare('INSERT INTO public.mercado_historico (item_id, preco) VALUES (?, ?)')
    .run(item.id, valor)
    .catch(() => {});

  return { ok: true, id: Number(r.lastInsertRowid), preco: valor };
}

async function cancelarAnuncio(uid, id) {
  const db = getDb();
  const a = await db
    .prepare("SELECT id, user_id FROM public.mercado_anuncios WHERE id = ? AND estado = 'ativo'")
    .get(Number(id));
  if (!a) throw new Error('Anúncio não encontrado.');
  if (Number(a.user_id) !== Number(uid)) throw new Error('Este anúncio não é teu.');
  await db
    .prepare("UPDATE public.mercado_anuncios SET estado = 'cancelado' WHERE id = ?")
    .run(a.id);
  return { ok: true };
}

async function comprarAnuncio(uid, id) {
  await semear();
  const db = getDb();
  const a = await db
    .prepare(
      `SELECT a.id, a.user_id, a.item_id, a.preco, u.username
       FROM public.mercado_anuncios a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = ? AND a.estado = 'ativo'`,
    )
    .get(Number(id));
  if (!a) throw new Error('Este anúncio já não está disponível.');
  if (Number(a.user_id) === Number(uid)) throw new Error('O anúncio é teu.');

  const item = POR_ID.get(a.item_id);
  if (!item) throw new Error('Item inválido.');
  if (item.emBreve) throw new Error('Este estilo de perfil chega em breve.');
  const preco = Math.round(Number(a.preco));

  const saldo = await cosmeticos.saldo(uid);
  if (saldo.disponiveis < preco) {
    throw new Error(`Faltam ${preco - saldo.disponiveis} moeda(s). Tens ${saldo.disponiveis}.`);
  }
  const ja = await db
    .prepare('SELECT 1 FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
    .get(uid, item.id);
  if (ja) throw new Error('Já tens este cosmético.');

  // passa do vendedor para o comprador (o vendedor recebe com a taxa descontada)
  const taxa = Math.max(1, Math.round(preco * TAXA));
  const liquido = Math.max(0, Math.round(preco - taxa));
  await db
    .prepare('DELETE FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ?')
    .run(a.user_id, item.id);
  await db
    .prepare('INSERT INTO public.cosmeticos_compras (user_id, item_id, tipo, custo) VALUES (?, ?, ?, 0)')
    .run(uid, item.id, item.tipo);
  await db
    .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
    .run(uid, -preco, `anuncio:${a.id}`);
  await db
    .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
    .run(a.user_id, liquido, `anuncio:${a.id}`);
  await tesouroAjustar(db, taxa);
  await db
    .prepare(
      "UPDATE public.mercado_anuncios SET estado = 'vendido', vendido_em = now(), comprador_id = ? WHERE id = ?",
    )
    .run(uid, a.id);
  await db
    .prepare(
      'INSERT INTO public.mercado_vendas (item_id, user_id, preco, tipo, contraparte_id) VALUES (?, ?, ?, ?, ?)',
    )
    .run(item.id, uid, preco, 'compra', a.user_id);

  // o mercado fica no valor da venda
  await db
    .prepare('UPDATE public.mercado_precos SET preco = ?, atualizado_em = now() WHERE item_id = ?')
    .run(preco, item.id);
  await db
    .prepare('INSERT INTO public.mercado_historico (item_id, preco) VALUES (?, ?)')
    .run(item.id, preco)
    .catch(() => {});

  return { ok: true, preco, taxa, item, vendedor: a.username, ...(await cosmeticos.saldo(uid)) };
}

/* ---------------- Packs ---------------- */

async function darPacks({ userId, tipo = 'basico', quantidade = 1 }) {
  await garantirTabelas();
  const uid = Number(userId);
  if (!uid) throw new Error('Utilizador inválido.');
  const t = PESOS[tipo] ? tipo : 'basico';
  const n = Math.max(1, Math.min(50, Number(quantidade) || 1));
  const db = getDb();
  for (let i = 0; i < n; i += 1) {
    await db.prepare('INSERT INTO public.locaus_packs (user_id, tipo) VALUES (?, ?)').run(uid, t);
  }
  return n;
}

async function meusPacks(uid) {
  await garantirTabelas();
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT id, tipo, aberto, item_id, raridade, criado_em, aberto_em
       FROM public.locaus_packs WHERE user_id = ? ORDER BY aberto ASC, criado_em DESC LIMIT 60`,
    )
    .all(uid);
  return rows.map((r) => ({
    id: Number(r.id),
    tipo: r.tipo,
    aberto: Boolean(r.aberto),
    item_id: r.item_id,
    raridade: r.raridade,
    criado_em: r.criado_em,
    aberto_em: r.aberto_em,
  }));
}

function sortearRaridade(tipo) {
  const pesos = PESOS[tipo] || PESOS.basico;
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pesos.length; i += 1) {
    r -= pesos[i];
    if (r <= 0) return RARIDADES[i];
  }
  return RARIDADES[0];
}

async function abrirPack(uid, packId) {
  await garantirTabelas();
  const db = getDb();
  const pack = await db
    .prepare('SELECT id, tipo, aberto FROM public.locaus_packs WHERE id = ? AND user_id = ?')
    .get(Number(packId), uid);
  if (!pack) throw new Error('Pack não encontrado.');
  if (pack.aberto) throw new Error('Este pack já foi aberto.');

  const raridade = sortearRaridade(pack.tipo);
  const negociaveis = CATALOGO.filter((x) => !x.emBreve);
  const daRaridade = negociaveis.filter((x) => raridadeDe(x.custo) === raridade);
  const pool = daRaridade.length ? daRaridade : negociaveis;

  const comprados = new Set(
    (
      await db
        .prepare('SELECT item_id FROM public.cosmeticos_compras WHERE user_id = ?')
        .all(uid)
        .catch(() => [])
    ).map((c) => c.item_id),
  );
  const novos = pool.filter((x) => !comprados.has(x.id));
  const escolhido = (novos.length ? novos : pool)[Math.floor(Math.random() * (novos.length || pool.length))];
  const duplicado = comprados.has(escolhido.id);

  // o valor mostrado é o preço do mercado neste instante
  const p = await db
    .prepare('SELECT preco FROM public.mercado_precos WHERE item_id = ?')
    .get(escolhido.id)
    .catch(() => null);
  const valorMercado = Math.max(1, Math.round(Number(p && p.preco) || escolhido.custo));
  const credito = Math.max(1, Math.round(valorMercado * 0.5));

  if (duplicado) {
    // já tinha o item: recebe metade do valor em moedas
    await db
      .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
      .run(uid, credito, `pack-duplicado:${escolhido.id}`);
  } else {
    await db
      .prepare(
        'INSERT INTO public.cosmeticos_compras (user_id, item_id, tipo, custo) VALUES (?, ?, ?, 0)',
      )
      .run(uid, escolhido.id, escolhido.tipo)
      .catch(() => {});
  }

  await db
    .prepare(
      `UPDATE public.locaus_packs
       SET aberto = true, item_id = ?, raridade = ?, aberto_em = now()
       WHERE id = ?`,
    )
    .run(escolhido.id, raridade, Number(pack.id));

  return {
    ok: true,
    pack_id: Number(pack.id),
    tipo: pack.tipo,
    raridade,
    raridade_info: RARIDADE_INFO[raridade],
    item: {
      id: escolhido.id,
      nome: escolhido.nome,
      tipo: escolhido.tipo,
      valor: valorMercado,
      valor_cor: escolhido.valor,
      cor: escolhido.cor,
      valor_textura: escolhido.textura ? escolhido.valor : null,
    },
    duplicado,
    creditos: duplicado ? credito : 0,
  };
}

/* Limpa os cosméticos que este utilizador ganhou em packs.
   Só apaga compras com custo 0 (as dos packs); as compras no
   mercado ficam. Se algum estava equipado, volta ao padrão. */
async function limparItensDePacks(uid) {
  await garantirTabelas();
  const db = getDb();
  const packs = await db
    .prepare(
      `SELECT DISTINCT item_id FROM public.locaus_packs
       WHERE user_id = ? AND aberto = true AND item_id IS NOT NULL`,
    )
    .all(uid)
    .catch(() => []);

  let removidos = 0;
  for (const p of packs) {
    const item = POR_ID.get(p.item_id);
    if (!item) continue;
    const r = await db
      .prepare(
        'DELETE FROM public.cosmeticos_compras WHERE user_id = ? AND item_id = ? AND custo = 0',
      )
      .run(uid, item.id)
      .catch(() => null);
    if (r && Number(r.changes) > 0) removidos += 1;
    await db
      .prepare(
        `UPDATE public.user_profiles SET ${item.campo} = NULL
         WHERE user_id = ? AND ${item.campo} = ?`,
      )
      .run(uid, item.valor)
      .catch(() => {});
  }

  // limpa também o histórico de packs abertos (os fechados ficam)
  await db
    .prepare('DELETE FROM public.locaus_packs WHERE user_id = ? AND aberto = true')
    .run(uid)
    .catch(() => {});

  return { removidos, itens: packs.length };
}

/* Histórico completo de compras/vendas (para a aba Histórico). */
async function historico(limite = 100) {
  await semear();
  const db = getDb();
  const n = Math.min(300, Math.max(10, Number(limite) || 100));
  const rows = await db
    .prepare(
      `SELECT v.item_id, v.preco, v.tipo, v.em,
              u.username, c.username AS contraparte
       FROM public.mercado_vendas v
       LEFT JOIN users u ON u.id = v.user_id
       LEFT JOIN users c ON c.id = v.contraparte_id
       ORDER BY v.em DESC LIMIT ?`,
    )
    .all(n);

  const anuncios = await db
    .prepare(
      `SELECT a.id, a.item_id, a.preco, a.criado_em, u.username
       FROM public.mercado_anuncios a
       JOIN users u ON u.id = a.user_id
       WHERE a.estado = 'ativo'
       ORDER BY a.preco ASC
       LIMIT 60`,
    )
    .all()
    .catch(() => []);

  return {
    vendas: rows.map((v) => ({
      item_id: v.item_id,
      nome: (POR_ID.get(v.item_id) || {}).nome || v.item_id,
      preco: Number(v.preco),
      tipo: v.tipo,
      em: v.em,
      username: v.username || 'Mercado',
      contraparte: v.contraparte || null,
    })),
    anuncios: anuncios.map((a) => ({
      id: Number(a.id),
      item_id: a.item_id,
      nome: (POR_ID.get(a.item_id) || {}).nome || a.item_id,
      preco: Number(a.preco),
      username: a.username,
      criado_em: a.criado_em,
    })),
  };
}

/* Limpa créditos do mercado (vendas) de um utilizador. */
async function limparCreditos(uid) {
  const db = getDb();
  const r = await db.prepare('DELETE FROM public.mercado_ledger WHERE user_id = ?').run(uid);
  return { removidos: Number(r.changes) || 0 };
}

/* Limpa TODOS os cosméticos do utilizador (mercado + packs + loja). */
async function limparItens(uid) {
  const db = getDb();
  const r = await db.prepare('DELETE FROM public.cosmeticos_compras WHERE user_id = ?').run(uid);
  await db
    .prepare(
      `UPDATE public.user_profiles
       SET name_color = NULL, card_style = 'padrao', profile_style = 'padrao'
       WHERE user_id = ?`,
    )
    .run(uid)
    .catch(() => {});
  return { removidos: Number(r.changes) || 0 };
}

/* Remove todos os packs (abertos e fechados) do utilizador. */
async function limparPacks(uid) {
  const db = getDb();
  const r = await db.prepare('DELETE FROM public.locaus_packs WHERE user_id = ?').run(uid);
  return { removidos: Number(r.changes) || 0 };
}

/* ============================================================
   Economia (admin) — moedas em circulação, fortunas, itens,
   inflação da semana.
   ============================================================ */
async function economia() {
  await semear();
  const db = getDb();

  const users = await db
    .prepare(
      `WITH pred AS (
         SELECT user_id,
                count(*) FILTER (WHERE correct IS TRUE AND COALESCE(stake, 0) = 0)::int AS base,
                COALESCE(SUM(CASE WHEN correct IS TRUE AND COALESCE(stake, 0) > 0 THEN 2 * stake ELSE 0 END), 0)::int AS payout,
                COALESCE(SUM(COALESCE(stake, 0)), 0)::int AS stakes
         FROM r6_predictions GROUP BY user_id
         UNION ALL
         SELECT user_id,
                count(*) FILTER (WHERE correct IS TRUE AND COALESCE(stake, 0) = 0)::int AS base,
                COALESCE(SUM(CASE WHEN correct IS TRUE AND COALESCE(stake, 0) > 0 THEN 2 * stake ELSE 0 END), 0)::int AS payout,
                COALESCE(SUM(COALESCE(stake, 0)), 0)::int AS stakes
         FROM cs2_predictions GROUP BY user_id
       ),
       agg AS (
         SELECT user_id, SUM(base)::int AS base, SUM(payout)::int AS payout, SUM(stakes)::int AS stakes
         FROM pred GROUP BY user_id
       )
       SELECT u.id, u.username,
              COALESCE(a.base, 0) + COALESCE(a.payout, 0) - COALESCE(a.stakes, 0) AS acertos,
              COALESCE((SELECT SUM(custo) FROM public.cosmeticos_compras c WHERE c.user_id = u.id), 0) AS gastos,
              COALESCE((SELECT SUM(valor) FROM public.mercado_ledger l WHERE l.user_id = u.id), 0) AS creditos
       FROM users u LEFT JOIN agg a ON a.user_id = u.id
       ORDER BY u.id`,
    )
    .all()
    .catch(() => []);

  const contas = users.map((u) => {
    const acertos = Number(u.acertos) || 0;
    const gastos = Number(u.gastos) || 0;
    const creditos = Number(u.creditos) || 0;
    return {
      id: Number(u.id),
      username: u.username,
      acertos,
      gastos,
      creditos,
      disponivel: Math.max(0, acertos - gastos + creditos),
    };
  });
  const total = contas.reduce((n, c) => n + c.disponivel, 0);

  const itens = await db
    .prepare(
      `SELECT tipo, count(*)::int AS n, count(DISTINCT item_id)::int AS unicos
       FROM public.cosmeticos_compras GROUP BY tipo`,
    )
    .all()
    .catch(() => []);

  const semana = await db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0) AS criadas,
         COALESCE(SUM(CASE WHEN valor < 0 THEN -valor ELSE 0 END), 0) AS destruidas
       FROM public.mercado_ledger
       WHERE em > now() - interval '7 days'`,
    )
    .get()
    .catch(() => null);

  const gastosSemana = await db
    .prepare(
      `SELECT COALESCE(SUM(custo), 0) AS gastos
       FROM public.cosmeticos_compras
       WHERE comprado_em > now() - interval '7 days'`,
    )
    .get()
    .catch(() => null);

  const packs = await db
    .prepare(
      `SELECT count(*)::int AS dados,
              count(*) FILTER (WHERE aberto = true)::int AS abertos
       FROM public.locaus_packs`,
    )
    .get()
    .catch(() => null);

  const anuncios = await db
    .prepare("SELECT count(*)::int AS n FROM public.mercado_anuncios WHERE estado = 'ativo'")
    .get()
    .catch(() => null);

  const criadas = Number(semana && semana.criadas) || 0;
  const destruidas =
    (Number(semana && semana.destruidas) || 0) + (Number(gastosSemana && gastosSemana.gastos) || 0);

  return {
    circulacao: {
      total,
      media: contas.length ? Math.round(total / contas.length) : 0,
      membros: contas.length,
    },
    fortunas: [...contas].sort((a, b) => b.disponivel - a.disponivel).slice(0, 10),
    itens: {
      total: itens.reduce((n, x) => n + (Number(x.n) || 0), 0),
      unicos: itens.reduce((n, x) => n + (Number(x.unicos) || 0), 0),
      porTipo: itens.map((x) => ({ tipo: x.tipo, n: Number(x.n) || 0 })),
    },
    semana: {
      criadas,
      destruidas,
      liquido: criadas - destruidas,
    },
    packs: {
      dados: Number(packs && packs.dados) || 0,
      abertos: Number(packs && packs.abertos) || 0,
    },
    anuncios: Number(anuncios && anuncios.n) || 0,
    tesouro: await tesouroSaldo(db),
  };
}

/* Admin: dar (valor > 0) ou retirar (valor < 0) moedas, com motivo. */
async function ajustarMoedas(uid, valor, motivo) {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n) || n === 0) throw new Error('Valor inválido.');
  if (Math.abs(n) > 1000000) throw new Error('Valor demasiado alto.');
  const razao = String(motivo || '').trim().slice(0, 120) || (n > 0 ? 'oferta admin' : 'remoção admin');
  const db = getDb();
  await db
    .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
    .run(uid, n, `admin:${razao}`);
  return { ok: true, valor: n, motivo: razao, ...(await cosmeticos.saldo(uid)) };
}

module.exports = {
  listar,
  meusItens,
  historico,
  economia,
  ajustarMoedas,
  comprar,
  vender,
  anunciar,
  cancelarAnuncio,
  comprarAnuncio,
  darPacks,
  meusPacks,
  abrirPack,
  limparItensDePacks,
  limparCreditos,
  limparItens,
  limparPacks,
  tick,
  RARIDADE_INFO,
  raridadeDe,
};

