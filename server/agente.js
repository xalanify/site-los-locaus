/* ============================================================
   Agente local — ponte entre o site na nuvem e o PC Windows
   ------------------------------------------------------------
   A Vercel não tem PowerShell. Quando o site está online, o
   utilizador descarrega um LOCAUS-PC.bat, abre-o (pede admin uma
   vez) e fica um agente escondido ligado a esta API. O site
   enfileira trabalhos; o agente executa no PC e devolve logs.

   Segurança:
   - a sessão é criada com login normal e tem um token aleatório
     de 32 bytes; na base só fica o hash SHA-256;
   - o servidor monta o comando a partir do catálogo fechado —
     o browser nunca envia PowerShell livre;
   - a sessão expira ao fim de 12 h e pode ser desligada no site.
   ============================================================ */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');
const ferramentas = require('./ferramentas');

const SESSAO_MS = 12 * 60 * 60 * 1000; // 12 h
const ONLINE_MS = 25 * 1000; // agente conta como ligado se falou nos últimos 25 s

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

let tabelas = null;
async function garantirTabelas() {
  if (tabelas !== null) return tabelas;
  try {
    await getDb().exec(`
      CREATE TABLE IF NOT EXISTS public.agente_sessoes (
        id         bigint generated always as identity primary key,
        user_id    bigint not null references public.users(id) on delete cascade,
        nome       text,
        token_hash text not null unique,
        versao     text,
        plataforma text,
        criado_em  timestamptz not null default now(),
        visto_em   timestamptz,
        expira_em  timestamptz not null
      );
      CREATE INDEX IF NOT EXISTS agente_sessoes_user_idx ON public.agente_sessoes (user_id, criado_em DESC);

      CREATE TABLE IF NOT EXISTS public.agente_jobs (
        id            bigint generated always as identity primary key,
        sessao_id     bigint not null references public.agente_sessoes(id) on delete cascade,
        user_id       bigint not null references public.users(id) on delete cascade,
        tipo          text not null,
        ferramenta_id text,
        arg           text,
        acoes         jsonb,
        ids           jsonb,
        comando       text not null,
        nome          text,
        tempo         integer,
        status        text not null default 'pendente',
        logs          jsonb not null default '[]'::jsonb,
        resultado     jsonb,
        erro          text,
        codigo        integer,
        cancelar      boolean not null default false,
        criado_em     timestamptz not null default now(),
        inicio_em     timestamptz,
        fim_em        timestamptz
      );
      CREATE INDEX IF NOT EXISTS agente_jobs_sessao_idx ON public.agente_jobs (sessao_id, status, id);
      CREATE INDEX IF NOT EXISTS agente_jobs_user_idx ON public.agente_jobs (user_id, criado_em DESC);
    `);
    tabelas = true;
  } catch (e) {
    console.warn('Agente (criar tabelas) saltou:', String(e.message).slice(0, 160));
    tabelas = false;
  }
  return tabelas;
}

async function criarSessao(userId, { nome, versao, plataforma } = {}) {
  if (!(await garantirTabelas())) throw new Error('Base de dados indisponível.');
  const db = getDb();
  // uma sessão ativa por utilizador: a anterior deixa de receber trabalhos
  await db
    .prepare('UPDATE public.agente_sessoes SET expira_em = now() WHERE user_id = ? AND expira_em > now()')
    .run(userId);

  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + SESSAO_MS);
  const r = await db
    .prepare(
      `INSERT INTO public.agente_sessoes (user_id, nome, token_hash, versao, plataforma, expira_em)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .run(
      userId,
      String(nome || 'PC Windows').slice(0, 80),
      hashToken(token),
      versao ? String(versao).slice(0, 40) : null,
      plataforma ? String(plataforma).slice(0, 80) : null,
      expira.toISOString(),
    );
  // limpeza oportunista (não bloqueia a resposta)
  db.prepare("DELETE FROM public.agente_jobs WHERE criado_em < now() - interval '7 days'").run().catch(() => {});
  db.prepare("DELETE FROM public.agente_sessoes WHERE expira_em < now() - interval '2 days'").run().catch(() => {});

  return { id: Number(r.lastInsertRowid), token, expiraEm: expira.toISOString() };
}

async function validarToken(token) {
  if (!token) return null;
  if (!(await garantirTabelas())) return null;
  return getDb()
    .prepare('SELECT * FROM public.agente_sessoes WHERE token_hash = ? AND expira_em > now()')
    .get(hashToken(token));
}

async function autenticar(token) {
  const s = await validarToken(token);
  if (!s) return null;
  await getDb().prepare('UPDATE public.agente_sessoes SET visto_em = now() WHERE id = ?').run(s.id);
  return s;
}

async function estado(userId) {
  if (!(await garantirTabelas())) return { ok: false, online: false, erro: 'Base de dados indisponível.' };
  const db = getDb();
  const s = await db
    .prepare('SELECT * FROM public.agente_sessoes WHERE user_id = ? AND expira_em > now() ORDER BY id DESC LIMIT 1')
    .get(userId);
  if (!s) return { ok: true, online: false, sessao: null };
  const visto = s.visto_em ? new Date(s.visto_em).getTime() : 0;
  const online = Date.now() - visto < ONLINE_MS;
  const job = await db
    .prepare(
      "SELECT id, tipo, ferramenta_id, nome, status, logs, resultado, erro, codigo, criado_em, inicio_em, fim_em FROM public.agente_jobs WHERE sessao_id = ? AND status IN ('pendente','a_correr') ORDER BY id DESC LIMIT 1",
    )
    .get(s.id);
  return {
    ok: true,
    online,
    sessao: {
      id: Number(s.id),
      nome: s.nome,
      criadoEm: s.criado_em,
      expiraEm: s.expira_em,
      vistoEm: s.visto_em,
      versao: s.versao,
      plataforma: s.plataforma,
    },
    job: job || null,
  };
}

async function encerrarSessao(userId) {
  if (!(await garantirTabelas())) return { ok: false, erro: 'Base de dados indisponível.' };
  await getDb()
    .prepare('UPDATE public.agente_sessoes SET expira_em = now() WHERE user_id = ? AND expira_em > now()')
    .run(userId);
  return { ok: true };
}

/* ---------------- construção de trabalhos ---------------- */

function lerScript(nome) {
  const f = path.join(__dirname, 'scripts', nome);
  return fs.readFileSync(f, 'utf8');
}

function prepararTrabalho(payload, soAdmin) {
  const tipo = String(payload.tipo || '').trim();
  if (tipo === 'tool') {
    const p = ferramentas.preparar(
      String(payload.id || ''),
      payload.arg,
      soAdmin,
      payload.acoes,
    );
    if (!p.ok) return p;
    return { ...p, tipo: 'tool', ferramentaId: p.id };
  }
  if (tipo === 'desinstalar') {
    const p = ferramentas.prepararDesinstalar(payload.ids);
    if (!p.ok) return p;
    return { ...p, tipo: 'desinstalar', ferramentaId: 'desinstalar' };
  }
  if (tipo === 'discos') {
    return { ...ferramentas.prepararDiscos(), tipo: 'discos', ferramentaId: 'discos' };
  }
  if (tipo === 'instalados') {
    return { ...ferramentas.prepararInstalados(), tipo: 'instalados', ferramentaId: 'instalados' };
  }
  if (tipo === 'specs') {
    return {
      ok: true,
      tipo: 'specs',
      id: 'specs',
      ferramentaId: 'specs',
      nome: 'Ler PC (specs)',
      comando: lerScript('lerpc.ps1'),
      tempo: 75000,
      tipoResultado: 'json',
    };
  }
  if (tipo === 'saude') {
    return {
      ok: true,
      tipo: 'saude',
      id: 'saude',
      ferramentaId: 'saude',
      nome: 'Saúde do PC',
      comando: lerScript('saude.ps1'),
      tempo: 40000,
      tipoResultado: 'json',
    };
  }
  return { ok: false, erro: 'Trabalho desconhecido.' };
}

async function criarJob(userId, payload, soAdmin) {
  if (!(await garantirTabelas())) return { ok: false, erro: 'Base de dados indisponível.' };
  const db = getDb();
  const s = await db
    .prepare('SELECT * FROM public.agente_sessoes WHERE user_id = ? AND expira_em > now() ORDER BY id DESC LIMIT 1')
    .get(userId);
  if (!s) return { ok: false, erro: 'O PC ainda não está ligado. Descarrega e abre o LOCAUS-PC.bat.' };
  const visto = s.visto_em ? new Date(s.visto_em).getTime() : 0;
  if (Date.now() - visto >= ONLINE_MS) {
    return { ok: false, erro: 'O agente do PC está offline. Abre outra vez o LOCAUS-PC.bat.' };
  }

  const p = prepararTrabalho(payload, soAdmin);
  if (!p.ok) return p;

  const r = await db
    .prepare(
      `INSERT INTO public.agente_jobs
         (sessao_id, user_id, tipo, ferramenta_id, arg, acoes, ids, comando, nome, tempo)
       VALUES (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?) RETURNING id`,
    )
    .run(
      s.id,
      userId,
      p.tipo,
      p.ferramentaId || null,
      p.arg || null,
      p.acoes ? JSON.stringify(p.acoes) : null,
      Array.isArray(p.ids) ? JSON.stringify(p.ids) : null,
      p.comando,
      p.nome || p.tipo,
      p.tempo || 180000,
    );
  return {
    ok: true,
    job: {
      id: Number(r.lastInsertRowid),
      tipo: p.tipo,
      ferramenta_id: p.ferramentaId,
      nome: p.nome,
      status: 'pendente',
    },
  };
}

/* ---------------- lado do agente ---------------- */

async function proximo(sessao) {
  if (!(await garantirTabelas())) return { ok: false, erro: 'Base de dados indisponível.' };
  const db = getDb();
  const r = await db
    .prepare(
      `UPDATE public.agente_jobs SET status = 'a_correr', inicio_em = now()
       WHERE id = (
         SELECT id FROM public.agente_jobs
         WHERE sessao_id = ? AND status = 'pendente'
         ORDER BY id LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
    )
    .run(sessao.id);
  const jobId = Number(r.lastInsertRowid);
  if (!jobId) return { ok: true, job: null, encerrar: false };
  const job = await db.prepare('SELECT * FROM public.agente_jobs WHERE id = ?').get(jobId);
  return { ok: true, job, encerrar: false };
}

async function controlo(jobId, sessaoId) {
  if (!(await garantirTabelas())) return { ok: false, cancelar: false, encerrar: true };
  const j = await getDb()
    .prepare('SELECT cancelar FROM public.agente_jobs WHERE id = ? AND sessao_id = ?')
    .get(jobId, sessaoId);
  return { ok: Boolean(j), cancelar: Boolean(j && j.cancelar), encerrar: !j };
}

function juntarLogs(antigos, novas, limite = 600) {
  const agora = new Date().toISOString();
  const lista = Array.isArray(antigos) ? antigos.slice() : [];
  const entradas = Array.isArray(novas) ? novas : novas == null ? [] : [novas];
  for (const l of entradas) {
    const texto = String(l == null ? '' : l).slice(0, 500);
    if (texto) lista.push({ t: agora, l: texto });
  }
  return lista.length > limite ? lista.slice(-limite) : lista;
}

async function anexarLogs(jobId, sessaoId, linhas) {
  if (!(await garantirTabelas())) return { ok: false };
  const db = getDb();
  const j = await db
    .prepare('SELECT logs, cancelar FROM public.agente_jobs WHERE id = ? AND sessao_id = ?')
    .get(jobId, sessaoId);
  if (!j) return { ok: false, cancelar: true };
  const logs = juntarLogs(j.logs, linhas);
  await db
    .prepare('UPDATE public.agente_jobs SET logs = ?::jsonb WHERE id = ? AND sessao_id = ?')
    .run(JSON.stringify(logs), jobId, sessaoId);
  return { ok: true, cancelar: Boolean(j.cancelar) };
}

function extrairResultado(tipo, saida, logs) {
  const texto = String(saida || '');
  const linhas = texto.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (tipo === 'discos') {
    return { discos: linhas.map((x) => x.toUpperCase()).filter((x) => /^[A-Z]:$/.test(x)) };
  }
  if (tipo === 'instalados') {
    return ferramentas.parseInstalados(texto);
  }
  if (tipo === 'specs' || tipo === 'saude') {
    // o script escreve o JSON na última linha
    for (let i = linhas.length - 1; i >= 0; i--) {
      try {
        const dados = JSON.parse(linhas[i]);
        const passos = (Array.isArray(logs) ? logs : [])
          .map((x) => String((x && x.l) || ''))
          .filter((x) => /^\[passo\]/i.test(x))
          .map((x) => x.replace(/^\[passo\]\s*/i, ''));
        return { dados, passos };
      } catch {
        /* continua à procura */
      }
    }
    return { erro: 'O PowerShell não devolveu dados.' };
  }
  return { saida: texto.slice(-4000) };
}

async function finalizar(jobId, sessaoId, { status, codigo, erro, logs, saida, resultado }) {
  if (!(await garantirTabelas())) return { ok: false };
  const db = getDb();
  const j = await db
    .prepare('SELECT * FROM public.agente_jobs WHERE id = ? AND sessao_id = ?')
    .get(jobId, sessaoId);
  if (!j) return { ok: false, erro: 'Trabalho não encontrado.' };
  const todos = juntarLogs(j.logs, logs);
  const st = ['concluido', 'erro', 'cancelado'].includes(status) ? status : 'concluido';
  const res = resultado || extrairResultado(j.tipo, saida, todos);
  await db
    .prepare(
      `UPDATE public.agente_jobs
       SET logs = ?::jsonb, status = ?, codigo = ?, erro = ?, resultado = ?::jsonb, fim_em = now()
       WHERE id = ? AND sessao_id = ?`,
    )
    .run(
      JSON.stringify(todos),
      st,
      Number.isFinite(Number(codigo)) ? Number(codigo) : null,
      erro ? String(erro).slice(0, 500) : null,
      JSON.stringify(res || {}),
      jobId,
      sessaoId,
    );
  return { ok: true, resultado: res };
}

/* ---------------- lado do site ---------------- */

async function obterJob(userId, jobId) {
  if (!(await garantirTabelas())) return null;
  return getDb()
    .prepare('SELECT * FROM public.agente_jobs WHERE id = ? AND user_id = ?')
    .get(jobId, userId);
}

async function cancelarJob(userId, jobId) {
  if (!(await garantirTabelas())) return { ok: false };
  const r = await getDb()
    .prepare(
      "UPDATE public.agente_jobs SET cancelar = true WHERE id = ? AND user_id = ? AND status IN ('pendente','a_correr')",
    )
    .run(jobId, userId);
  return { ok: r.changes > 0 };
}

async function esperarJob(jobId, timeoutMs = 60000) {
  const fim = Date.now() + timeoutMs;
  while (Date.now() < fim) {
    const j = await getDb().prepare('SELECT * FROM public.agente_jobs WHERE id = ?').get(jobId);
    if (!j) return { ok: false, erro: 'Trabalho não encontrado.' };
    if (!['pendente', 'a_correr'].includes(j.status)) {
      const passos = (Array.isArray(j.logs) ? j.logs : [])
        .map((x) => String((x && x.l) || ''))
        .filter((x) => /^\[passo\]/i.test(x))
        .map((x) => x.replace(/^\[passo\]\s*/i, ''));
      return {
        ok: j.status === 'concluido',
        status: j.status,
        erro: j.erro,
        codigo: j.codigo,
        resultado: j.resultado,
        logs: j.logs,
        passos,
      };
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { ok: false, erro: 'O PC demorou demasiado a responder.', status: 'timeout' };
}

module.exports = {
  criarSessao,
  validarToken,
  autenticar,
  estado,
  encerrarSessao,
  criarJob,
  proximo,
  controlo,
  anexarLogs,
  finalizar,
  obterJob,
  cancelarJob,
  esperarJob,
};
