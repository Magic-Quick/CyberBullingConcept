from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
    page = browser.new_page(viewport={'width': 1200, 'height': 800})
    page.set_content('<body style="background:#1a1d21;color:#fff;font-family:sans-serif;padding:30px;"><h2>Edge Headless Test</h2><p>Working natively!</p></body>')
    page.screenshot(path='H:/PLBX/CyberBullingConcept/test_edge.png')
    browser.close()
    print('Edge screenshot created successfully!')
