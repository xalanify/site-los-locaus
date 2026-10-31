/* ============================================================
   Novidades do site — janela que aparece ao entrar.
   Para anunciar uma atualização nova, muda a `versao` e edita
   as secções. A janela volta a aparecer quando a versão muda.
   ============================================================ */

export const NOVIDADES_VERSAO = '2026-10-31-2'

export const NOVIDADES = {
  versao: NOVIDADES_VERSAO,
  titulo: 'Novo design + Mercado',
  subtitulo: 'O site mudou e chegou o mercado ao vivo.',
  data: '31 de outubro de 2026',
  secoes: [
    {
      titulo: 'Novo design',
      texto:
        'Visual completamente refeito: navbar com ícones, tipografia nova, fundo vivo e cartões repensados.',
      tipo: 'design',
    },
    {
      titulo: 'Mercado novo',
      texto:
        'Preços a subir e a descer, gráficos, compras e vendas. Há automação real: o mercado mexe-se sozinho e compra anúncios quando o preço é justo.',
      tipo: 'loja',
    },
    {
      titulo: 'Novas cores — em breve',
      texto:
        'Já podes pré-visualizar as artes novas para os nomes. A compra abre em breve.',
      tipo: 'cartas',
    },
    {
      titulo: 'Novas cartas — em breve',
      texto:
        'Chegaram cartas com artes exclusivas. Já aparecem no mercado para veres, mas ainda não estão à venda.',
      tipo: 'estilos',
    },
  ],
}
