/* ============================================================
   Agente PC embutido — sem .bat, sem .exe
   ------------------------------------------------------------
   O servidor local (Windows) executa os trabalhos do site
   DIRETAMENTE: o browser pede /api/pc/trabalho, o servidor
   corre o PowerShell no próprio PC e devolve os logs em
   tempo real. Nada para descarregar, nada para abrir, nada
   para autorizar — o PC "liga" ao abrir o site.

   Reaproveita o catálogo fechado de ferramentas.js (o browser
   nunca envia PowerShell livre) e o parser de programas
   instalados. Os jobs ficam em memória (perdidos ao reiniciar
   o servidor — o que é o comportamento que se queria).
   ============================================================ */
const { spawn } = require('child_process');
const os = require('os');
const ferramentas = require('./ferramentas');

const JOB_MS = 10 * 60 * 1000; // um job vive no máximo 10 min
const LIMITE_LOGS = 600;

let sequencia = 0;
const jobs = new Map(); // id -> job

/* ---------------- utilidades ---------------- */

function novoJob(job) {
  sequencia += 1;
  job.id = sequencia;
  job.criadoEm = new Date().toISOString();
  job.logs = [];
  job.status = 'pendente';
  jobs.set(job.id, job);
  return job;
}

function anexar(job, linhas, limite = LIMITE_LOGS) {
  const agora = new Date().toISOString();
  const lista = Array.isArray(linhas) ? linhas : [linhas];
  for (const l of lista) {
    const t = String(l == null ? '' : l).slice(0, 500);
    if (t) job.logs.push({ t: agora, l: t });
  }
  if (job.logs.length > limite) job.logs = job.logs.slice(-limite);
}

function publico(job, comLogs) {
  return {
    id: job.id,
    tipo: job.tipo,
    ferramentaId: job.ferramentaId || null,
    nome: job.nome,
    status: job.status,
    erro: job.erro || null,
    codigo: job.codigo ?? null,
    resultado: job.resultado || null,
    criadoEm: job.criadoEm,
    inicioEm: job.inicioEm || null,
    fimEm: job.fimEm || null,
    logs: comLogs ? job.logs : undefined,
  };
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
  if (tipo === 'tweaks') {
    return ferramentas.parseTweaks(texto);
  }
  if (tipo === 'specs' || tipo === 'saude') {
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

/* ---------------- preparação (mesmas regras do agente antigo) ---------------- */

function prepararTrabalho(payload, soAdmin) {
  const tipo = String(payload.tipo || '').trim();
  if (tipo === 'tool') {
    const p = ferramentas.preparar(String(payload.id || ''), payload.arg, soAdmin, payload.acoes);
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
  if (tipo === 'tweaks') {
    return { ...ferramentas.prepararTweaks(), tipo: 'tweaks', ferramentaId: 'tweaks' };
  }
  if (tipo === 'specs') {
    return {
      ok: true,
      tipo: 'specs',
      id: 'specs',
      ferramentaId: 'specs',
      nome: 'Ler PC (specs)',
      comando: require('fs').readFileSync(require('path').join(__dirname, 'scripts', 'lerpc.ps1'), 'utf8'),
      tempo: 75000,
    };
  }
  if (tipo === 'saude') {
    return {
      ok: true,
      tipo: 'saude',
      id: 'saude',
      ferramentaId: 'saude',
      nome: 'Saúde do PC',
      comando: require('fs').readFileSync(require('path').join(__dirname, 'scripts', 'saude.ps1'), 'utf8'),
      tempo: 40000,
    };
  }
  return { ok: false, erro: 'Trabalho desconhecido.' };
}

/* ---------------- execução ---------------- */

function correr(job) {
  job.status = 'a_correr';
  job.inicioEm = new Date().toISOString();

  const proc = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', job.comando],
    { windowsHide: true },
  );
  job.proc = proc;

  let buffer = '';
  const saida = [];
  const flush = () => {
    if (!buffer) return;
    const linhas = buffer.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    buffer = '';
    if (linhas.length) anexar(job, linhas);
  };

  proc.stdout.on('data', (b) => {
    buffer += String(b);
    const i = buffer.lastIndexOf('\n');
    if (i >= 0) {
      const completo = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      const linhas = completo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (linhas.length) anexar(job, linhas);
    }
  });
  proc.stderr.on('data', (b) => {
    const t = String(b).trim();
    if (t) anexar(job, t.slice(0, 400));
  });

  proc.on('error', (e) => {
    if (job.status !== 'a_correr') return;
    job.status = 'erro';
    job.erro = `Não deu para abrir o PowerShell: ${e.message}`;
    job.fimEm = new Date().toISOString();
    job.proc = null;
  });

  proc.on('close', (codigo) => {
    flush();
    if (job.status !== 'a_correr') return;
    const falhou = codigo && codigo !== 0;
    job.status = falhou ? 'erro' : 'concluido';
    job.codigo = codigo || 0;
    job.erro = falhou ? `O script saiu com o código ${codigo}.` : null;
    job.fimEm = new Date().toISOString();
    job.proc = null;
    const texto = saida.length ? saida.join('\n') : job.logs.map((x) => x.l).join('\n');
    job.resultado = extrairResultado(job.tipo, texto, job.logs);
  });

  // timeout de segurança
  const limite = setTimeout(() => {
    if (job.status !== 'a_correr') return;
    try { proc.kill(); } catch { /* já saiu */ }
    job.status = 'erro';
    job.erro = 'Demorou demasiado e foi interrompido.';
    job.fimEm = new Date().toISOString();
    job.proc = null;
  }, Number(job.tempo) || 180000);
  limite.unref();
}

function criarJob(payload, soAdmin) {
  if (!ferramentas.podeLocal()) {
    return { ok: false, erro: 'Este servidor não está num PC Windows.' };
  }
  const p = prepararTrabalho(payload || {}, soAdmin);
  if (!p.ok) return p;
  const job = novoJob({
    tipo: p.tipo,
    ferramentaId: p.ferramentaId || null,
    nome: p.nome || p.tipo,
    comando: p.comando,
    tempo: p.tempo || 180000,
    quem: 'site',
  });
  setImmediate(() => correr(job));
  return { ok: true, job: publico(job) };
}

function obter(id) {
  const j = jobs.get(Number(id));
  return j ? publico(j, true) : null;
}

function cancelar(id) {
  const j = jobs.get(Number(id));
  if (!j) return { ok: false };
  if (!['pendente', 'a_correr'].includes(j.status)) return { ok: false };
  if (j.proc) {
    try { j.proc.kill(); } catch { /* já saiu */ }
    j.status = 'cancelado';
    j.erro = 'Cancelado no site.';
    j.fimEm = new Date().toISOString();
    j.proc = null;
  } else {
    j.status = 'cancelado';
    j.erro = 'Cancelado no site.';
    j.fimEm = new Date().toISOString();
  }
  return { ok: true };
}

function estado() {
  const agora = Date.now();
  const ativos = [...jobs.values()].filter(
    (j) => ['pendente', 'a_correr'].includes(j.status) && agora - new Date(j.criadoEm).getTime() < JOB_MS,
  );
  return {
    ok: true,
    podeLocal: ferramentas.podeLocal(),
    online: ferramentas.podeLocal(),
    pc: {
      nome: os.hostname(),
      so: process.platform === 'win32' ? `Windows ${process.version ? '' : ''}` : process.platform,
      cpus: os.cpus().length,
      ramGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    },
    emCurso: ativos.map((j) => publico(j)),
  };
}

/* ---------------- lado do agente (PC remoto via .bat) ----------------
   O agente PowerShell (pc-agente.ps1) corre no PC do user e fala
   com estas funções: apanha o próximo trabalho do seu uid, envia
   logs a andar e o resultado no fim. Os jobs são os mesmos do modo
   local — a diferença é quem os executa (o PC do user, não o
   servidor). */

function proximo(uid) {
  const alvo = [...jobs.values()].find(
    (j) => j.status === 'pendente' && j.quem === 'agente' && j.uid === uid,
  );
  if (!alvo) return { ok: true, job: null, encerrar: false };
  alvo.status = 'a_correr';
  alvo.inicioEm = new Date().toISOString();
  return { ok: true, job: publico(alvo, true), encerrar: false };
}

function anexarLogs(id, uid, linhas) {
  const j = jobs.get(Number(id));
  if (!j || j.uid !== uid) return { ok: false, cancelar: true };
  anexar(j, linhas);
  return { ok: true, cancelar: j.cancelar };
}

function controlo(id, uid) {
  const j = jobs.get(Number(id));
  if (!j || j.uid !== uid) return { ok: false, cancelar: false, encerrar: true };
  return { ok: true, cancelar: Boolean(j.cancelar), encerrar: false };
}

function finalizar(id, uid, { status, codigo, erro, logs, saida, resultado }) {
  const j = jobs.get(Number(id));
  if (!j || j.uid !== uid) return { ok: false, erro: 'Trabalho não encontrado.' };
  if (['concluido', 'erro', 'cancelado'].includes(j.status)) return { ok: true, resultado: j.resultado };
  if (Array.isArray(logs) && logs.length) anexar(j, logs);
  const st = ['concluido', 'erro', 'cancelado'].includes(status) ? status : 'concluido';
  j.status = st;
  j.codigo = Number.isFinite(Number(codigo)) ? Number(codigo) : null;
  j.erro = erro ? String(erro).slice(0, 500) : null;
  j.fimEm = new Date().toISOString();
  j.proc = null;
  j.resultado = resultado || extrairResultado(j.tipo, saida, j.logs);
  return { ok: true, resultado: j.resultado };
}

/* limpeza periódica (jobs antigos saem da memória) */
setInterval(() => {
  const agora = Date.now();
  for (const [id, j] of jobs) {
    if (agora - new Date(j.criadoEm).getTime() > JOB_MS && !['pendente', 'a_correr'].includes(j.status)) {
      jobs.delete(id);
    }
  }
}, 60 * 1000).unref();

module.exports = { criarJob, obter, cancelar, estado, proximo, anexarLogs, controlo, finalizar };
