import json, os, sys, html, re
from playwright.sync_api import sync_playwright

output_dir = r"H:\PLBX\CyberBullingConcept\Slack_Screenshots"
os.makedirs(output_dir, exist_ok=True)

# Exact thread messages with Egor Tkachev about battle cow
cow_thread = {
    "channel": "gamegears_general",
    "messages": [
        {
            "user_name": "Эдик Левин",
            "user_color": "#36C5F0",
            "time": "1 окт в 17:15",
            "text": "выбираем простые решения, которые хорошо выглядят, без лишнего усложнения 😅",
            "is_target": False
        },
        {
            "user_name": "Артём Хухро",
            "user_color": "#611f69",
            "time": "1 окт в 17:18",
            "text": "я б поиграл в то, как корова роботизированная летает над городом пришельцев и забирает их лучом притягивающим из вымени на переработку",
            "is_target": False
        },
        {
            "user_name": "Егор Ткачёв",
            "user_color": "#de425b",
            "time": "1 окт в 17:21",
            "text": "@Артём Хухро летает и из вымени стреляет лазером и уничтожает города.",
            "is_target": True
        },
        {
            "user_name": "Артём Хухро",
            "user_color": "#611f69",
            "time": "1 окт в 17:23",
            "text": "@Егор Ткачёв Артем Хухро летает и стреляет из вымени лазером - это определенно еще круче звучит. Я в деле",
            "is_target": False
        },
        {
            "user_name": "Эдик Левин",
            "user_color": "#36C5F0",
            "time": "1 окт в 17:25",
            "text": "Артем слишком буквально принял мою просьбу 😅",
            "is_target": False
        }
    ]
}

known_names = [
    "Эдик Левин", "Артём Хухро", "Егор Ткачёв"
]

def format_text(text):
    t = html.escape(text)
    for name in sorted(known_names, key=len, reverse=True):
        t = t.replace(f"@{name}", f'<span class="slack-mention">@{name}</span>')
    return t

def generate_html(data):
    messages_html = ""
    for m in data['messages']:
        is_target = m.get('is_target', False)
        user_name = m['user_name']
        user_color = m.get('user_color', '#611f69')
        initials = "".join([part[0] for part in user_name.split()[:2]]).upper()
        time_str = m['time']
        body = format_text(m['text'])
        
        target_class = " target-message" if is_target else ""
        
        messages_html += f"""
        <div class="message-row{target_class}">
            <div class="avatar" style="background-color: {user_color};">{initials}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="user-name">{user_name}</span>
                    <span class="message-time">{time_str}</span>
                </div>
                <div class="message-body">{body}</div>
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>
    * {{
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }}
    body {{
        background-color: transparent;
        color: #D1D2D3;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 15px;
        line-height: 1.45;
        padding: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
    }}
    .slack-window {{
        width: 880px;
        background: #1A1D21;
        border: 1px solid #2C2D30;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }}
    .messages-container {{
        padding: 8px 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }}
    .message-row {{
        display: flex;
        padding: 8px 18px;
        gap: 12px;
        transition: background 0.1s ease;
    }}
    .message-row:hover {{
        background: #222529;
    }}
    .message-row.target-message {{
        background: rgba(236, 178, 46, 0.09);
        border-left: 4px solid #ECB22E;
        padding-left: 14px;
    }}
    .avatar {{
        width: 36px;
        height: 36px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
    }}
    .message-content {{
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        overflow: hidden;
    }}
    .message-header {{
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 2px;
    }}
    .user-name {{
        font-size: 15px;
        font-weight: 700;
        color: #FFFFFF;
    }}
    .message-time {{
        font-size: 12px;
        color: #ABABAD;
    }}
    .message-body {{
        font-size: 15px;
        color: #D1D2D3;
        word-break: break-word;
    }}
    .slack-mention {{
        background: rgba(29, 155, 209, 0.2);
        color: #1D9BD1;
        padding: 0 4px;
        border-radius: 3px;
        font-weight: 600;
    }}
</style>
</head>
<body>
<div class="slack-window">
    <div class="messages-container">
        {messages_html}
    </div>
</div>
</body>
</html>
"""
    return html_content

def main():
    print("Rendering cow laser thread screenshot...")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless=True)
        page = browser.new_page(viewport={"width": 960, "height": 600}, device_scale_factor=2)
        
        html_content = generate_html(cow_thread)
        tmp_html = r"H:\PLBX\CyberBullingConcept\tmp_cow.html"
        with open(tmp_html, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        page.goto(f"file:///{tmp_html.replace(chr(92), '/')}")
        slack_window = page.locator(".slack-window")
        
        out1 = os.path.join(output_dir, "07_cow_laser.png").replace("\\", "/")
        out2 = os.path.join(output_dir, "cow_laser_tkachev_thread.png").replace("\\", "/")
        
        slack_window.screenshot(path=out1)
        slack_window.screenshot(path=out2)
        
        try:
            os.remove(tmp_html)
        except Exception:
            pass
            
        print(f"Saved: {out1}")
        print(f"Saved: {out2}")
        browser.close()

if __name__ == '__main__':
    main()
