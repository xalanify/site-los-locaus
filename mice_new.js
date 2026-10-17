export const MICE = [
  M("XPG","Slingshot"), M("XPG","Primer"), M("XPG","Alpha"),
  M("XPG","Alpha Wireless"), M("Ajazz","AJ159 Apex"), M("Ajazz","AJ099"),
  M("Attack Shark","X3"), M("Attack Shark","X6"), M("CoolerMaster","MM720"),
  M("Corsair","M65 RGB Ultra"), M("Corsair","Sabre RGB Pro"), M("ASUS","ROG Gladius III"),
  M("Finalmouse","Starlight-12"), M("Glorious","Model O"), M("Logitech","G Pro X Superlight"),
  M("MSI","Clutch GM51"), M("Razer","DeathAdder V3"), M("Razer","Viper V3 Pro"),
  M("SteelSeries","Aerox 3"), M("Zowie","EC2-C"), M("HyperX","Pulsefire Haste"),
  M("LAMZU","Atlantis"), M("Newskill","Habrok"), M("Ninjutso","Sora"),
  M("Pulsar","Xlite V2"), M("Redragon","Cobra M711"), M("Roccat","Kone Pro"),
  M("Sharkoon","Light 200"), M("VGN","Dragonfly F1"), M("VXE","Dragonfly R1"),
  M("Waizowl","OGM Pro"), M("Incott","Ghero"), M("Keychron","M3"),
  M("Delux","M800 DB"), M("Mad Catz","RAT 1"), M("Endgame Gear","XM1"),
  M("Cherry","Xtrfy M64"), M("Sanwa Supply","MA-WBL41"), M("Elecom","DUX MMO"),
  M("Thunderobot","ML702"), M("Vancer","Gretxa"), M("Zaopin","Z1"),
  M("Xtrfy","M4 RGB"), M("Ninox","Aurora"), M("G-Wolves","Hati-M"),
  M("Genesis","Zircon 550"), M("Endorfy","LIX"), M("Turtle Beach","Burst II Air"),
  M("Fantech","Aria XD7"), M("Sprime","PM1"), M("DARMOSHARK","M3"),
  M("MCHOSE","AX5"), M("VGN","Dragonfly F1 Pro"), M("WLmouse","Beast X"),
]
export function searchMice(query) {
  const q = String(query || "").trim().toLowerCase()
  if (!q) return MICE.slice(0, 40)
  return MICE.filter((m) => (m.brand + " " + m.model).toLowerCase().includes(q)).slice(0, 40)
}
