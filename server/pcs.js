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
const podeLocal = () => process.platform === 'win32' && !process.env.VERCEL;

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
   Duas fontes, por ordem de qualidade:
   1) CPU-Z (cpu.real): relógio a trabalhar, teto de fábrica, tensão
      e — para a RAM — o que está a correr vs o teto JEDEC do módulo
      (é isso que prova o XMP/EXPO).
   2) Contadores do Windows (repouso/carga) contra o clock nominal.
   Sem nenhuma: dizemos "sem dados" em vez de inventar.            */
function analisar(d) {
  const av = { cpu: null, ram: null, gpu: null, temOverclock: false, fonte: null };

  const cpu = d.cpu || {};
  const real = cpu.real || null;

  if (real && (real.relogio_max_mhz || real.relogio_mhz)) {
    const teto = num(real.teto_fabrica_mhz);
    const atual = num(real.relogio_max_mhz) || num(real.relogio_mhz);
    let desvio = null;
    let estado = 'sem-dados';
    if (teto && atual) {
      desvio = Math.round(((atual - teto) / teto) * 100);
      // boost/PBO mexe 2-4% acima do teto anunciado; overclock a sério passa disso
      estado = desvio >= 5 ? 'overclock' : desvio >= 2 ? 'boost' : 'normal';
    }
    av.fonte = 'cpu-z';
    av.cpu = {
      fonte: 'cpu-z',
      versao: real.versao || null,
      relogio_mhz: atual || null,
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
    const fabrica = num(cpu.clock_fabrica_mhz);
    const carga = num(cpu.relogio_carga_mhz);
    const repouso = num(cpu.relogio_repouso_mhz);
    const atual = carga || repouso;
    let desvio = null;
    let estado = 'sem-dados';
    if (atual && fabrica) {
      desvio = Math.round(((atual - fabrica) / fabrica) * 100);
      estado = desvio >= 5 ? 'overclock' : desvio >= 2 ? 'boost' : 'normal';
    }
    av.fonte = 'contadores';
    av.cpu = {
      fonte: 'contadores',
      versao: null,
      relogio_mhz: atual,
      relogio_repouso_mhz: repouso,
      relogio_carga_mhz: carga,
      teto_fabrica_mhz: fabrica,
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

  /* ---- RAM: o que corre vs o teto JEDEC (XMP/EXPO é isso) ---- */
  const mods = (d.ram && d.ram.modulos) || [];
  if (real && num(real.memoria_mhz)) {
    const aplicada = num(real.memoria_mhz);
    const jedec = num(real.memoria_jedec_mhz);
    const kit = num(real.memoria_kit_mhz);
    const estado = jedec && aplicada > jedec ? 'xmp' : 'normal';
    av.ram = {
      total_gb: (d.ram && d.ram.total_gb) || null,
      slots: (d.ram && d.ram.slots) || null,
      aplicada_mhz: aplicada,
      jedec_mhz: jedec,
      kit_mhz: kit,
      tipo: real.memoria_tipo || (d.ram && d.ram.geracao) || null,
      tensao_xmp_v: num(real.memoria_xmp_v),
      tem_xmp: Boolean(real.memoria_tem_xmp),
      modulos: mods.map((m) => ({
        referencia: m.referencia || null,
        tamanho_gb: m.tamanho_gb || null,
        mhz: num(m.velocidade_mhz),
        aplicada_mhz: num(m.aplicada_mhz),
        cas: m.cas || null,
        tensao_v: num(m.tensao_v),
      })),
      estado,
    };
  } else if (mods.length) {
    const padrao = num((d.ram && d.ram.padrao_mhz) || 0) || null;
    const aplicada = num(mods[0].aplicada_mhz);
    const kit = num(mods[0].velocidade_mhz);
    const estado = padrao && aplicada && aplicada > padrao ? 'xmp' : 'normal';
    av.ram = {
      total_gb: (d.ram && d.ram.total_gb) || null,
      slots: (d.ram && d.ram.slots) || null,
      aplicada_mhz: aplicada,
      jedec_mhz: padrao,
      kit_mhz: kit,
      tipo: (d.ram && d.ram.geracao) || null,
      tensao_xmp_v: null,
      tem_xmp: false,
      modulos: mods.map((m) => ({
        referencia: m.referencia || null,
        tamanho_gb: m.tamanho_gb || null,
        mhz: num(m.velocidade_mhz),
        aplicada_mhz: num(m.aplicada_mhz),
        cas: m.cas || null,
        tensao_v: num(m.tensao_v),
      })),
      estado,
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

  av.temOverclock =
    (av.cpu && av.cpu.estado === 'overclock') || (av.ram && av.ram.estado === 'xmp');
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
