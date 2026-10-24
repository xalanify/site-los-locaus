/* ============================================================
   Fortnite — import manual do tracker.gg (TRN) + links
   ------------------------------------------------------------
   O tracker.gg (fortnitetracker.com) tem muito mais informação
   do que a API pública. Aqui guardamos o que o admin importa
   (Guardar como… → HTML/JSON) na base de dados.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const store = require('./fortnitestore');

let FIXOS = [];
try {
  FIXOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'fortnite-jogadores.json'), 'utf8'));
} catch {
  FIXOS = ['XaG2 B0Y', 'Bruno Iron Man', 'gersondelcarce'];
}

function links() {
  return FIXOS.map((nome) => ({
    nome,
    url: `https://fortnitetracker.com/profile/all/${encodeURIComponent(nome)}`,
  }));
}

/* procura recursivamente um objeto que pareça um perfil de jogador */
function acharConta(obj, prof = 0) {
  if (!obj || prof > 16) return null;
  if (Array.isArray(obj)) {
    for (const it of obj) {
      const r = acharConta(it, prof + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    const temNome =
      (obj.platformInfo && obj.platformInfo.platformUserHandle) ||
      (obj.account && (obj.account.name || obj.account.displayName)) ||
      obj.displayName ||
      obj.epicName;
    if (temNome && (obj.stats || obj.segments || obj.lifetimeStats)) return obj;
    for (const v of Object.values(obj)) {
      const r = acharConta(v, prof + 1);
      if (r) return r;
    }
  }
  return null;
}

function extrairJson(conteudo) {
  if (conteudo && typeof conteudo === 'object') return conteudo;
  const txt = String(conteudo || '');
  // __NEXT_DATA__
  const m = txt.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch {}
  }
  // JSON puro
  const ini = txt.indexOf('{');
  const fim = txt.lastIndexOf('}');
  if (ini >= 0 && fim > ini) {
    try {
      return JSON.parse(txt.slice(ini, fim + 1));
    } catch {}
  }
  return null;
}

function nomeDoHtml(conteudo) {
  const txt = String(conteudo || '');
  const t = txt.match(/<title>([^<]*)<\/title>/i);
  if (t) {
    const m = t[1].match(/^(.+?)'s\b/i);
    if (m) return m[1].trim();
  }
  return null;
}

async function importar(conteudo) {
  try {
    const atual = (await store.ler()) || { jogadores: {} };
    if (!atual.jogadores) atual.jogadores = {};

    const json = extrairJson(conteudo);
    const conta = json ? acharConta(json) : null;

    let nome = null;
    if (conta) {
      nome =
        (conta.platformInfo && conta.platformInfo.platformUserHandle) ||
        (conta.account && (conta.account.name || conta.account.displayName)) ||
        conta.displayName ||
        conta.epicName ||
        null;
    }
    if (!nome) nome = nomeDoHtml(conteudo);
    if (!nome) {
      return { ok: false, erro: 'Não encontrei o nome do jogador no ficheiro.' };
    }

    const chave = String(nome).toLowerCase();
    atual.jogadores[chave] = {
      nome,
      bruto: conta || null,
      temDados: Boolean(conta),
      importadoEm: new Date().toISOString(),
    };
    await store.guardar(atual);
    return { ok: true, nome, temDados: Boolean(conta) };
  } catch (e) {
    return { ok: false, erro: e.message || 'Não deu para importar.' };
  }
}

async function estado() {
  const d = await store.ler();
  return {
    ok: true,
    jogadores: d && d.jogadores ? Object.values(d.jogadores) : [],
    updatedAt: (d && d.updatedAt) || null,
  };
}

module.exports = { links, importar, estado, FIXOS };
