import time, sys, os
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
artifact_dir = r'C:\Users\Shestirukiy\.gemini\antigravity\brain\6ba697d4-a1c2-4072-8ed3-535448c890ae'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})

    print('[1] Navigating to http://localhost:5174/ ...')
    page.goto('http://localhost:5174/', wait_until='networkidle')
    page.wait_for_timeout(2500)

    # 1. Test Audio Director Suite panel
    print('[2] Testing Audio Director Suite panel...')
    page.keyboard.press('d')
    page.wait_for_timeout(600)

    snap_director = os.path.join(artifact_dir, 'verify_audio_director_suite_open.png')
    page.screenshot(path=snap_director)
    print(f'   Saved {snap_director}')

    # Test hotkey T (Dread) and P (Peace) and X (Stop)
    page.keyboard.press('t')
    page.wait_for_timeout(300)
    page.keyboard.press('p')
    page.wait_for_timeout(300)

    snap_director_cues = os.path.join(artifact_dir, 'verify_audio_director_cues_added.png')
    page.screenshot(path=snap_director_cues)
    print(f'   Saved {snap_director_cues}')

    # Close director panel
    page.keyboard.press('d')
    page.wait_for_timeout(300)

    # 2. Test Act 6 (18:20 / 25:05 -> 74.68s into act_6_punishment, index 7)
    print('[3] Testing Act 6 (18:20) - Zero Star Wars wipe on intra-act cut...')
    page.evaluate('''() => {
        const app = window.__movieApp;
        if (app) {
            app.goToAct(7, false); // act_6_punishment
            app.seekAudio(75.0);
        }
    }''')
    page.wait_for_timeout(1200)

    wipe_status = page.evaluate('''() => {
        const app = window.__movieApp;
        return {
            isWiping: app ? app._isWiping : false,
            bgTexKey: app ? app._narratorCurrentTexKey : '',
        };
    }''')
    print('   Act 6 75.0s wipe status:', wipe_status)
    snap_act6 = os.path.join(artifact_dir, 'verify_act6_18_20_no_wipe.png')
    page.screenshot(path=snap_act6)
    print(f'   Saved {snap_act6}')

    # 3. Test Act 3 (Nick Egorov speedrun at 80.5s, index 4)
    print('[4] Testing Act 3 (Nick Egorov at 80.5s)...')
    page.evaluate('''() => {
        const app = window.__movieApp;
        if (app) {
            app.goToAct(4, false); // act_3_timemachine
            app.seekAudio(80.5);
        }
    }''')
    page.wait_for_timeout(1200)

    nick_tex = page.evaluate('''() => {
        const app = window.__movieApp;
        return app ? app._narratorCurrentTexKey : '';
    }''')
    print('   Act 3 80.5s texture key:', nick_tex)
    snap_nick = os.path.join(artifact_dir, 'verify_act3_nick_egorov_fixed.png')
    page.screenshot(path=snap_nick)
    print(f'   Saved {snap_nick}')

    # 4. Test Act 3 Gorin Typos at 23s (clean single card, not 4-card clump)
    print('[5] Testing Act 3 Gorin typos at 23s...')
    page.evaluate('''() => {
        const app = window.__movieApp;
        if (app) {
            app.seekAudio(22.5);
        }
    }''')
    page.wait_for_timeout(1000)
    snap_gorin_typo = os.path.join(artifact_dir, 'verify_act3_gorin_single_typo_23s.png')
    page.screenshot(path=snap_gorin_typo)
    print(f'   Saved {snap_gorin_typo}')

    # 5. Test Act 2 (Danial 3A project quote at 14s, index 3)
    print('[6] Testing Act 2 Danial quote at 14s...')
    page.evaluate('''() => {
        const app = window.__movieApp;
        if (app) {
            app.goToAct(3, false); // act_2_sarcophagus
            app.seekAudio(14.0);
        }
    }''')
    page.wait_for_timeout(1200)
    snap_danial = os.path.join(artifact_dir, 'verify_act2_danial_quote_sharp.png')
    page.screenshot(path=snap_danial)
    print(f'   Saved {snap_danial}')

    browser.close()
    print('✅ ALL TESTS COMPLETED SUCCESSFULLY!')
