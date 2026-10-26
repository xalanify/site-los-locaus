/* ============================================================
   Novidades do site — janela que aparece ao entrar.
   Para anunciar uma atualização nova, muda a `versao` e edita
   as secções. A janela volta a aparecer quando a versão muda.
   ============================================================ */

export const NOVIDADES_VERSAO = '2026-10-26-4'

export const NOVIDADES = {
  versao: NOVIDADES_VERSAO,
  titulo: 'Novidades no Los Locaus',
  subtitulo: 'Banners, fundos e notícias novas.',
  data: '26 de outubro de 2026',
  secoes: [
    {
      titulo: 'Novos banners de perfil',
      tipo: 'banners',
      texto: 'Há 6 banners novos para escolheres no editar perfil.',
      ids: ['g20', 'g21', 'g22', 'g25', 'g26', 'g27'],
    },
    {
      titulo: 'Novos fundos de perfil',
      tipo: 'fundos',
      texto: 'War 02 e Inverno já estão disponíveis no editar perfil.',
      ids: ['f14', 'f15'],
    },
    {
      titulo: 'Notícias no início da página',
      tipo: 'noticias',
      texto:
        'A página inicial mostra agora as últimas 4 notícias, atualizadas de hora a hora — franquias grandes, telemóveis e desbloqueios PS4/PS5. Os vídeos do canal passaram para o botão “Ver vídeos” no cartão do canal.',
    },
  ],
}
