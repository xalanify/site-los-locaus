/* ============================================================
   Novidades do site — janela que aparece ao entrar.
   Para anunciar uma atualização nova, muda a `versao` e edita
   as secções. A janela só volta a aparecer quando a versão muda.
   ============================================================ */

export const NOVIDADES_VERSAO = '2026-10-25'

export const NOVIDADES = {
  versao: NOVIDADES_VERSAO,
  titulo: 'Novidades no Los Locaus',
  subtitulo: 'O que mudou por aqui — resumido.',
  data: '25 de outubro de 2026',
  secoes: [
    {
      titulo: 'Novo nesta atualização',
      itens: [
        {
          titulo: 'Loja de Jogos com notícias',
          texto: 'Nova aba de notícias de gaming e hardware, páginas na pesquisa e capas nos rumores.',
        },
        {
          titulo: 'Mensagens no perfil',
          texto: 'Agora podes publicar mensagens (com ou sem imagem) além de clips. O feed do perfil junta tudo.',
        },
        {
          titulo: 'Música do YouTube (admin)',
          texto: 'Pesquisa e escolhe qualquer música do YouTube para o teu perfil.',
        },
        {
          titulo: 'Chat com membros online',
          texto: 'Clica no indicador de online para veres quem está ligado, no PC ou no telemóvel.',
        },
        {
          titulo: 'IDs sequenciais',
          texto: 'Os IDs das contas passam a contar 1, 2, 3… pela ordem de entrada.',
        },
      ],
    },
    {
      titulo: 'Novos banners',
      tipo: 'banners',
      texto: 'Há 17 banners novos para escolheres no editar perfil.',
    },
    {
      titulo: 'Novos fundos de perfil',
      tipo: 'fundos',
      texto: '12 fundos novos — e agora podes voltar ao fundo padrão.',
    },
    {
      titulo: 'Músicas novas',
      tipo: 'musicas',
      texto: 'Ouve uma pré-visualização e escolhe a tua no perfil.',
    },
  ],
}
