#!/usr/bin/env bash
# ============================================================
#  Locaus na Oracle Cloud (Always Free) — Ubuntu 22.04 / 24.04
#
#  Uso:
#    cd /opt/locaus
#    bash deploy/oracle-setup.sh locaus.fun
#
#  Instala tudo, compila o React, arranca o Node com PM2 e
#  configura o HTTPS do Caddy. Pode ser corrido outra vez
#  (é idempotente) para atualizar.
# ============================================================
set -euo pipefail

DOMINIO="${1:-locaus.fun}"
PORTA="${PORTA:-3001}"
DESTINO="${DESTINO:-/opt/locaus}"
UTILIZADOR="$(id -un)"
ORIGEM="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Locaus: $DESTINO  |  domínio: $DOMINIO  |  porta: $PORTA"

# ---------- 1. Pacotes base ----------
echo "==> Pacotes base"
sudo apt-get update -y
sudo apt-get install -y \
  curl git ca-certificates rsync build-essential ffmpeg \
  debian-keyring debian-archive-keyring apt-transport-https gnupg

# ---------- 2. Node.js 22 ----------
if ! command -v node >/dev/null 2>&1; then
  echo "==> Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "==> Node.js já instalado: $(node -v)"
fi

# ---------- 3. yt-dlp (música do YouTube) ----------
if ! command -v yt-dlp >/dev/null 2>&1; then
  echo "==> yt-dlp"
  case "$(uname -m)" in
    aarch64|arm64) BINARIO="yt-dlp_linux_aarch64" ;;
    *)             BINARIO="yt-dlp_linux" ;;
  esac
  sudo curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$BINARIO" \
    -o /usr/local/bin/yt-dlp
  sudo chmod +x /usr/local/bin/yt-dlp
else
  echo "==> yt-dlp já instalado: $(yt-dlp --version 2>/dev/null | head -1)"
fi

# ---------- 4. Firewall local (80/443) ----------
# As imagens Ubuntu da Oracle trazem iptables com um REJECT no fim: sem isto
# o Caddy consegue correr mas o site não abre nem emite certificado.
echo "==> Firewall (80/443)"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null 2>&1 || true
for P in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$P" -j ACCEPT >/dev/null 2>&1; then
    sudo iptables -I INPUT 1 -p tcp --dport "$P" -j ACCEPT
  fi
done
sudo netfilter-persistent save >/dev/null 2>&1 || true

# ---------- 5. Caddy (HTTPS automático) ----------
if ! command -v caddy >/dev/null 2>&1; then
  echo "==> Caddy"
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
else
  echo "==> Caddy já instalado: $(caddy version | head -1)"
fi

# ---------- 6. Código em /opt/locaus ----------
if [ "$ORIGEM" != "$DESTINO" ]; then
  echo "==> A copiar $ORIGEM -> $DESTINO"
  sudo mkdir -p "$DESTINO"
  sudo rsync -a --delete \
    --exclude node_modules --exclude client/dist --exclude .git \
    --exclude 'server/.env' \
    "$ORIGEM"/ "$DESTINO"/
  sudo chown -R "$UTILIZADOR":"$UTILIZADOR" "$DESTINO"
fi
cd "$DESTINO"

# ---------- 7. .env ----------
if [ ! -f "$DESTINO/server/.env" ]; then
  echo ""
  echo "!! Falta $DESTINO/server/.env"
  echo "   Copia o teu server/.env do PC (ver DEPLOY-ORACLE.md, passo 6) e corre outra vez."
  echo ""
  exit 1
fi

# Garante PORT e SITE_URL corretos
if grep -q '^PORT=' server/.env; then
  sed -i "s|^PORT=.*|PORT=$PORTA|" server/.env
else
  echo "PORT=$PORTA" >> server/.env
fi
if grep -q '^SITE_URL=' server/.env; then
  sed -i "s|^SITE_URL=.*|SITE_URL=https://$DOMINIO|" server/.env
else
  echo "SITE_URL=https://$DOMINIO" >> server/.env
fi

# ---------- 8. Dependências + build ----------
echo "==> Dependências do servidor"
(cd server && npm ci --omit=dev --no-audit --no-fund 2>/dev/null || npm install --omit=dev --no-audit --no-fund)

echo "==> Dependências da raiz"
npm ci --omit=dev --no-audit --no-fund 2>/dev/null || npm install --omit=dev --no-audit --no-fund

echo "==> Build do React (client/dist)"
npm run build

# ---------- 9. PM2 ----------
if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> PM2"
  sudo npm install -g pm2 --no-audit --no-fund
fi

echo "==> A arrancar o servidor"
pm2 delete locaus >/dev/null 2>&1 || true
PORT="$PORTA" pm2 start server/index.js \
  --name locaus \
  --time \
  --max-memory-restart 900M \
  --update-env
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$UTILIZADOR" --hp "$HOME" >/dev/null 2>&1 || true

# ---------- 10. Caddy ----------
echo "==> Configurar o Caddy"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
{
	email contacto@$DOMINIO
}

www.$DOMINIO {
	redir https://$DOMINIO{uri} permanent
}

$DOMINIO {
	encode zstd gzip

	@assets path /assets/*
	header @assets Cache-Control "public, max-age=31536000, immutable"

	@sw path /sw.js /manifest.webmanifest
	header @sw Cache-Control "no-cache"

	reverse_proxy 127.0.0.1:$PORTA
}
EOF

sudo systemctl enable caddy >/dev/null 2>&1 || true
sudo systemctl restart caddy
sleep 2

# ---------- 11. Teste ----------
echo ""
echo "==> Teste local"
CODIGO="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/" || true)"
echo "    GET http://127.0.0.1:$PORTA/ -> $CODIGO"
echo ""
echo "==> Pronto."
echo "    Falta só apontar o DNS de $DOMINIO para o IP desta VM (DEPLOY-ORACLE.md, passo 8)."
echo "    Logs: pm2 logs locaus --lines 100"
