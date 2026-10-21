export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inBack: (t: number) => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  outBack: (t: number) => {
    const s = 1.70158;
    const t1 = t - 1;
    return t1 * t1 * ((s + 1) * t1 + s) + 1;
  },
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

interface Job {
  target?: object;
  t: number;
  dur: number;
  step: (k: number) => void;
  done?: () => void;
  ease: Ease;
}

const jobs: Job[] = [];

export function tween(obj: object, to: Record<string, number>, dur: number, e: Ease = ease.outQuad, done?: () => void): void {
  const from: Record<string, number> = {};
  for (const k in to) from[k] = (obj as any)[k];
  jobs.push({
    target: obj,
    t: 0,
    dur: Math.max(0.001, dur),
    ease: e,
    done,
    step: (k) => {
      for (const key in to) {
        (obj as any)[key] = from[key] + ((to as any)[key] - from[key]) * k;
      }
    },
  });
}

export function cancelTween(obj: object): void {
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (jobs[i].target === obj) jobs.splice(i, 1);
  }
}

export function clearAllTweens(): void {
  jobs.length = 0;
}

export function after(sec: number, fn: () => void): void {
  jobs.push({ t: 0, dur: sec, ease: ease.linear, step: () => {}, done: fn });
}

export function updateTweens(dt: number): void {
  for (let i = jobs.length - 1; i >= 0; i--) {
    const j = jobs[i];
    j.t += dt;
    const k = Math.min(1, j.t / j.dur);
    try {
      j.step(j.ease(k));
    } catch {
      jobs.splice(i, 1);
      continue;
    }
    if (k >= 1) {
      jobs.splice(i, 1);
      j.done?.();
    }
  }
}
