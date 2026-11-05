import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})

        # Capture console messages
        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        print("Navigating to http://localhost:5174/...")
        await page.goto("http://localhost:5174/", wait_until="networkidle")

        # Simulate user gesture to start playback
        await page.evaluate("""() => {
            window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        }""")

        await asyncio.sleep(2.0)

        # Check Act 0 state at t=2.0s
        act0_state = await page.evaluate("""() => {
            const app = window.__MOVIE_APP__;
            return {
                actIndex: app?._currentActIndex,
                actTime: app?._actTime,
                isPlaying: app?._isPlaying,
                introStarted: app?._introAmbientStarted,
                disclaimerAlpha: app?._introDisclaimerText?.alpha,
                disclaimerText: app?._introDisclaimerText?.text?.substring(0, 50),
                logoAlpha: app?._introLogoContainer?.alpha,
                hasCurAudio: !!window.AmbientManager?.getCurrentAudio(),
                audioPaused: window.AmbientManager?.getCurrentAudio()?.paused,
                audioTime: window.AmbientManager?.getCurrentAudio()?.currentTime,
                curTrackKey: window.AmbientManager?.getCurrentTrackKey(),
                cueKey: window.AmbientManager?.getCueTrackKey(),
            };
        }""")
        print("Act 0 at t=2s:", act0_state)

        # Take screenshot at t=2s
        await page.screenshot(path="C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_intro_t2.png")

        # Advance to t=10s (Logo phase)
        await page.evaluate("""() => {
            const app = window.__MOVIE_APP__;
            if (app) {
                app._actTime = 10.0;
                const audio = window.AmbientManager?.getCurrentAudio();
                if (audio) audio.currentTime = 10.0;
            }
        }""")
        await asyncio.sleep(1.0)
        await page.screenshot(path="C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_intro_t10.png")

        # Advance to t=25s (Stars / Logo drop)
        await page.evaluate("""() => {
            const app = window.__MOVIE_APP__;
            if (app) {
                app._actTime = 25.0;
                const audio = window.AmbientManager?.getCurrentAudio();
                if (audio) audio.currentTime = 25.0;
            }
        }""")
        await asyncio.sleep(1.0)
        await page.screenshot(path="C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_intro_t25.png")

        await browser.close()
        print("Screenshots taken successfully!")

asyncio.run(run())
