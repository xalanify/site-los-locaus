# ============================================================
#  Specs reais do PC — CPU, RAM (MHz/timings), GPU e discos
#  ------------------------------------------------------------
#  O browser não consegue ler relógios nem timings; o Windows
#  consegue (WMI/CIM). Este script recolhe, mostra o que vai
#  fazendo e, no fim, devolve um JSON. O site envia-o por ti.
#  Não precisa de admin e não instala nada.
# ============================================================

# UTF-8 para o site perceber os acentos
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

function Passo([string]$m) { Write-Output "[passo] $m" }

$out = [ordered]@{}

Passo 'Sistema (Windows, máquina e RAM total)...'
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
$out.sistema = [ordered]@{
  nome        = $cs.Name
  fabricante  = $cs.Manufacturer
  modelo      = $cs.Model
  so          = $os.Caption
  versao      = $os.Version
  arranque    = if ($os.LastBootUpTime) { $os.LastBootUpTime.ToString('yyyy-MM-dd HH:mm') } else { $null }
  ram_total_gb = if ($cs.TotalPhysicalMemory) { [math]::Round($cs.TotalPhysicalMemory / 1GB, 1) } else { $null }
}

Passo 'Processador (relógio atual vs relógio de fabrico)...'
$cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
if ($cpu) {
  $out.cpu = [ordered]@{
    nome             = if ($cpu.Name) { $cpu.Name.Trim() } else { $null }
    fabricante       = $cpu.Manufacturer
    socket           = $cpu.SocketDesignation
    nucleos          = $cpu.NumberOfCores
    logicos          = $cpu.NumberOfLogicalProcessors
    clock_atual_mhz  = $cpu.CurrentClockSpeed
    clock_fabrica_mhz = $cpu.MaxClockSpeed
  }
}

Passo 'Memoria (modulos, MHz, tensao e timings)...'
$ram = @(Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue)
if ($ram.Count) {
  $out.ram = [ordered]@{
    total_gb = [math]::Round((($ram | Measure-Object Capacity -Sum).Sum) / 1GB, 0)
    slots    = $ram.Count
    modulos  = @($ram | ForEach-Object {
      [ordered]@{
        fabricante     = $_.Manufacturer
        referencia     = if ($_.PartNumber) { ($_.PartNumber -replace '\s+', '').Trim() } else { $null }
        tamanho_gb     = [math]::Round($_.Capacity / 1GB, 0)
        velocidade_mhz = $_.Speed
        aplicada_mhz   = $_.ConfiguredClockSpeed
        cas            = if ($_.ConfiguredCASLatency) { $_.ConfiguredCASLatency } else { $_.CASLatency }
        tensao_v       = if ($_.ConfiguredVoltage) { [math]::Round($_.ConfiguredVoltage / 1000, 2) } else { $null }
      }
    })
  }
}

Passo 'Placa grafica (nome, driver e memoria)...'
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

# Relógios reais da GPU: só há caminho simples com NVIDIA (nvidia-smi).
# Sem isso o Windows não dá os clocks da GPU — dizemo-lo em vez de inventar.
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($smi -and $out.gpu) {
  Passo 'Relogios e potencia da GPU (nvidia-smi)...'
  try {
    $linha = & nvidia-smi --query-gpu=clocks.gr,clocks.mem,power.limit,power.draw,temperature.gpu,utilization.gpu --format=csv,noheader,nounits 2>$null | Select-Object -First 1
    if ($linha) {
      $p = $linha -split ','
      $out.gpu.clock_atual_mhz   = [int]$p[0].Trim()
      $out.gpu.clock_mem_mhz     = [int]$p[1].Trim()
      $out.gpu.limite_w          = [double]$p[2].Trim()
      $out.gpu.potencia_atual_w  = [double]$p[3].Trim()
      $out.gpu.temperatura       = [int]$p[4].Trim()
      $out.gpu.utilizacao_pct    = [int]$p[5].Trim()
    }
  } catch {
    Passo 'O nvidia-smi nao devolveu nada (driver antigo ou GPU nao NVIDIA).'
  }
} else {
  Passo 'Sem nvidia-smi: os relogios da GPU ficam por ler (o Windows nao os expoe).'
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
    modelo    = $_.Model
    tamanho_gb = [math]::Round($_.Size / 1GB, 0)
    tipo      = $_.MediaType
    interface = $_.InterfaceType
  }
})
if ($discos.Count) { $out.discos = $discos }

Passo 'A calcular os desvios (atual vs fabrico)...'
$out.recolhido = (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz')

# JSON final — o site procura a ULTIMA linha não-vazia.
# Quando alguém o envia ($Token) o JSON não é para imprimir: só vai para o site.
$___json = $out | ConvertTo-Json -Depth 6 -Compress
if (-not $Token) { Write-Output $___json }
