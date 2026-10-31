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

/* ---------- pesquisa alternativa (Piped) ---------- */
const PIPED = [
  'https://api.piped.private.coffee',
  'https://pipedapi.ducks.party',
  'https://pipedapi.vyper.me',
];

async function pesquisarPiped(texto, limite = 14) {
  const q = String(texto || '').trim();
  if (!q) return [];
  for (const base of PIPED) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      const r = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=videos`, {
        signal: ctrl.signal,
        headers: { accept: 'application/json' },
      });
      clearTimeout(timer);
      if (!r.ok) continue;
      const j = await r.json();
      const itens = (j.items || [])
        .filter((x) => x && x.type === 'stream' && x.url)
        .map((x) => ({
          id: String(x.url).replace('/watch?v=', ''),
          titulo: x.title || 'Sem título',
          canal: x.uploaderName || '',
          duracao: Math.max(0, Math.round(Number(x.duration) || 0)),
          thumb: x.thumbnail || null,
        }))
        .filter((x) => ID_RE.test(x.id));
      if (itens.length) return itens.slice(0, limite);
    } catch {
      /* tenta a próxima instância */
    }
  }
  return [];
}

/* ---------- pesquisa alternativa (API do YouTube, se houver chave) ---------- */
async function pesquisarYoutubeApi(texto, chave, limite = 14) {
  const q = String(texto || '').trim();
  if (!q || !chave) return [];
  const url =
    'https://www.googleapis.com/youtube/v3/search?' +
    new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: String(Math.min(20, limite)),
      q,
      key: chave,
    });
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.items || [])
    .map((it) => ({
      id: it.id && it.id.videoId,
      titulo: (it.snippet && it.snippet.title) || 'Sem título',
      canal: (it.snippet && it.snippet.channelTitle) || '',
      duracao: 0,
      thumb:
        it.snippet &&
        it.snippet.thumbnails &&
        (it.snippet.thumbnails.medium?.url || it.snippet.thumbnails.default?.url),
    }))
    .filter((x) => x.id && ID_RE.test(String(x.id)));
}

/* Pesquisa completa: yt-dlp (local) -> Piped -> API do YouTube. */
async function buscar(texto, limite = 14) {
  const q = String(texto || '').trim().slice(0, 120);
  if (!q) return [];
  const chave = q.toLowerCase();
  const guardado = cacheBusca.get(chave);
  if (guardado && Date.now() - guardado.t < CACHE_BUSCA_MS) return guardado.v;

  let v = [];
  try {
    v = await pesquisar(q, limite);
  } catch (e) {
    if (e.codigo !== 'SEM_YTDLP') console.warn('Música (yt-dlp):', e.message);
  }
  if (!v.length) v = await pesquisarPiped(q, limite);
  if (!v.length) {
    try {
      v = await pesquisarYoutubeApi(q, (process.env.YOUTUBE_API_KEY || '').trim(), limite);
    } catch {
      /* sem resultados */
    }
  }
  if (v.length) cacheBusca.set(chave, { t: Date.now(), v });
  return v;
}

module.exports = {
  pesquisar,
  pesquisarPiped,
  buscar,
  resolverAudio,
  limparCaches,
  acharYtDlp,
  ID_RE,
};
