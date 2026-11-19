# Locaus — imagem de produção (Koyeb / qualquer host Docker)
FROM node:20-bookworm-slim

WORKDIR /app
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
