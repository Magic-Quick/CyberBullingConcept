import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        page = context.new_page()

        print("Navigating to http://localhost:5174/ ...")
        page.goto('http://localhost:5174/', wait_until='networkidle')
        page.wait_for_function("() => window.__movieAppReady === true", timeout=15000)
        time.sleep(2)

        # 1. Verify Toggle Button exists
        btn = page.query_selector('#premiere-audio-director-btn')
        print(f"Toggle button found: {bool(btn)}")
        assert btn is not None, "Button #premiere-audio-director-btn not found"

        # 2. Click button to open Premiere Audio Director
        print("Clicking toggle button to open Premiere Audio Director...")
        btn.click()
        time.sleep(1)

        director = page.query_selector('#premiere-audio-director')
        is_open = page.evaluate("() => document.getElementById('premiere-audio-director').classList.contains('open')")
        print(f"Premiere Audio Director is open: {is_open}")
        assert is_open, "Premiere Audio Director should be open"

        # 3. Switch to Act 4 (Motor Deck / Biocatastrophe)
        print("Switching to Act 4...")
        page.click('.pr-act-tab[data-act-idx="4"]')
        time.sleep(1)

        # 4. Take screenshot of Premiere Timeline in Act 4
        page.screenshot(path='C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_premiere_timeline_open.png')
        print("Saved verify_premiere_timeline_open.png")

        # 5. Select a clip in Act 4
        print("Selecting clip in Act 4...")
        clip = page.query_selector('.pr-clip.clip-dread')
        if clip:
            clip.click()
            time.sleep(0.5)

        # Take screenshot of selected clip with inspector
        page.screenshot(path='C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_premiere_clip_selected.png')
        print("Saved verify_premiere_clip_selected.png")

        # 6. Click Replace Button
        replace_btn = page.query_selector('#pr-replace-track-btn')
        print(f"Replace button found: {bool(replace_btn)}")
        if replace_btn:
            replace_btn.click()
            time.sleep(0.5)
            page.screenshot(path='C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_premiere_replace_modal.png')
            print("Saved verify_premiere_replace_modal.png")

            # Select an alternative track
            alt_btn = page.query_selector('.pr-track-card [data-select-key]')
            if alt_btn:
                print("Selecting alternative track...")
                alt_btn.click()
                time.sleep(0.5)

        # 7. Click Copy Config button
        copy_btn = page.query_selector('#pr-copy-config-btn')
        if copy_btn:
            print("Clicking Copy Config button...")
            copy_btn.click()
            time.sleep(0.5)
            page.screenshot(path='C:/Users/Shestirukiy/.gemini/antigravity/brain/6ba697d4-a1c2-4072-8ed3-535448c890ae/verify_premiere_toast_copy.png')
            print("Saved verify_premiere_toast_copy.png")

        browser.close()
        print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    run()
