# Pôr o Locaus online de novo (sem pagar hospedagem)

O projeto da Vercel está **pausado** por excesso de “Fluid Active CPU” no plano Hobby
(até 18 de dezembro). O domínio `locaus.fun` **continua teu** — só precisas de apontar o DNS
para outro servidor. A base de dados e as fotos continuam na **Supabase** (plano gratuito).

A forma mais simples e sem alterar código: **Render (plano free)** — corre este mesmo
`server/index.js` com Express + `client/dist`, tal como corre no teu PC.

---

## 1. Render (grátis, sem cartão)

1. Cria conta em <https://render.com> (podes entrar com GitHub).
2. **New → Web Service** → escolhe o repositório `xalanify/site-los-locaus`.
3. Preenche:
   - **Name:** `locaus`
   - **Language:** Node
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
4. Em **Environment Variables**, cola as chaves que estão em `server/.env`
   (copia os valores, **não** copies `PORT` nem `VERCEL`):

```
YOUTUBE_API_KEY
YOUTUBE_CHANNEL_ID
YOUTUBE_CHANNEL_URL
ADMIN_PASSWORD
ADMIN_KEY
AGENTE_REMOTO
FC_CLUB_NAME
FC_CLUB_ID
EA_PLATFORM
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_DB_HOST
SUPABASE_DB_PORT
SUPABASE_DB_NAME
SUPABASE_DB_USER
SUPABASE_DB_PASSWORD
SITE_URL=https://www.locaus.fun
RESEND_API_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
JWT_SECRET
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
YT_CLIENT_ID_1
YT_CLIENT_SECRET_1
YT_REFRESH_TOKEN_1
YT_CHANNEL_ID_1
YT_NOME_1
YT_UPLOADS_DIA
STEAM_API_KEY
UBI_EMAIL
UBI_PASSWORD
FORTNITE_API_TOKEN
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
```

5. **Create Web Service** e espera pelo primeiro deploy.
6. O Render dá-te um endereço tipo `https://locaus-xxxx.onrender.com`.
   Abre e testa o site/API antes de mexer no domínio.

> O `render.yaml` na raiz já tem a configuração (plano free, build e start).
> Se ligares o repositório, o Render pode ler esse ficheiro automaticamente.

## 2. Domínio `locaus.fun` (na Vercel, sem custo)

O domínio está registado na Vercel. Só é preciso mudar os **DNS records**:

1. Vercel → **Domains** → `locaus.fun` → **DNS Records**.
2. Cria/edita:

| Tipo  | Nome | Valor                         |
|-------|------|-------------------------------|
| A     | `@`  | `216.24.57.1`                 |
| CNAME | `www`| `locaus-xxxx.onrender.com`    |

3. No Render → **Settings → Custom Domains**, adiciona `locaus.fun` e
   `www.locaus.fun` (o Render mostra o hostname exato para o CNAME).
4. Espera a verificação (5–30 min). O SSL é automático.

Se a Vercel não deixar editar DNS enquanto o projeto está pausado, tens duas saídas:
- Falar com o suporte da Vercel (o domínio é teu) e pedir acesso aos registos DNS; ou
- Transferir o domínio para a Cloudflare (Registrar) e gerir o DNS lá.

> Enquanto o domínio não aponta, podes usar o endereço `onrender.com` para testar.
> Nesse caso os utilizadores têm de voltar a iniciar sessão (o `localStorage` é por domínio).

## 3. Manter as previsões “ao vivo”

No Render free o serviço **adormece após 15 min sem visitas** (primeiro acesso depois
demora ~30–60 s). O plano free dá **750 horas/mês** e um mês tem ~744 h, por isso podes
manter o serviço acordado com um monitor gratuito:

- Cria um monitor em <https://cron-job.org> (ou UptimeRobot) a chamar
  `https://www.locaus.fun/api/enigma/estado` (ou `/`) a cada **10–14 minutos**.

Assim os ciclos internos (mercado a mexer, avisos de torneios, inventário CS2) continuam
a correr como no teu PC.

## 4. Alternativa gratuita (se não quiseres Render)

Correr o site no teu PC + **Cloudflare Tunnel** (grátis):
`cloudflared tunnel --url http://localhost:3001` e apontar o domínio. Funciona, mas o PC
tem de estar sempre ligado.

## Notas

- A Vercel volta a ligar sozinha a **18 de dezembro**, mas o limite pode repetir-se.
- A Supabase, o domínio e os dados dos utilizadores **não mudam**.
- O PWA instalado passa a usar o mesmo domínio; basta fechar e reabrir depois do DNS
  propagar para apanhar a versão nova.
