/* ============================================================================
   InfoAoVivo — overlays ao vivo do desempenho do PC (beta 0.1.0)
   ----------------------------------------------------------------------------
   App nativo Windows (WinForms + GDI+, compilado com o csc do próprio
   Windows — zero dependências, RAM típica 15–25 MB).

   - Overlays sempre no topo, sem moldura, cantos redondos, esquálidos.
   - Cada overlay mostra só os módulos que escolheres (14 disponíveis,
     combinação livre) — feito para pousar no segundo monitor.
   - Presets prontos: Mínimo, Resumo, Gamer, Rede, Completo.
   - Tray: definições, mostrar/ocultar, arranque com o Windows, sair.
   - Extras: "o rato atravessa" (overlay só de leitura), cor de acento,
     opacidade, escala da letra, intervalo de amostragem.
   - Definições em %LOCALAPPDATA%\InfoAoVivo\config.ini

   LEITURAS: só WMI (estável entre línguas do Windows); o pesado (GPU,
   temperatura) corre em ciclos alternados para não gastar CPU nenhum.
   ============================================================================
*/
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Management;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace InfoAoVivo
{
    /* ============================= config ============================= */
    public class OverlayCfg
    {
        public string Nome = "Overlay";
        public List<string> Modulos = new List<string>();
        public double Opacidade = 0.9;
        public string Cor = "#8b5cf6";
        public int X = 60, Y = 60, Largura = 240;
        public bool Atravessa = false;
        public int EscalaGlobal = 100;   /* preenchida pelo app (config geral) */
    }

    public class Config
    {
        public bool Arranque = false;
        public int Intervalo = 1000;
        public int Escala = 100;
        public List<OverlayCfg> Overlays = new List<OverlayCfg>();

        public static string Pasta()
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "InfoAoVivo");
        }
        public static string Ficheiro() { return Path.Combine(Pasta(), "config.ini"); }

        public static Config Padrao()
        {
            Config c = new Config();
            c.Arranque = false;
            c.Intervalo = 1000;
            c.Escala = 100;
            c.Overlays = new List<OverlayCfg>();
            c.Overlays.Add(OverlayDoPreset("Resumo", "#8b5cf6", 1280, 80));
            return c;
        }

        public static OverlayCfg OverlayDoPreset(string preset, string cor, int x, int y)
        {
            OverlayCfg o = new OverlayCfg();
            o.Nome = preset;
            o.Cor = cor;
            o.X = x; o.Y = y;
            o.Modulos = Catalogo.Presets.ContainsKey(preset)
                ? new List<string>(Catalogo.Presets[preset])
                : new List<string> { "cpu", "ram" };
            return o;
        }

        public void Carregar()
        {
            Overlays = new List<OverlayCfg>();
            try
            {
                if (!File.Exists(Ficheiro()))
                {
                    Config p = Padrao();
                    Arranque = p.Arranque; Intervalo = p.Intervalo; Escala = p.Escala;
                    Overlays = p.Overlays;
                    return;
                }
                OverlayCfg at = null;
                string sec = "";
                foreach (string line in File.ReadAllLines(Ficheiro()))
                {
                    string l = line.Trim();
                    if (l.StartsWith("[") && l.EndsWith("]"))
                    {
                        sec = l.Substring(1, l.Length - 2);
                        if (sec == "geral") at = null;
                        else { at = new OverlayCfg(); Overlays.Add(at); }
                        continue;
                    }
                    int eq = l.IndexOf('=');
                    if (eq < 1) continue;
                    string k = l.Substring(0, eq).Trim();
                    string v = l.Substring(eq + 1).Trim();
                    if (sec == "geral")
                    {
                        if (k == "arranque") Arranque = v == "1";
                        else if (k == "intervalo") int.TryParse(v, NumberStyles.Any,
                            CultureInfo.InvariantCulture, out Intervalo);
                        else if (k == "escala") int.TryParse(v, out Escala);
                    }
                    else if (at != null)
                    {
                        if (k == "nome") at.Nome = v;
                        else if (k == "modulo") at.Modulos = new List<string>(
                            v.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries));
                        else if (k == "op")
                        {
                            double d;
                            if (double.TryParse(v, NumberStyles.Any,
                                CultureInfo.InvariantCulture, out d) && d >= 0.3 && d <= 1)
                                at.Opacidade = d;
                        }
                        else if (k == "cor") at.Cor = v;
                        else if (k == "x") int.TryParse(v, out at.X);
                        else if (k == "y") int.TryParse(v, out at.Y);
                        else if (k == "w") int.TryParse(v, out at.Largura);
                        else if (k == "atravessa") at.Atravessa = v == "1";
                    }
                }
                if (Overlays.Count == 0) Overlays = Padrao().Overlays;
            }
            catch { Overlays = Padrao().Overlays; }
        }

        public void Guardar()
        {
            try
            {
                Directory.CreateDirectory(Pasta());
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("[geral]");
                sb.Append("arranque=").AppendLine(Arranque ? "1" : "0");
                sb.Append("intervalo=").AppendLine(
                    Intervalo.ToString(CultureInfo.InvariantCulture));
                sb.Append("escala=").AppendLine(
                    Escala.ToString(CultureInfo.InvariantCulture));
                for (int i = 0; i < Overlays.Count; i++)
                {
                    OverlayCfg o = Overlays[i];
                    sb.AppendLine();
                    sb.Append("[overlay ").Append(i + 1).AppendLine("]");
                    sb.Append("nome=").AppendLine(o.Nome);
                    sb.Append("modulo=").AppendLine(
                        string.Join(";", o.Modulos.ToArray()));
                    sb.Append("op=").AppendLine(
                        o.Opacidade.ToString("0.00", CultureInfo.InvariantCulture));
                    sb.Append("cor=").AppendLine(o.Cor);
                    sb.Append("x=").AppendLine(o.X.ToString(CultureInfo.InvariantCulture));
                    sb.Append("y=").AppendLine(o.Y.ToString(CultureInfo.InvariantCulture));
                    sb.Append("w=").AppendLine(o.Largura.ToString(CultureInfo.InvariantCulture));
                    sb.Append("atravessa=").AppendLine(o.Atravessa ? "1" : "0");
                }
                File.WriteAllText(Ficheiro(), sb.ToString());
            }
            catch { }
        }
    }

    /* ==================== presets + catálogo ==================== */
    public static class Catalogo
    {
        public static string Descricao(string id)
        {
            if (id == "cpu") return "CPU — uso do processador (%)";
            if (id == "clock") return "CPU — frequência real (GHz)";
            if (id == "tempy") return "CPU — temperatura (se o PC expõe)";
            if (id == "ram") return "RAM — uso e memória livre";
            if (id == "gpu") return "GPU — uso da placa gráfica (%)";
            if (id == "vram") return "GPU — memória de vídeo usada";
            if (id == "discoio") return "Disco — leitura/escrita (MB/s)";
            if (id == "discoespa") return "Disco — espaço livre por unidade";
            if (id == "download") return "Rede — descida (Mbps)";
            if (id == "upload") return "Rede — subida (Mbps)";
            if (id == "ups") return "Sistema — tempo ligado (uptime)";
            if (id == "processos") return "Sistema — processos a correr";
            if (id == "bater") return "Bateria — carga (portáteis)";
            if (id == "subtotal") return "Sistema — utilizadores na sessão";
            return id;
        }

        public static List<string> Todos()
        {
            return new List<string> { "cpu", "clock", "tempy", "ram", "gpu", "vram",
                "discoio", "discoespa", "download", "upload", "ups", "processos",
                "bater", "subtotal" };
        }

        private static Dictionary<string, List<string>> _presets;
        public static Dictionary<string, List<string>> Presets
        {
            get
            {
                if (_presets == null)
                {
                    _presets = new Dictionary<string, List<string>>();
                    _presets["Minimo"] = new List<string> { "cpu", "ram", "download" };
                    _presets["Resumo"] = new List<string> {
                        "cpu", "clock", "ram", "discoespa", "ups" };
                    _presets["Gamer"] = new List<string> {
                        "cpu", "clock", "tempy", "gpu", "vram", "ram" };
                    _presets["Rede"] = new List<string> {
                        "download", "upload", "discoio" };
                    _presets["Completo"] = Todos();
                }
                return _presets;
            }
        }
    }

    /* ======================= leituras do PC ======================= */
    public class Estado
    {
        public string Cpu = "-", Clock = "-", Tempy = "-", Ram = "-",
            Gpu = "-", Vram = "-", DiscoIo = "-", DiscoEspa = "-",
            Down = "-", Up = "-", Ups = "-", Processos = "-",
            Bater = "-", Subtotal = "-";
        public DateTime T = DateTime.Now;
    }

    public static class Medidor
    {
        private static List<Dictionary<string, object>> Consulta(string classe)
        {
            try
            {
                var l = new List<Dictionary<string, object>>();
                using (ManagementObjectSearcher r = new ManagementObjectSearcher(
                    "SELECT * FROM " + classe))
                {
                    // conversão imediata: o objeto WMI tem de ser libertado
                    foreach (ManagementObject o in r.Get())
                    {
                        Dictionary<string, object> d = new Dictionary<string, object>();
                        foreach (PropertyData pd in o.Properties)
                            if (pd.Value != null) d[pd.Name] = pd.Value;
                        l.Add(d);
                        o.Dispose();
                    }
                }
                return l;
            }
            catch { return new List<Dictionary<string, object>>(); }
        }

        private static string S(Dictionary<string, object> d, string k)
        {
            object v;
            d.TryGetValue(k, out v);
            return v == null ? "" : v.ToString();
        }

        private static double D(Dictionary<string, object> d, string k)
        {
            object v;
            if (!d.TryGetValue(k, out v) || v == null) return -1;
            try { return Convert.ToDouble(v); } catch { return -1; }
        }

        private static string Um(double v, string fmt)
        {
            if (v < 0) return "-";
            return v.ToString(fmt, CultureInfo.InvariantCulture);
        }

        [DllImport("kernel32.dll")]
        private static extern ulong GetTickCount64();

        public static Estado Ler(int tick)
        {
            Estado e = new Estado();

            /* --- --- CPU % (leve) --- --- */
            foreach (var d in Consulta("Win32_PerfFormattedData_PerfOS_Processor"))
                if (S(d, "Name") == "_Total")
                {
                    double v = D(d, "PercentProcessorTime");
                    if (v >= 0) e.Cpu = Um(v, "0") + " %";
                }

            /* --- --- RAM (leve) --- --- */
            foreach (var d in Consulta("Win32_OperatingSystem"))
            {
                double tot = D(d, "TotalVisibleMemorySize");
                double liv = D(d, "FreePhysicalMemory");
                if (tot > 0)
                {
                    double us = (tot - liv) / 1048576.0;
                    e.Ram = Um(us, "0.0") + " / " + Um(tot / 1048576.0, "0.0") + " GB";
                }
            }

            /* --- --- rede (leve) --- --- */
            double ds = 0, up = 0; bool emo = false;
            foreach (var d in Consulta("Win32_PerfFormattedData_Tcpip_NetworkInterface"))
            {
                double a = D(d, "BytesReceivedPersec");
                double b = D(d, "BytesSentPersec");
                if (a >= 0) { ds += a; emo = true; }
                if (b >= 0) { up += b; emo = true; }
            }
            if (emo)
            {
                e.Down = Um(ds * 8 / 1e6, "0") + " Mbps";
                e.Up = Um(up * 8 / 1e6, "0") + " Mbps";
            }

            /* --- --- disco I/O (leve) --- --- */
            foreach (var d in Consulta("Win32_PerfFormattedData_PerfDisk_PhysicalDisk"))
                if (S(d, "Name") == "_Total")
                {
                    double a = D(d, "DiskReadBytesPersec");
                    double b = D(d, "DiskWriteBytesPersec");
                    if (a >= 0 || b >= 0)
                        e.DiscoIo = Um(a / 1e6, "0.0") + " / " + Um(b / 1e6, "0.0") + " MB/s";
                }

            /* --- --- pesado: só em ciclos alternados --- --- */
            if (tick % 2 == 0)
            {
                /* frequência real da CPU */
                double perf = -1, baseHz = -1;
                foreach (var d in Consulta(
                    "Win32_PerfFormattedData_Counters_ProcessorInformation"))
                    if (S(d, "Name") == "_Total")
                        perf = D(d, "PercentProcessorPerformance");
                foreach (var d in Consulta("Win32_Processor"))
                {
                    if (baseHz < 0)
                    {
                        double cur = D(d, "CurrentClockSpeed");
                        double max = D(d, "MaxClockSpeed");
                        if (max > 0) baseHz = max;
                        if (perf >= 0 && cur > 0 && cur > baseHz * 0.55) baseHz = cur;
                    }
                }
                if (perf >= 0 && baseHz > 0)
                    e.Clock = Um(baseHz * perf / 100 / 1000, "0.00") + " GHz";
                else if (baseHz > 0)
                    e.Clock = Um(baseHz / 1000, "0.00") + " GHz";

                /* temperatura (requer ACPI exposto) */
                foreach (var d in Consulta("MSAcpi_ThermalZoneTemperature"))
                {
                    double t = D(d, "CurrentTemperature");
                    if (t > 0) { e.Tempy = Um((t / 10.0) - 273.15, "0") + " °C"; break; }
                }

                /* GPU: soma todos os motores 3D/graficos */
                double g = -1, vm = -1;
                foreach (var d in Consulta(
                    "Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine"))
                {
                    string n = S(d, "Name");
                    if (n.IndexOf("engtype_3DVideo", StringComparison.OrdinalIgnoreCase) >= 0
                        || n.IndexOf("engtype_Graphics", StringComparison.OrdinalIgnoreCase) >= 0
                        || n.IndexOf("engtype_VideoCodec", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        double u = D(d, "UtilizationPercentage");
                        if (u >= 0) { if (g < 0) g = 0; g += u; }
                    }
                }
                if (g >= 0) e.Gpu = Um(g, "0") + " %";
                foreach (var d in Consulta(
                    "Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory"))
                {
                    double u = D(d, "DedicatedUsage");
                    if (u >= 0) { if (vm < 0) vm = 0; vm += u; }
                }
                if (vm >= 0) e.Vram = Um(vm / 1048576.0, "0") + " / VRAM MB";
            }

            /* --- --- espaço nos discos (a cada 30 ciclos) --- --- */
            if (tick % 30 == 0)
            {
                StringBuilder sb = new StringBuilder();
                try
                {
                    using (ManagementObjectSearcher r = new ManagementObjectSearcher(
                        "SELECT DeviceID, FreeSpace, Size FROM Win32_LogicalDisk WHERE DriveType=3"))
                    {
                        int n = 0;
                        foreach (ManagementObject o in r.Get())
                        {
                            string id = o["DeviceID"] == null ? "?" : o["DeviceID"].ToString();
                            double sz = Convert.ToDouble(o["Size"]);
                            double fr = Convert.ToDouble(o["FreeSpace"]);
                            if (sb.Length > 0) sb.Append(' ');
                            sb.Append(id).Append(' ')
                              .Append((fr / 1073741824.0).ToString("0",
                                  CultureInfo.InvariantCulture)).Append('/');
                            sb.Append((sz / 1073741824.0).ToString("0",
                                CultureInfo.InvariantCulture)).Append("GB");
                            n++;
                            if (n >= 4) break;
                            o.Dispose();
                        }
                    }
                }
                catch { }
                if (sb.Length > 0) e.DiscoEspa = sb.ToString();
            }

            /* --- --- baratos --- --- */
            ulong up6 = GetTickCount64() / 1000;
            long hrs = (long)(up6 / 3600);
            long min = (int)((up6 % 3600) / 60);
            e.Ups = hrs + " h " + min + " m";
            try { e.Processos = Process.GetProcesses().Length.ToString("0"); }
            catch { }
            if (tick % 15 == 0)
            {
                foreach (var d in Consulta("Win32_Battery"))
                {
                    double p = D(d, "EstimatedChargeRemaining");
                    if (p >= 0) e.Bater = Um(p * 100, "0") + " %";
                }
                foreach (var d in Consulta("Win32_ComputerSystem"))
                {
                    double u = D(d, "NumberOfUsers");
                    if (u >= 0) e.Subtotal = Um(u, "0");
                }
            }
            e.T = DateTime.Now;
            return e;
        }
    }

    /* ======================= overlay window ======================= */
    public class OverlayF : Form
    {
        private OverlayCfg _cfg;
        private Estado _atual;
        private bool _clicando = false;
        private Point _ptArranque;
        private Point _fArranque;

        public OverlayF(OverlayCfg cfg)
        {
            _cfg = cfg;
            _atual = new Estado();
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.Manual;
            ShowInTaskbar = false;
            TopMost = true;
            DoubleBuffered = true;
            BackColor = Color.FromArgb(12, 11, 20);
            SetStyle(ControlStyles.Opaque, true);
            Location = new Point(cfg.X, cfg.Y);
            AutoRecalcular();
            if (cfg.Atravessa) AplicarAtravessa(true);

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new MenuEscuro();
            menu.Items.Add(new ToolStripMenuItem("Mover (arrasta com o rato)") { Enabled = false });
            menu.Items.Add(new ToolStripSeparator());
            var miAtr = new ToolStripMenuItem("Deixar o rato atravessar");
            miAtr.Checked = cfg.Atravessa;
            miAtr.Click += (s, e) => { _cfg.Atravessa = !_cfg.Atravessa; miAtr.Checked = _cfg.Atravessa;
                AplicarAtravessa(_cfg.Atravessa); Program.Salvar(); };
            menu.Items.Add(miAtr);
            var miDef = new ToolStripMenuItem("Definições…");
            miDef.Click += (s, e) => Program.AbrirDefinicoes();
            menu.Items.Add(miDef);
            var miEscond = new ToolStripMenuItem("Esconder este overlay");
            miEscond.Click += (s, e) => { this.Hide(); Program.Salvar(); };
            menu.Items.Add(miEscond);
            ContextMenuStrip = menu;
        }

        public void NovaConfig(OverlayCfg c) { _cfg = c; AutoRecalcular(); Invalidate(); }

        public void Atualizar(Estado e) { _atual = e; Invalidate(); }

        public void AplicarAtravessa(bool on)
        {
            int ex = GetWindowLong(Handle, GWL_EXSTYLE);
            if (on) ex |= WS_EX_TRANSPARENT | WS_EX_LAYERED;
            else ex &= ~(WS_EX_TRANSPARENT | WS_EX_LAYERED);
            SetWindowLong(Handle, GWL_EXSTYLE, ex);
            TopMost = true;   /* a flag cai quando mexe no estilo */
        }

        private GraphicsPath Caminho(Rectangle r, int raio)
        {
            GraphicsPath p = new GraphicsPath();
            p.AddArc(r.X, r.Y, raio * 2, raio * 2, 180, 90);
            p.AddArc(r.Right - raio * 2, r.Y, raio * 2, raio * 2, 270, 90);
            p.AddArc(r.Right - raio * 2, r.Bottom - raio * 2, raio * 2, raio * 2, 0, 90);
            p.AddArc(r.X, r.Bottom - raio * 2, raio * 2, raio * 2, 90, 90);
            p.CloseFigure();
            return p;
        }

        private List<string[]> Linhas()
        {
            List<string[]> l = new List<string[]>();
            foreach (string id in _cfg.Modulos)
            {
                string v = "-";
                string etiqueta;
                int dois = id.IndexOf('|');
                if (dois >= 0)
                {
                    string a = id.Substring(0, dois), b = id.Substring(dois + 1);
                    etiqueta = Etiqueta(a) + " / " + Etiqueta(b);
                    v = ValorShow(a) + "\n" + ValorShow(b);
                    l.Add(new[] { etiqueta, v });
                    continue;
                }
                etiqueta = Etiqueta(id);
                v = ValorShow(id);
                if (etiqueta != null) l.Add(new[] { etiqueta, v });
            }
            return l;
        }

        private string Etiqueta(string id)
        {
            if (id == "cpu") return "CPU";
            if (id == "clock") return "CLOCK";
            if (id == "tempy") return "TEMP";
            if (id == "ram") return "RAM";
            if (id == "gpu") return "GPU";
            if (id == "vram") return "VRAM";
            if (id == "discoio") return "DISCO";
            if (id == "discoespa") return "DISCOS";
            if (id == "download") return "DESCIDA";
            if (id == "upload") return "SUBIDA";
            if (id == "ups") return "LIGADO";
            if (id == "processos") return "PROCESSOS";
            if (id == "bater") return "BATERIA";
            if (id == "subtotal") return "SESSÕES";
            return id;
        }

        private string ValorShow(string id)
        {
            if (id == "cpu") return _atual.Cpu;
            if (id == "clock") return _atual.Clock;
            if (id == "tempy") return _atual.Tempy;
            if (id == "ram") return _atual.Ram;
            if (id == "gpu") return _atual.Gpu;
            if (id == "vram") return _atual.Vram;
            if (id == "discoio") return _atual.DiscoIo;
            if (id == "discoespa") return _atual.DiscoEspa;
            if (id == "download") return _atual.Down;
            if (id == "upload") return _atual.Up;
            if (id == "ups") return _atual.Ups;
            if (id == "processos") return _atual.Processos;
            if (id == "bater") return _atual.Bater;
            if (id == "subtotal") return _atual.Subtotal;
            return "-";
        }

        public void AutoRecalcular()
        {
            float esc = _cfg.EscalaGlobal <= 0 ? 1 : _cfg.EscalaGlobal / 100f;
            int linhas = Linhas().Count;
            int w = Math.Max(170, (int)(_cfg.Largura * esc));
            int h = 34 + (linhas * 24) + (linhas > 0 ? 8 : 0);
            Size = new Size(w, h);
            Opacity = _cfg.Opacidade;
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= 0x8000000;   /* WS_EX_NOACTIVATE: nunca rouba focus */
                return cp;
            }
        }

        private Color Accent()
        {
            try { return ColorTranslator.FromHtml(_cfg.Cor); }
            catch { return Color.FromArgb(139, 92, 246); }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle r = new Rectangle(0, 0, ClientSize.Width, ClientSize.Height);
            using (GraphicsPath p = Caminho(r, 18))
            {
                using (SolidBrush fundo = new SolidBrush(Color.FromArgb(228, 12, 11, 20)))
                    g.FillPath(fundo, p);
                using (Pen borda = new Pen(Color.FromArgb(70, Accent().R, Accent().G, Accent().B)))
                    g.DrawPath(borda, p);
            }

            float esc = _cfg.EscalaGlobal <= 0 ? 1 : _cfg.EscalaGlobal / 100f;
            using (Font fT = new Font("Segoe UI", 9.5f * esc, FontStyle.Bold))
            using (Font fL = new Font("Segoe UI", 8f * esc))
            using (Font fV = new Font("Segoe UI Semibold", 10f * esc))
            {
                /* título + bolinha viva */
                string titulo = _cfg.Nome.ToUpper();
                SizeF ts = g.MeasureString(titulo, fT);
                using (SolidBrush bt = new SolidBrush(Color.FromArgb(235, 245, 244, 255)))
                    g.DrawString(titulo, fT, bt, 34, 7);
                using (SolidBrush bol = new SolidBrush(Color.LimeGreen))
                    g.FillEllipse(bol, 12, 12, 8, 8);

                int y = 34;
                foreach (string[] lin in Linhas())
                {
                    using (SolidBrush bl = new SolidBrush(Color.FromArgb(150, 160, 160, 180)))
                        g.DrawString(lin[0], fL, bl, 12, y);
                    string v = lin[1];
                    SizeF vs = g.MeasureString(v, fV);
                    using (SolidBrush bv = new SolidBrush(Accent()))
                        g.DrawString(v, fV, bv, ClientSize.Width - 12 - vs.Width, y - 1);
                    y += 24;
                }
            }
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                _clicando = true;
                _ptArranque = Cursor.Position;
                _fArranque = Location;
            }
            base.OnMouseDown(e);
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            if (_clicando)
            {
                Point d = Cursor.Position;
                Location = new Point(
                    _fArranque.X + (d.X - _ptArranque.X),
                    _fArranque.Y + (d.Y - _ptArranque.Y));
            }
            base.OnMouseMove(e);
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left && _clicando)
            {
                _clicando = false;
                _cfg.X = Location.X; _cfg.Y = Location.Y;
                Program.Salvar();
            }
            base.OnMouseUp(e);
        }

        protected override bool ShowWithoutActivation { get { return true; } }

        private const int GWL_EXSTYLE = -20;
        private const int WS_EX_TRANSPARENT = 0x20;
        private const int WS_EX_LAYERED = 0x80000;

        [DllImport("user32.dll")]
        private static extern int GetWindowLong(IntPtr h, int i);
        [DllImport("user32.dll")]
        private static extern int SetWindowLong(IntPtr h, int i, int v);
    }

    /* menu de contexto escuro para os overlays */
    public class MenuEscuro : ToolStripRenderer
    {
        protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e)
        {
            e.ToolStrip.BackColor = Color.FromArgb(24, 20, 38);
        }
        protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
        {
            Rectangle r = new Rectangle(Point.Empty, e.Item.Size);
            using (SolidBrush b = new SolidBrush(
                e.Item.Selected ? Color.FromArgb(52, 40, 74) : Color.FromArgb(24, 20, 38)))
                e.Graphics.FillRectangle(b, r);
        }
        protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
        {
            e.TextColor = e.Item.Selected ? Color.WhiteSmoke : Color.FromArgb(210, 200, 220);
            base.OnRenderItemText(e);
        }
    }

    /* ======================= janela de definições ======================= */
    public class DefinicoesF : Form
    {
        private Config _c;
        private ListBox _lista;
        private TextBox _nome;
        private TrackBar _op;
        private TrackBar _esc;
        private NumericUpDown _iv;
        private CheckedListBox _mods;
        private Button _cor;
        private ComboBox _preset;
        private List<OverlayCfg> _copia;

        public DefinicoesF(Config c)
        {
            _c = c;
            _copia = new List<OverlayCfg>();
            foreach (OverlayCfg o in c.Overlays)
            {
                OverlayCfg n = new OverlayCfg();
                n.Nome = o.Nome; n.Modulos = new List<string>(o.Modulos);
                n.Opacidade = o.Opacidade; n.Cor = o.Cor;
                n.X = o.X; n.Y = o.Y; n.Largura = o.Largura; n.Atravessa = o.Atravessa;
                _copia.Add(n);
            }

            Text = "InfoAoVivo — definições";
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            BackColor = Color.FromArgb(14, 12, 24);
            ForeColor = Color.WhiteSmoke;
            Size = new Size(600, 640);

            Label título = new Label();
            título.Text = "Overlays";
            título.SetBounds(16, 14, 200, 22);
            Controls.Add(título);

            _lista = new ListBox();
            _lista.DrawMode = DrawMode.OwnerDrawFixed;
            _lista.DrawItem += ListaDesenho;
            _lista.SetBounds(16, 40, 180, 330);
            _lista.BorderStyle = BorderStyle.FixedSingle;
            foreach (OverlayCfg o in _copia) _lista.Items.Add(o.Nome);
            _lista.SelectedIndexChanged += (s, e) => CarregarSel();
            Controls.Add(_lista);

            Button bNovo = new Button();
            bNovo.Text = "+ Novo";
            bNovo.FlatStyle = FlatStyle.Flat; bNovo.BackColor = Color.FromArgb(40, 32, 64);
            bNovo.ForeColor = Color.White; bNovo.SetBounds(16, 380, 85, 30);
            bNovo.Click += (s, e) => NovoOverlay();
            Controls.Add(bNovo);

            Button bApaga = new Button();
            bApaga.Text = "Eliminar";
            bApaga.FlatStyle = FlatStyle.Flat;
            bApaga.BackColor = Color.FromArgb(70, 24, 30);
            bApaga.ForeColor = Color.FromArgb(255, 150, 160);
            bApaga.SetBounds(111, 380, 85, 30);
            bApaga.Click += (s, e) => ApagarOverlay();
            Controls.Add(bApaga);

            Button bPreset = new Button();
            bPreset.Text = "Aplicar preset ↓";
            bPreset.FlatStyle = FlatStyle.Flat;
            bPreset.BackColor = Color.FromArgb(40, 32, 64);
            bPreset.ForeColor = Color.White;
            bPreset.SetBounds(16, 420, 180, 30);
            bPreset.Click += (s, e) => AplicarPreset();
            Controls.Add(bPreset);

            _preset = new ComboBox();
            _preset.DropDownStyle = ComboBoxStyle.DropDownList;
            _preset.Items.AddRange(new object[] { "Minimo", "Resumo", "Gamer", "Rede", "Completo" });
            _preset.SelectedIndex = 2;
            _preset.SetBounds(16, 458, 180, 26);
            _preset.BackColor = Color.FromArgb(28, 24, 48);
            _preset.ForeColor = Color.White;
            _preset.FlatStyle = FlatStyle.Flat;
            Controls.Add(_preset);

            /* --- coluna direita: overlay selecionado --- */
            Label lbNome = new Label(); lbNome.Text = "Nome"; lbNome.SetBounds(216, 40, 120, 20);
            Controls.Add(lbNome);
            _nome = new TextBox();
            _nome.SetBounds(216, 62, 200, 26);
            _nome.BackColor = Color.FromArgb(28, 24, 48); _nome.ForeColor = Color.White;
            _nome.BorderStyle = BorderStyle.FixedSingle;
            Controls.Add(_nome);

            _cor = new Button();
            _cor.SetBounds(426, 62, 80, 26);
            _cor.FlatStyle = FlatStyle.Flat;
            _cor.Click += (s, e) => ProximaCor();
            Controls.Add(_cor);

            Label lbOp = new Label(); lbOp.Text = "Opacidade";
            lbOp.SetBounds(216, 100, 120, 20); Controls.Add(lbOp);
            _op = new TrackBar();
            _op.Minimum = 30; _op.Maximum = 100; _op.TickFrequency = 10;
            _op.SetBounds(216, 120, 290, 40);
            _op.ValueChanged += (s, e) => AplicarAoVivo();
            Controls.Add(_op);

            Label lbEsc = new Label(); lbEsc.Text = "Tamanho da letra";
            lbEsc.SetBounds(216, 164, 160, 20); Controls.Add(lbEsc);
            _esc = new TrackBar();
            _esc.Minimum = 70; _esc.Maximum = 160; _esc.TickFrequency = 10;
            _esc.SetBounds(216, 184, 290, 40);
            _esc.ValueChanged += (s, e) => AplicarAoVivo();
            Controls.Add(_esc);

            Label lbMod = new Label(); lbMod.Text = "Módulos do overlay";
            lbMod.SetBounds(216, 228, 200, 20); Controls.Add(lbMod);
            _mods = new CheckedListBox();
            _mods.CheckOnClick = true;
            foreach (string id in Catalogo.Todos())
                _mods.Items.Add(Catalogo.Descricao(id));
            _mods.SelectedIndexChanged += (s, e) => { /* sem */ };
            _mods.ItemCheck += (s, e) => { BeginInvoke((MethodInvoker)delegate { AplicarAoVivo(); }); };
            _mods.SetBounds(216, 250, 290, 200);
            _mods.BorderStyle = BorderStyle.FixedSingle;
            _mods.BackColor = Color.FromArgb(28, 24, 48);
            _mods.ForeColor = Color.WhiteSmoke;
            Controls.Add(_mods);

            /* --- geral --- */
            Label lbG = new Label(); lbG.Text = "Geral"; lbG.SetBounds(16, 502, 120, 20);
            Controls.Add(lbG);
            _iv = new NumericUpDown();
            _iv.Minimum = 500; _iv.Maximum = 5000; _iv.Increment = 500;
            _iv.SetBounds(16, 524, 180, 26);
            _iv.BackColor = Color.FromArgb(28, 24, 48); _iv.ForeColor = Color.White;
            _iv.BorderStyle = BorderStyle.FixedSingle;
            Controls.Add(_iv);
            Label lbIv = new Label();
            lbIv.Text = "ms entre amostras (500–5000)";
            lbIv.SetBounds(200, 526, 260, 20);
            lbIv.ForeColor = Color.Gray;
            Controls.Add(lbIv);

            CheckBox arranque = new CheckBox();
            arranque.Text = "Arrancar com o Windows";
            arranque.Checked = _c.Arranque;
            arranque.SetBounds(16, 556, 240, 26);
            arranque.ForeColor = Color.WhiteSmoke;
            Controls.Add(arranque);
            arranque.CheckedChanged += (s, e) =>
            {
                _c.Arranque = arranque.Checked;
                Program.MarcarArranque(_c.Arranque);
                _c.Guardar();
            };

            Button guardar = new Button();
            guardar.Text = "Guardar e aplicar";
            guardar.FlatStyle = FlatStyle.Flat;
            guardar.BackColor = Color.FromArgb(139, 92, 246);
            guardar.ForeColor = Color.White;
            guardar.SetBounds(348, 560, 150, 34);
            guardar.Click += (s, e) => { Guardar(); Close(); };
            Controls.Add(guardar);

            CarregarSel();
        }

        private void ListaDesenho(object s, DrawItemEventArgs e)
        {
            bool sel = (e.State & DrawItemState.Selected) != 0;
            using (SolidBrush b = new SolidBrush(
                sel ? Color.FromArgb(56, 42, 88) : Color.FromArgb(14, 12, 24)))
                e.Graphics.FillRectangle(b, e.Bounds);
            if (e.Index >= 0)
            {
                string t = _copia[e.Index].Nome;
                using (SolidBrush f = new SolidBrush(sel ? Color.White : Color.FromArgb(200, 200, 220)))
                    e.Graphics.DrawString(t, Font, f, e.Bounds.X + 6, e.Bounds.Y + 6);
                using (Pen p = new Pen(Color.FromArgb(190, ColorTranslator.FromHtml(_copia[e.Index].Cor))))
                    e.Graphics.FillRectangle(
                        new SolidBrush(ColorTranslator.FromHtml(_copia[e.Index].Cor)),
                        e.Bounds.Right - 24, e.Bounds.Y + 10, 10, 10);
            }
        }

        private OverlayCfg Sel()
        {
            if (_lista.SelectedIndex >= 0 && _lista.SelectedIndex < _copia.Count)
                return _copia[_lista.SelectedIndex];
            return null;
        }

        private void ProximaCor()
        {
            OverlayCfg o = Sel(); if (o == null) return;
            string[] cores = { "#8b5cf6", "#6ee7b7", "#f472b6", "#fbbf24", "#60a5fa", "#f87171" };
            int i = Array.IndexOf(cores, o.Cor);
            o.Cor = cores[(i + 1) % cores.Length];
            CarregarSel(); AplicarAoVivo();
        }

        private void AplicarPreset()
        {
            OverlayCfg o = Sel(); if (o == null) return;
            string k = _preset.SelectedItem == null ? "Gamer" : _preset.SelectedItem.ToString();
            if (Catalogo.Presets.ContainsKey(k))
            {
                o.Modulos = new List<string>(Catalogo.Presets[k]);
                o.Nome = k; CarregarSel(); AplicarAoVivo();
            }
        }

        private void NovoOverlay()
        {
            OverlayCfg n = new OverlayCfg();
            n.Nome = "Overlay " + (_copia.Count + 1);
            _copia.Add(n);
            _lista.Items.Add(n.Nome);
            _lista.SelectedIndex = _lista.Items.Count - 1;
            CarregarSel();
        }

        private void ApagarOverlay()
        {
            if (_lista.SelectedIndex < 0) return;
            int i = _lista.SelectedIndex;
            _copia.RemoveAt(i); _lista.Items.RemoveAt(i);
            if (_lista.Items.Count > 0) _lista.SelectedIndex = Math.Max(0, i - 1);
            CarregarSel();
        }

        private bool _aCarregar = false;

        private void CarregarSel()
        {
            OverlayCfg o = Sel();
            if (o == null) { _nome.Enabled = false; return; }
            _aCarregar = true;
            _nome.Text = o.Nome;
            _op.Value = Math.Max(_op.Minimum, Math.Min(_op.Maximum, (int)(o.Opacidade * 100)));
            _esc.Value = Math.Max(_esc.Minimum, Math.Min(_esc.Maximum, _c.Escala));
            _iv.Value = Math.Max(_iv.Minimum, Math.Min(_iv.Maximum, _c.Intervalo));
            _cor.BackColor = ColorTranslator.FromHtml(o.Cor);
            for (int i = 0; i < _mods.Items.Count; i++)
                _mods.SetItemChecked(i, o.Modulos.Contains(Catalogo.Todos()[i]));
            _aCarregar = false;
            _lista.Invalidate();
        }

        private void AplicarAoVivo()
        {
            if (_aCarregar) return;
            OverlayCfg o = Sel(); if (o == null) return;
            o.Nome = string.IsNullOrEmpty(_nome.Text) ? o.Nome : _nome.Text;
            o.Opacidade = _op.Value / 100.0;
            _c.Escala = _esc.Value;
            _c.Intervalo = (int)_iv.Value;
            o.Modulos = new List<string>();
            for (int i = 0; i < _mods.Items.Count; i++)
                if (_mods.GetItemChecked(i)) o.Modulos.Add(Catalogo.Todos()[i]);
            _lista.Items[_lista.SelectedIndex] = o.Nome;
            Program.Aplicar(_c, _copia);
        }

        private void Guardar()
        {
            AplicarAoVivo();
            _c.Overlays = _copia;
            _c.Guardar();
            /* arranca de novo o desenho das janelas com as cfg novas */
            Program.Aplicar(_c, _copia);
        }
    }

    /* ======================= app context ======================= */
    public class TrayApp : ApplicationContext
    {
        private NotifyIcon _tray;
        private Config _cfg;
        private List<OverlayF> _janelas = new List<OverlayF>();
        private System.Windows.Forms.Timer _timer = new System.Windows.Forms.Timer();
        private int _tick = 0;
        private bool _visivel = true;

        public TrayApp(Config cfg)
        {
            _cfg = cfg;

            /* ícone da bandeja — desenhado à mão (sem ficheiro .ico) */
            using (Bitmap b = new Bitmap(32, 32))
            using (Graphics g = Graphics.FromImage(b))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                using (SolidBrush f = new SolidBrush(Color.FromArgb(139, 92, 246)))
                    g.FillEllipse(f, 2, 2, 28, 28);
                using (SolidBrush w = new SolidBrush(Color.White))
                {
                    g.FillRectangle(w, 14, 8, 4, 12);
                    g.FillRectangle(w, 14, 22, 4, 4);
                }
                _tray = new NotifyIcon();
                _tray.Icon = Icon.FromHandle(b.GetHicon());
            }
            _tray.Text = "InfoAoVivo — overlays do PC";
            _tray.Visible = true;

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new MenuEscuro();
            var miVer = new ToolStripMenuItem("Mostrar / esconder overlays");
            miVer.Click += (s, e) => Alternar();
            menu.Items.Add(miVer);
            var miDef = new ToolStripMenuItem("Definições…");
            miDef.Click += (s, e) => Program.AbrirDefinicoes();
            menu.Items.Add(miDef);
            var miArr = new ToolStripMenuItem("Arrancar com o Windows");
            miArr.Checked = cfg.Arranque;
            miArr.Click += (s, e) =>
            {
                cfg.Arranque = !cfg.Arranque;
                miArr.Checked = cfg.Arranque;
                Program.MarcarArranque(cfg.Arranque);
                cfg.Guardar();
            };
            menu.Items.Add(miArr);
            menu.Items.Add(new ToolStripSeparator());
            var miSair = new ToolStripMenuItem("Sair");
            miSair.Click += (s, e) => Sair();
            menu.Items.Add(miSair);
            _tray.ContextMenuStrip = menu;
            _tray.DoubleClick += (s, e) => Program.AbrirDefinicoes();

             /* janelas por cima de tudo, invisíveis na taskbar */
            foreach (OverlayCfg o in cfg.Overlays)
            {
                o.EscalaGlobal = cfg.Escala;
                _janelas.Add(new OverlayF(o));
            }
            foreach (OverlayF f in _janelas) f.Show();

            _timer.Interval = Math.Max(500, cfg.Intervalo);
            _timer.Tick += (s, e) =>
            {
                try { _tick++; Estado est = Medidor.Ler(_tick);
                    foreach (OverlayF f in _janelas) f.Atualizar(est); }
                catch { }
            };
            _timer.Start();
        }

        public void Alternar()
        {
            _visivel = !_visivel;
            foreach (OverlayF f in _janelas)
            {
                if (_visivel) f.Show(); else f.Hide();
            }
        }

        public void AplicarNova(Config nova, List<OverlayCfg> copia)
        {
            _cfg.Intervalo = nova.Intervalo;
            _cfg.Escala = nova.Escala;
            _timer.Interval = Math.Max(500, _cfg.Intervalo);
            foreach (OverlayCfg o in copia) o.EscalaGlobal = nova.Escala;
            if (_janelas.Count == copia.Count)
            {
                for (int i = 0; i < _janelas.Count; i++)
                    _janelas[i].NovaConfig(copia[i]);
            } else {
                foreach (OverlayF f in _janelas) { f.Close(); }
                _janelas.Clear();
                foreach (OverlayCfg o in copia)
                {
                    OverlayF fo = new OverlayF(o);
                    _janelas.Add(fo); fo.Show();
                }
                _visivel = true;
            }
        }

        public void Sair()
        {
            _timer.Stop();
            foreach (OverlayF f in _janelas)
            {
                try { f.Close(); } catch { }
            }
            _tray.Visible = false;
            _tray.Dispose();
            Application.Exit();
        }
    }

    /* ======================= arranque ======================= */
    public static class Program
    {
        public static Evento olho;

        public delegate void Evento(Config futura, List<OverlayCfg> copia);

        private static Config _cfg = new Config();
        private static TrayApp _app;
        private static Mutex _unico;

        [STAThread]
        public static void Main()
        {
            bool primeiro;
            _unico = new Mutex(true, "InfoAoVivo.InstanciaUnica", out primeiro);
            if (!primeiro) return;
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            _cfg.Carregar();

            _app = new TrayApp(_cfg);
            olho = (nova, copia) => _app.AplicarNova(nova, copia);
            Application.Run(_app);
            _unico.ReleaseMutex();
        }

        /* chamado pelas janelas/definições */
        public static void Salvar()
        {
            _cfg.Guardar();
        }

        public static void AbrirDefinicoes()
        {
            DefinicoesF d = new DefinicoesF(_cfg);
            d.Show();
        }

        public static void Aplicar(Config nova, List<OverlayCfg> copia)
        {
            if (olho != null) olho(nova, copia);
        }

        public static void MarcarArranque(bool on)
        {
            try
            {
                using (RegistryKey k = Registry.CurrentUser.OpenSubKey(
                    @"Software\Microsoft\Windows\CurrentVersion\Run", true))
                {
                    if (k == null) return;
                    if (on) k.SetValue("InfoAoVivo", "\"" + Process.GetCurrentProcess().MainModule.FileName + "\"");
                    else k.DeleteValue("InfoAoVivo", false);
                }
            }
            catch { }
        }
    }
}
