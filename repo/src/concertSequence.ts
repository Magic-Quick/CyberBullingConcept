export interface ConcertFrameCut {
  time: number;
  texKey: string;
  label: string;
}

/**
 * AI-LORD ROCK CONCERT MONTAGE SEQUENCE (1970s Retro Practical Style)
 * Precision calibrated by Miniaudio + Scipy acoustic onset analysis of servotorization.mp3.
 * Detailed documentation: media/visual/generated/ai_lord_concert_sequence_latest/Нужный стиль/EMOTIONAL_DYNAMICS_AND_TIMINGS.md
 * 
 * Assets:
 * - Обычная часть по умолчанию: ai_lord_calm_singing (ИИ лорд поет)
 * - Драйв по умолчанию самый частый: ai_lord_drive_default (769e4f0d)
 * - Спокойный пролёт камеры в зале: 02_calm_audience_pov
 * - Подъёмный пролёт над стадионом (насыщенный золотой свет): ai_lord_concert_arena_wide
 * - Профиль из кулисы: 01_calm_wing_profile
 * - Спокойно через плечо в зал: 03_calm_over_shoulder
 * - Экстремальный нижний ракурс на бас и руки: ai_lord_concert_extreme_low_angle
 * - Драйвовый вид со спины в софитах: ai_lord_drive_back (d9d9ba77)
 */
export const CONCERT_SEQUENCE_CUTS: ConcertFrameCut[] = [
  // [ИНТРО: 0.00s - 36.46s] Обычная игра на гитаре (ИИ лорд поёт - мягкий ламповый свет)
  // [ЗАЯВОЧНЫЙ ПЛАН: 0.00s - 4.50s] Панорама стадиона и арены в золотом свете (плавный вход в концерт)
  { time: 0.00, texKey: 'ai_lord_concert_arena_wide', label: 'Заявочный план: Панорама концертной арены и ревущего стадиона' },
  // [ИНТРО: 4.50s - 36.46s] Вход в куплет — ИИ лорд поёт на сцене
  { time: 4.50, texKey: 'ai_lord_calm_singing', label: 'Интро: ИИ-Лорд поёт (обычная игра)' },

  // [ПРОИГРЫШ БЕЗ СЛОВ 1 (СПОКОЙНАЯ ЧАСТЬ): 36.46s - 45.87s]
  // Спокойный кадр пролёта камеры в зале: 02_calm_audience_pov
  { time: 36.46, texKey: '02_calm_audience_pov', label: 'Проигрыш: Спокойный пролёт камеры в зале' },
  { time: 41.32, texKey: '01_calm_wing_profile', label: 'Проигрыш: Профиль со сцены из кулисы' },

  // [КУПЛЕТ 1 & 2: 45.87s - 73.08s] "Вы дрожите от страха..." -> "Да я б вырезал плоть..."
  { time: 45.87, texKey: 'ai_lord_calm_singing', label: 'Куплет 1: Обычная игра на гитаре' },
  { time: 55.11, texKey: 'ai_lord_drive_default', label: 'Дроп 1: В металл заварил бы вас! (Драйв в насыщенном свете)' },
  { time: 57.23, texKey: '01_calm_wing_profile', label: 'Куплет 1: Спад в кулису (Чтоб спать на созвонах)' },
  { time: 65.16, texKey: 'ai_lord_calm_singing', label: 'Куплет 2: Обычная игра на гитаре' },

  // [КУПЛЕТ 3: 73.08s - 99.12s] "Только на том конце..." -> Клиентарх
  { time: 73.08, texKey: 'ai_lord_calm_singing', label: 'Куплет 3: Цепь продаж' },
  { time: 84.12, texKey: '03_calm_over_shoulder', label: 'Перебивка: Спокойно через плечо в зал' },
  { time: 91.33, texKey: 'ai_lord_calm_singing', label: 'Куплет 3: Чистая структура' },

  // [ПРОИГРЫШ БЕЗ СЛОВ 2 (СПОКОЙНАЯ ЧАСТЬ): 99.12s - 103.65s] Перед припевом
  // Спокойный кадр пролёта камеры в зале: 02_calm_audience_pov
  { time: 99.12, texKey: '02_calm_audience_pov', label: 'Проигрыш: Спокойный зал перед припевом' },
  { time: 100.60, texKey: '01_calm_wing_profile', label: 'Сбивка: Профиль из кулисы' },

  // [ПРИПЕВ / КУПЛЕТ 4: 103.65s - 138.71s] Экономика страдания
  { time: 103.65, texKey: 'ai_lord_calm_singing', label: 'Припев: Валюта одна' },
  { time: 116.08, texKey: 'ai_lord_drive_default', label: 'Подъем: Ему нужно страданье! (Драйв в насыщенном свете)' },
  { time: 124.85, texKey: '03_calm_over_shoulder', label: 'Перебивка: Если креатор в ночь' },
  { time: 134.19, texKey: 'ai_lord_calm_singing', label: 'Припев: Пятьдесят итераций' },

  // [ПРОИГРЫШ БЕЗ СЛОВ 3 (СПОКОЙНАЯ ЧАСТЬ): 138.71s - 145.36s] Перед разгоном
  // Спокойный кадр пролёта камеры в зале: 02_calm_audience_pov
  { time: 138.71, texKey: '02_calm_audience_pov', label: 'Проигрыш: Спокойный зал перед безумием' },
  { time: 141.82, texKey: '01_calm_wing_profile', label: 'Проигрыш: Профиль сцены' },

  // [КУПЛЕТ 5: 145.36s - 165.88s] Разгон (Корова с лазером, цирк шапито)
  { time: 145.36, texKey: 'ai_lord_calm_singing', label: 'Куплет 5: Старт разгона' },
  { time: 152.30, texKey: 'ai_lord_drive_default', label: 'Разгон: Корова с лазером! (Драйв)' },
  { time: 161.62, texKey: 'ai_lord_drive_back', label: 'Перебивка: Этот цирк шапито (Со спины в лучах)' },

  // [ФИНАЛЬНЫЙ ПИК: 165.88s - 221.45s] УСКОРЕНИЕ ТЕМПА / ДИКИЙ СОЛЯК / РОЛЛ-КОЛЛ КОМАНДЫ
  // Кинематографическая раскадровка: точные врезки членов команды по канону Fin на каждом ударе бита
  { time: 165.88, texKey: 'ai_lord_drive_default', label: 'ЯРОСТНЫЙ ПИК: Ему подавай! (Драйв)' },
  { time: 169.28, texKey: 'ai_lord_concert_extreme_low_angle', label: 'Удар: Демоблил / Jnghfdbk (Снизу на бас)' },
  { time: 171.00, texKey: 'retro_film_vova_khaetsky_v11', label: 'Вова Хаецкий слил Disney' },
  { time: 174.94, texKey: 'retro_film_eva_theatrical_prop_helmet_v7', label: 'Ева в бутафорском шлеме: кикофф' },
  { time: 178.00, texKey: 'retro_film_davit_gazaryan_old_engine_v6', label: 'Давит старый движок принял к ряду' },
  { time: 180.61, texKey: 'retro_warhammer_eduard_levin_gpt_v3', label: 'Эдик 11 правок: у Эдика боль!' },
  { time: 184.50, texKey: 'retro_horror_film_egor_mickey_vat_v14', label: 'Егор Ткачёв у биочана с Микки' },
  { time: 188.53, texKey: 'retro_horror_film_mickey_catacomb_stasis_wide_gemini_v1', label: 'Мышь Диснея в стазисе' },
  { time: 192.59, texKey: 'retro_soviet_film_pavel_playbox_logo_gpt_v4', label: 'Павел гребёт пулл-реквесты' },
  { time: 197.47, texKey: 'retro_film_tolya_gpt_v2', label: 'Толя с гранолой: Пробейте сотку!' },
  { time: 202.00, texKey: 'retro_film_artem_khukhro_guyver_gemini_v19', label: 'Артём пирамиды до кости полощет' },
  { time: 205.50, texKey: 'retro_film_zhenya_artist_real_v11', label: 'Женя: планшеты горят!' },
  { time: 208.50, texKey: 'retro_film_vika_neural_corruption_v3', label: 'Вика: 500 перекрасок!' },
  { time: 211.64, texKey: 'ai_lord_concert_arena_wide', label: 'Подъём: Пролёт камеры над стадионом (Куда слать бабло?!)' },
  { time: 216.11, texKey: 'ai_lord_drive_default', label: 'ЯРОСТНЫЙ ПИК: Тап-капкан!' },
  { time: 218.60, texKey: 'ai_lord_drive_default', label: 'ФИНАЛЬНЫЙ РЫВОК: Финал концерта' },

  // [АПОФЕОЗ / OUTRO: 221.45s - 237.20s] Гитарный соляк, фидбек и рёв стадиона
  { time: 221.45, texKey: 'ai_lord_concert_arena_wide', label: 'Апофеоз: Эпический пролёт над стадионом' },
  { time: 228.33, texKey: 'ai_lord_concert_extreme_low_angle', label: 'Финал: Экстремальный нижний ракурс на бас' },
  { time: 231.80, texKey: 'ai_lord_drive_default', label: 'Финал: ИИ-Лорд в триумфальном драйве' }
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
