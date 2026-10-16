/* ============================================================
   trackerbrowser — ler o tracker.gg SEM chave (Brave/Edge + CDP pipes)
   ------------------------------------------------------------
   A API pública api.tracker.gg devolve EXATAMENTE o mesmo JSON
   da API oficial (public-api.tracker.gg), mas o Cloudflare
   bloqueia clientes de programa (Node, curl, PowerShell → 403).
   O que funciona na máquina é pedir com um browser a sério:

     - abre o Brave (preferido) / Edge fora do ecrã (-32000, -32000),
     - conduz-o por CDP nos pipes (--remote-debugging-pipe:
       JSON terminado em \0 nos file descriptors 3 e 4),
     - carrega a página do jogador em r6.tracker.network e,
       de dentro dela, faz fetch() à API → 200.

   Quem usa: server/r6auto.js (buscarJogador sem TRACKER_API_KEY).
   Sem browser Chromium: rejeita com "sem browser disponível".
   ============================================================ */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/** perfil persistente — guarda os cookies e evita desafios a cada vez */
const PERFIL = path.join(os.tmpdir(), 'aj-tracker-perfil');
const TIMEOUT_PADRAO = 60000;
const OCIOSO_MS = 30000;

let emCurso = false;
let instancia = null; // { processo, cdp, sessionId, targetId }
let ocioso = null;

process.once('exit', () => matarArvore(instancia && instancia.processo.pid));

const dormir = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

/** reserva: mata o browser e os filhos todos (renderers, GPU) */
function matarArvore(pid) {
  if (!pid) return;
  try {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } catch { /* já não há nada a fazer */ }
}

/* ---------- onde está o browser (Brave > Edge) ---------- */
function encontrarBrowser() {
  // 1) Brave - preferido para R6
  const brave = encontrarBrave();
  if (brave) return { bin: brave, nome: 'Brave' };

  // 2) Edge - fallback
  const edge = encontrarEdge();
  if (edge) return { bin: edge, nome: 'Edge' };

  return null;
}

function encontrarBrave() {
  const candidatos = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  ].filter(Boolean);
  for (const c of candidatos) {
    try { if (fs.existsSync(c)) return c; } catch { /* segue */ }
  }
  for (const raiz of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean)) {
    const achou = procurarBin(raiz, 'brave.exe', 4);
    if (achou) return achou;
  }
  return null;
}

function encontrarEdge() {
  const candidatos = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA]
    .filter(Boolean)
    .map((b) => path.join(b, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  for (const c of candidatos) {
    try { if (fs.existsSync(c)) return c; } catch { /* segue */ }
  }
  for (const raiz of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles].filter(Boolean)) {
    const achou = procurarBin(raiz, 'msedge.exe', 5);
    if (achou) return achou;
  }
  return null;
}

function procurarBin(dir, nomeBin, niveis) {
  if (niveis < 0) return null;
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return null; }
  for (const e of entradas) {
    if (e.isFile() && e.name.toLowerCase() === 'brave.exe') return path.join(dir, e.name);
  }
  for (const e of entradas) {
    if (!e.isDirectory()) continue;
    const achou = procurarBin(path.join(dir, e.name), nomeBin, niveis - 1);
    if (achou) return achou;
  }
  return null;
}

/* ---------- cliente CDP sobre os pipes (sem WebSocket) ---------- */
function criarCdp(processo) {
  const entrada = processo.stdio[3];
  const saida = processo.stdio[4];
  let buffer = '';
  let proxId = 1;
  let morto = null;
  const pendentes = new Map();
  const ouvintes = [];

  const falharTudo = (erro) => {
    if (morto) return;
    morto = erro;
    for (const [, p] of pendentes) {
      clearTimeout(p.timer);
      p.rejeitar(erro);
    }
    pendentes.clear();
  };

  if (saida && typeof saida.setEncoding === 'function') saida.setEncoding('utf8');
  if (saida) {
    saida.on('data', (pedaco) => {
      buffer += pedaco;
      let i;
      while ((i = buffer.indexOf('\0')) >= 0) {
        const bruto = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        if (!bruto.trim()) continue;
        let msg;
        try { msg = JSON.parse(bruto); } catch { continue; }
        if (msg.id != null && pendentes.has(msg.id)) {
          const p = pendentes.get(msg.id);
          pendentes.delete(msg.id);
          clearTimeout(p.timer);
          if (msg.error) p.rejeitar(new Error(msg.error.message || 'o browser devolveu erro'));
          else p.resolver(msg.result || {});
        } else if (msg.method) {
          for (const o of [...ouvintes]) {
            if (o.metodo === msg.method) {
              try { o.fn(msg); } catch { /* ouvinte maluco não pode partir a leitura */ }
            }
          }
        }
      }
    });
    saida.on('end', () => falharTudo(new Error('o browser fechou')));
    saida.on('error', () => falharTudo(new Error('o browser fechou')));
  }
  if (entrada) {
    entrada.on('error', () => falharTudo(new Error('não deu para falar com o browser')));
  }

  return {
    morto: () => morto,
    adicionar(metodo, fn) {
      const o = { metodo, fn };
      ouvintes.push(o);
      return () => { const i = ouvintes.indexOf(o); if (i >= 0) ouvintes.splice(i, 1); };
    },
    enviar(metodo, params = {}, sessionId = null, timeoutMs = 30000) {
      return new Promise((resolver, rejeitar) => {
        if (morto) return rejeitar(morto);
        const id = proxId++;
        const msg = { id, method: metodo, params };
        if (sessionId) msg.sessionId = sessionId;
        const timer = setTimeout(() => {
          pendentes.delete(id);
          rejeitar(new Error(`o browser não respondeu a ${metodo}`));
        }, Math.max(1000, timeoutMs));
        pendentes.set(id, { resolver, rejeitar, timer });
        try {
          entrada.write(JSON.stringify(msg) + '\0', (erro) => {
            if (erro && pendentes.has(id)) {
              pendentes.delete(id);
              clearTimeout(timer);
              rejeitar(new Error('não deu para falar com o browser'));
            }
          });
        } catch {
          pendentes.delete(id);
          clearTimeout(timer);
          rejeitar(new Error('não deu para falar com o browser'));
        }
      });
    },
    fechar(erro) { falharTudo(erro || new Error('browser fechado')); },
  };
}

/* ---------- abrir / fechar o browser ---------- */
async function abrirInstancia() {
  const browser = encontrarBrowser();
  if (!browser) {
    const e = new Error('sem Brave nem Edge disponíveis');
    e.tipo = 'sem-browser';
    throw e;
  }
  const { bin, nome } = browser;
  try { fs.mkdirSync(PERFIL, { recursive: true }); } catch { /* se não der, o browser que se desenjeite */ }

  const processo = spawn(
    bin,
    [
      '--remote-debugging-pipe',
      `--user-data-dir=${PERFIL}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-position=-32000,-32000',
      '--window-size=900,700',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
  );

  const cdp = criarCdp(processo);
  let saiuCedo = null;
  processo.once('exit', (codigo) => {
    const erro = new Error(
      codigo === 0 || codigo == null ? `o ${nome} fechou` : `o ${nome} saiu de repente (código ${codigo})`,
    );
    saiuCedo = erro;
    cdp.fechar(erro);
  });
  processo.once('error', (e) => {
    const erro = new Error(`não deu para abrir o ${nome}: ${e.message}`);
    saiuCedo = erro;
    cdp.fechar(erro);
  });

  const inst = { processo, cdp, sessionId: null, targetId: null, nome };
  try {
    if (processo.exitCode != null) throw saiuCedo || new Error(`o ${nome} não arrancou`);
    const { targetId } = await cdp.enviar('Target.createTarget', { url: 'about:blank' }, null, 30000);
    inst.targetId = targetId;
    const { sessionId } = await cdp.enviar(
      'Target.attachToTarget',
      { targetId, flatten: true },
      null,
      15000,
    );
    inst.sessionId = sessionId;
    await cdp.enviar('Page.enable', {}, sessionId, 15000);
    await cdp.enviar('Runtime.enable', {}, sessionId, 15000);
    return inst;
  } catch (e) {
    matarArvore(processo.pid);
    cdp.fechar(e);
    if (processo.exitCode != null && /Brave|Edge/.test(e.message)) throw e;
    throw new Error(`${e.message} (perfil: ${PERFIL})`);
  }
}

async function fecharInstancia() {
  if (ocioso) { clearTimeout(ocioso); ocioso = null; }
  const inst = instancia;
  instancia = null;
  if (!inst) return;
  const { processo, cdp } = inst;
  if (processo.exitCode == null) {
    try {
      await Promise.race([cdp.enviar('Browser.close', {}, null, 4000), dormir(4500)]);
    } catch { /* já tratamos por baixo */ }
    if (processo.exitCode == null) {
      await Promise.race([
        new Promise((r) => processo.once('exit', r)),
        dormir(2500),
      ]);
    }
    if (processo.exitCode == null) matarArvore(processo.pid);
  }
  cdp.fechar(new Error('browser fechado'));
}

function agendarFecho() {
  if (ocioso) clearTimeout(ocioso);
  ocioso = setTimeout(() => { fecharInstancia().catch(() => {}); }, OCIOSO_MS);
  if (typeof ocioso.unref === 'function') ocioso.unref();
}

/* ---------- o que vamos pedir ---------- */
function montarUrl(urlOuCaminho) {
  const s = String(urlOuCaminho || '').trim();
  if (!s) throw new Error('sem URL para ler do tracker');
  if (/^https?:\/\//i.test(s)) return s;
  return `https://api.tracker.gg${s.startsWith('/') ? s : `/${s}`}`;
}

function nomeDaUrl(url) {
  const m = String(url).match(/\/profile\/[^/]+\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

const paginaDoJogador = (nome) =>
  nome
    ? `https://r6.tracker.network/r6siege/profile/ubi/${encodeURIComponent(nome)}/overview`
    : 'https://r6.tracker.network/';

async function navegar(inst, url, tempoMs) {
  const { cdp, sessionId } = inst;
  let remover = null;
  const carregou = new Promise((resolver) => {
    remover = cdp.adicionar('Page.loadEventFired', (msg) => {
      if (!sessionId || !msg.sessionId || msg.sessionId === sessionId) resolver();
    });
  });
  try {
    const res = await cdp.enviar('Page.navigate', { url }, sessionId, Math.min(30000, tempoMs));
    if (res.errorText) throw new Error(`não deu para abrir a página (${res.errorText})`);
    await Promise.race([carregou, dormir(Math.min(30000, Math.max(1000, tempoMs)))]);
    await dormir(3500);
  } finally {
    if (remover) remover();
  }
}

async function lerFetch(inst, url, tempoMs) {
  const { cdp, sessionId } = inst;
  const expressao =
    `fetch(${JSON.stringify(url)}, ` +
    `{headers:{accept:'application/json'}, credentials:'include'})` +
    `.then(r=>r.text().then(t=>({status:r.status, texto:t})))`;
  const res = await cdp.enviar(
    'Runtime.evaluate',
    { expression: expressao, awaitPromise: true, returnByValue: true },
    sessionId,
    Math.max(5000, tempoMs),
  );
  if (res.exceptionDetails) {
    const d =
      (res.exceptionDetails.exception && res.exceptionDetails.exception.description) ||
      res.exceptionDetails.text ||
      'erro';
    throw new Error(`o fetch falhou no browser (${String(d).slice(0, 140)})`);
  }
  const valor = res.result && res.result.value;
  if (!valor || typeof valor.status !== 'number') throw new Error('resposta vazia do tracker');
  if (valor.status !== 200) throw new Error(`tracker respondeu ${valor.status}`);
  try {
    return JSON.parse(valor.texto);
  } catch {
    throw new Error('tracker devolveu JSON inválido');
  }
}

/**
 * Lê uma URL/caminho da API do tracker.gg através do Brave/Edge local.
 * `nomeJogador` serve para abrir a página de origem (cookies do tracker).
 * Tenta Brave primeiro; se falhar, faz fallback para Edge.
 * Rejeita com erro em PT; só uma leitura de cada vez.
 */
async function buscarJson(urlOuCaminho, nomeJogador, timeoutMs = TIMEOUT_PADRAO) {
  if (emCurso) throw new Error('já há uma leitura do tracker em curso');
  emCurso = true;
  try {
    const limite = Date.now() + (Number(timeoutMs) > 0 ? Number(timeoutMs) : TIMEOUT_PADRAO);
    const resta = () => Math.max(3000, limite - Date.now());
    const url = montarUrl(urlOuCaminho);
    const nome = String(nomeJogador || '').trim() || nomeDaUrl(url);

    // tenta Brave, depois Edge
    const browsers = ['Brave', 'Edge'];
    let ultimoErro = null;

    for (const browserNome of browsers) {
      if (Date.now() > limite) break;
      try {
        if (ocioso) { clearTimeout(ocioso); ocioso = null; }

        if (instancia && instancia.nome !== browserNome) {
          await fecharInstancia();
        }

        let inst = instancia;
        if (!inst || inst.processo.exitCode != null || inst.cdp.morto()) {
          await fecharInstancia();
          inst = await abrirInstancia(browserNome);
          instancia = inst;
        }

        await navegar(inst, paginaDoJogador(nome), resta());
        const json = await lerFetch(inst, url, resta());
        return json;
      } catch (e) {
        ultimoErro = e;
        await fecharInstancia();
      }
    }

    throw ultimoErro || new Error('falha em todos os browsers');
  } finally {
    emCurso = false;
    if (instancia) agendarFecho();
  }
}

module.exports = { buscarJson };