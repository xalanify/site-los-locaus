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
  {
    id: 'ot-temp',
    cat: 'Otimização',
    nome: 'Limpar ficheiros temporários',
    desc: 'Apaga o teu %TEMP% (o que os programas guardam para aí).',
    perigo: 'baixo',
    tempo: 300000,
    cmd: `$n = 0; $peso = 0
Get-ChildItem -Path $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    if ($_.PSIsContainer) { Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop }
    else { $peso += $_.Length; Remove-Item $_.FullName -Force -ErrorAction Stop }
    $n++
  } catch {}
}
Write-Output ("$n itens removidos (" + [math]::Round($peso / 1MB, 0) + " MB) de $env:TEMP")`,
  },
  {
    id: 'ot-wu-cache',
    cat: 'Otimização',
    nome: 'Limpar cache da Windows Update',
    desc: 'Apaga as descargas já usadas da loja de atualizações.',
    perigo: 'medio',
    tempo: 300000,
    cmd: `try { Stop-Service wuauserv -Force -ErrorAction Stop } catch { Write-Output ("wuauserv: " + $_.Exception.Message) }
$d = Join-Path $env:SystemRoot 'SoftwareDistribution\\Download'
$antes = 0
$medida = Get-ChildItem $d -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum
if ($medida -and $medida.Sum) { $antes = $medida.Sum }
Remove-Item (Join-Path $d '*') -Recurse -Force -ErrorAction SilentlyContinue
try { Start-Service wuauserv -ErrorAction SilentlyContinue } catch {}
Write-Output ("Cache limpo: " + [math]::Round($antes / 1MB, 0) + ' MB libertados')`,
  },
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
];

/* ---------------- Programas (winget) e ferramentas de OC ---------------- */
const PROGRAMAS = [
  ['instalar-7zip', '7-Zip', '7zip.7zip', 'Programas'],
  ['instalar-chrome', 'Google Chrome', 'Google.Chrome', 'Programas'],
  ['instalar-firefox', 'Mozilla Firefox', 'Mozilla.Firefox', 'Programas'],
  ['instalar-discord', 'Discord', 'Discord.Discord', 'Programas'],
  ['instalar-steam', 'Steam', 'Valve.Steam', 'Programas'],
  ['instalar-vlc', 'VLC (multimédia)', 'VideoLAN.VLC', 'Programas'],
  ['instalar-obs', 'OBS Studio', 'OBSProject.OBSStudio', 'Programas'],
  ['instalar-notepad', 'Notepad++', 'Notepad++.Notepad++', 'Programas'],
  ['instalar-vscode', 'Visual Studio Code', 'Microsoft.VisualStudioCode', 'Programas'],
  ['instalar-telegram', 'Telegram', 'Telegram.TelegramDesktop', 'Programas'],
  ['instalar-spotify', 'Spotify', 'Spotify.Spotify', 'Programas'],
  ['instalar-git', 'Git', 'Git.Git', 'Programas'],
  ['instalar-cpuz', 'CPU-Z — relógios e tensões', 'CPUID.CPU-Z', 'Verificar OC'],
  ['instalar-gpuz', 'GPU-Z — relógios da GPU', 'TechPowerUp.GPU-Z', 'Verificar OC'],
  ['instalar-occt', 'OCCT — testes de estabilidade', 'OCBase.OCCT.Personal', 'Verificar OC'],
  ['instalar-afterburner', 'MSI Afterburner', 'Guru3D.Afterburner', 'Verificar OC'],
  ['instalar-hwmonitor', 'HWMonitor — sensores', 'CPUID.HWMonitor', 'Verificar OC'],
  ['instalar-crystaldiskinfo', 'CrystalDiskInfo — saúde dos discos', 'CrystalDewWorld.CrystalDiskInfo', 'Verificar OC'],
];

for (const [id, nome, wingetId, cat] of PROGRAMAS) {
  FERRAMENTAS.push({
    id,
    cat,
    nome,
    desc: `Instala via winget: ${wingetId} (sem installer manual).`,
    perigo: 'baixo',
    tempo: 600000,
    cmd: `${WINGET(wingetId)}
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

function estadoPublico() {
  return {
    aCorrer: estado.aCorrer,
    logs: estado.logs.slice(-400),
    totalLogs: estado.logs.length,
    inicio: estado.inicio,
    fim: estado.fim,
    erro: estado.erro,
    codigo: estado.codigo,
    podeLocal: podeLocal(),
    agora: new Date().toISOString(),
  };
}

function listar() {
  return FERRAMENTAS.map(({ cmd, ...f }) => ({ ...f, comando: f.livre ? null : cmd.split('\n')[0] }));
}

/* ---------------------------------------------------------------
   Execução
   --------------------------------------------------------------- */
let procAtual = null;

function executar(id, arg) {
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
  }

  const dir = path.join(os.tmpdir(), 'aj-ferramentas');
  fs.mkdirSync(dir, { recursive: true });
  const ficheiro = path.join(dir, `${id}-${Date.now()}.ps1`);
  fs.writeFileSync(ficheiro, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(CABECALHO + cmd, 'utf8')]));

  estado.aCorrer = id;
  estado.logs = [{ t: new Date().toISOString(), l: `A executar: ${f.nome}` }];
  estado.inicio = new Date().toISOString();
  estado.fim = null;
  estado.erro = null;
  estado.codigo = null;

  const tempo = f.tempo || 180000;
  const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ficheiro], {
    windowsHide: true,
  });
  procAtual = p;

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
  const terminar = (codigo, erro) => {
    if (acabado) return;
    acabado = true;
    clearTimeout(limite);
    estado.aCorrer = null;
    estado.codigo = codigo;
    estado.erro = erro || null;
    estado.fim = new Date().toISOString();
    procAtual = null;
    try {
      fs.unlinkSync(ficheiro);
    } catch {
      /* já foi */
    }
    push(erro ? `Erro: ${erro}` : `Terminado (código ${codigo}).`);
  };

  const limite = setTimeout(() => {
    try {
      p.kill();
    } catch {
      /* já saiu */
    }
    terminar(null, 'Demorou demasiado e foi interrompido.');
  }, tempo);

  p.stdout.on('data', linhas);
  p.stderr.on('data', linhas);
  p.on('error', (e) => terminar(null, `Não deu para abrir o PowerShell: ${e.message}`));
  p.on('close', (codigo) => {
    const falhou = codigo && codigo !== 0;
    terminar(codigo, falhou ? `O script saiu com o código ${codigo}.` : null);
  });

  return { ok: true, id, nome: f.nome };
}

module.exports = { podeLocal, listar, executar, estadoPublico };
