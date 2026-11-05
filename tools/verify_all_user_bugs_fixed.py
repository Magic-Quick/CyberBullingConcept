import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})

        print("1. Navigating to http://localhost:5174/...")
        await page.goto("http://localhost:5174/", wait_until="domcontentloaded")
        await asyncio.sleep(2.0)

        # Unlock audio with user pointer event
        await page.evaluate("""() => {
            window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        }""")
        await asyncio.sleep(1.0)

        # Open Premiere Audio Director
        await page.evaluate("""() => {
            window.__premiereAudioDirector.open();
        }""")
        await asyncio.sleep(0.5)

        # Take screenshot of Premiere Studio open in Act 0
        await page.screenshot(path="C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_premiere_act0_cuts_and_mutes.png")

        # 1. VERIFY ACT 0 PLAYHEAD PROGRESSION
        print("\n2. Verifying playhead progress in Act 0...")
        pos1 = await page.evaluate("""() => {
            const ph = document.querySelector('#pr-playhead');
            return {
                left: ph ? ph.style.left : null,
                actTime: window.__movieApp?._actTime,
            };
        }""")
        print("Playhead at start:", pos1)

        await asyncio.sleep(2.5)

        pos2 = await page.evaluate("""() => {
            const ph = document.querySelector('#pr-playhead');
            return {
                left: ph ? ph.style.left : null,
                actTime: window.__movieApp?._actTime,
            };
        }""")
        print("Playhead after 2.5s:", pos2)

        p1_val = float(pos1["left"].replace("%", "")) if pos1["left"] else 0
        p2_val = float(pos2["left"].replace("%", "")) if pos2["left"] else 0
        assert p2_val > p1_val, f"Playhead must move with time in Act 0! (p1: {p1_val}%, p2: {p2_val}%)"
        print(f"PLAYHEAD PROGRESSION CONFIRMED: {p1_val:.2f}% -> {p2_val:.2f}%")

        # 2. VERIFY VIDEO / MONTAGE CUTS TRACK (V1)
        print("\n3. Verifying Video / Montage Cuts track (V1)...")
        v1_info = await page.evaluate("""() => {
            const lane = document.querySelector('#pr-lane-video');
            const clips = lane ? Array.from(lane.querySelectorAll('.clip-video')).map(c => c.textContent.trim()) : [];
            const rulerMarks = document.querySelectorAll('.pr-ruler-cut-mark');
            return {
                hasLane: !!lane,
                clipsCount: clips.length,
                rulerMarksCount: rulerMarks.length,
            };
        }""")
        print("V1 Track Info in Act 0:", v1_info)
        assert v1_info["hasLane"], "Video lane must exist"
        assert v1_info["clipsCount"] >= 3, f"Must have at least 3 video cut clips, got {v1_info['clipsCount']}"
        assert v1_info["rulerMarksCount"] >= 3, "Ruler must display cut marks"

        # 3. VERIFY TRACK MUTE TOGGLE
        print("\n4. Verifying Track Mute button...")
        mute_info1 = await page.evaluate("""() => {
            const am = window.__ambientManager;
            const btn = document.querySelector('[data-mute-track="ambient"]');
            const audio = am?.getCurrentAudio();
            return {
                btnExists: !!btn,
                isActiveBefore: btn?.classList.contains('active'),
                isMutedBefore: am?.isCategoryMuted('ambient'),
                volBefore: audio ? audio.volume : null,
            };
        }""")
        print("Mute status before click:", mute_info1)
        assert mute_info1["btnExists"], "Ambient mute button must exist"

        # Click Mute button for Ambient
        await page.click('[data-mute-track="ambient"]')
        await asyncio.sleep(0.5)

        mute_info2 = await page.evaluate("""() => {
            const am = window.__ambientManager;
            const btn = document.querySelector('[data-mute-track="ambient"]');
            const audio = am?.getCurrentAudio();
            return {
                isActiveAfter: btn?.classList.contains('active'),
                isMutedAfter: am?.isCategoryMuted('ambient'),
                volAfter: audio ? audio.volume : null,
            };
        }""")
        print("Mute status after click:", mute_info2)
        assert mute_info2["isMutedAfter"] is True, "Ambient track must be muted"
        assert mute_info2["isActiveAfter"] is True, "Mute button must show active class"
        assert mute_info2["volAfter"] == 0, "Audio volume must be 0 when muted"

        # Click Mute button again to restore
        await page.click('[data-mute-track="ambient"]')
        await asyncio.sleep(0.5)

        # 4. VERIFY INTERACTIVE AMBIENT CLIP & INTRO VARIANT SELECTION (Act 0)
        print("\n5. Verifying Ambient Clip selection & replacement in Act 0...")
        await page.click('#pr-lane-ambient .clip-ambient')
        await asyncio.sleep(0.5)

        insp_info = await page.evaluate("""() => {
            const badge = document.querySelector('.pr-inspector-badge');
            const btn = document.querySelector('#pr-replace-track-btn');
            return {
                badgeText: badge ? badge.textContent.trim() : null,
                hasReplaceBtn: !!btn,
            };
        }""")
        print("Inspector when Ambient selected:", insp_info["hasReplaceBtn"])
        assert insp_info["hasReplaceBtn"] is True, "Replace track button must be present"

        # Click Replace Track button
        await page.click('#pr-replace-track-btn')
        await asyncio.sleep(0.5)

        # Verify replacement modal cards
        modal_info = await page.evaluate("""() => {
            const modal = document.querySelector('#pr-modal-backdrop');
            const cards = Array.from(modal?.querySelectorAll('.pr-track-card') || []).map(c => c.getAttribute('data-track-key'));
            return {
                isOpen: modal?.classList.contains('open'),
                cards: cards,
            };
        }""")
        print("Replacement Modal in Act 0 cards:", modal_info["cards"])
        assert modal_info["isOpen"] is True, "Modal must be open"
        assert "desolate_cry" in modal_info["cards"], "Must offer desolate_cry"
        assert "titan_forge" in modal_info["cards"], "Must offer titan_forge"
        assert len(modal_info["cards"]) == 2, f"Act 0 must offer exactly 2 intro variants, got {modal_info['cards']}"

        # Choose Titan Forge
        await page.click('[data-select-key="titan_forge"]')
        await asyncio.sleep(0.5)

        chosen_intro = await page.evaluate("""() => {
            return window.__ambientManager?.getIntroTrack();
        }""")
        print("Selected intro track variant:", chosen_intro)
        assert chosen_intro == "titan_forge", f"Intro track must switch to titan_forge, got {chosen_intro}"

        # 5. VERIFY STRICT CATEGORY ISOLATION IN ACT 4
        print("\n6. Verifying strict category isolation in Act 4...")
        await page.evaluate("""() => {
            window.__premiereAudioDirector.switchAct(5); // act_4_engine
        }""")
        await asyncio.sleep(0.5)

        # Click a Dread clip in Act 4
        await page.click('#pr-lane-dread .clip-dread')
        await asyncio.sleep(0.5)
        await page.click('#pr-replace-track-btn')
        await asyncio.sleep(0.5)

        dread_modal_info = await page.evaluate("""() => {
            const modal = document.querySelector('#pr-modal-backdrop');
            const cards = Array.from(modal?.querySelectorAll('.pr-track-card') || []).map(c => c.getAttribute('data-track-key'));
            return cards;
        }""")
        print("Modal options for Dread clip count:", len(dread_modal_info))
        for key in dread_modal_info:
            assert not key.startswith("peace_"), f"Dread modal must not contain peace track: {key}"
        await page.click('#pr-modal-close-btn')
        await asyncio.sleep(0.3)

        # Click a Peace clip in Act 4
        await page.click('#pr-lane-peace .clip-peace')
        await asyncio.sleep(0.5)
        await page.click('#pr-replace-track-btn')
        await asyncio.sleep(0.5)

        peace_modal_info = await page.evaluate("""() => {
            const modal = document.querySelector('#pr-modal-backdrop');
            const cards = Array.from(modal?.querySelectorAll('.pr-track-card') || []).map(c => c.getAttribute('data-track-key'));
            return cards;
        }""")
        print("Modal options for Peace clip count:", len(peace_modal_info))
        for key in peace_modal_info:
            assert not key.startswith("dread_") and not key.startswith("braam_"), f"Peace modal must not contain dread track: {key}"
        await page.click('#pr-modal-close-btn')
        await asyncio.sleep(0.3)

        # Take screenshot of Act 4 with V1 cuts, Mute buttons, and interactive clips
        await page.screenshot(path="C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_premiere_act4_complete.png")

        print("\nALL 5 USER REQUIREMENTS THOROUGHLY VERIFIED AND PASSED!")
        await browser.close()

asyncio.run(run())
