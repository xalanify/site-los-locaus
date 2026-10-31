/* ============================================================
   Música do perfil — pesquisa e áudio completos.

   Usa o yt-dlp instalado no servidor (sem API key e sem quota):
   - pesquisa: ytsearch
   - áudio: bestaudio -> URL direta do googlevideo

   As URLs do googlevideo estão presas ao IP de quem as pede, por
   isso o áudio é sempre servido pelo nosso proxy (/api/musica/stream).
   ============================================================ */
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const CACHE_BUSCA_MS = 10 * 60 * 1000;
const CACHE_AUDIO_MS = 90 * 60 * 1000;

const cacheBusca = new Map();
const cacheAudio = new Map();
const aResolver = new Map();

let binCache;
function acharYtDlp() {
  if (binCache !== undefined) return binCache;
  try {
    const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
    const saida = execFileSync(cmd, ['yt-dlp'], { encoding: 'utf8', windowsHide: true });
    const linha = String(saida)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean);
    binCache = linha || null;
  } catch {
    binCache = null;
  }
  return binCache;
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

function duracaoDe(it) {
  const n = Number(it && it.duration);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function thumbDe(it) {
  const lista = (it && it.thumbnails) || [];
  const ultima = lista[lista.length - 1];
  if (ultima && ultima.url) return ultima.url;
  return it && it.id ? `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg` : null;
}

/* ---------- pesquisa ---------- */
async function pesquisar(texto, limite = 12) {
  const q = String(texto || '').trim().slice(0, 120);
  if (!q) return [];
  const chave = q.toLowerCase();
  const guardado = cacheBusca.get(chave);
  if (guardado && Date.now() - guardado.t < CACHE_BUSCA_MS) return guardado.v;

  const bin = acharYtDlp();
  if (!bin) {
    const erro = new Error('yt-dlp não está instalado no servidor.');
    erro.codigo = 'SEM_YTDLP';
    throw erro;
  }

  const n = Math.max(1, Math.min(20, Number(limite) || 12));
  const { stdout } = await execFileAsync(
    bin,
    [
      `ytsearch${n}:${q}`,
      '--flat-playlist',
      '--dump-json',
      '--ignore-errors',
      '--no-warnings',
      '--socket-timeout',
      '15',
    ],
    { timeout: 30000, maxBuffer: 24 * 1024 * 1024, windowsHide: true },
  );

  const v = String(stdout || '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((linha) => {
      try {
        return JSON.parse(linha);
      } catch {
        return null;
      }
    })
    .filter((it) => it && ID_RE.test(String(it.id || '')))
    .map((it) => ({
      id: String(it.id),
      titulo: it.title || 'Sem título',
      canal: it.channel || it.uploader || '',
      duracao: duracaoDe(it),
      thumb: thumbDe(it),
    }));

  cacheBusca.set(chave, { t: Date.now(), v });
  if (cacheBusca.size > 120) {
    const primeira = cacheBusca.keys().next().value;
    cacheBusca.delete(primeira);
  }
  return v;
}

/* ---------- áudio ---------- */
async function resolverAudio(id) {
  const vid = String(id || '');
  if (!ID_RE.test(vid)) throw new Error('Música inválida.');

  const guardado = cacheAudio.get(vid);
  if (guardado && Date.now() - guardado.t < CACHE_AUDIO_MS) return guardado;

  if (aResolver.has(vid)) return aResolver.get(vid);

  const tarefa = (async () => {
    const bin = acharYtDlp();
    if (!bin) {
      const erro = new Error('yt-dlp não está instalado no servidor.');
      erro.codigo = 'SEM_YTDLP';
      throw erro;
    }
    const { stdout } = await execFileAsync(
      bin,
      [
        '-f',
        'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
        '-g',
        '--no-playlist',
        '--no-warnings',
        '--socket-timeout',
        '15',
        `https://www.youtube.com/watch?v=${vid}`,
      ],
      { timeout: 40000, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
    );
    const url = String(stdout || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((s) => /^https?:\/\//.test(s));
    if (!url) throw new Error('O YouTube não devolveu áudio para esta música.');
    const item = { t: Date.now(), url };
    cacheAudio.set(vid, item);
    return item;
  })();

  aResolver.set(vid, tarefa);
  try {
    return await tarefa;
  } finally {
    aResolver.delete(vid);
  }
}

function limparCaches() {
  cacheBusca.clear();
  cacheAudio.clear();
}

module.exports = { pesquisar, resolverAudio, limparCaches, acharYtDlp, ID_RE };
