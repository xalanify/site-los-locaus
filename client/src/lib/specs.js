/* ============================================================
   Specs do PC — o que o browser consegue ler
   ------------------------------------------------------------
   O navegador só expõe uma parte da máquina (SO, núcleos, RAM,
   GPU via WebGL, ecrã e quota de armazenamento). Tudo isto é
   recolhido aqui, enviado ao servidor e guardado com uma baseline
   — a primeira leitura — para dar a diferença quando o PC mudar.
   ============================================================ */

function parseOS(uad, ua) {
  const p = (uad && uad.platform) || ''
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Win/i.test(p) || /Windows NT/i.test(ua)) return 'Windows'
  if (/Mac/i.test(p) || /Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(p) || /Linux/i.test(ua)) return 'Linux'
  return p || 'Desconhecido'
}

function parseBrowser(ua) {
  const test = [
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ['Opera', /OPR\/([\d.]+)/],
    ['Firefox', /Firefox\/([\d.]+)/],
    ['Chrome', /Chrome\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ]
  for (const [nome, re] of test) {
    const m = ua.match(re)
    if (m) return m[1] ? `${nome} ${m[1].split('.')[0]}` : nome
  }
  return 'Desconhecido'
}

/* "ANGLE (NVIDIA GeForce RTX 3070 Direct3D11 ...)" -> "NVIDIA GeForce RTX 3070" */
function limparGPU(s) {
  if (!s) return null
  let g = String(s)
  const dentro = g.match(/^ANGLE \((.*)\)$/i)
  if (dentro) g = dentro[1]
  g = g.split(/ Direct3D| OpenGL| Vulkan| D3D\d| vs_| GL \d|,\s*$| [0-9]+Bits/i)[0]
  g = g.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  return g.slice(0, 200) || null
}

function lerGPU() {
  try {
    const cv = document.createElement('canvas')
    const gl = cv.getContext('webgl') || cv.getContext('experimental-webgl')
    if (!gl) return null
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const r = dbg
      ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER)
    return limparGPU(r)
  } catch {
    return null
  }
}

/** Recolhe as specs do PC. Devolve um objeto pronto para o POST. */
export async function coletarSpecs() {
  const ua = navigator.userAgent || ''
  const uad = navigator.userAgentData || null

  // versão do Windows (só Chromium) — distingue 10 de 11
  let os = parseOS(uad, ua)
  if (os === 'Windows') {
    try {
      if (uad && uad.getHighEntropyValues) {
        const hi = await uad.getHighEntropyValues(['platformVersion'])
        const v = String(hi.platformVersion || '')
        if (v.startsWith('13.') || v.startsWith('14.')) os = 'Windows 11'
        else if (v.startsWith('10.')) os = 'Windows 10'
      }
      if (os === 'Windows') {
        const m = ua.match(/Windows NT ([\d.]+)/)
        if (m && m[1] === '10.0') os = 'Windows 10/11'
        else if (m) os = `Windows NT ${m[1]}`
      }
    } catch {
      /* fica só "Windows" */
    }
  }

  let storage_gb = null
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate()
      if (e && e.quota) storage_gb = Math.round(e.quota / 1024 ** 3)
    }
  } catch {
    /* opcional */
  }

  const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100

  return {
    os,
    browser: parseBrowser(ua),
    cpu_cores: navigator.hardwareConcurrency || null,
    ram_gb: navigator.deviceMemory || null,
    gpu: lerGPU(),
    screen: `${window.screen.width}×${window.screen.height} @${dpr}x`,
    storage_gb,
  }
}

/* ============================================================
   Stress test de CPU — um workload medido no browser.
   Devolve o score em operações/segundo; serve para comparar
   máquinas (e para ver desvios face à baseline do próprio PC).
   ============================================================ */
export function stressCPU(ms = 2500) {
  return new Promise((resolve) => {
    const t0 = performance.now()
    let ops = 0
    let x = 123456789 ^ (t0 | 0)

    const passo = () => {
      const slice = performance.now() + 40
      while (performance.now() < slice) {
        for (let i = 0; i < 20000; i++) {
          x ^= x << 13
          x ^= x >>> 17
          x ^= x << 5
          x = (Math.imul(x, 1103515245) + 12345) | 0
        }
        ops += 20000
      }
      const decorrido = performance.now() - t0
      if (decorrido < ms) {
        setTimeout(passo, 0)
      } else {
        const segs = decorrido / 1000
        resolve({
          score: Math.round(ops / segs),
          ops,
          segundos: Math.round(segs * 10) / 10,
        })
      }
    }
    setTimeout(passo, 0)
  })
}

/** Envia as specs para o servidor (a cada entrada — só se algo mudou). */
export async function enviarSpecs(extra = {}) {
  const { authHeaders } = await import('./auth')
  const specs = { ...(await coletarSpecs()), ...extra }
  const res = await fetch('/api/users/specs/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(specs),
  })
  return res.ok ? res.json().catch(() => ({})) : null
}
