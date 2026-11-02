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
  { time: 80.00, texKey: '03_calm_over_shoulder', ambientCueKey: '03_crowd_drop1_accent', label: 'Примат-папуас: Крик толпы зрителей' },
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
  { time: 161.62, texKey: 'ai_lord_drive_back', label: 'Задний план: Свет софитов' },

  // [ФИНАЛЬНЫЙ ДРАЙВ И ПЕРСОНАЖИ: 165.88s - 221.45s]
  { time: 165.88, texKey: 'ai_lord_drive_default', label: 'Финальный драйв: Я вас научу!' },
  { time: 169.28, texKey: 'ai_lord_concert_extreme_low_angle', label: 'Соло: Джнгхфдбвк / Jnghfdbk' },

  // [171.00s - 176.00s] "Рыдали, как Горин на спаме вводил демоблил, Как Вова в чат Лонгбокс Disney слил!"
  {
    time: 171.00,
    texKey: 'retro_film_gorin_batman_cowl_gemini_v20',
    characterName: 'Алексей Горин',
    characterRole: 'Верховный Надзиратель Конвейера',
    characterThemeColor: 0xffaa00,
    label: 'Горин: На спаме вводил демоблил'
  },
  {
    time: 173.50,
    texKey: 'retro_film_vova_khaetsky_v11',
    characterName: 'Вова Хаецкий',
    characterRole: 'Хранитель Лонгбокса Disney',
    characterThemeColor: 0x00f5d4,
    label: 'Вова: В чат Лонгбокс Disney слил'
  },

  // [176.00s - 181.00s] "Как Ева кикофф напинала отряду, Как Давит старый движок принял к ряду!"
  {
    time: 176.00,
    texKey: 'retro_film_eva_theatrical_prop_helmet_v7',
    characterName: 'Ева Аксёнова',
    characterRole: 'Главная Хранительница Скрижалей и Сроков',
    characterThemeColor: 0xff3399,
    label: 'Ева: Кикофф напинала отряду'
  },
  {
    time: 178.50,
    texKey: 'retro_film_davit_gazaryan_old_engine_v6',
    characterName: 'Давит Казарян',
    characterRole: 'Архивариус Забытых Движков',
    characterThemeColor: 0x33ccff,
    label: 'Давит: Старый движок принял к ряду'
  },

  // [181.00s - 184.80s] "Как клиента свиток: Одиннадцать правок! Одиннадцать будок в банке заметок!"
  // Про персонажа тут ничего нет: показываем залп правок Клиентархов, БЕЗ плашки персонажа
  {
    time: 181.00,
    texKey: 'retro_film_clientarch_fleet_revisions_volley_v1',
    label: 'Свиток Клиентархов: 11 правок и 11 будок'
  },

  // [184.80s - 190.50s] "В десять тридцать ночи — забытых вестей: Егор для Диснея пристроил отсек! Чтобы мышь не тревожила век человеку!"
  // Правило: Сначала Егор (чтоб на момент его имени он уже был на экране!), а затем иллюстрация отсека
  {
    time: 184.80,
    texKey: 'retro_film_egor_reverend_interpreter_v4',
    characterName: 'Егор Ткачёв',
    characterRole: 'Преподобный Толкователь Воли Клиентархов',
    characterThemeColor: 0x9933ff,
    label: 'Егор: В десять тридцать ночи весть'
  },
  {
    time: 187.80,
    texKey: 'retro_horror_film_mickey_catacomb_stasis_wide_gemini_v1',
    label: 'Отсек для Диснея: Мышь в стазисе'
  },

  // [190.50s - 195.50s] "Как Тимлида Самойленко блокирнул Клод — вслепую руками пулл-реквесты гребёт!"
  {
    time: 190.50,
    texKey: 'retro_soviet_film_pavel_playbox_logo_gpt_v4',
    characterName: 'Павел Самойленко',
    characterRole: 'Архи-Цензор Синтаксической Ереси',
    characterThemeColor: 0xff5e1a,
    label: 'Павел Самойленко: Клод блокирнул'
  },

  // [195.50s - 202.00s] "Как Толя Гранолой пытает коллег: «Пробейте мне сотку! Замедлен ваш бег!» Как плейбл без проджекта едет на ощупь,"
  {
    time: 195.50,
    texKey: 'retro_film_tolya_gpt_v2',
    characterName: 'Толя Щербаков',
    characterRole: 'Лорд-Командор Цитадели',
    characterThemeColor: 0xe60000,
    label: 'Толя: Пробейте мне сотку!'
  },
  {
    time: 199.50,
    texKey: 'ai_lord_drive_default',
    label: 'Плейбл без проджекта едет на ощупь: Драйв'
  },

  // [202.00s - 209.50s] "Как Артём пирамиды до кости полощет! У Жени и Вики планшеты горят: Сто кнопок, пятьсот перекрасок подряд!"
  {
    time: 202.00,
    texKey: 'retro_film_artem_khukhro_guyver_gemini_v19',
    characterName: 'Артём Хухро',
    characterRole: 'Техноэкзорцист Графической Скверны',
    characterThemeColor: 0x00ff88,
    label: 'Артём: Пирамиды до кости полощет'
  },
  {
    time: 205.50,
    texKey: 'retro_film_zhenya_artist_real_v11',
    characterName: 'Женя',
    characterRole: 'Мастер Вечного Рендера',
    characterThemeColor: 0xffcc00,
    label: 'Женя: Планшеты горят'
  },
  {
    time: 207.50,
    texKey: 'retro_film_vika_neural_corruption_v3',
    characterName: 'Виктория Фесенко',
    characterRole: 'Верховная Настоятельница Пиксельного Канона',
    characterThemeColor: 0xff00ff,
    label: 'Вика: 500 перекрасок подряд'
  },

  // [209.50s - 221.45s] "Проглотит весь треш, словно райский нектар: «Куда слать бабло?! Заверните товар!»"
  { time: 209.50, texKey: 'ai_lord_concert_arena_wide', label: 'Апофеоз: Заверните товар!' },
  { time: 216.11, texKey: 'ai_lord_drive_default', label: 'Кульминация соло' },
  { time: 218.60, texKey: 'ai_lord_drive_default', label: 'Тап-капкан' },

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
