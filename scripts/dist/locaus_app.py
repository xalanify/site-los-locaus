# -*- coding: utf-8 -*-
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
