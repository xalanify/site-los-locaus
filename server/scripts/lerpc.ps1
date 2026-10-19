# ============================================================
#  Specs reais do PC + overclock — sem instalar nada
#  ------------------------------------------------------------
#  Tudo sai do próprio Windows: contadores (PDH), SMBIOS e WMI.
#  O CPU-Z só entra se JÁ estiver instalado — nunca o instalamos
#  nem pedimos nada ao utilizador.
#
#   1) Relógio real: "% Processor Performance" × frequência
#      nominal, lido pela API do PDH em inglês — funciona mesmo
#      quando o Get-Counter do sistema está avariado.
#      Mede três coisas: repouso, pico por núcleo (carga leve)
#      e média com todos os núcleos (carga total).
#   2) Teto de fábrica: SMBIOS Type 4 "Max Speed" — o mesmo
#      número que o CPU-Z mostra (ex.: 4450 MHz num 5600).
#   3) RAM: WMI dá o que está a correr vs o que o kit declara;
#      o CL de fábrica sai do número de peça (ex.: F4-3600C16).
#   4) Se o CPU-Z já existir no PC, acrescenta tensão,
#      temperatura, potência e os TIMINGS atuais vs XMP (é a
#      única fonte de timings no Windows).
#   5) GPU: relógios só com NVIDIA (nvidia-smi) — a AMD não os
#      expõe sem ferramentas externas. Não inventamos números.
# ============================================================

# UTF-8 para o site perceber os acentos
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

function Passo([string]$m) { Write-Output "[passo] $m" }

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

# ------------------------------------------------------------------
# Leitor nativo: PDH (contadores) + SMBIOS, compilado em C# de leve
# ------------------------------------------------------------------
$CODIGO_AJ = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

public class AjWin {
  [StructLayout(LayoutKind.Sequential)]
  public struct FMT { public int CStatus; public double DoubleValue; }

  [DllImport("pdh.dll", CharSet = CharSet.Unicode)]
  static extern int PdhOpenQueryW(string src, IntPtr d, out IntPtr q);
  [DllImport("pdh.dll", CharSet = CharSet.Unicode)]
  static extern int PdhAddEnglishCounterW(IntPtr q, string p, IntPtr d, out IntPtr c);
  [DllImport("pdh.dll")]
  static extern int PdhCollectQueryData(IntPtr q);
  [DllImport("pdh.dll")]
  static extern int PdhGetFormattedCounterValue(IntPtr c, int fmt, out int t, out FMT v);
  [DllImport("pdh.dll")]
  static extern int PdhCloseQuery(IntPtr q);

  // maior valor (%) lido nos contadores que existirem; -1 = nada
  public static double MaxPercent(string[] caminhos, int amostras, int intervaloMs) {
    IntPtr q;
    if (PdhOpenQueryW(null, IntPtr.Zero, out q) != 0) return -1;
    List<IntPtr> cs = new List<IntPtr>();
    foreach (string p in caminhos) {
      IntPtr h;
      try { if (PdhAddEnglishCounterW(q, p, IntPtr.Zero, out h) == 0) cs.Add(h); } catch { }
    }
    if (cs.Count == 0) { PdhCloseQuery(q); return -1; }
    double max = -1;
    for (int i = 0; i < amostras; i++) {
      try {
        if (PdhCollectQueryData(q) == 0) {
          foreach (IntPtr h in cs) {
            int tipo; FMT v;
            if (PdhGetFormattedCounterValue(h, 0x200, out tipo, out v) == 0 && v.CStatus == 0 && v.DoubleValue > max) {
              max = v.DoubleValue;
            }
          }
        }
      } catch { }
      Thread.Sleep(intervaloMs);
    }
    PdhCloseQuery(q);
    return max;
  }

  // valor fixo de um contador (2 samples ja chegam); -1 = nada
  public static double LerFixo(string caminho) {
    IntPtr q;
    if (PdhOpenQueryW(null, IntPtr.Zero, out q) != 0) return -1;
    IntPtr h;
    if (PdhAddEnglishCounterW(q, caminho, IntPtr.Zero, out h) != 0) { PdhCloseQuery(q); return -1; }
    double r = -1;
    for (int i = 0; i < 4; i++) {
      try {
        PdhCollectQueryData(q);
        int tipo; FMT v;
        if (PdhGetFormattedCounterValue(h, 0x200, out tipo, out v) == 0 && v.CStatus == 0 && v.DoubleValue > 0) r = v.DoubleValue;
      } catch { }
      Thread.Sleep(250);
    }
    PdhCloseQuery(q);
    return r;
  }

  [DllImport("kernel32.dll")]
  static extern uint GetSystemFirmwareTable(uint prov, uint id, IntPtr buf, uint len);

  // SMBIOS Type 4 -> "teto;atual;bclk" (ex.: "4450;3500;100")
  public static string TetoFabrica() {
    try {
      uint n = GetSystemFirmwareTable(0x52534D42, 0, IntPtr.Zero, 0);
      if (n == 0 || n > 8388608) return "";
      IntPtr p = Marshal.AllocHGlobal((int)n);
      uint r = GetSystemFirmwareTable(0x52534D42, 0, p, n);
      if (r == 0) { Marshal.FreeHGlobal(p); return ""; }
      byte[] b = new byte[r];
      Marshal.Copy(p, b, 0, (int)r);
      Marshal.FreeHGlobal(p);
      int fim = Math.Min(8 + BitConverter.ToInt32(b, 4), b.Length);
      int i = 8;
      while (i + 4 <= fim) {
        byte tipo = b[i];
        byte l = b[i + 1];
        if (tipo == 0xFF || l < 4) break;
        if (tipo == 4 && l >= 0x18) {
          int bclk = BitConverter.ToUInt16(b, i + 0x12);
          int max = BitConverter.ToUInt16(b, i + 0x14);
          int cur = BitConverter.ToUInt16(b, i + 0x16);
          if (max > 0) return max + ";" + cur + ";" + bclk;
        }
        int j = i + l;
        while (j + 1 < fim) { if (b[j] == 0 && b[j + 1] == 0) { j += 2; break; } j++; }
        if (j <= i) break;
        i = j;
      }
    } catch { }
    return "";
  }
}
'@

$Nativo = $false
try {
  Add-Type -TypeDefinition $CODIGO_AJ -ErrorAction Stop
  $Nativo = $true
} catch {
  Passo 'Aviso: nao deu para compilar o leitor nativo (sigo sem os relogios).'
}

$PERF_TOTAL = '\Processor Information(_Total)\% Processor Performance'
$PERF_NOMINAL = '\Processor Information(_Total)\Processor Frequency'

function MedirPct([string[]]$caminhos, [int]$amostras, [int]$ms) {
  if (-not $Nativo) { return $null }
  try {
    $v = [AjWin]::MaxPercent($caminhos, $amostras, $ms)
    if ($v -lt 0) { return $null }
    return [math]::Round($v, 1)
  } catch { return $null }
}

function MedirNominal() {
  if ($Nativo) {
    try {
      $v = [AjWin]::LerFixo($PERF_NOMINAL)
      if ($v -gt 0) { return [int][math]::Round($v) }
    } catch {}
  }
  return $null
}

function LerSmbios4() {
  if (-not $Nativo) { return $null }
  try {
    $t = [AjWin]::TetoFabrica()
    if (-not $t) { return $null }
    $p = $t -split ';'
    if ([int]$p[0] -le 0) { return $null }
    return [ordered]@{ teto = [int]$p[0]; atual = [int]$p[1]; bclk = [int]$p[2] }
  } catch { return $null }
}

$out = [ordered]@{}

Passo 'Sistema (Windows, maquina e RAM total)...'
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
# só a edição EXATA (ex.: "Windows 10 IoT Enterprise LTSC") — sem build nem versão
$soFull = $null
if ($os.Caption) {
  $soFull = $os.Caption -replace '^Microsoft\s+', ''
}
$out.sistema = [ordered]@{
  nome         = $cs.Name
  fabricante   = $cs.Manufacturer
  modelo       = $cs.Model
  so           = $soFull
  arranque     = if ($os.LastBootUpTime) { $os.LastBootUpTime.ToString('yyyy-MM-dd HH:mm') } else { $null }
  ram_total_gb = if ($cs.TotalPhysicalMemory) { [math]::Round($cs.TotalPhysicalMemory / 1GB, 1) } else { $null }
}

Passo 'Processador (nome, nucleos e teto de fabrica)...'
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
$logicos = [int]$nucleos

# ------------------------------------------------------------------
# 1) Relógio real — nativo, sem CPU-Z nem nada instalado
# ------------------------------------------------------------------
$real = [ordered]@{ fonte = 'nativo' }

$smb = LerSmbios4
if ($smb) {
  $real.teto_fabrica_mhz = $smb.teto
  if ($smb.bclk -gt 0) { $real.bclk_mhz = $smb.bclk }
  Passo ("Teto de fabrica (SMBIOS): " + $smb.teto + " MHz.")
} elseif ($base) {
  Passo 'Sem SMBIOS utilizavel: o teto de fabrica fica por confirmar.'
}

$nominal = MedirNominal
if (-not $nominal -and $base) { $nominal = $base }
if (-not $nominal) {
  Passo 'Sem frequencia nominal - nao da para converter os relogios.'
}

if ($nominal) {
  Passo 'Relogio em repouso (contadores do Windows)...'
  $rep = MedirPct @($PERF_TOTAL) 4 400
  if ($rep) { $real.relogio_repouso_mhz = [int][math]::Round($nominal * $rep / 100) }

  Passo 'Relogio a trabalhar: pico por nucleo (carga leve, 4 s)...'
  $caminhos = @()
  for ($i = 0; $i -lt $logicos; $i++) { $caminhos += ('\Processor Information(0,' + $i + ')\% Processor Performance') }
  $pico = $null
  $cargaLeve = IniciarCarga ([math]::Max(2, [int][math]::Ceiling($logicos / 3)))
  try {
    Start-Sleep -Milliseconds 700
    $pico = MedirPct $caminhos 7 400
  } finally {
    PararCarga $cargaLeve
  }
  if ($pico) {
    $real.relogio_max_mhz = [int][math]::Round($nominal * $pico / 100)
    Passo ("Pico por nucleo: " + $real.relogio_max_mhz + " MHz.")
  }

  Passo 'Relogio com todos os nucleos a trabalhar (4 s)...'
  $cargaTotal = IniciarCarga $nucleos
  try {
    Start-Sleep -Milliseconds 900
    $med = MedirPct @($PERF_TOTAL) 7 400
    if ($med) {
      $real.relogio_carga_mhz = [int][math]::Round($nominal * $med / 100)
      Passo ("Todos os nucleos: " + $real.relogio_carga_mhz + " MHz.")
    }
  } finally {
    PararCarga $cargaTotal
  }

  if (-not $real.relogio_max_mhz -and $real.relogio_carga_mhz) {
    $real.relogio_max_mhz = $real.relogio_carga_mhz
  }
  if ($real.relogio_max_mhz) {
    Passo 'Relogio real medido (sem instalar nada).'
  } else {
    Passo 'Contadores indisponiveis neste Windows - fica sem relogio medido.'
  }
}

Passo 'Memoria (modulos, MHz aplicados e kit)...'
$ram = @(Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue)
if ($ram.Count) {
  $m = $ram[0]
  $ger = switch ([int]$m.SMBIOSMemoryType) {
    24 { 'DDR3' } 27 { 'DDR3' } 26 { 'DDR4' } 34 { 'DDR5' } 30 { 'DDR4' } default { $null }
  }
  if (-not $ger) { if ([int]$m.MemoryType -eq 21) { $ger = 'DDR3' } }
  # padrao JEDEC (sem XMP) por geracao — o XMP é o que passa disto
  $padrao = switch ($ger) { 'DDR3' { 1600 } 'DDR4' { 2933 } 'DDR5' { 5600 } default { 0 } }

  $ref = if ($m.PartNumber) { ($m.PartNumber -replace '\s+', '').Trim() } else { $null }
  # CL de fabrica no proprio numero de peça: F4-3600C16 -> CL16
  $clFabrica = $null
  if ($ref -and $ref -match '(\d{3,4})C(\d{2})') { $clFabrica = [int]$Matches[2] }
  elseif ($ref -and $ref -match 'CL(\d{2})') { $clFabrica = [int]$Matches[1] }

  $aplicada = 0
  if ($m.ConfiguredClockSpeed) { $aplicada = [int]$m.ConfiguredClockSpeed }
  elseif ($m.Speed) { $aplicada = [int]$m.Speed }
  $kit = if ($m.Speed) { [int]$m.Speed } else { 0 }

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

  if ($aplicada) { $real.memoria_mhz = $aplicada }
  if ($kit) { $real.memoria_kit_mhz = $kit }
  if ($padrao) { $real.memoria_jedec_mhz = $padrao }
  if ($ger) { $real.memoria_tipo = $ger }
  if ($clFabrica) { $real.memoria_cl_fabrica = $clFabrica }
}

# ------------------------------------------------------------------
# 2) CPU-Z — se NÃO existir, instala-se em silêncio (winget, sem
#    UI nenhuma), usa-se para ler tensão, temperatura e os TIMINGS
#    atuais vs XMP, e no fim DESINSTALA-SE por completo. Se o user
#    já o tiver instalado, não se mexe no que é dele.
# ------------------------------------------------------------------
$cpuz = $null
$cpuzInstaladoPorNos = $false
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

# não está lá -> instala em silêncio para podermos ler os timings
if (-not $cpuz) {
  Passo 'Sem CPU-Z: vou instalar em silencio so para ler os timings (e desinstalo no fim)...'
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    try {
      # --silent + hidden: nada aparece no Windows
      $null = & winget.exe install --id CPUID.CPU-Z -e --silent --accept-package-agreements --accept-source-agreements --disable-interactivity 2>&1
      Start-Sleep -Milliseconds 1200
    } catch {}
    foreach ($c in @(
        (Join-Path $env:ProgramFiles 'CPUID\CPU-Z\cpuz.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'CPUID\CPU-Z\cpuz.exe'),
        (Join-Path $env:LOCALAPPDATA 'CPUID\CPU-Z\cpuz.exe')
      )) {
      if ($c -and (Test-Path $c)) { $cpuz = $c; break }
    }
    if ($cpuz) { $cpuzInstaladoPorNos = $true }
  }
  if (-not $cpuz) { Passo 'Nao deu para instalar o CPU-Z em silencio - sigo sem os timings.' }
}

if ($cpuz) {
  Passo 'CPU-Z ja instalado: a ler tensao, temperatura e timings (8 s)...'
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
      $real.fonte = 'nativo+cpu-z'
      $versao = P1 '^\s*CPU-Z version\s+([0-9.]+)' $linhas
      if ($versao) { $real.versao = $versao }

      # relógio extra (só preenche o que o nativo nao deu)
      $core = P1 '^\s*Core Speed\s+([\d.]+)\s*MHz' $linhas
      $cMax = P1 '^\s*Clock Speed \d+\s+([\d.]+)\s*MHz \(Cores \(Max\)\)' $linhas
      $maxF = P1 '^\s*Max Frequency\s+([\d.]+)\s*MHz' $linhas
      if (-not $real.relogio_max_mhz -and $cMax) { $real.relogio_max_mhz = [int][math]::Round([double]$cMax) }
      if (-not $real.relogio_max_mhz -and $core) { $real.relogio_max_mhz = [int][math]::Round([double]$core) }
      if (-not $real.teto_fabrica_mhz -and $maxF) { $real.teto_fabrica_mhz = [int][math]::Round([double]$maxF) }

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

      # ---- RAM: timings atuais vs o perfil XMP (única fonte disto) ----
      $cl = P1 '^\s*CAS# latency \(CL\)\s+([\d.]+)' $linhas
      $trcd = P1 '^\s*RAS# to CAS# delay \(tRCD\)\s+([\d.]+)' $linhas
      $trp = P1 '^\s*RAS# Precharge \(tRP\)\s+([\d.]+)' $linhas
      $tras = P1 '^\s*Cycle Time \(tRAS\)\s+([\d.]+)' $linhas
      if ($cl) {
        $atual = @([int][double]$cl)
        if ($trcd) { $atual += [int][double]$trcd }
        if ($trp) { $atual += [int][double]$trp }
        if ($tras) { $atual += [int][double]$tras }
        $real.memoria_timings = [ordered]@{ atual = ($atual -join '-') }
      }
      foreach ($l in $linhas) {
        if ($l -match '^\s*XMP\s+\d+\s+([\d.]+-[\d.]+-[\d.]+-[\d.]+)') {
          $partes = @()
          foreach ($x in ($Matches[1] -split '-')) { $partes += [int][double]$x }
          if ($real.memoria_timings) { $real.memoria_timings.xmp = ($partes -join '-') }
          else { $real.memoria_timings = [ordered]@{ xmp = ($partes -join '-') } }
          break
        }
      }
      $mJedec = P1 '^\s*Max JEDEC\s+[A-Z]+[0-9]?-(\d+)' $linhas
      if ($mJedec) { $real.memoria_jedec_mhz = [int]$mJedec }
      $mXmpV = P1 '^\s*VDD Voltage\s+([\d.]+)\s+Volts' $linhas
      if ($mXmpV) { $real.memoria_xmp_v = [double]$mXmpV }
      $temXmp = $false
      foreach ($l in $linhas) { if ($l -match '^\s*XMP\s+\d+') { $temXmp = $true; break } }
      $real.memoria_tem_xmp = $temXmp

      Passo 'CPU-Z: tensao, temperatura e timings lidos.'
    } else {
      Passo 'CPU-Z nao devolveu relatorio (estava aberto?).'
    }
  } else {
    Passo 'CPU-Z nao escreveu o relatorio.'
  }
} else {
  Passo 'Sem CPU-Z instalado — leio só com o Windows (nada é instalado).'
}

# se fomos NOS a instalar o CPU-Z so para ler os timings, agora
# desinstala-mo por completo (app + pastas + registos) sem deixar rasto
if ($cpuzInstaladoPorNos) {
  Passo 'A desinstalar o CPU-Z por completo (so precisei dele para ler os timings)...'
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    try { $null = & winget.exe uninstall --id CPUID.CPU-Z -e --silent --disable-interactivity 2>&1 } catch {}
  }
  Start-Sleep -Milliseconds 800
  # limpa restos (pastas e atalhos que o winget possa ter deixado)
  foreach ($resto in @(
      (Join-Path $env:ProgramFiles 'CPUID'),
      (Join-Path ${env:ProgramFiles(x86)} 'CPUID'),
      (Join-Path $env:LOCALAPPDATA 'CPUID'),
      (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\CPUID CPU-Z')
    )) {
    if ($resto -and (Test-Path $resto)) {
      try { Remove-Item $resto -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
  }
  try {
    $null = & reg.exe DELETE 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\CPUID CPU-Z' /f 2>&1
    $null = & reg.exe DELETE 'HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\CPUID CPU-Z' /f 2>&1
  } catch {}
  Passo 'CPU-Z removido por completo.'
}

if (-not $out.cpu.real) { $out.cpu.real = $real }

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
