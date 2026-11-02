import json
import re
import urllib.parse
import urllib.request
from typing import Generator, List, Optional, Tuple


def get_channel_videos_and_name(channel_url: str) -> Tuple[str, List[dict]]:
    """Извлекает название канала и список всех доступных видео напрямую из HTML страницы /videos."""
    channel_url = channel_url.rstrip("/")
    if not channel_url.endswith("/videos"):
        channel_url += "/videos"

    # Безопасное кодирование кириллического URL
    parsed = urllib.parse.urlsplit(channel_url)
    encoded_path = urllib.parse.quote(parsed.path, safe="/:@")
    safe_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, encoded_path, parsed.query, parsed.fragment))

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    req = urllib.request.Request(safe_url, headers=headers)
    html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")

    # Имя канала
    channel_name = "youtube_channel"
    title_m = re.search(r"<title>(.*?)</title>", html)
    if title_m:
        raw_t = title_m.group(1).replace(" - YouTube", "").strip()
        if raw_t:
            channel_name = raw_t

    # Парсим ytInitialData
    data = None
    data_match = re.search(r"var ytInitialData = ({.*?});</script>", html)
    if not data_match:
        data_match = re.search(r"ytInitialData\s*=\s*({.*?});", html)

    videos = []
    if data_match:
        try:
            data = json.loads(data_match.group(1))
            # Рекурсивный поиск videoRenderer
            def extract_renderers(obj):
                if isinstance(obj, dict):
                    if "videoRenderer" in obj:
                        vr = obj["videoRenderer"]
                        vid = vr.get("videoId")
                        title = ""
                        runs = vr.get("title", {}).get("runs", [])
                        if runs:
                            title = runs[0].get("text", "")
                        elif "accessibility" in vr.get("title", {}):
                            title = vr["title"]["accessibility"]["accessibilityData"]["label"]
                        if vid:
                            videos.append({"videoId": vid, "title": title})
                    for v in obj.values():
                        extract_renderers(v)
                elif isinstance(obj, list):
                    for item in obj:
                        extract_renderers(item)

            extract_renderers(data)
        except Exception as e:
            print("Ошибка парсинга JSON страницы канала:", e)

    # Если через json не нашлось, fallback на регулярки
    if not videos:
        vids = list(dict.fromkeys(re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)))
        for vid in vids:
            videos.append({"videoId": vid, "title": f"video_{vid}"})

    # Убираем дубликаты
    seen = set()
    unique_videos = []
    for v in videos:
        if v["videoId"] not in seen:
            seen.add(v["videoId"])
            unique_videos.append(v)

    return channel_name, unique_videos
