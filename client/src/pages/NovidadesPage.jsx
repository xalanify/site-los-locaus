import { Sparkles, Clapperboard, Palette, Users, Wrench, Gamepad2, Cpu, Shield } from 'lucide-react'

/* ============================================================
   Novidades do site — o que mudou, em ordem inversa (o mais
   recente em cima). É uma página só de texto, sem contas nem
   histórico automático: escreve-se à mão quando muda algo que
   vale a pena o grupo saber.
   ============================================================ */
const NOVIDADES = [
  {
    data: '16 de outubro de 2026',
    titulo: 'Clips com cara nova e mais controle para ti',
    Icon: Clapperboard,
    pontos: [
      'Cada clip publicado aparece sozinho nos anúncios do site.',
      'A capa do clip é um frame do próprio vídeo (nada de imagem de fora).',
      'O vídeo só abre quando já está pronto — nunca mais o aviso de "a processar".',
      'Barra de volume no leitor (antes dava só para silenciar).',
      'Qualidade o mais alta que o vídeo der (1080p60 quando existe).',
      'O cartão de membros duplicado saiu da página de clips — o da direita passou a mostrar as distinções.',
    ],
  },
  {
    data: '16 de outubro de 2026',
    titulo: 'Acesso aberto a todos os membros',
    Icon: Users,
    pontos: [
      'Jogos e estatísticas, PCs / Specs e Ferramentas Windows deixaram de ser só de admin — qualquer membro pode entrar.',
      'As distinções de overclock passaram a mostrar só o ícone na lista de membros.',
      'O cartão de notificações saiu da coluna da direita.',
    ],
  },
  {
    data: '15 de outubro de 2026',
    titulo: 'Tema roxo e ferramentas redesenhadas',
    Icon: Palette,
    pontos: [
      'Cores do site mudaram de laranja para roxo (barra de deslocamento, destaques e botões).',
      'Cartões mais suaves, sem preto puro.',
      'Scan vírus v0.2: varredura rápida e um veredito claro no fim.',
      'Ferramentas Windows com ícone por ferramenta e botão Executar mais visível.',
      'Cada jogo com o logótipo em círculo em Jogos e Atualizações.',
    ],
  },
]

function Secao({ data, titulo, Icon, pontos, cor }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141020] p-5">
      <header className="mb-3 flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1"
          style={{ background: `${cor}18`, boxShadow: `0 0 16px ${cor}33`, ['--tw-ring-color']: `${cor}55` }}
        >
          <Icon className="h-5 w-5" style={{ color: cor }} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{data}</p>
          <h2 className="font-display text-lg font-black leading-tight text-white">{titulo}</h2>
        </div>
      </header>
      <ul className="space-y-2">
        {pontos.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-gray-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export default function NovidadesPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
          <Sparkles className="h-6 w-6 text-violet-400" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wide text-white">
            Novidades do site
          </h1>
          <p className="text-sm text-gray-500">O que mudou por aqui, sem enrolação.</p>
        </div>
      </div>

      <div className="space-y-4">
        {NOVIDADES.map((n) => (
          <Secao
            key={n.titulo}
            {...n}
            cor={
              n.Icon === Clapperboard
                ? '#8b5cf6'
                : n.Icon === Users
                  ? '#22d3ee'
                  : n.Icon === Palette
                    ? '#a855f7'
                    : '#8b5cf6'
            }
          />
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] text-gray-600">
        Faltou algo? Diz ao grupo — a próxima novidade entra aqui.
      </p>
    </section>
  )
}
