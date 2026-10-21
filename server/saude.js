/* ============================================================
   Saúde do PC — corre o saude.ps1 e devolve JSON
   ------------------------------------------------------------
   Mesmo padrão do pcs.correr(): spawn do PowerShell, guarda a
   última linha como JSON. Best-effort: o que o Windows não
   deixar ler vem vazio e o site mostra "—".
   ============================================================ */
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT = path.join(__dirname, 'scripts', 'saude.ps1');
const podeLocal = () =>
  process.platform === 'win32' && !process.env.VERCEL && process.env.AGENTE_REMOTO !== '1';

let aCorrer = false;
let cache = null; // { dados, em }
const CACHE_MS = 90 * 1000; // reutiliza por 90 s

function correr() {
  return new Promise((resolve) => {
    if (!podeLocal()) {
      return resolve({ ok: false, erro: 'Este servidor não está num PC Windows.' });
    }
    // serve da cache se for fresca
    if (cache && Date.now() - cache.em < CACHE_MS) {
      return resolve({ ok: true, dados: cache.dados, cache: true });
    }
    if (aCorrer) return resolve({ ok: false, erro: 'Já há uma leitura de saúde em curso.' });
    aCorrer = true;

    const saida = [];
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT],
      { windowsHide: true },
    );

    let resolvido = false;
    const limite = setTimeout(() => {
      if (resolvido) return;
      try { proc.kill(); } catch { /* já saiu */ }
      resolvido = true; aCorrer = false;
      resolve({ ok: false, erro: 'A leitura de saúde demorou demasiado.' });
    }, 40000);

    const linha = (buf) => {
      String(buf).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((l) => saida.push(l));
    };
    proc.stdout.on('data', linha);
    proc.stderr.on('data', () => { /* avisos ignorados */ });

    proc.on('error', (e) => {
      clearTimeout(limite);
      if (resolvido) return;
      resolvido = true; aCorrer = false;
      resolve({ ok: false, erro: `Não deu para abrir o PowerShell: ${e.message}` });
    });

    proc.on('close', () => {
      clearTimeout(limite);
      if (resolvido) return;
      resolvido = true; aCorrer = false;
      let dados = null;
      for (let i = saida.length - 1; i >= 0 && !dados; i--) {
        try { dados = JSON.parse(saida[i]); } catch { /* continua */ }
      }
      if (!dados) return resolve({ ok: false, erro: 'O PowerShell não devolveu dados de saúde.' });
      cache = { dados, em: Date.now() };
      resolve({ ok: true, dados });
    });
  });
}

module.exports = { podeLocal, correr };
