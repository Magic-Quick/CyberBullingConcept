import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})

    print("Opening page...")
    page.goto('http://localhost:5174/', wait_until='networkidle')
    page.wait_for_function("() => window.__movieAppReady === true", timeout=15000)

    # Fast forward or seek to 14.0s
    print("Seeking to 14.0s (past disclaimer)...")
    res = page.evaluate("""() => {
        const app = window.__movieApp;
        const amb = window.__ambientManager;
        app.seekAudio(14.0);
        return {
            actTime: app._actTime,
            introAmbientStarted: app._introAmbientStarted,
            isPlaying: app._isPlaying,
            currentTrackKey: amb.getCurrentTrackKey(),
            currentAudio: amb.getCurrentAudio() ? {
                src: amb.getCurrentAudio().src,
                paused: amb.getCurrentAudio().paused,
                volume: amb.getCurrentAudio().volume,
                currentTime: amb.getCurrentAudio().currentTime
            } : null
        };
    }""")

    print("State at 14.0s:", res)
    time.sleep(2)

    res2 = page.evaluate("""() => {
        const amb = window.__ambientManager;
        return {
            currentTrackKey: amb.getCurrentTrackKey(),
            currentAudio: amb.getCurrentAudio() ? {
                paused: amb.getCurrentAudio().paused,
                volume: amb.getCurrentAudio().volume,
                currentTime: amb.getCurrentAudio().currentTime
            } : null
        };
    }""")
    print("State after 2s:", res2)

    browser.close()
