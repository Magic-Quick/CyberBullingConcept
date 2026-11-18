import type { Clip, TimeRef } from './model';

export type RangeEditMode = 'move' | 'left' | 'right';
const AUDIO = new Set(['audio', 'voice', 'sfx']);
const rounded = (value: number) => Math.round(value * 1000) / 1000;

/** Keep relative word/utterance anchors when an author drags a clip. */
export function offsetReference(ref: TimeRef, delta: number): TimeRef {
  return { ...ref, offset: rounded(ref.offset + delta) };
}

/** Non-destructive edits never stretch spoken audio or expose negative source time. */
export function editClipRange(original: Clip, range: { start: number; end: number }, mode: RangeEditMode, delta: number, sourceDuration?: number | null): Clip {
  const clip: Clip = JSON.parse(JSON.stringify(original));
  const oldLength = Math.max(0, range.end - range.start);
  if (!Number.isFinite(delta)) return clip;
  if (mode === 'move') {
    const offset = Math.max(-range.start, delta);
    clip.start = offsetReference(clip.start, offset);
    if (clip.end) clip.end = offsetReference(clip.end, offset);
    return clip;
  }
  if (clip.kind === 'interactive' || oldLength <= 0) return clip;
  const audio = AUDIO.has(clip.kind), sourceIn = clip.sourceIn || 0;
  if (mode === 'left') {
    const offset = Math.max(-range.start, audio ? -sourceIn : -Infinity, Math.min(delta, oldLength - .02));
    clip.start = offsetReference(clip.start, offset);
    const length = rounded(Math.max(.02, oldLength - offset));
    if (!clip.end || audio) clip.duration = length;
    if (audio) {
      clip.sourceIn = rounded(sourceIn + offset);
      if (!clip.loop) clip.sourceOut = rounded(sourceIn + oldLength);
    }
    return clip;
  }
  let length = Math.max(.02, oldLength + delta);
  if (audio && !clip.loop && sourceDuration != null) length = Math.min(length, Math.max(0, sourceDuration - sourceIn));
  length = rounded(length);
  if (clip.end) clip.end = offsetReference(clip.end, length - oldLength);
  if (!clip.end || audio) clip.duration = length;
  if (audio && !clip.loop) clip.sourceOut = rounded(sourceIn + length);
  return clip;
}
