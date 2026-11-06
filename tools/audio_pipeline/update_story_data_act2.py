# -*- coding: utf-8 -*-
import re

STORY_DATA_PATH = "repo/src/storyData.ts"
SHOTS_PATH = "repo/src/narratorShotSequence.ts"

with open(STORY_DATA_PATH, "r", encoding="utf-8") as f:
    sd_content = f.read()

# Replace Act 2 block in storyData.ts
act2_old_target = """  {
    "id": "act_2_sarcophagus",
    "actNumber": 3,
    "totalActs": 10,
    "category": "act",
    "badge": "АКТ 2",
    "title": "ДАНИАЛ: МИННОЕ ПОЛЕ 8 STORY POINTS",
    "subtitle": "Ядерная боеголовка • Акции на два миллиарда",
    "imageKey": "retro_film_act2_dashboard_altar_crypt_gemini_v1",
    "audioKey": "03_act2",
    "duration": 67.90,
    "voiceDelay": 5.0,
    "hasDedicatedFrame": true,
    "frameTitle": "7-Я ПАЛУБА • СТАЗИС-САРКОФАГИ ДАШБОРДОВ",
    "isKaraoke": false,
    "cues": [
      {
        "start": 5.00,
        "end": 10.20,
        "text": "Скриптор Даниал Искаков в первый же день словил экзистенциальную панику."
      },
      {
        "start": 10.84,
        "end": 19.60,
        "text": "Не над плееблом за 8 СП работаю, а над 3А-проектом, где любая деталь может привести к падению акций на пару миллиардов.",
        "speaker": "Даниал Искаков",
        "speakerRole": "Скриптор-послушник",
        "avatarKey": "avatar_hoodie",
        "slackScreenshotKey": "09_danial_3a_project"
      },
      {
        "start": 20.34,
        "end": 23.98,
        "text": "Архинастоятель Ворон благословил его в чате."
      },
      {
        "start": 23.98,
        "end": 25.66,
        "text": "Как по минному полю?",
        "speaker": "Архинастоятель Ворон",
        "speakerRole": "Creative Producer • Архинастоятель Цитадели",
        "avatarKey": "retro_film_voron_arch_abbot_v7",
        "slackScreenshotKey": "09_voron_minnoe_pole"
      },
      {
        "start": 26.68,
        "end": 32.36,
        "text": "Я сверился с биржевыми кагитаторами и подтверждаю, это буквально минное поле."
      },
      {
        "start": 32.36,
        "end": 40.34,
        "text": "Триллионные бюджеты клиентархов намертво завязаны на копеечный билд за 8 стори-поинтов."
      },
      {
        "start": 40.34,
        "end": 45.58,
        "text": "Стоит в коде Даниала дрогнуть хоть одной детали, мина детонирует на бирже."
      },
      {
        "start": 45.58,
        "end": 54.12,
        "text": "Акции с визгом рушатся на 2 миллиарда, а совет директоров в панике выпрыгивает из зала заседаний прямо в открытый шлюз."
      },
      {
        "start": 54.12,
        "end": 57.58,
        "text": "Тащить ядерную боеголовку через горящий трюм куда спокойнее."
      },
      {
        "start": 57.58,
        "end": 67.90,
        "text": "Боеголовка разнесет всего один наш корабль, а оплошность в 30-секундном клике за 8 SP уничтожает экономику целых галактик."
      }
    ]
  },"""

act2_new_block = """  {
    "id": "act_2_sarcophagus",
    "actNumber": 3,
    "totalActs": 10,
    "category": "act",
    "badge": "АКТ 2",
    "title": "ЦИКЛ 1 И 2 • ТАБЛО ДАШБОРДА, «ДОЛГИЙ ЯЩИК» И САРКОФАГ MINTEGRAL",
    "subtitle": "Бот на 1783 плейбла • 129 дней вечного стазиса Disney",
    "imageKey": "retro_film_act2_dashboard_altar_crypt_gemini_v1",
    "audioKey": "03_act2",
    "duration": 210.00,
    "voiceDelay": 5.0,
    "hasDedicatedFrame": true,
    "frameTitle": "7-Я ПАЛУБА • СТАЗИС-САРКОФАГИ ДАШБОРДОВ",
    "isKaraoke": false,
    "cues": [
      {
        "start": 5.00,
        "end": 10.20,
        "text": "Скриптор Даниал Искаков в первый же день словил экзистенциальную панику."
      },
      {
        "start": 10.84,
        "end": 19.60,
        "text": "Не над плееблом за 8 СП работаю, а над 3А-проектом, где любая деталь может привести к падению акций на пару миллиардов.",
        "speaker": "Даниал Искаков",
        "speakerRole": "Скриптор-послушник",
        "avatarKey": "avatar_hoodie",
        "slackScreenshotKey": "09_danial_3a_project"
      },
      {
        "start": 20.34,
        "end": 23.98,
        "text": "Архинастоятель Ворон благословил его в чате."
      },
      {
        "start": 23.98,
        "end": 25.66,
        "text": "Как по минному полю?",
        "speaker": "Архинастоятель Ворон",
        "speakerRole": "Creative Producer • Архинастоятель Цитадели",
        "avatarKey": "retro_film_voron_arch_abbot_v7",
        "slackScreenshotKey": "09_voron_minnoe_pole"
      },
      {
        "start": 26.68,
        "end": 32.36,
        "text": "Я сверился с биржевыми кагитаторами и подтверждаю, это буквально минное поле."
      },
      {
        "start": 32.36,
        "end": 40.34,
        "text": "Триллионные бюджеты клиентархов намертво завязаны на копеечный билд за 8 стори-поинтов."
      },
      {
        "start": 40.34,
        "end": 45.58,
        "text": "Стоит в коде Даниала дрогнуть хоть одной детали, мина детонирует на бирже."
      },
      {
        "start": 45.58,
        "end": 54.12,
        "text": "Акции с визгом рушатся на 2 миллиарда, а совет директоров в панике выпрыгивает из зала заседаний прямо в открытый шлюз."
      },
      {
        "start": 54.12,
        "end": 57.58,
        "text": "Тащить ядерную боеголовку через горящий трюм куда спокойнее."
      },
      {
        "start": 57.58,
        "end": 67.90,
        "text": "Боеголовка разнесет всего один наш корабль, а оплошность в 30-секундном клике за 8 SP уничтожает экономику целых галактик."
      },
      {
        "start": 68.79,
        "end": 74.91,
        "text": "От такого давления к середине недели закоротило даже наш бортовой бот-счётчик утреннего дайджеста."
      },
      {
        "start": 74.91,
        "end": 83.35,
        "text": "В среду, когда сдача упала в ноль, бот преисполнился экзистенциального тлена: «как вчера, так и сегодня»."
      },
      {
        "start": 83.35,
        "end": 88.79,
        "text": "А в четверг у кремниевой железяки окончательно сорвало крышу, и он выкатил сводку:"
      },
      {
        "start": 88.79,
        "end": 96.43,
        "text": "1783 сданных плейбла. 1783, блядь."
      },
      {
        "start": 96.43,
        "end": 103.51,
        "text": "Мы за ночь в горячечном бреду запечатали три соседние галактики, а пацаны в Слаке даже не заметили."
      },
      {
        "start": 103.51,
        "end": 110.67,
        "text": "И посреди этого хаоса Преподобный Толкователь Воли Клиентархов Егор Ткачёв внёс рацпредложение:"
      },
      {
        "start": 110.67,
        "end": 116.19,
        "text": "«Может нам нужен статус “долгий ящик” для таких плейблов?)»",
        "speaker": "Егор Ткачёв",
        "speakerRole": "Creative Director • Преподобный Толкователь Воли Клиентархов",
        "avatarKey": "avatar_egor",
        "slackScreenshotKey": "03_disney_long_box"
      },
      {
        "start": 116.19,
        "end": 120.27,
        "text": "И Верховный Надзиратель Горин на полном серьёзе ответил:"
      },
      {
        "start": 120.27,
        "end": 129.03,
        "text": "«Надо обсудить, нужен ли отдельный статус, у нас он один такой этот плеебл. Который и не отменяют, и не продолжают».",
        "speaker": "Алексей Горин",
        "speakerRole": "Chief Production Officer • Верховный Надзиратель Конвейера",
        "avatarKey": "avatar_gorin",
        "slackScreenshotKey": "03_disney_long_box"
      },
      {
        "start": 129.03,
        "end": 139.79,
        "text": "Командованию не нужно ничего открывать. Потому что этот «Долгий Ящик» на нашем корабле давно замурован в герметичный саркофаг."
      },
      {
        "start": 139.79,
        "end": 154.71,
        "text": "В катакомбном склепе, вмурованная в переборку между отсеками «В разработке» и «Архив», слабо гудит стазис-колба. Главная зловещая реликвия Ковчега — мумифицированный таск Disney в сетке Mintegral."
      },
      {
        "start": 154.71,
        "end": 166.11,
        "text": "По регламенту капсула плейбла живёт ровно семь дней. Но этот таск заперт в вечном стазисе уже 129 суток при просрочке в 132 дня."
      },
      {
        "start": 166.11,
        "end": 174.27,
        "text": "Сто двадцать девять дней экипаж боится открывать створки саркофага Mintegral, чтобы оттуда не пахнуло протухшим ТЗ."
      },
      {
        "start": 174.27,
        "end": 183.83,
        "text": "В зеленоватой жиже покачивается полуистлевшее существо Дома Мыши: в почерневших белых перчатках и с облезлыми круглыми ушами."
      },
      {
        "start": 183.83,
        "end": 192.51,
        "text": "Оно тихо скребётся когтями изнутри о толстый кварц и раз в сутки сквозь шипение хрипит обрывок лицензионного соглашения."
      },
      {
        "start": 192.51,
        "end": 199.35,
        "text": "Оно не может умереть — карточку в Notion никто не закрыл. И не может считаться живым — правок нет четыре месяца."
      },
      {
        "start": 199.35,
        "end": 209.50,
        "text": "Сто двадцать девять дней анабиоза ради незакрытой ячейки в базе. Бюрократия Ковчега не знает пощады."
      }
    ]
  },"""

# Normalize line endings
sd_content_norm = sd_content.replace("\r\n", "\n")
act2_old_target_norm = act2_old_target.replace("\r\n", "\n")

if act2_old_target_norm in sd_content_norm:
    sd_content_norm = sd_content_norm.replace(act2_old_target_norm, act2_new_block.replace("\r\n", "\n"))
    with open(STORY_DATA_PATH, "w", encoding="utf-8") as f:
        f.write(sd_content_norm)
    print("storyData.ts successfully updated with full Act 2 cues!")
else:
    print("WARNING: act2_old_target not found in storyData.ts! Checking regex replacement...")
    pattern = r'\{\s*"id":\s*"act_2_sarcophagus",.*?\n  \},'
    m = re.search(pattern, sd_content_norm, re.DOTALL)
    if m:
        sd_content_norm = sd_content_norm[:m.start()] + act2_new_block.replace("\r\n", "\n") + sd_content_norm[m.end():]
        with open(STORY_DATA_PATH, "w", encoding="utf-8") as f:
            f.write(sd_content_norm)
        print("storyData.ts updated via regex match!")
    else:
        print("ERROR: Could not find act_2_sarcophagus in storyData.ts")

# 2. Update narratorShotSequence.ts
with open(SHOTS_PATH, "r", encoding="utf-8") as f:
    shots_content = f.read()

shots_content_norm = shots_content.replace("\r\n", "\n")

shots_pattern = r'  act_2_sarcophagus:\s*\[.*?\n  \],'
shots_replacement = """  act_2_sarcophagus: [
    {
      time: 0.00,
      texKey: 'retro_film_act2_dashboard_altar_crypt_gemini_v1',
      type: 'event_illustration',
      label: 'Заявочный план: Крипта алтаря дашбордов и стазис-саркофагов на 7-й палубе',
    },
    {
      time: 5.00,
      texKey: 'retro_film_danial_iskakov_sapper_v1',
      type: 'event_illustration',
      label: 'Даниал Искаков: Скриптор на борту (чистый кадр)',
    },
    {
      time: 10.84,
      texKey: 'retro_film_danial_iskakov_sapper_v1',
      type: 'character_quote',
      characterName: 'ДАНИАЛ ИСКАКОВ',
      characterRole: 'Playable Developer • Кузнец Троичного Кода',
      characterThemeColor: 0x00f5d4,
      slackKey: '09_danial_3a_project',
      label: 'Даниал: Паника перед 3A-проектом (8 SP)',
    },
    {
      time: 20.34,
      texKey: 'retro_film_voron_arch_abbot_v7',
      type: 'event_illustration',
      hideSlack: true,
      label: 'Ворон: Архинастоятель Ворон благословил в чате (чистый кадр)',
    },
    {
      time: 23.98,
      texKey: 'retro_film_voron_arch_abbot_v7',
      type: 'character_quote',
      characterName: 'АРХИНАСТОЯТЕЛЬ ВОРОН',
      characterRole: 'Arch-Abbot • Архинастоятель Цитадели',
      characterThemeColor: 0xffaa00,
      slackKey: '09_voron_minnoe_pole',
      label: 'Ворон: Как по минному полю? (со Slack-плашкой Ворона)',
    },
    // 26.68s: "Я сверился с биржевыми кагитаторами и подтверждаю, это буквально минное поле."
    { time: 26.68, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', hideSlack: true, label: 'MCU: Сверка с кагитаторами' },
    // 32.36s: "Триллионные бюджеты клиентархов намертво завязаны на копеечный билд за 8 стори-поинтов."
    { time: 32.36, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лицо Лорда — Триллионные бюджеты на 8 SP' },
    // 40.34s: "Стоит в коде Даниала дрогнуть хоть одной детали, мина детонирует на бирже."
    { time: 40.34, texKey: 'ai_lord_face_eyes_macro_gemini_1080p', type: 'ai_lord', label: 'ECU: Макро горящих глаз Лорда — Мина детонирует на бирже' },
    // 45.58s: "Акции с визгом рушатся на 2 миллиарда, а совет директоров в панике выпрыгивает из зала заседаний прямо в открытый шлюз."
    { time: 45.58, texKey: 'retro_film_clientarch_billionaires_space_freeze_gemini_v10', type: 'event_illustration', ambientCueKey: 'trailer_tension_riser_to_brutal_cut', label: 'Совет директоров в панике выпрыгивает в открытый шлюз — Крах на бирже' },
    // 54.12s: "Тащить ядерную боеголовку через горящий трюм куда спокойнее."
    { time: 54.12, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: Каноническое лицо — Ядерная боеголовка спокойнее' },
    // 57.58s: "Боеголовка разнесет всего один наш корабль, а оплошность в 30-секундном клике за 8 SP уничтожает экономику целых галактик."
    { time: 57.58, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Трон — Экономика галактик' },

    // ==========================================
    // ВТОРАЯ ЧАСТЬ: БОТ 1783, ДОЛГИЙ ЯЩИК И DISNEY
    // ==========================================

    // 68.79s: "От такого давления к середине недели закоротило даже наш бортовой бот-счётчик..."
    { time: 68.79, texKey: 'retro_film_act2_dashboard_altar_crypt_gemini_v1', type: 'event_illustration', label: 'Табло дашбордов: Сход с ума бортового бота' },

    // 88.79s: "1783 сданных плейбла. 1783, блядь. Мы за ночь в горячечном бреду запечатали три соседние галактики..."
    { time: 88.79, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лорд — 1783 сданных плейбла за ночь' },

    // 103.51s: "И посреди этого хаоса Преподобный Толкователь Воли Клиентархов Егор Ткачёв внёс рацпредложение..."
    // ЧИСТАЯ ЭКСПОЗИЦИЯ: сначала даем рассмотреть Егора Ткачёва у стазис-колбы!
    { time: 103.51, texKey: 'retro_horror_film_egor_mickey_vat_v14', type: 'event_illustration', hideSlack: true, label: 'Егор Ткачёв у стазис-колбы (чистая экспозиция)' },

    // 110.67s: Егор: «Может нам нужен статус "долгий ящик" для таких плейблов?)»
    {
      time: 110.67,
      texKey: 'retro_horror_film_egor_mickey_vat_v14',
      type: 'character_quote',
      characterName: 'ЕГОР ТКАЧЁВ',
      characterRole: 'Creative Director • Преподобный Толкователь Воли Клиентархов',
      characterThemeColor: 0xe01e5a,
      slackKey: '03_disney_long_box',
      label: 'Ткачёв: Статус "долгий ящик" (Скриншот Slack)',
    },

    // 120.27s: Горин: «Надо обсудить, нужен ли отдельный статус, у нас он один такой этот плеебл...»
    {
      time: 120.27,
      texKey: 'retro_horror_film_egor_mickey_vat_v14',
      type: 'character_quote',
      characterName: 'АЛЕКСЕЙ ГОРИН',
      characterRole: 'Chief Production Officer • Верховный Надзиратель Конвейера',
      characterThemeColor: 0x00f5d4,
      slackKey: '03_disney_long_box',
      label: 'Горин: Ответ про статус (Скриншот Slack)',
    },

    // 129.03s: "Командованию не нужно ничего открывать — этот Долгий Ящик давно замурован в герметичный саркофаг."
    { time: 129.03, texKey: 'ai_lord_face_eyes_macro_gemini_1080p', type: 'ai_lord', hideSlack: true, label: 'ECU: Глаза Лорда — Долгий Ящик замурован' },

    // ==========================================
    // ПЛАНЫ КАМЕРЫ ДИСНЕЯ (WIDE -> MEDIUM -> CLOSE-UP)
    // ==========================================

    // 139.79s: ПЛАН 1 — ШИРОКИЙ ПЛАН (Wide Shot):
    // "В катакомбном склепе, вмурованная в переборку между отсеками «В разработке» и «Архив», слабо гудит стазис-колба..."
    {
      time: 139.79,
      texKey: 'retro_horror_film_mickey_catacomb_stasis_wide_gemini_v1',
      type: 'event_illustration',
      label: 'План 1 (Широкий): Катакомбный склеп 7-й палубы и стазис-саркофаг Disney в Mintegral',
    },

    // 154.71s: ПЛАН 2 — СРЕДНИЙ ПЛАН (Medium / Full Vat Shot):
    // "По регламенту капсула плейбла живёт ровно семь дней. Но этот таск заперт в вечном стазисе уже 129 суток..."
    {
      time: 154.71,
      texKey: 'retro_horror_film_mickey_biovat_slime_gemini_v6',
      type: 'event_illustration',
      label: 'План 2 (Средний): Стазис-колба с мумией Диснея в зеленоватой био-жиже',
    },

    // 174.27s: ПЛАН 3 — КРУПНЫЙ ПЛАН / МАКРО (Close-up / Macro Horror Shot):
    // "В зеленоватой жиже покачивается полуистлевшее существо Дома Мыши: в почерневших белых перчатках и с облезлыми круглыми ушами..."
    {
      time: 174.27,
      texKey: 'retro_horror_film_mickey_biovat_slime_gpt_v8',
      type: 'event_illustration',
      label: 'План 3 (Крупный план / Макро): Полуистлевшая мышь в перчатках скребётся о кварц',
    },

    // 192.51s: ПЛАН 4 — СРЕДНИЙ ПЛАН МЫШИ В КОЛБЕ:
    // "Оно не может умереть — карточку в Notion никто не закрыл. И не может считаться живым..."
    {
      time: 192.51,
      texKey: 'retro_horror_film_mickey_biovat_slime_gemini_v6',
      type: 'event_illustration',
      label: 'План 4 (Средний): 129 дней анабиоза ради незакрытой ячейки в базе',
    },

    // 199.35s: ФИНАЛ АКТА 2 — ТРОН ЛОРДА:
    // "Сто двадцать девять дней анабиоза ради незакрытой ячейки в базе. Бюрократия Ковчега не знает пощады."
    {
      time: 199.35,
      texKey: 'ai_lord_throne_book_reading_narrator',
      type: 'ai_lord',
      label: 'MCU: Трон Лорда — Бюрократия Ковчега не знает пощады',
    },
  ],"""

m2 = re.search(shots_pattern, shots_content_norm, re.DOTALL)
if m2:
    shots_content_norm = shots_content_norm[:m2.start()] + shots_replacement + shots_content_norm[m2.end():]
    with open(SHOTS_PATH, "w", encoding="utf-8") as f:
        f.write(shots_content_norm)
    print("narratorShotSequence.ts successfully updated with full Disney shot sequence!")
else:
    print("ERROR: Could not find act_2_sarcophagus in narratorShotSequence.ts")
