#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LOCAUS PC — mini-app de ligar o PC ao site
=================================================
Gera um .exe (via PyInstaller) que:
  - abre com uma janela visível (estado "A ligar… / Ligado ✓ / Desligado")
  - corre o MESMO agente que o .bat (locaus-agente.ps1) em segundo plano
  - tem um botão "Desligar" que para o agente e fecha
  - não pede admin nem instala nada

Uso:
  python gerar_exe.py            -> gera LOCAUS-PC.exe em dist/
"""
import os
import sys
import subprocess

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
os.makedirs(OUT, exist_ok=True)

# O agente PowerShell (o mesmo que o .bat usa) — embutido no .exe para
# não depender de ficheiros externos.
AGENTE_PS1 = r"""
param(
  [Parameter(Mandatory = $true)][string]$Site,
  [Parameter(Mandatory = $true)][string]$Token
)
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
$Site = $Site.TrimEnd('/')
$Headers = @{ Authorization = "Bearer $Token" }
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
$Base = Join-Path $env:LOCALAPPDATA 'LocausPC'
try { New-Item -ItemType Directory -Force -Path $Base | Out-Null } catch {}
$LogFile = Join-Path $Base 'agente.log'
function Log([string]$msg) {
  try {
    $linha = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '  ' + $msg
    Add-Content -Path $LogFile -Value $linha -Encoding UTF8 -ErrorAction SilentlyContinue
  } catch {}
}
$mutexName = 'LocausPC-' + $Token.Substring(0, [Math]::Min(24, $Token.Length))
try { $mutex = New-Object System.Threading.Mutex($false, ('Global\' + $mutexName)) }
catch { $mutex = New-Object System.Threading.Mutex($false, ('Local\' + $mutexName)) }
if (-not $mutex.WaitOne(0)) { Log 'agent already running'; exit }
function PostJson([string]$url, $obj) {
  $body = $obj | ConvertTo-Json -Depth 6 -Compress
  return Invoke-RestMethod -Uri $url -Method Post -Headers $Headers -UserAgent $UA -ContentType 'application/json' -Body $body -TimeoutSec 60
}
function ReadNew([string]$path, [ref]$pos) {
  if (-not (Test-Path -LiteralPath $path)) { return @() }
  try {
    $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    if ($fs.Length -le $pos.Value) { $fs.Close(); return @() }
    $fs.Seek($pos.Value, [System.IO.SeekOrigin]::Begin) | Out-Null
    $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
    $txt = $sr.ReadToEnd()
    $pos.Value = $fs.Position
    $sr.Close(); $fs.Close()
    if (-not $txt) { return @() }
    return @($txt -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  } catch { return @() }
}
function RunJob($job) {
  $id = [string]$job.id
  $ps1 = Join-Path $env:TEMP ("locaus-job-$id.ps1")
  $out = Join-Path $env:TEMP ("locaus-job-$id.out")
  $err = Join-Path $env:TEMP ("locaus-job-$id.err")
  foreach ($f in @($ps1, $out, $err)) { try { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue } catch {} }
  try {
    $utf8Bom = New-Object System.Text.UTF8Encoding($true)
    [System.IO.File]::WriteAllText($ps1, [string]$job.comando, $utf8Bom)
  } catch {
    Log "job ${id}: cannot write script: $($_.Exception.Message)"
    try { PostJson "$Site/api/agente/jobs/$id/fim" @{ status = 'erro'; erro = 'Nao deu para escrever o script no PC.' } | Out-Null } catch {}
    return
  }
  $proc = Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$ps1" -WindowStyle Hidden -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
  $pos = 0
  $pendentes = @()
  $limite = (Get-Date).AddSeconds(600)
  $status = 'a_correr'; $codigo = $null; $erro = $null
  while (-not $proc.HasExited) {
    $lote = ReadNew $out ([ref]$pos)
    if ($lote.Count) { $pendentes += $lote }
    if ($pendentes.Count -ge 40) {
      try { PostJson "$Site/api/agente/jobs/$id/logs" @{ logs = $pendentes } | Out-Null } catch {}
      $pendentes = @()
    }
    if ($proc.HasExited) {
      $rest = ReadNew $out ([ref]$pos)
      if ($rest.Count) { $pendentes += $rest }
      $codigo = $proc.ExitCode
      $status = 'concluido'
      if ($codigo -ne 0) { $status = 'erro'; $erro = 'Codigo de saida ' + $codigo }
      $saida = ''
      try { $saida = [System.IO.File]::ReadAllText($out) } catch {}
      if ($saida.Length -gt 400000) { $saida = $saida.Substring($saida.Length - 400000) }
      $fim = @{ status = $status; codigo = $codigo; erro = $erro; logs = @($pendentes.ToArray()); saida = $saida }
      try { PostJson "$Site/api/agente/jobs/$id/fim" $fim | Out-Null } catch { Log "job $id: final post failed" }
      Log "job $id finished: $status ($codigo)"
      break
    }
    $agora = Get-Date
    if ($agora -gt $limite) {
      Log "job $id timed out"
      try { & taskkill.exe /PID $proc.Id /T /F 2>$null | Out-Null } catch {}
      try { PostJson "$Site/api/agente/jobs/$id/fim" @{ status = 'erro'; erro = 'Demorou demasiado e foi interrompido.'; logs = @($pendentes.ToArray()) } | Out-Null } catch {}
      break
    }
    Start-Sleep -Milliseconds 450
  }
  foreach ($f in @($ps1, $out, $err)) { try { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue } catch {} }
}
Log "agent started for $Site"
$falhas = 0
while ($true) {
  try {
    $r = Invoke-RestMethod -Uri "$Site/api/agente/proximo" -Headers $Headers -UserAgent $UA -TimeoutSec 40
    $falhas = 0
    if ($r.encerrar) { Log 'agent asked to stop'; break }
    if ($r.job) { RunJob $r.job }
    else { Start-Sleep -Seconds 5 }
  } catch {
    $falhas++
    $msg = $_.Exception.Message
    if ($msg -match '401|Unauthorized') { Log 'agent token expired'; break }
    if ($msg -match '403|Forbidden|challenge|Security Checkpoint') { Log 'agent blocked by firewall; waiting 60s'; Start-Sleep -Seconds 60; continue }
    Log "poll failed ($falhas): $msg"
    if ($falhas -ge 20) { break }
    Start-Sleep -Seconds 3
  }
}
Log 'agent stopped'
"""

# O mini-app Python (a janela visível + o controlo do agente).
APP_PY = r'''# -*- coding: utf-8 -*-
"""LOCAUS PC — ligar o PC ao site (janela visível)."""
import os, sys, json, time, base64, subprocess, threading, shutil, webbrowser
import tkinter as tk
from tkinter import ttk

SITE = "https://locaus.vercel.app"
TOKEN = os.environ.get("LOCAUS_TOKEN", "")
VERSAO = "1.0"

def resource_path(rel):
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, rel)

def ler_token():
    # 1) argumento --token=...  2) ambiente  3) ficheiro .locaus-token.json
    for a in sys.argv[1:]:
        if a.startswith("--token="):
            return a.split("=", 1)[1].strip()
    if TOKEN:
        return TOKEN
    try:
        with open(os.path.expanduser("~/.locaus-token.json"), "r", encoding="utf-8") as f:
            return (json.load(f).get("token") or "").strip()
    except Exception:
        return ""

def guardar_token(tok):
    """Guarda o token da primeira ligação — nas próximas vezes o
    "Ligar ao site" funciona sem o atalho do site."""
    if not tok:
        return
    try:
        with open(os.path.expanduser("~/.locaus-token.json"), "w", encoding="utf-8") as f:
            json.dump({"token": tok, "site": SITE}, f)
    except Exception:
        pass

def pedir_token():
    """Se não há token, abre o site para o user ligar (o site gera o token)."""
    try:
        webbrowser.open(SITE + "/ligar")
    except Exception:
        pass
    return False

class App:
    def __init__(self, root):
        self.root = root
        self.token = ler_token()
        guardar_token(self.token)
        self.proc = None
        self.estado = "parado"   # parado | a_ligar | ligado | desligado
        self.erro = ""
        self._build()
        if not self.token:
            self.estado = "sem_token"
            self.erro = "Sem token. Abre o site para ligar."
            self._tick()
            return
        self._iniciar()

    def _build(self):
        self.root.title("LOCAUS PC")
        self.root.geometry("380x230")
        self.root.resizable(False, False)
        self.root.configure(bg="#0d0a16")
        # header
        hd = tk.Frame(self.root, bg="#0d0a16")
        hd.pack(fill="x", padx=18, pady=(18, 6))
        tk.Label(hd, text="LOCAUS PC", bg="#0d0a16", fg="white",
                 font=("Segoe UI", 16, "bold")).pack(side="left")
        # estado
        self.lbl = tk.Label(self.root, text="A preparar…", bg="#0d0a16",
                            fg="#c4b5fd", font=("Segoe UI", 12, "bold"), justify="left")
        self.lbl.pack(fill="x", padx=18, pady=(4, 2))
        self.detalhe = tk.Label(self.root, text="", bg="#0d0a16", fg="#9ca3af",
                                font=("Segoe UI", 9), justify="left")
        self.detalhe.pack(fill="x", padx=18, pady=(0, 10))
        # botões
        bf = tk.Frame(self.root, bg="#0d0a16")
        bf.pack(fill="x", padx=18, pady=(0, 14))
        self.btn = tk.Button(bf, text="Ligar ao site", command=self._iniciar,
                             bg="#7c3aed", fg="white", activebackground="#6d28d9",
                             activeforeground="white", relief="flat",
                             font=("Segoe UI", 10, "bold"), padx=14, pady=6,
                             cursor="hand2")
        self.btn.pack(side="left")
        self.btn2 = tk.Button(bf, text="Desligar", command=self._desligar,
                              bg="#374151", fg="white", activebackground="#4b5563",
                              activeforeground="white", relief="flat",
                              font=("Segoe UI", 10, "bold"), padx=14, pady=6,
                              cursor="hand2", state="disabled")
        self.btn2.pack(side="left", padx=(10, 0))
        tk.Label(self.root, text="Fica ligado em segundo plano. Fecha com o botão X.",
                 bg="#0d0a16", fg="#6b7280", font=("Segoe UI", 8)).pack(pady=(0, 12))

    def _set(self, estado, detalhe=""):
        self.estado = estado
        self.erro = detalhe
        self._tick()

    def _tick(self):
        cores = {"parado": "#9ca3af", "a_ligar": "#fbbf24", "ligado": "#34d399",
                 "desligado": "#9ca3af", "sem_token": "#f87171"}
        textos = {"parado": "Parado", "a_ligar": "A ligar ao site…",
                  "ligado": "Ligado ao site ✓", "desligado": "Desligado",
                  "sem_token": "Sem token"}
        self.lbl.configure(text=textos.get(self.estado, self.estado),
                           fg=cores.get(self.estado, "#9ca3af"))
        self.detalhe.configure(text=self.erro or {
            "ligado": "O site deteta este PC em segundos.",
            "a_ligar": "A comunicar…",
        }.get(self.estado, ""))
        ligado = self.estado in ("ligado", "a_ligar")
        self.btn.configure(state="disabled" if ligado else "normal",
                           text="A ligar…" if self.estado == "a_ligar" else "Ligar ao site")
        self.btn2.configure(state="normal" if ligado else "disabled")

    def _iniciar(self):
        if not self.token:
            self._set("sem_token", "Sem token. Clica para abrir o site e ligar.")
            pedir_token()
            return
        self._set("a_ligar", "A arrancar o agente…")
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        try:
            ps1 = resource_path("agente.ps1")
            cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                   "-File", ps1, "-Site", SITE, "-Token", self.token]
            self.proc = subprocess.Popen(cmd, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            # dá 6s para o agente criar a sessão e o site o ver
            time.sleep(6)
            if self.proc.poll() is None:
                self._set("ligado", "")
            else:
                self._set("desligado", "O agente terminou cedo. Verifica a internet.")
        except Exception as e:
            self._set("desligado", str(e))

    def _desligar(self):
        self._set("desligado", "A parar o agente…")
        try:
            # pede ao site para encerrar a sessão (o agente sai sozinho)
            import urllib.request
            req = urllib.request.Request(
                SITE + "/api/agente/sessao", method="DELETE",
                headers={"Authorization": "Bearer " + self.token})
            urllib.request.urlopen(req, timeout=8)
        except Exception:
            pass
        try:
            if self.proc and self.proc.poll() is None:
                self.proc.terminate()
                time.sleep(1)
                if self.proc.poll() is None:
                    self.proc.kill()
        except Exception:
            pass
        self._set("parado", "Desligado. Podes fechar.")

def main():
    root = tk.Tk()
    App(root)
    root.mainloop()

if __name__ == "__main__":
    main()
'''


def gerar():
    app_path = os.path.join(OUT, "locaus_app.py")
    ps1_path = os.path.join(OUT, "agente.ps1")
    with open(app_path, "w", encoding="utf-8") as f:
        f.write(APP_PY)
    with open(ps1_path, "w", encoding="utf-8") as f:
        f.write(AGENTE_PS1)

    exe = os.path.join(OUT, "LOCAUS-PC")
    print("A empacotar o .exe (PyInstaller)… pode demorar 1-2 min.")
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile", "--windowed", "--name", "LOCAUS-PC",
        "--add-data", f"{ps1_path};agente.ps1",
        "--distpath", OUT, "--workpath", os.path.join(OUT, "build"),
        "--specpath", os.path.join(OUT, "spec"),
        app_path,
    ]
    r = subprocess.run(cmd, cwd=OUT)
    if r.returncode != 0:
        print("PyInstaller falhou (código %d)." % r.returncode)
        return
    final = exe + ".exe"
    print("OK: " + final)


if __name__ == "__main__":
    gerar()
