export interface ConcertFrameCut {

  time: number;

  texKey: string;

  label: string;

  ambientCueKey?: string;

  characterName?: string;

  characterRole?: string;

  characterThemeColor?: number;

}

/**

 * AI-LORD ROCK CONCERT MONTAGE SEQUENCE (1970s Retro Practical Style)

 * Precision calibrated by Miniaudio + Scipy acoustic onset analysis of servotorization.mp3.

 * Detailed documentation: media/visual/generated/ai_lord_concert_sequence_latest/

 */

export const CONCERT_SEQUENCE_CUTS: ConcertFrameCut[] = [

  // [ИНТРО: 0.00s - 36.46s] Спокойный ввод Лорда в экстаз

  { time: 0.00, texKey: 'ai_lord_concert_arena_wide', label: 'Заявочный план: Арена стадиона' },

  { time: 4.50, texKey: 'ai_lord_calm_singing', label: 'Куплет 1: ИИ-Лорд поёт (спокойный зачин)' },

  // [ПЕРЕБИВКА ТОЛПЫ 1: 36.46s - 45.87s]

  { time: 36.46, texKey: '02_calm_audience_pov', label: 'Перебивка: Зал фанатов вид из глаз' },

  { time: 41.32, texKey: '01_calm_wing_profile', label: 'Перебивка: Профиль со сцены' },

  // [КУПЛЕТЫ 1 & 2: 45.87s - 73.08s]

  { time: 45.87, texKey: 'ai_lord_calm_singing', label: 'Куплет 1: Спокойный зачин' },

  { time: 55.11, texKey: 'ai_lord_drive_default', label: 'Драйв 1: Я б вырезал плоть до нерва!' },

  { time: 57.23, texKey: '01_calm_wing_profile', label: 'Куплет 1: Со сцены (риффы гитар)' },

  { time: 65.16, texKey: 'ai_lord_calm_singing', label: 'Куплет 2: Нагнетание' },

  // [ПРИПЕВ 3: 73.08s - 99.12s]

  { time: 73.08, texKey: 'ai_lord_calm_singing', label: 'Куплет 3: Только на том конце...' },

  { time: 78.80, texKey: '03_calm_over_shoulder', ambientCueKey: '03_crowd_drop1_accent', label: 'Примат-папуас: Крик толпы зрителей (акцент в сбивку барабанов)' },

  { time: 84.12, texKey: '03_calm_over_shoulder', label: 'Атака: Камера через плечо' },

  { time: 91.33, texKey: 'ai_lord_calm_singing', label: 'Куплет 3: В костюме от Гуччи' },

  // [ПЕРЕБИВКА ТОЛПЫ 2: 99.12s - 103.65s]

  { time: 99.12, texKey: '02_calm_audience_pov', label: 'Перебивка: Взгляд на толпу' },

  { time: 100.60, texKey: '01_calm_wing_profile', label: 'Боковой ракурс' },

  // [БРЕЙКДАУН / СОЛО 4: 103.65s - 138.71s]

  { time: 103.65, texKey: 'ai_lord_calm_singing', label: 'Соло: ИИ-Лорд' },

  { time: 116.08, texKey: 'ai_lord_drive_default', label: 'Соло: Тяжелый металлический проигрыш' },

  { time: 124.85, texKey: '03_calm_over_shoulder', label: 'Соло: Через плечо' },

  { time: 134.19, texKey: 'ai_lord_calm_singing', label: 'Соло: Переход к финалу' },

  // [ПЕРЕБИВКА ТОЛПЫ 3: 138.71s - 145.36s]

  { time: 138.71, texKey: '02_calm_audience_pov', label: 'Перебивка: Толпа' },

  { time: 141.82, texKey: '01_calm_wing_profile', label: 'Перебивка: Крыло' },

  // [КУПЛЕТ 5: 145.36s - 165.88s]

  { time: 145.36, texKey: 'ai_lord_calm_singing', label: 'Куплет 5: Подготовка к взрыву' },

  { time: 152.30, texKey: 'ai_lord_drive_default', label: 'Драйв: Сервоторизация!' },

  { time: 157.00, texKey: 'humanoid_zombie_smartphone_v1', label: 'Миллиард гуманоидов: Смартфон-зомби в анабиозе' },

  { time: 161.62, texKey: 'ai_lord_drive_back', label: 'Задний план: Свет софитов' },

  // [ФИНАЛЬНЫЙ ДРАЙВ И ПЕРСОНАЖИ: 165.88s - 221.45s]

  { time: 165.88, texKey: 'ai_lord_drive_default', label: 'Финальный драйв: Я вас научу!' },

  { time: 169.28, texKey: 'ai_lord_concert_extreme_low_angle', label: 'Соло: Джнгхфдбвк / Jnghfdbk' },

  // [171.00s - 173.50s] "Рыдали, как Горин на спаме вводил демоблил,"
  {
    time: 171.00,
    texKey: 'retro_film_gorin_batman_cowl_gemini_v20',
    characterName: 'Алексей Горин',
    characterRole: 'Head of Production • Верховный Надзиратель Конвейера',
    characterThemeColor: 0xffaa00,
    label: 'Горин: На спаме вводил демоблил'
  },

  // [173.50s - 176.00s] "Как Вова в чат Лонгбокс Disney слил!"
  {
    time: 173.50,
    texKey: 'retro_film_vova_khaetsky_v11',
    characterName: 'Вова Хаецкий',
    characterRole: 'Хранитель Лонгбокса Disney',
    characterThemeColor: 0x00f5d4,
    label: 'Вова: В чат Лонгбокс Disney слил'
  },

  // [176.00s - 178.50s] "Как Ева кикофф напинала отряду,"
  {
    time: 176.00,
    texKey: 'retro_film_eva_theatrical_prop_helmet_v7',
    characterName: 'Ева Аксёнова',
    characterRole: 'Production Director • Хранительница Скрижалей',
    characterThemeColor: 0xff3399,
    label: 'Ева: Кикофф напинала отряду'
  },

  // [178.50s - 181.00s] "Как Давит старый движок принял к ряду!"
  {
    time: 178.50,
    texKey: 'retro_film_davit_gazaryan_old_engine_v6',
    characterName: 'Давит Казарян',
    characterRole: 'Рыцарь Старого Движка',
    characterThemeColor: 0x33ccff,
    label: 'Давит: Старый движок принял к ряду'
  },

  // [181.00s - 184.00s] "Как клиента свиток: Одиннадцать правок! Одиннадцать будок в банке заметок!"
  {
    time: 181.00,
    texKey: 'retro_warhammer_eduard_levin_gpt_v3',
    characterName: 'Эдуард Левин',
    characterRole: 'Creative Lead • Зодчий Игрового Замысла',
    characterThemeColor: 0xff3366,
    label: 'Эдик: Свиток от клиента — 11 правок и 11 будок'
  },

  // [184.00s - 186.30s] "В десять тридцать ночи — забытых вестей:"
  {
    time: 184.00,
    texKey: 'retro_horror_film_mickey_biovat_slime_gemini_v6',
    label: 'В банке забытый томится Дисней: Стазис-биоват'
  },

  // [186.30s - 188.90s] "Сто тридцать ночей без живых новостей!" (мышь скребётся о толстый кварц)
  {
    time: 186.30,
    texKey: 'retro_horror_film_mickey_biovat_slime_gpt_v8',
    label: 'Мышь скребётся о кварц изнутри биовата'
  },

  // [188.90s - 192.60s] "Егор для Диснея пристроил отсек, чтоб мышь не тревожила век человек!"
  {
    time: 188.90,
    texKey: 'retro_film_egor_reverend_interpreter_v4',
    characterName: 'Егор Ткачёв',
    characterRole: 'Creative Director • Преподобный Толкователь Воли Клиентархов',
    characterThemeColor: 0x9933ff,
    label: 'Егор: Для Диснея пристроил отсек'
  },

  // [192.60s - 196.80s] "Как Техлид ослеп, коль забанили Клод — вслепую руками пулл-реквесты гребёт!"

  {

    time: 192.60,

    texKey: 'retro_soviet_film_pavel_playbox_logo_gpt_v4',

    characterName: 'Павел Самойленко',

    characterRole: 'CTO • Архи-Цензор Синтаксической Ереси',

    characterThemeColor: 0xff5e1a,

    label: 'Павел Самойленко: Забанили Клод, пулл-реквесты гребёт'

  },

  // [196.80s - 202.40s] "Как Толя Гранолой пытал коллег: «Пробейте мне сотку! Замедлен ваш бег!»"

  {

    time: 196.80,

    texKey: 'retro_film_tolya_gpt_v2',

    characterName: 'Толя Щербаков',

    characterRole: 'Лорд-Командор Цитадели',

    characterThemeColor: 0xffcc00,

    label: 'Толя Гранола: Пробейте мне сотку'

  },

  // [202.40s - 204.00s] "Как плейбл без проджекта едет на ощупь,"

  {

    time: 202.40,

    texKey: 'ai_lord_drive_default',

    label: 'Плейбл без проджекта едет на ощупь: Драйв'

  },

  // [204.00s - 207.00s] "Как Артём пирамиды до кости полощет!"

  {

    time: 204.00,

    texKey: 'retro_film_artem_khukhro_guyver_gemini_v19',

    characterName: 'Артём Хухро',

    characterRole: 'Lead 3D • Техноэкзорцист Графической Скверны',

    characterThemeColor: 0x00ff88,

    label: 'Артём: Пирамиды до кости полощет'

  },

  // [207.00s - 209.50s] "У Жени и Вики планшеты горят:"

  {

    time: 207.00,

    texKey: 'retro_film_zhenya_artist_real_v11',

    characterName: 'Женя',

    characterRole: 'Мастер Вечного Рендера',

    characterThemeColor: 0xffcc00,

    label: 'Женя: Планшеты горят'

  },

  // [209.50s - 212.70s] "...пятьсот перекрасок подряд!"

  {

    time: 209.50,

    texKey: 'retro_film_vika_neural_corruption_v3',

    characterName: 'Виктория Фесенко',

    characterRole: 'Верховная Настоятельница Пиксельного Канона',

    characterThemeColor: 0xff00ff,

    label: 'Вика: 500 перекрасок подряд'

  },

  // [212.70s - 221.45s] "Проглотит весь треш, словно райский нектар: «Куда слать бабло?! Заверните товар!»"

  { time: 212.70, texKey: 'ai_lord_concert_arena_wide', label: 'Апофеоз: Заверните товар!' },

  { time: 216.00, texKey: 'ai_lord_drive_default', label: 'Кульминация соло' },

  { time: 218.00, texKey: 'humanoid_zombie_smartphone_v1', label: 'Тап-капкан захлопывается' },

  // [ОКОНЧАНИЕ / OUTRO: 221.45s - 237.20s]

  { time: 221.45, texKey: 'ai_lord_concert_arena_wide', label: 'Апофеоз арены' },

  { time: 228.33, texKey: 'ai_lord_concert_extreme_low_angle', label: 'Низкий ракурс Лорда' },

  { time: 231.80, texKey: 'ai_lord_drive_default', label: 'Финал концерта' }

];

export function getConcertCutAtTime(currentTime: number): ConcertFrameCut {

  let activeCut = CONCERT_SEQUENCE_CUTS[0];

  for (let i = CONCERT_SEQUENCE_CUTS.length - 1; i >= 0; i--) {

    if (currentTime >= CONCERT_SEQUENCE_CUTS[i].time) {

      activeCut = CONCERT_SEQUENCE_CUTS[i];

      break;

    }

  }

  return activeCut;

}

