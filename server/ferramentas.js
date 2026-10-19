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

/* ============================================================
   OTIMIZAÇÃO XALANA — três níveis cumulativos
   ------------------------------------------------------------
   Os blocos reutilizam-se: o NORMAL = mínima + extras; o
   EXTREMO = mínima + extras + extras pesados. Cada ação
   escreve [ok]/[!] para o log, para se ver exatamente o que
   correu. soAdmin: true — por agora só os admins veem e correm
   (a rota filtra; serve para testar e ver logs na consola).
   ============================================================ */

/* ---- bloco 1: sempre igual (o nível 1) ---- */
const XALANA_BASE = `
Write-Output '=== OTIMIZACAO XALANA - NIVEL 1: MINIMA ==='
Write-Output 'So o essencial: nada de servicos nem tarefas, so ajustes de desempenho e resposta.'
Write-Output ''

Write-Output '[1/6] Plano de energia: alto desempenho'
try {
  powercfg /setactive SCHEME_MIN
  if ($LASTEXITCODE -eq 0) { Write-Output '  [ok] CPU deixa de dormir - resposta mais rapida ao toque.' }
  else { Write-Output ('  [!] powercfg devolveu ' + $LASTEXITCODE + ' (precisa de administrador).') }
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[2/6] Efeitos visuais: melhor desempenho'
try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name VisualFXSetting -Value 2 -Type DWord
  Write-Output '  [ok] Animacoes pesadas desligadas (menus e janelas mais leves).'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[3/6] Rato sem aceleração (1:1)'
try {
  $m = 'HKCU:\\Control Panel\\Mouse'
  Set-ItemProperty -Path $m -Name MouseSpeed -Value '0'
  Set-ItemProperty -Path $m -Name MouseThreshold1 -Value '0'
  Set-ItemProperty -Path $m -Name MouseThreshold2 -Value '0'
  Write-Output '  [ok] O rato anda exatamente a distancia que o moves.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[4/6] Animações de janelas: desligadas (input lag menor)'
try {
  Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop\\WindowMetrics' -Name MinAnimate -Value '0' -ErrorAction SilentlyContinue
  Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\DWM' -Name TaskbarAnimations -Value 0 -Type DWord -ErrorAction SilentlyContinue
  Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name ListviewAlphaSelect -Value 0 -Type DWord -ErrorAction SilentlyContinue
  Write-Output '  [ok] Sem animacoes de minimizar/maximizar; janelas reagem mais rapido.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[5/6] USB e dispositivos: nunca dormem (menos delay de input)'
try {
  powercfg /SETACVALUEINDEX SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a547-ab13af45c4df 0 | Out-Null
  powercfg /SETACVALUEINDEX SCHEME_CURRENT 0012ee47-9041-4b5d-9b77-535fba8b1442 d6d4248e-b4bb-4667-b6d0-f0e0ddb4b1f4 0 | Out-Null
  powercfg /SETACTIVE SCHEME_CURRENT | Out-Null
  Write-Output '  [ok] Sem suspensao seletiva de USB; rato/teclado respondem sempre. '
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[6/6] Temporários do utilizador limpos'
try {
  Get-ChildItem -Path $env:TEMP -Force -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Write-Output ('  [ok] %TEMP% limpo (ficaram so ficheiros em uso).')
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }
`;

/* ---- bloco 2: extras do nível 2 ---- */
const XALANA_NORMAL = `
Write-Output ''
Write-Output '--- NIVEL 2: telemetria, jogos e latência ---'

Write-Output '[7/15] Telemetria: DiagTrack parado'
try {
  Stop-Service -Name DiagTrack -Force -ErrorAction SilentlyContinue
  Set-Service -Name DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue
  Write-Output '  [ok] DiagTrack parado e desligado no arranque (menos disco e CPU em fundo).'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[8/15] Aplicações em segundo plano: suspensas'
try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name GlobalUserDisabled -Value 1 -Type DWord
  Write-Output '  [ok] Apps deixam de correr as costas.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[9/15] (jogo Xbox Game Bar fica intacto — não mexemos em nada da Xbox/Microsoft)'

Write-Output '[10/15] Sugestões e apps recomendadas: desligadas'
try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager'
  if (Test-Path $p) {
    Set-ItemProperty -Path $p -Name SystemPaneSuggestionsEnabled -Value 0 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $p -Name SubscribedContent-338388Enabled -Value 0 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $p -Name SubscribedContent-338389Enabled -Value 0 -Type DWord -ErrorAction SilentlyContinue
  }
  Write-Output '  [ok] Menu Inicio sem apps a serem promovidas.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[11/15] Transparência e demoras de menu: desligadas'
try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name EnableTransparency -Value 0 -Type DWord
  Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name MenuShowDelay -Value '0'
  Write-Output '  [ok] Sem transparencia; menus abrem de estalar.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[12/15] Latência de rede: Nagle desligado (atraso de pacotes menos)'
try {
  $raiz = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'
  $n = 0
  Get-ChildItem $raiz -ErrorAction SilentlyContinue | ForEach-Object {
    Set-ItemProperty -Path $_.PSPath -Name TcpAckFrequency -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $_.PSPath -Name TCPNoDelay -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $_.PSPath -Name TcpDelAckTicks -Value 0 -Type DWord -ErrorAction SilentlyContinue
  }
  $n = (Get-ChildItem $raiz -ErrorAction SilentlyContinue).Count
  Write-Output ('  [ok] Nagle/algoritmo de atraso desligado em ' + $n + ' interfaces (menos input lag online).')
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[13/15] DNS rápido: Cloudflare + Google e cache limpa'
try {
  $iface = (Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.IPv4Connectivity -eq 'Internet' } | Select-Object -First 1).InterfaceAlias
  if ($iface) {
    Set-DnsClientServerAddress -InterfaceAlias $iface -ServerAddresses '1.1.1.1','8.8.8.8' -ErrorAction Stop
    Write-Output ('  [ok] DNS da interface ' + $iface + ' => 1.1.1.1 / 8.8.8.8 (resposta mais rapida).')
  } else { Write-Output '  [!] Sem interface de Internet detetada; DNS nao mexido.' }
  ipconfig /flushdns | Out-Null
  Clear-DnsClientCache -ErrorAction SilentlyContinue
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[14/15] Tarefas de diagnóstico/telemetria: desativadas'
try {
  $tarefas = @(
    @('\\Microsoft\\Windows\\Application Experience\\', 'Microsoft Compatibility Appraiser'),
    @('\\Microsoft\\Windows\\Application Experience\\', 'ProgramDataUpdater'),
    @('\\Microsoft\\Windows\\Customer Experience Improvement Program\\', 'Consolidator'),
    @('\\Microsoft\\Windows\\Customer Experience Improvement Program\\', 'UsbCeip'),
    @('\\Microsoft\\Windows\\DiskDiagnostic\\', 'Microsoft-Windows-DiskDiagnosticDataCollector')
  )
  foreach ($t in $tarefas) {
    Disable-ScheduledTask -TaskPath $t[0] -TaskName $t[1] -ErrorAction SilentlyContinue | Out-Null
  }
  Write-Output '  [ok] 5 tarefas de telemetria paradas.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[15/15] Painéis de feedback e relatórios: desligados'
try {
  $mais = @(
    @('\\Microsoft\\Windows\\Feedback\\Siuf\\', 'DmClient'),
    @('\\Microsoft\\Windows\\Windows Error Reporting\\', 'QueueReporting'),
    @('\\Microsoft\\Windows\\Maps\\', 'MapsToastTask'),
    @('\\Microsoft\\Windows\\Maps\\', 'MapsUpdateTask')
  )
  foreach ($t in $mais) {
    Disable-ScheduledTask -TaskPath $t[0] -TaskName $t[1] -ErrorAction SilentlyContinue | Out-Null
  }
  Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Siuf\\Rules' -Name NumberOfSIUFInPeriod -Value 0 -Type DWord -ErrorAction SilentlyContinue
  Write-Output '  [ok] Feedback, relatorios de erro e avisos dos Mapas parados.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }
`;

/* ---- bloco 3: extras pesados do nível 3 ---- */
const XALANA_EXTREMO = `
Write-Output ''
Write-Output '--- NIVEL 3: debloat, servicos inuteis e rede a maximo ---'

Write-Output '[16/22] Debloat: NADA removido — os apps da Xbox/Microsoft ficam intactos'

Write-Output '[17/22] Serviços pesados e inúteis: parados e desligados (Xbox intocável)'
try {
  $svcs = @('SysMain', 'WSearch', 'Fax', 'RetailDemo', 'MapsBroker', 'lfsvc',
            'wisvc', 'dmwappushservice', 'DiagTrack',
            'TrkWks', 'PhoneSvc', 'SmsRouter', 'PcaSvc', 'DoSvc', 'WmpNetworkSvc',
            'RemoteRegistry', 'WerSvc', 'Netlogon', 'RemoteAccess')
  foreach ($s in $svcs) {
    Stop-Service -Name $s -Force -ErrorAction SilentlyContinue
    Set-Service -Name $s -StartupType Disabled -ErrorAction SilentlyContinue
  }
  Write-Output '  [ok] SysMain, Pesquisa, DoSvc (deliveries), Fax, Mapas, Partilha... desligados. Xbox/Microsoft ficam como estão.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[18/22] Perfil de multimedia/jogo: sem limitações'
try {
  $p = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name NetworkThrottlingIndex -Value -1 -Type DWord
  Set-ItemProperty -Path $p -Name SystemResponsiveness -Value 10 -Type DWord
  $g = $p + '\\Tasks\\Games'
  New-Item -Path $g -Force | Out-Null
  Set-ItemProperty -Path $g -Name 'GPU Priority' -Value 8 -Type DWord
  Set-ItemProperty -Path $g -Name 'Priority' -Value 6 -Type DWord
  Set-ItemProperty -Path $g -Name 'Scheduling Category' -Value 'High' -Type String
  Set-ItemProperty -Path $g -Name 'SFIO Priority' -Value 'High' -Type String
  Write-Output '  [ok] Windows deixa de engonhar a rede e poe os jogos em prioridade alta.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[19/22] Prioridade de processos: desempenho'
try {
  Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name PrioritySeparation -Value 38 -Type DWord
  Write-Output '  [ok] CPU da prioridade a correr programas (38 = modo desempenho).'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[20/22] Hibernação e arranque rápido: desligados'
try {
  powercfg /h off
  Write-Output '  [ok] hiberfil.sys libertado; o PC desliga mesmo.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[21/22] Rede: tuning TCP no maximo (latencia online o mais baixa)'
try {
  netsh int tcp set global autotuninglevel=normal | Out-Null
  netsh int tcp set global rss=enabled | Out-Null
  netsh int tcp set global ecncapability=enabled | Out-Null
  netsh int tcp set global timestamps=disabled | Out-Null
  netsh int tcp set global initialRto=2000 | Out-Null
  netsh int tcp set global rsc=disabled | Out-Null
  Get-NetAdapterRss -ErrorAction SilentlyContinue | ForEach-Object { Enable-NetAdapterRss -Name $_.Name -ErrorAction SilentlyContinue | Out-Null }
  Write-Output '  [ok] TCP afinado: RSS ligado, timestamps/RSC fora, ACKs rapidos.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }

Write-Output '[22/22] GPU: jogos sempre com prioridade grafica'
try {
  $p = 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name DirectXGlobal -Value 'GpuPreference=2;' -Type String
  Write-Output '  [ok] Windows da o-to-to com a GPU dedicada aos jogos.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }
`;

const XALANA_FIM = `
Write-Output ''
Write-Output '=== CONCLUIDO ==='
Write-Output 'As mudancas de servicos e tarefas so ficam 100% apos REINICIAR o PC.'
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

  /* ============================================================
     OTIMIZAÇÃO XALANA — três níveis cumulativos
     ------------------------------------------------------------
     Os blocos reutilizam-se: o NORMAL = mínima + extras; o
     EXTREMO = mínima + extras + extras pesados. Cada ação
     escreve [ok]/[!] para o log, para se ver exatamente o que
     correu. soAdmin: true — por agora só os admins veem e correm
     (a rota filtra; serve para testar e ver logs na consola).
     ============================================================ */

  

  /* ---- nível 1: mínima ---- */
  {
    id: 'xalana-minima',
    cat: 'Otimizador by Xalana',
    nome: 'Otimização mínima',
    desc: 'Nível 1 — o básico bem feito + resposta: animações fora e dispositivos sem suspensão. Nada de serviços nem tarefas.',
    perigo: 'baixo',
    tempo: 180000,
    icone: 'Gauge',
    passos: [
      'Plano de energia em alto desempenho (a CPU não dorme)',
      'Efeitos visuais em modo leve (menus e janelas mais rápidos)',
      'Rato 1:1 — sem aceleração, resposta exata',
      'Animações de janelas desligadas (menos delay a abrir/fechar)',
      'USB e dispositivos de input nunca dormem (fim do delay de input)',
      'Temporários do utilizador limpos',
    ],
    cmd: XALANA_BASE + XALANA_FIM,
  },
  /* ---- nível 2: normal (tudo da mínima + telemetria e jogos) ---- */
  {
    id: 'xalana-normal',
    cat: 'Otimizador by Xalana',
    nome: 'Otimização normal',
    desc: 'Nível 2 — tudo do nível 1 + telemetria parada, apps de fundo, latência de rede (Nagle fora), DNS rápido e mais tarefas paradas. Não mexe em nada da Xbox/Microsoft. O equilíbrio para jogar e trabalhar.',
    perigo: 'medio',
    tempo: 360000,
    icone: 'Rocket',
    passos: [
      'Tudo do nível 1 (energia, visuais, rato, animações, USB, temporários)',
      'Telemetria DiagTrack parada',
      'Aplicações em segundo plano suspensas',
      'Nota: nada da Xbox/Microsoft é removido ou desligado',
      'Sugestões/apps recomendadas do Início desligadas',
      'Transparência e demoras de menu desligadas',
      'Nagle desligado em todas as interfaces (menos atraso de pacotes)',
      'DNS rápido: 1.1.1.1 + 8.8.8.8 com cache limpa',
      '5 tarefas de diagnóstico da Windows desativadas',
      'Feedback, relatórios de erro e avisos dos Mapas desligados',
    ],
    cmd: XALANA_BASE + XALANA_NORMAL + XALANA_FIM,
  },
  /* ---- nível 3: extremo (tudo + debloat e serviços) ---- */
  {
    id: 'xalana-extremo',
    cat: 'Otimizador by Xalana',
    nome: 'Otimização extremo',
    desc: 'Nível 3 — tudo dos níveis 1 e 2 + serviços inúteis desligados (Delivery Optimization, TrkWks, compartilha de media...), tuning TCP a fundo e GPU nos jogos. Xbox/Microsoft ficam intactos. Máxima fluidez.',
    perigo: 'alto',
    tempo: 600000,
    icone: 'Swords',
    passos: [
      'Tudo do nível 1 e do nível 2',
      'Nota: nada da Xbox/Microsoft é removido ou desligado',
      'Serviços pesados e inúteis parados (SysMain, Pesquisa, DoSvc, TrkWks, Fax, Mapas...)',
      'Rede sem limitação de multimedia + jogos em prioridade alta',
      'Tuning TCP: RSS ligado, timestamps e RSC fora, ACKs rápidos',
      'GPU com prioridade global a favor dos jogos',
      'Prioridade de processos em modo desempenho',
      'Hibernação e arranque rápido desligados (liberta hiberfil.sys)',
    ],
    cmd: XALANA_BASE + XALANA_NORMAL + XALANA_EXTREMO + XALANA_FIM,
  },
];

/* ============================================================
   Otimizador by Xalana — ações individuais (passos do script)
   Cada ação tem o seu trecho de PowerShell. O frontend pode
   enviar uma lista de IDs de ações selecionadas e o servidor
   monta o script só com essas ações (remove as desmarcadas).
   ============================================================ */
const XALANA_ACOES = {
  /* nível 1: mínima (4 ações) */
  'xalana-a1': {
    nome: 'Plano de energia: alto desempenho',
    desc: 'A CPU deixa de dormir; resposta mais rápida ao toque.',
    nivel: 'minima',
    script: `Write-Output '[1/4] Plano de energia: alto desempenho'
try {
  powercfg /setactive SCHEME_MIN
  if ($LASTEXITCODE -eq 0) { Write-Output '  [ok] CPU deixa de dormir - resposta mais rapida ao toque.' }
  else { Write-Output ('  [!] powercfg devolveu ' + $LASTEXITCODE + ' (precisa de administrador).') }
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a2': {
    nome: 'Efeitos visuais: modo leve',
    desc: 'Menus e janelas mais rápidos.',
    nivel: 'minima',
    script: `Write-Output '[2/4] Efeitos visuais: melhor desempenho'
try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name VisualFXSetting -Value 2 -Type DWord
  Write-Output '  [ok] Animacoes pesadas desligadas (menus e janelas mais leves).'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a3': {
    nome: 'Rato 1:1 — sem aceleração',
    desc: 'O rato anda exatamente a distância que move.',
    nivel: 'minima',
    script: `Write-Output '[3/4] Rato sem aceleração (1:1)'
try {
  $m = 'HKCU:\\Control Panel\\Mouse'
  Set-ItemProperty -Path $m -Name MouseSpeed -Value '0'
  Set-ItemProperty -Path $m -Name MouseThreshold1 -Value '0'
  Set-ItemProperty -Path $m -Name MouseThreshold2 -Value '0'
  Write-Output '  [ok] O rato anda exatamente a distancia que o moves.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a16': {
    nome: 'Animações de janelas desligadas',
    desc: 'Fim das animações de minimizar/maximizar — menos delay.',
    nivel: 'minima',
    script: `Write-Output 'Animações de janelas: desligadas (input lag menor)'
try {
  Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop\\WindowMetrics' -Name MinAnimate -Value '0' -ErrorAction SilentlyContinue
  Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\DWM' -Name TaskbarAnimations -Value 0 -Type DWord -ErrorAction SilentlyContinue
  Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name ListviewAlphaSelect -Value 0 -Type DWord -ErrorAction SilentlyContinue
  Write-Output '  [ok] Sem animacoes de minimizar/maximizar; janelas reagem mais rapido.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a17': {
    nome: 'USB e input nunca dormem',
    desc: 'Rato/teclado respondem sempre; sem suspensão seletiva.',
    nivel: 'minima',
    script: `Write-Output 'USB e dispositivos: nunca dormem (menos delay de input)'
try {
  powercfg /SETACVALUEINDEX SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a547-ab13af45c4df 0 | Out-Null
  powercfg /SETACVALUEINDEX SCHEME_CURRENT 0012ee47-9041-4b5d-9b77-535fba8b1442 d6d4248e-b4bb-4667-b6d0-f0e0ddb4b1f4 0 | Out-Null
  powercfg /SETACTIVE SCHEME_CURRENT | Out-Null
  Write-Output '  [ok] Sem suspensao seletiva de USB; rato/teclado respondem sempre.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a4': {
    nome: 'Temporários do utilizador limpos',
    desc: 'Limpa %TEMP% (fica só o que está em uso).',
    nivel: 'minima',
    script: `Write-Output '[6/6] Temporários do utilizador limpos'
try {
  Get-ChildItem -Path $env:TEMP -Force -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Write-Output ('  [ok] %TEMP% limpo (ficaram so ficheiros em uso).')
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },

  /* nível 2: normal (6 ações extras) */
  'xalana-a5': {
    nome: 'Telemetria DiagTrack parada',
    desc: 'Menos disco e CPU em fundo.',
    nivel: 'normal',
    script: `Write-Output '[5/10] Telemetria: DiagTrack parado'
try {
  Stop-Service -Name DiagTrack -Force -ErrorAction SilentlyContinue
  Set-Service -Name DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue
  Write-Output '  [ok] DiagTrack parado e desligado no arranque (menos disco e CPU em fundo).'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a6': {
    nome: 'Aplicações em segundo plano suspensas',
    desc: 'Apps deixam de correr às costas.',
    nivel: 'normal',
    script: `Write-Output '[6/10] Aplicações em segundo plano: suspensas'
try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name GlobalUserDisabled -Value 1 -Type DWord
  Write-Output '  [ok] Apps deixam de correr as costas.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a7': {
    nome: 'Xbox Game Bar e GameDVR desligados',
    desc: 'Sem overlay nem gravação de fundo.',
    nivel: 'normal',
    script: `Write-Output '[7/10] Xbox Game Bar e gravação (GameDVR): desligados'
try {
  $a = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR'
  New-Item -Path $a -Force | Out-Null
  Set-ItemProperty -Path $a -Name AppCaptureEnabled -Value 0 -Type DWord
  $b = 'HKCU:\\System\\GameConfigStore'
  New-Item -Path $b -Force | Out-Null
  Set-ItemProperty -Path $b -Name GameDVR_Enabled -Value 0 -Type DWord
  Write-Output '  [ok] Sem overlay nem gravacao de fundo a roubar recursos.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a8': {
    nome: 'Sugestões do Início desligadas',
    desc: 'Menu Início sem apps promovidas.',
    nivel: 'normal',
    script: `Write-Output '[8/10] Sugestões e apps recomendadas: desligadas'
try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager'
  if (Test-Path $p) {
    Set-ItemProperty -Path $p -Name SystemPaneSuggestionsEnabled -Value 0 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $p -Name SubscribedContent-338388Enabled -Value 0 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $p -Name SubscribedContent-338389Enabled -Value 0 -Type DWord -ErrorAction SilentlyContinue
  }
  Write-Output '  [ok] Menu Inicio sem apps a serem promovidas.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a9': {
    nome: 'Transparência e demoras de menu desligadas',
    desc: 'Sem transparência; menus abrem de estalar.',
    nivel: 'normal',
    script: `Write-Output '[9/10] Transparência e demoras de menu: desligadas'
try {
  $p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name EnableTransparency -Value 0 -Type DWord
  Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name MenuShowDelay -Value '0'
  Write-Output '  [ok] Sem transparencia; menus abrem de estalar.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a18': {
    nome: 'Latência: Nagle desligado',
    desc: 'Menos atraso de pacotes em todas as interfaces.',
    nivel: 'normal',
    script: `Write-Output 'Latência de rede: Nagle desligado'
try {
  $raiz = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'
  Get-ChildItem $raiz -ErrorAction SilentlyContinue | ForEach-Object {
    Set-ItemProperty -Path $_.PSPath -Name TcpAckFrequency -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $_.PSPath -Name TCPNoDelay -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $_.PSPath -Name TcpDelAckTicks -Value 0 -Type DWord -ErrorAction SilentlyContinue
  }
  $n = (Get-ChildItem $raiz -ErrorAction SilentlyContinue).Count
  Write-Output ('  [ok] Nagle/algoritmo de atraso desligado em ' + $n + ' interfaces (menos input lag online).')
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a19': {
    nome: 'DNS rápido (1.1.1.1 + 8.8.8.8)',
    desc: 'Resolução de sites mais rápida, cache limpa.',
    nivel: 'normal',
    script: `Write-Output 'DNS rápido: Cloudflare + Google e cache limpa'
try {
  $iface = (Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.IPv4Connectivity -eq 'Internet' } | Select-Object -First 1).InterfaceAlias
  if ($iface) {
    Set-DnsClientServerAddress -InterfaceAlias $iface -ServerAddresses '1.1.1.1','8.8.8.8' -ErrorAction Stop
    Write-Output ('  [ok] DNS da interface ' + $iface + ' => 1.1.1.1 / 8.8.8.8.')
  } else { Write-Output '  [!] Sem interface de Internet detetada; DNS nao mexido.' }
  ipconfig /flushdns | Out-Null
  Clear-DnsClientCache -ErrorAction SilentlyContinue
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a10': {
    nome: 'Tarefas de diagnóstico desativadas',
    desc: '5 tarefas de telemetria paradas.',
    nivel: 'normal',
    script: `Write-Output 'Tarefas de diagnóstico/telemetria: desativadas'
try {
  $tarefas = @(
    @('\\Microsoft\\Windows\\Application Experience\\', 'Microsoft Compatibility Appraiser'),
    @('\\Microsoft\\Windows\\Application Experience\\', 'ProgramDataUpdater'),
    @('\\Microsoft\\Windows\\Customer Experience Improvement Program\\', 'Consolidator'),
    @('\\Microsoft\\Windows\\Customer Experience Improvement Program\\', 'UsbCeip'),
    @('\\Microsoft\\Windows\\DiskDiagnostic\\', 'Microsoft-Windows-DiskDiagnosticDataCollector')
  )
  foreach ($t in $tarefas) {
    Disable-ScheduledTask -TaskPath $t[0] -TaskName $t[1] -ErrorAction SilentlyContinue | Out-Null
  }
  Write-Output '  [ok] 5 tarefas de telemetria paradas.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a15': {
    nome: 'Feedback e relatórios desligados',
    desc: 'Painéis do Feedback, WER e avisos dos Mapas fora.',
    nivel: 'normal',
    script: `Write-Output 'Painéis de feedback e relatórios: desligados'
try {
  $mais = @(
    @('\\Microsoft\\Windows\\Feedback\\Siuf\\', 'DmClient'),
    @('\\Microsoft\\Windows\\Windows Error Reporting\\', 'QueueReporting'),
    @('\\Microsoft\\Windows\\Maps\\', 'MapsToastTask'),
    @('\\Microsoft\\Windows\\Maps\\', 'MapsUpdateTask')
  )
  foreach ($t in $mais) {
    Disable-ScheduledTask -TaskPath $t[0] -TaskName $t[1] -ErrorAction SilentlyContinue | Out-Null
  }
  Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Siuf\\Rules' -Name NumberOfSIUFInPeriod -Value 0 -Type DWord -ErrorAction SilentlyContinue
  Write-Output '  [ok] Feedback, relatorios de erro e avisos dos Mapas parados.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },

  /* nível 3: extremo (5 ações extras) */
  'xalana-a11': {
    nome: 'Debloat: apps pré-instaladas removidas',
    desc: 'Xbox, Widgets, Cortana, Solitaire, Maps, etc.',
    nivel: 'extremo',
    script: `Write-Output '[11/15] Debloat: apps pré-instaladas removidas'
try {
  $alvos = @(
    'Microsoft.XboxApp', 'Microsoft.XboxGameOverlay', 'Microsoft.XboxGamingOverlay',
    'Microsoft.XboxSpeechToTextOverlay', 'Microsoft.GamingApp', 'Microsoft.WindowsWidgets',
    'Microsoft.GetHelp', 'Microsoft.Getstarted', 'Microsoft.MicrosoftSolitaireCollection',
    'Microsoft.People', 'Microsoft.WindowsMaps', 'Microsoft.Clipchamp', 'Microsoft.549981C3F5F10'
  )
  $n = 0
  foreach ($a in $alvos) {
    $pkg = Get-AppxPackage -Name $a -ErrorAction SilentlyContinue
    if ($pkg) { Remove-AppxPackage -Package $pkg.PackageFullName -ErrorAction SilentlyContinue; $n++ }
  }
  Write-Output ('  [ok] ' + $n + ' pacote(s) removidos (só o que existia neste PC).')
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a12': {
    nome: 'Serviços pesados parados e desligados',
    desc: 'SysMain, Pesquisa, Xbox, DoSvc, TrkWks, Fax, Mapas...',
    nivel: 'extremo',
    script: `Write-Output 'Serviços pesados e inúteis: parados e desligados'
try {
  $svcs = @('SysMain', 'WSearch', 'Fax', 'RetailDemo', 'MapsBroker', 'lfsvc',
            'XblAuthManager', 'XblGameSave', 'XboxGipSvc', 'XboxNetApiSvc',
            'wisvc', 'dmwappushservice', 'DiagTrack',
            'TrkWks', 'PhoneSvc', 'SmsRouter', 'PcaSvc', 'DoSvc', 'WmpNetworkSvc',
            'RemoteRegistry', 'WerSvc', 'Netlogon', 'RemoteAccess')
  foreach ($s in $svcs) {
    Stop-Service -Name $s -Force -ErrorAction SilentlyContinue
    Set-Service -Name $s -StartupType Disabled -ErrorAction SilentlyContinue
  }
  Write-Output '  [ok] SysMain, Pesquisa, Xbox, DoSvc (deliveries), Fax, Mapas, Partilha... desligados.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a13': {
    nome: 'Perfil multimédia/jogo sem limitações',
    desc: 'Rede sem limitação; jogos em prioridade alta.',
    nivel: 'extremo',
    script: `Write-Output '[13/15] Perfil de multimedia/jogo: sem limitações'
try {
  $p = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name NetworkThrottlingIndex -Value -1 -Type DWord
  Set-ItemProperty -Path $p -Name SystemResponsiveness -Value 10 -Type DWord
  $g = $p + '\\Tasks\\Games'
  New-Item -Path $g -Force | Out-Null
  Set-ItemProperty -Path $g -Name 'GPU Priority' -Value 8 -Type DWord
  Set-ItemProperty -Path $g -Name 'Priority' -Value 6 -Type DWord
  Set-ItemProperty -Path $g -Name 'Scheduling Category' -Value 'High' -Type String
  Set-ItemProperty -Path $g -Name 'SFIO Priority' -Value 'High' -Type String
  Write-Output '  [ok] Windows deixa de engonhar a rede e poe os jogos em prioridade alta.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a14': {
    nome: 'Prioridade de processos: desempenho',
    desc: 'CPU dá prioridade a correr programas.',
    nivel: 'extremo',
    script: `Write-Output '[14/15] Prioridade de processos: desempenho'
try {
  Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name PrioritySeparation -Value 38 -Type DWord
  Write-Output '  [ok] CPU da prioridade a correr programas (38 = modo desempenho).'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a20': {
    nome: 'Tuning TCP no máximo',
    desc: 'RSS ligado, timestamps e RSC fora, ACKs rápidos.',
    nivel: 'extremo',
    script: `Write-Output 'Rede: tuning TCP no maximo (latencia online o mais baixa)'
try {
  netsh int tcp set global autotuninglevel=normal | Out-Null
  netsh int tcp set global rss=enabled | Out-Null
  netsh int tcp set global ecncapability=enabled | Out-Null
  netsh int tcp set global timestamps=disabled | Out-Null
  netsh int tcp set global initialRto=2000 | Out-Null
  netsh int tcp set global rsc=disabled | Out-Null
  Get-NetAdapterRss -ErrorAction SilentlyContinue | ForEach-Object { Enable-NetAdapterRss -Name $_.Name -ErrorAction SilentlyContinue | Out-Null }
  Write-Output '  [ok] TCP afinado: RSS ligado, timestamps/RSC fora, ACKs rapidos.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a21': {
    nome: 'GPU prioritária nos jogos',
    desc: 'Windows dá a GPU dedicada sempre aos jogos.',
    nivel: 'extremo',
    script: `Write-Output 'GPU: jogos sempre com prioridade grafica'
try {
  $p = 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences'
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name DirectXGlobal -Value 'GpuPreference=2;' -Type String
  Write-Output '  [ok] Windows da a GPU dedicada sempre aos jogos.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
  'xalana-a22': {
    nome: 'Hibernação e arranque rápido desligados',
    desc: 'Liberta hiberfil.sys; o PC desliga mesmo.',
    nivel: 'extremo',
    script: `Write-Output 'Hibernação e arranque rápido: desligados'
try {
  powercfg /h off
  Write-Output '  [ok] hiberfil.sys libertado; o PC desliga mesmo.'
} catch { Write-Output ('  [!] ' + $_.Exception.Message) }`,
  },
};

/* Ordem das ações por nível (para mostrar no frontend). */
const XALANA_NIVEIS = {
  minima: ['xalana-a1', 'xalana-a2', 'xalana-a3', 'xalana-a16', 'xalana-a17', 'xalana-a4'],
  normal: [
    'xalana-a5', 'xalana-a6', 'xalana-a7', 'xalana-a8', 'xalana-a9',
    'xalana-a18', 'xalana-a19', 'xalana-a10', 'xalana-a15',
  ],
  extremo: ['xalana-a11', 'xalana-a12', 'xalana-a13', 'xalana-a20', 'xalana-a21', 'xalana-a14', 'xalana-a22'],
};

const XALANA_HEADER = `Write-Output '=== OTIMIZADOR BY XALANA ==='
`;
const XALANA_FOOTER = `
Write-Output ''
Write-Output '=== CONCLUIDO ==='
Write-Output 'As mudancas de servicos e tarefas so ficam 100%% apos REINICIAR o PC.'
`;
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

FERRAMENTAS.push({
  id: 'limpeza-navegadores',
  cat: 'Limpeza',
  nome: 'Limpar cache dos navegadores',
  desc: 'Cache do Chrome, Edge e Firefox (fica só a de que os inícios de sessão não toca).',
  perigo: 'baixo',
  tempo: 300000,
  cmd: `$ErrorActionPreference='Continue'
Write-Output 'A limpar cache de navegadores...'
$pastas = @(
  "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache",
  "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Code Cache",
  "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache",
  "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Code Cache",
  "$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles"
)
foreach ($p in $pastas) {
  if (Test-Path $p) {
    try { Get-ChildItem $p -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue; Write-Output ("Limpo: " + $p) } catch { Write-Output ("Falha: " + $p) }
  }
}
Write-Output 'Cache dos navegadores limpa.'`,
});

FERRAMENTAS.push({
  id: 'limpeza-reciclagem',
  cat: 'Limpeza',
  nome: 'Esvaziar a reciclagem',
  desc: 'Apaga de vez tudo o que está na reciclagem (todos os discos).',
  perigo: 'baixo',
  tempo: 120000,
  cmd: `try {
  Clear-RecycleBin -DriveLetter C -Force -ErrorAction SilentlyContinue
  Clear-RecycleBin -Force -ErrorAction SilentlyContinue
  Write-Output 'Reciclagem vazia.'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }`,
});

FERRAMENTAS.push({
  id: 'limpeza-dns',
  cat: 'Limpeza',
  nome: 'Limpar a cache de DNS',
  desc: 'IpcOnfig /flushdns — resolve sites que "não abrem" ou abrem a versão antiga.',
  perigo: 'baixo',
  tempo: 60000,
  cmd: `try {
  ipconfig /flushdns | Out-Null
  Write-Output 'Cache de DNS limpa (flushdns).'
} catch { Write-Output ("Erro: " + $_.Exception.Message) }`,
});

FERRAMENTAS.push({
  id: 'limpeza-wer',
  cat: 'Limpeza',
  nome: 'Limpar relatórios de erro e dumps',
  desc: 'Relatórios WER e minidumps de segfault — podem ocupar muitos MB sem valor.',
  perigo: 'baixo',
  tempo: 120000,
  cmd: `$ErrorActionPreference='Continue'
Write-Output 'A limpar relatorios de erro (WER) e dumps...'
$pastas = @(
  "$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\\ReportArchive",
  "$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\\ReportQueue",
  "$env:SystemRoot\\Minidump",
  "$env:LOCALAPPDATA\\CrashDumps"
)
foreach ($p in $pastas) {
  if (Test-Path $p) {
    try { Get-ChildItem $p -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue; Write-Output ("Limpo: " + $p) } catch { Write-Output ("Falha: " + $p) }
  }
}
Write-Output 'Relatorios limpados.'`,
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

/* soAdmin: true -> só o admin vê a ferramenta no catálogo e só
   ele a pode correr (Otimização Xalana, por agora em teste). */
function listar(soAdmin) {
  return FERRAMENTAS.filter((f) => !f.soAdmin || soAdmin).map(({ cmd, ...f }) => ({
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

function executar(id, arg, quem, soAdmin, acoes) {
  if (!podeLocal()) {
    return { ok: false, erro: 'Este servidor não está num PC Windows (a Vercel não tem PowerShell).' };
  }
  if (estado.aCorrer) return { ok: false, erro: 'Já há uma ferramenta em curso.' };

  const f = FERRAMENTAS.find((x) => x.id === id);
  if (!f) return { ok: false, erro: 'Ferramenta desconhecida.' };
  if (f.soAdmin && !soAdmin) {
    console.log('[ferramentas] bloqueado (soAdmin):', id, '->', quem);
    return { ok: false, erro: 'Esta ferramenta está reservada a administradores (em teste).' };
  }
  if (f.soAdmin) console.log('[xalana] a correr', id, '->', quem);

  let cmd = f.cmd;

  /* Otimizador by Xalana: monta o script só com as ações selecionadas.
     `acoes` é um array de IDs (ex.: ['xalana-a1','xalana-a3']) — pode
     misturar níveis (o Extremo toca no mínimo e normal também). Se não
     vier, corre o nível completo (compatível com o anterior). */
  if (id.startsWith('xalana-') && Array.isArray(acoes) && acoes.length > 0) {
    const ordemNivel = { minima: 0, normal: 1, extremo: 2 };
    const validos = acoes.filter((a) => XALANA_ACOES[a]);
    if (validos.length === 0) {
      return { ok: false, erro: 'Nenhuma ação válida selecionada.' };
    }
    // corre sempre do mais leve para o mais forte
    validos.sort((x, y) => ordemNivel[XALANA_ACOES[x].nivel] - ordemNivel[XALANA_ACOES[y].nivel]);
    const partes = [XALANA_HEADER];
    let nivelAnt = null;
    for (const a of validos) {
      const nv = XALANA_ACOES[a].nivel;
      if (nv === 'normal' && nivelAnt === 'minima') {
        partes.push(`Write-Output ''
Write-Output '--- NIVEL 2: extras de telemetria e jogos ---'`);
      }
      if (nv === 'extremo' && nivelAnt !== 'extremo') {
        partes.push(`Write-Output ''
Write-Output '--- NIVEL 3: debloat e servicos pesados ---'`);
      }
      partes.push(XALANA_ACOES[a].script);
      nivelAnt = nv;
    }
    partes.push(XALANA_FOOTER);
    cmd = partes.join('\n');
  } else if (f.livre) {
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
    const cnome = f.wingetId.split('.')[0];
    const nomeEsc = String(f.nome).replace(/'/g, "''");
    return `
Write-Output "=== A desinstalar ${f.nome} ==="
$nome = '${nomeEsc}'
$nb = '${nb}'
$cnome = '${cnome}'
$removido = $false

# 1) winget direto (não abre janelas: silencioso, força e purga)
try {
  $r = winget uninstall --id "${f.wingetId}" -e --silent --force --purge --accept-package-agreements --accept-source-agreements --disable-interactivity 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Output '  [ok] desinstalado pelo winget'; $removido = $true }
  else { Write-Output ("  winget nao saqueou (" + $LASTEXITCODE + ") - a limpar direto, estilo Revo.") }
} catch { Write-Output ("  winget falhou: " + $_.Exception.Message) }

# 2) registo: apanha as entradas de desinstalação, mata processos
#    do programa, corre o MSI silencioso (sem janelas) e apaga a chave
$chaves = @(
  "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
)
$lugar = $null
foreach ($chave in $chaves) {
  $alvos = @(Get-ItemProperty $chave -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -and $_.DisplayName -like "*$nome*" })
  foreach ($al in $alvos) {
    $removido = $true
    $inst = $al.InstallLocation
    if (-not $inst) { $inst = $al.SourceDir }
    if ($inst) {
      $lugar = $inst
      try {
        Get-Process -ErrorAction SilentlyContinue |
          Where-Object { $_.Path -and $_.Path.StartsWith($inst.TrimEnd('\\'), [System.StringComparison]::OrdinalIgnoreCase) } |
          Stop-Process -Force -ErrorAction SilentlyContinue
      } catch {}
    }
    $str = $al.UninstallString
    $qstr = $al.QuietUninstallString
    if ($qstr) {
      Write-Output "  a correr o desinstalador silencioso oficial..."
      try { Start-Process cmd.exe -ArgumentList '/c', $qstr -Wait -NoNewWindow -ErrorAction Stop } catch {}
    } elseif ($str -and $str -match 'msiexec' -and $str -match '[{][0-9A-Fa-f-]+[}]') {
      $guid = ($str | Select-String -Pattern '[{][0-9A-Fa-f-]+[}]').Matches[0].Value
      Write-Output "  a desinstalar MSI ($guid) sem janelas..."
      try { Start-Process msiexec.exe -ArgumentList '/x', $guid, '/qn', '/norestart' -Wait -ErrorAction Stop } catch {}
    } else {
      Write-Output "  sem desinstalador silencioso - limpeza direta das pastas e do registo."
    }
    # a própria chave de desinstalação sai também
    try { Remove-Item -Path $al.PSPath -Recurse -Force -ErrorAction Stop; Write-Output '  chave de desinstalação removida' } catch {}
  }
}

# 3) pastas do programa (o sitio real do registo + palpites seguros)
$pastas = @()
if ($lugar) { $pastas += $lugar }
foreach ($n in @($nb, $cnome)) {
  if ($n) {
    $pastas += (Join-Path $env:ProgramFiles $n)
    $pastas += (Join-Path ($env:ProgramFiles + ' (x86)') $n)
    $pastas += (Join-Path $env:LOCALAPPDATA $n)
    $pastas += (Join-Path $env:APPDATA $n)
  }
}
foreach ($pasta in ($pastas | Select-Object -Unique)) {
  if ($pasta -and (Test-Path $pasta)) {
    try {
      Remove-Item $pasta -Recurse -Force -ErrorAction Stop
      Write-Output ("  pasta removida: " + $pasta)
    } catch { Write-Output ("  [!] pasta não saiu (a uso): " + $pasta) }
  }
}

# 4) restos no registo (chaves do fabricante/programa)
foreach ($rg in @("HKLM:\\SOFTWARE\\$nb", "HKLM:\\SOFTWARE\\WOW6432Node\\$nb", "HKCU:\\Software\\$nb", "HKLM:\\SOFTWARE\\$cnome", "HKCU:\\Software\\$cnome")) {
  if (Test-Path $rg) { try { Remove-Item $rg -Recurse -Force -ErrorAction Stop; Write-Output ("  registo removido: " + $rg) } catch {} }
}

# 5) atalhos do menu inicial e do ambiente de trabalho
foreach ($sitio in @($env:APPDATA + '\\Microsoft\\Windows\\Start Menu', $env:ProgramData + '\\Microsoft\\Windows\\Start Menu', [Environment]::GetFolderPath('Desktop'))) {
  if ($sitio -and (Test-Path $sitio)) {
    Get-ChildItem -Path $sitio -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue |
      Where-Object { $_.BaseName -like "*$nome*" -or $_.BaseName -like "*$nb*" } |
      ForEach-Object { try { Remove-Item $_.FullName -Force -ErrorAction Stop; Write-Output ("  atalho removido: " + $_.BaseName) } catch {} }
  }
}

# 6) tarefas agendadas e serviços deste programa
Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -like "*$nb*" -or $_.TaskName -like "*$nome*" } | ForEach-Object { try { Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue } catch {} }
Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$nb*" } | ForEach-Object { try { Stop-Service -Name $_.Name -Force -ErrorAction SilentlyContinue; Set-Service -Name $_.Name -StartupType Disabled -ErrorAction SilentlyContinue } catch {} }

# 7) VERDADE final: continua ele no PC?
$continua = $false
foreach ($chave in $chaves) {
  if (Get-ItemProperty $chave -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and $_.DisplayName -like "*$nome*" }) { $continua = $true }
}
if ($lugar -and (Test-Path $lugar)) { $continua = $true }
if ($removido -and -not $continua) { Write-Output "=== ${f.nome}: [ok] saiu do PC ===" }
elseif ($removido) { Write-Output "=== ${f.nome}: [!] quase - rebuçados alguns (reinicia e vê ou desinstala nas Definições) ===" }
else { Write-Output "=== ${f.nome}: [!] nao o encontrei no registo - verifica o nome nas Definições ===" }
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
