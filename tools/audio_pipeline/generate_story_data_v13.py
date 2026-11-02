import json
import re
from pathlib import Path

whisper_file = Path('repo/whisper_transcripts.json')
song_backup_file = Path('repo/song_cues_backup.json')
out_ts_file = Path('repo/src/storyData.ts')

with open(whisper_file, 'r', encoding='utf-8') as f:
    whisper_data = json.load(f)

with open(song_backup_file, 'r', encoding='utf-8') as f:
    song_act_data = json.load(f)

def clean_cues(cues, max_dur=None, offset=0.0):
    cleaned = []
    for c in cues:
        txt = c['text'].strip()
        # Filter hallucinations
        if 'DimaTorzok' in txt or 'Субтитры' in txt or 'Продолжение следует' in txt:
            continue
        start = round(c['start'] - offset, 2)
        end = round(c['end'] - offset, 2)
        if start < 0:
            start = 0.0
        if max_dur and start >= max_dur:
            continue
        if max_dur and end > max_dur:
            end = max_dur
        if end <= start:
            end = start + 1.2
        cleaned.append({
            'start': start,
            'end': end,
            'text': txt
        })

    # Smooth gaps between consecutive cues
    for i in range(len(cleaned)):
        if i + 1 < len(cleaned):
            gap = cleaned[i + 1]['start'] - cleaned[i]['end']
            if 0 < gap < 0.6:
                cleaned[i]['end'] = cleaned[i + 1]['start']
            elif gap < 0:
                cleaned[i]['end'] = cleaned[i + 1]['start']
    return cleaned

# Process acts
prologue_cues = clean_cues(whisper_data['prologue_space'], max_dur=217.78)
act1_cues = clean_cues(whisper_data['act_1_convent'], max_dur=94.35)
act2_cues = clean_cues(whisper_data['act_2_sarcophagus'], max_dur=63.29)
act3_cues = clean_cues(whisper_data['act_3_timemachine'], max_dur=118.10)
act4_cues = clean_cues(whisper_data['act_4_engine'], max_dur=77.87)
act5_cues = clean_cues(whisper_data['act_5_clientarchs'], max_dur=221.41)

# Split act_6_tribunal at 48.8s
tribunal_raw = whisper_data['act_6_tribunal']
punishment_raw = [c for c in tribunal_raw if c['start'] < 48.8]
reward_raw = [c for c in tribunal_raw if c['start'] >= 48.8]

act6_punish_cues = clean_cues(punishment_raw, max_dur=48.8, offset=0.0)
act6_reward_cues = clean_cues(reward_raw, max_dur=53.86, offset=48.8)

act8_outro_cues = clean_cues(whisper_data['act_8_outro'], max_dur=48.61)

STORY_ACTS = [
    {
        "id": "intro_playbox",
        "actNumber": 0,
        "totalActs": 10,
        "category": "intro",
        "badge": "PLAYBOX CINEMATIC",
        "title": "PLAYBOX STUDIOS",
        "subtitle": "Спецпроект «Сыгравший в Ящик»",
        "imageKey": "playbox_skull_logo",
        "audioKey": "ambient_desolate_cry",
        "duration": 44.0,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": [
            {"start": 0.0, "end": 8.0, "text": "STUDIOS"},
            {"start": 8.0, "end": 20.0, "text": "P R E S E N T S"},
            {"start": 20.0, "end": 33.0, "text": "ГЛУБОКИЙ КОСМОС • ДРЕЙФ КОВЧЕГА"},
            {"start": 33.0, "end": 44.0, "text": "ОФЛАЙН ПРОДАКШЕН-КОВЧЕГ «ПЛЕЙБОКС»"}
        ]
    },
    {
        "id": "prologue_space",
        "actNumber": 1,
        "totalActs": 10,
        "category": "prologue",
        "badge": "ПРОЛОГ",
        "title": "ХРОНИКИ БЕЗДНЫ И КОСМИЧЕСКИЙ КОВЧЕГ",
        "subtitle": "Глубокий космос • Офис B- • Запах рыбы в микроволновке",
        "imageKey": "ship_cistam",
        "audioKey": "01_prologue",
        "duration": 217.78,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": prologue_cues
    },
    {
        "id": "act_1_convent",
        "actNumber": 2,
        "totalActs": 10,
        "category": "act",
        "badge": "АКТ 1",
        "title": "ВАРКА ПЛЕЙРИУМА И СТЕНА ТРИДЦАТИ СЕМИ",
        "subtitle": "Священный сосуд • Тап-капкан",
        "imageKey": "castle_computers",
        "audioKey": "02_act1",
        "duration": 94.35,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": act1_cues
    },
    {
        "id": "act_2_sarcophagus",
        "actNumber": 3,
        "totalActs": 10,
        "category": "act",
        "badge": "АКТ 2",
        "title": "ДАНИАЛ: МИННОЕ ПОЛЕ 8 STORY POINTS",
        "subtitle": "Ядерная боеголовка • Акции на два миллиарда",
        "imageKey": "stasis_coffin",
        "audioKey": "03_act2",
        "duration": 63.29,
        "hasDedicatedFrame": True,
        "frameTitle": "ОТСЕК ДАНИАЛА • МИННОЕ ПОЛЕ 8 SP",
        "isKaraoke": False,
        "cues": act2_cues
    },
    {
        "id": "act_3_timemachine",
        "actNumber": 4,
        "totalActs": 10,
        "category": "act",
        "badge": "АКТ 3",
        "title": "ПИТАТЕЛЬНЫЕ ТРУБКИ И МАШИНА ВРЕМЕНИ",
        "subtitle": "Литургии Горина • Хроно-скачок на 2.5 часа",
        "imageKey": "gorin_throne",
        "audioKey": "04_act3",
        "duration": 118.10,
        "hasDedicatedFrame": True,
        "frameTitle": "ОТСЕК РАСПРЕДЕЛЕНИЯ ПИТАТЕЛЬНОГО БУЛЬОНА",
        "isKaraoke": False,
        "cues": act3_cues
    },
    {
        "id": "act_4_engine",
        "actNumber": 5,
        "totalActs": 10,
        "category": "act",
        "badge": "АКТ 4",
        "title": "МОТОРНЫЙ ЦЕХ: МУТАЦИЯ 22 ГБ И ВЕРДИКТ OOPS",
        "subtitle": "346 клонов Кристиана • 240 секунд для Хухро",
        "imageKey": "factory_conveyor",
        "audioKey": "05_act4",
        "duration": 77.87,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": act4_cues
    },
    {
        "id": "act_5_clientarchs",
        "actNumber": 6,
        "totalActs": 10,
        "category": "act",
        "badge": "АКТ 5",
        "title": "ВТОРЖЕНИЕ ПРАВКОНОСЦЕВ: СТЕНА 37",
        "subtitle": "Зинга • Ноги Мэвис • Робо-корова с лазерным выменем",
        "imageKey": "hall_judges",
        "audioKey": "06_act5",
        "duration": 221.41,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": act5_cues
    },
    {
        "id": "act_6_punishment",
        "actNumber": 7,
        "totalActs": 10,
        "category": "awards",
        "badge": "АКТ 6 • НАКАЗАНИЕ",
        "title": "ВЫСШАЯ КАРА: БАГРОВЫЙ ДИЛДОДАЧНИК",
        "subtitle": "Кирилл Берёзкин и Кристиан • Без права на кофе",
        "imageKey": "ai_lord_baton",
        "audioKey": "07_act6",
        "audioOffset": 0.0,
        "duration": 48.8,
        "hasDedicatedFrame": True,
        "frameTitle": "ВЕРХОВНЫЙ ТРИБУНАЛ • ВЫСШАЯ КАРА",
        "isKaraoke": False,
        "cues": act6_punish_cues
    },
    {
        "id": "act_6_reward",
        "actNumber": 8,
        "totalActs": 10,
        "category": "awards",
        "badge": "АКТ 6 • ПООЩРЕНИЕ",
        "title": "ПЕЧЕНЬКА БЛАГОДАТИ И ЭСПРЕССО В ВЕНУ",
        "subtitle": "Михаил Горин • 8 атмосфер под давлением",
        "imageKey": "ai_lord_cookie",
        "audioKey": "07_act6",
        "audioOffset": 48.8,
        "duration": 53.86,
        "hasDedicatedFrame": True,
        "frameTitle": "ВЕРХОВНЫЙ ТРИБУНАЛ • ПЕЧЕНЬКА БЛАГОДАТИ",
        "isKaraoke": False,
        "cues": act6_reward_cues
    },
    {
        "id": "act_7_song",
        "actNumber": 9,
        "totalActs": 10,
        "category": "song",
        "badge": "СУПЕР-ТРЕК • КАРАОКЕ",
        "title": song_act_data["title"],
        "subtitle": song_act_data["subtitle"],
        "imageKey": "ai_lord_singing",
        "audioKey": "servotorization",
        "duration": 222.0,
        "hasDedicatedFrame": True,
        "isKaraoke": True,
        "frameTitle": "ТРАНСЛЯЦИЯ ВАРП-БИТА • КАРАОКЕ ИИ-ЛОРДА",
        "cues": song_act_data["cues"]
    },
    {
        "id": "act_8_outro",
        "actNumber": 10,
        "totalActs": 10,
        "category": "outro",
        "badge": "ФИНАЛ",
        "title": "ЗАКРЫТИЕ СМЕНЫ И ЦИКЛ СЛЕПОГО СТАРТА",
        "subtitle": "Капсулы запечатаны • Найду до чего доебаться",
        "imageKey": "robot_king_hammer",
        "audioKey": "08_act7",
        "duration": 48.61,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": act8_outro_cues
    }
]

ts_content = """export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speakerRole?: string;
  avatarKey?: string;
  slackScreenshotKey?: string;
}

export interface ActData {
  id: string;
  actNumber: number;
  totalActs: number;
  category: 'intro' | 'prologue' | 'act' | 'awards' | 'song' | 'outro';
  badge: string;
  title: string;
  subtitle: string;
  imageKey: string;
  audioKey?: string;
  audioOffset?: number;
  duration: number;
  hasDedicatedFrame: boolean;
  isKaraoke?: boolean;
  frameTitle?: string;
  cues: SubtitleCue[];
}

export const STORY_ACTS: ActData[] = """ + json.dumps(STORY_ACTS, indent=2, ensure_ascii=False) + ";\n"

with open(out_ts_file, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"[SUCCESS] Wrote {len(STORY_ACTS)} acts with updated V13 text and cues to {out_ts_file}")
