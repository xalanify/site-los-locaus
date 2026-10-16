// Base de dados de mouses (ratos) conhecidos — para o perfil.
// Cada entrada: { brand, model, logo } onde logo é um URL de imagem da marca (favicon).
// A lista é usada para autocomplete: ao digitar "razer" aparecem os Razer, etc.

export const MOUSE_BRANDS = {
  Razer: 'https://www.google.com/s2/favicons?domain=razer.com&sz=64',
  Logitech: 'https://www.google.com/s2/favicons?domain=logitech.com&sz=64',
  SteelSeries: 'https://www.google.com/s2/favicons?domain=steelseries.com&sz=64',
  Zowie: 'https://www.google.com/s2/favicons?domain=zowie.benq.com&sz=64',
  HyperX: 'https://www.google.com/s2/favicons?domain=hyperx.com&sz=64',
  Corsair: 'https://www.google.com/s2/favicons?domain=corsair.com&sz=64',
  Glorious: 'https://www.google.com/s2/favicons?domain=gloriousgaming.com&sz=64',
  Finalmouse: 'https://www.google.com/s2/favicons?domain=finalmouse.com&sz=64',
  Pulsar: 'https://www.google.com/s2/favicons?domain=pulsar.gg&sz=64',
  Vaxee: 'https://www.google.com/s2/favicons?domain=vaxee.co&sz=64',
  Ninjutso: 'https://www.google.com/s2/favicons?domain=ninjutso.com&sz=64',
  Lamzu: 'https://www.google.com/s2/favicons?domain=lamzu.com&sz=64',
  ATK: 'https://www.google.com/s2/favicons?domain=atk.store&sz=64',
  Mchose: 'https://www.google.com/s2/favicons?domain=mchose.store&sz=64',
  Endgame: 'https://www.google.com/s2/favicons?domain=endgamegear.com&sz=64',
  Roccat: 'https://www.google.com/s2/favicons?domain=roccat.org&sz=64',
  CoolerMaster: 'https://www.google.com/s2/favicons?domain=coolermaster.com&sz=64',
  ASUS: 'https://www.google.com/s2/favicons?domain=asus.com&sz=64',
  MSI: 'https://www.google.com/s2/favicons?domain=msi.com&sz=64',
  Razer2: 'https://www.google.com/s2/favicons?domain=razer.com&sz=64',
}

const M = (brand, model) => ({ brand, model, logo: MOUSE_BRANDS[brand] || null })

export const MICE = [
  // Razer
  M('Razer', 'Viper V3 Pro'), M('Razer', 'Viper V2 Pro'), M('Razer', 'Viper Ultimate'),
  M('Razer', 'Viper Mini'), M('Razer', 'DeathAdder V3 Pro'), M('Razer', 'DeathAdder V3'),
  M('Razer', 'DeathAdder V2'), M('Razer', 'Basilisk V3 Pro'), M('Razer', 'Basilisk V3'),
  M('Razer', 'Cobra Pro'), M('Razer', 'Orochi V2'),
  // Logitech
  M('Logitech', 'G Pro X Superlight 2'), M('Logitech', 'G Pro X Superlight'),
  M('Logitech', 'G Pro Wireless'), M('Logitech', 'G502 X Plus'), M('Logitech', 'G502 X'),
  M('Logitech', 'G502 Hero'), M('Logitech', 'G305'), M('Logitech', 'G403'),
  M('Logitech', 'G703'), M('Logitech', 'G903'), M('Logitech', 'MX Master 3S'),
  // SteelSeries
  M('SteelSeries', 'Aerox 5 Wireless'), M('SteelSeries', 'Aerox 3 Wireless'),
  M('SteelSeries', 'Prime Wireless'), M('SteelSeries', 'Rival 3'), M('SteelSeries', 'Rival 600'),
  M('SteelSeries', 'Sensei Ten'),
  // Zowie
  M('Zowie', 'EC2-C'), M('Zowie', 'EC1-C'), M('Zowie', 'FK2-B'), M('Zowie', 'FK1-B'),
  M('Zowie', 'S2-C'), M('Zowie', 'S1-C'), M('Zowie', 'ZA13-C'),
  // HyperX
  M('HyperX', 'Pulsefire Haste 2'), M('HyperX', 'Pulsefire Haste'), M('HyperX', 'Pulsefire FPS Pro'),
  // Corsair
  M('Corsair', 'M75 Air'), M('Corsair', 'Sabre RGB Pro'), M('Corsair', 'Dark Core RGB Pro'),
  // Glorious
  M('Glorious', 'Model O 2'), M('Glorious', 'Model O'), M('Glorious', 'Model D 2'),
  M('Glorious', 'Model D'), M('Glorious', 'Model I 2'),
  // Finalmouse
  M('Finalmouse', 'UltralightX'), M('Finalmouse', 'Starlight-12'), M('Finalmouse', 'Air58'),
  // Pulsar
  M('Pulsar', 'X2V2'), M('Pulsar', 'X2'), M('Pulsar', 'Xlite V2'), M('Pulsar', 'Xlite'),
  // Vaxee
  M('Vaxee', 'NP-01S'), M('Vaxee', 'NP-01'), M('Vaxee', 'Outset AX'),
  // Ninjutso
  M('Ninjutso', 'Sora V2'), M('Ninjutso', 'Origin One'),
  // Lamzu
  M('Lamzu', 'Atlantis Pro'), M('Lamzu', 'Atlantis'), M('Lamzu', 'Thorn'),
  // ATK
  M('ATK', 'Blazing Sky F1'), M('ATK', 'F1 Extreme'),
  // Mchose
  M('Mchose', 'L7 Pro'), M('Mchose', 'L7'),
  // Endgame
  M('Endgame', 'XM2w'), M('Endgame', 'XM1r'),
  // Roccat
  M('Roccat', 'Kone Pro Air'), M('Roccat', 'Kone Pro'),
  // Cooler Master
  M('CoolerMaster', 'MM712'), M('CoolerMaster', 'MM720'),
  // ASUS
  M('ASUS', 'ROG Harpe Ace Aim Lab'), M('ASUS', 'ROG Gladius III'),
  // MSI
  M('MSI', 'Clutch GM51'), M('MSI', 'Clutch GM41'),
]

export function searchMice(query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return MICE.slice(0, 20)
  return MICE.filter((m) => (m.brand + ' ' + m.model).toLowerCase().includes(q)).slice(0, 20)
}

export function findMouse(brand, model) {
  return MICE.find((m) => m.brand === brand && m.model === model) || null
}
