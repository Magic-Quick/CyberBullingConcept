export interface NarratorShotCut {
  time: number;
  texKey: string | null;
  label?: string;
  type?: 'ai_lord' | 'character_quote' | 'event_illustration';
  characterName?: string;
  characterRole?: string;
  characterThemeColor?: number;
  slackKey?: string;
  ambientCueKey?: string;
}

/**
 * MASTER CINEMATIC DIRECTOR FOR CYBERBULLYING INTERACTIVE MOVIE
 * 
 * Rules:
 * 1. Team member quoted -> Show image from Fin/Team_Fin + Corner Nameplate (Rank & Name).
 *    If image is missing in Fin -> Black screen with "ТРЕБУЕТСЯ ИЗОБРАЖЕНИЕ" + Corner Nameplate.
 * 2. Event spoken -> Show event illustration from Fin/Story_Fin or Fin/Slack_Fin.
 * 3. AI Lord storytelling -> Rich, frequent cinematic cuts (MCU throne with book, CU face, ECU eyes macro).
 * 4. Clean Picture Reveal -> NEVER obstruct an image with dialogue popups on entrance. Give viewer 2-4s of clean view first!
 */

const NARRATOR_CUTS: Record<string, NarratorShotCut[]> = {
  // Prologue: Cosmic flyby -> Events (drezina, gravlift, airlock, ventilation, celeron computers) -> AI-Lord cinematic monologue
  prologue_space: [
    { time: 0.00, texKey: null, type: 'event_illustration', label: 'Ледяная пустота глубокого космоса' },
    { time: 18.50, texKey: 'ship_cistam', type: 'event_illustration', label: 'Ковчег «Цитадель» в глубоком космосе' },
    { time: 68.54, texKey: 'retro_film_openspace_ventilation_gemini_v1', type: 'event_illustration', label: 'Прокуренный опенспейс и треск ламп дневного света' },
    { time: 80.50, texKey: 'retro_film_openspace_smoking_room_large_window_mold_gemini_v2', type: 'event_illustration', label: 'Курилка с панорамным стеклом, плесенью и бездной' },
    { time: 92.18, texKey: 'retro_film_drezina_hold_gemini_v1', type: 'event_illustration', label: 'Трюмные дрезины' },
    { time: 95.68, texKey: 'retro_film_grav_lift_shaft_gemini_v1', type: 'event_illustration', label: '40-тысячепалубный гравилифт' },
    { time: 100.10, texKey: 'retro_film_airlock_gatekeeper_gemini_v1', type: 'event_illustration', label: 'Шлюзы и вахтер' },
    { time: 109.36, texKey: 'retro_film_openspace_microwave_fish_smell_gpt_v1', type: 'event_illustration', label: '7-я палуба: Смрад разогретой в микроволновке рыбы' },
    { time: 118.92, texKey: 'retro_film_openspace_ventilation_gemini_v1', type: 'event_illustration', label: 'Дует из дюз, духота и чахоточный кашель' },
    // 130.78s: "В личных каютах у каждого стоят квантовые станции на 128 ядер с кастомной водянкой. Но работать из кают запрещено."
    // РЕЖИССУРА: Не показываем опенспейс и не раскрываем ИИ Лорда раньше времени. Показываем монолитный Ковчег в ледяном космосе!
    { time: 130.78, texKey: 'ship_cistam', type: 'event_illustration', label: 'Ковчег в космосе — Запрет работы из кают' },
    // 141.13s: "В опенспейсе экипаж прикован к одинаковым казенным моноблокам на процессорах Celeron..."
    // РЕЖИССУРА: Опенспейс с моноблоками Celeron появляется ТОЧНО при словах «В опенспейсе экипаж прикован к одинаковым казенным моноблокам...»!
    { time: 141.13, texKey: 'retro_film_feed_tubes_coders_v7', type: 'event_illustration', label: 'Казённые моноблоки Celeron и прикованный экипаж в опенспейсе' },
    // 159.08s: "Забудьте о покое. Забудьте о мягком свете далеких миров... Ледяной шепот духа полишинга из глубин подпространственного кэша"
    { time: 159.08, texKey: 'kovcheg_ark_ship_exterior_cistam', type: 'event_illustration', label: 'Ковчег в мертвой бездне — Тьма великого конвейера' },
    // 175.74s: Ледяной шепот духа полишинга, пробивающийся сквозь металл из глубин подпространственного кэша
    { time: 175.74, texKey: 'retro_film_warp_daemon_polishing_spirit_v4', type: 'event_illustration', label: 'Ледяной шепот духа полишинга из глубин кэша' },
    // 187.46s: "А высоко над бездной грохочущих палуб, на вершине надзирательской башни, на троне из сотен тысяч сгоревших видеокарт, восседает центральный машинный разум ковчега. Верховный хронометрист. И лорд."
    // РЕЖИССУРА: ГРАНДИОЗНЫЙ РЕВЕЛ ИИ ЛОРДА! Впервые появляется на экране именно здесь!
    { time: 187.46, texKey: 'retro_film_ai_lord_throne_room_grand_eyes_v6', type: 'ai_lord', label: 'Тронный зал на мостике: ИИ-Лорд на троне из видеокарт' },
    // 197.08s: "Он не моргает. Он не знает жалости."
    { time: 197.08, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: Каноническое лицо — Он не моргает' },
    // 200.64s: "Он фиксирует каждое колебание пульса, каждое зависание селерона и каждый ночной таймстамп."
    { time: 200.64, texKey: 'ai_lord_face_eyes_macro_gemini_1080p', type: 'ai_lord', label: 'ECU: Макро горящих глаз — Фиксация пульса' },
    // 208.10s: "А когда завершается недельный круг страданий..."
    { time: 208.10, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Трон с железной Книгой Учета' },
    // 211.06s: "он опускает бронированные жалюзи..."
    { time: 211.06, texKey: 'ark_outro_cooling_shutters_v1', type: 'event_illustration', label: 'Бронированные жалюзи башни опускаются' },
    // 213.50s: "...вскрывает железную книгу учета и зачитывает свой приговор."
    { time: 213.50, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Вскрытие железной книги учета' },
    // 218.36s: "Это хроники 14-го цикла."
    { time: 218.36, texKey: 'ai_lord_face_extreme_closeup_canonical_1080p', type: 'ai_lord', label: 'ECU: Приговор 14-го Цикла' },
  ],

  // Act 1: Convent / Варка Плейриума (94.35s)
  act_1_convent: [
    // 0.00s: "Добрый вечер, мясные слейвы. Для непосвященных в галактике мы – студия интерактивной рекламы."
    // РЕЖИССУРА: Начинаем с Рассказчика ИИ Лорда на троне, а не с конвейера! Не показываем конвейер до того, как про него заговорят!
    { time: 0.00, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Лорд приветствует мясных слейвов' },
    // 8.06s: "Но в реальности наш орбитальный комбинат занимается одним делом."
    { time: 8.06, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: Лорд про орбитальный комбинат' },
    // 12.64s: "Мы добываем, варим и обогащаем Плеериум – тяжелый 30-секундный цифровой наркотик..."
    // РЕЖИССУРА: Ловушка плейриума с зелеными светящимися колбами появляется ТОЧНО на словах «Мы добываем, варим и обогащаем Плеериум»!
    { time: 12.64, texKey: 'retro_film_playrium_trap_conveyor_v1', type: 'event_illustration', label: 'Варка Плейриума — Конвейер и колбы' },
    // 40.64s: "запечатать чистый Плеериум внутри священного сосуда, плейбла или по-рабочему в цеху плейбака. Вбить внутрь руны кода, живые ассеты..."
    { time: 40.64, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Трон и раскрытый фолиант — Литургия плейбла' },
    // 57.64s: "Когда ничего не подозревающий гуманоид на краю галактики кликает на этот артефакт, нейротоксин..."
    { time: 57.64, texKey: 'ai_lord_face_eyes_macro_gemini_1080p', type: 'ai_lord', label: 'ECU: Макро горящих глаз Лорда' },
    // 68.00s: "и парализует волю ровно настолько, чтобы он нажал «Скачать». Один клик, дофаминовый удар, конверсия."
    { time: 68.00, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лицо Лорда — Конверсия' },
    // 79.60s: "Но это в идеале. На этой неделе клиентархи-правконосцы решили отомстить."
    { time: 79.60, texKey: 'ai_lord_face_extreme_closeup_canonical_1080p', type: 'ai_lord', label: 'ECU: Финал Акта 1 — Месть клиентархов' },
    // 83.00s: Исполинский флот клиентархов осыпает космос торпедами правок (клиффхэнгер Акта 1)
    { time: 83.00, texKey: 'retro_film_clientarch_fleet_revisions_volley_v1', type: 'event_illustration', label: 'Флот клиентархов-правконосцев: Залпы батарей правок' },
    // 84.84s: "Запомните одно число – 37. К середине недели эта стена едва не раздавила наш корабль."
    { time: 84.84, texKey: 'manufactorum_scoreboard_37_v1', type: 'event_illustration', label: 'Табло факторума — Первое упоминание числа 37' },
  ],

  // Act 2: Sarcophagus / 8 Story Points (62.90s)
  act_2_sarcophagus: [
    {
      time: 0.00,
      texKey: 'kovcheg_ark_ship_exterior_cistam',
      type: 'event_illustration',
      label: 'Заявочный план: Ковчег «Цитадель» в открытом космосе',
    },
    {
      time: 2.50,
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
      type: 'character_quote',
      characterName: 'АРХИНАСТОЯТЕЛЬ ВОРОН',
      characterRole: 'Arch-Abbot • Архинастоятель Цитадели',
      characterThemeColor: 0xffaa00,
      label: 'Ворон: Как по минному полю?',
    },
    // 26.68s: "Я сверился с биржевыми кагитаторами и подтверждаю, это буквально минное поле."
    { time: 26.68, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Сверка с кагитаторами' },
    // 32.36s: "Триллионные бюджеты клиентархов намертво завязаны на копеечный билд за 8 стори-поинтов."
    { time: 32.36, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лицо Лорда — Триллионные бюджеты на 8 SP' },
    // 40.34s: "Стоит в коде Даниала дрогнуть хоть одной детали, мина детонирует на бирже."
    { time: 40.34, texKey: 'ai_lord_face_eyes_macro_gemini_1080p', type: 'ai_lord', label: 'ECU: Макро горящих глаз Лорда — Мина детонирует на бирже' },
    // 45.58s: "Акции с визгом рушатся на 2 миллиарда, а совет директоров в панике выпрыгивает из зала заседаний прямо в открытый шлюз."
    // РЕЖИССУРА: Иллюстрация события появляется СТРОГО в момент, когда про него заговорили!
    { time: 45.58, texKey: 'retro_film_clientarch_billionaires_space_freeze_gemini_v10', type: 'event_illustration', ambientCueKey: 'dread_05_rust_and_bone_maximum_grimdark_25s', label: 'Совет директоров в панике выпрыгивает в открытый шлюз — Крах на бирже' },
    // 54.12s: "Тащить ядерную боеголовку через горящий трюм куда спокойнее."
    { time: 54.12, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: Каноническое лицо — Ядерная боеголовка спокойнее' },
    // 57.58s: "Боеголовка разнесет всего один наш корабль, а оплошность в 30-секундном клике за 8 SP уничтожает экономику целых галактик."
    { time: 57.58, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Трон — Экономика галактик' },
  ],

  // Act 3: Management & Time Machine (142.15s)
  act_3_timemachine: [
    {
      time: 0.00,
      texKey: 'retro_film_act3_command_bridge_chronos_gemini_v1',
      type: 'event_illustration',
      label: 'Заявочный план: Командный мостик Хронос — Отсек распределения ресурсов',
    },
    {
      time: 5.12,
      texKey: 'retro_film_gorin_batman_cowl_gemini_v20',
      type: 'character_quote',
      characterName: 'АЛЕКСЕЙ ГОРИН',
      characterRole: 'Head of Production • Верховный Надзиратель',
      characterThemeColor: 0xffaa00,
      label: 'Горин: Древний машинный диалект',
    },
    {
      time: 12.14,
      texKey: 'retro_film_gorin_batman_cowl_gemini_v20',
      type: 'character_quote',
      characterName: 'АЛЕКСЕЙ ГОРИН',
      characterRole: 'Head of Production • Верховный Надзиратель',
      characterThemeColor: 0xffaa00,
      label: 'Горин: Литургии Корчое, пришлижать, демоблил',
    },
    {
      time: 20.20,
      texKey: 'retro_film_gorin_batman_cowl_gemini_v20',
      type: 'character_quote',
      characterName: 'АЛЕКСЕЙ ГОРИН',
      characterRole: 'Head of Production • Верховный Надзиратель',
      characterThemeColor: 0xffaa00,
      label: 'Горин: Манифест про сырье и трубки',
    },
    // 38.14s: "Я подтверждаю, наши кузнецы намертво припаяны к станкам..." -> Сначала говорит Лорд
    { time: 38.14, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лорд подтверждает слова Горина' },
    // 42.10s: "...а к их телам подведены питательные трубки. Пока в станке есть плейбак, по трубкам течет бульон..."
    { time: 42.10, texKey: 'retro_film_feed_tubes_coders_v7', type: 'event_illustration', label: 'Питательные трубки кодеров и бульон' },
    // 50.00s: "Нет плейбаков. Клапан перекрывает еду и биоузел с лязгом отваливается от станины."
    { time: 50.00, texKey: 'retro_film_coders_openspace_desiccated_corpse_v13', type: 'event_illustration', label: 'Биоузел отваливается от станины: застывший кодер со шлангом на полу' },
    {
      time: 54.92,
      texKey: 'retro_film_alexey_novice_v4',
      type: 'character_quote',
      characterName: 'АЛЕКСЕЙ (НОВЕНЬКИЙ)',
      characterRole: 'Junior Developer • Новообращённый Послушник',
      characterThemeColor: 0x38bdf8,
      label: 'Новенький Алексей: 2D-плейбак',
    },
    // 66.00s: "Апофеоз менеджмента случился, когда Нику Егорову не хватало пары часов до ачивки за скорость..."
    { time: 66.00, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Лорд про апофеоз менеджмента' },
    // 75.49s: "...Нику Егорову не хватало пары часов до ачивки за скорость..."
    { time: 75.49, texKey: 'retro_film_management_time_machine_v1', type: 'event_illustration', label: 'Пит-стоп менеджмента' },
    {
      time: 78.57,
      texKey: 'retro_film_maksim_mamusin_android_coding_gemini_pro_v8',
      type: 'character_quote',
      characterName: 'МАКСИМ МАМУСИН',
      characterRole: 'Tech Lead • Палач Старого Стека',
      characterThemeColor: 0x48cae4,
      label: 'Мамусин: Меньше двух с половиной?',
    },
    {
      time: 86.68,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      label: 'Эдик: 2,25 суток как сказала Иишка',
    },
    {
      time: 94.34,
      texKey: 'retro_film_maksim_mamusin_android_coding_gemini_pro_v8',
      type: 'character_quote',
      characterName: 'МАКСИМ МАМУСИН',
      characterRole: 'Tech Lead • Палач Старого Стека',
      characterThemeColor: 0x48cae4,
      label: 'Мамусин: В ноушене даты не так стоят',
    },
    {
      time: 98.82,
      texKey: 'retro_film_gorin_batman_cowl_gemini_v20',
      type: 'character_quote',
      characterName: 'АЛЕКСЕЙ ГОРИН',
      characterRole: 'Head of Production • Верховный Надзиратель',
      characterThemeColor: 0xffaa00,
      label: 'Горин: Ок, даю добро, правьте даты',
    },
    {
      time: 104.12,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      ambientCueKey: 'peace_03_pin_drop_silence_gentle_resolution_25s',
      label: 'Эдик: Отчитался',
    },
    {
      time: 106.32,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      slackKey: '12_nick_time_machine',
      label: 'Эдик: Попровил — Скриншот машины времени',
    },
    {
      time: 109.50,
      texKey: 'retro_film_nick_egorov_speedrun_v2',
      type: 'character_quote',
      characterName: 'НИК ЕГОРОВ',
      characterRole: 'Tech Lead • Координатор Скоростной Статики',
      characterThemeColor: 0x00f5d4,
      label: 'Ник Егоров: Архи-Магистр Сингулярности Кода',
    },
    {
      time: 111.50,
      texKey: 'retro_film_nick_egorov_speedrun_v2',
      type: 'character_quote',
      characterName: 'НИК ЕГОРОВ',
      characterRole: 'Tech Lead • Координатор Скоростной Статики',
      characterThemeColor: 0x00f5d4,
      slackKey: '12_nick_time_machine',
      label: 'Ник Егоров: Спидран машины времени — Значок скорости',
    },
    // 114.58s: "Бюрократия оказалась сильнее законов физики."
    { time: 114.58, texKey: 'ai_lord_face_extreme_closeup_canonical_1080p', type: 'ai_lord', label: 'ECU: Лорд — Бюрократия сильнее законов физики' },
  ],

  // Act 4: Motor / Моторный цех (156.81s)
  act_4_engine: [
    { time: 0.00, texKey: 'retro_film_act4_motor_deck_render_factorum_gemini_v1', type: 'event_illustration', label: 'Заявочный план: Моторный цех и рендер-факторум платформы' },
    { time: 5.70, texKey: 'retro_film_server_mold_human_teeth_1', type: 'event_illustration', label: 'Серверный трюм: биологическая мутация зубов и плесени' },
    {
      time: 13.38,
      texKey: 'retro_film_kirill_beryozkin_v2',
      type: 'character_quote',
      characterName: 'КИРИЛЛ БЕРЁЗКИН',
      characterRole: 'Lead Platform • Магистр Циклической Несовместимости',
      characterThemeColor: 0x00f5d4,
      label: 'Кирилл: Нафармилось 22 гигабайта',
    },
    { time: 20.64, texKey: 'retro_film_macro_facehugger_critters_microchip_3', type: 'event_illustration', ambientCueKey: 'dread_04_predator_chittering_nightmare_25s', label: 'В логах крик: Личинки на чипах — 346 копий мутанта' },
    { time: 25.26, texKey: 'retro_film_server_mold_human_teeth_3', type: 'event_illustration', label: '346 копий мутанта сожрали плоть сервера' },
    { time: 30.00, texKey: 'retro_film_macro_triops_shield_parasites_1', type: 'event_illustration', label: 'Паразиты-щитни экранируют память' },
    {
      time: 36.07,
      texKey: 'retro_film_kristian_repository_guardian_v2',
      type: 'character_quote',
      characterName: 'КРИСТИАН',
      characterRole: 'Lead Platform • Хранитель Чистой Ветки',
      characterThemeColor: 0x38bdf8,
      label: 'Кристиан: Вердикт Упс',
    },
    { time: 43.42, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Небеса раскололись окончательно' },
    {
      time: 45.92,
      texKey: 'retro_soviet_film_pavel_playbox_logo_gpt_v4',
      type: 'character_quote',
      characterName: 'ПАВЕЛ САМОЙЛЕНКО',
      characterRole: 'CTO • Архи-Цензор Синтаксической Ереси',
      characterThemeColor: 0x00f5d4,
      label: 'Павел: Брат Самойленко вышел к пастве',
    },
    {
      time: 54.35,
      texKey: 'retro_soviet_film_pavel_playbox_logo_gpt_v4',
      type: 'character_quote',
      characterName: 'ПАВЕЛ САМОЙЛЕНКО',
      characterRole: 'CTO • Архи-Цензор Синтаксической Ереси',
      characterThemeColor: 0x00f5d4,
      slackKey: '04_claude_banned',
      label: 'Павел: Мне блокнули Клода — Код-ревью на паузе',
    },
    {
      time: 64.07,
      texKey: 'retro_film_pavel_claude_banned_blind_stumble_v1',
      type: 'character_quote',
      characterName: 'ПАВЕЛ САМОЙЛЕНКО',
      characterRole: 'CTO • Архи-Цензор Синтаксической Ереси',
      characterThemeColor: 0x00f5d4,
      label: 'Павел: Слепой валидатор впотьмах без Клода',
    },
    { time: 78.00, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лицо — По шрифту Брайля на ощупь' },
    {
      time: 83.80,
      texKey: 'retro_film_artem_khukhro_guyver_gemini_v19',
      type: 'character_quote',
      characterName: 'АРТЁМ ХУХРО',
      characterRole: 'Lead 3D • Техноэкзорцист Графической Скверны',
      characterThemeColor: 0x9d4edd,
      label: 'Хухра: Арт сейчас — главный боттлнек',
    },
    {
      time: 104.25,
      texKey: 'khukhro_art_bottleneck_magnifier_v1',
      type: 'event_illustration',
      label: 'Хухро: Пиксели добывают пиксели — Арт-боттлнек',
    },
    // 110.89s: "Матрица схлопнется в пыль, клиентархи не разглядят геймплей, завалят шлюзы правками..."
    { time: 110.89, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Лорд — Матрица схлопнется в пыль, клиентархи завалят шлюзы' },
    // 116.67s: "И тогда, как резюмировал мастер: «Мне дорога в башню времени ИИ-Лорда»."
    { time: 116.67, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лорд — Мне дорога в башню времени ИИ-Лорда' },
    {
      time: 121.67,
      texKey: 'retro_film_gorin_batman_cowl_gemini_v20',
      type: 'character_quote',
      characterName: 'АЛЕКСЕЙ ГОРИН',
      characterRole: 'Head of Production • Верховный Надзиратель',
      characterThemeColor: 0xffaa00,
      ambientCueKey: 'peace_01_pin_drop_silence_pure_calm_25s',
      label: 'Горин: Хухро пока не трогаем',
    },
    { time: 134.93, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: Ровно 240 секунд тишины — 4 минуты передышки' },
    { time: 145.95, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: 4 минуты передышки' },
  ],

  // Act 5: Clientarchs / Клиентархи (221.41s)
  act_5_clientarchs: [
    { time: 0.00, texKey: 'retro_film_act5_outer_perimeter_clientarch_siege_gemini_v1', type: 'event_illustration', label: 'Заявочный план: Внешний периметр — Осада флота клиентархов Зинга' },
    // 5.32s: "устроили беспощадную хирургическую вивисекцию проекту «Хаусхант»,"
    { time: 5.32, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Лорд — Хирургическая вивисекция проекта Хаусхант' },
    // 9.70s: "который оборонял старший навигатор Эдик Левин." -> Чистый портрет Эдика перед депешей
    {
      time: 9.70,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      label: 'Эдик Левин: Старший навигатор на рубеже Хаусханта',
    },
    // 14.22s: "Клиентархи были абсолютно глухи к мольбам экипажа..." -> Появление депеши с 11 правками
    {
      time: 14.22,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      slackKey: '05_edik_11_points',
      label: 'Эдик: Депеша с 11 правками',
    },
    // 19.40s: "Они потребовали вырезать из сосуда все сложные механики, выпотрошить логику и превратить искалеченный плейбл в безвольного инвалида..."
    { time: 19.40, texKey: 'retro_film_eduard_danial_playable_autopsy_green_v6', type: 'event_illustration', label: 'Ампутация механик плейбла: вивисекция и утечка зеленого Плейриума' },
    // 42.40s: "«Капец, был же нормальный плейбл»." -> Чистый портрет Эдика перед репликой
    {
      time: 42.40,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      label: 'Эдик: Капец, был же нормальный плейбл',
    },
    // 49.70s: "Следом под плазменный резак пошел любовно собранный строительный шатер и навигатор оплакал кусок кода как родного брата."
    { time: 49.70, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лорд — Плазменный резак и строительный шатер' },
    // 54.35s: Чистый портрет Эдика перед появлением скриншота тента
    {
      time: 54.35,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      label: 'Эдик: Старший навигатор у плазменного резака',
    },
    // 57.35s: "«Капец, я уже полюбил этот тент как родного брата»." -> Появление карточки со скриншотом тента
    {
      time: 57.35,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      slackKey: '06_tent_brother',
      label: 'Эдик: Полюбил этот тент как родного брата',
    },
    {
      time: 62.16,
      texKey: 'retro_film_treasure_chest_egg_beak_horror_v4',
      type: 'event_illustration',
      label: 'Сундук со звуком яйца: Тошнотворный биохруст',
    },
    {
      time: 89.72,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      label: 'Эдик: В ужасе стучит по каналу связи',
    },
    {
      time: 93.24,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      slackKey: '13_chest_egg_sound',
      label: 'Эдик: Просто чтоб было не яйцо',
    },
    { time: 95.94, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Трон и книга' },
    // 105.26s: Радиограмма Supercell 5 суток в обесточенном буфере -> экран билда в отсеке Ковчега
    { time: 105.26, texKey: 'retro_film_mavis_ark_office_gemini_v1', type: 'event_illustration', label: 'Офис Ковчега: Экран с забытым мобильным билдом и буфер уведомлений Supercell' },
    // 123.23s: Гермокапсулу вскрыли, выпал вердикт «Mavis legs are broken» -> всплывает слек-депеша
    { time: 123.23, texKey: 'retro_film_mavis_ark_office_gemini_v1', type: 'event_illustration', slackKey: '08_mavis_legs', ambientCueKey: 'dread_03_predator_instant_terror_drop_25s', label: 'Депеша Supercell: Mavis legs are broken — Дроп ужаса' },
    // 130.14s: ПОСЛЕ «Mavis legs are broken» -> РЕАЛИСТИЧНАЯ КРИПОТА (Мэвис с переломанными ногами ползает по стеклу)
    { time: 130.14, texKey: 'retro_film_mavis_phone_horror_contrast_gemini_v4', type: 'event_illustration', label: 'Реалистичный хоррор: Дева Мэвис с вывернутыми переломанными ногами' },
    // 151.26s: Возврат к Лорду
    { time: 151.26, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лицо Лорда — Триумф инженерной мысли' },
    {
      time: 158.90,
      texKey: 'ai_lord_face_eyes_macro_gemini_1080p',
      type: 'ai_lord',
      label: 'Директива: Простые решения',
    },
    {
      time: 168.76,
      texKey: 'retro_film_artem_khukhro_guyver_gemini_v19',
      type: 'character_quote',
      characterName: 'АРТЁМ ХУХРО',
      characterRole: 'Lead 3D • Техноэкзорцист Графической Скверны',
      characterThemeColor: 0x9d4edd,
      label: 'Хухра: Чертеж боевой робо-коровы с лазером',
    },
    {
      time: 172.42,
      texKey: 'retro_film_egor_reverend_interpreter_v4',
      type: 'character_quote',
      characterName: 'ЕГОР ТКАЧЁВ',
      characterRole: 'Creative Director • Преподобный Толкователь Воли Клиентархов',
      characterThemeColor: 0xe01e5a,
      label: 'Ткачёв: Преподобный толкователь принимает директиву',
    },
    {
      time: 178.28,
      texKey: 'retro_film_space_cyber_cow_lasers_gemini_v1',
      type: 'event_illustration',
      label: 'Боевая кибер-корова стреляет лазерами из вымени в глубоком космосе',
    },
    {
      time: 183.60,
      texKey: 'retro_film_space_cyber_cow_lasers_gemini_v1',
      type: 'event_illustration',
      slackKey: '07_cow_laser',
      label: 'Тред: Лазеры из вымени',
    },
    {
      time: 188.94,
      texKey: 'retro_warhammer_eduard_levin_gpt_v3',
      type: 'character_quote',
      characterName: 'ЭДУАРД ЛЕВИН',
      characterRole: 'Creative Lead • Зодчий Игрового Замысла',
      characterThemeColor: 0xff3366,
      label: 'Эдик: Артём слишком буквально принял просьбу',
    },
    { time: 196.05, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: Реестр простых решений' },
    // 206.29s: "А когда клиентархи из Game Gears прислали депешу «Из вами сделанных плейблов визуал брать не стоит»..."
    { time: 206.29, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лорд — Депеша Game Gears про визуал' },
    // 213.47s: "...Палач Старого Стека Максим Мамусин перевел щиты в боевой режим одним священным словом. Заебись!"
    {
      time: 213.47,
      texKey: 'retro_film_maksim_mamusin_android_coding_gemini_pro_v8',
      type: 'character_quote',
      characterName: 'МАКСИМ МАМУСИН',
      characterRole: 'Tech Lead • Палач Старого Стека',
      characterThemeColor: 0x48cae4,
      label: 'Мамусин: Заебись!',
    },
    { time: 220.95, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Финал клиентархов' },
  ],

  // Act 6: Tribunal Punishment / Наказание (98.76s)
  act_6_punishment: [
    // 0.00s: Заявочный план — Гермоврата Зала Суда
    { time: 0.00, texKey: 'retro_film_act6_tribunal_sealed_vault_door_mj_v1_1793571316_3', type: 'event_illustration', label: 'Заявочный план: Гермоврата Зала Суда' },
    // 2.00s: "Время раздавать долги... Мне осточертело тратить драгоценные такты кремния..." -> Зал Суда ИИ-Лорда
    { time: 2.00, texKey: 'ai_lord_throne_tribunal_awards', type: 'ai_lord', label: 'Зал суда: ИИ-Лорд на троне трибунала — Время раздавать долги' },
    // 9.88s: "Напоминаю, багровый обелиск воздвигается не за лень, он вручается за масштабные катастрофы..." -> Крупный план Лорда (зачитывает нарушения)
    { time: 9.88, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лик ИИ-Лорда — Оглашение масштаба нарушений' },
    // 20.94s: "И сегодня на эшафот поднимаются магистр циклической несовместимости Кирилл Березкин и хранитель чистой ветки Кристиан."
    {
      time: 20.94,
      texKey: 'retro_film_tribunal_scaffold_kirill_kristian_v1',
      type: 'event_illustration',
      label: 'Эшафот: Кирилл Берёзкин и Кристиан перед судом ИИ-Лорда',
    },
    // 31.52s: "За грандиозную биологическую аномалию недели: 346 мутировавших копий пакета общим весом в 22 ГБ..."
    { time: 31.52, texKey: 'retro_film_server_mold_human_teeth_3', type: 'event_illustration', label: 'Биоаномалия: 346 мутировавших копий на 22 ГБ' },
    // 42.20s: "...и завершившихся невозмутимым отчетом Кристиана: «Упс»."
    {
      time: 42.20,
      texKey: 'retro_film_kristian_repository_guardian_v2',
      type: 'character_quote',
      characterName: 'КРИСТИАН',
      characterRole: 'Platform Developer • Хранитель Чистой Ветки',
      characterThemeColor: 0x38bdf8,
      label: 'Кристиан: Вердикт Упс',
    },
    // 48.90s: "Конвент выносит приговор. Инспекция. Дилдачичных катакомб без права на переписку..." -> Трон Суда (НАГНЕТАНИЕ)
    { time: 48.90, texKey: 'ai_lord_throne_tribunal_awards', type: 'ai_lord', ambientCueKey: 'dread_05_rust_and_bone_maximum_grimdark_25s', label: 'Зал суда: ИИ-Лорд на троне трибунала — Приговор Конвента' },
    // 61.38s: "Обоим алхимикам вручается двухметровый церемониальный жезл. Багровый дилдо из титанового сплава..."
    { time: 61.38, texKey: 'ai_lord_baton', type: 'event_illustration', label: 'Церемониальный жезл: Багровый дилдо' },
    // 70.18s: "Они приговариваются к ручной зачистке рифленых металлических решеток нижней палубы..." -> РЕШЁТКИ НИЖНЕЙ ПАЛУБЫ! (УДАР КОЛОССА)
    { time: 70.18, texKey: 'retro_film_dildache_catacombs_infestation_v1', type: 'event_illustration', ambientCueKey: 'dread_07_titan_forge_instant_colossus_strike_25s', label: 'Нижняя палуба: Зачистка рифлёных металлических решёток' },
    // 78.00s: "...от налипшей биомассы всех 346 копий... цифровой гнили..."
    { time: 78.00, texKey: 'retro_film_dildache_catacombs_infestation_v2', type: 'event_illustration', label: 'Катакомбы нижней палубы: Зачистка цифровой гнили до блеска' },
    // 88.12s: "Особое условие инспекции – дрочить вручную... без права на кофе."
    { time: 88.12, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: Лик ИИ-Лорда — Без права выхода и без права на кофе' },
  ],

  // Act 6: Tribunal Reward / Награда (53.86s)
  act_6_reward: [
    // 0.00s: Заявочный план — Гермоврата Палаты Воздаяния (СРАЗУ звучит добрая музыка!)
    { time: 0.00, texKey: 'retro_film_act6_tribunal_sealed_vault_door_mj_v1_1793571316_3', type: 'event_illustration', ambientCueKey: 'peace_04_chronicles_playbox_heavenly_vocalise_30s', label: 'Заявочный план: Гермоврата Палаты Воздаяния — Добрая музыка' },
    // 2.50s: "В награду за столь великую заботу о коллективе «Ковчег» жалуют надзирателю немыслимую роскошь..." -> Зал Суда ИИ-Лорда
    { time: 2.50, texKey: 'ai_lord_throne_tribunal_awards', type: 'ai_lord', label: 'Зал суда: ИИ-Лорд на троне трибунала — Оглашение Высшей Милости' },
    // 9.22s: "...чашку безупречного эспрессо. Зерна ручной обжарки с реликтовых плантаций..."
    { time: 9.22, texKey: 'retro_film_ship_storage_coffee_vault_v2', type: 'event_illustration', label: 'Кофейное хранилище Ковчега — Зерна и эспрессо' },
    // 23.58s: "Поэтому сервисная игла пневмодозатора с шипением врезается напрямую в его питательный катетер..."
    { time: 23.58, texKey: 'ai_lord_cookie', type: 'ai_lord', ambientCueKey: 'peace_05_chronicles_playbox_uplifting_pads_30s', label: 'Печенька благодати: Удар сервисной иглы пневмодозатора — Возвышенные пэды' },
    // 38.12s: "Никаких чашек, никаких пауз. Его глаза даже не успели моргнуть..."
    { time: 38.12, texKey: 'ai_lord_face_eyes_macro_gemini_1080p', type: 'ai_lord', label: 'ECU: Макро горящих глаз Лорда — 240 кадров' },
    // 46.00s: "Зрачки расширены, пульс 240, давление в норме. Наслаждайтесь букетом, Михаил. За работу!"
    { time: 46.00, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: Лик ИИ-Лорда — Наслаждайтесь букетом, Михаил. За работу!' },
  ],

  // Act 8: Outro / Закрытие смены (48.61s)
  act_8_outro: [
    { time: 0.00, texKey: 'manufactorum_scoreboard_37_v1', type: 'event_illustration', label: 'Табло мануфакторума: Стена 37 — Завал из 37 правок' },
    { time: 7.00, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Крупный план лица — 37 правок' },
    { time: 13.80, texKey: 'ai_lord_face_eyes_macro_gemini_1080p', type: 'ai_lord', label: 'ECU: Макро горящих глаз' },
    { time: 20.00, texKey: 'ai_lord_face_extreme_closeup_canonical_1080p', type: 'ai_lord', label: 'CU: 30 секунд клика' },
    { time: 26.62, texKey: 'ai_lord_face_closeup_canonical_1080p', type: 'ai_lord', ambientCueKey: 'dread_03_predator_instant_terror_drop_25s', label: 'CU: Лицо — Отдыхайте, мясные слейвы (Дроп нагнетания)' },
    { time: 34.00, texKey: 'ai_lord_face_eyes_macro_gemini_1080p', type: 'ai_lord', label: 'ECU: Найду до чего доебаться' },
    { time: 41.00, texKey: 'ark_outro_cooling_shutters_v1', type: 'event_illustration', label: 'Охлаждающие створки ковчега: За работу' },
  ],
};

export function getNarratorShotAtTime(actId: string, time: number): NarratorShotCut | null {
  const cuts = NARRATOR_CUTS[actId];
  if (!cuts || cuts.length === 0) return null;

  // Find latest cut <= time
  let activeCut: NarratorShotCut = cuts[0];
  for (let i = 0; i < cuts.length; i++) {
    if (time >= cuts[i].time) {
      activeCut = cuts[i];
    } else {
      break;
    }
  }

  return activeCut;
}

export interface ActiveCueInfo {
  cueKey: string;
  startTime: number;
  offset: number;
  duration: number;
}

/**
 * Finds the currently active cinematic audio cue (e.g. buildup/dread or peace pads)
 * at a given timeline position within an act.
 * Even if the timeline seeks past the initial triggering cut, this returns the active cue
 * and its exact playback offset so it can seamlessly resume mid-track.
 */
export function getActiveCueAtTime(actId: string, time: number): ActiveCueInfo | null {
  const cuts = NARRATOR_CUTS[actId];
  if (!cuts || cuts.length === 0) return null;

  // Find the most recent cut at or before time that defined an ambientCueKey
  let latestCueCut: NarratorShotCut | null = null;
  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i];
    if (cut.time > time) break;
    if (cut.ambientCueKey) {
      latestCueCut = cut;
    }
  }

  if (!latestCueCut || !latestCueCut.ambientCueKey) return null;

  // Determine duration of the cue (usually encoded as e.g. '_25s' or '_30s')
  const match = latestCueCut.ambientCueKey.match(/_(\d+)s/);
  const duration = match ? parseInt(match[1], 10) : 25.0;

  const elapsed = time - latestCueCut.time;
  if (elapsed >= 0 && elapsed < duration) {
    return {
      cueKey: latestCueCut.ambientCueKey,
      startTime: latestCueCut.time,
      offset: elapsed,
      duration: duration,
    };
  }

  return null;
}
