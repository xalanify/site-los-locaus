# ============================================================
#  Specs reais do PC + overclock — CPU, RAM, GPU, discos
#  ------------------------------------------------------------
#  O browser não chega aos relógios; o Windows chega (WMI/CIM).
#  Fontes, por ordem de qualidade:
#   1) CPU-Z em modo fantasma (-txt): relógio real a trabalhar,
#      tensão, títulos de fábrica (min/max), temperaturas,
#      frequência da RAM e a tabela XMP/EXPO do módulo.
#      É a mesma coisa que se vê no CPU-Z à mão.
#   2) Contadores de desempenho do Windows (repouso e carga),
#      se estiverem saudáveis.
#   3) Sem nenhum dos dois: só o que o WMI relata (dizemo-lo).
#  A GPU só dá relógios com NVIDIA (nvidia-smi) — a AMD não os
#  expõe sem ferramentas externas. Não inventamos números.
# ============================================================

# UTF-8 para o site perceber os acentos
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

function Passo([string]$m) { Write-Output "[passo] $m" }

$COUNTER = '\Processor Information(_Total)\% Processor Frequency'

function LerClockPct([int]$amostras, [int]$esperaMs) {
  $max = 0
  for ($i = 0; $i -lt $amostras; $i++) {
    if ($esperaMs -gt 0) { Start-Sleep -Milliseconds $esperaMs }
    try {
      $c = Get-Counter -Counter $COUNTER -ErrorAction Stop
      foreach ($s in $c.CounterSamples) { if ($s.CookedValue -gt $max) { $max = $s.CookedValue } }
    } catch { return $null }
  }
  if ($max -le 0) { return $null }
  return [math]::Round($max, 1)
}

# pega o 1.º grupo de uma regex em várias linhas
function P1([string]$re, $linhas) {
  foreach ($l in $linhas) { if ($l -match $re) { return $Matches[1] } }
  return $null
}

function IniciarCarga([int]$n) {
  $procs = @()
  $cmd = 'while($true){$x=0;for($i=0;$i -lt 100000;$i++){$x+=$i}}'
  for ($i = 0; $i -lt $n; $i++) {
    $procs += Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-NonInteractive', '-Command', $cmd) -WindowStyle Hidden -PassThru -ErrorAction SilentlyContinue
  }
  return $procs
}

function PararCarga($procs) {
  foreach ($p in $procs) { try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {} }
}

$out = [ordered]@{}

Passo 'Sistema (Windows, maquina e RAM total)...'
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
$out.sistema = [ordered]@{
  nome         = $cs.Name
  fabricante   = $cs.Manufacturer
  modelo       = $cs.Model
  so           = $os.Caption
  arranque     = if ($os.LastBootUpTime) { $os.LastBootUpTime.ToString('yyyy-MM-dd HH:mm') } else { $null }
  ram_total_gb = if ($cs.TotalPhysicalMemory) { [math]::Round($cs.TotalPhysicalMemory / 1GB, 1) } else { $null }
}

Passo 'Processador (nome, nucleos e clock de fabrica)...'
$cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
$base = 0
if ($cpu) {
  $tensao = $null
  if ($cpu.Voltage -gt 0) {
    $tensao = [double]$cpu.Voltage
    if ($tensao -gt 5) { $tensao = [math]::Round($tensao / 10, 2) }   # decivolts -> volts
  }
  $out.cpu = [ordered]@{
    nome              = if ($cpu.Name) { $cpu.Name.Trim() } else { $null }
    fabricante        = $cpu.Manufacturer
    socket            = $cpu.SocketDesignation
    nucleos           = $cpu.NumberOfCores
    logicos           = $cpu.NumberOfLogicalProcessors
    clock_fabrica_mhz = $cpu.MaxClockSpeed
    tensao_v          = $tensao
  }
  if ($cpu.MaxClockSpeed) { $base = [int]$cpu.MaxClockSpeed }
}

# nucleos logicos (para carregar a CPU toda)
$nucleos = 4
if ($cs -and $cs.NumberOfLogicalProcessors) { $nucleos = [math]::Min([int]$cs.NumberOfLogicalProcessors, 16) }

# ------------------------------------------------------------------
# 1) CPU-Z — o caminho que dá os números a sério
# ------------------------------------------------------------------
$cpuz = $null
foreach ($c in @(
    (Join-Path $env:ProgramFiles 'CPUID\CPU-Z\cpuz.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'CPUID\CPU-Z\cpuz.exe'),
    (Join-Path $env:LOCALAPPDATA 'CPUID\CPU-Z\cpuz.exe')
  )) {
  if ($c -and (Test-Path $c)) { $cpuz = $c; break }
}
if (-not $cpuz) {
  $g = Get-Command cpuz.exe -ErrorAction SilentlyContinue
  if ($g) { $cpuz = $g.Source }
}

if ($cpuz) {
  Passo 'CPU-Z: relógio real sob carga, tensao e teto de fabrica (8 s)...'
  # o CPU-Z escreve o relatório ao lado do proprio exe — se nao
  # pudermos escrever ai (Program Files sem admin), copiamos para o temp
  $dir = Split-Path -Parent $cpuz
  $exeUsar = $cpuz
  $marcador = Join-Path $dir ('.aj-write-teste-' + [guid]::NewGuid().ToString('N').Substring(0, 6))
  try { [IO.File]::WriteAllText($marcador, 'x'); Remove-Item $marcador -Force -ErrorAction SilentlyContinue }
  catch {
    try {
      $copia = Join-Path $env:TEMP 'aj-cpuz'
      if (-not (Test-Path $copia)) { New-Item -ItemType Directory -Path $copia -Force | Out-Null }
      Copy-Item $cpuz (Join-Path $copia 'cpuz.exe') -Force
      $exeUsar = Join-Path $copia 'cpuz.exe'
      $dir = $copia
    } catch { $exeUsar = $cpuz; $dir = Split-Path -Parent $cpuz }
  }

  # o CPU-Z acrescenta ".txt" por conta propria — nao lhe demos extensao
  $nomeRel = 'aj-specs-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
  $caminhoRel = Join-Path $dir ($nomeRel + '.txt')
  $carga = IniciarCarga $nucleos
  $proc = $null
  try {
    Start-Sleep -Milliseconds 900
    $proc = Start-Process -FilePath $exeUsar -ArgumentList ('-txt=' + $nomeRel) -WindowStyle Hidden -PassThru -ErrorAction SilentlyContinue
    $t0 = Get-Date
    while ($proc -and -not $proc.HasExited -and ((Get-Date) - $t0).TotalSeconds -lt 40) { Start-Sleep -Milliseconds 400 }
    if ($proc -and -not $proc.HasExited) { try { $proc | Stop-Process -Force -ErrorAction SilentlyContinue } catch {} }
  } finally {
    PararCarga $carga
  }

  if (Test-Path $caminhoRel) {
    $linhas = Get-Content $caminhoRel -ErrorAction SilentlyContinue
    Remove-Item $caminhoRel -Force -ErrorAction SilentlyContinue
    if ($linhas -and $linhas.Count) {
      $real = [ordered]@{}
      $versao = P1 '^\s*CPU-Z version\s+([0-9.]+)' $linhas
      if ($versao) { $real.versao = $versao }
      $real.fonte = 'cpu-z'

      # ---- CPU: relógio a trabalhar vs teto de fábrica ----
      $spec = P1 '^\s*Specification\s+(.+?)\s*$' $linhas
      if ($spec) { $real.nome = $spec }
      $core = P1 '^\s*Core Speed\s+([\d.]+)\s*MHz' $linhas
      $maxF = P1 '^\s*Max Frequency\s+([\d.]+)\s*MHz' $linhas
      $minF = P1 '^\s*Min Frequency\s+([\d.]+)\s*MHz' $linhas
      $cMax = P1 '^\s*Clock Speed \d+\s+([\d.]+)\s*MHz \(Cores \(Max\)\)' $linhas
      $bclk = P1 '^\s*Clock Speed \d+\s+([\d.]+)\s*MHz \(CPU BCLK\)' $linhas
      if ($core) { $real.relogio_mhz = [int][math]::Round([double]$core) }
      if ($cMax) { $real.relogio_max_mhz = [int][math]::Round([double]$cMax) }
      if ($maxF) { $real.teto_fabrica_mhz = [int][math]::Round([double]$maxF) }
      if ($minF) { $real.relogio_min_mhz = [int][math]::Round([double]$minF) }
      if ($bclk) { $real.bclk_mhz = [math]::Round([double]$bclk, 2) }

      # ---- tensão, temperatura e potência ----
      $vcore = $null; $vlabel = $null
      foreach ($l in $linhas) {
        if ($l -match '^\s*Voltage\s+\d+\s+([\d.]+)\s+Volts.*\(([^)]*)\)') {
          $rot = $Matches[2]
          if (-not $vcore -or $rot -match 'VCORE|VDD|Core') { $vcore = [double]$Matches[1]; $vlabel = $rot }
          if ($vcore -and $vlabel -match 'VCORE|VDD') { break }
        }
      }
      if ($vcore) { $real.tensao_v = $vcore; $real.tensao_rotulo = $vlabel }
      $temp = P1 '^\s*Temperature\s+\d+\s+(\d+)\s+degC.*\(Package\)' $linhas
      if ($temp) { $real.temperatura_c = [int]$temp }
      $pot = P1 '^\s*Power\s+\d+\s+([\d.]+)\s+W\s+\(Package\)' $linhas
      if ($pot) { $real.potencia_w = [double]$pot }
      $tdp = P1 '^\s*TDP Limit\s+([\d.]+)\s+W' $linhas
      if ($tdp) { $real.tdp_w = [double]$tdp }

      # ---- RAM: esta a correr vs JEDEC (verdadeiro XMP/EXPO) ----
      $mFreq = P1 '^\s*Memory Frequency\s+([\d.]+)\s*MHz' $linhas   # metade da efetiva (DDR)
      $mTipo = P1 '^\s*Memory Type\s+([A-Z0-9]+)' $linhas
      if ($mFreq) { $real.memoria_mhz = [int][math]::Round([double]$mFreq * 2) }
      if ($mTipo) { $real.memoria_tipo = $mTipo }
      $mBw = P1 '^\s*Max bandwidth\s+[A-Z]+[0-9]?-(\d+)' $linhas
      $mJedec = P1 '^\s*Max JEDEC\s+[A-Z]+[0-9]?-(\d+)' $linhas
      if ($mBw) { $real.memoria_kit_mhz = [int]$mBw }
      if ($mJedec) { $real.memoria_jedec_mhz = [int]$mJedec }
      $mXmpV = P1 '^\s*VDD Voltage\s+([\d.]+)\s+Volts' $linhas
      if ($mXmpV) { $real.memoria_xmp_v = [double]$mXmpV }
      $temXmp = $false
      foreach ($l in $linhas) { if ($l -match '^\s*XMP\s+\d+') { $temXmp = $true; break } }
      $real.memoria_tem_xmp = $temXmp

      if ($out.cpu) { $out.cpu.real = $real }
      Passo 'CPU-Z: relatorio lido (relógio, tensao, fabrica e RAM).'
    } else {
      Passo 'CPU-Z nao devolveu relatorio (estava aberto?).'
    }
  } else {
    Passo 'CPU-Z nao escreveu o relatorio.'
  }
}

# ------------------------------------------------------------------
# 2) contadores de desempenho — só se o CPU-Z não deu relógios
# ------------------------------------------------------------------
$temRelogio = $out.cpu -and $out.cpu.real -and ($out.cpu.real.relogio_mhz -or $out.cpu.real.relogio_max_mhz)
if (-not $temRelogio) {
  Passo 'Sem CPU-Z: medir o relogio com os contadores do Windows (repouso)...'
  $repousoPct = LerClockPct 3 300
  if ($repousoPct -ne $null -and $base -gt 0) {
    $out.cpu.relogio_repouso_pct = $repousoPct
    $out.cpu.relogio_repouso_mhz = [int][math]::Round($base * $repousoPct / 100)
    Passo 'Relogio em repouso medido.'
  }
  Passo 'Contadores: a medir o relogio sob carga (3 segundos)...'
  $cargaPct = $null
  if ($base -gt 0) {
    $carga = IniciarCarga $nucleos
    try {
      Start-Sleep -Milliseconds 1200
      $cargaPct = LerClockPct 6 450
    } finally {
      PararCarga $carga
    }
    if ($cargaPct -ne $null) {
      $out.cpu.relogio_carga_pct = $cargaPct
      $out.cpu.relogio_carga_mhz = [int][math]::Round($base * $cargaPct / 100)
    }
  }
  if ($repousoPct -eq $null -and $cargaPct -eq $null) {
    Passo 'Contadores indisponiveis neste Windows - fica o valor do sistema.'
    if ($cpu -and $cpu.CurrentClockSpeed) { $out.cpu.relogio_reportado_mhz = $cpu.CurrentClockSpeed }
  } else {
    Passo 'Relogio medido com contadores.'
  }
}

Passo 'Memoria (modulos, MHz, tensao e timings)...'
$ram = @(Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue)
if ($ram.Count) {
  $m = $ram[0]
  $ger = switch ([int]$m.SMBIOSMemoryType) {
    24 { 'DDR3' } 27 { 'DDR3' } 26 { 'DDR4' } 34 { 'DDR5' } 30 { 'DDR4' } default { $null }
  }
  if (-not $ger) { if ([int]$m.MemoryType -eq 21) { $ger = 'DDR3' } }
  # padrao JEDEC (sem XMP) por geracao
  $padrao = switch ($ger) { 'DDR3' { 1600 } 'DDR4' { 2933 } 'DDR5' { 5600 } default { 0 } }

  $out.ram = [ordered]@{
    total_gb   = [math]::Round((($ram | Measure-Object Capacity -Sum).Sum) / 1GB, 0)
    slots      = $ram.Count
    geracao    = $ger
    padrao_mhz = $padrao
    modulos    = @($ram | ForEach-Object {
      $cas = $null
      if ($_.ConfiguredCASLatency) { $cas = $_.ConfiguredCASLatency }
      elseif ($_.CASLatency) { $cas = $_.CASLatency }
      [ordered]@{
        fabricante     = $_.Manufacturer
        referencia     = if ($_.PartNumber) { ($_.PartNumber -replace '\s+', '').Trim() } else { $null }
        tamanho_gb     = [math]::Round($_.Capacity / 1GB, 0)
        velocidade_mhz = $_.Speed                 # o que o modulo declara (SPD/XMP)
        aplicada_mhz   = $_.ConfiguredClockSpeed  # o que esta a correr
        cas            = $cas
        tensao_v       = if ($_.ConfiguredVoltage) { [math]::Round($_.ConfiguredVoltage / 1000, 2) } else { $null }
      }
    })
  }
}

Passo 'Placa grafica (nome, driver, memoria)...'
$gpu = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Select-Object -First 1
if ($gpu) {
  $reg = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000' -ErrorAction SilentlyContinue
  $qw = $reg.'HardwareInformation.qwMemorySize'
  $out.gpu = [ordered]@{
    nome        = $gpu.Name
    driver      = $gpu.DriverVersion
    driver_data = if ($gpu.DriverDate) { $gpu.DriverDate.ToString('yyyy-MM-dd') } else { $null }
    memoria_gb  = if ($qw) { [math]::Round($qw / 1GB, 0) } elseif ($gpu.AdapterRAM) { [math]::Round($gpu.AdapterRAM / 1GB, 0) } else { $null }
  }
}

# relogios da GPU: so ha caminho simples com NVIDIA (nvidia-smi)
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($smi -and $out.gpu) {
  Passo 'Relogios da GPU (nvidia-smi)...'
  try {
    $linha = & nvidia-smi --query-gpu=clocks.base,clocks.gr,clocks.mem,clocks.max.sm,clocks.max.mem,power.limit,power.draw,temperature.gpu,utilization.gpu --format=csv,noheader,nounits 2>$null | Select-Object -First 1
    if ($linha) {
      $p = $linha -split ','
      $out.gpu.clock_base_mhz    = [int]$p[0].Trim()
      $out.gpu.clock_atual_mhz   = [int]$p[1].Trim()
      $out.gpu.clock_mem_mhz     = [int]$p[2].Trim()
      $out.gpu.clock_max_sm_mhz  = [int]$p[3].Trim()
      $out.gpu.clock_max_mem_mhz = [int]$p[4].Trim()
      $out.gpu.limite_w          = [double]$p[5].Trim()
      $out.gpu.potencia_atual_w  = [double]$p[6].Trim()
      $out.gpu.temperatura       = [int]$p[7].Trim()
      $out.gpu.utilizacao_pct    = [int]$p[8].Trim()
    }
  } catch {
    Passo 'nvidia-smi nao devolveu nada.'
  }
} elseif ($out.gpu) {
  Passo 'Sem nvidia-smi (GPU AMD/Intel): o Windows nao expoe os relogios da GPU.'
  $out.gpu.sem_relogios = $true
}

Passo 'Placa-mae e BIOS...'
$bb = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue
$bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue
if ($bb) { $out.placa = [ordered]@{ fabricante = $bb.Manufacturer; modelo = $bb.Product } }
if ($bios) {
  $out.bios = [ordered]@{
    versao = $bios.SMBIOSBIOSVersion
    data   = if ($bios.ReleaseDate) { $bios.ReleaseDate.ToString('yyyy-MM-dd') } else { $null }
  }
}

Passo 'Discos...'
$discos = @(Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue | ForEach-Object {
  [ordered]@{
    modelo     = $_.Model
    tamanho_gb = [math]::Round($_.Size / 1GB, 0)
    tipo       = $_.MediaType
    interface  = $_.InterfaceType
  }
})
if ($discos.Count) { $out.discos = $discos }

Passo 'A analisar (stock vs overclock)...'
$out.recolhido = (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz')

# JSON final — o site procura a ULTIMA linha nao-vazia.
# Quando alguem o envia ($Token) o JSON nao e para imprimir: so vai para o site.
$___json = $out | ConvertTo-Json -Depth 6 -Compress
if (-not $Token) { Write-Output $___json }
