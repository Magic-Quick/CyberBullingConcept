# -*- coding: utf-8 -*-
import re

with open("repo/src/MovieApp.ts", "r", encoding="utf-8") as f:
    content = f.read()

content_norm = content.replace("\r\n", "\n")

# 1. Add _pendingSeekVoiceTime
p1 = r'(private _voiceAudio:\s*HTMLAudioElement \| null\s*=\s*null;)'
m1 = re.search(p1, content_norm)
assert m1, "p1 not found"
content_norm = content_norm[:m1.end()] + "\n\n  private _pendingSeekVoiceTime: number | null = null;" + content_norm[m1.end():]

# 2. Update onloadedmetadata
p2 = r'(this\._voiceAudio\.onloadedmetadata\s*=\s*\(\)\s*=>\s*\{.*?\n    \};)'
m2 = re.search(p2, content_norm, re.DOTALL)
assert m2, "p2 not found"
repl2 = """this._voiceAudio.onloadedmetadata = () => {
      if (!act.duration && this._voiceAudio && Number.isFinite(this._voiceAudio.duration)) {
        this._actDuration = this._voiceAudio.duration;
        act.duration = this._voiceAudio.duration;
      }
      if (this._pendingSeekVoiceTime !== null && this._voiceAudio) {
        try {
          this._voiceAudio.currentTime = this._pendingSeekVoiceTime;
        } catch {}
        this._pendingSeekVoiceTime = null;
      }
    };"""
content_norm = content_norm[:m2.start()] + repl2 + content_norm[m2.end():]

# 3. Update seekAudio
p3 = r'(if\s*\(this\._voiceAudio\)\s*\{\s*if\s*\(voiceDelay > 0 && clamped < voiceDelay\)\s*\{.*?this\._voiceAudio\.pause\(\);\s*\}\s*\}\s*\})'
m3 = re.search(p3, content_norm, re.DOTALL)
assert m3, "p3 not found"
repl3 = """if (this._voiceAudio) {
        if (voiceDelay > 0 && clamped < voiceDelay) {
          this._voiceAudio.pause();
          if (this._voiceAudio.readyState >= 1) {
            try { this._voiceAudio.currentTime = offset; } catch {}
          } else {
            this._pendingSeekVoiceTime = offset;
          }
        } else {
          const targetVoiceTime = offset + (clamped - voiceDelay);
          if (this._voiceAudio.readyState >= 1) {
            try {
              this._voiceAudio.currentTime = targetVoiceTime;
            } catch {
              this._pendingSeekVoiceTime = targetVoiceTime;
            }
          } else {
            this._pendingSeekVoiceTime = targetVoiceTime;
          }

          if (this._isPlaying) {
            this._voiceAudio.play().catch(() => {});
          } else {
            this._voiceAudio.pause();
          }
        }
      } else {
        const targetVoiceTime = offset + Math.max(0, clamped - voiceDelay);
        this._pendingSeekVoiceTime = targetVoiceTime;
      }"""
content_norm = content_norm[:m3.start()] + repl3 + content_norm[m3.end():]

# 4. Update update() dragging protection
p4 = r'(\} else if \(this\._voiceAudio && Number\.isFinite\(this\._voiceAudio\.currentTime\)\) \{\s*if \(this\._isPlaying\) \{)'
m4 = re.search(p4, content_norm)
assert m4, "p4 not found"
repl4 = """} else if (this._voiceAudio && Number.isFinite(this._voiceAudio.currentTime)) {
        if (this._isTimelineDragging) {
          currentTime = this._actTime;
        } else if (this._isPlaying) {"""
content_norm = content_norm[:m4.start()] + repl4 + content_norm[m4.end():]

with open("repo/src/MovieApp.ts", "w", encoding="utf-8") as f:
    f.write(content_norm.replace("\n", "\r\n"))

print("MovieApp.ts successfully updated with robust seek and dragging protection!")
