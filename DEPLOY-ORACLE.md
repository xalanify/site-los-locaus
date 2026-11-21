# Guia completo — Locaus **só** na Oracle Cloud, com `locaus.fun`

Objetivo: o site corre **24/7 numa VM gratuita da Oracle**, o `locaus.fun` aponta
para lá e o teu PC pode estar desligado. A base de dados continua na Supabase e
**nada é apagado**.

- Hospedagem: **0 €** (Always Free, sem prazo)
- Domínio: `locaus.fun` (já é teu, na Vercel, até out/2027)
- DNS: Cloudflare (grátis) — só porque a Vercel bloqueou as edições de DNS
- Servidor: **um só** (a VM Oracle). A Cloudflare não hospeda nada.

### Os 2 pontos que podem falhar (para não haver surpresas)

1. **Capacidade ARM** — ao criar a VM pode aparecer *"out of capacity"*. Resolve-se
   tentando outro *Availability Domain* ou 1 OCPU/6 GB, às vezes noutro dia.
2. **Nameservers na Vercel** — o botão existe, mas a conta está marcada como
   bloqueada. Se ao gravar der o mesmo erro do DNS, só resta esperar por 18 dez
   (projeto) / 23 dez (transferência do registador). Diz-me o erro e eu vejo a alternativa.

---

## Parte 0 — O que precisas

- Conta Oracle Cloud (cartão para verificar identidade, ~1 € temporário e devolvido).
- A pasta do projeto no PC (`D:\execs\Site Los Locaus`) e **Git** instalado.
- Acesso à conta **Vercel** (para os nameservers) e uma conta **Cloudflare** (grátis).
- ~1 hora.

---

## Parte 1 — Criar a conta Oracle

1. Abre <https://www.oracle.com/cloud/free/> → **Start for free**.
2. Preenche e-mail, nome, país **Portugal**.
3. **Home region** (não se pode mudar depois — escolhe bem):

   | Região | Latência de Portugal |
   |---|---|
   | **Spain East (Madrid)** | melhor |
   | **Germany Central (Frankfurt)** | boa |
   | France Central (Paris) | boa |

   Se der erro de capacidade mais tarde, a região mantém-se; só mudas de
   *Availability Domain* dentro dela.
4. Verifica o e-mail e o **cartão** (cobrança temporária de ~1 €, devolvida).
   Pode pedir também verificação por telefone.
5. No fim **não** faças upgrade para *Pay As You Go*. O **Always Free** é suficiente.

---

## Parte 2 — Criar a máquina (VM)

No menu ☰ → **Compute → Instances → Create instance**:

1. **Name:** `locaus`
2. **Compartment:** o teu (root)
3. **Image and shape → Edit:**
   - Image: **Canonical Ubuntu 24.04** (ou 22.04)
   - Shape: **Ampere → VM.Standard.A1.Flex**
   - OCPUs: **2** · Memory: **12 GB** (dentro do grátis: 4 OCPU / 24 GB no total)
4. **Networking:** deixa criar a VCN nova. Confirma **Assign a public IPv4 address: Yes**.
5. **Add SSH keys:** **Generate a key pair for me** → **descarrega a chave privada**
   (nome tipo `ssh-key-2026-11-21.key`). **Guarda-a** — sem ela não entras na VM.
6. **Boot volume:** deixa o tamanho por omissão (50 GB, dentro dos 200 GB grátis).
7. **Create**. Espera ficar **Running** (~1 min).

Anota o **Public IP address** (ex.: `130.61.x.x`).

> **"Out of capacity"**: tenta outro **Availability Domain** (AD-1/2/3), ou 1 OCPU/6 GB.
> Não escolhas shapes "Pay As You Go" — só o que diz **Always Free eligible**.

---

## Parte 3 — Abrir as portas 80 e 443 na Oracle

O site precisa de HTTP/HTTPS abertos na rede da Oracle **e** no firewall do Linux
(o script trata da segunda parte).

1. Menu ☰ → **Networking → Virtual Cloud Networks** → a VCN criada (ex.: `vcn-...`).
2. **Security → Security Lists** → **Default Security List**.
3. **Add Ingress Rules** (duas vezes):

   | Stateless | Source Type | Source CIDR | IP Protocol | Destination Port |
   |---|---|---|---|---|
   | No | CIDR | `0.0.0.0/0` | TCP | `80` |
   | No | CIDR | `0.0.0.0/0` | TCP | `443` |

Sem isto o certificado HTTPS não é emitido.

---

## Parte 4 — Entrar na VM (SSH no Windows)

PowerShell, na pasta onde está a chave:

```powershell
$chave = "$env:USERPROFILE\Downloads\ssh-key-2026-11-21.key"
icacls $chave /inheritance:r /grant:r "$($env:USERNAME):(R)"
ssh -i $chave ubuntu@IP_DA_VM
```

- Na primeira vez responde `yes`.
- O utilizador é **`ubuntu`** (não é root).
- Se aparecer *"UNPROTECTED PRIVATE KEY FILE"*, repete a linha `icacls`.

---

## Parte 5 — Pôr o código na VM

**Atenção:** o GitHub tem a versão antiga (`e38633a`). As cartas novas, o viewer 3D,
a marca de água, o chat novo e o enigma 2 estão **só no teu PC**.

### Caminho A — publicar no GitHub e clonar (recomendado)

No PC:

```powershell
cd "D:\execs\Site Los Locaus"
git add -A
git commit -m "cartas novas, 3D, marca de agua, enigma 2"
git push
```

Na VM:

```bash
git clone https://github.com/xalanify/site-los-locaus.git ~/locaus
sudo mkdir -p /opt/locaus
sudo rsync -a --exclude .git ~/locaus/ /opt/locaus/
sudo chown -R ubuntu:ubuntu /opt/locaus
```

### Caminho B — enviar a pasta do PC (sem GitHub)

No PC:

```powershell
scp -r -i "$env:USERPROFILE\Downloads\ssh-key-2026-11-21.key" `
  "D:\execs\Site Los Locaus" ubuntu@IP_DA_VM:~/locaus
```

Na VM:

```bash
sudo mkdir -p /opt/locaus
sudo rsync -a --exclude node_modules --exclude client/dist --exclude .git \
  ~/locaus/ /opt/locaus/
sudo chown -R ubuntu:ubuntu /opt/locaus
```

---

## Parte 6 — Copiar o `.env` (segredos)

O `server/.env` **não** está no GitHub. Envia-o do PC:

```powershell
scp -i "$env:USERPROFILE\Downloads\ssh-key-2026-11-21.key" `
  "D:\execs\Site Los Locaus\server\.env" ubuntu@IP_DA_VM:/tmp/locaus.env
```

Na VM:

```bash
sudo mkdir -p /opt/locaus/server
sudo mv /tmp/locaus.env /opt/locaus/server/.env
sudo chown ubuntu:ubuntu /opt/locaus/server/.env
```

O script corrige automaticamente:

```
PORT=3001
SITE_URL=https://locaus.fun
```

> Se um dia mudares chaves (Supabase, Resend, JWT), voltas a enviar este ficheiro
> e fazes `pm2 restart locaus`.

---

## Parte 7 — Instalar e arrancar

```bash
cd /opt/locaus
bash deploy/oracle-setup.sh locaus.fun
```

O script faz, por esta ordem:

1. Pacotes base (`curl`, `git`, `rsync`, `ffmpeg`...)
2. **Node.js 22**
3. **yt-dlp** (música do YouTube)
4. Firewall local: abre **80/443** (iptables da Oracle)
5. **Caddy** (HTTPS automático)
6. Copia o código para `/opt/locaus`
7. Ajusta `PORT` e `SITE_URL` no `.env`
8. Instala dependências (raiz + servidor) e faz **build do React**
9. **PM2**: arranca o site, guarda o processo e configura o arranque automático
10. **Caddyfile** para `locaus.fun` + `www` (redirect) e cache dos assets
11. Teste local (`200`)

No fim deve aparecer:

```
GET http://127.0.0.1:3001/ -> 200
==> Pronto.
```

Se aparecer `Falta .../server/.env`, volta à Parte 6.

---

## Parte 8 — Apontar o `locaus.fun` (Cloudflare + Vercel)

A Vercel bloqueou os registos DNS, mas **os nameservers podem ser mudados**.

### 8.1 Criar o site na Cloudflare

1. <https://dash.cloudflare.com/sign-up>
2. <https://dash.cloudflare.com/?to=/:account/add-site> → `locaus.fun` → plano **Free**
3. A Cloudflare mostra 2 nameservers, tipo:
   `ada.ns.cloudflare.com` e `bob.ns.cloudflare.com`

### 8.2 Mudar os nameservers na Vercel

1. <https://vercel.com/dashboard/domains> → `locaus.fun`
2. **Nameservers → Edit**
3. Apaga `ns1.vercel-dns.com` / `ns2.vercel-dns.com`
4. Cola os **2 da Cloudflare** → **Save**

O domínio continua na Vercel como registador — só o DNS passa para a Cloudflare.

### 8.3 Esperar ficar Active

5 minutos a algumas horas. Neste intervalo o site fica inacessível (já estava pausado).

### 8.4 Limpar os registos importados

A Cloudflare importa o que existia. **Apaga** tudo o que ainda aponta para a Vercel:

- `@` → `ALIAS` para `cname.vercel-dns-017.com`
- `@` → `A` para `76.76.21.21`
- `www` → `CNAME` para `cname.vercel-dns-017.com`

### 8.5 Criar os registos novos

Em **DNS → Records → Add record** (nuvem **cinzenta** = DNS only):

| Type | Name | Content | Proxy |
|---|---|---|---|
| `A` | `@` | **IP público da VM Oracle** | DNS only |
| `CNAME` | `www` | `locaus.fun` | DNS only |

### 8.6 Confirmar a CAA do Let's Encrypt

Deve existir:

```
Type: CAA · Name: @ · Value: 0 issue "letsencrypt.org"
```

Se não existir, cria (senão o HTTPS falha).

### 8.7 Emitir o certificado

```bash
sudo systemctl reload caddy
curl -I https://locaus.fun
```

Na primeira emissão pode demorar 30–60 s.

> **Porque nuvem cinzenta?** Para o Caddy falar diretamente com o Let's Encrypt e
> receber o certificado. Mais tarde, se quiseres a CDN da Cloudflare, liga a nuvem
> laranja e passa o SSL/TLS para **Full (strict)** com um certificado de origem —
> não é necessário agora.

---

## Parte 9 — Verificação (checklist)

```bash
# na VM
curl -s -o /dev/null -w "%{http_code}\n" https://locaus.fun/
curl -s https://locaus.fun/api/enigma/estado
pm2 status
pm2 logs locaus --lines 30
```

No browser, com o telemóvel desligado do Wi-Fi (dados móveis) para garantir que é público:

- [ ] `https://locaus.fun` abre, sem aviso de certificado
- [ ] `https://www.locaus.fun` redireciona para `locaus.fun`
- [ ] `/cartas` — cartas com música, NOVO, grelha
- [ ] `/enigmas` — carta dourada do Enigma 2
- [ ] `/mercado`, `/perfil` — login e dados da Supabase
- [ ] PWA: instalar / abrir offline
- [ ] Música toca (PC: hover · telemóvel: botão play)

---

## Parte 10 — Dia-a-dia

### Atualizar o site

```bash
cd /opt/locaus
git pull
npm ci --omit=dev && (cd server && npm ci --omit=dev)
npm run build
pm2 restart locaus
```

Se usares o caminho B (scp), repete o `rsync` da Parte 5 e depois `npm run build`.

### Logs / estado

```bash
pm2 status
pm2 logs locaus --lines 100
sudo journalctl -u caddy -n 50
```

### Backup do que está no disco (estados JSON)

```bash
tar -czf ~/locaus-backup-$(date +%F).tar.gz -C /opt/locaus server/*.json
```

(O essencial — contas, mercado, enigma, cartas — está na Supabase.)

### IP fixo (opcional, recomendado)

O IP público é "efémero": se recriares a instância pode mudar. Para nunca teres de
mexer no DNS: **Networking → IP Management → Reserved Public IPs → Reserve**, e
depois atribui-o à instância.

---

## Parte 11 — Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| `out of capacity` ao criar VM | outro Availability Domain, ou 1 OCPU/6 GB |
| SSH pede password / recusa chave | `icacls` mal aplicado, ou utilizador errado (é `ubuntu`) |
| Site não abre mas `curl localhost:3001` dá 200 | portas 80/443 na Security List ou iptables; ver Parte 3 e 7 |
| HTTPS não emite | DNS ainda não aponta para a VM, ou CAA/porta 80 fechada |
| `Falta server/.env` | repetir a Parte 6 |
| Música do YouTube não toca | YouTube bloqueia IPs de datacenter; os MP3 locais continuam |
| Erro `EADDRINUSE` | `pm2 delete locaus` e repetir a Parte 7 |
| Site "morto" após reboot | `pm2 startup`/`pm2 save` do script; confirma `pm2 status` |
| A Oracle reclama instância idle | com visitas não acontece; se acontecer, arranca a instância no painel (dados ficam) |

---

## Parte 12 — Custos

| Item | Custo |
|---|---|
| Oracle Always Free (VM, disco, tráfego) | **0 €/mês**, sem prazo |
| Cloudflare (DNS) | **0 €** |
| Domínio `locaus.fun` | **$27/ano** na Vercel (auto-renew **off**, válido até out/2027) |
| Supabase | 0 € (plano free) |

Depois de **23 dez 2026** podes transferir o domínio para a **Cloudflare Registrar**
(a preço de custo, normalmente mais barato que $27/ano) sem perder nada.

---

## Parte 13 — Quando estiver tudo a funcionar

1. Confirma a checklist da Parte 9.
2. Só então apaga o serviço do **Railway** (não afeta o site).
3. Guarda a chave SSH e as credenciais da Oracle num sítio seguro.
4. Opcional: aponta o `www` e o email (`contacto@locaus.fun`) para o que precisares
   mais tarde.
