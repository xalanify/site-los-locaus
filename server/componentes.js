// ============================================================
//  COMPONENTES E PERIFÉRICOS — catálogo + comparação de preços
//
//  Catálogo curado (modelos concretos, para a comparação ser
//  justa) e leitura dos preços públicos das lojas:
//    · PCDiga          (componentes + periféricos)
//    · GlobalData      (componentes + periféricos)
//    · PCComponentes   (componentes + periféricos)
//    · MaxGaming       (só periféricos)
//
//  Os preços ficam guardados na BD (componentes_precos) para
//  não bater nas lojas a cada visita. O admin pode atualizar
//  tudo com um botão e corrigir um preço à mão (a PCDiga tem
//  proteção Cloudflare, por isso muitas vezes só o link entra).
// ============================================================
const { getDb } = require('./database');

const LOJAS = {
  pcdiga: {
    id: 'pcdiga',
    nome: 'PCDiga',
    base: 'https://www.pcdiga.com',
    pesquisaBase: 'https://www.pcdiga.com/catalogsearch/result/?q=',
    cor: '#e30613',
    componentes: true,
    perifericos: true,
  },
  globaldata: {
    id: 'globaldata',
    nome: 'GlobalData',
    base: 'https://www.globaldata.pt',
    pesquisaBase: 'https://www.globaldata.pt/search?q=',
    cor: '#0ea5e9',
    componentes: true,
    perifericos: true,
  },
  pccomponentes: {
    id: 'pccomponentes',
    nome: 'PCComponentes',
    base: 'https://www.pccomponentes.pt',
    pesquisaBase: 'https://www.pccomponentes.pt/search/?query=',
    cor: '#f97316',
    componentes: true,
    perifericos: true,
  },
  maxgaming: {
    id: 'maxgaming',
    nome: 'MaxGaming',
    base: 'https://www.maxgaming.com',
    pesquisaBase: 'https://www.maxgaming.com/search?q=',
    cor: '#e11d48',
    componentes: false,
    perifericos: true,
  },
  ldlc: {
    id: 'ldlc',
    nome: 'LDLC',
    base: 'https://www.ldlc.com',
    pesquisaBase: 'https://www.ldlc.com/recherche/',
    pesquisaSufixo: '/',
    cor: '#2563eb',
    componentes: true,
    perifericos: true,
  },
};

const CATEGORIAS = [
  { id: 'gpu', nome: 'Placas Gráficas', tipo: 'componente', icone: 'gpu' },
  { id: 'cpu', nome: 'Processadores', tipo: 'componente', icone: 'cpu' },
  { id: 'ram', nome: 'Memórias RAM', tipo: 'componente', icone: 'ram' },
  { id: 'motherboard', nome: 'Placas-mãe', tipo: 'componente', icone: 'motherboard' },
  { id: 'ssd', nome: 'Armazenamento', tipo: 'componente', icone: 'ssd' },
  { id: 'psu', nome: 'Fontes de Alimentação', tipo: 'componente', icone: 'psu' },
  { id: 'caixa', nome: 'Caixas', tipo: 'componente', icone: 'caixa' },
  { id: 'cooler', nome: 'Refrigeração', tipo: 'componente', icone: 'cooler' },
  { id: 'rato', nome: 'Ratos', tipo: 'periferico', icone: 'rato' },
  { id: 'teclado', nome: 'Teclados', tipo: 'periferico', icone: 'teclado' },
  { id: 'mousepad', nome: 'Mousepads', tipo: 'periferico', icone: 'mousepad' },
  { id: 'headset', nome: 'Headsets', tipo: 'periferico', icone: 'headset' },
  { id: 'microfone', nome: 'Microfones', tipo: 'periferico', icone: 'microfone' },
];

const C = (id, nome, marca, categoria, spec, consulta, lojas) => ({
  id,
  nome,
  marca,
  categoria,
  tipo: categoria === 'rato' || categoria === 'teclado' || categoria === 'mousepad' || categoria === 'headset' || categoria === 'microfone' ? 'periferico' : 'componente',
  spec,
  consulta,
  lojas: lojas || ['pcdiga', 'globaldata', 'pccomponentes', 'ldlc'],
});

const CATALOGO = [
  /* ---------------- Placas gráficas ---------------- */
  C('gpu-5070ti-ventus', 'RTX 5070 Ti Ventus 3X OC', 'MSI', 'gpu', '16 GB GDDR7 · DLSS 4', 'MSI GeForce RTX 5070 Ti Ventus 3X OC 16GB'),
  C('gpu-5070-tuf', 'RTX 5070 TUF OC', 'ASUS', 'gpu', '12 GB GDDR7 · DLSS 4', 'ASUS TUF GeForce RTX 5070 OC 12GB'),
  C('gpu-5080-gaming', 'RTX 5080 Gaming OC', 'Gigabyte', 'gpu', '16 GB GDDR7 · DLSS 4', 'Gigabyte GeForce RTX 5080 Gaming OC 16GB'),
  C('gpu-5090-trio', 'RTX 5090 Gaming Trio OC', 'MSI', 'gpu', '32 GB GDDR7 · DLSS 4', 'MSI GeForce RTX 5090 Gaming Trio OC 32GB'),
  C('gpu-9070xt-pulse', 'RX 9070 XT Pulse', 'Sapphire', 'gpu', '16 GB GDDR6 · FSR 4', 'Sapphire Pulse Radeon RX 9070 XT 16GB'),
  C('gpu-9060xt-dual', 'RX 9060 XT Dual OC', 'ASUS', 'gpu', '16 GB GDDR6 · FSR 4', 'ASUS Dual Radeon RX 9060 XT 16GB'),
  C('gpu-5060ti-gaming', 'RTX 5060 Ti Gaming OC', 'Gigabyte', 'gpu', '16 GB GDDR7 · DLSS 4', 'Gigabyte GeForce RTX 5060 Ti Gaming OC 16GB'),

  /* ---------------- Processadores ---------------- */
  C('cpu-9800x3d', 'Ryzen 7 9800X3D', 'AMD', 'cpu', '8 núcleos · 16 threads · 3D V-Cache', 'AMD Ryzen 7 9800X3D'),
  C('cpu-9700x', 'Ryzen 7 9700X', 'AMD', 'cpu', '8 núcleos · 16 threads · 5,5 GHz', 'AMD Ryzen 7 9700X'),
  C('cpu-9600x', 'Ryzen 5 9600X', 'AMD', 'cpu', '6 núcleos · 12 threads · 5,4 GHz', 'AMD Ryzen 5 9600X'),
  C('cpu-7600x', 'Ryzen 5 7600X', 'AMD', 'cpu', '6 núcleos · 12 threads · 5,3 GHz', 'AMD Ryzen 5 7600X'),
  C('cpu-285k', 'Core Ultra 9 285K', 'Intel', 'cpu', '24 núcleos · 5,7 GHz', 'Intel Core Ultra 9 285K'),
  C('cpu-14600kf', 'Core i5-14600KF', 'Intel', 'cpu', '14 núcleos · 5,3 GHz', 'Intel Core i5-14600KF'),
  C('cpu-14700k', 'Core i7-14700K', 'Intel', 'cpu', '20 núcleos · 5,6 GHz', 'Intel Core i7-14700K'),

  /* ---------------- Memórias ---------------- */
  C('ram-vengeance-32', 'Vengeance DDR5 32 GB 6000', 'Corsair', 'ram', '2×16 GB · CL30 · EXPO/XMP', 'Corsair Vengeance DDR5 32GB 6000MHz CL30'),
  C('ram-trident-32', 'Trident Z5 Neo RGB 32 GB', 'G.Skill', 'ram', '2×16 GB · CL30 · EXPO', 'G.Skill Trident Z5 Neo RGB 32GB 6000MHz CL30'),
  C('ram-fury-32', 'Fury Beast DDR5 32 GB', 'Kingston', 'ram', '2×16 GB · CL30 · EXPO/XMP', 'Kingston Fury Beast DDR5 32GB 6000MHz CL30'),
  C('ram-tforce-32', 'T-Force Delta RGB 32 GB', 'TeamGroup', 'ram', '2×16 GB · CL30 · RGB', 'TeamGroup T-Force Delta RGB DDR5 32GB 6000MHz CL30'),

  /* ---------------- Placas-mãe ---------------- */
  C('mb-b650-tuf', 'TUF Gaming B650-PLUS WIFI', 'ASUS', 'motherboard', 'AM5 · DDR5 · Wi-Fi 6', 'ASUS TUF Gaming B650-PLUS WIFI'),
  C('mb-b650-tomahawk', 'MAG B650 Tomahawk WIFI', 'MSI', 'motherboard', 'AM5 · DDR5 · Wi-Fi 6E', 'MSI MAG B650 Tomahawk WIFI'),
  C('mb-x870-aorus', 'X870 Aorus Elite WIFI7', 'Gigabyte', 'motherboard', 'AM5 · DDR5 · Wi-Fi 7', 'Gigabyte X870 Aorus Elite WIFI7'),
  C('mb-b850-strix', 'ROG Strix B850-F Gaming', 'ASUS', 'motherboard', 'AM5 · DDR5 · Wi-Fi 7', 'ASUS ROG Strix B850-F Gaming WIFI'),

  /* ---------------- Armazenamento ---------------- */
  C('ssd-990pro-2tb', '990 Pro 2 TB', 'Samsung', 'ssd', 'NVMe PCIe 4.0 · 7450 MB/s', 'Samsung 990 Pro 2TB NVMe PCIe 4.0'),
  C('ssd-sn850x-2tb', 'Black SN850X 2 TB', 'WD', 'ssd', 'NVMe PCIe 4.0 · 7300 MB/s', 'WD Black SN850X 2TB NVMe'),
  C('ssd-p3plus-2tb', 'P3 Plus 2 TB', 'Crucial', 'ssd', 'NVMe PCIe 4.0 · 5000 MB/s', 'Crucial P3 Plus 2TB NVMe'),
  C('ssd-nv3-1tb', 'NV3 1 TB', 'Kingston', 'ssd', 'NVMe PCIe 4.0 · 6000 MB/s', 'Kingston NV3 1TB NVMe'),

  /* ---------------- Fontes ---------------- */
  C('psu-rm850x', 'RM850x 850 W', 'Corsair', 'psu', '80+ Gold · Full modular · ATX 3.1', 'Corsair RM850x 850W 80 Plus Gold'),
  C('psu-focus-gx850', 'Focus GX-850 850 W', 'Seasonic', 'psu', '80+ Gold · Full modular · ATX 3.0', 'Seasonic Focus GX-850 850W Gold'),
  C('psu-a850gl', 'MAG A850GL 850 W', 'MSI', 'psu', '80+ Gold · Full modular · ATX 3.1', 'MSI MAG A850GL PCIE5 850W Gold'),
  C('psu-c850', 'C850 850 W', 'NZXT', 'psu', '80+ Gold · Full modular · ATX 3.1', 'NZXT C850 Gold 850W'),

  /* ---------------- Caixas ---------------- */
  C('case-h5-flow', 'H5 Flow', 'NZXT', 'caixa', 'Mid Tower · ATX · airflow', 'NZXT H5 Flow'),
  C('case-lancool216', 'Lancool 216', 'Lian Li', 'caixa', 'Mid Tower · ATX · 2× 160 mm', 'Lian Li Lancool 216'),
  C('case-4000d', '4000D Airflow', 'Corsair', 'caixa', 'Mid Tower · ATX · airflow', 'Corsair 4000D Airflow'),
  C('case-north', 'North', 'Fractal Design', 'caixa', 'Mid Tower · ATX · madeira', 'Fractal Design North'),

  /* ---------------- Refrigeração ---------------- */
  C('cool-pa120', 'Peerless Assassin 120 SE', 'Thermalright', 'cooler', 'Torre dupla · 6 heatpipes', 'Thermalright Peerless Assassin 120 SE'),
  C('cool-nhd15', 'NH-D15', 'Noctua', 'cooler', 'Torre dupla · 2× NF-A15', 'Noctua NH-D15'),
  C('cool-lf3-360', 'Liquid Freezer III 360', 'Arctic', 'cooler', 'AIO 360 mm · ARGB', 'Arctic Liquid Freezer III 360'),
  C('cool-kraken240', 'Kraken 240', 'NZXT', 'cooler', 'AIO 240 mm · LCD', 'NZXT Kraken 240'),

  /* ---------------- Ratos ---------------- */
  C('mouse-gpx2', 'G Pro X Superlight 2', 'Logitech', 'rato', 'Sem fio · 60 g · HERO 2 · 4K', 'Logitech G Pro X Superlight 2', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('mouse-viper-v3', 'Viper V3 Pro', 'Razer', 'rato', 'Sem fio · 54 g · Focus Pro 35K', 'Razer Viper V3 Pro', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('mouse-maya-x', 'Maya X', 'Lamzu', 'rato', 'Sem fio · 47 g · 8K polling', 'Lamzu Maya X', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('mouse-ec2cw', 'EC2-CW', 'Zowie', 'rato', 'Sem fio · 77 g · 3370', 'BenQ Zowie EC2-CW', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),

  /* ---------------- Teclados ---------------- */
  C('kb-wooting60he', '60HE+', 'Wooting', 'teclado', '60% · analógico · rapid trigger', 'Wooting 60HE+', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('kb-huntsman-v3', 'Huntsman V3 Pro TKL', 'Razer', 'teclado', 'TKL · analógico · Gen-2', 'Razer Huntsman V3 Pro TKL', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('kb-keychron-q1', 'Q1 HE', 'Keychron', 'teclado', '75% · Hall Effect · hot-swap', 'Keychron Q1 HE', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('kb-gpro-tkl', 'G Pro X TKL Lightspeed', 'Logitech', 'teclado', 'TKL · sem fio · GL switches', 'Logitech G Pro X TKL Lightspeed', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),

  /* ---------------- Mousepads ---------------- */
  C('mp-artisan-zero', 'Zero XL', 'Artisan', 'mousepad', 'XL · controlo · 490×420 mm', 'Artisan Zero XL', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('mp-saturn-pro', 'Saturn Pro XL', 'Pulsar', 'mousepad', 'XL · soft · 500×500 mm', 'Pulsar Saturn Pro XL Soft', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('mp-gigantus-xxl', 'Gigantus V2 XXL', 'Razer', 'mousepad', 'XXL · tecido · 940×410 mm', 'Razer Gigantus V2 XXL', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('mp-qck-heavy', 'QcK Heavy XXL', 'SteelSeries', 'mousepad', 'XXL · tecido · 900×400 mm', 'SteelSeries QcK Heavy XXL', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),

  /* ---------------- Headsets ---------------- */
  C('hs-cloud3', 'Cloud III', 'HyperX', 'headset', 'USB/3,5 mm · 53 mm · DTS', 'HyperX Cloud III', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('hs-nova-pro', 'Arctis Nova Pro', 'SteelSeries', 'headset', 'Base station · ANC · 360°', 'SteelSeries Arctis Nova Pro', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('hs-gprox2', 'G Pro X 2 Lightspeed', 'Logitech', 'headset', 'Sem fio · graphene · 50 mm', 'Logitech G Pro X 2 Lightspeed', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('hs-blackshark', 'BlackShark V2 Pro', 'Razer', 'headset', 'Sem fio · 50 mm · THX', 'Razer BlackShark V2 Pro', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),

  /* ---------------- Microfones ---------------- */
  C('mic-quadcast', 'QuadCast S', 'HyperX', 'microfone', 'USB · condensador · RGB', 'HyperX QuadCast S', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('mic-mv7', 'MV7+', 'Shure', 'microfone', 'USB/XLR · dinâmico · DSP', 'Shure MV7+', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
  C('mic-wave3', 'Wave:3', 'Elgato', 'microfone', 'USB · condensador · 24-bit', 'Elgato Wave 3', ['pcdiga', 'globaldata', 'pccomponentes', 'maxgaming']),
];

const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');

/* PCComponentes — catálogo público do Algolia (locale PT).
   É a mesma pesquisa que o site deles usa; evita o bloqueio de HTML. */
const PCC_APP = 'BEWOYX1CF1';
const PCC_KEY = '47978d8b445ceaceb718dd842d434099';
const PCC_INDEX = 'products_list:pt';

/* Nomes de categoria tal como aparecem em cada loja. */
const CATEGORIA_LOJA = {
  gpu: ['placa grafica', 'placas graficas', 'tarjeta grafica', 'tarjetas graficas', 'graphics card'],
  cpu: ['processador', 'processadores', 'procesador', 'procesadores', 'processor'],
  ram: ['memoria ram', 'memorias ram', 'memoria', 'ram'],
  motherboard: ['motherboard', 'motherboards', 'placa base', 'placas base', 'placa mae', 'placas mae'],
  ssd: ['disco rigido', 'discos rigidos', 'disco duro', 'discos duros', 'ssd', 'armazenamento', 'almacenamiento'],
  psu: ['fonte de alimentacao', 'fontes de alimentacao', 'fuente de alimentacion', 'fuentes de alimentacion', 'power supply'],
  caixa: ['caixa de computador', 'caixas de computador', 'caja de ordenador', 'caixas', 'case'],
  cooler: ['refrigeracao', 'refrigeracion', 'cooler', 'ventilador', 'dissipador'],
  rato: ['rato', 'ratos', 'raton', 'ratones', 'mouse'],
  teclado: ['teclado', 'teclados', 'keyboard'],
  mousepad: ['tapete de rato', 'tapetes de rato', 'alfombrilla', 'alfombrillas', 'mousepad', 'mouse pad'],
  headset: ['auricular', 'auriculares', 'headset', 'fone', 'auscultadores'],
  microfone: ['microfone', 'microfones', 'microfono', 'microfonos', 'microphone'],
};

/* Termos de pesquisa para explorar uma categoria nas lojas. */
const CATEGORIA_QUERY = {
  gpu: 'geforce rtx radeon',
  cpu: 'processador ryzen intel core',
  ram: 'memoria ram ddr5',
  motherboard: 'motherboard b650 b850',
  ssd: 'ssd nvme',
  psu: 'fonte alimentacao power supply 850w',
  caixa: 'caixa computador case atx',
  cooler: 'cooler processador cpu',
  rato: 'rato gaming mouse',
  teclado: 'teclado gaming keyboard',
  mousepad: 'tapete rato mousepad',
  headset: 'headset gaming auricular',
  microfone: 'microfone usb microphone',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decodificar(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Atilde;/g, 'Ã')
    .replace(/&Otilde;/g, 'Õ')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&nbsp;/g, ' ');
}

function numero(txt) {
  const s = String(txt || '').replace(/[^\d.,]/g, '');
  if (!s) return null;
  const virgula = s.lastIndexOf(',');
  const ponto = s.lastIndexOf('.');
  let n = s;
  if (virgula > ponto) n = s.replace(/\./g, '').replace(',', '.');
  else if (ponto > virgula) n = s.replace(/,/g, '');
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
}

function absoluto(base, href) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  return base.replace(/\/$/, '') + (href.startsWith('/') ? href : `/${href}`);
}

function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['de', 'da', 'do', 'com', 'para', 'the', 'and', 'edition', 'edicao', 'gaming']);
const MAUS = /(usad[oa]|recondicionad|refurbish|open ?box|devolu)/i;
const ACESSORIOS =
  /\b(mouse ?skates?|skatez|skates?|grips?|grip ?tape|key ?caps?|switch plate|plate kit|replacement|spare|mouse ?feet|feet|protector|pelicula|bungee|paracord|palm rest|wrist rest|hub|dock|cabo|cable|carrying case|travel case|sleeve|pouch|bag|mochila|extension|extensor|rod|barra|barras|adapter|adaptador|tripod|tripe|clamp|braco)\b/i;
const ACESSORIOS_PERIFERICO = /\b(case|housing|shell|cover|skin|sticker|stand|mount|holder|module|mod|pcb|foam|weight|balance|upgrade)\b/i;

function pontuar(titulo, consulta) {
  const t = normalizar(titulo);
  const q = normalizar(consulta);
  if (!t || !q) return 0;
  if (t.includes(q)) return 100;
  const tokens = q.split(' ').filter((x) => (x.length > 1 || /^\d+$/.test(x)) && !STOP.has(x));
  if (!tokens.length) return 0;
  const palavras = new Set(t.split(' '));
  let n = 0;
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) {
      if (palavras.has(tok)) n++;
    } else if (t.includes(tok)) n++;
  }
  return Math.round((n / tokens.length) * 100);
}

function melhorResultado(resultados, consulta, tipo) {
  let melhor = null;
  for (const r of resultados) {
    if (!r.preco || !r.titulo || MAUS.test(r.titulo) || ACESSORIOS.test(r.titulo)) continue;
    if (tipo === 'periferico' && ACESSORIOS_PERIFERICO.test(r.titulo)) continue;
    const p = pontuar(r.titulo, consulta);
    if (p < (tipo === 'periferico' ? 85 : 70)) continue;
    if (!melhor || p > melhor.pontos || (p === melhor.pontos && r.preco < melhor.preco)) {
      melhor = { ...r, pontos: p };
    }
  }
  return melhor;
}

/* ---------------- Lojas: pedido + leitura ---------------- */

async function pedir(url, timeout = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetchFn(url, {
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'pt-PT,pt;q=0.9,es;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function parseGlobalData(html) {
  const out = [];
  if (!html) return out;
  const re = /data-tracking-product-tile="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(decodificar(m[1]));
      const preco = numero(data.price);
      if (!preco || !data.item_name) continue;
      const chunk = html.slice(m.index, m.index + 7000);
      const href = (chunk.match(/href="([^"]+)"/) || [])[1];
      const img = (chunk.match(/<img[^>]+(?:data-src|src)="([^"]+)"/) || [])[1];
      out.push({
        titulo: decodificar(data.item_name),
        preco,
        url: absoluto(LOJAS.globaldata.base, href),
        imagem: img ? absoluto(LOJAS.globaldata.base, img).replace('sw=200', 'sw=500') : null,
      });
    } catch {
      /* tile inválido */
    }
  }
  return out;
}

/* PCComponentes via Algolia — resultados já com preço, imagem e categoria. */
async function pesquisarPCComponentes(consulta) {
  const r = await fetchFn(`https://${PCC_APP}-dsn.algolia.net/1/indexes/${PCC_INDEX}/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': PCC_APP,
      'X-Algolia-API-Key': PCC_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: consulta, hitsPerPage: 60 }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  return (j && j.hits ? j.hits : [])
    .map((h) => {
      const img =
        (h.images && ((h.images.medium && h.images.medium.path) || (h.images.large && h.images.large.path) || (h.images.small && h.images.small.path))) ||
        null;
      const preco = Number(h.promotionalPrice || h.originalPrice) || null;
      return {
        titulo: h.name || h.groupName || '',
        preco,
        url: h.slug ? `${LOJAS.pccomponentes.base}/${h.slug}` : LOJAS.pccomponentes.base,
        imagem: img,
        categoriaLoja: (h.mainCategory && h.mainCategory.name) || '',
      };
    })
    .filter((x) => x.titulo && x.preco && x.imagem);
}

/* LDLC (França) — cartões de resultado em HTML simples. */
function parseLDLC(html) {
  const out = [];
  if (!html) return out;
  const partes = html.split('<li id="pdt-').slice(1);
  for (const parte of partes) {
    const bloco = parte.slice(0, 12000);
    const titulo = (bloco.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/) || [])[1];
    const href = (bloco.match(/<a href="(\/fiche\/[^"]+\.html)"/) || [])[1];
    const img = (bloco.match(/<img[^>]+src="([^"]+)"/) || [])[1];
    const basket = bloco.split('<div class="basket">')[1] || '';
    const precoHtml = (basket.match(/<div class="price">[\s\S]*?<div class="price">([\s\S]*?)<\/div>/) || [])[1];
    if (!titulo || !precoHtml) continue;
    const precoTxt = precoHtml
      .replace(/<sup>\s*(\d+)\s*<\/sup>/gi, '.$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ');
    const preco = numero(precoTxt);
    if (!preco) continue;
    out.push({
      titulo: decodificar(titulo),
      preco,
      url: absoluto(LOJAS.ldlc.base, href),
      imagem: img ? absoluto(LOJAS.ldlc.base, img) : null,
    });
  }
  return out;
}

function parseMaxGaming(html) {
  const out = [];
  if (!html) return out;
  const re = /<a href="(\/[^"]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const bloco = html.slice(m.index, m.index + 2600);
    const preco = numero((bloco.match(/PT_PrisNormal">([\d.,]+)\s*€/) || [])[1]);
    if (!preco) continue;
    out.push({
      titulo: decodificar(m[3]),
      preco,
      url: absoluto(LOJAS.maxgaming.base, m[1]),
      imagem: absoluto(LOJAS.maxgaming.base, m[2]),
    });
  }
  return out;
}

/* Verifica se o título faz sentido para a categoria pedida. */
function relevante(titulo, categoria, tipo) {
  const t = normalizar(titulo);
  if (!t) return false;
  if (tipo === 'componente' && /(portatil|notebook|laptop|monitor|televis|smartphone|telemovel|tablet|consola)/.test(t)) {
    return false;
  }
  if (categoria === 'rato' && /(mousepad|tapete|alfombrilla|desk mat)/.test(t)) return false;
  if (categoria === 'teclado' && /(keycap|switch|palm rest|wrist rest|teclas)/.test(t)) return false;
  if (categoria === 'headset' && /(stand|suporte|mount|suporte)/.test(t)) return false;
  if (categoria === 'microfone' && /(stand|suporte|braco|arm|mount)/.test(t)) return false;
  if (!categoria) return true;
  const nomes = CATEGORIA_LOJA[categoria] || [];
  if (nomes.some((n) => t.includes(n))) return true;
  const extras = {
    gpu: /\b(rtx|gtx|radeon|geforce|rx ?\d{3,4})\b/,
    cpu: /\b(ryzen|core i[3579]|core ultra|processador|processor)\b/,
    ram: /\b(ddr[45]|memoria|ram)\b/,
    motherboard: /\b(motherboard|placa mae|placa base|b650|b760|b850|x670|x870|z790)\b/,
    ssd: /\b(ssd|nvme|m\.?2)\b/,
    psu: /\b(fonte|fuente|psu|80\+|\d{3,4} ?w)\b/,
    caixa: /\b(caixa|case|torre|atx)\b/,
    cooler: /\b(cooler|refrigera|dissipador|ventilador|aio|water)\b/,
    rato: /\b(rato|raton|mouse)\b/,
    teclado: /\b(teclado|keyboard)\b/,
    mousepad: /\b(tapete|mousepad|mouse pad|alfombrilla|desk mat)\b/,
    headset: /\b(headset|auricular|auscultador|fone)\b/,
    microfone: /\b(microfone|microfono|microphone|mic)\b/,
  };
  return extras[categoria] ? extras[categoria].test(t) : true;
}

async function pesquisarLoja(loja, consulta, { categoria = '', tipo = '' } = {}) {
  const q = encodeURIComponent(consulta);
  if (loja === 'globaldata') {
    return parseGlobalData(await pedir(`https://www.globaldata.pt/search?q=${q}`));
  }
  if (loja === 'pccomponentes') {
    const lista = await pesquisarPCComponentes(consulta);
    if (!categoria) return lista;
    const nomes = CATEGORIA_LOJA[categoria] || [];
    return lista.filter((x) => {
      const cat = normalizar(x.categoriaLoja);
      return nomes.some((n) => cat.includes(n));
    });
  }
  if (loja === 'maxgaming') {
    return parseMaxGaming(await pedir(`https://www.maxgaming.com/search?q=${q}`));
  }
  if (loja === 'ldlc') {
    return parseLDLC(await pedir(`https://www.ldlc.com/recherche/${q}/`));
  }
  if (loja === 'pcdiga') {
    // A PCDiga está atrás de Cloudflare: não dá para ler preços no servidor.
    // Fica o link direto e o preço pode ser preenchido à mão no painel.
    return [];
  }
  return [];
}

/* Pesquisa livre em todas as lojas (para a pesquisa ao vivo da página). */
const buscaCache = new Map();
const BUSCA_MS = 10 * 60 * 1000;

async function buscarTudo(consulta, { tipo = 'componente', categoria = '', lojas = [], limite = 80 } = {}) {
  const q = String(consulta || '').trim();
  if (!q) return [];
  const chave = JSON.stringify({ q, tipo, categoria, lojas });
  const agora = Date.now();
  const cacheado = buscaCache.get(chave);
  if (cacheado && agora - cacheado.t < BUSCA_MS) return cacheado.dados;

  const alvo = (lojas.length ? lojas : Object.keys(LOJAS)).filter((l) => {
    if (!LOJAS[l]) return false;
    // Pesquisa livre: todas as lojas. Com categoria: só as lojas desse tipo.
    if (!categoria) return true;
    return tipo === 'periferico' ? LOJAS[l].perifericos : LOJAS[l].componentes;
  });
  const pediuAcessorio = /skate|grip|keycap|switch|cabo|cable|funda|pelicula|protector|bungee|paracord|feet|pés|stand|suporte|hub|dock/i.test(q);

  const listas = await Promise.all(
    alvo.map(async (loja) => {
      try {
        const lista = await pesquisarLoja(loja, q, { categoria, tipo });
        return lista
          .filter((x) => {
            if (!x.titulo || !x.preco || !x.imagem || MAUS.test(x.titulo)) return false;
            if (!relevante(x.titulo, categoria, tipo)) return false;
            if (!pediuAcessorio && ACESSORIOS.test(x.titulo)) return false;
            if (!pediuAcessorio && tipo === 'periferico' && ACESSORIOS_PERIFERICO.test(x.titulo)) return false;
            return true;
          })
          .map((x) => ({
            ...x,
            loja,
            lojaNome: LOJAS[loja].nome,
            cor: LOJAS[loja].cor,
            pontos: pontuar(x.titulo, q),
          }));
      } catch {
        return [];
      }
    }),
  );

  const vistos = new Set();
  const resultados = [];
  for (const x of listas.flat()) {
    const chaveUrl = (x.url || '').split('?')[0];
    if (!chaveUrl || vistos.has(chaveUrl)) continue;
    vistos.add(chaveUrl);
    resultados.push(x);
  }
  resultados.sort((a, b) => b.pontos - a.pontos || a.preco - b.preco);
  const dados = resultados.slice(0, limite);
  buscaCache.set(chave, { t: agora, dados });
  if (buscaCache.size > 60) {
    const primeiro = buscaCache.keys().next().value;
    buscaCache.delete(primeiro);
  }
  return dados;
}

/* Procura o modelo em todas as lojas do produto e devolve a melhor correspondência. */
async function buscarPrecos(produto) {
  const lojas = (produto.lojas || []).filter((l) => LOJAS[l]);
  const resultados = await Promise.all(
    lojas.map(async (loja) => {
      try {
        const lista = await pesquisarLoja(loja, produto.consulta, {
          categoria: produto.categoria,
          tipo: produto.tipo,
        });
        const melhor = melhorResultado(lista, produto.consulta, produto.tipo);
        return melhor ? { loja, ...melhor, pontos: undefined } : null;
      } catch {
        return null;
      }
    }),
  );
  return resultados.filter(Boolean);
}

/* ---------------- BD ---------------- */

let tabelaPronta = null;
function garantirTabela() {
  if (!tabelaPronta) {
    tabelaPronta = getDb()
      .exec(`
        CREATE TABLE IF NOT EXISTS public.componentes_precos (
          produto_id text not null,
          loja text not null,
          preco numeric(10,2),
          moeda text not null default 'EUR',
          url text,
          imagem text,
          titulo text,
          manual boolean not null default false,
          atualizado_em timestamptz not null default now(),
          primary key (produto_id, loja)
        );
      `)
      .then(() => true)
      .catch((e) => {
        console.error('componentes_precos:', e.message);
        tabelaPronta = null;
        return false;
      });
  }
  return tabelaPronta;
}

async function guardarPreco(produto_id, loja, dados, manual = false) {
  const db = getDb();
  await db
    .prepare(
      `INSERT INTO public.componentes_precos
         (produto_id, loja, preco, url, imagem, titulo, manual, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, now())
       ON CONFLICT (produto_id, loja) DO UPDATE
         SET preco = EXCLUDED.preco,
             url = COALESCE(EXCLUDED.url, public.componentes_precos.url),
             imagem = COALESCE(EXCLUDED.imagem, public.componentes_precos.imagem),
             titulo = COALESCE(EXCLUDED.titulo, public.componentes_precos.titulo),
             manual = EXCLUDED.manual,
             atualizado_em = now()`,
    )
    .run(produto_id, loja, dados.preco, dados.url || null, dados.imagem || null, dados.titulo || null, manual);
}

async function listarPrecos() {
  await garantirTabela();
  try {
    const rows = await getDb()
      .prepare(
        `SELECT produto_id, loja, preco, url, imagem, titulo, manual, atualizado_em
         FROM public.componentes_precos`,
      )
      .all();
    return rows;
  } catch {
    return [];
  }
}

/* Junta o catálogo com os preços guardados e marca o mais barato. */
function montarProdutos(rows) {
  const porProduto = new Map();
  for (const r of rows) {
    const id = String(r.produto_id);
    if (!porProduto.has(id)) porProduto.set(id, []);
    porProduto.get(id).push({
      loja: r.loja,
      nome: (LOJAS[r.loja] && LOJAS[r.loja].nome) || r.loja,
      cor: (LOJAS[r.loja] && LOJAS[r.loja].cor) || '#8b5cf6',
      preco: Number(r.preco) || 0,
      url: r.url || null,
      imagem: r.imagem || null,
      titulo: r.titulo || null,
      manual: Boolean(r.manual),
      atualizado_em: r.atualizado_em,
    });
  }
  return CATALOGO.map((p) => {
    const precos = (porProduto.get(p.id) || []).sort((a, b) => a.preco - b.preco);
    const maisBarato = precos.find((x) => x.preco > 0) || null;
    const imagem = (precos.find((x) => x.imagem) || {}).imagem || null;
    const atualizado = precos.reduce(
      (max, x) => (!max || (x.atualizado_em && x.atualizado_em > max) ? x.atualizado_em : max),
      null,
    );
    return { ...p, precos, maisBarato, imagem, atualizado_em: atualizado };
  });
}

module.exports = {
  CATALOGO,
  CATEGORIAS,
  CATEGORIA_QUERY,
  LOJAS,
  buscarPrecos,
  buscarTudo,
  guardarPreco,
  listarPrecos,
  montarProdutos,
  garantirTabela,
};
