import plbx from '@playbox-ai/playable-kit/sdk';

export interface ClickTrackerOptions {
  redirectAfterClicks: number;
  onClick?: (count: number) => void;
}

export class ClickTracker {
  static count = 0;
  private static _opts: ClickTrackerOptions | null = null;
  private static _redirected = false;
  private static _handler: ((e: PointerEvent) => void) | null = null;
  private static _pending = 0;
  private static _excluded = false;

  static start(opts: ClickTrackerOptions): void {
    ClickTracker.reset();
    ClickTracker._opts = opts;
    ClickTracker._handler = () => {
      ClickTracker._excluded = false;
      if (ClickTracker._pending) clearTimeout(ClickTracker._pending);
      ClickTracker._pending = window.setTimeout(() => {
        ClickTracker._pending = 0;
        if (ClickTracker._excluded) return;
        ClickTracker.count++;
        try { plbx.tap(); } catch {}
        ClickTracker._opts?.onClick?.(ClickTracker.count);
        const limit = ClickTracker._opts?.redirectAfterClicks ?? 0;
        if (limit > 0 && ClickTracker.count >= limit && !ClickTracker._redirected) {
          ClickTracker._redirected = true;
          try { plbx.download(); } catch {}
        }
      }, 0);
    };
    window.addEventListener('pointerdown', ClickTracker._handler, { capture: true, passive: true });
  }

  static exclude(): void {
    ClickTracker._excluded = true;
  }

  static reset(): void {
    if (ClickTracker._handler) {
      window.removeEventListener('pointerdown', ClickTracker._handler, { capture: true });
      ClickTracker._handler = null;
    }
    if (ClickTracker._pending) {
      clearTimeout(ClickTracker._pending);
      ClickTracker._pending = 0;
    }
    ClickTracker.count = 0;
    ClickTracker._redirected = false;
    ClickTracker._excluded = false;
  }
}
