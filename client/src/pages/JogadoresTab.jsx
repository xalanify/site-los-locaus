import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Star, ChevronRight, Medal } from 'lucide-react'

/* ============================================================
   Aba "Jogadores" — cenário de cada jogo
   ------------------------------------------------------------
   Primeiro: os jogadores de destaque no momento (cards grandes).
   Depois: tabela por season — destaques de cada época desde a
   primeira. Nomes reais: profissionais, youtubers, streamers.
   Os dados são curados (JOGADORES) — fácil de atualizar aqui.
   ============================================================ */

const JOGADORES = {
  r6: {
    nome: 'Rainbow Six',
    cor: 'from-orange-500 to-amber-500',
    txt: 'text-orange-300',
    destaque: [
      { nick: 'Shaiiko', time: 'G2 Esports', rank: 1, stat: 'Melhor fragger do mundo' },
      { nick: 'HerdsZ', time: 'FURIA', rank: 2, stat: 'MVP do Six Invitational' },
      { nick: 'Kheyze', time: 'Team Liquid', rank: 3, stat: 'Mecanicamente perfeito' },
      { nick: 'FelipoX', time: 'FURIA', rank: 4, stat: 'Consistência pura' },
      { nick: 'Jv92', time: 'Team Liquid', rank: 5, stat: 'Jovem talento no topo' },
    ],
    seasons: [
      {
        nome: '2025 — Transição e Cyberzera (atual)',
        jogadores: [
          { nick: 'Cyber', time: 'FaZe Clan', pos: 1, stat: 'Melhor do ecossistema' },
          { nick: 'HerdsZ', time: 'FURIA', pos: 2, stat: 'Números milionários' },
          { nick: 'Kheyze', time: 'Team Liquid', pos: 3, stat: 'Top em abates' },
          { nick: 'Shaiiko', time: 'G2 Esports', pos: 4, stat: 'Nome que mais fatura' },
          { nick: 'FelipoX', time: 'FURIA', pos: 5, stat: 'Estabilidade tática' },
        ],
      },
      {
        nome: '2024 — Consolidação da FURIA',
        jogadores: [
          { nick: 'FelipoX', time: 'FURIA', pos: 1, stat: 'Temporada fantástica' },
          { nick: 'HerdsZ', time: 'FURIA', pos: 2, stat: 'MVP do Invitational 2024' },
          { nick: 'Handyy', time: 'FaZe Clan', pos: 3, stat: 'Suporte de elite' },
          { nick: 'Shaiiko', time: 'G2 Esports', pos: 4, stat: 'BDS competitiva' },
          { nick: 'Nade', time: 'FaZe Clan', pos: 5, stat: 'Peça tática fulcral' },
        ],
      },
      {
        nome: '2023 — Era da w7m / FURIA',
        jogadores: [
          { nick: 'HerdsZ', time: 'w7m', pos: 1, stat: 'MVP de campeonatos' },
          { nick: 'Kheyze', time: 'w7m', pos: 2, stat: 'Quebrou recordes' },
          { nick: 'Jv92', time: 'w7m', pos: 3, stat: 'Peça-chave tática' },
          { nick: 'Alemão', time: 'G2 Esports', pos: 4, stat: 'Campeão Six Invitational' },
          { nick: 'Benjamaster', time: 'G2 Esports', pos: 5, stat: 'Carregou a G2' },
        ],
      },
      {
        nome: '2022 — Ascensão da TSM',
        jogadores: [
          { nick: 'Kheyze', time: 'w7m', pos: 1, stat: 'Força dominante' },
          { nick: 'Beaulo', time: 'TSM', pos: 2, stat: 'Título mundial' },
          { nick: 'Merc', time: 'TSM', pos: 3, stat: 'IGL e fragger' },
          { nick: 'Shaiiko', time: 'Team BDS', pos: 4, stat: 'MVP Jönköping Major' },
          { nick: 'Cyber', time: 'FaZe Clan', pos: 5, stat: 'Destaque internacional' },
        ],
      },
      {
        nome: '2021 — Domínio Brasileiro',
        jogadores: [
          { nick: 'Psycho', time: 'NiP', pos: 1, stat: 'MVP título mundial' },
          { nick: 'Paluh', time: 'NiP', pos: 2, stat: 'Melhor do mundo (SiegeGG)' },
          { nick: 'Muzi', time: 'NiP', pos: 3, stat: 'Força bruta mecânica' },
          { nick: 'Alemão', time: 'Team oNe', pos: 4, stat: 'Revelação global' },
          { nick: 'Nesk', time: 'Team Liquid', pos: 5, stat: 'Final do Invitational' },
        ],
      },
      {
        nome: '2020 — Retorno da SpaceStation',
        jogadores: [
          { nick: 'Rampy', time: 'SpaceStation', pos: 1, stat: 'MVP Six Invitational' },
          { nick: 'Canadian', time: 'SpaceStation', pos: 2, stat: 'Título histórico' },
          { nick: 'Paluh', time: 'NiP', pos: 3, stat: 'Era dourada' },
          { nick: 'Shaiiko', time: 'Team BDS', pos: 4, stat: 'Melhor mira da Europa' },
          { nick: 'Bosco', time: 'SpaceStation', pos: 5, stat: 'Clutcher nato' },
        ],
      },
      {
        nome: '2019 — Impulse e Domínio Russo',
        jogadores: [
          { nick: 'Joystick', time: 'Team Empire', pos: 1, stat: 'Cyborg russo' },
          { nick: 'ShepparD', time: 'Team Empire', pos: 2, stat: 'Melhor suporte do mundo' },
          { nick: 'Mav', time: 'Team Liquid', pos: 3, stat: 'Estrategista' },
          { nick: 'Kantoraketti', time: 'G2 Esports', pos: 4, stat: 'Dominante em finais' },
          { nick: 'Shaiiko', time: 'Team BDS', pos: 5, stat: 'Retorno chocou o mundo' },
        ],
      },
      {
        nome: '2018 — Dinastia G2',
        jogadores: [
          { nick: 'Nesk', time: 'Team Liquid', pos: 1, stat: 'MVP mundial' },
          { nick: 'Kantoraketti', time: 'G2 Esports', pos: 2, stat: 'Máquina de abates' },
          { nick: 'Pengu', time: 'G2 Esports', pos: 3, stat: 'Campeão Six Invitational' },
          { nick: 'Fabian', time: 'G2 Esports', pos: 4, stat: 'Cérebro da G2' },
          { nick: 'Astro', time: 'FaZe Clan', pos: 5, stat: 'Fragger de elite' },
        ],
      },
      {
        nome: '2017 — Era PENTA',
        jogadores: [
          { nick: 'Pengu', time: 'PENTA Sports', pos: 1, stat: 'Melhor do mundo' },
          { nick: 'Fabian', time: 'PENTA Sports', pos: 2, stat: 'IGL supremo' },
          { nick: 'Zigueira', time: 'Black Dragons', pos: 3, stat: 'Campeão Pro League' },
          { nick: 'Goga', time: 'PENTA Sports', pos: 4, stat: 'Rei dos plants' },
          { nick: 'jOONAS', time: 'PENTA Sports', pos: 5, stat: 'Agressividade imprevisível' },
        ],
      },
      {
        nome: '2016 — O Início (a primeira)',
        jogadores: [
          { nick: 'Canadian', time: 'Continuum', pos: 1, stat: 'Pioneiro' },
          { nick: 'Nesk', time: 'Cena BR', pos: 2, stat: 'Destaque imediato' },
          { nick: 'Pengu', time: 'PENTA', pos: 3, stat: 'Início da dinastia' },
          { nick: 'Necrox', time: 'Continuum', pos: 4, stat: 'Peça tática' },
          { nick: 'nvK', time: 'Cena', pos: 5, stat: 'Fragger temido' },
        ],
      },
    ],
  },
  cs2: {
    nome: 'CS2 / CSGO',
    cor: 'from-yellow-500 to-amber-600',
    txt: 'text-yellow-300',
    destaque: [
      { nick: 'donk', time: 'Team Spirit', rank: 1, stat: 'MVP da Major 2025 — fenómeno' },
      { nick: 'ZywOo', time: 'Vitality', rank: 2, stat: 'Melhor jogador do mundo' },
      { nick: 'm0NESY', time: 'G2 Esports', rank: 3, stat: 'Top fragger de elite' },
      { nick: 'xalana', time: 'Equipa Ashow', rank: 4, stat: 'Top da comunidade Ashow' },
    ],
    seasons: [
      {
        nome: '2025 — CS2 (atual)',
        jogadores: [
          { nick: 'donk', time: 'Team Spirit', pos: 1, stat: 'MVP da Major 2025' },
          { nick: 'ZywOo', time: 'Vitality', pos: 2, stat: 'Melhor do mundo' },
          { nick: 'm0NESY', time: 'G2 Esports', pos: 3, stat: 'Top fragger' },
          { nick: 'sh1ro', time: 'Falcons', pos: 4, stat: 'Top da Falcons' },
          { nick: 'xalana', time: 'Equipa Ashow', pos: 5, stat: 'Top da comunidade Ashow' },
        ],
      },
      {
        nome: '2024 — CS2',
        jogadores: [
          { nick: 'ZywOo', time: 'Vitality', pos: 1, stat: 'Melhor do mundo' },
          { nick: 'donk', time: 'Team Spirit', pos: 2, stat: 'Em ascensão' },
          { nick: 'm0NESY', time: 'G2 Esports', pos: 3, stat: 'Top fragger' },
          { nick: 'ropz', time: 'Team Vitality', pos: 4, stat: 'Top da Vitality' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 5, stat: 'Lenda em transição' },
        ],
      },
      {
        nome: '2023 — CS2',
        jogadores: [
          { nick: 'ZywOo', time: 'Vitality', pos: 1, stat: 'Melhor do mundo' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 2, stat: 'Lenda da G2' },
          { nick: 'm0NESY', time: 'G2 Esports', pos: 3, stat: 'Top fragger' },
          { nick: 'ropz', time: 'FaZe Clan', pos: 4, stat: 'Top da FaZe' },
          { nick: 's1mple', time: 'Natus Vincere', pos: 5, stat: 'Ícone da NAVI' },
        ],
      },
      {
        nome: '2022 — CSGO',
        jogadores: [
          { nick: 'ZywOo', time: 'Vitality', pos: 1, stat: 'Melhor do mundo' },
          { nick: 's1mple', time: 'Natus Vincere', pos: 2, stat: 'Ícone da NAVI' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 3, stat: 'Lenda da G2' },
          { nick: 'ropz', time: 'FaZe Clan', pos: 4, stat: 'Top da FaZe' },
        ],
      },
      {
        nome: '2021 — CSGO',
        jogadores: [
          { nick: 'ZywOo', time: 'Vitality', pos: 1, stat: 'Melhor do mundo' },
          { nick: 's1mple', time: 'Natus Vincere', pos: 2, stat: 'Ícone da NAVI' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 3, stat: 'Lenda da G2' },
        ],
      },
      {
        nome: '2020 — CSGO',
        jogadores: [
          { nick: 's1mple', time: 'Natus Vincere', pos: 1, stat: 'Melhor do mundo' },
          { nick: 'ZywOo', time: 'Vitality', pos: 2, stat: 'Em ascensão' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 3, stat: 'Lenda da G2' },
        ],
      },
      {
        nome: '2019 — CSGO',
        jogadores: [
          { nick: 's1mple', time: 'Natus Vincere', pos: 1, stat: 'Melhor do mundo' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 2, stat: 'Lenda da G2' },
          { nick: 'ZywOo', time: 'Vitality', pos: 3, stat: 'Jovem promessa' },
        ],
      },
      {
        nome: '2018 — CSGO',
        jogadores: [
          { nick: 's1mple', time: 'Natus Vincere', pos: 1, stat: 'Ícone da NAVI' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 2, stat: 'Lenda da G2' },
        ],
      },
      {
        nome: '2017 — CSGO',
        jogadores: [
          { nick: 's1mple', time: 'Natus Vincere', pos: 1, stat: 'Ícone da NAVI' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 2, stat: 'Lenda da G2' },
        ],
      },
      {
        nome: '2016 — CSGO',
        jogadores: [
          { nick: 's1mple', time: 'Natus Vincere', pos: 1, stat: 'Jovem promessa' },
          { nick: 'NiKo', time: 'G2 Esports', pos: 2, stat: 'Jovem promessa' },
        ],
      },
    ],
  },
  fortnite: {
    nome: 'Fortnite',
    cor: 'from-purple-500 to-fuchsia-500',
    txt: 'text-purple-300',
    destaque: [
      { nick: 'Bugha', time: 'Pro player', rank: 1, stat: 'Campeão World Cup 2019' },
      { nick: 'Ninjasin', time: 'Pro player', rank: 2, stat: 'Top da cena' },
      { nick: 'Mongraal', time: 'Pro player', rank: 3, stat: 'Lenda da cena' },
      { nick: 'xalana', time: 'Equipa Ashow', rank: 4, stat: 'Top da comunidade Ashow' },
    ],
    seasons: [
      {
        nome: '2025 — Atual',
        jogadores: [
          { nick: 'Bugha', time: 'Pro player', pos: 1, stat: 'Campeão World Cup 2019' },
          { nick: 'Ninjasin', time: 'Pro player', pos: 2, stat: 'Top da cena' },
          { nick: 'Mongraal', time: 'Pro player', pos: 3, stat: 'Lenda da cena' },
          { nick: 'xalana', time: 'Equipa Ashow', pos: 4, stat: 'Top da comunidade Ashow' },
        ],
      },
      {
        nome: '2024 — Capítulo 5',
        jogadores: [
          { nick: 'Bugha', time: 'Pro player', pos: 1, stat: 'Campeão World Cup 2019' },
          { nick: 'Ninjasin', time: 'Pro player', pos: 2, stat: 'Top da cena' },
          { nick: 'Mongraal', time: 'Pro player', pos: 3, stat: 'Lenda da cena' },
        ],
      },
      {
        nome: '2023 — Capítulo 4',
        jogadores: [
          { nick: 'Bugha', time: 'Pro player', pos: 1, stat: 'Campeão World Cup 2019' },
          { nick: 'Ninjasin', time: 'Pro player', pos: 2, stat: 'Top da cena' },
        ],
      },
      {
        nome: '2022 — Capítulo 3',
        jogadores: [
          { nick: 'Bugha', time: 'Pro player', pos: 1, stat: 'Campeão World Cup 2019' },
          { nick: 'Mongraal', time: 'Pro player', pos: 2, stat: 'Lenda da cena' },
        ],
      },
      {
        nome: '2021 — Capítulo 2',
        jogadores: [
          { nick: 'Bugha', time: 'Pro player', pos: 1, stat: 'Campeão World Cup 2019' },
          { nick: 'Ninjasin', time: 'Pro player', pos: 2, stat: 'Top da cena' },
        ],
      },
      {
        nome: '2020 — Capítulo 1',
        jogadores: [
          { nick: 'Bugha', time: 'Pro player', pos: 1, stat: 'Campeão World Cup 2019' },
          { nick: 'Mongraal', time: 'Pro player', pos: 2, stat: 'Lenda da cena' },
        ],
      },
      {
        nome: '2019 — Capítulo 1 (a primeira)',
        jogadores: [
          { nick: 'Bugha', time: 'Pro player', pos: 1, stat: 'Campeão World Cup 2019' },
          { nick: 'Ninjasin', time: 'Pro player', pos: 2, stat: 'Top da cena' },
        ],
      },
    ],
  },
  bf: {
    nome: 'Battlefield',
    cor: 'from-sky-500 to-cyan-500',
    txt: 'text-sky-300',
    destaque: [
      { nick: 'Clix', time: 'Pro player', rank: 1, stat: 'Top da cena BF' },
      { nick: 'xalana', time: 'Equipa Ashow', rank: 2, stat: 'Top da comunidade Ashow' },
    ],
    seasons: [
      {
        nome: '2025 — Atual',
        jogadores: [
          { nick: 'Clix', time: 'Pro player', pos: 1, stat: 'Top da cena BF' },
          { nick: 'xalana', time: 'Equipa Ashow', pos: 2, stat: 'Top da comunidade Ashow' },
        ],
      },
      {
        nome: '2024 — BF2042',
        jogadores: [
          { nick: 'Clix', time: 'Pro player', pos: 1, stat: 'Top da cena BF' },
        ],
      },
      {
        nome: '2023 — BF2042',
        jogadores: [
          { nick: 'Clix', time: 'Pro player', pos: 1, stat: 'Top da cena BF' },
        ],
      },
      {
        nome: '2022 — BF2042 (a primeira)',
        jogadores: [
          { nick: 'Clix', time: 'Pro player', pos: 1, stat: 'Top da cena BF' },
        ],
      },
    ],
  },
}

const MEDALHA = {
  1: 'text-amber-300',
  2: 'text-gray-300',
  3: 'text-orange-400',
}

export default function JogadoresTab({ jogo }) {
  const dados = JOGADORES[jogo]
  const [seasonAberta, setSeasonAberta] = useState(0)
  if (!dados) return null

  return (
    <div className="space-y-6">
      {/* DESTAQUE DO MOMENTO */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
          <Star className={`h-4 w-4 ${dados.txt}`} />
          Destaque do momento
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dados.destaque.map((p, i) => (
            <motion.div
              key={p.nick}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <span className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent`} />
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${dados.cor} text-lg font-black text-white`}>
                  {p.nick.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{p.nick}</p>
                  <p className="truncate text-[11px] font-semibold text-gray-400">{p.time}</p>
                </div>
                {p.rank <= 3 && (
                  <Medal className={`h-6 w-6 shrink-0 ${MEDALHA[p.rank] || 'text-gray-500'}`} />
                )}
              </div>
              <p className={`mt-3 text-[11px] font-bold ${dados.txt}`}>{p.stat}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TABELA POR SEASON */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
          <Trophy className={`h-4 w-4 ${dados.txt}`} />
          Por season
        </h2>
        <div className="space-y-2">
          {dados.seasons.map((s, i) => (
            <div key={s.nome} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <button
                onClick={() => setSeasonAberta(seasonAberta === i ? -1 : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/5"
              >
                <span className="text-[13px] font-black text-white">{s.nome}</span>
                <ChevronRight
                  className={`h-4 w-4 text-gray-500 transition-transform ${seasonAberta === i ? 'rotate-90' : ''}`}
                />
              </button>
              {seasonAberta === i && (
                <div className="overflow-x-auto border-t border-white/10">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Jogador</th>
                        <th className="px-4 py-2">Equipa</th>
                        <th className="px-4 py-2">Destaque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.jogadores.map((j) => (
                        <tr key={j.nick} className="border-b border-white/5 transition hover:bg-white/5">
                          <td className="px-4 py-2">
                            {j.pos <= 3 ? (
                              <Medal className={`h-4 w-4 ${MEDALHA[j.pos]}`} />
                            ) : (
                              <span className="font-bold text-gray-500">{j.pos}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 font-black text-white">{j.nick}</td>
                          <td className="px-4 py-2 text-gray-400">{j.time}</td>
                          <td className="px-4 py-2 text-gray-300">{j.stat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
