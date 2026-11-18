import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
import time

def test_initial_music():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})

        print("Navigating to http://localhost:5174/ ...")
        page.goto('http://localhost:5174/', wait_until='networkidle')
        page.wait_for_function("() => window.__movieAppReady === true", timeout=15000)
        time.sleep(1)

        # Trigger user gesture to unlock Web Audio via window event (without toggling canvas pause)
        print("Dispatching window user gesture to unlock browser audio...")
        page.evaluate("""() => {
            window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        }""")
        time.sleep(2)

        status = page.evaluate("""() => {
            const amb = window.__ambientManager;
            const app = window.__movieApp;
            const curAudio = amb ? amb.getCurrentAudio() : null;
            return {
                actTime: app ? app._actTime : null,
                isPlaying: app ? app._isPlaying : null,
                currentTrackKey: amb ? amb.getCurrentTrackKey() : null,
                audioPaused: curAudio ? curAudio.paused : null,
                audioCurrentTime: curAudio ? curAudio.currentTime : null,
                audioVolume: curAudio ? curAudio.volume : null,
                audioMuted: curAudio ? curAudio.muted : null
            };
        }""")

        print("Initial music status:", status)
        assert status['currentTrackKey'] in ['desolate_cry', 'titan_forge'], f"Expected starting track, got {status['currentTrackKey']}"
        assert status['isPlaying'] is True, f"Expected isPlaying=True, got {status['isPlaying']}"
        assert status['audioPaused'] is False, f"Expected audio to be playing (paused=False), got {status['audioPaused']}"
        assert status['audioVolume'] > 0, f"Expected audio volume > 0, got {status['audioVolume']}"
        print("PASS: Starting music is actively playing from second 0.0!")
        browser.close()

if __name__ == '__main__':
    test_initial_music()
