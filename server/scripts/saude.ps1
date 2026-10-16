# =============================================================
#  Saúde do PC — discos, espaco, temperaturas, boots
# -------------------------------------------------------------
#  Corre no PC onde o servidor está. Escreve PASSOS com o
#  prefixo [passo] e o JSON final na ULTIMA linha.
#  Tudo é best-effort: o que o Windows nao deixar ler fica vazio.
# =============================================================
$ErrorActionPreference = 'SilentlyContinue'
$out = @{}

# ---------- discos logicos (espaco livre) ----------
$discos = @()
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
  $total = [double]$_.Size
  $livre = [double]$_.FreeSpace
  $discos += [pscustomobject]@{
    letra   = $_.DeviceID
    nome    = $_.VolumeName
    totalGB = [math]::Round($total / 1GB, 1)
    livreGB = [math]::Round($livre / 1GB, 1)
    pct     = if ($total -gt 0) { [math]::Round(($livre / $total) * 100, 0) } else { $null }
  }
}
$out.discos = @($discos)

# ---------- discos fisicos (modelo + estado) ----------
$fisicos = @()
Get-CimInstance Win32_DiskDrive | ForEach-Object {
  $fisicos += [pscustomobject]@{
    modelo    = $_.Model
    interface = $_.InterfaceType
    totalGB   = if ($_.Size) { [math]::Round([double]$_.Size / 1GB, 1) } else { $null }
    status    = $_.Status
  }
}
$out.fisicos = @($fisicos)

# ---------- previsao de falha SMART (se o driver deixar) ----------
$smart = @()
try {
  Get-CimInstance -Namespace root/wmi -ClassName MSStorageDriver_FailurePredictStatus -ErrorAction Stop | ForEach-Object {
    $smart += [pscustomobject]@{
      instala = $_.InstanceName
      alerta  = [bool]$_.PredictFailure
      motivo  = $_.Reason
    }
  }
} catch {}
$out.smart = @($smart)

# ---------- ultimo boot + uptime ----------
try {
  $os = Get-CimInstance Win32_OperatingSystem
  $boot = $os.LastBootUpTime
  $out.boot = $boot.ToString('o')
  $out.uptimeMin = [math]::Round(((Get-Date) - $boot).TotalMinutes, 0)
} catch {}

# ---------- temperaturas (poucos boards expõem via WMI) ----------
$temps = @()
try {
  Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | ForEach-Object {
    $c = [math]::Round(($_.CurrentTemperature / 10.0) - 273.15, 1)
    $temps += [pscustomobject]@{ zona = $_.InstanceName; c = $c }
  }
} catch {}
$out.temps = @($temps)

# ---------- historial de arranques (System 6005) ----------
$boots = @()
try {
  Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 6005 } -MaxEvents 12 -ErrorAction Stop | ForEach-Object {
    $boots += $_.TimeCreated.ToString('o')
  }
} catch {}
$out.boots = @($boots)

# ---------- duracao dos arranques (Diagnostics-Performance 100) ----------
# cada evento traz BootTime em ms; se o registo estiver desligado, fica vazio
$bootDur = @()
try {
  Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 100 } -MaxEvents 8 -ErrorAction Stop | ForEach-Object {
    $ms = $null
    try {
      [xml]$xml = $_.ToXml()
      foreach ($d in $xml.Event.EventData.Data) {
        if ($d.Name -eq 'BootTime') { $ms = [int64]$d.'#text' }
      }
    } catch {}
    $bootDur += [pscustomobject]@{
      inicio   = $_.TimeCreated.ToString('o')
      demoraMs = $ms
      lento    = ($ms -ne $null -and $ms -ge 30000)
    }
  }
} catch {}
$out.bootDurations = @($bootDur)

$out | ConvertTo-Json -Depth 6 -Compress
