/* ============================================================
   Temas do site (painel admin escolhe, todos os clientes aplicam)

   - 'normal' → o nosso tema (preto + violeta)
   - 'natal'  → tema de teste (fundo natalino, neve, luzes, som
                de natal). Por ser de teste, só é aplicado em
                localhost: o site real nunca muda por acidente.
   ============================================================ */

const HOSTS_LOCAIS = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0']

export const isLocal = () =>
  typeof window !== 'undefined' && HOSTS_LOCAIS.includes(window.location.hostname)

let atual = 'normal'
const ouvintes = new Set()

export const getTema = () => atual
export const onTema = (fn) => {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

function aplicar(id) {
  atual = id
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = id
  }
  ouvintes.forEach((fn) => {
    try {
      fn(id)
    } catch {
      /* ignorar ouvinte com erro */
    }
  })
}

/* Um tema marcado como `test` só passa se estivermos em localhost. */
export function temaPermitido(theme, themes) {
  const info = (themes || []).find((t) => t.id === theme)
  if (!theme) return 'normal'
  if (info && info.test && !isLocal()) return 'normal'
  return theme
}

/* Lê o tema guardado no servidor e aplica-o. */
export async function carregarTema() {
  try {
    const r = await fetch('/api/settings')
    if (!r.ok) return 'normal'
    const d = await r.json()
    const id = temaPermitido(d.theme, d.themes)
    aplicar(id)
    return id
  } catch {
    aplicar('normal')
    return 'normal'
  }
}

/* Guarda o tema escolhido no painel admin. Devolve o tema aplicado. */
export async function guardarTema(id, headers) {
  const r = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ theme: id }),
  })
  if (!r.ok) throw new Error('Não deu para guardar o tema.')
  const d = await r.json()
  const aplicado = temaPermitido(d.theme, d.themes)
  aplicar(aplicado)
  return aplicado
}
