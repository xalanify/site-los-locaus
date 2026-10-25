/* ============================================================
   Novidades do site — janela que aparece ao entrar.
   Para anunciar uma atualização nova, muda a `versao` e edita
   as secções. A janela só volta a aparecer quando a versão muda.
   ============================================================ */

export const NOVIDADES_VERSAO = '2026-10-26'

export const NOVIDADES = {
  versao: NOVIDADES_VERSAO,
  titulo: 'Novidades no Los Locaus',
  subtitulo: 'O que mudou por aqui — resumido.',
  data: '26 de outubro de 2026',
  secoes: [
    {
      titulo: 'Novo nesta atualização',
      itens: [
        {
          titulo: 'Fontes de perfil',
          texto: 'Já podes mudar a fonte de todos os textos do perfil: Minecraft, GTA, Black Ops, Call of Duty, Fortnite, Cyberpunk e Halo.',
        },
        {
          titulo: 'Cores reais do fundo',
          texto: 'O site lê a cor dominante da imagem — imagens escuras ou cinzentas já não ficam verdes ou laranja.',
        },
        {
          titulo: 'Bordas à tua escolha',
          texto: 'A linha do banner, o brilho do cartão e o anel da foto podem usar a cor do banner, branco ou preto.',
        },
        {
          titulo: 'Rank mais alto Fortnite',
          texto: 'A conta ligada ao jogador com o rank atual mais alto recebe a distinção automaticamente.',
        },
        {
          titulo: 'Torneios ao vivo',
          texto: 'O calendário de Fortnite atualiza sozinho a cada minuto e já não mostra listas locais.',
        },
        {
          titulo: 'Notícias mais focadas',
          texto: 'Call of Duty, GTA, Battlefield, CS2, Fortnite, consolas e placas gráficas em destaque.',
        },
        {
          titulo: 'Mensagens corrigidas',
          texto: 'Já podes publicar mensagens com ou sem imagem no teu perfil.',
        },
        {
          titulo: 'Recuperar palavra-passe',
          texto: 'O link do email abre agora diretamente a página para definir a nova palavra-passe.',
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

