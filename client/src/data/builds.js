/* ============================================================
   Laboratório de builds — dados locais (sem APIs)
   ------------------------------------------------------------
   Pontuações relativas: RTX 4060 = 100 (1080p) e Ryzen 5 7600
   = 100 (single-core/gaming). São estimativas para comparar
   peças, não benchmarks oficiais.
   ============================================================ */

export const CPUS = [
  { id: 'r5-5600', nome: 'Ryzen 5 5600', marca: 'AMD', nucleos: 6, threads: 12, boost: 4.4, score: 72, consumo: 65, preco: 110, socket: 'AM4' },
  { id: 'r5-7600', nome: 'Ryzen 5 7600', marca: 'AMD', nucleos: 6, threads: 12, boost: 5.1, score: 100, consumo: 65, preco: 190, socket: 'AM5' },
  { id: 'r5-9600x', nome: 'Ryzen 5 9600X', marca: 'AMD', nucleos: 6, threads: 12, boost: 5.4, score: 110, consumo: 65, preco: 230, socket: 'AM5' },
  { id: 'r7-7700x', nome: 'Ryzen 7 7700X', marca: 'AMD', nucleos: 8, threads: 16, boost: 5.4, score: 105, consumo: 105, preco: 280, socket: 'AM5' },
  { id: 'r7-7800x3d', nome: 'Ryzen 7 7800X3D', marca: 'AMD', nucleos: 8, threads: 16, boost: 5.0, score: 112, consumo: 120, preco: 360, socket: 'AM5', x3d: true },
  { id: 'r7-9700x', nome: 'Ryzen 7 9700X', marca: 'AMD', nucleos: 8, threads: 16, boost: 5.5, score: 115, consumo: 65, preco: 330, socket: 'AM5' },
  { id: 'r7-9800x3d', nome: 'Ryzen 7 9800X3D', marca: 'AMD', nucleos: 8, threads: 16, boost: 5.2, score: 130, consumo: 120, preco: 480, socket: 'AM5', x3d: true },
  { id: 'r9-7950x3d', nome: 'Ryzen 9 7950X3D', marca: 'AMD', nucleos: 16, threads: 32, boost: 5.7, score: 120, consumo: 120, preco: 560, socket: 'AM5', x3d: true },
  { id: 'i5-12400f', nome: 'Core i5-12400F', marca: 'Intel', nucleos: 6, threads: 12, boost: 4.4, score: 85, consumo: 65, preco: 120, socket: 'LGA1700' },
  { id: 'i5-13400f', nome: 'Core i5-13400F', marca: 'Intel', nucleos: 10, threads: 16, boost: 4.6, score: 90, consumo: 65, preco: 150, socket: 'LGA1700' },
  { id: 'i5-14600kf', nome: 'Core i5-14600KF', marca: 'Intel', nucleos: 14, threads: 20, boost: 5.3, score: 108, consumo: 125, preco: 240, socket: 'LGA1700' },
  { id: 'i7-13700k', nome: 'Core i7-13700K', marca: 'Intel', nucleos: 16, threads: 24, boost: 5.4, score: 115, consumo: 125, preco: 300, socket: 'LGA1700' },
  { id: 'i7-14700k', nome: 'Core i7-14700K', marca: 'Intel', nucleos: 20, threads: 28, boost: 5.6, score: 120, consumo: 125, preco: 380, socket: 'LGA1700' },
  { id: 'i9-14900k', nome: 'Core i9-14900K', marca: 'Intel', nucleos: 24, threads: 32, boost: 6.0, score: 125, consumo: 253, preco: 520, socket: 'LGA1700' },
  { id: 'u7-265k', nome: 'Core Ultra 7 265K', marca: 'Intel', nucleos: 20, threads: 20, boost: 5.5, score: 118, consumo: 125, preco: 350, socket: 'LGA1851' },
  { id: 'u9-285k', nome: 'Core Ultra 9 285K', marca: 'Intel', nucleos: 24, threads: 24, boost: 5.7, score: 122, consumo: 125, preco: 560, socket: 'LGA1851' },
]

export const GPUS = [
  { id: 'rtx3060', nome: 'GeForce RTX 3060 12GB', marca: 'NVIDIA', vram: 12, score: 65, consumo: 170, preco: 260, dlss: 2 },
  { id: 'rtx4060', nome: 'GeForce RTX 4060 8GB', marca: 'NVIDIA', vram: 8, score: 100, consumo: 115, preco: 300, dlss: 3 },
  { id: 'rtx4060ti', nome: 'GeForce RTX 4060 Ti 8GB', marca: 'NVIDIA', vram: 8, score: 120, consumo: 160, preco: 380, dlss: 3 },
  { id: 'rtx4070', nome: 'GeForce RTX 4070 12GB', marca: 'NVIDIA', vram: 12, score: 150, consumo: 200, preco: 520, dlss: 3 },
  { id: 'rtx4070s', nome: 'GeForce RTX 4070 Super 12GB', marca: 'NVIDIA', vram: 12, score: 170, consumo: 220, preco: 600, dlss: 3 },
  { id: 'rtx4070tis', nome: 'GeForce RTX 4070 Ti Super 16GB', marca: 'NVIDIA', vram: 16, score: 195, consumo: 285, preco: 800, dlss: 3 },
  { id: 'rtx4080s', nome: 'GeForce RTX 4080 Super 16GB', marca: 'NVIDIA', vram: 16, score: 230, consumo: 320, preco: 1050, dlss: 3 },
  { id: 'rtx5070', nome: 'GeForce RTX 5070 12GB', marca: 'NVIDIA', vram: 12, score: 185, consumo: 250, preco: 650, dlss: 4 },
  { id: 'rtx5070ti', nome: 'GeForce RTX 5070 Ti 16GB', marca: 'NVIDIA', vram: 16, score: 225, consumo: 300, preco: 880, dlss: 4 },
  { id: 'rtx5080', nome: 'GeForce RTX 5080 16GB', marca: 'NVIDIA', vram: 16, score: 270, consumo: 360, preco: 1200, dlss: 4 },
  { id: 'rtx5090', nome: 'GeForce RTX 5090 32GB', marca: 'NVIDIA', vram: 32, score: 380, consumo: 575, preco: 2300, dlss: 4 },
  { id: 'rx7600', nome: 'Radeon RX 7600 8GB', marca: 'AMD', vram: 8, score: 85, consumo: 165, preco: 260, fsr: 3 },
  { id: 'rx9060xt', nome: 'Radeon RX 9060 XT 16GB', marca: 'AMD', vram: 16, score: 115, consumo: 160, preco: 350, fsr: 4 },
  { id: 'rx7700xt', nome: 'Radeon RX 7700 XT 12GB', marca: 'AMD', vram: 12, score: 130, consumo: 245, preco: 400, fsr: 3 },
  { id: 'rx7800xt', nome: 'Radeon RX 7800 XT 16GB', marca: 'AMD', vram: 16, score: 155, consumo: 263, preco: 500, fsr: 3 },
  { id: 'rx9070', nome: 'Radeon RX 9070 16GB', marca: 'AMD', vram: 16, score: 200, consumo: 220, preco: 650, fsr: 4 },
  { id: 'rx9070xt', nome: 'Radeon RX 9070 XT 16GB', marca: 'AMD', vram: 16, score: 230, consumo: 304, preco: 750, fsr: 4 },
  { id: 'rx7900xtx', nome: 'Radeon RX 7900 XTX 24GB', marca: 'AMD', vram: 24, score: 220, consumo: 355, preco: 950, fsr: 3 },
]

export const RAMS = [
  { id: 'ddr4-16-3200', nome: '16 GB DDR4 3200 CL16', score: 80, preco: 45 },
  { id: 'ddr4-32-3600', nome: '32 GB DDR4 3600 CL18', score: 88, preco: 75 },
  { id: 'ddr5-16-5600', nome: '16 GB DDR5 5600 CL36', score: 92, preco: 65 },
  { id: 'ddr5-32-6000', nome: '32 GB DDR5 6000 CL30', score: 100, preco: 110 },
  { id: 'ddr5-32-6400', nome: '32 GB DDR5 6400 CL32', score: 105, preco: 135 },
  { id: 'ddr5-32-7200', nome: '32 GB DDR5 7200 CL34', score: 108, preco: 180 },
  { id: 'ddr5-64-6000', nome: '64 GB DDR5 6000 CL30', score: 99, preco: 210 },
]

export const PSUS = [
  { id: 'psu-550', nome: '550 W 80+ Bronze', watts: 550, preco: 55, certificacao: 'Bronze' },
  { id: 'psu-650', nome: '650 W 80+ Gold', watts: 650, preco: 80, certificacao: 'Gold' },
  { id: 'psu-750', nome: '750 W 80+ Gold', watts: 750, preco: 100, certificacao: 'Gold' },
  { id: 'psu-850', nome: '850 W 80+ Gold', watts: 850, preco: 130, certificacao: 'Gold' },
  { id: 'psu-1000', nome: '1000 W 80+ Gold', watts: 1000, preco: 170, certificacao: 'Gold' },
  { id: 'psu-1200', nome: '1200 W 80+ Platinum', watts: 1200, preco: 230, certificacao: 'Platinum' },
]

export const JOGOS = [
  { id: 'cs2', nome: 'Counter-Strike 2', base: 320, m1440: 0.70, m4k: 0.40, cpuPeso: 0.45, cap: 0 },
  { id: 'valorant', nome: 'Valorant', base: 420, m1440: 0.72, m4k: 0.42, cpuPeso: 0.50, cap: 0 },
  { id: 'fortnite', nome: 'Fortnite', base: 180, m1440: 0.66, m4k: 0.36, cpuPeso: 0.35, cap: 0 },
  { id: 'warzone', nome: 'Call of Duty: Warzone', base: 110, m1440: 0.68, m4k: 0.38, cpuPeso: 0.35, cap: 0 },
  { id: 'bf2042', nome: 'Battlefield 2042', base: 105, m1440: 0.67, m4k: 0.37, cpuPeso: 0.40, cap: 0 },
  { id: 'r6', nome: 'Rainbow Six Siege', base: 230, m1440: 0.69, m4k: 0.39, cpuPeso: 0.35, cap: 0 },
  { id: 'gta5', nome: 'GTA V', base: 150, m1440: 0.70, m4k: 0.40, cpuPeso: 0.30, cap: 0 },
  { id: 'apex', nome: 'Apex Legends', base: 180, m1440: 0.68, m4k: 0.38, cpuPeso: 0.40, cap: 0 },
  { id: 'cyberpunk', nome: 'Cyberpunk 2077', base: 75, m1440: 0.65, m4k: 0.35, cpuPeso: 0.30, cap: 0 },
  { id: 'elden', nome: 'Elden Ring', base: 60, m1440: 0.70, m4k: 0.40, cpuPeso: 0.20, cap: 60 },
  { id: 'forza', nome: 'Forza Horizon 5', base: 140, m1440: 0.70, m4k: 0.40, cpuPeso: 0.30, cap: 0 },
  { id: 'minecraft', nome: 'Minecraft (Java)', base: 260, m1440: 0.72, m4k: 0.45, cpuPeso: 0.50, cap: 0 },
  { id: 'roblox', nome: 'Roblox', base: 220, m1440: 0.75, m4k: 0.50, cpuPeso: 0.50, cap: 0 },
  { id: 'hogwarts', nome: 'Hogwarts Legacy', base: 85, m1440: 0.66, m4k: 0.36, cpuPeso: 0.30, cap: 0 },
]

export const PRESETS = [
  { id: 'competitivo', nome: 'Competitivo', mult: 1.45 },
  { id: 'baixo', nome: 'Baixo', mult: 1.35 },
  { id: 'medio', nome: 'Médio', mult: 1.15 },
  { id: 'alto', nome: 'Alto', mult: 1.0 },
  { id: 'ultra', nome: 'Ultra', mult: 0.8 },
]

/* ---------- overclock: valores típicos estáveis ---------- */
export const OC_CPUS = {
  'r5-5600': { ganho: 6, allCore: 4.6, voltagem: 1.25, nota: 'PBO + Curve Optimizer -20; ARCTIC Freezer 34 chega.' },
  'r5-7600': { ganho: 8, allCore: 5.3, voltagem: 1.2, nota: 'PBO + CO -30. 5,3 GHz all-core é o ponto estável.' },
  'r5-9600x': { ganho: 9, allCore: 5.6, voltagem: 1.22, nota: 'PBO + CO -25; ganho maior em jogos CPU-bound.' },
  'r7-7700x': { ganho: 9, allCore: 5.5, voltagem: 1.22, nota: 'PBO + CO -25, limite térmico 85 °C.' },
  'r7-7800x3d': { ganho: 4, allCore: 5.0, voltagem: 1.05, nota: 'X3D não gosta de voltagem. Só CO -30 e PBO.' },
  'r7-9700x': { ganho: 10, allCore: 5.7, voltagem: 1.24, nota: 'PBO + CO -30; ganho real 4–7% em jogos.' },
  'r7-9800x3d': { ganho: 5, allCore: 5.4, voltagem: 1.15, nota: 'PBO + CO -30; +200 MHz sem subir voltagem.' },
  'r9-7950x3d': { ganho: 5, allCore: 5.6, voltagem: 1.1, nota: 'CO -25 nos CCDs; jogos usam o CCD com cache.' },
  'i5-12400f': { ganho: 5, allCore: 4.4, voltagem: 1.2, nota: 'B660 sem OC de CPU; só XMP e power limits.' },
  'i5-13400f': { ganho: 4, allCore: 4.6, voltagem: 1.2, nota: 'Sem multiplicador livre; XMP + limites.' },
  'i5-14600kf': { ganho: 12, allCore: 5.6, voltagem: 1.28, nota: 'P-cores 5,6 / E-cores 4,4; undervolt -0,05 V.' },
  'i7-13700k': { ganho: 11, allCore: 5.5, voltagem: 1.3, nota: 'P-cores 5,5; LLC médio e limite 253 W.' },
  'i7-14700k': { ganho: 10, allCore: 5.7, voltagem: 1.3, nota: 'Cuidado com degradação: undervolt primeiro.' },
  'i9-14900k': { ganho: 8, allCore: 6.0, voltagem: 1.32, nota: 'Microcódigo 0x12B; sem OC agressivo.' },
  'u7-265k': { ganho: 8, allCore: 5.7, voltagem: 1.25, nota: 'P-cores 5,7 / E-cores 4,6; ring +200 MHz.' },
  'u9-285k': { ganho: 7, allCore: 5.9, voltagem: 1.27, nota: 'Ganho maior em RAM (CUDIMM 8000+).' },
}

export const OC_GPUS = {
  rtx3060: { ganho: 10, core: 150, mem: 900, power: 110, nota: 'Core +150 / Mem +900; 110% power limit.' },
  rtx4060: { ganho: 12, core: 200, mem: 1200, power: 115, nota: 'Core +200 / Mem +1200; ventoinhas a 70%.' },
  rtx4060ti: { ganho: 11, core: 180, mem: 1000, power: 112, nota: 'Core +180 / Mem +1000; 112% power.' },
  rtx4070: { ganho: 10, core: 180, mem: 1000, power: 110, nota: 'Core +180 / Mem +1000; undervolt 0,95 V.' },
  rtx4070s: { ganho: 9, core: 170, mem: 900, power: 108, nota: 'Core +170 / Mem +900; 108% power.' },
  rtx4070tis: { ganho: 9, core: 160, mem: 900, power: 108, nota: 'Core +160 / Mem +900; 108% power.' },
  rtx4080s: { ganho: 8, core: 150, mem: 800, power: 106, nota: 'Core +150 / Mem +800; 106% power.' },
  rtx5070: { ganho: 10, core: 200, mem: 1000, power: 110, nota: 'Core +200 / Mem +1000; 110% power.' },
  rtx5070ti: { ganho: 9, core: 180, mem: 900, power: 108, nota: 'Core +180 / Mem +900; 108% power.' },
  rtx5080: { ganho: 10, core: 200, mem: 1000, power: 110, nota: 'Core +200 / Mem +1000; 110% power.' },
  rtx5090: { ganho: 7, core: 140, mem: 700, power: 104, nota: 'Limitada por power; undervolt ajuda mais que OC.' },
  rx7600: { ganho: 9, core: 180, mem: 900, power: 110, nota: 'Core +180 / Mem +900; 110% power.' },
  rx9060xt: { ganho: 9, core: 170, mem: 900, power: 108, nota: 'Core +170 / Mem +900; 108% power.' },
  rx7700xt: { ganho: 9, core: 170, mem: 900, power: 108, nota: 'Core +170 / Mem +900; 108% power.' },
  rx7800xt: { ganho: 9, core: 170, mem: 900, power: 108, nota: 'Core +170 / Mem +900; 108% power.' },
  rx9070: { ganho: 8, core: 160, mem: 800, power: 106, nota: 'Core +160 / Mem +800; 106% power.' },
  rx9070xt: { ganho: 8, core: 150, mem: 800, power: 106, nota: 'Core +150 / Mem +800; 106% power.' },
  rx7900xtx: { ganho: 8, core: 150, mem: 800, power: 106, nota: 'Core +150 / Mem +800; hotspot < 95 °C.' },
}

export const buscar = (lista, id) => lista.find((x) => x.id === id) || lista[0]
