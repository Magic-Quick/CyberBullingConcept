param(
    [string]$Action = "capture",
    [string]$OutFile = "H:\PLBX\CyberBullingConcept\capture_test.png",
    [string]$Query = "",
    [int]$ClickX = 0,
    [int]$ClickY = 0
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Threading;
using System.Diagnostics;
using System.Text;
using System.Windows.Forms;

public class PSCapture {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

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
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;

    public const byte VK_CONTROL = 0x11;
    public const byte VK_F = 0x46;
    public const byte VK_G = 0x47;
    public const byte VK_A = 0x41;
    public const byte VK_V = 0x56;
    public const byte VK_RETURN = 0x0D;
    public const byte VK_BACK = 0x08;
    public const byte VK_ESCAPE = 0x1B;
    public const byte VK_DOWN = 0x28;
    public const uint KEYEVENTF_KEYUP = 0x0002;

    public static void ForceForeground(IntPtr hWnd) {
        IntPtr foreWnd = GetForegroundWindow();
        uint foreThread;
        GetWindowThreadProcessId(foreWnd, out foreThread);
        uint curThread = GetCurrentThreadId();

        AttachThreadInput(curThread, foreThread, true);
        ShowWindow(hWnd, 9); // SW_RESTORE
        ShowWindow(hWnd, 3); // SW_MAXIMIZE
        BringWindowToTop(hWnd);
        SetForegroundWindow(hWnd);
        AttachThreadInput(curThread, foreThread, false);
    }

    public static void ClickAt(int x, int y) {
        SetCursorPos(x, y);
        Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Thread.Sleep(60);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

    public static void SendCtrlG() {
        keybd_event(VK_CONTROL, 0, 0, 0);
        keybd_event(VK_G, 0, 0, 0);
        Thread.Sleep(80);
        keybd_event(VK_G, 0, KEYEVENTF_KEYUP, 0);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
    }

    public static void SendCtrlA() {
        keybd_event(VK_CONTROL, 0, 0, 0);
        keybd_event(VK_A, 0, 0, 0);
        Thread.Sleep(80);
        keybd_event(VK_A, 0, KEYEVENTF_KEYUP, 0);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
    }

    public static void SendCtrlV() {
        keybd_event(VK_CONTROL, 0, 0, 0);
        keybd_event(VK_V, 0, 0, 0);
        Thread.Sleep(80);
        keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
    }

    public static void SendEnter() {
        keybd_event(VK_RETURN, 0, 0, 0);
        Thread.Sleep(80);
        keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0);
    }

    public static void SendDown() {
        keybd_event(VK_DOWN, 0, 0, 0);
        Thread.Sleep(80);
        keybd_event(VK_DOWN, 0, KEYEVENTF_KEYUP, 0);
    }

    public static void Run(string action, string outFile, string query, int clickX, int clickY) {
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenDesktop("Default", 0, false, 0x01FF);
            bool set = SetThreadDesktop(hDesk);
            if (!set) {
                Console.WriteLine("SetThreadDesktop failed: " + Marshal.GetLastWin32Error());
                return;
            }

            IntPtr slackHwnd = IntPtr.Zero;
            EnumWindows((hWnd, lParam) => {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                string pName = "";
                try { pName = Process.GetProcessById((int)pid).ProcessName; } catch {}
                if (pName.ToLower().Contains("slack")) {
                    StringBuilder sb = new StringBuilder(512);
                    GetWindowText(hWnd, sb, 512);
                    string title = sb.ToString();
                    if (title.Contains("Slack")) {
                        slackHwnd = hWnd;
                        return false;
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (action == "capture") {
                if (slackHwnd != IntPtr.Zero) {
                    ForceForeground(slackHwnd);
                    Thread.Sleep(500);
                }
                Bitmap bmp = new Bitmap(2560, 1440);
                using (Graphics g = Graphics.FromImage(bmp)) {
                    g.CopyFromScreen(0, 0, 0, 0, new Size(2560, 1440));
                }
                bmp.Save(outFile, ImageFormat.Png);
                bmp.Dispose();
                Console.WriteLine("Screenshot saved to " + outFile);
            }
            else if (action == "search_and_open_context") {
                if (slackHwnd == IntPtr.Zero) {
                    Console.WriteLine("Slack window not found");
                } else {
                    ForceForeground(slackHwnd);
                    Thread.Sleep(800);

                    // Put query to clipboard
                    Clipboard.SetText(query);
                    Thread.Sleep(200);

                    // Focus search in Slack: Ctrl+G
                    SendCtrlG();
                    Thread.Sleep(600);

                    // Select all in search bar and paste
                    SendCtrlA();
                    Thread.Sleep(150);
                    SendCtrlV();
                    Thread.Sleep(400);

                    // Press Enter to search
                    SendEnter();
                    Thread.Sleep(2500); // wait for results to load

                    // Click on the first search result to jump to it in channel/thread!
                    // If custom clickX/clickY provided, use them, otherwise default to first result card (450, 150)
                    int targetX = (clickX > 0) ? clickX : 450;
                    int targetY = (clickY > 0) ? clickY : 150;
                    ClickAt(targetX, targetY);
                    Thread.Sleep(3000); // wait for channel/thread context to load completely

                    RECT r;
                    GetWindowRect(slackHwnd, out r);
                    int w = r.Right - r.Left;
                    int h = r.Bottom - r.Top;

                    int captureX = Math.Max(0, r.Left);
                    int captureY = Math.Max(0, r.Top);
                    int captureW = Math.Min(w, 2560);
                    int captureH = Math.Min(h, 1440);

                    Bitmap bmp = new Bitmap(captureW, captureH);
                    using (Graphics g = Graphics.FromImage(bmp)) {
                        g.CopyFromScreen(captureX, captureY, 0, 0, new Size(captureW, captureH));
                    }
                    bmp.Save(outFile, ImageFormat.Png);
                    bmp.Dispose();
                    Console.WriteLine("Saved context screenshot to: " + outFile);
                }
            }

            if (hDesk != IntPtr.Zero) CloseDesktop(hDesk);
        });
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
    }
}
"@ -ReferencedAssemblies System.Drawing, System.Windows.Forms

[PSCapture]::Run($Action, $OutFile, $Query, $ClickX, $ClickY)
