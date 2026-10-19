/* ============================================================
   InfoAoVivo (beta 0.1) — app nativo de overlays do PC.
   O .exe compilado vive em <raiz>/InfoAoVivo/dist/InfoAoVivo.exe.

   - GET  /api/infoaovivo/status       → instalado? a correr? versão?
   - POST /api/infoaovivo/instalar     → copia para %LOCALAPPDATA%,
                                          atalho + arranca já
   - POST /api/infoaovivo/desinstalar  → mata o processo + limpa tudo
   - POST /api/infoaovivo/abrir        → lança o exe (já instalado)
   ============================================================ */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

const router = express.Router();

const exeDist = path.join(__dirname, '../../InfoAoVivo/dist/InfoAoVivo.exe');
const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const pastaApp = path.join(localAppData, 'InfoAoVivo');
const exeInstalado = path.join(pastaApp, 'InfoAoVivo.exe');

const { requireUser } = require('../middleware/auth');

function aCorrer() {
  try {
    const out = require('child_process')
      .execSync('tasklist /FI "IMAGENAME eq InfoAoVivo.exe" /FO CSV /NH', {
        windowsHide: true,
        timeout: 8000,
      })
      .toString();
    return out.toLowerCase().indexOf('infoaovivo.exe') >= 0;
  } catch {
    return false;
  }
}

/* GET /status */
router.get('/status', (req, res) => {
  try {
    const instalado = fs.existsSync(exeInstalado);
    let tamanho = null;
    if (instalado) {
      try { tamanho = fs.statSync(exeInstalado).size; } catch {}
    }
    res.json({
      ok: true,
      instalado,
      aCorrer: instalado ? aCorrer() : false,
      tamanho,
      versao: '0.1.0',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /instalar */
router.post('/instalar', requireUser, (req, res) => {
  try {
    if (!fs.existsSync(exeDist)) return res.status(500).json({ error: 'O InfoAoVivo não está no servidor.' });
    fs.mkdirSync(pastaApp, { recursive: true });
    fs.copyFileSync(exeDist, exeInstalado);
    try { fs.chmodSync(exeInstalado, 0o755); } catch {}
    /* atalho no Menu Iniciar (não é essencial, best-effort) */
    const atalhoDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const atalho = path.join(atalhoDir, 'InfoAoVivo.lnk');
    const ps = `powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${atalho}');$s.TargetPath='${exeInstalado}';$s.Save()"`;
    spawn('cmd.exe', ['/c', ps], { windowsHide: true, stdio: 'ignore' }).unref();
    /* arrancar já */
    spawn(exeInstalado, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    res.json({ ok: true, instalado: true, aCorrer: aCorrer() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /abrir */
router.post('/abrir', requireUser, (req, res) => {
  try {
    if (!fs.existsSync(exeInstalado)) return res.status(404).json({ error: 'Ainda não está instalado.' });
    if (!aCorrer()) {
      spawn(exeInstalado, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
    res.json({ ok: true, aCorrer: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /desinstalar */
router.post('/desinstalar', requireUser, (req, res) => {
  try {
    try {
      require('child_process').execSync(
        'taskkill /IM InfoAoVivo.exe /F',
        { windowsHide: true, timeout: 8000, stdio: 'ignore' },
      );
    } catch {}
    /* resposta primeiro, limpeza lenta em background */
    setTimeout(() => {
      try {
        const atalho = path.join(
          process.env.APPDATA || '',
          'Microsoft', 'Windows', 'Start Menu', 'Programs', 'InfoAoVivo.lnk',
        );
        if (atalho && fs.existsSync(atalho)) fs.unlinkSync(atalho);
        const cmd = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v InfoAoVivo /f`;
        spawn('cmd.exe', ['/c', cmd], { windowsHide: true, stdio: 'ignore' }).unref();
        fs.rmSync(pastaApp, { recursive: true, force: true });
      } catch {}
    }, 300);
    res.json({ ok: true, instalado: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
