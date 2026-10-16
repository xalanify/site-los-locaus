/* ============================================================
   Publicação automática no YouTube (opção C)

   O browser sobe o vídeo DIRETO para o YouTube (resumable) — o
   vídeo nunca passa pelo servidor, por isso o limite de 4,5 MB do
   Vercel deixa de ser problema. Aqui guardamos só o refresh token
   de cada canal e trocamos por um access token curto.

   Contas públicas (env em server/.env):

     YT_CLIENT_ID_1 / YT_CLIENT_SECRET_1 / YT_REFRESH_TOKEN_1
     YT_CHANNEL_ID_1            (opcional, só para conferir)
     ... _2 e _3 para as outras contas

     YT_UPLOADS_DIA             (limite por canal, omissão 100)

   IMPORTANTE: a quota do YouTube é POR PROJETO Google Cloud, não
   por canal. Se as 3 contas ficarem no mesmo projeto, contam
   todas para o mesmo balde de 100/dia. Para rodízio a sério,
   cada contador tem de ter o SEU projeto.
   ============================================================ */

const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const URL_VIDEOS = 'https://www.googleapis.com/youtube/v3/videos';
const ESCOPO = 'https://www.googleapis.com/auth/youtube.upload';

const httpFetch = typeof fetch === 'function' ? fetch : require('node-fetch');

/* ---------------------------------------------------------------
   Contas configuradas
   --------------------------------------------------------------- */
function publicadores() {
  const lista = [];
  for (const n of ['1', '2', '3']) {
    const cliente = process.env['YT_CLIENT_ID_' + n];
    const segredo = process.env['YT_CLIENT_SECRET_' + n];
    const refresh = process.env['YT_REFRESH_TOKEN_' + n];
    if (!cliente || !segredo || !refresh) continue;
    lista.push({
      n,
      nome: process.env['YT_NOME_' + n] || 'Canal ' + n,
      cliente,
      segredo,
      refresh,
      canal: process.env['YT_CHANNEL_ID_' + n] || null,
    });
  }
  return lista;
}

function configurado() {
  return publicadores().length > 0;
}

/* ---------------------------------------------------------------
   Contador de uploads (100/dia por omissão, bucket próprio do
   videos.insert — não vem do balde geral de 10.000 unidades)
   --------------------------------------------------------------- */
const LIMITE = Math.max(1, Number(process.env.YT_UPLOADS_DIA) || 100);

/* Meia-noite a seguir em horário de Los Angeles — é quando a quota
   do YouTube volta a zero (meia-noite PT). */
function msAteReset() {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const p = {};
    for (const part of fmt.formatToParts(new Date())) p[part.type] = part.value;
    const h = Number(p.hour) % 24;
    const m = Number(p.minute);
    const s = Number(p.second);
    const decorrido = ((h * 60 + m) * 60 + s) * 1000;
    return Math.max(60000, 86400000 - decorrido);
  } catch {
    return 86400000;
  }
}

/* Estado em memória por contador: { contados, esgotadoAte, motivo,
   token, tokenExpira } — desaparece quando o processo reinicia, o
   que só faz perder a contagem (nunca parte nada). */
const estado = [];

function slot(i) {
  if (!estado[i]) estado[i] = { contados: 0, esgotadoAte: 0, motivo: null, token: null, tokenExpira: 0 };
  return estado[i];
}

let resetEm = 0;
function garantirDia() {
  const agora = Date.now();
  if (agora >= resetEm) {
    resetEm = agora + msAteReset();
    for (const s of estado) {
      if (!s) continue;
      s.contados = 0;
      if (s.esgotadoAte && agora >= s.esgotadoAte) {
        s.esgotadoAte = 0;
        s.motivo = null;
      }
    }
  }
}

function esgotado(i) {
  const s = slot(i);
  if (s.esgotadoAte && Date.now() >= s.esgotadoAte) {
    s.esgotadoAte = 0;
    s.motivo = null;
  }
  return !!s.esgotadoAte;
}

/* ---------------------------------------------------------------
   Access token (troca do refresh token, com cache)
   --------------------------------------------------------------- */
async function tokenDe(i) {
  const pubs = publicadores();
  const p = pubs[i];
  if (!p) throw Object.assign(new Error('Contador inexistente'), { codigo: 'nao_configurado' });

  const s = slot(i);
  if (s.token && Date.now() < s.tokenExpira - 60000) return s.token;

  let r;
  try {
    r = await httpFetch(URL_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: p.cliente,
        client_secret: p.segredo,
        refresh_token: p.refresh,
        grant_type: 'refresh_token',
        // SEM o parâmetro "scope": o Google emite então o token com TODOS os
        // escopos originalmente concedidos (incl. youtube.readonly, que o
        // verificar() precisa para ler o vídeo). Se pedíssemos só o upload,
        // a videos.list devolvia 403 e o código antigo tratava isso como
        // quota esgotada — e queimava a conta do dia inteiro.
      }).toString(),
    });
  } catch (e) {
    throw Object.assign(new Error('Sem ligação ao Google: ' + e.message), { codigo: 'rede' });
  }

  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) {
    const motivo = d.error_description || d.error || 'recusa do Google';
    console.warn(`YouTube (conta ${p.n}) token falhou:`, motivo);
    // invalid_grant = refresh token revogado/expirado → aquela conta sai de circulação
    if (d.error === 'invalid_grant') {
      s.esgotadoAte = Date.now() + msAteReset();
      s.motivo = 'refresh token inválido — renova as credenciais';
    }
    throw Object.assign(new Error('Falha a autorizar a publicação (' + motivo + ')'), {
      codigo: 'token',
      conta: p.n,
    });
  }

  s.token = d.access_token;
  s.tokenExpira = Date.now() + (Number(d.expires_in) || 3600) * 1000;
  return s.token;
}

/* ---------------------------------------------------------------
   Quem publica a seguir (rodízio automático)
   --------------------------------------------------------------- */
function proximo() {
  garantirDia();
  const pubs = publicadores();
  for (let i = 0; i < pubs.length; i++) {
    if (esgotado(i)) continue;
    if (slot(i).contados >= LIMITE) {
      slot(i).esgotadoAte = Date.now() + msAteReset();
      slot(i).motivo = 'limite diário atingido';
      continue;
    }
    return i;
  }
  return null;
}

function registarUpload(i) {
  garantirDia();
  const s = slot(i);
  s.contados += 1;
  if (s.contados >= LIMITE) {
    s.esgotadoAte = Date.now() + msAteReset();
    s.motivo = 'limite diário atingido';
  }
}

/* O browser avisa quando o YouTube devolve 403/429 de quota. */
function marcarEsgotado(i, motivo) {
  const s = slot(i);
  s.esgotadoAte = Date.now() + msAteReset();
  s.motivo = motivo || 'quota esgotada';
}

/* ---------------------------------------------------------------
   Estado para o frontend (o aviso quando tudo esgota)
   --------------------------------------------------------------- */
function estadoPublico() {
  garantirDia();
  const pubs = publicadores();
  if (!pubs.length) {
    return {
      configurado: false,
      disponivel: false,
      limiteDia: LIMITE,
      restantes: 0,
      resetEm: new Date(resetEm || Date.now() + msAteReset()).toISOString(),
      contadores: [],
      aviso: null,
    };
  }

  let restantes = 0;
  const contadores = pubs.map((p, i) => {
    const s = slot(i);
    const livre = !esgotado(i) && s.contados < LIMITE;
    if (livre) restantes += LIMITE - s.contados;
    return {
      n: p.n,
      nome: p.nome,
      usados: s.contados,
      limite: LIMITE,
      esgotado: !livre,
      motivo: livre ? null : s.motivo || 'esgotado',
      livre,
    };
  });

  const disponivel = restantes > 0;
  return {
    configurado: true,
    disponivel,
    limiteDia: LIMITE,
    restantes,
    resetEm: new Date(resetEm || Date.now() + msAteReset()).toISOString(),
    contadores,
    aviso: disponivel
      ? null
      : 'As publicações automáticas esgotaram por hoje. Novas publicações ' +
        formatarReset(resetEm) +
        '.',
  };
}

function formatarReset(ms) {
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      timeZone: 'Europe/Lisbon',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return 'no próximo dia';
  }
}

/* ---------------------------------------------------------------
   Preparar a subida: devolve access token + contador escolhido
   --------------------------------------------------------------- */
async function prepararToken() {
  if (!configurado()) {
    throw Object.assign(new Error('Publicação automática por configurar.'), {
      codigo: 'nao_configurado',
    });
  }
  const i = proximo();
  if (i == null) {
    const e = estadoPublico();
    throw Object.assign(new Error(e.aviso || 'Sem publicações disponíveis por agora.'), {
      codigo: 'esgotado',
      resetEm: e.resetEm,
      aviso: e.aviso,
    });
  }
  const token = await tokenDe(i);
  return { token, contador: i, nome: publicadores()[i].nome };
}

/* ---------------------------------------------------------------
   Conferir o vídeo depois de o browser o ter subido:
   - existe mesmo?
   - é do canal esperado (quando YT_CHANNEL_ID_n está definido)?
   - ficou unlisted?
   --------------------------------------------------------------- */
async function verificar(videoId, contador) {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(String(videoId || ''))) {
    throw Object.assign(new Error('Id de vídeo inválido.'), { codigo: 'id' });
  }
  const token = await tokenDe(contador);
  const p = publicadores()[contador];
  const url =
    URL_VIDEOS +
    '?id=' +
    encodeURIComponent(videoId) +
    // sem "fields": a sintaxe de seleção que aqui estava dava
    // 400 "Invalid field selection" e o clip nunca se guardava.
    '&part=snippet,status';

  const r = await httpFetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const d = await r.json().catch(() => ({}));

  if (r.status === 403 || r.status === 429) {
    const razao = String(
      (d.error && d.error.errors && d.error.errors[0] && d.error.errors[0].reason) ||
        (d.error && d.error.status) ||
        (typeof d.error === 'string' ? d.error : '') ||
        '',
    );
    // Só a QUOTA queima a conta — qualquer outro 403 (permissões, escopo,
    // conta errada…) deixa o contador intacto e dá uma mensagem útil.
    const quota =
      r.status === 429 || /quota|ratelimit|daily.?limit|user.?rate/i.test(razao);
    if (quota) {
      marcarEsgotado(contador, 'quota esgotada no YouTube');
      throw Object.assign(new Error('A cota de publicações esgotou nesta conta.'), {
        codigo: 'esgotado',
        resetEm: estadoPublico().resetEm,
      });
    }
    if (/insufficient|forbidden|permission|access/i.test(razao)) {
      throw Object.assign(
        new Error(
          'A autorização não inclui a leitura do vídeo. Renova a autorização ' +
            '(escopos: upload e leitura).',
        ),
        { codigo: 'permissao', razao },
      );
    }
    console.warn('YouTube: verificação recusada', r.status, razao || JSON.stringify(d).slice(0, 200));
    throw Object.assign(new Error('Não foi possível confirmar o vídeo agora.'), {
      codigo: 'api',
      razao,
    });
  }
  if (!r.ok) {
    console.warn('YouTube videos.list', r.status, (d.error && d.error.message) || '');
    throw Object.assign(new Error('O vídeo não respondeu à conferência.'), { codigo: 'api' });
  }

  const item = d.items && d.items[0];
  if (!item) {
    throw Object.assign(
      new Error('O vídeo ainda não ficou disponível — espera uns segundos e tenta outra vez.'),
      { codigo: 'nao_encontrado' },
    );
  }
  if (p.canal && item.snippet && item.snippet.channelId && item.snippet.channelId !== p.canal) {
    throw Object.assign(new Error('O vídeo foi para outro canal.'), { codigo: 'canal' });
  }
  const priv = item.status && item.status.privacyStatus;
  if (priv && priv !== 'unlisted' && priv !== 'public') {
    console.warn('YouTube: vídeo', videoId, 'ficou', priv);
  }

  return {
    id: item.id,
    titulo: (item.snippet && item.snippet.title) || null,
    canal: (item.snippet && item.snippet.channelId) || null,
    privacidade: priv || null,
    thumb: (item.snippet && item.snippet.thumbnails && item.snippet.thumbnails.maxres && item.snippet.thumbnails.maxres.url) ||
      (item.snippet && item.snippet.thumbnails && item.snippet.thumbnails.default && item.snippet.thumbnails.default.url) ||
      null,
  };
}

/* ---------------------------------------------------------------
    Apagar o vídeo do clip remoto (o dono é o único que pode).

    Tenta TODOS os contadores: o vídeo pertence à conta que o subiu e
    não guardamos qual foi — cada token tenta uma vez. Se nenhum
    conseguir, devolve false e quem chamou continua (a BD segue em
    frente; nunca ficamos presos por causa do vídeo).
    --------------------------------------------------------------- */
async function apagar(videoId) {
  const id = String(videoId || '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return false;

  const pubs = publicadores();
  if (!pubs.length) return false;

  for (let i = 0; i < pubs.length; i++) {
    let token;
    try {
      token = await tokenDe(i);
    } catch {
      continue; // esta conta nem token dá — passa à seguinte
    }
    const url = URL_VIDEOS + '?id=' + encodeURIComponent(id);
    let r;
    try {
      r = await httpFetch(url, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
        signal: AbortSignal.timeout(20000),
      });
    } catch (e) {
      console.warn('Apagar vídeo remoto (rede):', e.message);
      continue;
    }
    if (r.ok) return true;
    // já não existe = também contou
    if (r.status === 404) return true;
    const d = await r.json().catch(() => ({}));
    const razao = String(
      (d.error && d.error.errors && d.error.errors[0] && d.error.errors[0].reason) ||
        (d.error && d.error.status) ||
        '',
    );
    // 403 de escopo: a autorização não tem o apagar (youtube.force-ssl)
    if (r.status === 403 && /insufficient|forbidden|scope|permission/i.test(razao)) {
      console.warn(
        'Apagar vídeo remoto: sem escopo de apagar — renova a autorização (youtube.force-ssl).',
      );
      return false;
    }
    console.warn('Apagar vídeo remoto (conta ' + pubs[i].n + ')', r.status, razao || '');
    if (r.status !== 401) continue; // 401 = token desta conta → tenta a próxima
  }
  return false;
}

/* ---------------------------------------------------------------
    Estar o vídeo pronto a reproduzir.

    Logo depois do upload o YouTube ainda está a processar: se o
    leitor carregar nesse estado aparece "We're processing this
    video" (com o título, o canal e a marca do YouTube — tudo o
    que NÃO queremos mostrar). Por isso o site pergunta primeiro
    aqui e só abre o leitor quando está "succeeded".

    O resultado fica em memória alguns minutos: repetir a pergunta
    ao mesmo vídeo não deve custar cota nenhuma.
    --------------------------------------------------------------- */
const PROCESSAMENTO = new Map(); // id -> { pronto, quando }
const PROCESSAMENTO_TTL = 60 * 1000; // 1 minuto entre perguntas

async function processado(videoId) {
  const id = String(videoId || '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return { pronto: true };

  const guardado = PROCESSAMENTO.get(id);
  if (guardado && Date.now() - guardado.quando < PROCESSAMENTO_TTL) return { pronto: guardado.pronto };

  const pubs = publicadores();
  let ultimo = true; // sem contadores -> deixa passar (o leitor tenta)
  for (let i = 0; i < pubs.length; i++) {
    let token;
    try {
      token = await tokenDe(i);
    } catch {
      continue;
    }
    const url =
      URL_VIDEOS +
      '?id=' +
      encodeURIComponent(id) +
      '&part=status,processingDetails';
    let r;
    try {
      r = await httpFetch(url, {
        headers: { Authorization: 'Bearer ' + token },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      continue;
    }
    if (r.status === 404) return { pronto: false }; // ainda não existe
    if (!r.ok) continue; // 401/403 -> tenta a conta seguinte
    const d = await r.json().catch(() => ({}));
    const item = d.items && d.items[0];
    if (!item) {
      ultimo = false;
      continue;
    }
    const estadoProc = String(
      (item.processingDetails && item.processingDetails.processingStatus) || '',
    ).toLowerCase();
    const estadoSub = String((item.status && item.status.uploadStatus) || '').toLowerCase();
    // "succeeded" = pronto; "processing"/"failed" e vazio = ainda não
    const pronto = estadoProc === 'succeeded' || estadoSub === 'processed';
    PROCESSAMENTO.set(id, { pronto, quando: Date.now() });
    // limpeza simples do mapa (não cresce para sempre)
    if (PROCESSAMENTO.size > 400) {
      for (const [k, v] of PROCESSAMENTO) {
        if (Date.now() - v.quando > 30 * 60000) PROCESSAMENTO.delete(k);
      }
    }
    return { pronto };
  }
  return { pronto: ultimo };
}

module.exports = {
  configurado,
  publicadores,
  estadoPublico,
  prepararToken,
  registarUpload,
  marcarEsgotado,
  verificar,
  apagar,
  processado,
  LIMITE,
};
