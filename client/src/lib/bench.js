/* ============================================================
   Bench da CPU — mede no browser, sem instalar nada
   ------------------------------------------------------------
   Mesma ideia do CPU-Z: dois números para comparar máquinas.
   • ST (1 núcleo)  — conta inteiras na própria página
   • MT (todos)     — o mesmo trabalho em workers, um por núcleo
   O resultado é em "Mops/s": passos do teste por segundo, em
   milhões. É a mesma conta para toda a gente, por isso dá para
   comparar PC contra PC.
   ============================================================ */

// duração de cada medida (ms) — chega para o turbo estabilizar
// sem o utilizador ficar à espera
const DURACAO = 1400
const AQUECER = 300
// de 48 em 48 passos é que se vê o relógio: assim o tempo da
// chamada ao performance.now não domina a conta
const LOTE = 48

/* o trabalho — conta inteiras (identico ao do worker) */
function medir(ms) {
  let x = 0x9e3779b9 | 0
  let n = 0
  const t0 = performance.now()
  let t = t0
  while (t - t0 < ms) {
    for (let i = 0; i < LOTE; i++) {
      x = (Math.imul(x, 1664525) + 1013904223) | 0
      x ^= x >>> 15
      x = Math.imul(x, 2246822513)
      x ^= x >>> 13
    }
    n += LOTE
    t = performance.now()
  }
  // fica registrado para o motor não apagar o cálculo todo
  globalThis.__ajBenchSink = x
  return { n, ms: t - t0 }
}

/* mesma função escrita para dentro do worker (string, porque o
   worker não vê o código da página) */
const CODIGO_WORKER = `
function medir(ms) {
  var x = 0x9e3779b9 | 0, n = 0, t0 = performance.now(), t = t0;
  while (t - t0 < ms) {
    for (var i = 0; i < ${LOTE}; i++) {
      x = (Math.imul(x, 1664525) + 1013904223) | 0;
      x ^= x >>> 15;
      x = Math.imul(x, 2246822513);
      x ^= x >>> 13;
    }
    n += ${LOTE};
    t = performance.now();
  }
  globalThis.__ajBenchSink = x;
  return { n: n, ms: t - t0 };
}
self.onmessage = function () {
  try {
    medir(${AQUECER});
    var r = medir(${DURACAO});
    self.postMessage({ ok: true, n: r.n, ms: r.ms });
  } catch (err) {
    self.postMessage({ ok: false, erro: String(err) });
  }
};
`

const pontuar = (r) => Math.round(r.n / (r.ms / 1000) / 1e6)

/** 1 núcleo — trava a página ~1,7 s, por isso só se chama já com spinner */
export function benchST() {
  return new Promise((resolve) => {
    // deixa o ecrã repintar antes de a página travar
    setTimeout(() => {
      medir(AQUECER)
      resolve(pontuar(medir(DURACAO)))
    }, 60)
  })
}

/** todos os núcleos — um worker por núcleo, a página continua livre */
export function benchMT(nucleos) {
  const n = Math.max(2, Math.min(Number(nucleos) || 0, 32)) || 4
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    let url = null
    const workers = []
    const ganhos = []
    let feito = 0
    let terminado = false
    const concluir = (valor) => {
      if (terminado) return
      terminado = true
      workers.forEach((w) => {
        try {
          w.terminate()
        } catch {
          /* já morreu */
        }
      })
      if (url) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* nada */
        }
      }
      resolve(valor)
    }
    try {
      url = URL.createObjectURL(new Blob([CODIGO_WORKER], { type: 'text/javascript' }))
      for (let i = 0; i < n; i++) {
        const w = new Worker(url)
        workers.push(w)
        w.onmessage = (e) => {
          if (e.data && e.data.ok) ganhos.push(e.data)
          feito++
          if (feito === n) {
            if (!ganhos.length) return concluir(null)
            const soma = ganhos.reduce((a, g) => a + g.n, 0)
            const dur = ganhos.reduce((a, g) => Math.max(a, g.ms), 0)
            concluir({ st: null, mt: Math.round(soma / (dur / 1000) / 1e6), nucleos: ganhos.length })
          }
        }
        w.onerror = () => {
          feito++
          if (feito === n) concluir(ganhos.length ? { mt: pontuar({ n: ganhos.reduce((a, g) => a + g.n, 0), ms: ganhos.reduce((a, g) => Math.max(a, g.ms), 0) }), nucleos: ganhos.length } : null)
        }
        w.postMessage({})
      }
    } catch {
      concluir(null)
    }
    // rede de segurança: se um worker morrer, não ficamos à espera
    setTimeout(() => concluir(null), (DURACAO + AQUECER) * 4)
  })
}

/** ST + MT — é isto que a página chama */
export async function correrBench() {
  const st = await benchST()
  const mt = await benchMT(navigator.hardwareConcurrency)
  // O bench cru sai em Mops/s (191 ST / 1534 MT numa CPU moderna).
  // Passamos a um índice na mesma gama do CPU-Z (ST ~600, MT ~5000
  // numa CPU de topo atual), aplicando uma constante igual aos dois
  // — assim a razão ST:MT (que é a que interessa comparar) mantém-se.
  const FATOR_CPUZ = 3.2
  return {
    st: st != null ? Math.round(st * FATOR_CPUZ) : null,
    mt: mt ? Math.round(mt.mt * FATOR_CPUZ) : null,
    nucleos: mt ? mt.nucleos : 1,
  }
}
