# Plano de hospedagem — de hoje até depois de 18 dez

Três fases, uma só ideia: **o site nunca fica em baixo** e o `locaus.fun` aponta
sempre para o sítio que está a funcionar.

| Fase | Quando | Onde corre | Custo |
|---|---|---|---|
| **A** | agora → ~18 dez | **Railway** (já online) + DNS na Cloudflare | trial (grátis até ~20 dez) |
| **B** | 18 dez → Oracle pronta | **Oracle Always Free** (se o signup resolver) | 0 € |
| **C** | alternativa à B | **Vercel "leve"** (frontend + API com cache) | 0 € (com limites) |

Mudar de fase = mudar **um registo DNS**. Nada é apagado, a base de dados
(Supabase) é sempre a mesma.

---

## ✅ Estado real (28 nov 2026) — já feito e a funcionar

| Peça | Onde | Valor |
|---|---|---|
| DNS | Cloudflare (zona `locaus.fun`, plano Free) | nameservers da Cloudflare |
| `www.locaus.fun` | CNAME → `yxfk4fkx.up.railway.app` (**proxied**) | **domínio principal** |
| `locaus.fun` | CNAME → `www.locaus.fun` (proxied) + Redirect Rule `301` | só redireciona |
| `_railway-verify.www` | TXT com o token do Railway | verificação de posse |
| SSL Cloudflare | `Full` + Always Use HTTPS | — |
| Regra extra | `X-Forwarded-Host: www.locaus.fun` | para a app gerar URLs certos |
| Railway | 1 custom domain (`www.locaus.fun`), porta 8080 | plano Hobby |
| `locaus-production.up.railway.app` | **removido** | já não é usado |

### Porque o `www` é o principal (e não o apex)

As PWAs já instaladas ficam **amarradas ao domínio de origem** (o manifesto usa
`start_url: "/"` e `scope: "/"`). Como antes o site vivia em `www.locaus.fun`,
manter o `www` como principal evita que a app caia num *Custom Tab* (barra preta
com X e menu do Chrome em vez de ecrã inteiro). O apex faz `301` → www.

### Certificado do Railway: o truque que resolveu o 404

Sintoma: `404 Application not found` + `x-railway-fallback: true`, mesmo com o
domínio "verificado" no painel. Causa: o certificado ficava preso em
`VALIDATING_OWNERSHIP` porque o proxy laranja da Cloudflare impedia o desafio ACME.

Receita (repetir se voltar a acontecer numa renovação):

1. Cloudflare → pôr o CNAME em **DNS only** (nuvem cinzenta).
2. Railway → `customDomainIssueCertificate` (ou o botão no painel).
3. Esperar `certificateStatus = VALID` (~20 s).
4. Cloudflare → voltar a ligar o proxy (laranja) e limpar a cache.

### 18 dez — voltar à Vercel

O plano é o da **FASE C** abaixo: frontend estático na Cloudflare Pages + só a API
na Vercel, polling mais lento/parado com o separador escondido e cache de CDN nos
GET públicos. Antes de migrar, medir o CPU por rota na Vercel (C7) para confirmar
que fica bem abaixo do limite do Hobby.

---

# FASE A — `locaus.fun` no Railway (hoje)

O Railway já serve o site em `locaus-production.up.railway.app`. Falta o domínio.
Como a Vercel bloqueou os registos DNS, o DNS vai para a **Cloudflare** (grátis).

## A1. Cloudflare

1. <https://dash.cloudflare.com/sign-up>
2. <https://dash.cloudflare.com/?to=/:account/add-site> → `locaus.fun` → **Free**
3. Guarda os **2 nameservers** que aparecem (ex.: `ada.ns.cloudflare.com`).

## A1-bis. Se não conseguires criar conta na Cloudflare

Qualquer DNS com nameservers próprios serve — mas há uma limitação técnica
importante: o `locaus.fun` é **apex** (domínio sem subdomínio) e o Railway exige
**CNAME flattening / ALIAS** no apex. Sem isso só dá com registos `A` (IP), que o
Railway pode mudar sem aviso.

| Fornecedor | Apex → Railway | Notas |
|---|---|---|
| **Cloudflare** | ✅ CNAME flattening nativo | grátis, o único fiável para isto |
| **Vercel** (esperar) | ✅ ALIAS | só depois de **18 dez** |
| **deSEC** | ❌ (só `A` com IP) | grátis, open-source, mas CNAME no apex é proibido |
| **Hurricane Electric** | ❌ (só `A` com IP) | grátis, mas a própria Railway diz que não suporta |

### deSEC (passo a passo, com registo `A`)

1. Cria conta em <https://desec.io/signup> (e-mail + palavra-passe, sem cartão).
2. **Domains → Add Domain** → `locaus.fun` → guarda os nameservers indicados.
3. Na Vercel, **Nameservers → Edit** → cola os da deSEC.
4. Espera ficar ativo (5 min – 24 h).
5. Cria:
   - `TXT` `_railway-verify` → valor do Railway
   - `A` `@` → `153.52.255.96` (IP atual de `locaus-production.up.railway.app`)
   - `CNAME` `www` → `locaus-production.up.railway.app.`

⚠️ Se o Railway mudar de IP, o site cai até se atualizar o registo `A`. É a
solução "para já", não a definitiva.

### Sem DNS nenhum (zero contas)

Até **18 dez** usa-se `locaus-production.up.railway.app`; nesse dia a Vercel
desbloqueia e crias lá o `ALIAS`/`CNAME` para o Railway. Perdes o domínio próprio
durante um mês, mas não crias conta nenhuma.

## A2. Nameservers na Vercel (continua a ser o registador)

1. <https://vercel.com/dashboard/domains> → `locaus.fun` → **Nameservers → Edit**
2. Substitui `ns1/ns2.vercel-dns.com` pelos 2 da Cloudflare → **Save**
3. Espera **Active** (5 min – algumas horas).

## A3. Domínio no Railway

1. <https://railway.app/dashboard> → projeto → serviço **locaus**
2. **Settings → Networking → Custom Domain** → `locaus.fun`
3. O Railway mostra:
   - um **CNAME** de destino (tipo `locaus-production.up.railway.app`)
   - um **TXT** de verificação (`_railway-verify` + valor)
4. **Copia os dois** (print serve) e manda-mos.

## A4. Registos na Cloudflare

Primeiro **apaga** os registos que a Cloudflare importou da Vercel
(`cname.vercel-dns-017.com`, `76.76.21.21`). Depois cria:

| Type | Name | Content | Proxy |
|---|---|---|---|
| `TXT` | `_railway-verify` | valor que o Railway deu | — |
| `CNAME` | `@` | destino do Railway | **DNS only** (cinzento) |
| `CNAME` | `www` | `locaus.fun` | DNS only |

> Nos planos grátis o Railway permite **1 domínio** — por isso o `www` é
> redirecionado para `locaus.fun` com uma ** Redirect Rule** da Cloudflare:
> *Rules → Redirect Rules → If hostname = www.locaus.fun → Static redirect
> https://locaus.fun/$1 (301)*.

## A5. Verificar

```bash
curl -I https://locaus.fun
curl -s https://locaus.fun/api/enigma/estado
```

No browser: home, `/cartas`, `/enigmas`, login, PWA. Se o certificado ainda não
aparecer, espera 5–10 min (Railway emite sozinho).

## A6. Atualizar o que está no ar

O Railway está no commit **`e38633a`** (versão antiga). Para o site mostrar as
cartas novas, o 3D, a marca de água, o chat novo e o enigma 2:

```powershell
cd "D:\execs\Site Los Locaus"
git add -A
git commit -m "cartas novas, 3D, marca de agua, enigma 2"
git push
```

O Railway faz deploy automático do `main`. (Sem isto, o domínio funciona, mas com
o site antigo.)

## A7. Quando a Oracle estiver pronta

Só muda **um registo**: `CNAME @` → `A @` com o IP da VM. Depois apaga o serviço
do Railway. Ver `DEPLOY-ORACLE.md`.

---

# FASE C — Vercel "leve" (18 dez em diante)

O que te pausou não foi tráfego: foi **Fluid Active CPU** acima das ~4 h/mês do
Hobby. Isso vem de três coisas:

1. **Muitos pedidos pequenos e frequentes** (polling do chat, online, live, previsões…).
2. **Cada pedido acorda a função Express** (cold start + `pg` + módulos pesados).
3. **Tudo passa pela função**, incluindo coisas que podiam estar em cache.

Plano para ficar muito abaixo do limite — por ordem de impacto:

## C1. Pôr o frontend na Cloudflare Pages (grátis, ilimitado)

O React é estático (`client/dist`). Na Cloudflare Pages fica servido de CDN, **sem
tocar na Vercel**. Na Vercel fica só a API (`api.locaus.fun`) — o consumo de CPU
passa a ser só das chamadas `/api`.

- Build: `npm run build` → output `client/dist`
- Domínio: `locaus.fun` (Pages) e `api.locaus.fun` (Vercel)
- Ganho: 100% do tráfego de HTML/JS/CSS/imagens deixa de gastar CPU.

## C2. Polling inteligente no cliente

Hoje há dezenas de `setInterval` (15 s, 30 s, 60 s). Passar a:

- **parar quando o separador está escondido** (`document.visibilitychange`);
- intervalos maiores (chat 15→20 s, online 30→60 s, admin 10→30 s);
- **um só pedido de arranque** por página em vez de 3–4 em paralelo;
- `If-None-Match` / `ETag` para receber `304` (sem corpo, sem CPU de serialização).

Ganho estimado: 40–70% menos invocações.

## C3. Cache de CDN nos GET públicos

Nos endpoints que todos podem ver (`/api/mercado`, `/api/cartas`, `/api/enigma/estado`,
listas de torneios/previsões):

```js
res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
```

Com isto a Vercel **nem executa a função** enquanto a resposta está em cache. Um
pedido por 30 s em vez de um por visitante.

## C4. Tirar o trabalho periódico da Vercel

Já está desligado em produção (`if (!IS_VERCEL)`): mercado a mexer preços, inventário
CS2, avisos de torneios. Passar isso para **Supabase pg_cron**
(`select cron.schedule(...)`) ou calcular no momento da leitura. A Vercel deixa de
gastar CPU em ciclos.

## C5. Cold starts mais leves

- `require()` preguiçoso de `bcryptjs`, `nodemailer`, `web-push`, `ffmpeg` — só nas
  rotas que precisam.
- Evitar ler ficheiros grandes na inicialização.
- Usar o **pooler** da Supabase (porta `6543`, já configurado) para não abrir
  ligações novas a cada pedido.

## C6. Imagens e vídeos

- Converter PNG/GIF grandes para **WebP** (os de 2–8 MB — `nukecs2.png`, `gta5.gif`…).
- Cache longa para `/assets/*` (já tem hash no nome) e para `/cartas/*`.
- Cloudflare serve as imagens em cache; a Vercel nunca as toca.

## C7. Medir

Vercel → **Observability → Functions** → ordenar por *CPU time*. As 3 rotas do topo
são as que valem otimização. Fazer isto 3–4 dias depois de voltar, para ver o efeito.

## Expectativa honesta

Com C1–C4 o consumo cai para uma fração do atual e o site aguenta o Hobby. Mas o
Hobby **não foi feito** para uma API com polling 24/7: se o tráfego crescer, volta a
apertar. A solução definitiva continua a ser a **Oracle** (CPU tua, sem limites de
execução).

---

# Resumo prático

1. **Hoje:** Cloudflare + nameservers na Vercel + domínio no Railway → `locaus.fun` online.
2. **Até 18 dez:** o Railway aguenta (trial). Se acabarem os $5 antes, o site pausa —
   mas nessa altura a Oracle já deve estar pronta.
3. **18 dez:** Vercel volta. Se a Oracle ainda não estiver resolvida, aplicamos
   C1–C4 e o site volta para a Vercel **muito mais leve**.
4. **Quando a Oracle funcionar:** troca-se o DNS e fica tudo grátis para sempre.
