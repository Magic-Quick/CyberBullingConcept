using System;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Threading;
using System.Diagnostics;

public class SlackCapture {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public const int SW_RESTORE = 9;
    public const int SW_SHOW = 5;

    public static void Main(string[] args) {
        if (args.Length == 0) {
            Console.WriteLine("Usage: SlackCapture.exe list | capture <output.png> | window <output.png> | nav <url> <delay_sec> <output.png>");
            return;
        }

        string cmd = args[0].ToLower();

        Thread t = new Thread(() => {
            IntPtr hDesk = OpenDesktop("Default", 0, false, 0x01FF);
            if (hDesk == IntPtr.Zero) {
                hDesk = OpenInputDesktop(0, false, 0x01FF);
            }
            if (hDesk == IntPtr.Zero) {
                Console.WriteLine("Failed to open desktop, err=" + Marshal.GetLastWin32Error());
                return;
            }
            bool s = SetThreadDesktop(hDesk);
            if (!s) {
                Console.WriteLine("Failed to set thread desktop, err=" + Marshal.GetLastWin32Error());
            }

            if (cmd == "list") {
                EnumWindows((hWnd, lParam) => {
                    if (IsWindowVisible(hWnd)) {
                        StringBuilder sb = new StringBuilder(512);
                        GetWindowText(hWnd, sb, 512);
                        string title = sb.ToString();
                        uint pid;
                        GetWindowThreadProcessId(hWnd, out pid);
                        RECT r;
                        GetWindowRect(hWnd, out r);
                        int w = r.Right - r.Left;
                        int h = r.Bottom - r.Top;
                        if (w > 50 && h > 50) {
                            string pName = "";
                            try { pName = Process.GetProcessById((int)pid).ProcessName; } catch {}
                            Console.WriteLine(pid + " | " + pName + " | (" + r.Left + "," + r.Top + " " + w + "x" + h + ") | " + title);
                        }
                    }
                    return true;
                }, IntPtr.Zero);
            }
            else if (cmd == "capture") {
                string outFile = args[1];
                CaptureScreen(outFile);
            }
            else if (cmd == "window") {
                string outFile = args[1];
                IntPtr slackHwnd = FindSlackHwnd();
                if (slackHwnd != IntPtr.Zero) {
                    ShowWindow(slackHwnd, SW_RESTORE);
                    SetForegroundWindow(slackHwnd);
                    Thread.Sleep(500);
                    RECT r;
                    GetWindowRect(slackHwnd, out r);
                    int w = r.Right - r.Left;
                    int h = r.Bottom - r.Top;
                    CaptureRect(r.Left, r.Top, w, h, outFile);
                } else {
                    Console.WriteLine("Slack window not found");
                }
            }
            else if (cmd == "nav") {
                string url = args[1];
                int delay = int.Parse(args[2]);
                string outFile = args[3];

                Process.Start(new ProcessStartInfo {
                    FileName = url,
                    UseShellExecute = true
                });

                Thread.Sleep(delay * 1000);

                IntPtr slackHwnd = FindSlackHwnd();
                if (slackHwnd != IntPtr.Zero) {
                    ShowWindow(slackHwnd, SW_RESTORE);
                    SetForegroundWindow(slackHwnd);
                    Thread.Sleep(800);
                    RECT r;
                    GetWindowRect(slackHwnd, out r);
                    int w = r.Right - r.Left;
                    int h = r.Bottom - r.Top;
                    Console.WriteLine("Slack window rect: " + r.Left + "," + r.Top + " " + w + "x" + h);
                    CaptureRect(r.Left, r.Top, w, h, outFile);
                } else {
                    Console.WriteLine("Slack window not found, capturing full screen");
                    CaptureScreen(outFile);
                }
            }

            CloseDesktop(hDesk);
        });

        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
    }

    public static IntPtr FindSlackHwnd() {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                StringBuilder sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, 512);
                string title = sb.ToString();
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                string pName = "";
                try { pName = Process.GetProcessById((int)pid).ProcessName; } catch {}
                if (pName.ToLower().Contains("slack") || title.ToLower().Contains("slack")) {
                    RECT r;
                    GetWindowRect(hWnd, out r);
                    if (r.Right - r.Left > 200 && r.Bottom - r.Top > 200) {
                        found = hWnd;
                        return false;
                    }
                }
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    public static void CaptureScreen(string filename) {
        try {
            Bitmap bmp = new Bitmap(2560, 1440);
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.CopyFromScreen(0, 0, 0, 0, new Size(2560, 1440));
            }
            bmp.Save(filename, ImageFormat.Png);
            bmp.Dispose();
            Console.WriteLine("Saved: " + filename);
        } catch (Exception ex) {
            Console.WriteLine("CaptureScreen error: " + ex.Message);
        }
    }

    public static void CaptureRect(int x, int y, int w, int h, string filename) {
        try {
            // ensure within virtual screen
            if (w <= 0 || h <= 0) return;
            Bitmap bmp = new Bitmap(w, h);
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.CopyFromScreen(x, y, 0, 0, new Size(w, h));
            }
            bmp.Save(filename, ImageFormat.Png);
            bmp.Dispose();
            Console.WriteLine("Saved: " + filename);
        } catch (Exception ex) {
            Console.WriteLine("CaptureRect error: " + ex.Message);
        }
    }
}
