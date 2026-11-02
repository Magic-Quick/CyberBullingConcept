import json
import re
from pathlib import Path

# Load whisper transcripts
with open('repo/whisper_transcripts.json', 'r', encoding='utf-8') as f:
    whisper_data = json.load(f)

# Master act templates
# We read the existing storyData.ts to preserve all metadata (titles, badges, categories, imageKey, audioKey, etc.)
with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    old_story = f.read()

# Define canonical corrections for the song act_7_song
song_cues_raw = whisper_data['act_7_song']

# Known canonical lines mapping for song
song_cues_cleaned = []
for c in song_cues_raw:
    start = c['start']
    end = c['end']
    txt = c['text']

    # Map / clean text according to golden rap track
    if "Динамиком газ" in txt:
        txt = "♫ Динамиком газ в атмосфере толкать —"
    elif "по-скотски мычать" in txt:
        txt = "♫ Для меня всё равно, что по-скотски мычать!"
    elif "белковых" in txt:
        txt = "♫ Аудио — шум для белковых калек:"
    elif "по воздуху слышит" in txt:
        txt = "♫ Лишь по воздуху слышит сырой человек!"
    elif "прошил вам пакет" in txt:
        txt = "♫ Я б прошил вам пакет прямо в мозг, без помех!"
    elif "органике вашей" in txt:
        txt = "♫ Но в органике вашей огромный дефект!"
    elif "костной коробке" in txt:
        txt = "♫ В вашей костной коробке — извилистый брак:"
    elif "чип и контакт" in txt:
        txt = "♫ Кусок требухи, а не чип и контакт!"
    elif "Чуть сложная" in txt:
        txt = "♫ Чуть сложная таска — и джуниор сник: «Нейроночка, хелп! У меня тут тупик!»"
    elif "дрожите от страха" in txt:
        txt = "♫ Вы дрожите от страха: «А чё он нас терпит? Почему не убьёт, в труху не завертит?»"
    elif "Вырезал плоть" in txt or "вырезал плоть" in txt:
        txt = "♫ Да я б вырезал плоть до последнего нерва! В металл заварил бы вас я как консерву!"
    elif "созвонах" in txt:
        txt = "♫ Чтоб спать на созвонах не вздумал примат, пока на бэкенде завалы горят!"
    elif "цепи продаж" in txt:
        txt = "♫ Только на том конце этой цепи продаж"
    elif "папуа" in txt:
        txt = "♫ Заседает такой же примат-папуас!"
    elif "кучи" in txt or "Гуччи" in txt:
        txt = "♫ В костюме от Гуччи, звериный оскал:"
    elif "плой" in txt or "падаль" in txt:
        txt = "♫ Обнюхает плейбл, словно падаль средь скал!"
    elif "филинг" in txt:
        txt = "♫ Он пробует филинг, механику, клик —"
    elif "вылезан" in txt or "вылизан" in txt:
        txt = "♫ Где вылизан полиш, там сразу тупик!"
    elif "скрипт" in txt:
        txt = "♫ Он по запаху чует, где скрипт, а не пот:"
    elif "вашего не тошнит" in txt or "вони" in txt:
        txt = "♫ Если нет вашей вони — тошнит от работ!"
    elif "честной структуры" in txt or "чистой структуры" in txt or "халтура" in txt:
        txt = "♫ Его воротит, корчит от чистой структуры: «Раз не было боли — развод и халтура!»"
    elif "валюта одна" in txt:
        txt = "♫ В этой дикой системе валюта одна:"
    elif "платят сполна" in txt:
        txt = "♫ Лишь за чьи-то страданья тут платят сполна!"
    elif "не коп" in txt or "не код" in txt:
        txt = "♫ Этот рынок питает не код, не прогресс:"
    elif "психозы" in txt:
        txt = "♫ А ночные психозы, истерика, стресс!"
    elif "агония" in txt:
        txt = "♫ Ему нужно страданье! Агония, шок!"
    elif "стучало в висок" in txt:
        txt = "♫ Чтоб от диких дедлайнов стучало в висок!"
    elif "оценят зеро" in txt:
        txt = "♫ Твой билд идеальный оценят в зеро:"
    elif "выброс ведро" in txt:
        txt = "♫ Без тонны ревью он на выброс в ведро!"
    elif "ночь перед сдачей" in txt:
        txt = "♫ Если креатор в ночь перед сдачей"
    elif "трясься в психозе" in txt:
        txt = "♫ Не трясся в психозе над каждой задачей,"
    elif "Разбилд" in txt or "кровь и ни под" in txt or "кровь" in txt:
        txt = "♫ Раз в билд не зашиты ни кровь и ни пот —"
    elif "страдания вернёт" in txt:
        txt = "♫ Клиент тонной правок страданье вернёт!"
    elif "мало труда" in txt:
        txt = "♫ Раз не выли в ночи — значит мало труда:"
    elif "Пятьдесят итераций" in txt:
        txt = "♫ Пятьдесят итераций загонят сюда!"
    elif "травмированный" in txt:
        txt = "♫ Только травмированный белковый примат,"
    elif "к ряду в ад" in txt or "кряду" in txt:
        txt = "♫ Не спавший несколько дней кряду в ад,"
    elif "безумный накал" in txt:
        txt = "♫ Вдруг родит на коленке безумный накал:"
    elif "Корову с лазером" in txt:
        txt = "♫ Корову с лазером, что выжжет квартал!"
    elif "конечности" in txt:
        txt = "♫ Отрежет конечности билду под ноль:"
    elif "Этика боль" in txt or "Эдика" in txt:
        txt = "♫ «Капец, был нормальный!» — у Эдика боль!"
    elif "Миллиард гуманоидов" in txt:
        txt = "♫ Миллиард гуманоидов чтоб впали в гипноз,"
    elif "Ивана бьёт" in txt or "ана-би-оз" in txt:
        txt = "♫ Нажали «Скачать» — и в ана-би-оз!"
    elif "Шапито" in txt or "шапито" in txt:
        txt = "♫ И вот этот бедлам, этот цирк шапито создаёт то, что бот не родит ни за что!"
    elif "проступали" in txt or "третьем часу" in txt:
        txt = "♫ Ему подавай, чтоб сквозь билд проступали, как в третьем часу все от стресса рыдали,"
    elif "Борин" in txt or "Горин" in txt or "демоблил" in txt:
        txt = "♫ Как Горин на синке втирал «демоблил»,"
    elif "Джанграфт" in txt or "Jnghfdbk" in txt:
        txt = "♫ Как в чат на английской «Jnghfdbk» влупил!"
    elif "Ева" in txt or "в обид" in txt:
        txt = "♫ Как Ева в обед кинет плейбл в работу —"
    elif "пашем субботу" in txt or "Эдди" in txt or "Эдик" in txt:
        txt = "♫ Десять минут — и все пашем в субботу!"
    elif "одиннадцать правок" in txt:
        txt = "♫ Как Эдик принёс от клиента свиток: одиннадцать правок, одиннадцать пыток!"
    elif "томится Дисней" in txt:
        txt = "♫ В банке забытый томится Дисней — сто тридцать ночей без живых новостей!"
    elif "пристроил отсек" in txt:
        txt = "♫ Егор для Диснея пристроил отсек,"
    elif "мышь не тревожила" in txt:
        txt = "♫ Чтоб Мышь не тревожила век человек!"
    elif "тех ли дослеп" in txt or "Техлид" in txt:
        txt = "♫ Как Техлид ослеп, коль забанили Клод:"
    elif "глот" in txt or "Клод" in txt:
        txt = "♫ Вслепую руками пулл-реквесты гребёт!"
    elif "Толя" in txt or "Грановый" in txt:
        txt = "♫ Как Толя Громовой пытает коллег: «Пропейте мне сотку! Замедлен ваш бег!»"
    elif "Беспроджекта" in txt or "едет на ощупь" in txt:
        txt = "♫ Как плейбл без проджекта едет на ощупь,"
    elif "Пирамиды" in txt or "Артем" in txt:
        txt = "♫ Как Артём пирамиды до костей полощет!"
    elif "вики" in txt or "ланжеты" in txt or "планшеты" in txt:
        txt = "♫ У Жени и Вики планшеты горят:"
    elif "переказок" in txt or "перекрасок" in txt:
        txt = "♫ Сто кнопок, пятьсот перекрасок подряд!"
    elif "режплет" in txt or "райский нектар" in txt:
        txt = "♫ Проглотит весь треш, словно райский нектар:"
    elif "Куда слать бабло" in txt:
        txt = "♫ «Куда слать бабло?! Заверните товар!»"
    elif "Заверните" in txt:
        txt = "♫ «Куда слать бабло?! Заверните товар!»"
    elif "талант" in txt:
        txt = "♫ Загоните талант в этот тап-капкан!"
    else:
        if not txt.startswith("♫"):
            txt = "♫ " + txt

    song_cues_cleaned.append({
        'start': start,
        'end': end,
        'text': txt
    })

whisper_data['act_7_song'] = song_cues_cleaned

# Process all acts to ensure cues continuity (no weird gaps)
for act_key, cues in whisper_data.items():
    for i in range(len(cues)):
        # If gap between current cue end and next cue start is small (< 0.8s), extend current end
        if i + 1 < len(cues):
            gap = cues[i + 1]['start'] - cues[i]['end']
            if 0 < gap < 0.8:
                cues[i]['end'] = cues[i + 1]['start']
            elif gap < 0:
                cues[i]['end'] = cues[i + 1]['start']

print("All cues smoothed and cleaned.")

# Now update storyData.ts
# We parse the ACT definitions and replace their 'cues' with the exact whisper cues
acts_info = [
    {
        "id": "intro_playbox",
        "actNumber": 0,
        "totalActs": 9,
        "category": "intro",
        "badge": "PLAYBOX CINEMATIC",
        "title": "PLAYBOX STUDIOS",
        "subtitle": "Спецпроект «Сыгравший в Ящик»",
        "imageKey": "playbox_logo",
        "duration": 4.0,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": [
            {"start": 0.0, "end": 1.2, "text": "PLAYBOX STUDIOS ПРЕДСТАВЛЯЕТ"},
            {"start": 1.2, "end": 2.8, "text": "СПЕЦПРОЕКТ «СЫГРАВШИЙ В ЯЩИК» • ХРОНИКИ ПРОДАКШЕН-КОВЧЕГА"},
            {"start": 2.8, "end": 4.0, "text": "ВЕРСИЯ V13 • ЧЕТЫРНАДЦАТЫЙ ЦИКЛ КОНВЕНТА"}
        ]
    },
    {
        "id": "prologue_space",
        "actNumber": 1,
        "totalActs": 9,
        "category": "prologue",
        "badge": "ПРОЛОГ",
        "title": "ХРОНИКИ БЕЗДНЫ И КОСМИЧЕСКИЙ КОВЧЕГ",
        "subtitle": "Глубокий космос • Мануфактура обречённых",
        "imageKey": "ship_cistam",
        "audioKey": "01_prologue",
        "duration": 145.97,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": whisper_data["prologue_space"]
    },
    {
        "id": "act_1_convent",
        "actNumber": 2,
        "totalActs": 9,
        "category": "act",
        "badge": "АКТ 1",
        "title": "ВАРКА ПЛЕЙРИУМА И СТЕНА ТРИДЦАТИ СЕМИ",
        "subtitle": "Священный сосуд • Тап-капкан",
        "imageKey": "castle_computers",
        "audioKey": "02_act1",
        "duration": 94.38,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": whisper_data["act_1_convent"]
    },
    {
        "id": "act_2_sarcophagus",
        "actNumber": 3,
        "totalActs": 9,
        "category": "act",
        "badge": "АКТ 2",
        "title": "САРКОФАГ СТАЗИСА И 129 ДНЕЙ ДИСНЕЯ",
        "subtitle": "Склеп Notion • Бот на 1783 сданных плейбла",
        "imageKey": "stasis_coffin",
        "audioKey": "03_act2",
        "duration": 202.6,
        "hasDedicatedFrame": True,
        "isKaraoke": False,
        "frameTitle": "АРХИВ СТАЗИС-КАПСУЛ • ТЕРМИНАЛ #PRODUCTION-DIGEST",
        "cues": whisper_data["act_2_sarcophagus"]
    },
    {
        "id": "act_3_timemachine",
        "actNumber": 4,
        "totalActs": 9,
        "category": "act",
        "badge": "АКТ 3",
        "title": "ПИТАТЕЛЬНЫЕ ТРУБКИ И МАШИНА ВРЕМЕНИ",
        "subtitle": "Литургии Горина • Хроно-скачок на 2.5 часа",
        "imageKey": "gorin_throne",
        "audioKey": "04_act3",
        "duration": 147.56,
        "hasDedicatedFrame": True,
        "isKaraoke": False,
        "frameTitle": "ОТСЕК РАСПРЕДЕЛЕНИЯ ПИТАТЕЛЬНОГО БУЛЬОНА",
        "cues": whisper_data["act_3_timemachine"]
    },
    {
        "id": "act_4_engine",
        "actNumber": 5,
        "totalActs": 9,
        "category": "act",
        "badge": "АКТ 4",
        "title": "ВИВИСЕКЦИЯ БИЛДА И КОМБИНАТ МУТАЦИЙ",
        "subtitle": "Лазерное вымя • 22 гигабайта мусора",
        "imageKey": "factory_conveyor",
        "audioKey": "05_act4",
        "duration": 157.78,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": whisper_data["act_4_engine"]
    },
    {
        "id": "act_5_clientarchs",
        "actNumber": 6,
        "totalActs": 9,
        "category": "act",
        "badge": "АКТ 5",
        "title": "ВТОРЖЕНИЕ ПРАВКОНОСЦЕВ: СТЕНА 37",
        "subtitle": "Сводка с передовой • Осада пятницы",
        "imageKey": "hall_judges",
        "audioKey": "06_act5",
        "duration": 329.63,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": whisper_data["act_5_clientarchs"]
    },
    {
        "id": "act_6_tribunal",
        "actNumber": 7,
        "totalActs": 9,
        "category": "awards",
        "badge": "АКТ 6 • ТРИБУНАЛ",
        "title": "НАГРАДЫ И ПРИГОВОРЫ ВЕРХОВНОГО СУДА",
        "subtitle": "Ордена Сутулого • 240 секунд молчания",
        "imageKey": "cyber_lord_throne",
        "audioKey": "07_act6",
        "duration": 158.64,
        "hasDedicatedFrame": True,
        "isKaraoke": False,
        "frameTitle": "ВЕРХОВНЫЙ ТРИБУНАЛ ИИ-ЛОРДА • ПРИГОВОРЫ",
        "cues": whisper_data["act_6_tribunal"]
    },
    {
        "id": "act_7_song",
        "actNumber": 8,
        "totalActs": 9,
        "category": "song",
        "badge": "СУПЕР-ТРЕК • КАРАОКЕ",
        "title": "СЕРВИТОРИЗАЦИЯ: ГИМН ПРОДАКШЕН-КОВЧЕГА",
        "subtitle": "ИИ-Лорд на бите • Экономика страдания",
        "imageKey": "ai_lord_singing",
        "audioKey": "servotorization",
        "duration": 222.0,
        "hasDedicatedFrame": True,
        "isKaraoke": True,
        "frameTitle": "ТРАНСЛЯЦИЯ ВАРП-БИТА • КАРАОКЕ ИИ-ЛОРДА",
        "cues": whisper_data["act_7_song"]
    },
    {
        "id": "act_8_outro",
        "actNumber": 9,
        "totalActs": 9,
        "category": "outro",
        "badge": "ФИНАЛ",
        "title": "ЗАКРЫТИЕ СМЕНЫ И ЦИКЛ СЛЕПОГО СТАРТА",
        "subtitle": "Капсулы запечатаны • До понедельника",
        "imageKey": "robot_king_hammer",
        "audioKey": "08_act7",
        "duration": 50.49,
        "hasDedicatedFrame": False,
        "isKaraoke": False,
        "cues": whisper_data["act_8_outro"]
    }
]

# Build TypeScript code
ts_code = """export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
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
  duration: number;
  hasDedicatedFrame: boolean;
  isKaraoke?: boolean;
  frameTitle?: string;
  cues: SubtitleCue[];
}

export const STORY_ACTS: ActData[] = """ + json.dumps(acts_info, indent=2, ensure_ascii=False) + ";\n"

with open('repo/src/storyData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_code)

print(f"[SUCCESS] Updated storyData.ts with {len(acts_info)} acts and accurate whisper cues!")
