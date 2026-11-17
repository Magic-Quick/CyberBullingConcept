"""Collect public TV quiz audio, retain provenance, and verify decoding.

Run from the project root: python -X utf8 tools/interactive/collect_tv_quiz_assets.py
Existing downloads are reused; collection is limited to the three listed pages.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import html
import json
import re
import subprocess
import time
from pathlib import Path

import imageio_ffmpeg
import requests

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "media/interactive"
CACHE = ROOT / "scratch/interactive-research-20261115"
PAGES = {
    "pole_chudes": "https://zvukipro.com/teleshow/281-zvuki-iz-teleperedachi-pole-chudes.html",
    "millionaire": "https://zvukipro.com/teleshow/568-zvuki-iz-teleperedachi-kto-hochet-stat-millionerom.html",
    "chgk": "https://zvukipro.com/teleshow/720-zvuki-i-muzyka-iz-teleperedachi-chto-gde-kogda.html",
}
NAMES = {"pole_chudes": "Поле чудес", "millionaire": "Кто хочет стать миллионером?", "chgk": "Что? Где? Когда?"}
# Explicit recommendations; the original source's labels are retained separately.
ROLES = {
    "pole_chudes": {0:"letter_correct",1:"think_60s",2:"wheel_old",3:"theme_old",4:"theme",6:"letter_wrong",8:"win_fanfare",9:"supergame_start",10:"prize_sector",11:"bankrupt",12:"pass_turn",15:"wheel",17:"round_win",18:"wheel_1995",21:"word_wrong",22:"word_wrong_round",24:"transition",27:"time_up",31:"word_correct",33:"spin_host",34:"spin_host_music"},
    "millionaire": {0:"player_intro",1:"closing_theme",2:"question_bed",5:"fifty_fifty",6:"audience",7:"phone_clock",13:"question_start",14:"correct_easy",15:"wrong_easy",16:"question_medium",17:"correct_medium_alt",18:"question_tense",19:"final_answer",20:"correct_medium",21:"next_question",22:"question_hard",23:"wrong_medium",24:"milestone",25:"question_final",26:"wrong_final",28:"victory",29:"rules_bed",31:"lock_answer",32:"phone_dial",33:"phone_countdown",34:"phone_end",35:"time_up",36:"theme_tv_alt",37:"theme",40:"siren",43:"answer_suspense",44:"reveal",45:"lifeline"},
    "chgk": {0:"game_opening",1:"spinner",2:"spinner_clean",3:"black_box",7:"next_question_host",9:"correct_alt",10:"victory",12:"closing",13:"theme_old",14:"theme_2001",15:"theme_logo",20:"gong",21:"gong_alt",22:"gong_other",23:"wrong_1",24:"wrong_2",25:"wrong_3",26:"answer_host",27:"owl_closing",31:"minute_start",32:"warning_signal",33:"minute_end",34:"fanfare",35:"theme_vocal",36:"question_host",37:"correct_1",38:"correct_2",39:"correct_3"},
}
FEATURED = {"pole_chudes":[4,3,15,0,6,31,1,27,8],"millionaire":[37,36,2,16,22,19,14,23,35,5,33],"chgk":[15,35,0,1,3,31,32,33,20,37,23]}


def parse_audio(text: str) -> list[dict]:
    result = []
    for match in re.finditer(r"<!--dle_audio_begin:(.*?)-->", text):
        before = text[:match.start()]
        if before.rstrip().endswith("<br>"):
            label = re.split(r"</(?:div|ul|p)>|<br\s*/?>", before)[-2]
        else:
            label = before[-500:]
        label = re.sub(r"<!--.*?-->", "", label, flags=re.S)
        label = html.unescape(re.sub(r"<[^>]+>", " ", label))
        label = re.sub(r"\s+", " ", label).strip().removeprefix("-->").strip()
        url = match.group(1)
        if not url.startswith("https://zvukipro.com/uploads/files/") or not url.endswith(".mp3"):
            continue
        result.append({"source_index": len(result), "source_label": label, "download_url": url})
    return result


def fetch(item: dict) -> dict:
    item = dict(item)
    path = DEST / item["path"]
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        if not path.exists():
            for attempt in range(3):
                try:
                    response = requests.get(item["download_url"], timeout=(15, 60), headers={"Referer":item["source_page"]})
                    response.raise_for_status()
                    if "text/html" in response.headers.get("Content-Type", ""):
                        raise ValueError("Received an HTML page instead of audio")
                    if len(response.content) < 512:
                        raise ValueError("Audio response is unexpectedly short")
                    path.write_bytes(response.content)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    time.sleep(attempt + 1)
        # A full decode catches truncated or disguised downloads, not just headers.
        decoded = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-i", str(path), "-f", "null", "-"], capture_output=True, text=True, encoding="utf8", errors="replace", timeout=90)
        if decoded.returncode:
            raise ValueError("Audio decode failed: " + decoded.stderr[-300:])
        duration = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", decoded.stderr)
        if not duration:
            raise ValueError("Audio has no readable duration")
        h,m,s = map(float,duration.groups())
        item.update(status="downloaded_verified", duration_seconds=round(h*3600+m*60+s,3), bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), verified="full_ffmpeg_decode")
    except Exception as error:
        item.update(status="failed", error=str(error))
    return item


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    items = []
    for show,url in PAGES.items():
        source = CACHE / (show+".html")
        if not source.exists():
            response = requests.get(url,timeout=45)
            response.raise_for_status()
            response.encoding=response.apparent_encoding
            source.write_text(response.text, encoding="utf8")
        for raw in parse_audio(source.read_text(encoding="utf8")):
            index = raw["source_index"]
            role = ROLES[show].get(index, "extra")
            original_name = raw["download_url"].rsplit("/",1)[-1]
            stem = re.sub(r"^\d+_", "", original_name)[:-4]
            path = f"{show}/audio/{index+1:02d}_{role}_{stem}.mp3"
            items.append(dict(raw, id=f"{show}_{index+1:02d}", show=show, role=role, featured=index in FEATURED[show], source_page=url, path=path, rights_status="third_party_tv_material_no_reuse_license_verified"))
    print(f"Collecting {len(items)} files from three public download pages",flush=True)
    result = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for item in pool.map(fetch, items):
            result.append(item)
            if len(result)%15==0 or item["status"]=="failed":
                print(f"Checked {len(result)}/{len(items)}" + (" FAILED "+item["id"]+": "+item.get("error","") if item["status"]=="failed" else ""),flush=True)
    manifest = {"schema_version":1,"collected_on":"2026-11-15","relative_to":"media/interactive","shows":NAMES,"audio":result,"note":"Cue roles follow source descriptions; full decoding verified. Source labels can be inaccurate. Public download availability is not a confirmed reuse license."}
    (DEST/"audio_manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
    # A JS wrapper also works when the catalogue is opened directly with file://.
    (DEST/"audio_manifest.js").write_text("window.QUIZ_AUDIO = "+json.dumps(manifest,ensure_ascii=False)+";\n",encoding="utf8")
    failed=[x for x in result if x["status"]=="failed"]
    print(json.dumps({"files":len(result),"verified":len(result)-len(failed),"failed":len(failed),"megabytes":round(sum(x.get("bytes",0) for x in result)/1e6,2)},ensure_ascii=False),flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
