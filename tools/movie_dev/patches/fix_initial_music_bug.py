import sys
sys.stdout.reconfigure(encoding='utf-8')

# 1. Update AmbientManager.ts:
with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    amb_code = f.read()

# Enhance unlockAudio to start intro track if no track is active, and add window listeners
unlock_target = """  public unlockAudio(): void {
    if (this._isPaused) return;
    if (this._currentAudio) {
      if (this._currentAudio.paused && this._currentDuckFactor > 0) {
        this._currentAudio.play().catch(() => {});
      }
    } else if (this._currentTrackKey) {
      this.playTrack(this._currentTrackKey, this._currentDuckFactor, 0.4);
    }
  }"""

unlock_replacement = """  public unlockAudio(): void {
    if (this._isPaused) return;
    if (this._currentAudio) {
      if (this._currentAudio.paused && this._currentDuckFactor > 0) {
        this._currentAudio.play().catch(() => {});
      }
    } else if (this._currentTrackKey) {
      this.playTrack(this._currentTrackKey, this._currentDuckFactor, 0.4);
    } else {
      this.playTrack(this.getIntroTrack(), 1.0, 1.5);
    }
  }"""

if unlock_target in amb_code:
    amb_code = amb_code.replace(unlock_target, unlock_replacement, 1)
    print("1. Updated AmbientManager.unlockAudio")
else:
    print("WARNING: unlock_target not found in AmbientManager.ts")

# Add global unlock listeners right after AmbientManager instantiation
listener_target = "export const AmbientManager = new AmbientManagerService();"
listener_replacement = """export const AmbientManager = new AmbientManagerService();

// Global unlock on first user gesture for browser Autoplay policy conformance
if (typeof window !== 'undefined') {
  const unlock = () => {
    AmbientManager.unlockAudio();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}"""

if listener_target in amb_code:
    amb_code = amb_code.replace(listener_target, listener_replacement, 1)
    print("2. Added global window unlock listeners to AmbientManager.ts")
else:
    print("WARNING: listener_target not found in AmbientManager.ts")

with open('repo/src/AmbientManager.ts', 'w', encoding='utf-8') as f:
    f.write(amb_code)

# 2. Update MovieApp.ts:
with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    app_code = f.read()

# A. In goToAct(0): Start intro ambient track immediately instead of null
goto_target = """      // Audio Transition: Switch ambient track BEFORE applying shot cuts and cues
      if (index === 0) {
        this._introAmbientStarted = false;
        if (!shouldPlay) {
          AmbientManager.setPaused(true);
        } else {
          AmbientManager.setPaused(false);
        }
        AmbientManager.playTrack(null, 0.0, crossfadeSec);
      } else {"""

goto_replacement = """      // Audio Transition: Switch ambient track BEFORE applying shot cuts and cues
      if (index === 0) {
        const introTrack = AmbientManager.getIntroTrack();
        if (!shouldPlay) {
          AmbientManager.setPaused(true);
        } else {
          AmbientManager.setPaused(false);
        }
        this._introAmbientStarted = true;
        AmbientManager.playTrack(introTrack, 1.0, crossfadeSec > 0 ? crossfadeSec : 1.5);
      } else {"""

if goto_target in app_code:
    app_code = app_code.replace(goto_target, goto_replacement, 1)
    print("3. Updated goToAct(0) in MovieApp.ts to play intro track immediately")
else:
    print("WARNING: goto_target not found in MovieApp.ts")

# B. In play(): Ensure intro track plays on unpause/play
play_target = """    if (this._currentActIndex === 0) {
      if (this._actTime < INTRO_DISCLAIMER_DURATION) {
        this._introAmbientStarted = false;
        // Во время дисклеймера музыки быть не должно
        AmbientManager.playTrack(null, 0.0, 0.2);
      } else {
        if (!this._introAmbientStarted) {
          this._introAmbientStarted = true;
          AmbientManager.playTrack(this._introProfile.trackKey, 1.0, 1.5);
          const mt = Math.max(0, this._actTime - INTRO_DISCLAIMER_DURATION);
          AmbientManager.seekCurrent(mt);
        } else {
          AmbientManager.resumeCurrent();
        }
        if (this._videoElement) this._videoElement.play().catch(() => {});
      }
    } else {"""

play_replacement = """    if (this._currentActIndex === 0) {
      const introTrack = AmbientManager.getIntroTrack();
      if (!this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== introTrack) {
        this._introAmbientStarted = true;
        AmbientManager.playTrack(introTrack, 1.0, 1.5);
        AmbientManager.seekCurrent(this._actTime);
      } else {
        AmbientManager.resumeCurrent();
      }
      if (this._videoElement) this._videoElement.play().catch(() => {});
    } else {"""

if play_target in app_code:
    app_code = app_code.replace(play_target, play_replacement, 1)
    print("4. Updated play() in MovieApp.ts")
else:
    print("WARNING: play_target not found in MovieApp.ts")

# C. In seekAudio:
seek_target = """      if (clamped < INTRO_DISCLAIMER_DURATION) {
        this._introAmbientStarted = false;
        // Во время дисклеймера музыки быть не должно
        AmbientManager.playTrack(null, 0.0, 0.0);
        if (this._videoElement) {
          this._videoElement.pause();
          this._videoElement.style.opacity = '0';
        }
      } else {
        const mt = clamped - INTRO_DISCLAIMER_DURATION;
        if (!this._introAmbientStarted) {
          this._introAmbientStarted = true;
          if (!this._isPlaying) {
            AmbientManager.setPaused(true);
          }
          AmbientManager.playTrack(this._introProfile.trackKey, 1.0, 0.0);
        }
        AmbientManager.seekCurrent(mt);
        if (this._isPlaying) {
          AmbientManager.resumeCurrent();
          if (this._videoElement) {
            this._videoElement.style.opacity = '1';
            this._videoElement.play().catch(() => {});
          }
        }
      }"""

seek_replacement = """      const introTrack = AmbientManager.getIntroTrack();
      if (!this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== introTrack) {
        this._introAmbientStarted = true;
        AmbientManager.playTrack(introTrack, 1.0, 0.0);
      }
      AmbientManager.seekCurrent(clamped);
      if (this._isPlaying) {
        AmbientManager.resumeCurrent();
        if (this._videoElement && clamped >= 7.5) {
          this._videoElement.style.opacity = '1';
          this._videoElement.play().catch(() => {});
        }
      }"""

if seek_target in app_code:
    app_code = app_code.replace(seek_target, seek_replacement, 1)
    print("5. Updated seekAudio in MovieApp.ts")
else:
    print("WARNING: seek_target not found in MovieApp.ts")

# D. In update(dt): Synchronize currentTime directly with curAudio.currentTime from 0.0s
update_audio_target = """    if (this._currentActIndex === 0) {
      if (this._actTime < INTRO_DISCLAIMER_DURATION) {
        if (this._isPlaying) {
          this._actTime += dt;
        } else {
          AmbientManager.pauseAll();
          if (this._videoElement && !this._videoElement.paused) {
            this._videoElement.pause();
          }
        }
        currentTime = this._actTime;
      } else {
        const curAudio = AmbientManager.getCurrentAudio();
        if (this._isPlaying && curAudio && !curAudio.paused && Number.isFinite(curAudio.currentTime)) {
          currentTime = INTRO_DISCLAIMER_DURATION + curAudio.currentTime;
          this._actTime = currentTime;
        } else if (this._isPlaying) {
          this._actTime += dt;
          currentTime = this._actTime;
        } else {
          currentTime = this._actTime;
        }
      }
    } else {"""

update_audio_replacement = """    if (this._currentActIndex === 0) {
      const curAudio = AmbientManager.getCurrentAudio();
      if (this._isPlaying && curAudio && !curAudio.paused && Number.isFinite(curAudio.currentTime)) {
        currentTime = curAudio.currentTime;
        this._actTime = currentTime;
      } else if (this._isPlaying) {
        this._actTime += dt;
        currentTime = this._actTime;
      } else {
        currentTime = this._actTime;
      }
    } else {"""

if update_audio_target in app_code:
    app_code = app_code.replace(update_audio_target, update_audio_replacement, 1)
    print("6. Updated update(dt) audio sync in MovieApp.ts")
else:
    print("WARNING: update_audio_target not found in MovieApp.ts")

# E. In _updateIntroTimeline: Eliminate music silencing block, and synchronize phases to t
intro_timeline_target = """    const discStart = 0.6;
    const discTypeEnd = 8.8;
    const discHoldEnd = 11.6;
    const discFadeEnd = INTRO_DISCLAIMER_DURATION; // 12.8s

    // During disclaimer (0.0s - 12.8s): strictly NO music!
    if (t < discFadeEnd) {
      if (this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== null) {
        this._introAmbientStarted = false;
        AmbientManager.playTrack(null, 0.0, 0.2);
      }
    }"""

intro_timeline_replacement = """    const discStart = 0.4;
    const discTypeEnd = 5.4;
    const discHoldEnd = 6.8;
    const discFadeEnd = 7.8;

    // Ensure initial music is playing from second 0.0
    if (this._isPlaying && (!this._introAmbientStarted || !AmbientManager.getCurrentAudio() || AmbientManager.getCurrentAudio()?.paused)) {
      this._introAmbientStarted = true;
      AmbientManager.playTrack(profile.trackKey, 1.0, 1.5);
    }"""

if intro_timeline_target in app_code:
    app_code = app_code.replace(intro_timeline_target, intro_timeline_replacement, 1)
    print("7. Updated disclaimer timing and music play in _updateIntroTimeline")
else:
    print("WARNING: intro_timeline_target not found in MovieApp.ts")

# F. In _updateIntroTimeline: Ensure mt = t, and remove mt subtraction
mt_target = "      const mt = t - discFadeEnd; // Music time from 0.0s!"
mt_replacement = "      const mt = t; // Continuous music timeline from 0.0s!"

if mt_target in app_code:
    app_code = app_code.replace(mt_target, mt_replacement, 1)
    print("8. Updated mt to t in _updateIntroTimeline")
else:
    print("WARNING: mt_target not found in MovieApp.ts")

# G. In actDuration calculation for Act 0:
dur_target = "this._actDuration = INTRO_DISCLAIMER_DURATION + this._introProfile.introEndTime;"
dur_replacement = "this._actDuration = this._introProfile.introEndTime;"
app_code = app_code.replace(dur_target, dur_replacement)

dur_target2 = "if (this._currentActIndex === 0) this._actDuration = INTRO_DISCLAIMER_DURATION + p.introEndTime;"
dur_replacement2 = "if (this._currentActIndex === 0) this._actDuration = p.introEndTime;"
app_code = app_code.replace(dur_target2, dur_replacement2)

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(app_code)

print("All fixes applied successfully!")
