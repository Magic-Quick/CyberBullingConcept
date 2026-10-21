param(
    [string]$Query = "Jnghfdbk",
    [int]$ClickX = 510,
    [int]$ClickY = 195,
    [string]$OutFile = "H:\PLBX\CyberBullingConcept\Slack_Screenshots\01_Gorin_Jnghfdbk_context.png"
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

public class ContextOpener {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

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
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;

    public const byte VK_CONTROL = 0x11;
    public const byte VK_G = 0x47;
    public const byte VK_A = 0x41;
    public const byte VK_V = 0x56;
    public const byte VK_RETURN = 0x0D;
    public const byte VK_ESCAPE = 0x1B;
    public const uint KEYEVENTF_KEYUP = 0x0002;

    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        Thread.Sleep(80);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

    public static void Key(byte k) {
        keybd_event(k, 0, 0, 0);
        Thread.Sleep(50);
        keybd_event(k, 0, KEYEVENTF_KEYUP, 0);
    }

    public static void CtrlKey(byte k) {
        keybd_event(VK_CONTROL, 0, 0, 0);
        keybd_event(k, 0, 0, 0);
        Thread.Sleep(60);
        keybd_event(k, 0, KEYEVENTF_KEYUP, 0);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
    }

    public static void Execute(string query, int clickX, int clickY, string outFile) {
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenDesktop("Default", 0, false, 0x01FF);
            if (hDesk == IntPtr.Zero) hDesk = OpenInputDesktop(0, false, 0x01FF);
            SetThreadDesktop(hDesk);

            IntPtr slackHwnd = IntPtr.Zero;
            EnumWindows((hWnd, lParam) => {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                string pName = "";
                try { pName = Process.GetProcessById((int)pid).ProcessName; } catch {}
                if (pName.ToLower().Contains("slack")) {
                    StringBuilder sb = new StringBuilder(512);
                    GetWindowText(hWnd, sb, 512);
                    if (sb.ToString().Contains("Slack")) {
                        slackHwnd = hWnd;
                        return false;
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (slackHwnd != IntPtr.Zero) {
                IntPtr foreWnd = GetForegroundWindow();
                uint foreThread;
                GetWindowThreadProcessId(foreWnd, out foreThread);
                uint curThread = GetCurrentThreadId();

                AttachThreadInput(curThread, foreThread, true);
                SetWindowPos(slackHwnd, (IntPtr)(-1), 0, 0, 2560, 1440, 0x0040);
                ShowWindow(slackHwnd, 3);
                BringWindowToTop(slackHwnd);
                SetForegroundWindow(slackHwnd);
                SetWindowPos(slackHwnd, (IntPtr)(-2), 0, 0, 2560, 1440, 0x0040);
                AttachThreadInput(curThread, foreThread, false);
                Thread.Sleep(500);

                // Click top search bar directly: (350, 15)
                Click(350, 15);
                Thread.Sleep(300);

                Clipboard.SetText(query);
                Thread.Sleep(100);

                // Ctrl+A, Ctrl+V
                CtrlKey(VK_A);
                Thread.Sleep(80);
                CtrlKey(VK_V);
                Thread.Sleep(200);

                // Enter to search
                Key(VK_RETURN);
                Thread.Sleep(2500); // Wait for results

                // Click on the result card at (clickX, clickY)
                Click(clickX, clickY);
                Thread.Sleep(3500); // Wait for thread/channel to open

                Bitmap bmp = new Bitmap(2560, 1440);
                using (Graphics g = Graphics.FromImage(bmp)) {
                    g.CopyFromScreen(0, 0, 0, 0, new Size(2560, 1440));
                }
                bmp.Save(outFile, ImageFormat.Png);
                bmp.Dispose();
                Console.WriteLine("Context capture complete: " + outFile);
            }
        });
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
    }
}
"@ -ReferencedAssemblies System.Windows.Forms, System.Drawing

[ContextOpener]::Execute($Query, $ClickX, $ClickY, $OutFile)
