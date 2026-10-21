/* ============================================================
   Leitura REAL do PC (Windows) — via PowerShell
   ------------------------------------------------------------
   O browser não chega aos relógios nem aos timings; o Windows
   chega (WMI/CIM). Aqui corremos o script server/scripts/lerpc.ps1
   no PC onde o servidor está a correr, mostramos o que ele faz e
   analisamos os valores: o que está acima do de fabrico é sinal
   de overclock (CPU e RAM). A GPU só dá relógios com NVIDIA
   (nvidia-smi) — dizemo-lo em vez de inventar números.
   ============================================================ */
const { spawn } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, 'scripts', 'lerpc.ps1');

/* Só faz sentido em Windows fora da Vercel (lá não há PowerShell). */
const podeLocal = () =>
  process.platform === 'win32' && !process.env.VERCEL && process.env.AGENTE_REMOTO !== '1';

/* estado da recolha — o site lê isto para mostrar os passos a andar */
const estado = {
  aCorrer: false,
  pronto: false,
  passos: [],
  inicio: null,
  fim: null,
  erro: null,
};

function estadoPublico() {
  return { ...estado, podeLocal: podeLocal(), agora: new Date().toISOString() };
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* ---------- análise: o que está a correr vs o de fábrica ----------
   Fontes, por ordem:
   1) Leitura nativa (cpu.real): contadores do Windows + SMBIOS —
      relógio a medir e o TETO DE FÁBRICA real (o mesmo que o
      CPU-Z mostra). O CPU-Z, se já estiver instalado, só acrescenta
      tensão, temperatura e os TIMINGS da RAM.
   2) Leitura antiga de contadores (linhas já guardadas).
   3) Só o nome do Windows: dizemos "sem dados", nunca inventamos.

   Regra da CPU — comparamos SEMPRE com o teto de fábrica:
   • acima do teto -> overclock  (está acima do de fábrica)
   • no teto       -> boost      (chega ao máximo de fábrica)
   • abaixo        -> normal                                */
function estadoRelogio(teto, base, atual) {
  if (teto && atual) {
    const desvio = Math.round(((atual - teto) / teto) * 100);
    let estado = 'normal';
    if (atual > teto * 1.005) estado = 'overclock';
    else if (atual >= teto * 0.995) estado = 'boost';
    return { estado, desvio };
  }
  if (base && atual) {
    // sem teto confirmado só dá para comparar com o clock de fábrica —
    // aí nunca afirmamos overclock, só "passa do base"
    const desvio = Math.round(((atual - base) / base) * 100);
    return { estado: desvio >= 8 ? 'boost' : 'normal', desvio };
  }
  return { estado: 'sem-dados', desvio: null };
}

/* RAM: o que está a correr vs o que é de origem.
   "overclock de memórias" = timings diferentes dos de fábrica ou
   MHz acima do que o kit declara. XMP/EXPO = acima do teto JEDEC. */
function estadoMemoria(aplicada, jedec, kit, timings) {
  const norm = (s) =>
    String(s)
      .split('-')
      .map((x) => String(parseInt(x, 10)))
      .join('-');
  const temTimings =
    Boolean(timings && timings.atual && timings.xmp) &&
    norm(timings.atual) !== norm(timings.xmp);
  const acimaKit = Boolean(kit && aplicada && aplicada > kit);
  const temXmp = Boolean(jedec && aplicada && aplicada > jedec);
  return {
    estado: temTimings || acimaKit ? 'overclock' : temXmp ? 'xmp' : 'normal',
    tem_xmp: temXmp,
    timings_alterados: temTimings,
    acima_do_kit: acimaKit,
  };
}

function analisar(d) {
  const av = { cpu: null, ram: null, gpu: null, temOverclock: false, fonte: null };

  const cpu = d.cpu || {};
  const real = cpu.real || null;

  if (real && (real.relogio_max_mhz || real.relogio_mhz)) {
    const atual = num(real.relogio_max_mhz) || num(real.relogio_mhz);
    const teto = num(real.teto_fabrica_mhz);
    const { estado, desvio } = estadoRelogio(teto, num(cpu.clock_fabrica_mhz), atual);
    av.fonte = real.fonte || 'nativo';
    av.cpu = {
      fonte: real.fonte || 'nativo',
      versao: real.versao || null,
      relogio_mhz: atual || null,
      relogio_repouso_mhz: num(real.relogio_repouso_mhz),
      relogio_carga_mhz: num(real.relogio_carga_mhz),
      teto_fabrica_mhz: teto || null,
      relogio_min_mhz: num(real.relogio_min_mhz),
      bclk_mhz: num(real.bclk_mhz),
      tensao_v: num(real.tensao_v),
      temperatura_c: num(real.temperatura_c),
      potencia_w: num(real.potencia_w),
      tdp_w: num(real.tdp_w),
      desvio_pct: desvio,
      estado,
    };
  } else if (num(cpu.relogio_carga_mhz) || num(cpu.relogio_repouso_mhz)) {
    const base = num(cpu.clock_fabrica_mhz);
    const carga = num(cpu.relogio_carga_mhz);
    const repouso = num(cpu.relogio_repouso_mhz);
    const atual = carga || repouso;
    const teto = num(cpu.teto_fabrica);
    const { estado, desvio } = estadoRelogio(teto, base, atual);
    av.fonte = 'contadores';
    av.cpu = {
      fonte: 'contadores',
      versao: null,
      relogio_mhz: atual,
      relogio_repouso_mhz: repouso,
      relogio_carga_mhz: carga,
      teto_fabrica_mhz: teto,
      relogio_min_mhz: null,
      bclk_mhz: null,
      tensao_v: num(cpu.tensao_v),
      temperatura_c: null,
      potencia_w: null,
      tdp_w: null,
      desvio_pct: desvio,
      estado,
    };
  } else if (cpu.nome) {
    av.fonte = 'sistema';
    av.cpu = {
      fonte: 'sistema',
      versao: null,
      relogio_mhz: num(cpu.relogio_reportado_mhz) || num(cpu.clock_fabrica_mhz),
      teto_fabrica_mhz: num(cpu.clock_fabrica_mhz),
      relogio_min_mhz: null,
      bclk_mhz: null,
      tensao_v: num(cpu.tensao_v),
      temperatura_c: null,
      potencia_w: null,
      tdp_w: null,
      desvio_pct: null,
      estado: 'sem-dados',
    };
  }

  /* ---- RAM: o que corre vs o de origem (JEDEC/XMP + timings) ---- */
  const mods = (d.ram && d.ram.modulos) || [];
  const mapearModulos = (lista) =>
    lista.map((m) => ({
      referencia: m.referencia || null,
      tamanho_gb: m.tamanho_gb || null,
      mhz: num(m.velocidade_mhz),
      aplicada_mhz: num(m.aplicada_mhz),
      cas: m.cas || null,
      tensao_v: num(m.tensao_v),
    }));

  if (real && num(real.memoria_mhz)) {
    const aplicada = num(real.memoria_mhz);
    const jedec = num(real.memoria_jedec_mhz);
    const kit = num(real.memoria_kit_mhz);
    const timings = real.memoria_timings || null;
    const r = estadoMemoria(aplicada, jedec, kit, timings);
    av.ram = {
      total_gb: (d.ram && d.ram.total_gb) || null,
      slots: (d.ram && d.ram.slots) || null,
      aplicada_mhz: aplicada,
      jedec_mhz: jedec,
      kit_mhz: kit,
      tipo: real.memoria_tipo || (d.ram && d.ram.geracao) || null,
      tensao_xmp_v: num(real.memoria_xmp_v),
      cl_fabrica: num(real.memoria_cl_fabrica),
      tem_xmp: r.tem_xmp || Boolean(real.memoria_tem_xmp && r.tem_xmp),
      timings: timings && timings.atual
        ? { atual: timings.atual, xmp: timings.xmp || null, alterado: r.timings_alterados }
        : null,
      modulos: mapearModulos(mods),
      estado: r.estado,
    };
  } else if (mods.length) {
    const padrao = num((d.ram && d.ram.padrao_mhz) || 0) || null;
    const aplicada = num(mods[0].aplicada_mhz);
    const kit = num(mods[0].velocidade_mhz);
    const r = estadoMemoria(aplicada, padrao, kit, null);
    av.ram = {
      total_gb: (d.ram && d.ram.total_gb) || null,
      slots: (d.ram && d.ram.slots) || null,
      aplicada_mhz: aplicada,
      jedec_mhz: padrao,
      kit_mhz: kit,
      tipo: (d.ram && d.ram.geracao) || null,
      tensao_xmp_v: null,
      cl_fabrica: null,
      tem_xmp: r.tem_xmp,
      timings: null,
      modulos: mapearModulos(mods),
      estado: r.estado,
    };
  }

  const g = d.gpu || {};
  if (g.nome) {
    av.gpu = {
      nome: g.nome,
      memoria_gb: g.memoria_gb || null,
      clock_base_mhz: num(g.clock_base_mhz),
      clock_atual_mhz: num(g.clock_atual_mhz),
      clock_mem_mhz: num(g.clock_mem_mhz),
      temperatura: num(g.temperatura),
      potencia_atual_w: num(g.potencia_atual_w),
      limite_w: num(g.limite_w),
      // AMD/Intel não expõem relógios ao Windows — dizemo-lo
      estado: g.clock_base_mhz ? 'com-relogios' : 'sem-relogios',
    };
  }

  /* um destes basta para a linha contar como "não é de fábrica":
     CPU acima do teto, RAM com perfil ligado ou RAM alterada */
  av.temOverclock = Boolean(
    (av.cpu && av.cpu.estado === 'overclock') ||
      (av.ram && (av.ram.estado === 'xmp' || av.ram.estado === 'overclock')),
  );

  // --- Distinções automáticas ---
  // 1) Qual componente tem overclock (cpu ou ram)
  av.componentes_overclock = []
  if (av.cpu && av.cpu.estado === 'overclock') av.componentes_overclock.push('CPU')
  if (av.ram && av.ram.estado === 'overclock') av.componentes_overclock.push('RAM')

  // 2) Tem algum overclock?
  av.tem_overclock_qualquer = Boolean(
    (av.cpu && av.cpu.estado === 'overclock') ||
      (av.ram && av.ram.estado === 'overclock')
  )

  // 3) Melhor PC = quem tem o maior score MT no bench
  if (av.bench && num(av.bench.mt)) {
    av.melhor_pc = false // será comparado na lista abaixo
  }

  return av;
}

/** o que passa para as colunas básicas da tabela */
function camposBasicos(d) {
  const somaDiscos = ((d.discos || []).reduce((a, x) => a + (num(x.tamanho_gb) || 0), 0)) || 0;
  return {
    os: (d.sistema && d.sistema.so) || null,
    cpu_cores: num(d.cpu && d.cpu.nucleos) || null,
    ram_gb: num(d.ram && d.ram.total_gb) || null,
    gpu: (d.gpu && d.gpu.nome) || null,
    storage_gb: somaDiscos > 0 ? Math.round(somaDiscos) : null,
  };
}

/* ---------- correr o script ---------- */
function correr() {
  return new Promise((resolve) => {
    if (!podeLocal()) {
      return resolve({ ok: false, erro: 'Este servidor não está num PC Windows.' });
    }
    if (estado.aCorrer) return resolve({ ok: false, erro: 'Já há uma leitura em curso.' });

    estado.aCorrer = true;
    estado.pronto = false;
    estado.passos = [];
    estado.erro = null;
    estado.inicio = new Date().toISOString();
    estado.fim = null;

    const saida = [];
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT],
      { windowsHide: true },
    );

    // rede de segurança: se o CPU-Z/PowerShell ficar agarrado, mata-o
    let resolvido = false;
    const limite = setTimeout(() => {
      if (resolvido) return;
      try {
        proc.kill();
      } catch {
        /* já saiu */
      }
      resolvido = true;
      estado.aCorrer = false;
      estado.fim = new Date().toISOString();
      estado.erro = 'A leitura demorou demasiado e foi interrompida.';
      resolve({ ok: false, erro: estado.erro, passos: estado.passos });
    }, 75000);

    const linha = (buf) => {
      String(buf)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((l) => {
          if (l.startsWith('[passo]')) {
            const t = l.replace(/^\[passo\]\s*/, '');
            estado.passos.push(t);
          } else {
            saida.push(l);
          }
        });
    };

    proc.stdout.on('data', linha);
    proc.stderr.on('data', (b) => {
      const t = String(b).trim();
      if (t) estado.passos.push('aviso: ' + t.slice(0, 200));
    });

    proc.on('error', (e) => {
      clearTimeout(limite);
      if (resolvido) return;
      resolvido = true;
      estado.aCorrer = false;
      estado.fim = new Date().toISOString();
      estado.erro = `Não deu para abrir o PowerShell: ${e.message}`;
      resolve({ ok: false, erro: estado.erro });
    });

    proc.on('close', () => {
      clearTimeout(limite);
      if (resolvido) return;
      resolvido = true;
      estado.aCorrer = false;
      estado.fim = new Date().toISOString();
      // o script escreve o JSON na última linha
      let dados = null;
      for (let i = saida.length - 1; i >= 0 && !dados; i--) {
        try {
          dados = JSON.parse(saida[i]);
        } catch {
          /* continua a procurar */
        }
      }
      if (!dados) {
        estado.erro = 'O PowerShell não devolveu dados.';
        estado.pronto = true;
        return resolve({ ok: false, erro: estado.erro, passos: estado.passos });
      }
      estado.pronto = true;
      resolve({ ok: true, dados, passos: estado.passos });
    });
  });
}

module.exports = { podeLocal, estadoPublico, correr, analisar, camposBasicos };
