import json, os, sys, html, re
from playwright.sync_api import sync_playwright

output_dir = r"H:\PLBX\CyberBullingConcept\Slack_Screenshots"
os.makedirs(output_dir, exist_ok=True)

slices_path = r"H:\PLBX\CyberBullingConcept\data\facts_dataset\all_song_context_slices.json"
if not os.path.exists(slices_path):
    slices_path = r"H:\PLBX\CyberBullingConcept\all_song_context_slices.json"
if not os.path.exists(slices_path):
    slices_path = "all_song_context_slices.json"

with open(slices_path, 'r', encoding='utf-8') as f:
    slices = json.load(f)

# User dictionary
user_map = {
    "U0A2YPS30BW": {"name": "Алексей Горин", "role": "Head of Production", "color": "#E01E5A"},
    "U0B88PMNDD2": {"name": "Эдик Левин", "role": "Creative Lead / Producer", "color": "#36C5F0"},
    "U0ATDATRDN3": {"name": "Ева Аксенова", "role": "Project Manager", "color": "#2EB67D"},
    "U0B36TQSP0E": {"name": "Даниал Искаков", "role": "Playable Developer", "color": "#ECB22E"},
    "U0B10J6BVC5": {"name": "Артём Хухро", "role": "Art Lead / 2D Artist", "color": "#611f69"},
    "U0AVDNDC9LK": {"name": "Александр Ворон", "role": "Creative Producer", "color": "#4A154B"},
    "U0AUYHUA41G": {"name": "Шавкат Шафин", "role": "Developer / Lead", "color": "#1264A3"},
    "U0ATY5Z4ZJQ": {"name": "Иван Коваленко", "role": "Playable Developer", "color": "#2bac76"},
    "U0A2V69K8E6": {"name": "Егор Ткачёв", "role": "Creative Producer", "color": "#de425b"},
    "U0B8BMCF0J1": {"name": "Виктория Фесенко", "role": "2D Artist", "color": "#e55c30"},
    "U0BG8EFJMDX": {"name": "Бексултан Каримтаев", "role": "Playable Developer", "color": "#f28e2b"},
    "U0B437B95PS": {"name": "Дамир", "role": "Developer", "color": "#4e79a7"},
    "U0B48SUU4UX": {"name": "Дамир", "role": "Playable Developer", "color": "#4e79a7"},
    "U0C1VKVA8FR": {"name": "Александр Крамной", "role": "Playable Developer", "color": "#76b7b2"},
    "U_PAVEL": {"name": "Павел Самойленко", "role": "CTO / Tech Lead", "color": "#b07aa1"},
    "U_KRISTIAN": {"name": "Kristian", "role": "AI / ML Engineer", "color": "#ff9da7"},
    "U_KIRILL": {"name": "Кирилл Берёзкин", "role": "Fullstack Developer", "color": "#9c755f"},
    "U_TIMOFEI": {"name": "Netiagin Timofei", "role": "Client (Royal Ark)", "color": "#bab0ab"},
    "U_MAMUSIN": {"name": "Максим Мамусин", "role": "Lead Three.js / Developer", "color": "#edc948"}
}

emojis = {
    ":sweat_smile:": "😅",
    ":relieved:": "😌",
    ":grin:": "😁",
    ":fire:": "🔥",
    ":thinking_face:": "🤔",
    ":cold_sweat:": "😰",
    ":pig:": "🐷",
    ":male_zombie:": "🧟‍♂️",
    ":military_helmet:": "🪖",
    ":100:": "💯",
    ":white_check_mark:": "✅",
    ":wassup:": "🤙",
    ":sob:": "😭",
    ":joy:": "😂",
    ":smile:": "😄"
}

def format_text(text):
    t = html.escape(text)
    
    # Replace Slack mentions with real names
    def mention_replace(match):
        uid = match.group(1)
        if uid in user_map:
            return f'<span class="slack-mention">@{user_map[uid]["name"]}</span>'
        return f'<span class="slack-mention">@{uid}</span>'
    
    t = re.sub(r'&lt;@(U[A-Z0-9_]+)&gt;', mention_replace, t)
    
    # Slack links <http...|text> or <http...>
    t = re.sub(r'&lt;(https?://[^\|&]+)\|([^&]+)&gt;', r'<a class="slack-link" href="\1" target="_blank">\2</a>', t)
    t = re.sub(r'&lt;(https?://[^&]+)&gt;', r'<a class="slack-link" href="\1" target="_blank">\1</a>', t)
    
    # Common emojis
    for k, v in emojis.items():
        t = t.replace(k, v)
        
    # Bold *...*
    t = re.sub(r'\*([^\*]+)\*', r'<strong>\1</strong>', t)
    # Code `...`
    t = re.sub(r'`([^`]+)`', r'<code class="slack-code">\1</code>', t)
    # Newlines
    t = t.replace('\n', '<br>')
    return t

def format_ts(ts):
    try:
        from datetime import datetime
        dt = datetime.fromtimestamp(float(ts))
        months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
        return f"{dt.day} {months[dt.month - 1]} в {dt.strftime('%H:%M')}"
    except Exception:
        return ts

def generate_html(slice_data):
    target = slice_data['target']
    channel = slice_data.get('channel_name', 'general')
    target_ts = slice_data.get('target_ts', '')
    song_line = target.get('song_line', '')
    title = target.get('title', '')
    
    messages_html = ""
    for m in slice_data['messages']:
        is_target = (m.get('ts') == target_ts)
        uid = m.get('user', '')
        u_info = user_map.get(uid, {"name": m.get('author_name', uid), "role": m.get('author_role', ''), "color": m.get('author_color', '#611f69')})
        user_name = u_info['name']
        user_role = u_info['role']
        user_color = u_info['color']
        
        initials = "".join([part[0] for part in user_name.split()[:2]]).upper()
        if not initials:
            initials = "U"
        
        time_str = format_ts(m.get('ts', ''))
        body = format_text(m.get('text', ''))
        
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
        background-color: #1A1D21;
        color: #D1D2D3;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 15px;
        line-height: 1.46668;
        padding: 16px;
        display: flex;
        justify-content: center;
    }}
    .slack-window {{
        width: 800px;
        background: #1A1D21;
        border: 1px solid #2C2D30;
        border-radius: 8px;
        overflow: hidden;
    }}
    .messages-container {{
        padding: 8px 0;
        display: flex;
        flex-direction: column;
    }}
    .message-row {{
        display: flex;
        padding: 8px 20px;
        gap: 12px;
        transition: background 0.1s ease;
    }}
    .message-row:hover {{
        background: #222529;
    }}
    .message-row.target-message {{
        background: rgba(236, 178, 46, 0.08);
        border-left: 4px solid #ECB22E;
        padding-left: 16px;
    }}
    .avatar {{
        width: 38px;
        height: 38px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        font-weight: 700;
        font-size: 14px;
        flex-shrink: 0;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
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
        margin-bottom: 4px;
        flex-wrap: wrap;
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
    .slack-link {{
        color: #1D9BD1;
        text-decoration: none;
    }}
    .slack-link:hover {{
        text-decoration: underline;
    }}
    .slack-code {{
        background: #2C2D30;
        padding: 2px 5px;
        border-radius: 4px;
        font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
        font-size: 13px;
        color: #E01E5A;
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
    print(f"Starting upgraded screenshot generation for {len(slices)} topics...")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless=True)
        page = browser.new_page(viewport={"width": 1000, "height": 900}, device_scale_factor=2)
        
        generated_files = []
        for i, s in enumerate(slices):
            target = s['target']
            tid = target['id']
            html_content = generate_html(s)
            
            tmp_html = f"H:/PLBX/CyberBullingConcept/tmp_{tid}.html"
            with open(tmp_html, "w", encoding="utf-8") as f:
                f.write(html_content)
                
            out_png = os.path.join(output_dir, f"{tid}.png").replace("\\", "/")
            
            page.goto(f"file:///{tmp_html}")
            slack_window = page.locator(".slack-window")
            slack_window.screenshot(path=out_png)
            
            try:
                os.remove(tmp_html)
            except Exception:
                pass
                
            print(f"[{i+1}/{len(slices)}] Created: {out_png}")
            generated_files.append({
                "id": tid,
                "title": target['title'],
                "song_line": target['song_line'],
                "channel": s.get('channel_name', ''),
                "path": out_png
            })
            
        browser.close()
        
    with open(r'H:\PLBX\CyberBullingConcept\generated_screenshots_summary.json', 'w', encoding='utf-8') as f:
        json.dump(generated_files, f, ensure_ascii=False, indent=2)
    print("\nAll upgraded screenshots generated successfully!")

if __name__ == '__main__':
    main()
