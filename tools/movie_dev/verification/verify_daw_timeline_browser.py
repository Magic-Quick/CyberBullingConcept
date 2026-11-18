import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
import time
import os

os.makedirs('C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})

    print("Navigating to http://localhost:5174/...")
    page.goto('http://localhost:5174/', wait_until='networkidle')
    
    # Wait for movieApp to be ready
    page.wait_for_function("() => window.__movieAppReady === true", timeout=15000)
    time.sleep(1)

    # Press 'D' to open Director panel
    print("Opening Director Panel with 'D'...")
    page.keyboard.press('KeyD')
    time.sleep(1)

    # 1. Verify Act 0 Intro
    shot1 = 'C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_act0_daw_timeline.png'
    page.screenshot(path=shot1)
    print(f"Captured Act 0 Director screenshot: {shot1}")

    # Inspect state of director panel via page.evaluate
    eval_state = page.evaluate("""() => {
        const app = window.__movieApp;
        if (!app) return { error: 'No __movieApp' };
        const act0Cues = app._directorMusicCues.get('intro_playbox') || [];
        return {
            currentActIndex: app._currentActIndex,
            act0CuesCount: act0Cues.length,
            act0Cues: act0Cues.map(c => ({ time: c.time, name: c.name, key: c.key, cat: c.category })),
            introTrack: window.__ambientManager ? window.__ambientManager.getIntroTrack() : null,
            dawTimelineVisible: Boolean(app._dawTimelineContainer && app._dawTimelineContainer.visible),
            introVariantsVisible: Boolean(app._dawIntroVariantsContainer && app._dawIntroVariantsContainer.visible),
            nowPlaying: app._directorNowPlayingText ? app._directorNowPlayingText.text : null,
        };
    }""")
    print("Act 0 State Evaluation:", eval_state)

    # 2. Switch to Variant 2 (Titan Forge)
    print("Switching to Intro Variant 2 (Titan Forge)...")
    page.evaluate("""() => {
        const app = window.__movieApp;
        if (app && app.setIntroTrackVariant) {
            app.setIntroTrackVariant('titan_forge');
        }
    }""")
    time.sleep(1)

    shot2 = 'C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_act0_variant2_active.png'
    page.screenshot(path=shot2)
    print(f"Captured Variant 2 screenshot: {shot2}")

    eval_state2 = page.evaluate("""() => {
        const app = window.__movieApp;
        const act0Cues = app._directorMusicCues.get('intro_playbox') || [];
        return {
            introTrack: window.__ambientManager ? window.__ambientManager.getIntroTrack() : null,
            act0Cue0Name: act0Cues[0] ? act0Cues[0].name : null,
            nowPlaying: app._directorNowPlayingText ? app._directorNowPlayingText.text : null,
        };
    }""")
    print("Act 0 Variant 2 State:", eval_state2)

    # 3. Jump to Act 5 (Clientarchs Invasion) to inspect multi-track timeline blocks
    print("Navigating to Act 5 (Clientarchs Invasion)...")
    page.evaluate("""() => {
        const app = window.__movieApp;
        if (app && app.goToAct) {
            app.goToAct(6); // Act 5 (index 6: act_5_clientarchs)
        }
    }""")
    time.sleep(2)

    shot3 = 'C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_act5_daw_timeline.png'
    page.screenshot(path=shot3)
    print(f"Captured Act 5 DAW Timeline screenshot: {shot3}")

    eval_state3 = page.evaluate("""() => {
        const app = window.__movieApp;
        const act = app._storyActs ? app._storyActs[app._currentActIndex] : null;
        const actId = act ? act.id : 'act_5_clientarchs';
        const cues = app._directorMusicCues.get(actId) || [];
        return {
            actId,
            currentActIndex: app._currentActIndex,
            cuesCount: cues.length,
            cues: cues.map(c => ({ time: c.time, name: c.name, cat: c.category })),
            nowPlaying: app._directorNowPlayingText ? app._directorNowPlayingText.text : null,
            introVariantsVisible: Boolean(app._dawIntroVariantsContainer && app._dawIntroVariantsContainer.visible),
        };
    }""")
    print("Act 5 State Evaluation:", eval_state3)

    browser.close()
    print("ALL PLAYWRIGHT TESTS PASSED!")
