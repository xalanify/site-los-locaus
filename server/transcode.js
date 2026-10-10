/* ============================================================
   Transcodificação de clips — 720p H.264 + AAC

   Depois de o vídeo chegar ao Storage, gera-se uma versão mais
   leve no máximo 720p de altura, H.264 com faststart e áudio AAC.
   Pesa menos e arranca muito mais rápido no telemóvel.

   Regras:
     - só troca se a versão nova for mesmo mais pequena;
     - se o ffmpeg não existir (ex.: função da Vercel sem o
       binário), não faz nada e o clip fica com o original;
     - nunca deixa o pedido do utilizador à espera: o trabalho
       corre em segundo plano e falha em silêncio.
   ============================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

// O binário vem do pacote ffmpeg-static (instalado no servidor).
let FFMPEG = null;
try {
  const p = require('ffmpeg-static');
  if (p && fs.existsSync(p)) FFMPEG = p;
} catch {
  FFMPEG = null;
}

const disponivel = () => Boolean(FFMPEG);

/** Corre o ffmpeg e resolve quando terminar (rejeita com o fim do log). */
function correr(args) {
  return new Promise((resolve, reject) => {
    const filho = spawn(FFMPEG, args, { windowsHide: true });
    let log = '';
    filho.stderr.on('data', (d) => {
      log = (log + d.toString()).slice(-4000);
    });
    filho.on('error', reject);
    filho.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(log.split('\n').slice(-4).join(' ') || `ffmpeg saiu com ${code}`));
    });
  });
}

/**
 * Transcodifica um vídeo em memória.
 * @param {Buffer} buffer vídeo original
 * @returns {Promise<Buffer|null>} versão mais leve, ou null se não compensar
 */
async function transcodificar(buffer) {
  if (!disponivel() || !buffer || buffer.length < 4096) return null;

  const id = crypto.randomBytes(8).toString('hex');
  const entrada = path.join(os.tmpdir(), `locaus-${id}.bin`);
  const saida = path.join(os.tmpdir(), `locaus-${id}.mp4`);

  try {
    await fs.promises.writeFile(entrada, buffer);
    await correr([
      '-y',
      '-i', entrada,
      // altura no máximo 720 (largura acompanha o formato)
      '-vf', 'scale=-2:min(720\\,ih)',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '26',
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'high',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ac', '2',
      // o cabeçalho vai para o início: o vídeo começa a dar antes de acabar de baixar
      '-movflags', '+faststart',
      '-f', 'mp4',
      saida,
    ]);

    const out = await fs.promises.readFile(saida);
    if (!out.length || out.length >= buffer.length) return null;
    return out;
  } catch (erro) {
    console.warn('Transcodificação saltou:', erro.message.slice(0, 200));
    return null;
  } finally {
    fs.promises.unlink(entrada).catch(() => {});
    fs.promises.unlink(saida).catch(() => {});
  }
}

module.exports = { disponivel, transcodificar };
