with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. seekAudio end
t1 = """          this._bgSprite.alpha = 1.0;

          if (this._videoElement) this._videoElement.style.opacity = '0';

        }

      }

    }

  }"""

r1 = """          this._bgSprite.alpha = 1.0;
          if (this._videoElement) this._videoElement.style.opacity = '0';
        }
      }
    }
    this._isSeeking = false;
  }"""

# 2. isSceneTransition
t2 = "const isSceneTransition = (prevActIndex !== -1 && prevActIndex !== index && index !== 0);"
r2 = "const isSceneTransition = isNaturalTransition && (prevActIndex !== -1 && prevActIndex !== index && index !== 0) && !this._isSeeking && !this._isDraggingTimeline;"

# 3. remove hiding of _debugContainer
t3 = """      this._updateDots();

      if (this._debugContainer) {
       this._debugContainer.visible = false;
     }

      this._updateDebugDisplay();"""

r3 = """      this._updateDots();
      this._updateDebugDisplay();"""

# 4. arrowBtn
t4 = """    arrowBtn.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      this._debugExpanded = !this._debugExpanded;

      this._debugExpandedPanel.visible = this._debugExpanded;

      this._updateDebugDisplay();

      this.resize(this._screenWidth, this._screenHeight);

    });"""

r4 = """    arrowBtn.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      ClickTracker.exclude();
      this.toggleDevAudioDirector();
    });"""

for label, target, repl in [('seek_end', t1, r1), ('goto_wipe', t2, r2), ('hide_debug', t3, r3), ('arrow_btn', t4, r4)]:
    if target in text:
        text = text.replace(target, repl, 1)
        print(f'Applied {label} directly')
    elif target.replace('\n', '\r\n') in text:
        text = text.replace(target.replace('\n', '\r\n'), repl.replace('\n', '\r\n'), 1)
        print(f'Applied {label} with CRLF')
    else:
        print(f'FAILED to find {label}')

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('MovieApp.ts updated!')
