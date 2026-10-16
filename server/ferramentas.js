/* ============================================================
   Ferramentas Windows — scripts PowerShell que correm no PC
   ------------------------------------------------------------
   A aba /ferramentas mostra um catálogo; ao clicar num botão
   escrevemos o script num ficheiro temporário (UTF-8 com BOM,
   senão o PowerShell 5.1 lê sem BOM como ANSI e troca os
   acentos) e corremos powershell -File. Cada linha que sai vai
   para estado.logs — o site mostra-a a andar, como um terminal.
   Só admin (rotas em routes/ferramentas.js) e nunca fora de
   Windows/Vercel: lá devolvemos 501.
   ============================================================ */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getDb } = require('./database');

const podeLocal = () => process.platform === 'win32' && !process.env.VERCEL;

const WINGET = (id) =>
  `winget install --id ${id} -e --accept-package-agreements --accept-source-agreements --disable-interactivity`;

/* ---------------------------------------------------------------
   Catálogo
   --------------------------------------------------------------- */
const CABECALHO = `
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$elevado = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $elevado) { Write-Output 'Aviso: sem privilegios de administrador - operacoes no sistema podem falhar.' }
`;

const FERRAMENTAS = [
  /* ---------------- Rede ---------------- */
  {
    id: 'rede-dns-flush',
    cat: 'Rede',
    nome: 'Limpar cache DNS',
    desc: 'Esquece os domínios guardados. Resolve sites que não abrem.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `Clear-DnsClientCache
ipconfig /flushdns
Write-Output 'Cache DNS limpo.'`,
  },
  {
    id: 'rede-dns-cloudflare',
    cat: 'Rede',
    nome: 'DNS Cloudflare (1.1.1.1)',
    desc: 'Muda o DNS de todas as placas ativas para 1.1.1.1 / 1.0.0.1. Mais rápido e privado.',
    perigo: 'baixo',
    tempo: 90000,
    cmd: `$ativos = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up')
if (-not $ativos.Count) { Write-Output 'Sem placas de rede ativas.' }
foreach ($a in $ativos) {
  $n = $a.Name
  $r = netsh interface ipv4 set dnsservers name="$n" static 1.1.1.1 primary validate=no
  $r2 = netsh interface ipv4 add dnsservers name="$n" address=1.0.0.1 index=2 validate=no
  Write-Output ("$n : " + ($r -join ' '))
}
Clear-DnsClientCache -ErrorAction SilentlyContinue
Write-Output 'Feito.'`,
  },
  {
    id: 'rede-dns-dhcp',
    cat: 'Rede',
    nome: 'DNS automático (repor)',
    desc: 'Volta ao DNS do teu operador (o normal).',
    perigo: 'baixo',
    tempo: 90000,
    cmd: `$ativos = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up')
foreach ($a in $ativos) {
  $n = $a.Name
  $r = netsh interface ipv4 set dnsservers name="$n" dhcp
  Write-Output ("$n : " + ($r -join ' '))
}
Clear-DnsClientCache -ErrorAction SilentlyContinue
Write-Output 'Feito.'`,
  },
  {
    id: 'rede-reset',
    cat: 'Rede',
    nome: 'Repor internet (winsock + TCP/IP)',
    desc: 'Reinicia a stack de rede. Para quando a internet ficou estranha. Reinicia o PC no fim.',
    perigo: 'medio',
    tempo: 120000,
    cmd: `netsh winsock reset
netsh int ip reset
ipconfig /release
ipconfig /renew
ipconfig /flushdns
Write-Output 'Feito. Reinicia o PC para terminar.'`,
  },
  {
    id: 'rede-gamer',
    cat: 'Rede',
    nome: 'Rede para jogar (menos latência)',
    desc: 'Desliga o throttle de multimedia e o algoritmo de Nagle (TCPNoDelay) nas interfaces.',
    perigo: 'medio',
    tempo: 90000,
    cmd: `try {
  $mp = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile'
  New-Item -Path $mp -Force | Out-Null
  Set-ItemProperty -Path $mp -Name NetworkThrottlingIndex -Value 4294967295 -Type DWord
  Set-ItemProperty -Path $mp -Name SystemResponsiveness -Value 0 -Type DWord
  Write-Output 'Multimedia: throttle de rede desativado e prioridade ao programa ativo.'
} catch { Write-Output ("Erro no SystemProfile: " + $_.Exception.Message) }
try {
  $if = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'
  $n = 0
  Get-ChildItem $if -ErrorAction SilentlyContinue | ForEach-Object {
    New-ItemProperty -Path $_.PSPath -Name TcpAckFrequency -Value 1 -Type DWord -Force -ErrorAction Stop | Out-Null
    New-ItemProperty -Path $_.PSPath -Name TCPNoDelay -Value 1 -Type DWord -Force -ErrorAction Stop | Out-Null
    $n++
  }
  Write-Output ("Nagle desligada em $n interfaces.")
} catch { Write-Output ("Erro nas interfaces: " + $_.Exception.Message) }
Write-Output 'Reinicia o PC para valer.'`,
  },
  {
    id: 'rede-estado',
    cat: 'Rede',
    nome: 'Ver estado da rede',
    desc: 'Placas, DNS, IP e latência para 1.1.1.1 / 8.8.8.8. Só lê, não mexe.',
    perigo: 'baixo',
    tempo: 90000,
    cmd: `Write-Output '== Placas =='
Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up' | ForEach-Object { Write-Output ("$($_.Name) - $($_.InterfaceDescription) - $($_.LinkSpeed)") }
Write-Output '== DNS =='
Get-DnsClientServerAddress -ErrorAction SilentlyContinue | Where-Object { $_.ServerAddresses } | ForEach-Object { Write-Output ("$($_.InterfaceAlias): " + ($_.ServerAddresses -join ', ')) }
Write-Output '== IP =='
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' } | ForEach-Object { Write-Output ("$($_.InterfaceAlias): $($_.IPAddress)/$($_.PrefixLength)") }
Write-Output '== Latencia =='
foreach ($alvo in @('1.1.1.1', '8.8.8.8')) {
  $r = Test-Connection -ComputerName $alvo -Count 4 -ErrorAction SilentlyContinue
  if ($r) {
    $m = ($r | ForEach-Object { $_.ResponseTime } | Measure-Object -Average).Average
    Write-Output ("$alvo : " + [math]::Round($m, 1) + ' ms')
  } else { Write-Output ("$alvo : sem resposta") }
}`,
  },

  /* ---------------- Debloat ---------------- */
  {
    id: 'debloat-xbox',
    cat: 'Debloat',
    nome: 'Remover apps da Xbox',
    desc: 'Game Bar, Xbox UI e companhia. Não afeta os jogos da Steam.',
    perigo: 'medio',
    tempo: 180000,
    cmd: `$p = @(Get-AppxPackage -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'Xbox|Microsoft.GamingApp|Microsoft.GamingServices' })
if (-not $p.Count) { Write-Output 'Nada para remover: nao ha apps da Xbox.' }
foreach ($x in $p) {
  Write-Output ("A remover " + $x.Name)
  try { Remove-AppxPackage -Package $x.PackageFullName -ErrorAction Stop; Write-Output ("  ok: " + $x.Name) }
  catch { Write-Output ("  falhou: " + $_.Exception.Message) }
}
Write-Output 'Feito.'`,
  },
  {
    id: 'debloat-telemetria',
    cat: 'Debloat',
    nome: 'Desativar telemetria',
    desc: 'AllowTelemetry=0 e para os serviços DiagTrack / dmwappushservice.',
    perigo: 'medio',
    tempo: 120000,
    cmd: `try {
  New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Force | Out-Null
  Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -Value 0 -Type DWord
  Write-Output 'AllowTelemetry = 0.'
} catch { Write-Output ("Erro no registo: " + $_.Exception.Message) }
foreach ($s in @('DiagTrack', 'dmwappushservice')) {
  try {
    Stop-Service -Name $s -Force -ErrorAction SilentlyContinue
    Set-Service -Name $s -StartupType Disabled -ErrorAction Stop
    Write-Output ("$s : parado e desativado.")
  } catch { Write-Output ("$s : " + $_.Exception.Message) }
}
Write-Output 'Feito.'`,
  },
  {
    id: 'debloat-widgets',
    cat: 'Debloat',
    nome: 'Desativar Widgets',
    desc: 'Tira o painel de notícias/widgets da barra de tarefas.',
    perigo: 'baixo',
    tempo: 120000,
    cmd: `try {
  New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Dsh' -Force | Out-Null
  Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Dsh' -Name AllowNewsAndInterests -Value 0 -Type DWord
  Write-Output 'Widgets desativados.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }
try {
  $w = Get-AppxPackage MicrosoftWindows.Client.WebExperience -ErrorAction SilentlyContinue
  if ($w) { Remove-AppxPackage -Package $w.PackageFullName -ErrorAction Stop; Write-Output 'Pacote dos widgets removido.' }
  else { Write-Output 'Pacote dos widgets nao instalado.' }
} catch { Write-Output ("Pacote: " + $_.Exception.Message) }`,
  },
  {
    id: 'debloat-onedrive',
    cat: 'Debloat',
    nome: 'Remover OneDrive',
    desc: 'Desinstala o OneDrive (fica na pasta de utilizador o que lá estiver).',
    perigo: 'medio',
    tempo: 240000,
    cmd: `Stop-Process -Name OneDrive -Force -ErrorAction SilentlyContinue
$src = Join-Path $env:SystemRoot 'SysWOW64\\OneDriveSetup.exe'
if (-not (Test-Path $src)) { $src = Join-Path $env:SystemRoot 'System32\\OneDriveSetup.exe' }
if (Test-Path $src) {
  Write-Output "A desinstalar: $src"
  $p = Start-Process -FilePath $src -ArgumentList '/uninstall' -PassThru -WindowStyle Hidden
  $t0 = Get-Date
  while (-not $p.HasExited -and ((Get-Date) - $t0).TotalSeconds -lt 180) { Start-Sleep -Milliseconds 500 }
  Write-Output 'OneDrive desinstalado.'
} else { Write-Output 'OneDriveSetup nao encontrado (ja deve estar removido).' }`,
  },
  {
    id: 'debloat-consumer',
    cat: 'Debloat',
    nome: 'Remover apps de consumo',
    desc: 'TikTok, Candy Crush, Clipchamp, Calculadora Económica, Get Help e afins.',
    perigo: 'medio',
    tempo: 300000,
    cmd: `$lista = @(
  'king.com.CandyCrush*',
  'king.com.BubbleWitch*',
  'SpotifyAB.SpotifyMusic',
  'Bytedance.TikTok*',
  'Disney.37853FC22B2CE',
  'Clipchamp.Clipchamp*',
  'Microsoft.GetHelp*',
  'Microsoft.Getstarted*',
  'Microsoft.MicrosoftSolitaireCollection*',
  'Microsoft.People*',
  'Microsoft.Todos*',
  'Microsoft.WindowsMaps*',
  'Microsoft.YourPhone*',
  'Microsoft.ZuneMusic*',
  'Microsoft.ZuneVideo*',
  'Microsoft.WindowsAlarms*',
  'Microsoft.WindowsFeedbackHub*',
  'Microsoft.MicrosoftOfficeHub*'
)
$removidos = 0
foreach ($p in $lista) {
  $pkgs = @(Get-AppxPackage -Name $p -ErrorAction SilentlyContinue)
  foreach ($x in $pkgs) {
    Write-Output ("A remover " + $x.Name)
    try { Remove-AppxPackage -Package $x.PackageFullName -ErrorAction Stop; $removidos++ }
    catch { Write-Output ("  falhou: " + $_.Exception.Message) }
  }
}
if ($removidos -eq 0) { Write-Output 'Nada para remover: ja esta tudo limpo.' }
else { Write-Output ("Removidos: $removidos") }`,
  },
  {
    id: 'debloat-repor',
    cat: 'Debloat',
    nome: 'Repor apps do Windows',
    desc: 'Volta a registar todas as apps incluídas (desfez remoções do Windows).',
    perigo: 'baixo',
    tempo: 420000,
    cmd: `$ok = 0; $falhou = 0
Get-AppxPackage -AllUsers -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.InstallLocation) {
    try { Add-AppxPackage -DisableDevelopmentMode -Register (Join-Path $_.InstallLocation 'AppXManifest.xml') -ErrorAction Stop; $ok++ }
    catch { $falhou++ }
  }
}
Write-Output ("Reposts: $ok · falharam: $falhou (nao e grave: apps nao presentes nao registam)")`,
  },

  /* ---------------- Otimização ---------------- */
  {
    id: 'ot-plano-alto',
    cat: 'Otimização',
    nome: 'Plano de energia: alto desempenho',
    desc: 'CPU não dorme. Melhor para jogar, gasta mais bateria/energia.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `powercfg /setactive SCHEME_MIN
powercfg /getactivescheme
Write-Output 'Plano alterado.'`,
  },
  {
    id: 'ot-plano-equilibrado',
    cat: 'Otimização',
    nome: 'Plano de energia: equilibrado',
    desc: 'Repara o padrão do Windows.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `powercfg /setactive SCHEME_BALANCED
powercfg /getactivescheme
Write-Output 'Plano alterado.'`,
  },
  {
    id: 'ot-hibernacao',
    cat: 'Otimização',
    nome: 'Desativar hibernação',
    desc: 'Liberta o hiberfil.sys (tamanho = RAM). O PC desliga em vez de hibernar.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `powercfg /h off
if ($LASTEXITCODE -eq 0) { Write-Output 'Hibernacao desativada (espaco libertado).' }
else { Write-Output "powercfg devolveu $LASTEXITCODE (precisa de admin)." }`,
  },
  /* (o "Limpar temporários" e a "cache da Windows Update" vivem já na
     categoria Limpeza — limpeza-temp e limpeza-update — por isso não
     são repetidos aqui.) */
  {
    id: 'ot-visual',
    cat: 'Otimização',
    nome: 'Efeitos visuais: desempenho',
    desc: 'Tira animações pesadas (transparentes, sombras). Fica mais rápido e mais seco.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name VisualFXSetting -Value 2 -Type DWord
  Write-Output 'Ajustes visuais em "melhor desempenho". Abre e fecha sessao para aplicar.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }`,
  },
  {
    id: 'ot-mouse',
    cat: 'Otimização',
    nome: 'Mouse sem aceleração (1:1)',
    desc: 'Tira a aceleração do rato — o cursor anda a mesma distância que o moves.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name MouseSpeed -Value '0'
Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name MouseThreshold1 -Value '0'
Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name MouseThreshold2 -Value '0'
Write-Output 'Aceleracao do rato desligada (reinicia a sessao para ter a certeza).'`,
  },
  {
    id: 'ot-arranque-limpar',
    cat: 'Otimização',
    nome: 'Limpar arranque do utilizador',
    desc: 'Cria backup no Ambiente de Trabalho e tira tudo do arranque do teu utilizador.',
    perigo: 'alto',
    tempo: 90000,
    cmd: `$p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
$bk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'arranque-backup.reg'
try {
  reg export 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' $bk /y | Out-Null
  Write-Output "Backup: $bk"
} catch { Write-Output ("Sem backup: " + $_.Exception.Message) }
$nomes = @()
try { $nomes = @((Get-Item -Path $p -ErrorAction Stop).GetValueNames()) } catch {}
if (-not $nomes.Count) { Write-Output 'Nada no arranque do utilizador.' }
foreach ($n in $nomes) {
  try { Remove-ItemProperty -Path $p -Name $n -Force; Write-Output ("desligado: $n") }
  catch { Write-Output ("falhou: $n") }
}
Write-Output 'Feito.'`,
  },

  /* ---------------- Sistema ---------------- */
  {
    id: 'sys-info',
    cat: 'Sistema',
    nome: 'Resumo do PC',
    desc: 'SO, CPU, RAM, tempo ligado e espaço livre dos discos. Só lê.',
    perigo: 'baixo',
    tempo: 90000,
    cmd: `$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
$cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Output ("PC: " + $cs.Name + ' - ' + $cs.Manufacturer + ' ' + $cs.Model)
Write-Output ("SO: " + $os.Caption + ' ' + $os.Version)
Write-Output ("CPU: " + $cpu.Name + ' @ ' + $cpu.MaxClockSpeed + ' MHz · ' + $cpu.NumberOfCores + ' nucleos / ' + $cpu.NumberOfLogicalProcessors + ' threads')
Write-Output ("RAM: " + [math]::Round($cs.TotalPhysicalMemory / 1GB, 1) + ' GB')
if ($os.LastBootUpTime) {
  $up = (Get-Date) - $os.LastBootUpTime
  Write-Output ("Ligado ha: " + [int]$up.TotalDays + ' d ' + $up.Hours + ' h ' + $up.Minutes + ' min')
}
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Output ($_.DeviceID + ' livre ' + [math]::Round($_.FreeSpace / 1GB, 0) + ' GB de ' + [math]::Round($_.Size / 1GB, 0) + ' GB')
}`,
  },
  {
    id: 'sys-autoruns',
    cat: 'Sistema',
    nome: 'Ver o que arranca com o PC',
    desc: 'Lista tipo Autoruns: entradas de registo, pastas de arranque, tarefas e serviços automáticos. Só lê.',
    perigo: 'baixo',
    tempo: 120000,
    cmd: `function Lista-Reg([string]$caminho, [string]$titulo) {
  Write-Output "== $titulo =="
  try {
    $it = Get-Item -Path $caminho -ErrorAction Stop
    foreach ($n in $it.GetValueNames()) { Write-Output ("  " + $n + ' = ' + $it.GetValue($n)) }
  } catch { Write-Output '  (vazio ou inacessivel)' }
}
Lista-Reg 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' 'Arranque - utilizador (HKCU Run)'
Lista-Reg 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce' 'Arranque - utilizador (RunOnce)'
Lista-Reg 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' 'Arranque - todos (HKLM Run)'
Lista-Reg 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce' 'Arranque - todos (RunOnce)'
Write-Output '== Pastas de arranque =='
$pastas = @((Join-Path $env:ProgramData 'Microsoft\\Windows\\Start Menu\\Programs\\StartUp'), (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs\\StartUp'))
foreach ($p in $pastas) {
  Get-ChildItem $p -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ('  ' + $_.Name) }
}
Write-Output '== Tarefas agendadas (fora da Microsoft) =='
Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskPath -notlike '\\Microsoft\\*' } | ForEach-Object {
  Write-Output ('  ' + $_.TaskPath + $_.TaskName + ' [' + $_.State + ']')
}
Write-Output '== Servicos automaticos =='
Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.StartType -eq 'Automatic' } | ForEach-Object {
  Write-Output ('  ' + $_.DisplayName + ' [' + $_.Status + ']')
}`,
  },
  {
    id: 'sys-repor-contadores',
    cat: 'Sistema',
    nome: 'Repor contadores de desempenho',
    desc: 'Corrige "object not found" do Get-Counter (fonte dos relógios quando não há CPU-Z).',
    perigo: 'medio',
    tempo: 180000,
    cmd: `lodctr /R
Write-Output "lodctr /R -> codigo $LASTEXITCODE"
winmgmt /resyncperf
Write-Output "winmgmt -> codigo $LASTEXITCODE"
Write-Output 'Se devolver 0, os contadores voltam (reinicia o servidor).'`,
  },
  {
    id: 'sys-sfc',
    cat: 'Sistema',
    nome: 'Reparar ficheiros do Windows (sfc)',
    desc: 'Procura ficheiros estragados e repõe os de origem. Demora 10-20 min.',
    perigo: 'medio',
    tempo: 2400000,
    cmd: `sfc /scannow
Write-Output "sfc terminou com codigo $LASTEXITCODE"`,
  },
  {
    id: 'sys-dism',
    cat: 'Sistema',
    nome: 'Reparar a imagem do Windows (DISM)',
    desc: 'RestaurHealth — para quando o sfc não consegue corrigir. Demora 10-30 min.',
    perigo: 'medio',
    tempo: 2400000,
    cmd: `DISM /Online /Cleanup-Image /RestoreHealth
Write-Output "DISM terminou com codigo $LASTEXITCODE"`,
  },

  /* ---------------- Debloat (extra) ---------------- */
  /* (a "Remover OneDrive" já existe acima em Debloat — não se repete.) */
  {
    id: 'debloat-sugestoes',
    cat: 'Debloat',
    nome: 'Bloquear apps de consumidor',
    desc: 'Content Delivery Manager: desliga sugestões, apps promovidos e publicidade no Iniciar.',
    perigo: 'baixo',
    tempo: 120000,
    cmd: `$p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager'
try {
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty $p -Name SystemPaneSuggestionsEnabled -Value 0 -Type DWord
  Set-ItemProperty $p -Name SubscribedContent-338388Enabled -Value 0 -Type DWord
  Set-ItemProperty $p -Name SubscribedContent-338389Enabled -Value 0 -Type DWord
  Set-ItemProperty $p -Name RotatingLockScreenEnabled -Value 0 -Type DWord
  Write-Output 'Sugestoes e publicidade desligadas.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }
Write-Output 'Feito.'`,
  },
  {
    id: 'debloat-cortana',
    cat: 'Debloat',
    nome: 'Desativar Cortana',
    desc: 'Permite que a Cortana fique desligada no Windows 10/11.',
    perigo: 'baixo',
    tempo: 90000,
    cmd: `try {
  New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' -Force | Out-Null
  Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' -Name AllowCortana -Value 0 -Type DWord
  Write-Output 'Cortana desativada.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }
Write-Output 'Feito.'`,
  },

  /* ---------------- Otimização (extra) ---------------- */
  {
    id: 'opt-plano-ultimate',
    cat: 'Otimização',
    nome: 'Plano de energia Ultimate',
    desc: 'Cria e ativa o plano "Ultimate Performance" (máximo desempenho, gasta mais energia).',
    perigo: 'baixo',
    tempo: 90000,
    cmd: `powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null
$guid = (powercfg -l | Select-String 'Ultimate Performance' | Select-Object -First 1)
if ($guid) {
  $g = ([regex]::Match($guid.ToString(), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')).Value
  powercfg -setactive $g
  Write-Output 'Plano Ultimate Performance ativo.'
} else { Write-Output 'Nao foi possivel criar o plano.' }
Write-Output 'Feito.'`,
  },
  {
    id: 'opt-game-mode',
    cat: 'Otimização',
    nome: 'Ligar Game Mode + HAGS',
    desc: 'Game Mode prioriza jogos; HAGS dá acesso da GPU à memória de vídeo.',
    perigo: 'baixo',
    tempo: 90000,
    cmd: `try {
  $g = 'HKCU:\\Software\\Microsoft\\GameBar'
  New-Item -Path $g -Force | Out-Null
  Set-ItemProperty $g -Name AutoGameModeEnabled -Value 1 -Type DWord
  $d = 'HKLM:\\SOFTWARE\\Microsoft\\DirectX'
  New-Item -Path $d -Force | Out-Null
  Set-ItemProperty $d -Name HAGSEnabled -Value 1 -Type DWord
  Write-Output 'Game Mode e HAGS ligados.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }
Write-Output 'Feito.'`,
  },
  {
    id: 'opt-fast-startup',
    cat: 'Otimização',
    nome: 'Desligar arranque rápido',
    desc: 'O arranque rápido pode causar travamentos/dual-boot. Desligá-lo dá boots mais limpos.',
    perigo: 'baixo',
    tempo: 90000,
    cmd: `try {
  $p = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty $p -Name HiberbootEnabled -Value 0 -Type DWord
  Write-Output 'Arranque rápido desligado.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }
Write-Output 'Feito.'`,
  },

  /* ---------------- Sistema (extra) ---------------- */
  {
    id: 'sys-dark-mode',
    cat: 'Sistema',
    nome: 'Modo escuro',
    desc: 'Aplica o tema escuro às apps e ao sistema.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `try {
  Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name AppsUseLightTheme -Value 0 -Type DWord
  Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name SystemUsesLightTheme -Value 0 -Type DWord
  Write-Output 'Modo escuro aplicado.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }
Write-Output 'Feito.'`,
  },
  {
    id: 'sys-long-paths',
    cat: 'Sistema',
    nome: 'Permitir caminhos longos',
    desc: 'Remove o limite de 260 caracteres em caminhos de ficheiros.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `try {
  New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem' -Force | Out-Null
  Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem' -Name LongPathsEnabled -Value 1 -Type DWord
  Write-Output 'Caminhos longos permitidos.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }
Write-Output 'Feito.'`,
  },
  {
    id: 'sys-taskmgr-top',
    cat: 'Sistema',
    nome: 'Gestor de tarefas sempre à frente',
    desc: 'O Gestor de Tarefas fica por cima das outras janelas.',
    perigo: 'baixo',
    tempo: 60000,
    cmd: `try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\TaskManager'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty $p -Name AlwaysOnTop -Value 1 -Type DWord
  Write-Output 'Gestor de tarefas sempre à frente.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }
Write-Output 'Feito.'`,
  },

  /* ---------------- Scan vírus (v0.2) ---------------- */
  {
    id: 'virus-scan-disco',
    cat: 'Scan vírus',
    nome: 'Scan vírus',
    desc: 'Varredura rápida num disco: analisa sinais de trojan, malware e sequestro (arranque, tarefas, processos, extensões duplas, executáveis sem assinatura) e depois corre a verificação rápida do Windows Defender. Acaba com um veredito claro: LIMPO ou o que encontrou.',
    perigo: 'baixo',
    tempo: 600000,
    disco: true,
    desenvolvimento: '0.2',
    cmd: `$disco = '{{DISCO}}'
if ($disco -notmatch '^[A-Za-z]:$') { Write-Output 'Disco invalido.'; exit 1 }
Write-Output "=== SCAN VIRUS em $disco (v0.2) ==="
Write-Output 'Varredura rapida: heuristica de trojan/malware + verificacao rapida do Windows Defender.'
Write-Output ''
$suspeitos = @()
$criticos = @()
$marcar = { param($t, $d, $crit) if ($crit) { $script:criticos += [PSCustomObject]@{ tipo = $t; detalhe = $d } } else { $script:suspeitos += [PSCustomObject]@{ tipo = $t; detalhe = $d } } }

Write-Output '--- 1) Protecao e ameacas do Defender ---'
try {
  $mp = Get-MpComputerStatus -ErrorAction Stop
  if (-not $mp.AntivirusEnabled) { & $marcar 'Defender' 'Windows Defender DESLIGADO neste PC.' $true }
  elseif (-not $mp.RealTimeProtectionEnabled) { & $marcar 'Defender' 'Protecao em tempo real DESLIGADA.' $true }
  $dias = -1
  if ($mp.AntivirusSignatureLastUpdated) { $dias = ((Get-Date) - $mp.AntivirusSignatureLastUpdated).Days }
  if ($dias -gt 7) { & $marcar 'Defender' "Assinaturas com $dias dias (desatualizadas)." $false }
  Write-Output ('  Protecao: ' + $(if ($mp.AntivirusEnabled) { 'ativo' } else { 'DESLIGADO' }) + $(if ($dias -ge 0) { ' | assinaturas ha ' + $dias + ' dia(s)' }))
} catch { Write-Output '  Protecao: nao foi possivel ler o estado.' }
$ameacas = @()
try { $ameacas = @(Get-MpThreat -ErrorAction Stop) } catch {}
foreach ($a in $ameacas) { try { if ($a.ThreatName) { & $marcar 'Ameaca detetada' ([string]$a.ThreatName) $true } } catch {} }
Write-Output ('  Ameacas que o Defender ja detetou: ' + $ameacas.Count)

Write-Output ''
Write-Output '--- 2) Entradas de arranque ---'
$chaves = @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce','HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run','HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce')
foreach ($k in $chaves) {
  try {
    $it = Get-Item -Path $k -ErrorAction Stop
    foreach ($n in $it.GetValueNames()) {
      $v = [string]$it.GetValue($n)
      if (-not $v) { continue }
      $alvo = if ($v -match '^\\s*\\x22([^\\x22]+)') { $Matches[1] } else { ($v -split '\\s+')[0] }
      if (-not ($alvo -like "$disco\\*")) { continue }
      if ($alvo -match "^[A-Za-z]:\\\\.*\\\\(Temp|AppData\\\\Local\\\\Temp)\\\\") { & $marcar 'Arranque' "$n -> $alvo (pasta temporaria)" $true }
      elseif (-not (Test-Path -LiteralPath $alvo)) { & $marcar 'Arranque' "$n aponta para ficheiro inexistente: $alvo" $false }
    }
  } catch {}
}
try {
  $sh = [Environment]::GetFolderPath('Startup')
  if ($sh -and (Test-Path -LiteralPath $sh)) {
    Get-ChildItem -LiteralPath $sh -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Extension -match '^\\.(exe|bat|cmd|ps1|vbs|js|pif|com)$' } |
      ForEach-Object { & $marcar 'Arranque' ("Pasta Iniciar: " + $_.FullName) $true }
  }
} catch {}
Write-Output '  Entradas de arranque: verificadas.'

Write-Output ''
Write-Output '--- 3) Tarefas, servicos e processos ---'
try {
  Get-ScheduledTask -ErrorAction SilentlyContinue | ForEach-Object {
    $t = $_
    foreach ($a in @($t.Actions)) {
      $exe = [string]$a.Execute
      if ($exe -and $exe -like "$disco\\*" -and $exe -match "^[A-Za-z]:\\\\.*\\\\(Temp|AppData\\\\Local\\\\Temp)\\\\") { & $marcar 'Tarefa' "$($t.TaskName) -> $exe" $true }
    }
  }
  Write-Output '  Tarefas agendadas: verificadas.'
} catch { Write-Output '  Tarefas agendadas: nao foi possivel ler.' }
try {
  Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
    $p = $_.Path
    if ($p -and $p -like "$disco\\*" -and $p -match "^[A-Za-z]:\\\\.*\\\\(Temp|AppData\\\\Local\\\\Temp)\\\\") { & $marcar 'Processo' "$($_.Name) -> $p" $true }
  }
  Write-Output '  Processos: verificados.'
} catch { Write-Output '  Processos: nao foi possivel ler.' }
try {
  Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
    Where-Object { $_.PathName -like "$disco\\*" -and $_.PathName -match "^[A-Za-z]:\\\\.*\\\\(Temp|AppData\\\\Local\\\\Temp)\\\\*" } |
    ForEach-Object { & $marcar 'Servico' "$($_.Name) -> $($_.PathName)" $true }
} catch {}
Write-Output '  Servicos: verificados.'

Write-Output ''
Write-Output '--- 4) Ficheiros perigosos no disco ---'
$duplas = @()
foreach ($pasta in @("$disco\\Users\\*\\Downloads", "$disco\\Users\\*\\Desktop", "$disco\\Users\\*\\Documents")) {
  try {
    $duplas += @(Get-ChildItem -Path $pasta -File -Recurse -Depth 1 -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '\\.(jpg|jpeg|png|pdf|docx|xlsx|mp4|txt|mp3|zip)\\.(exe|scr|bat|cmd|ps1|vbs|js|pif|com)$' })
  } catch {}
}
foreach ($f in $duplas) { & $marcar 'Extensao dupla' $f.FullName $true }
Write-Output ('  Extensao dupla (ex.: foto.jpg.exe): ' + $duplas.Count)

$padraoNome = '(?i)(crack|keygen|loader|patcher|activator|wiper|ransom|stealer|backdoor|trojan|malware|payload|xmrig|cryptominer|meterpreter|infector)'
$nomes = @()
foreach ($pasta in @("$disco\\Temp", "$disco\\Windows\\Temp", "$disco\\Users\\*\\Downloads", "$disco\\Users\\*\\AppData\\Local\\Temp")) {
  try {
    $nomes += @(Get-ChildItem -Path $pasta -File -Recurse -Depth 2 -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match $padraoNome } | Select-Object -First 20)
  } catch {}
}
foreach ($f in $nomes) { & $marcar 'Nome suspeito' $f.FullName $true }
Write-Output ('  Ficheiros com nome de malware: ' + $nomes.Count)

$semAss = 0
foreach ($pasta in @("$disco\\Temp", "$disco\\Windows\\Temp", "$disco\\Users\\*\\AppData\\Local\\Temp")) {
  try {
    $alvos = @(Get-ChildItem -Path $pasta -File -Recurse -Depth 2 -Include *.exe,*.scr -ErrorAction SilentlyContinue | Select-Object -First 25)
    foreach ($f in $alvos) {
      $ass = $null
      try { $ass = Get-AuthenticodeSignature -LiteralPath $f.FullName -ErrorAction Stop } catch {}
      if ($ass -and $ass.Status -ne 'Valid') { $semAss = $semAss + 1; & $marcar 'Sem assinatura' ("$($f.FullName) [" + $ass.Status + "]") $true }
    }
  } catch {}
}
Write-Output ('  Executaveis temporarios SEM assinatura valida: ' + $semAss)

$recentes = @()
foreach ($pasta in @("$disco\\Temp", "$disco\\Windows\\Temp", "$disco\\Users\\*\\Downloads", "$disco\\Users\\*\\AppData\\Local\\Temp")) {
  try {
    $encontrados = @(Get-ChildItem -Path $pasta -Include *.exe,*.scr,*.bat,*.cmd,*.ps1,*.vbs,*.js -File -Recurse -Depth 2 -ErrorAction SilentlyContinue |
      Where-Object { $_ -and $_.LastWriteTime -gt (Get-Date).AddDays(-7) })
    if ($encontrados.Count) { $recentes += $encontrados }
  } catch {}
}
foreach ($f in ($recentes | Where-Object { $_ } | Select-Object -First 30)) { & $marcar 'Recente' ("$($f.FullName) ($($f.LastWriteTime.ToString('dd/MM')))") $false }
Write-Output ('  Executaveis novos (ultimos 7 dias): ' + $recentes.Count)

try {
  $hosts = "$env:SystemRoot\\System32\\drivers\\etc\\hosts"
  $linhas = @(Get-Content -LiteralPath $hosts -ErrorAction Stop | Where-Object { $_ -and $_ -notmatch '^\\s*#' })
  if ($linhas.Count -gt 5) { & $marcar 'Hosts' ("O ficheiro hosts tem " + $linhas.Count + " entradas ativas (possivel sequestro DNS).") $false }
} catch {}

Write-Output ''
Write-Output '--- 5) Verificacao rapida do Windows Defender ---'
$correuDefender = $false
try {
  Start-MpScan -ScanType QuickScan -ErrorAction Stop
  $correuDefender = $true
  Write-Output '  Verificacao rapida CONCLUIDA.'
} catch { Write-Output ('  Nao correu aqui: ' + $_.Exception.Message) }
try {
  $depois = @(Get-MpThreat -ErrorAction Stop)
  foreach ($a in $depois) { try { if ($a.ThreatName) { & $marcar 'Ameaca detetada' ([string]$a.ThreatName) $true } } catch {} }
} catch {}

Write-Output ''
Write-Output '=== RESULTADO FINAL ==='
if ($criticos.Count) {
  Write-Output ("ENCONTRADO: " + $criticos.Count + " sinal(is) grave(s) - pode ser virus, trojan ou malware:")
  foreach ($s in $criticos) { Write-Output ("  [!] " + $s.tipo + ": " + $s.detalhe) }
}
if ($suspeitos.Count) {
  Write-Output ("A VERIFICAR: " + $suspeitos.Count + " sinal(is) menor(es):")
  foreach ($s in $suspeitos) { Write-Output ("  [-] " + $s.tipo + ": " + $s.detalhe) }
}
if (-not $criticos.Count -and -not $suspeitos.Count) {
  Write-Output 'LIMPO - nao encontrei virus, trojan, malware nem outros sinais neste disco.'
} elseif (-not $criticos.Count) {
  Write-Output 'Sem virus encontrado - apenas sinais menores para confirmares.'
}
Write-Output ''
Write-Output $(if ($correuDefender) { 'Verificacao rapida do Defender feita.' } else { 'Para confirmar, abre a Seguranca do Windows > Protecao contra virus e ameacas > Verificacao rapida.' })`,
  },
  /* ---------------- WinUtil (Chris Titus) ---------------- */
  {
    id: 'winutil',
    cat: 'Otimização',
    nome: 'WinUtil (Chris Titus)',
    desc: 'Abre o WinUtil — ferramenta tudo-em-um com debloat, tweaks e tweaks de rede. Corre em modo normal.',
    perigo: 'medio',
    normal: true,
    tempo: 300000,
    cmd: `Invoke-Expression (Invoke-RestMethod -Uri https://christitus.com/win).ToString()`,
  },
];

/* ---------------- Programas (winget) — importados do catálogo com ícones ---------------- */
const { PROGRAMAS: PROGRAMAS_RAW, LOGOS } = require('./ferramentas-programas.js');
const PROGRAMAS_CATALOGO = PROGRAMAS_RAW.map((p) => ({
  id: p[0],
  nome: p[1],
  subcategoria: p[2],
  wingetId: p[3],
  descricao: p[4],
  icone: p[5],
}));
const logoDe = (id) =>
  LOGOS[id] ? `https://www.google.com/s2/favicons?domain=${LOGOS[id]}&sz=160` : null;

for (const p of PROGRAMAS_CATALOGO) {
  FERRAMENTAS.push({
    id: p.id,
    cat: 'Programas',
    sub: p.subcategoria,
    nome: p.nome,
    desc: p.descricao,
    perigo: 'baixo',
    tempo: 600000,
    icone: p.icone,
    logo: logoDe(p.id),
    wingetId: p.wingetId,
    cmd: `${WINGET(p.wingetId)}
Write-Output 'Instalacao terminada.'`,
  });
}

FERRAMENTAS.push({
  id: 'winget-livre',
  cat: 'Programas',
  nome: 'Instalar qualquer programa',
  desc: 'Escreve o ID do winget (ex.: ShareX.ShareX) e ele instala.',
  perigo: 'baixo',
  livre: true,
  tempo: 600000,
  cmd: `winget install --id {{ID}} -e --accept-package-agreements --accept-source-agreements --disable-interactivity
Write-Output 'Instalacao terminada.'`,
});

FERRAMENTAS.push({
  id: 'winget-atualizar',
  cat: 'Programas',
  nome: 'Atualizar tudo o que o winget instalou',
  desc: 'winget upgrade --all. Demora consoante haver atualizações.',
  perigo: 'baixo',
  tempo: 1800000,
  cmd: `winget upgrade --all --accept-package-agreements --accept-source-agreements --disable-interactivity
Write-Output 'Atualizacoes terminadas.'`,
});

/* ---------------- Desinstalar com limpeza (estilo Revo) ---------------- */
FERRAMENTAS.push({
  id: 'desinstalar-limpeza',
  cat: 'Programas',
  nome: 'Desinstalar com limpeza total (Revo)',
  desc: 'Desinstala via winget e limpa rastros: pastas, registo, tasks, serviços. Requer admin.',
  perigo: 'alto',
  livre: true,
  tempo: 600000,
  cmd: `$id = '{{ID}}'; if (-not $id) { Write-Output 'ID do winget obrigatorio.'; exit 1 }
Write-Output "A desinstalar $id via winget..."
try { winget uninstall --id $id -e --accept-package-agreements --accept-source-agreements --disable-interactivity } catch { Write-Output ("Winget: " + $_.Exception.Message) }
Write-Output 'A limpar rastros...'
$nomeBase = $id.Split('.')[-1]
$pastas = @(
  (Join-Path $env:ProgramFiles $nomeBase),
  (Join-Path ($env:ProgramFiles + '(x86)') $nomeBase),
  (Join-Path $env:LOCALAPPDATA $nomeBase),
  (Join-Path $env:APPDATA $nomeBase)
)
foreach ($p in $pastas) {
  if (Test-Path $p) {
    try { Remove-Item $p -Recurse -Force -ErrorAction Stop; Write-Output ("Removido: " + $p) } catch { Write-Output ("Falha: " + $p) }
  }
}
# Registo
$regPaths = @(
  "HKLM:\\SOFTWARE\\$nomeBase",
  "HKLM:\\SOFTWARE\\WOW6432Node\\$nomeBase",
  "HKCU:\\Software\\$nomeBase"
)
foreach ($r in $regPaths) {
  if (Test-Path $r) {
    try { Remove-Item $r -Recurse -Force -ErrorAction Stop; Write-Output ("Registo removido: " + $r) } catch { Write-Output ("Registo falha: " + $r) }
  }
}
# Tasks agendadas
Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -like "*$nomeBase*" } | ForEach-Object {
  try { Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction Stop; Write-Output ("Task removida: " + $_.TaskName) } catch { Write-Output ("Task falha: " + $_.TaskName) }
}
# Serviços
Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$nomeBase*" } | ForEach-Object {
  try { Stop-Service -Name $_.Name -Force -ErrorAction SilentlyContinue; Set-Service -Name $_.Name -StartupType Disabled -ErrorAction Stop; Write-Output ("Servico desativado: " + $_.Name) } catch { Write-Output ("Servico falha: " + $_.Name) }
}
Write-Output 'Limpeza completa.'`,
});

/* ---------------- Spotify Premium By Xalana ---------------- */
FERRAMENTAS.push({
  id: 'spotify-instalar',
  cat: 'Spotify',
  nome: 'Instalar Spotify Premium By Xalana',
  desc: 'Instala o spicetify (motor do mod). TENS DE TER O SPOTIFY JÁ INSTALADO. Corre em modo normal (sem admin).',
  perigo: 'baixo',
  normal: true,
  tempo: 300000,
  cmd: `winget install Spicetify.Spicetify`,
});

FERRAMENTAS.push({
  id: 'spotify-atualizar',
  cat: 'Spotify',
  nome: 'Atualizar e reaplicar Spotify Premium By Xalana',
  desc: 'Atualiza o spicetify e reaplica o tema. TENS DE TER O SPOTIFY INSTALADO. Corre em modo normal (sem admin).',
  perigo: 'baixo',
  normal: true,
  tempo: 300000,
  cmd: `spicetify update
spicetify apply`,
});

/* ---------------- Limpeza ---------------- */
FERRAMENTAS.push({
  id: 'limpeza-temp',
  cat: 'Limpeza',
  nome: 'Limpar ficheiros temporários',
  desc: 'Apaga %TEMP%, Windows\\Temp e prefetch. Seguro, só lixo.',
  perigo: 'baixo',
  tempo: 180000,
  cmd: `$ErrorActionPreference='Continue'
Write-Output 'A limpar temporarios...'
$pastas = @("$env:TEMP", "$env:SystemRoot\\Temp", "$env:SystemRoot\\Prefetch")
foreach ($p in $pastas) {
  try { Get-ChildItem $p -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue; Write-Output ("Limpo: " + $p) } catch { Write-Output ("Falha: " + $p) }
}
Write-Output 'Temporarios limpos.'`,
});

FERRAMENTAS.push({
  id: 'limpeza-update',
  cat: 'Limpeza',
  nome: 'Limpar cache do Windows Update',
  desc: 'Para os serviços, apaga a pasta de download do Update e volta a ligar.',
  perigo: 'medio',
  tempo: 180000,
  cmd: `try {
  Stop-Service wuauserv -Force -ErrorAction Stop
  Stop-Service bits -Force -ErrorAction SilentlyContinue
  Remove-Item "$env:SystemRoot\\SoftwareDistribution\\Download\\*" -Recurse -Force -ErrorAction SilentlyContinue
  Start-Service wuauserv -ErrorAction SilentlyContinue
  Start-Service bits -ErrorAction SilentlyContinue
  Write-Output 'Cache do Windows Update limpo.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }`,
});

FERRAMENTAS.push({
  id: 'limpeza-disco',
  cat: 'Limpeza',
  nome: 'Limpeza de disco (automática)',
  desc: 'Corre o cleanmgr com as caixas todas marcadas: thumbnails, logs, Defender e miniaturas.',
  perigo: 'baixo',
  tempo: 600000,
  cmd: `try {
  $v = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VolumeCaches'
  Get-ChildItem $v -ErrorAction SilentlyContinue | ForEach-Object {
    try { New-ItemProperty -Path $_.PSPath -Name StateFlags0001 -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null } catch {}
  }
  Start-Process cleanmgr.exe -ArgumentList '/sagerun:1' -Wait -ErrorAction SilentlyContinue
  Write-Output 'Limpeza de disco concluida.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }`,
});

/* ---------------------------------------------------------------
   Estado (o site faz polling disto)
   --------------------------------------------------------------- */
const estado = {
  aCorrer: null,
  logs: [],
  inicio: null,
  fim: null,
  erro: null,
  codigo: null,
};

/* ---------------------------------------------------------------
   Registo de auditoria (histórico de execuções)
   ---------------------------------------------------------------
   Fica guardado na tabela tool_runs e é mostrado SÓ no painel de
   admin (rota /api/ferramentas/historico, protegida por
   requireAdmin). Tudo é best-effort: se não houver base de dados
   o script corre na mesma e só não fica o histórico. */
let regAtual = null; // Promise do id da linha desta execução

/* ---------------------------------------------------------------
   Tradução dos códigos de saída
   ---------------------------------------------------------------
   "código 1" não diz nada a quem não é de informática. Isto vira
   uma frase — o mesmo texto aparece no terminal, no aviso de fim e
   no histórico de auditoria. */
function traduzCodigo(c) {
  if (c == null || c === '') return 'sem código';
  const n = Number(c);
  if (Number.isNaN(n)) return String(c);
  if (n === 0) return 'sucesso';
  const conhecidos = {
    1: 'erro genérico (o script falhou)',
    2: 'erro de uso — o comando não aceitou os parâmetros',
    3: 'erro interno do script',
    5: 'sem acesso — tenta correr como administrador',
    7: 'permissão negada',
    9009: 'programa não encontrado neste PC',
    1602: 'cancelado pelo utilizador',
    1603: 'falha na instalação',
    1618: 'já há uma instalação a correr — espera e tenta outra vez',
    '-1073741510': 'fechado pelo utilizador (janela fechada)',
    '-1073740791': 'falhou com erro interno do Windows',
    255: 'falhou',
  };
  if (conhecidos[n]) return `${conhecidos[n]} (código ${n})`;
  return n > 0 ? `falhou (código ${n})` : `falhou (código ${n})`;
}

/** Texto pronto a mostrar para um código (0 = sucesso). */
function textoCodigo(c) {
  return Number(c) === 0 ? 'sucesso' : traduzCodigo(c);
}

/* A tabela pode ainda não existir (BD criada antes disto). Em vez de
   obrigar a correr migrate.js à mão, criamo-la aqui uma vez, à
   primeira escrita. Se falhar, a auditoria desiste e o script corre
   na mesma — nunca atrasa nem bloqueia nada. */
let tabelaToolRuns = null;
async function garantirToolRuns() {
  if (tabelaToolRuns !== null) return tabelaToolRuns;
  try {
    await getDb().prepare(`CREATE TABLE IF NOT EXISTS public.tool_runs (
       id           bigint generated always as identity primary key,
       ferramenta_id text not null,
       nome         text,
       arg          text,
       username     text,
       inicio       timestamptz not null default now(),
       fim          timestamptz,
       codigo       integer,
       erro         text,
       cancelado    boolean not null default false,
       logs         jsonb
     )`).run();
    await getDb()
      .prepare('CREATE INDEX IF NOT EXISTS tool_runs_inicio_idx ON public.tool_runs (inicio DESC)')
      .run();
    tabelaToolRuns = true;
  } catch (e) {
    console.warn('Auditoria (criar tabela) saltou:', String(e.message).slice(0, 120));
    tabelaToolRuns = false;
  }
  return tabelaToolRuns;
}

async function registarInicio({ id, nome, arg, quem }) {
  try {
    if (!(await garantirToolRuns())) return null;
    const r = await getDb()
      .prepare(
        'INSERT INTO public.tool_runs (ferramenta_id, nome, arg, username, inicio) VALUES (?, ?, ?, ?, now()) RETURNING id',
      )
      .run(id, nome || id, arg || null, quem || null);
    return Number(r.lastInsertRowid) || null;
  } catch (e) {
    console.warn('Auditoria (início) saltou:', String(e.message).slice(0, 120));
    return null;
  }
}

async function registarFim(regId, { codigo, erro, cancelado, logs }) {
  if (!regId) return;
  try {
    await getDb()
      .prepare(
        'UPDATE public.tool_runs SET fim = now(), codigo = ?, erro = ?, cancelado = ?, logs = ?::jsonb WHERE id = ?',
      )
      .run(
        codigo == null ? null : Number(codigo),
        erro || null,
        Boolean(cancelado),
        JSON.stringify((logs || []).slice(-300)),
        regId,
      );
  } catch (e) {
    console.warn('Auditoria (fim) saltou:', String(e.message).slice(0, 120));
  }
}

/** Últimas execuções — só para o painel admin. */
async function historico(limite = 50) {
  const n = Math.min(200, Math.max(1, Number(limite) || 50));
  try {
    if (!(await garantirToolRuns())) return [];
    const linhas = await getDb()
      .prepare('SELECT * FROM public.tool_runs ORDER BY id DESC LIMIT ?')
      .all(n);
    /* devolve também o texto do código — o painel não tem de traduzir */
    return (linhas || []).map((r) => ({
      ...r,
      codigo_texto: r.codigo == null ? null : textoCodigo(r.codigo),
    }));
  } catch (e) {
    console.warn('Auditoria (histórico) saltou:', String(e.message).slice(0, 120));
    return [];
  }
}

/* Para a ferramenta que está a correr (mate o processo ou a tarefa
   agendada). O motor deixa `cancelarAtual` apontar para a rotina de
   fim da execução em curso. */
let cancelarAtual = null;

function parar() {
  if (!podeLocal()) {
    return { ok: false, erro: 'Este servidor não está num PC Windows.' };
  }
  if (!estado.aCorrer) return { ok: false, erro: 'Não há nada a correr.' };
  if (!cancelarAtual) return { ok: false, erro: 'Não deu para localizar o processo em curso.' };
  try {
    cancelarAtual();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: 'Não deu para parar: ' + e.message };
  }
}

function estadoPublico() {
  return {
    aCorrer: estado.aCorrer,
    logs: estado.logs.slice(-400),
    totalLogs: estado.logs.length,
    inicio: estado.inicio,
    fim: estado.fim,
    erro: estado.erro,
    codigo: estado.codigo,
    codigoTexto: estado.codigo == null ? null : textoCodigo(estado.codigo),
    interrompido: Boolean(estado.interrompido),
    podeLocal: podeLocal(),
    podeParar: Boolean(estado.aCorrer && cancelarAtual),
    agora: new Date().toISOString(),
  };
}

function listar() {
  return FERRAMENTAS.map(({ cmd, ...f }) => ({
    ...f,
    comando: f.livre || f.disco || f.normal ? null : cmd.split('\n')[0],
  }));
}

/* Discos fixos do PC — serve o seletor da ferramenta de vírus.
   Rápido: só lê as letras, sem varrer ficheiros. */
function discosFixos() {
  if (!podeLocal()) return { ok: false, erro: 'Sem PowerShell local.', discos: [] };
  try {
    const out = require('child_process')
      .execFileSync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { $_.DeviceID }",
      ], { windowsHide: true, timeout: 8000 })
      .toString('utf8');
    const discos = out.split(/\r?\n/).map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z]:$/.test(s));
    return { ok: true, discos };
  } catch (e) {
    return { ok: false, erro: 'Não deu para listar os discos: ' + e.message, discos: [] };
  }
}

/* ---------------------------------------------------------------
   Programas já instalados no PC (via winget list)
   ---------------------------------------------------------------
   Corre `winget list` uma vez e devolve que IDs do catálogo já
   estão instalados. O frontend usa isto para marcar os cards e
   mostrar o botão de desinstalar os selecionados. */
function detectarInstalados() {
  return new Promise((resolve) => {
    if (!podeLocal()) return resolve({ ok: false, erro: 'Sem PowerShell local.' });
    const alvos = PROGRAMAS_CATALOGO.filter((p) => p.wingetId).map((p) => p.wingetId.toLowerCase());
    if (!alvos.length) return resolve({ ok: true, instalados: [] });

    const p = spawn('winget.exe', ['list', '--disable-interactivity'], { windowsHide: true });
    let out = '';
    let err = '';
    const limite = setTimeout(() => { try { p.kill(); } catch { /* já saiu */ } }, 60000);
    p.stdout.on('data', (b) => (out += String(b)));
    p.stderr.on('data', (b) => (err += String(b)));
    p.on('error', () => { clearTimeout(limite); resolve({ ok: false, erro: 'winget indisponível.' }); });
    p.on('close', () => {
      clearTimeout(limite);
      const baixo = out.toLowerCase();
      const instalados = PROGRAMAS_CATALOGO
        .filter((x) => x.wingetId && baixo.includes(x.wingetId.toLowerCase()))
        .map((x) => x.id);
      resolve({ ok: true, instalados, _err: err.trim() ? err.trim().slice(0, 120) : null });
    });
  });
}

/* ---------------------------------------------------------------
   Execução
   --------------------------------------------------------------- */
let procAtual = null;

function executar(id, arg, quem) {
  if (!podeLocal()) {
    return { ok: false, erro: 'Este servidor não está num PC Windows (a Vercel não tem PowerShell).' };
  }
  if (estado.aCorrer) return { ok: false, erro: 'Já há uma ferramenta em curso.' };

  const f = FERRAMENTAS.find((x) => x.id === id);
  if (!f) return { ok: false, erro: 'Ferramenta desconhecida.' };

  let cmd = f.cmd;
  if (f.livre) {
    const v = String(arg || '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._\-]{0,60}$/.test(v)) {
      return { ok: false, erro: 'ID do winget inválido (letras, números, ponto, hífen, ponto final).' };
    }
    cmd = cmd.replace('{{ID}}', v);
  } else if (f.disco) {
    const v = String(arg || '').trim().toUpperCase().replace(/^([A-Z])$/, '$1:');
    if (!/^[A-Z]:$/.test(v)) {
      return { ok: false, erro: 'Disco inválido — escolhe um disco (ex.: C: ou D:).' };
    }
    cmd = cmd.replace('{{DISCO}}', v);
  }

  return arrancar(cmd, {
    id,
    nome: f.nome,
    tempo: f.tempo || 180000,
    normal: f.normal,
    arg: f.livre || f.disco ? String(arg || '').trim() : null,
    quem,
  });
}

/* ---------------------------------------------------------------
   Desinstalar vários programas selecionados (estilo Revo)
   ---------------------------------------------------------------
   Para cada programa: winget uninstall + limpa pastas, registo,
   tasks e serviços. Corre tudo num script e mostra os logs. */
function desinstalar(ids, quem) {
  if (!podeLocal()) {
    return { ok: false, erro: 'Este servidor não está num PC Windows.' };
  }
  if (estado.aCorrer) return { ok: false, erro: 'Já há uma ferramenta em curso.' };

  const validos = (Array.isArray(ids) ? ids : [])
    .map((id) => FERRAMENTAS.find((x) => x.id === id))
    .filter((f) => f && f.cat === 'Programas' && f.wingetId);
  if (!validos.length) {
    return { ok: false, erro: 'Seleciona programas válidos para desinstalar.' };
  }

  const blocos = validos.map((f) => {
    const nb = f.wingetId.split('.').pop();
    return `
Write-Output "=== A desinstalar ${f.nome} ==="
try { winget uninstall --id "${f.wingetId}" -e --accept-package-agreements --accept-source-agreements --disable-interactivity } catch { Write-Output ("  winget: " + $_.Exception.Message) }
$nb = "${nb}"
foreach ($pasta in @((Join-Path $env:ProgramFiles $nb), (Join-Path ($env:ProgramFiles + '(x86)') $nb), (Join-Path $env:LOCALAPPDATA $nb), (Join-Path $env:APPDATA $nb))) {
  if ($pasta -and (Test-Path $pasta)) { try { Remove-Item $pasta -Recurse -Force -ErrorAction Stop; Write-Output ("  pasta removida: " + $pasta) } catch {} }
}
foreach ($rg in @("HKLM:\\SOFTWARE\\$nb", "HKLM:\\SOFTWARE\\WOW6432Node\\$nb", "HKCU:\\Software\\$nb")) {
  if (Test-Path $rg) { try { Remove-Item $rg -Recurse -Force -ErrorAction Stop; Write-Output ("  registo removido: " + $rg) } catch {} }
}
Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -like "*$nb*" } | ForEach-Object { try { Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue } catch {} }
Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$nb*" } | ForEach-Object { try { Stop-Service -Name $_.Name -Force -ErrorAction SilentlyContinue; Set-Service -Name $_.Name -StartupType Disabled -ErrorAction SilentlyContinue } catch {} }
Write-Output "=== ${f.nome}: concluido ==="
`;
  });

  const cmd = blocos.join('\n') + "\nWrite-Output 'Desinstalacao de todos os selecionados concluida.'";
  return arrancar(cmd, {
    id: 'desinstalar',
    nome: `Desinstalar ${validos.length} programa(s)`,
    tempo: 900000,
    arg: validos.map((f) => f.wingetId).join(', '),
    quem,
  });
}

/* motor de execução partilhado (usado por executar e desinstalar) */
function arrancar(cmd, { id, nome, tempo, normal, arg, quem }) {
  const dir = path.join(os.tmpdir(), 'aj-ferramentas');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = Date.now();
  const ficheiro = path.join(dir, `${id}-${stamp}.ps1`);
  fs.writeFileSync(ficheiro, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(CABECALHO + cmd, 'utf8')]));

  estado.aCorrer = id;
  estado.logs = [{ t: new Date().toISOString(), l: `A executar: ${nome}` }];
  estado.inicio = new Date().toISOString();
  estado.fim = null;
  estado.erro = null;
  estado.codigo = null;

  /* registo de auditoria (fica no histórico do painel admin) */
  regAtual = registarInicio({ id, nome, arg, quem });

  const push = (l) => {
    estado.logs.push({ t: new Date().toISOString(), l: String(l).slice(0, 500) });
    if (estado.logs.length > 600) estado.logs.splice(0, estado.logs.length - 600);
  };
  const linhas = (buf) => {
    String(buf)
      .split(/\r?\n/)
      .map((x) => x.replace(/\u0000+$/, '').trim())
      .filter(Boolean)
      .forEach(push);
  };

  let acabado = false;
  let p = null;
  let logFicheiro = null;
  let helper = null;
  let pollIv = null;
  let interrompido = false; // true quando o admin carregou em "Parar"

  const terminar = (codigo, erro) => {
    if (acabado) return;
    acabado = true;
    clearTimeout(limite);
    if (pollIv) clearInterval(pollIv);
    estado.aCorrer = null;
    estado.codigo = codigo;
    estado.erro = erro || null;
    estado.fim = new Date().toISOString();
    estado.interrompido = interrompido;
    procAtual = null;
    cancelarAtual = null;
    try {
      fs.unlinkSync(ficheiro);
    } catch { /* já foi */ }
    if (normal) {
      try { if (logFicheiro) fs.unlinkSync(logFicheiro); } catch { /* já foi */ }
      try { if (helper) fs.unlinkSync(helper); } catch { /* já foi */ }
    }
    push(interrompido ? 'Interrompido pelo admin.' : (erro ? `Erro: ${erro}` : `Concluído — ${traduzCodigo(codigo)}.`));
    /* histórico do painel admin — best effort, nunca atrasa o fim */
    Promise.resolve(regAtual)
      .then((regId) => registarFim(regId, { codigo, erro, cancelado: interrompido, logs: estado.logs }))
      .catch(() => {});
    regAtual = null;
  };

  /* Parar a execução em curso: no modo elevado mata-se o powershell;
     no modo normal pede-se ao Agendador para matar a tarefa criada. */
  cancelarAtual = () => {
    if (acabado) return;
    interrompido = true;
    if (normal && helper) {
      spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `Import-Module ScheduledTasks; Stop-ScheduledTask -TaskName '${helper}' -Force -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName '${helper}' -Confirm:$false -ErrorAction SilentlyContinue`,
        ],
        { windowsHide: true, stdio: 'ignore' },
      );
    }
    if (p) {
      try { p.kill(); } catch { /* já saiu */ }
    }
    terminar(null, 'Interrompido pelo admin.');
  };

  const limite = setTimeout(() => {
    if (p) { try { p.kill(); } catch { /* já saiu */ } }
    terminar(null, 'Demorou demasiado e foi interrompido.');
  }, tempo);

  if (normal) {
    /* ---- modo NORMAL (sem admin) ----
       Regista uma tarefa agendada com RunLevel Limited (não elevado)
       e corre lá o script via cmd.exe, que redireciona o output para
       um log que vamos lendo à medida que cresce. */
    logFicheiro = path.join(dir, `${id}-${stamp}.log`);
    helper = `aj-norm-${stamp}`;

    // o script real: corre o comando e no fim escreve o marcador
    const psConteudo = CABECALHO + cmd +
      `\nWrite-Output ('__AJ_DONE__' + $LASTEXITCODE)\n`;
    fs.writeFileSync(ficheiro, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(psConteudo, 'utf8')]));

    push('A executar em modo NORMAL (sem privilégios de administrador)…');

    // action da tarefa: cmd.exe redireciona tudo para o log
    const reg =
      `$ErrorActionPreference='Stop';Import-Module ScheduledTasks;` +
      `$a=New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${ficheiro}" > "${logFicheiro}" 2>&1';` +
      `$p=New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited;` +
      `Unregister-ScheduledTask -TaskName '${helper}' -Confirm:$false -ErrorAction SilentlyContinue;` +
      `Register-ScheduledTask -TaskName '${helper}' -Action $a -Principal $p -Force | Out-Null;` +
      `Start-ScheduledTask -TaskName '${helper}'`;

    const pr = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', reg], {
      windowsHide: true,
    });
    let regErr = '';
    pr.stderr.on('data', (b) => (regErr += String(b)));
    pr.on('error', (e) => terminar(null, `Não deu para criar a tarefa: ${e.message}`));
    pr.on('close', (cod) => {
      if (cod !== 0 && regErr.trim()) {
        terminar(null, `Não deu para correr em modo normal: ${regErr.trim().slice(0, 200)}`);
      }
    });

    // vamos lendo o log à medida que cresce
    let lidoAte = 0;
    pollIv = setInterval(() => {
      let conteudo = '';
      try { conteudo = fs.readFileSync(logFicheiro, 'utf8'); } catch { /* ainda não existe */ }
      if (conteudo.length > lidoAte) {
        const novo = conteudo.slice(lidoAte);
        lidoAte = conteudo.length;
        const linhasNovas = novo.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
        for (const ln of linhasNovas) {
          const m = ln.match(/^__AJ_DONE__(-?\d+)$/);
          if (m) {
            const codigo = Number(m[1]);
            spawn('powershell.exe', ['-NoProfile', '-Command', `Import-Module ScheduledTasks;Unregister-ScheduledTask -TaskName '${helper}' -Confirm:$false -ErrorAction SilentlyContinue`], { windowsHide: true, stdio: 'ignore' });
            terminar(codigo, codigo !== 0 ? `O script saiu com ${traduzCodigo(codigo)}.` : null);
            return;
          }
          push(ln);
        }
      }
    }, 500);

    return { ok: true, id, nome };
  }

  /* ---- modo normal do servidor: PowerShell direto ---- */
  p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ficheiro], {
    windowsHide: true,
  });
  procAtual = p;

  p.stdout.on('data', linhas);
  p.stderr.on('data', linhas);
  p.on('error', (e) => terminar(null, `Não deu para abrir o PowerShell: ${e.message}`));
  p.on('close', (codigo) => {
    const falhou = codigo && codigo !== 0;
    terminar(codigo, falhou ? `O script saiu com ${traduzCodigo(codigo)}.` : null);
  });

  return { ok: true, id, nome };
}

module.exports = { podeLocal, listar, executar, desinstalar, detectarInstalados, estadoPublico, parar, historico, discosFixos, textoCodigo };
