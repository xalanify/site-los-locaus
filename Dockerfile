# Locaus — imagem de produção (Koyeb / qualquer host Docker)
FROM node:20-bookworm-slim

WORKDIR /app

# Música das cartas: yt-dlp (stream do YouTube) + ffmpeg
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg python3 \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=8000

# dependências da raiz
COPY package.json package-lock.json* ./
RUN npm install --include=dev --no-audit --no-fund

# código + build do client
COPY . .
RUN npm run build

EXPOSE 8000
CMD ["npm", "start"]
