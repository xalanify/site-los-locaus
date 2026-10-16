# Publicação automática no YouTube (opção C)

O membro escolhe o vídeo (e corta se quiser), carrega em **Publicar** e o
vídeo vai **direto do browser para o YouTube**, como *não listado*. O site
guarda **apenas o link** na BD do dono, em `clips.youtube_id` — o Supabase
não guarda mais nada para os clips novos.

O vídeo nunca passa pelo servidor, por isso funciona igualmente no local
(`INICIAR.bat`) e na Vercel (que só aceita corpos de 4,5 MB).

---

## 1. O que tens de fazer à mão (uma vez por canal)

Cada "contador" = **um projeto Google Cloud**. Isto é importante: a quota é
por projeto, não por canal. Contas todas no mesmo projeto = 100 uploads/dia
no total.

Por cada contador (1, 2, 3):

1. <https://console.cloud.google.com> → **Novo projeto** (ex.: `locaus-yt-1`).
2. **APIs e serviços → Biblioteca** → procurar **YouTube Data API v3** → **Ativar**.
3. **APIs e serviços → Ecrã de consentimento OAuth**:
   - Utilizador: **Externo**; preencher nome da app, email e pagina inicial
     (`https://locaus.vercel.app`).
   - Escopos → adicionar `youtube.upload` (*Manage your YouTube videos*).
   - **Utilizadores de teste**: adicionar o email da conta Google do canal.
   - Deixar em **Testing** para obter o token; depois passar a **Publicado**
     (*Publish App*) para o refresh token **não expirar aos 7 dias**.
4. **APIs e serviços → Credenciais → Criar credenciais → ID de cliente OAuth**
   - Tipo: **Aplicação Web**.
   - URIs de redirecionamento autorizados:
     `https://developers.google.com/oauthplayground`
5. Obter o **refresh token** (uma vez):
   - Abrir <https://developers.google.com/oauthplayground> → ⚙ →
     **Use your own OAuth credentials** → colar Client ID e Client Secret.
   - À esquerda marcar `https://www.googleapis.com/auth/youtube.upload`
     **E** `https://www.googleapis.com/auth/youtube.readonly` (a 2.ª é
     obrigatória: sem ela o servidor não consegue *conferir* o vídeo que o
     browser subiu) → **Authorize APIs** → entrar na conta do canal →
     **Exchange authorization code for tokens** → copiar **Refresh token**.
   - ⚠️ O passo acima tem de ser com **“Use your own OAuth credentials”**
     ligado **antes** de autorizar (⚙ no canto superior direito). Sem isso o
     refresh token fica do OAuth Playground e o Google recusa-o com
     `unauthorized_client`.

> Só quem autoriza é a conta do canal (2–3 contas vossas). Os membros do site
> nunca veem ecrã nenhum do Google.

## 2. Valores no `server/.env`

```env
YT_CLIENT_ID_1=xxxx.apps.googleusercontent.com
YT_CLIENT_SECRET_1=GOCSPX-...
YT_REFRESH_TOKEN_1=1//0g...
YT_NOME_1=Canal Los Locaus          # opcional, só para mostrar
YT_CHANNEL_ID_1=UC...               # opcional, confirma que o vídeo é vosso

# repete para _2 e _3 (cada uma com o SEU projeto Google Cloud)
YT_UPLOADS_DIA=100                  # opcional (padrão 100)
```

Depois reinicia o servidor (`INICIAR.bat`).

## 3. O que o site faz sozinho

- Escolhe automaticamente o contador que ainda tem quota (rodízio).
- Se um contador esgotar, passa para o seguinte **sem avisar**.
- Quando **todos** esgotarem, aparece um aviso no formulário de publicação:
  *"As publicações automáticas esgotaram por hoje. Novas publicações dia X às HH:MM."*
  (meia-noite de Los Angeles, que é quando a quota do YouTube volta a zero).
- Conta os uploads por contador (bucket próprio de **100/dia** do
  `videos.insert` — não consome o balde geral de 10.000 unidades) e marca
  como esgotado também se o Google responder 403/429.

## 4. Sem configurar nada

Tudo continua a funcionar como dantes: o clip vai para o Supabase com o
limite de MB e o aviso laranja no formulário. Não é preciso tocar em nada.

## 5. Notas honestas

- **Corte sem perda de qualidade**: o corte do site re-grava o vídeo (usa
  `MediaRecorder`). Para cortar sem re-encriptar era preciso `ffmpeg.wasm`
  com `-c copy`, e isso só corta em keyframes. Dá para fazer, é à parte.
- **"Não parecer do YouTube"**: a capa aparece com um botão de play nosso e o
  iframe só carrega ao tocar. Depois de tocar, o logótipo do YouTube no
  próprio leitor **não é possível esconder** (e descarregar a stream do
  YouTube seria contra os termos de serviço).
- **Processamento**: o vídeo fica disponível logo, mas o YouTube demora
  uns minutos a processar a versão HD. Durante esse tempo o leitor mostra o
  aviso de processamento do próprio YouTube.
- **CORS**: a subida resumable é feita do browser para a Google, que suporta
  isto (é o que a biblioteca oficial `gapi` faz). Confirma no primeiro teste.
