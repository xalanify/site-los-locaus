/* Histórico de atualizações do site.
   Para registar uma nova alteração, acrescenta uma entrada no topo.
   O histórico do SITE mostra apenas o mês e o ano (sem horas).
   Tipo: novo | melhoria | correcao | remocao. */

export const CHANGE_TYPES = {
  novo: { label: 'Adição', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  melhoria: { label: 'Melhoria', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  correcao: { label: 'Correção', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  remocao: { label: 'Remoção', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export const updates = [
  {
    id: 'u2026-10-02',
    date: '2026-10-02',
    title: 'Plataforma de clips, anúncios no início e mais jogos',
    changes: [
      { type: 'novo', text: 'Plataforma de clips: cria a tua conta, publica vídeos (públicos ou só para ti) e corta o início/fim para o clip não ficar comprido.' },
      { type: 'novo', text: 'Em cada clip podes dar gosto, comentar (com respostas), guardar, transferir e ver o perfil de quem o publicou.' },
      { type: 'novo', text: 'A página inicial mostra os anúncios do admin à esquerda, em estilo bloco de notas, e o clip público mais recente à direita — se alguém publicar outro, é este que passa a aparecer.' },
      { type: 'novo', text: 'Nova página "Publicações (Clips)" no menu, com os teus clips, os públicos e os guardados.' },
      { type: 'novo', text: 'O admin passa a criar os anúncios no painel admin (aba Anúncios), com título, texto e imagem — só o admin cria.' },
      { type: 'novo', text: 'Perfil público para cada conta: clips, gostos recebidos, downloads e data de entrada.' },
      { type: 'novo', text: 'As atualizações de jogos ganharam Battlefield V, Battlefield 1 e Rainbow Six Siege, e cada jogo mostra a sua capa no círculo.' },
      { type: 'melhoria', text: 'As datas do histórico do site passam a mostrar apenas o mês e o ano (sem horas).' },
      { type: 'melhoria', text: 'A área do CS2 ficou com muito menos texto: avisos curtos e filtros limpos.' },
      { type: 'remocao', text: 'Removido o sino de publicações do topo — as publicações ficam só no menu.' },
      { type: 'remocao', text: 'Removido o texto do início "Aqui encontras todas as novidades, vídeos e estatísticas".' },
      { type: 'remocao', text: 'Removidos "Escolhe o jogo" e "Toca num jogo para veres as estatísticas" da página Jogos.' },
      { type: 'remocao', text: 'O CS:GO saiu das atualizações de jogos (mantém-se nas partidas do CS2).' },
    ],
  },
  {
    id: 'u2026-10-01-c',
    date: '2026-10-01',
    title: 'Atualizações de jogos, RABIXO e CS2 mais organizado',
    changes: [
      { type: 'novo', text: 'A página de Atualizações passa a ter dois ramos: "Site" e "Jogos" — nos jogos escolhes CS2, CS:GO, Battlefield 6 ou COD MW3 2023, sempre apenas para PC, com filtros por tempo (recentes, últimas ou todas).' },
      { type: 'novo', text: 'Nos jogos aparecem números reais de jogadores da Steam — a jogar agora, pico das últimas 24h e pico máximo histórico (Steam Charts).' },
      { type: 'novo', text: 'As atualizações dos jogos vêm agora das notícias oficiais da Steam e cada uma mostra sempre a sua fonte com link direto para a página original.' },
      { type: 'novo', text: 'O jogador RABIXO entrou para a tabela e filtros do CS2, com cor ciano.' },
      { type: 'novo', text: 'Aviso no CS2: todos os dados vêm da conta do xalanix, por isso ele aparece sempre em todas as partidas.' },
      { type: 'melhoria', text: 'A página do CS2 ficou organizada em 3 secções — Estatísticas, Jogadores e Partidas — para não ficar tudo empilhado numa página só. Nada foi retirado.' },
    ],
  },
  {
    id: 'u2026-10-01-b',
    date: '2026-10-01',
    title: 'Conta, publicações em janela e mais personalização',
    changes: [
      { type: 'novo', text: 'Nova página "Atualizações" com todo o histórico do site.' },
      { type: 'novo', text: 'Opção "Conta" no topo com login do admin — o painel admin continua a funcionar com as mesmas credenciais.' },
      { type: 'novo', text: 'Ícone de publicações no topo direito: abre numa janela (modal) sem trocar de página.' },
      { type: 'novo', text: 'Gostos e comentários nas publicações (qualquer visitante pode comentar).' },
      { type: 'novo', text: 'Ícones em todas as opções da navbar (Início, Vídeos, Publicações, Jogos, Atualizações).' },
      { type: 'novo', text: 'Foto do canal no ecrã de carregamento.' },
      { type: 'melhoria', text: 'Fotos de perfil dos comentários e do canal com fallback — nunca mais ficam invisíveis.' },
      { type: 'melhoria', text: 'Título do site passou a "Ashow e Jazer" (a navbar mantém "Ashow e Jazer Site").' },
      { type: 'melhoria', text: 'Texto do início agora só diz "Aqui encontras todas as novidades, vídeos e estatísticas".' },
      { type: 'melhoria', text: 'Jogos: já não vem nenhum jogo selecionado — escolhes CS2 ou EA FC 26 antes de entrar.' },
      { type: 'melhoria', text: 'Modo "Classificatórios" renomeado para "Competitivo Normal CSGO".' },
      { type: 'melhoria', text: 'Cada jogador da equipa tem a sua cor (xalanix laranja, so nojo azul, jrm.v2 verde, TaKe roxo, HABIBI GIRL rosa) na tabela e no scoreboard.' },
      { type: 'novo', text: 'Filtros de jogadores: ver todas as partidas, só as de um jogador, ou só as onde estão juntos os jogadores que escolheres — as estatísticas atualizam com o filtro.' },
      { type: 'remocao', text: 'Removida a secção de publicações da página inicial (passou para a janela no topo).' },
      { type: 'remocao', text: 'Removido o ícone flutuante do painel admin (substituído pela opção Conta).' },
      { type: 'remocao', text: 'Rodapé simplificado — removidos os links e a frase "Feito com ♥ para a comunidade".' },
    ],
  },
  {
    id: 'u2026-10-01-a',
    date: '2026-10-01',
    title: 'Estatísticas de CS2 com dados da Steam',
    changes: [
      { type: 'novo', text: 'Nova página "Jogos" com abas EA FC 26 e CS2.' },
      { type: 'novo', text: 'CS2 com 402 partidas analisadas direto de 4 páginas do histórico da Steam (Braço Direito, Competitivo, Competitivas do CS:GO e Premier).' },
      { type: 'novo', text: 'Estatísticas globais e por modo: vitórias, empates, derrotas, taxa de vitória e rondas marcadas/sofridas.' },
      { type: 'novo', text: 'Tabela dos jogadores (xalanix, so nojo, jrm.v2, _.TaKe.EASy._ e HABIBI GIRL) com K/D, MVPs, score e headshots.' },
      { type: 'novo', text: 'Cada partida expande e mostra o scoreboard completo das duas equipas com link para a demo.' },
      { type: 'melhoria', text: 'A página lê os ficheiros historico-*.html guardados no projeto e atualiza sozinha quando os voltas a guardar.' },
    ],
  },
  {
    id: 'u2026-09-30',
    date: '2026-09-30',
    title: 'Comentários, vídeos e publicações',
    changes: [
      { type: 'melhoria', text: 'Comentários dos vídeos agora mostram as respostas e a contagem certa.' },
      { type: 'melhoria', text: 'Clicar no título ou na miniatura de um vídeo abre o vídeo no YouTube (nova janela).' },
      { type: 'melhoria', text: 'O admin pode eliminar publicações individuais ou todas de uma vez.' },
      { type: 'melhoria', text: 'Painel admin reforçado: só com palavra-passe e chave, com limite de pedidos.' },
    ],
  },
  {
    id: 'u2026-09-29',
    date: '2026-09-29',
    title: 'Primeira versão do site',
    changes: [
      { type: 'novo', text: 'Ecrã de carregamento com a frase "A carregar o site..." e entrada automática.' },
      { type: 'novo', text: 'Página inicial com os números do canal (subscritores, visualizações e vídeos).' },
      { type: 'novo', text: 'Secção de vídeos com os mais vistos e estatísticas.' },
      { type: 'novo', text: 'Publicações com gostos e painel admin com estatísticas de visitantes.' },
      { type: 'novo', text: 'Tema laranja e amarelo da equipa, identidade "Ashow e Jazer".' },
    ],
  },
]
