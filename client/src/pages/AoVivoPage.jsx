import { useMemo, useState } from 'react'
import { Radio, ExternalLink } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'

/* ============================================================
   AO VIVO — transmissões dos jogos dentro do site.
   Twitch/YouTube oficiais, sem chat e sem interface extra.
   ============================================================ */

const CANAIS = [
  {
    id: 'r6',
    nome: 'Rainbow Six',
    tipo: 'twitch',
    canal: 'rainbowsix_esports',
    site: 'https://www.twitch.tv/rainbowsix_esports',
  },
  {
    id: 'cs2',
    nome: 'CS2',
    tipo: 'twitch',
    canal: 'esl_csgo',
    site: 'https://www.twitch.tv/esl_csgo',
  },
  {
    id: 'cod',
    nome: 'Call of Duty',
    tipo: 'twitch',
    canal: 'callofduty',
    site: 'https://www.twitch.tv/callofduty',
  },
]

function urlDoCanal(c) {
  if (c.tipo === 'twitch') {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    return `https://player.twitch.tv/?channel=${encodeURIComponent(c.canal)}&parent=${encodeURIComponent(
      parent,
    )}&autoplay=true&muted=true`
  }
  return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(c.canal)}&autoplay=1&mute=1`
}

export default function AoVivoPage() {
  const [ativo, setAtivo] = useState(CANAIS[0].id)
  const canal = useMemo(() => CANAIS.find((c) => c.id === ativo) || CANAIS[0], [ativo])

  return (
    <PageShell>
      <PageHeader
        title="Ao vivo"
        subtitle="Os jogos do momento, dentro do site. Escolhe o jogo e vê a transmissão oficial."
        badge="Transmissões"
      >
        <a
          href={canal.site}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-btn ui-btn-ghost ui-btn-sm"
        >
          Abrir no {canal.tipo === 'twitch' ? 'Twitch' : 'YouTube'} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </PageHeader>

      <div className="ui-tabs mb-4">
        {CANAIS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setAtivo(c.id)}
            data-active={ativo === c.id}
            className="ui-tab"
          >
            <Radio className="h-4 w-4 shrink-0" /> {c.nome}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
        <div className="relative aspect-video w-full">
          <iframe
            key={canal.id}
            src={urlDoCanal(canal)}
            title={`${canal.nome} ao vivo`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            style={{ border: 0 }}
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] font-semibold text-zinc-500">
        Transmissão oficial. Se estiver offline, abre no {canal.tipo === 'twitch' ? 'Twitch' : 'YouTube'}.
        Os anúncios (quando existem) são da plataforma, não do site.
      </p>
    </PageShell>
  )
}
