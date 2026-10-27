# ============================================================
#  Locaus PC Agent
#  ------------------------------------------------------------
#  Runs hidden on the Windows PC. It polls the site for jobs,
#  executes the PowerShell prepared by the server and sends the
#  output back. Started by LOCAUS-PC.bat (which asks for admin).
#  ASCII only: Windows PowerShell 5.1 must read it everywhere.
# ============================================================
param(
  [Parameter(Mandatory = $true)][string]$Site,
  [Parameter(Mandatory = $true)][string]$Token,
  [Parameter(Mandatory = $false)][string]$Chave
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

# O .bat envia o token codificado (XOR com a chave + base64) — descodifica aqui.
if ($Chave) {
  try {
    $bytes = [Convert]::FromBase64String($Token)
    $xor = [System.Text.Encoding]::ASCII.GetString($bytes)
    $sb = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $xor.Length; $i++) {
      $c = [int][char]$xor[$i] -bxor [int][char]$Chave[$i % $Chave.Length]
      [void]$sb.Append([char]$c)
    }
    $Token = $sb.ToString()
  } catch {}
} else {
  # compatibilidade: se vier só em base64 (bat antigo), descodifica só o base64
  try { $Token = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Token)) } catch {}
}

$Site = $Site.TrimEnd('/')
$Headers = @{ Authorization = "Bearer $Token" }
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
$Base = Join-Path $env:LOCALAPPDATA 'LocausPC'
try { New-Item -ItemType Directory -Force -Path $Base | Out-Null } catch {}
$LogFile = Join-Path $Base 'agente.log'

function Log([string]$msg) {
  try {
    $linha = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '  ' + $msg
    Add-Content -Path $LogFile -Value $linha -Encoding UTF8 -ErrorAction SilentlyContinue
  } catch {}
}

# Escreve no console (com cor) e no ficheiro de log.
function Show([string]$msg, [string]$cor) {
  try { Write-Host $msg -ForegroundColor $cor } catch { Write-Host $msg }
  Log $msg
}

# Evita dois agentes iguais (o mesmo BAT aberto duas vezes).
$mutexName = 'LocausPC-' + $Token.Substring(0, [Math]::Min(24, $Token.Length))
try {
  $mutex = New-Object System.Threading.Mutex($false, ('Global\' + $mutexName))
} catch {
  $mutex = New-Object System.Threading.Mutex($false, ('Local\' + $mutexName))
}
if (-not $mutex.WaitOne(0)) { Log 'agent already running'; exit }

function PostJson([string]$url, $obj) {
  $body = $obj | ConvertTo-Json -Depth 6 -Compress
  return Invoke-RestMethod -Uri $url -Method Post -Headers $Headers -UserAgent $UA -ContentType 'application/json' -Body $body -TimeoutSec 60
}

function GetJson([string]$url) {
  return Invoke-RestMethod -Uri $url -Method Get -Headers $Headers -UserAgent $UA -TimeoutSec 40
}

function ReadNew([string]$path, [ref]$pos) {
  if (-not (Test-Path -LiteralPath $path)) { return @() }
  try {
    $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    if ($fs.Length -le $pos.Value) { $fs.Close(); return @() }
    $fs.Seek($pos.Value, [System.IO.SeekOrigin]::Begin) | Out-Null
    $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
    $txt = $sr.ReadToEnd()
    $pos.Value = $fs.Position
    $sr.Close()
    $fs.Close()
    if (-not $txt) { return @() }
    return @($txt -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  } catch {
    return @()
  }
}

function RunJob($job) {
  $id = [string]$job.id
  $ps1 = Join-Path $env:TEMP ("locaus-job-$id.ps1")
  $out = Join-Path $env:TEMP ("locaus-job-$id.out")
  $err = Join-Path $env:TEMP ("locaus-job-$id.err")
  foreach ($f in @($ps1, $out, $err)) { try { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue } catch {} }

  # UTF-8 with BOM so Windows PowerShell 5.1 reads accents correctly.
  try {
    $utf8Bom = New-Object System.Text.UTF8Encoding($true)
    [System.IO.File]::WriteAllText($ps1, [string]$job.comando, $utf8Bom)
  } catch {
    Log "job ${id}: cannot write script: $($_.Exception.Message)"
    try { PostJson "$Site/api/agente/jobs/$id/fim" @{ status = 'erro'; erro = 'Nao deu para escrever o script no PC.' } | Out-Null } catch {}
    return
  }

  Log "job $id started: $($job.nome)"
  $proc = $null
  try {
    $proc = Start-Process -FilePath 'powershell.exe' `
      -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $ps1 + '"')) `
      -RedirectStandardOutput $out -RedirectStandardError $err `
      -WindowStyle Hidden -PassThru
  } catch {
    Log "job ${id}: cannot start powershell: $($_.Exception.Message)"
    try { PostJson "$Site/api/agente/jobs/$id/fim" @{ status = 'erro'; erro = "Nao deu para abrir o PowerShell: $($_.Exception.Message)" } | Out-Null } catch {}
    return
  }

  $posOut = 0
  $posErr = 0
  $pendentes = New-Object System.Collections.ArrayList
  $limite = (Get-Date).AddSeconds([int]$job.tempo)
  $ultimoEnvio = Get-Date
  $ultimoControlo = [DateTime]::MinValue
  $cancelado = $false
  $saiu = $false

  while (-not $saiu) {
    $proc.Refresh()
    foreach ($l in (ReadNew $out ([ref]$posOut))) { [void]$pendentes.Add($l) }
    foreach ($l in (ReadNew $err ([ref]$posErr))) { [void]$pendentes.Add($l) }

    $agora = Get-Date
    if ($pendentes.Count -gt 0 -and ($agora - $ultimoEnvio).TotalMilliseconds -ge 2500) {
      $lote = @($pendentes.ToArray())
      $pendentes.Clear()
      $ultimoEnvio = $agora
      foreach ($l in $lote) { Show ("  " + $l) 'DarkGray' }
      try {
        $r = PostJson "$Site/api/agente/jobs/$id/logs" @{ logs = $lote }
        if ($r.cancelar) { $cancelado = $true }
      } catch {
        # network hiccup: keep the lines for the next attempt
        foreach ($l in $lote) { [void]$pendentes.Add($l) }
      }
    }

    if (-not $cancelado -and ($agora - $ultimoControlo).TotalMilliseconds -ge 4000) {
      $ultimoControlo = $agora
      try {
        $c = Invoke-RestMethod -Uri "$Site/api/agente/jobs/$id/controlo" -Headers $Headers -UserAgent $UA -TimeoutSec 15
        if ($c.cancelar) { $cancelado = $true }
        if ($c.encerrar) { $saiu = $true }
      } catch {}
    }

    if ($cancelado) {
      Log "job $id cancelled"
      try { & taskkill.exe /PID $proc.Id /T /F 2>$null | Out-Null } catch {}
      try {
        PostJson "$Site/api/agente/jobs/$id/fim" @{ status = 'cancelado'; erro = 'Cancelado no site.'; logs = @($pendentes.ToArray()) } | Out-Null
      } catch {}
      break
    }

    if ($proc.HasExited) {
      Start-Sleep -Milliseconds 250
      foreach ($l in (ReadNew $out ([ref]$posOut))) { [void]$pendentes.Add($l) }
      foreach ($l in (ReadNew $err ([ref]$posErr))) { [void]$pendentes.Add($l) }
      $codigo = 0
      try { $codigo = [int]$proc.ExitCode } catch {}
      $status = if ($codigo -eq 0) { 'concluido' } else { 'erro' }
      $erro = if ($codigo -eq 0) { $null } else { "O script saiu com codigo $codigo." }
      $saida = ''
      if ($job.tipo -in @('specs', 'saude', 'instalados', 'discos', 'tweaks')) {
        try { $saida = [System.IO.File]::ReadAllText($out) } catch {}
        if ($saida.Length -gt 400000) { $saida = $saida.Substring($saida.Length - 400000) }
      }
      $fim = @{
        status = $status
        codigo = $codigo
        erro   = $erro
        logs   = @($pendentes.ToArray())
        saida  = $saida
      }
      try { PostJson "$Site/api/agente/jobs/$id/fim" $fim | Out-Null } catch { Log "job ${id}: final post failed" }
      Log "job $id finished: $status ($codigo)"
      if ($codigo -eq 0) { Show ("Concluido: " + $job.nome) 'Green' } else { Show ("Erro: " + $job.nome + " (codigo $codigo)") 'Red' }
      $saiu = $true
      break
    }

    if ($agora -gt $limite) {
      Log "job $id timed out"
      try { & taskkill.exe /PID $proc.Id /T /F 2>$null | Out-Null } catch {}
      try {
        PostJson "$Site/api/agente/jobs/$id/fim" @{ status = 'erro'; erro = 'Demorou demasiado e foi interrompido.'; logs = @($pendentes.ToArray()) } | Out-Null
      } catch {}
      break
    }

    Start-Sleep -Milliseconds 450
  }

  foreach ($f in @($ps1, $out, $err)) { try { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue } catch {} }
}

Show "A ligar ao site $Site ..." 'Yellow'
for ($i = 0; $i -le 100; $i += 10) {
  Write-Progress -Activity 'A ligar ao site' -Status ($i.ToString() + [char]37) -PercentComplete $i
  Start-Sleep -Milliseconds 60
}
Write-Progress -Activity 'A ligar ao site' -Completed
# Se este .bat ja foi usado antes, a sessao pode estar marcada para fechar.
# Acorda-a para o utilizador nao ter de instalar/descarregar tudo outra vez.
try { PostJson "$Site/api/agente/acordar" @{} | Out-Null } catch {}
$falhas = 0
$ligado = $false
while ($true) {
  try {
    # heartbeat explicito: o site ve o PC como "ligado"
    $hb = PostJson "$Site/api/agente/heartbeat" @{} | Out-Null
    if (-not $ligado) {
      $ligado = $true
      Show ("LIGADO ao site  " + (Get-Date).ToString('HH:mm:ss') + "  (mantem esta janela aberta)") 'Green'
    }
    $falhas = 0

    $r = GetJson "$Site/api/agente/proximo"
    if ($r.encerrar) { Show 'O site pediu para desligar o agente.' 'Red'; break }
    if ($r.job) {
      Show ("A executar: " + $r.job.nome) 'Cyan'
      RunJob $r.job
      Show 'Pronto. A aguardar novos trabalhos...' 'Green'
    } else {
      Start-Sleep -Seconds 5
    }
  } catch {
    $falhas++
    $ligado = $false
    $msg = $_.Exception.Message
    if ($msg -match '401|Unauthorized') { Show 'Sessao expirada. Volta ao site e descarrega o LOCAUS-PC.bat outra vez.' 'Red'; break }
    if ($msg -match '403|Forbidden|challenge|Security Checkpoint') {
      Show 'Bloqueado pelo firewall do site; a tentar de novo em 60s...' 'DarkYellow'
      Start-Sleep -Seconds 60
      continue
    }
    Show ("Sem ligacao ao site (tentativa $falhas): " + $msg) 'DarkYellow'
    if ($falhas -ge 20) { Show 'Demasiadas falhas. A desligar o agente.' 'Red'; break }
    Start-Sleep -Seconds 3
  }
}
Show 'Agente desligado.' 'Gray'
try { PostJson "$Site/api/agente/desligar" @{} | Out-Null } catch {}
