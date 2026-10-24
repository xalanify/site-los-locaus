using System;
using System.Windows.Forms;
using System.Drawing;
using System.IO;

namespace LOCAUS_PC
{
    public class MainForm : Form
    {
        private WebBrowser wb;

        public MainForm()
        {
            Text = "LOCAUS PC";
            Size = new Size(520, 360);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(20,20,35);
            FormBorderStyle = FormBorderStyle.SizableToolWindow;

            wb = new WebBrowser();
            wb.Dock = DockStyle.Fill;
            wb.ScriptErrorsSuppressed = true;

            Controls.Add(wb);

            Load += (s, e) =>
            {
                var html = Path.Combine(Application.StartupPath, "app", "index.html");
                if (File.Exists(html)) wb.Url = new Uri("file:///" + html.Replace("\\", "/"));
                else wb.DocumentText = "<html><body style='font-family:Segoe UI;background:#0f0c29;color:#fff;padding:40px;text-align:center'><h1>LOCAUS PC</h1><p>Carregando...</p></body></html>";
            };
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.Run(new MainForm());
        }
    }
}
