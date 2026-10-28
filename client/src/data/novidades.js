/* ============================================================
   Novidades do site — janela que aparece ao entrar.
   Para anunciar uma atualização nova, muda a `versao` e edita
   as secções. A janela volta a aparecer quando a versão muda.
   ============================================================ */

export const NOVIDADES_VERSAO = '2026-10-28-1'

export const NOVIDADES = {
  versao: NOVIDADES_VERSAO,
  titulo: 'Design totalmente refeito',
  subtitulo: 'Mais limpo, mais rápido e pronto para o telemóvel.',
  data: '28 de outubro de 2026',
  secoes: [
    {
      titulo: 'Design totalmente refeito',
      texto: 'Novo visual em todas as páginas.',
      tipo: 'design',
    },
    {
      titulo: 'Loja de cosméticos aberta a todos',
      texto: 'Cores de nome, cartas e estilos de perfil.',
      tipo: 'loja',
    },
    {
      titulo: 'Notícias no lugar da Loja de Jogos',
      texto: 'Só notícias de gaming e hardware.',
      tipo: 'noticias',
    },
    {
      titulo: 'Cartas com zoom',
      texto: 'Clica numa carta da loja para a veres em grande.',
      tipo: 'cartas',
    },
    {
      titulo: 'Estilos de perfil — em breve',
      texto: 'Já podes espreitar os 5 estilos na loja.',
      tipo: 'estilos',
    },
    {
      titulo: 'PCs / Specs e Ferramentas Windows para todos',
      texto: 'Programas e limpeza abertos a todos os membros.',
      tipo: 'ferramentas',
    },
    {
      titulo: 'Previsões: aviso de resultados',
      texto: 'Ao entrar, vês logo se acertaste nas partidas que já terminaram.',
      tipo: 'previsoes',
    },
  ],
}
