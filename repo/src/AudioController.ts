import plbx from '@playbox-ai/playable-kit/sdk';

export interface AudioControllerOptions {
  onChange: (muted: boolean) => void;
}

export class AudioController {
  private static _containerMuted = false;
  private static _userMuted: boolean | null = null;
  private static _opts: AudioControllerOptions | null = null;
  private static _inited = false;

  static init(opts: AudioControllerOptions): void {
    if (AudioController._inited) return;
    AudioController._inited = true;
    AudioController._opts = opts;

    try {
      AudioController._containerMuted = plbx.is_muted();
      if (!plbx.is_audio()) AudioController._containerMuted = true;
    } catch {
      AudioController._containerMuted = false;
    }

    try {
      plbx.on('mute', (muted: boolean) => {
        AudioController._containerMuted = muted;
        AudioController._userMuted = null;
        AudioController.apply();
      });
    } catch {}

    AudioController.apply();
  }

  static isMuted(): boolean {
    return AudioController._userMuted ?? AudioController._containerMuted;
  }

  static toggle(): boolean {
    const next = !AudioController.isMuted();
    AudioController._userMuted = next;
    AudioController.apply();
    return next;
  }

  static setMuted(muted: boolean): void {
    AudioController._userMuted = muted;
    AudioController.apply();
  }

  private static apply(): void {
    AudioController._opts?.onChange(AudioController.isMuted());
  }
}
