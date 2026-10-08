# Los Locaus - Site Oficial

Site oficial do canal de YouTube **Ashow e Jazer** com estatísticas, vídeos, publicações e painel admin.

## Funcionalidades

- **Hero** com estatísticas do canal (subscritores, visualizações, vídeos)
- **Vídeos** - Todos os vídeos do canal com estatísticas
- **Mais Assistidos** - Top vídeos dos últimos 30 dias
- **Estatísticas** - Visitantes online, últimos 15/30 dias e último ano
- **Publicações** - Novidades e avisos com imagens e likes
- **Painel Admin** - Login privado com senha e chave
- **Comentários** - Ver comentários de cada vídeo
- **Estatísticas de Vídeos** - Públicos, privados, não listados e apagados

## Como Instalar

### 1. Criar API Key do YouTube

1. Vai a [console.cloud.google.com](https://console.cloud.google.com)
2. Clica em **"Selecionar um projeto"** → **"Novo projeto"**
3. Dá um nome (ex: "Site Los Locaus") → **Criar**
4. No menu lateral: **"APIs e Serviços"** → **"Biblioteca"**
5. Procura **"YouTube Data API v3"** → clica → **Ativar**
6. Vai a **"APIs e Serviços"** → **"Credenciais"** → **"Criar credenciais"** → **"Chave de API"**
7. Copia a chave (começa com `AIza...`)

### 2. Encontrar o ID do Canal

1. Vai ao teu canal no YouTube
2. Clica na tua foto de perfil → **"O teu canal"**
3. No link aparece: `youtube.com/channel/UCxxxxxxxx`
4. O que vem depois de `channel/` é o **ID do canal**

### 3. Configurar o Ficheiro .env

Abre `server/.env` e preenche:

```env
YOUTUBE_API_KEY=AQUI_COLOCA_A_TUA_API_KEY
YOUTUBE_CHANNEL_ID=AQUI_COLOCA_O_ID_DO_CANAL
ADMIN_PASSWORD=tuasenhaqui
ADMIN_KEY=tua_chave_secreta_aqui
PORT=3001
```

### 4. Instalar e Correr

**Opção 1 - Script automático:**
```
INICIAR.bat
```

**Opção 2 - Manual:**
```bash
# Servidor
cd server
npm install
npm start

# Cliente (novo terminal)
cd client
npm install
npm run build
```

### 5. Aceder ao Site

Abre o browser em: **http://localhost:3001**

## Login Admin

- Clica no **boneco no canto inferior direito**
- Introduz a **senha** e **chave** que configuraste no `.env`
- Ao clicar novamente no boneco, abres o **painel admin**

## Estrutura do Projeto

```
Site Los Locaus/
├── server/           # Backend (Node.js + Express + SQLite)
│   ├── index.js      # Servidor principal
│   ├── database.js   # Base de dados SQLite
│   ├── routes/       # Rotas da API
│   └── .env          # Configuração
├── client/           # Frontend (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   └── App.jsx      # App principal
│   └── package.json
├── INICIAR.bat       # Script de instalação e início
└── README.md
```

## Tecnologies

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend:** Node.js, Express, SQLite, JWT
- **API:** YouTube Data API v3

## Limites da API

- **10.000 pedidos/dia** (gratuito)
- Cache de 5 minutos para reduzir pedidos
- Mais do que suficiente para um site de canal

## Suporte

Se tiveres problemas, verifica:
1. Se a API Key está correta
2. Se o ID do canal está correto
3. Se a YouTube Data API v3 está ativada
4. Se as portas 3000 e 3001 estão livres
