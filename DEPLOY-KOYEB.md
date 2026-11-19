# Locaus no Koyeb (grátis) com o domínio locaus.fun

O Render suspendeu a conta, por isso vamos para o **Koyeb**. Corre o mesmo backend
(Express + `client/dist`) num contentor Docker — já deixei o `Dockerfile` pronto.

## 1. Conta e serviço

1. <https://app.koyeb.com/auth/signup> → entra com **GitHub** (sem cartão).
2. **Create Service** → **GitHub** → autoriza e escolhe `xalanify/site-los-locaus`.
3. Configuração:
   - **Branch:** `main`
   - **Builder:** **Dockerfile** (deteta sozinho o `Dockerfile` na raiz)
   - **Instance:** `Free` (512 MB / 0.1 vCPU)
   - **Region:** `Frankfurt (fra)`
   - **Ports:** `8000` · protocolo **HTTP**
   - **Health check:** HTTP em `/` (opcional)
4. **Environment variables** → **Bulk Edit** → cola o conteúdo de **`koyeb-env.txt`**
   (tem as 42 variáveis do `server/.env`, com `SITE_URL` já certo).
   - **Não** adiciones `PORT` (o Koyeb define sozinho como 8000).
5. **Deploy** e espera. Vais receber um URL tipo
   `https://locaus-xxxx.koyeb.app` — abre e testa.

## 2. Domínio `locaus.fun`

1. No Koyeb: **Domains → Add domain** → `www.locaus.fun` (App: locaus).
   - Copia o alvo mostrado, tipo `xxxx.cname.koyeb.app`.
2. Na **Vercel → Domains → locaus.fun → DNS Records**:
   - `CNAME` · `www` → `xxxx.cname.koyeb.app`
   - `ALIAS` · `@` → `xxxx.cname.koyeb.app`
     *(a Vercel suporta ALIAS no apex — é o que resolve o “apex” que o Koyeb normalmente não aceita)*
3. Espera a verificação (5–30 min). No Koyeb clica **Refresh**; o estado passa a **Active**
   e o SSL é automático.

Se a Vercel recusar o ALIAS no apex:
- adiciona apenas `locaus.fun` como **redirect 301** para `https://www.locaus.fun`
  (Domains → Redirect) e usa o `www` como principal.

## 3. Manter “ao vivo”

No plano free (0.1 vCPU) o serviço pode adormecer. Cria um monitor grátis
(cron-job.org / UptimeRobot) a chamar `https://www.locaus.fun/api/enigma/estado`
a cada **10–14 minutos**.

## 4. Alternativa: Cloudflare Tunnel pelo teu PC

Se o Koyeb também bloquear a conta, o site pode correr no teu PC com
`cloudflared tunnel --url http://localhost:3001` (link `trycloudflare.com`), sem conta
de hosting. Para usar `locaus.fun` terias de mover o DNS para a Cloudflare.

## Notas

- `render-env.txt` e `koyeb-env.txt` têm segredos: apaga-os depois de colar no painel.
- Os dados continuam na Supabase; nada muda.
- O domínio mantém-se; só o DNS muda.
