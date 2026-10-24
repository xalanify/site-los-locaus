/* ============================================================
   Torneios de Fortnite — lista de reserva (fallback)
   ------------------------------------------------------------
   A lista principal vem automaticamente do calendário oficial
   da Epic (via FNJPNews) em /api/games/fortnite/torneios, com
   todos os torneios e copas diárias. Este ficheiro só é usado
   se essa API falhar.
   Cada entrada: { id, nome, local, inicio, fim, circuito, premio }
   `inicio`/`fim` em ISO (ex: '2026-11-14T15:00:00Z').
   ============================================================ */
export const FORTNITE_TORNEIOS = [
  {
    id: 'fncs-major-1-2027',
    nome: 'FNCS Major 1',
    circuito: 'Fortnite Championship Series',
    local: 'Online · Global',
    inicio: '2027-02-13T15:00:00Z',
    fim: '2027-02-15T22:00:00Z',
    premio: '—',
  },
  {
    id: 'fncs-major-2-2027',
    nome: 'FNCS Major 2',
    circuito: 'Fortnite Championship Series',
    local: 'Online · Global',
    inicio: '2027-04-17T15:00:00Z',
    fim: '2027-04-19T22:00:00Z',
    premio: '—',
  },
  {
    id: 'fncs-global-2027',
    nome: 'FNCS Global Championship',
    circuito: 'Fortnite Championship Series',
    local: 'A anunciar',
    inicio: '2027-09-04T14:00:00Z',
    fim: '2027-09-06T23:00:00Z',
    premio: '—',
  },
];
