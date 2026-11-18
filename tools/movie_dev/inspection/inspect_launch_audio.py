import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})

    console_logs = []
    page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    print("Opening page...")
    page.goto('http://localhost:5174/', wait_until='networkidle')
    page.wait_for_function("() => window.__movieAppReady === true", timeout=15000)
    time.sleep(2)

    # Click on the canvas to trigger user interaction
    print("Clicking canvas to trigger user interaction...")
    page.mouse.click(640, 360)
    time.sleep(3)

    audio_status = page.evaluate("""() => {
        const app = window.__movieApp;
        const amb = window.__ambientManager;
        const audios = Array.from(document.querySelectorAll('audio')).map(a => ({
            src: a.src,
            paused: a.paused,
            currentTime: a.currentTime,
            volume: a.volume,
            muted: a.muted
        }));
        
        let managerAudios = [];
        if (amb) {
            managerAudios = Array.from(amb._audioCache.entries()).map(([k, a]) => ({
                key: k,
                src: a.src,
                paused: a.paused,
                currentTime: a.currentTime,
                volume: a.volume
            }));
        }

        return {
            actTime: app ? app._actTime : null,
            currentActIndex: app ? app._currentActIndex : null,
            isPlaying: app ? app._isPlaying : null,
            introAmbientStarted: app ? app._introAmbientStarted : null,
            introTrackKey: amb ? amb.getIntroTrack() : null,
            currentTrackKey: amb ? amb.getCurrentTrackKey() : null,
            currentAudio: amb && amb.getCurrentAudio() ? {
                src: amb.getCurrentAudio().src,
                paused: amb.getCurrentAudio().paused,
                currentTime: amb.getCurrentAudio().currentTime,
                volume: amb.getCurrentAudio().volume
            } : null,
            audios,
            managerAudios,
        };
    }""")

    print("Audio status at 5s:")
    for k, v in audio_status.items():
        print(f"  {k}: {v}")

    print("\nRecent console logs:")
    for log in console_logs[-20:]:
        print(" ", log)

    browser.close()
