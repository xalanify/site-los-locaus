import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Folder, FolderPlus, Loader2, Plus, X } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import Estado from './Estado'

/* ============================================================
   Modal de coleções — escolhe em que pastas o clip entra.

   Mostra todas as coleções do utilizador com um "dentro/fora"
   de cada uma (o clip já guardado fica marcado) e deixa criar
   uma nova coleção ali mesmo.
   ============================================================ */
export default function ColecoesModal({ clip, onClose, onMudou }) {
  const [lista, setLista] = useState([])
  const [nova, setNova] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [carregado, setCarregado] = useState(false)

  const carregar = async () => {
    try {
      const r = await fetch(`/api/collections/for-clip?clip_id=${clip.id}`, {
        headers: authHeaders(),
      })
      if (r.ok) setLista(await r.json())
      else setErro('Não deu para ler as coleções.')
    } catch {
      setErro('Falha de ligação.')
    } finally {
      setCarregado(true)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id])

  const alternar = async (col) => {
    if (busy) return
    setBusy(true)
    setErro('')
    const dentro = !col.dentro
    try {
      const r = dentro
        ? await fetch(`/api/collections/${col.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ clip_id: clip.id }),
          })
        : await fetch(`/api/collections/${col.id}/items/${clip.id}`, {
            method: 'DELETE',
            headers: authHeaders(),
          })
      if (!r.ok) throw new Error('falhou')
      setLista((prev) => prev.map((x) => (x.id === col.id ? { ...x, dentro } : x)))
      onMudou && onMudou()
    } catch {
      setErro('Não deu para guardar.')
    } finally {
      setBusy(false)
    }
  }

  const criar = async () => {
    const nome = nova.trim()
    if (!nome || busy) return
    setBusy(true)
    setErro('')
    try {
      const r = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: nome }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'falhou')
      // cria e já mete o clip dentro
      await fetch(`/api/collections/${d.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ clip_id: clip.id }),
      })
      setNova('')
      await carregar()
      onMudou && onMudou()
    } catch (e) {
      setErro(e.message || 'Não deu para criar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-md overflow-hidden rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-white">
            <Folder className="h-4 w-4 text-violet-300" /> Coleções
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-3 text-xs text-gray-400">
          <span className="font-bold text-gray-200">{clip.title || 'Sem título'}</span> — toca
          numa coleção para meter ou tirar o clip.
        </div>

        <div className="max-h-[45vh] overflow-y-auto px-4 py-3">
          {!carregado ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : lista.length === 0 ? (
            <Estado
              compacto
              icon={Folder}
              titulo="Ainda não tens coleções"
              texto="Cria a primeira em baixo — p.ex. “Melhores clutches”."
            />
          ) : (
            <div className="space-y-2">
              {lista.map((col) => (
                <button
                  key={col.id}
                  onClick={() => alternar(col)}
                  disabled={busy}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                    col.dentro
                      ? 'bg-violet-500/25 text-white ring-1 ring-violet-400/40'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Folder className="h-4 w-4 shrink-0 text-violet-300" />
                    <span className="truncate">{col.name}</span>
                  </span>
                  {col.dentro && <Check className="h-4 w-4 shrink-0 text-violet-200" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex gap-2">
            <input
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && criar()}
              maxLength={40}
              placeholder="Nova coleção…"
              className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15"
            />
            <button
              onClick={criar}
              disabled={busy || !nova.trim()}
              className="btn-glass flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Criar
            </button>
          </div>
          {erro && <p className="mt-2 text-xs font-semibold text-red-400">{erro}</p>}
        </div>
      </motion.div>
    </motion.div>
  )
}
