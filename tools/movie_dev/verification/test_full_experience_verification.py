import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})

        print("Navigating to http://localhost:5174/...")
        await page.goto("http://localhost:5174/", wait_until="domcontentloaded")
        await asyncio.sleep(2.0)

        # Unlock audio with user pointer event
        await page.evaluate("""() => {
            window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        }""")
        await asyncio.sleep(1.5)

        # 1. Verify Act 0 intro screen & audio
        act0_info = await page.evaluate("""() => {
            const app = window.__movieApp;
            const am = window.__ambientManager;
            const curAudio = am?.getCurrentAudio();
            return {
                actIndex: app?._currentActIndex,
                actTime: app?._actTime,
                isPlaying: app?._isPlaying,
                disclaimerAlpha: app?._introDisclaimerContainer?.alpha,
                linesCount: app?._introDisclaimerLinesContainer?.children?.length,
                audioKey: am?.getCurrentTrackKey(),
                audioPaused: curAudio ? curAudio.paused : true,
                audioVol: curAudio ? curAudio.volume : 0,
            };
        }""")
        print("Act 0 State:", act0_info)
        assert act0_info["disclaimerAlpha"] is not None and act0_info["disclaimerAlpha"] > 0, "Disclaimer container must be visible"
        assert act0_info["linesCount"] > 0, "Disclaimer lines must be rendered"
        assert act0_info["audioPaused"] is False, "Intro audio must be playing"

        # 2. Seek to Act 4 (Biocatastrophe)
        print("\nSeeking to Act 4 (Biocatastrophe)...")
        await page.evaluate("""() => {
            const app = window.__movieApp;
            if (app) {
                app.goToAct(5); // act_4_engine
            }
        }""")
        await asyncio.sleep(1.5)

        # Advance Act 4 time to t=5.0s (where dread_11 starts at 4.5s)
        await page.evaluate("""() => {
            const app = window.__movieApp;
            if (app) {
                app._actTime = 5.0;
                app.update(0.1);
            }
        }""")
        await asyncio.sleep(1.0)

        act4_cue_info = await page.evaluate("""() => {
            const app = window.__movieApp;
            const am = window.__ambientManager;
            const cueAudio = am?.getCueAudio();
            return {
                actIndex: app?._currentActIndex,
                actTime: app?._actTime,
                cueKey: am?.getCueTrackKey(),
                cuePlaying: cueAudio ? !cueAudio.paused : false,
                cueVol: cueAudio ? cueAudio.volume : 0,
            };
        }""")
        print("Act 4 at t=5s (Dread Morlock March):", act4_cue_info)
        assert act4_cue_info["cueKey"] == "dread_11_morlock_war_march_climax_50s", f"Expected dread_11, got {act4_cue_info['cueKey']}"

        # 3. Seek to Act 6 (Tribunal / Catacombs 18:20)
        print("\nSeeking to Act 6 (Tribunal / Catacombs 18:20)...")
        await page.evaluate("""() => {
            const app = window.__movieApp;
            if (app) {
                app.goToAct(7); // act_6_punishment
            }
        }""")
        await asyncio.sleep(1.0)

        # Fast forward in Act 6 to 77.5s (18:20 in movie)
        await page.evaluate("""() => {
            const app = window.__movieApp;
            if (app) {
                app._actTime = 77.5;
                app.update(0.1);
            }
        }""")
        await asyncio.sleep(1.0)

        act6_info = await page.evaluate("""() => {
            const app = window.__movieApp;
            const am = window.__ambientManager;
            const curAudio = am?.getCurrentAudio();
            const cueAudio = am?.getCueAudio();
            const fCues = am?._fadingCues?.length || 0;
            return {
                actIndex: app?._currentActIndex,
                actTime: app?._actTime,
                cueKey: am?.getCueTrackKey(),
                cuePlaying: cueAudio ? !cueAudio.paused : false,
                cueVol: cueAudio ? cueAudio.volume : 0,
                fadingCuesCount: fCues,
            };
        }""")
        print("Act 6 at t=77.5s (18:20):", act6_info)
        assert act6_info["fadingCuesCount"] <= 1, "Must never have multiple clashing fading cues"

        # Take screenshot of Act 6 at 18:20
        await page.screenshot(path="C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_act6_18_20_clean.png")

        print("\nALL VERIFICATIONS PASSED!")
        await browser.close()

asyncio.run(run())
