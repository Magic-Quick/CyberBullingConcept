/**
 * PremiereAudioDirector.ts
 * ============================================================================
 * Полноэкранная / широкоформатная студия аудио-режиссуры в стиле Adobe Premiere Pro.
 * 
 * ВОЗМОЖНОСТИ:
 * 1. Широкая линия таймлайна на весь экран с разметкой времени (Adobe Premiere Timeline).
 * 2. Выделение отрезков (Clips Selection) по клику.
 * 3. Перетаскивание начала и конца (Trimming Handles) с точностью до десятых долей секунды.
 * 4. Перетаскивание всего отрезка по таймлайну (Clip Drag & Move).
 * 5. Кнопка «Заменить трек» (Track Replacement) с окном предпрослушивания и выбора альтернатив.
 * 6. Кнопка «Скопировать конфиг» (Copy Config) для быстрой фиксации в коде через буфер обмена.
 * 7. Кнопка «Сохранить» (Save to LocalStorage) для сохранения правок между перезагрузками.
 * ============================================================================
 */

import { AmbientManager } from './AmbientManager';
import { getAudioUrl } from './assetsManager';
import { STORY_ACTS } from './storyData';
import { NARRATOR_CUTS, NarratorShotCut } from './narratorShotSequence';
import { CONCERT_SEQUENCE_CUTS } from './concertSequence';

const INTRO_SHOTS: { time: number; label: string; type?: string }[] = [
  { time: 0.0, label: '📄 Дисклеймер ИИ', type: 'event_illustration' },
  { time: 8.0, label: '💀 Playbox Studios (Череп)', type: 'event_illustration' },
  { time: 13.0, label: '📜 Представляет', type: 'event_illustration' },
  { time: 24.0, label: '🌌 Дроп логотипа / Звёзды', type: 'event_illustration' },
];

export interface PremiereCue {
  id: string;
  actId: string;
  type: 'dread' | 'peace' | 'ambient' | 'screamer';
  cueKey: string;
  title: string;
  startTime: number;
  duration: number;
  duckAmbientTo?: number;
  customGain?: number;
}

export interface TrackOption {
  key: string;
  name: string;
  category: 'dread' | 'peace' | 'ambient' | 'screamer';
  durationSec: number;
  description: string;
}

// ============================================================================
// КАТАЛОГ ВСЕХ ДОСТУПНЫХ АЛЬТЕРНАТИВ ТРЕКОВ
// ============================================================================
export const FIN_TRANSITION_KEYS = [
  'trailer_tension_riser_to_brutal_cut',
  'trailer_braam_sub_drop',
  'melodic_tension_mournful_vocal_drone',
];

export const AVAILABLE_TRANSITION_OPTIONS: TrackOption[] = [
  {
    key: 'random',
    name: '🎲 Случайный выбор (Рандом Fin)',
    category: 'ambient',
    durationSec: 3.5,
    description: 'При каждом переходе со шторкой случайно выбирается один из утверждённых звуков Fin'
  },
  {
    key: 'trailer_tension_riser_to_brutal_cut',
    name: '★ ⚡ Резкий Райзер к обрыву (Fin)',
    category: 'ambient',
    durationSec: 7.5,
    description: 'Нарастающий свист напряжения, обрывающийся в тишину (Утверждено в Fin)'
  },
  {
    key: 'trailer_braam_sub_drop',
    name: '★ ⚡ Саб-Дроп Брам (Sub-Drop Braam) (Fin)',
    category: 'ambient',
    durationSec: 8.0,
    description: 'Глубокий низкочастотный бас-дроп перехода (Утверждено в Fin)'
  },
  {
    key: 'melodic_tension_mournful_vocal_drone',
    name: '★ ⚡ Траурный Вокал (Vocal Drone) (Fin)',
    category: 'ambient',
    durationSec: 8.0,
    description: 'Глубокий аналоговый вокализ перехода (Утверждено в Fin)'
  },
  {
    key: 'braam_titan_warhorn_doom',
    name: '⚡ Титанический Вархорн (Titan Warhorn)',
    category: 'ambient',
    durationSec: 8.0,
    description: 'Исполинский кинотеатральный рев шлюзов ковчега'
  },
  {
    key: 'melodic_tension_french_horn_minor_swell',
    name: '⚡ Валторна (French Horn Swell)',
    category: 'ambient',
    durationSec: 3.5,
    description: 'Классический оркестровый киношный переход (George Lucas 70s)'
  },
  {
    key: 'braam_analog_synth_pitch_drop',
    name: '⚡ Аналоговый Синт (Pitch Drop)',
    category: 'ambient',
    durationSec: 10.0,
    description: 'Тяжелый аналоговый синтезаторный питч-дроп'
  },
  {
    key: 'trailer_reese_bass_distortion_hit',
    name: '⚡ Риз-Бас Хит (Reese Bass Hit)',
    category: 'ambient',
    durationSec: 6.0,
    description: 'Плотный дисторшн-удар трейлера'
  },
  {
    key: 'trailer_industrial_anvil_slam',
    name: '⚡ Индустриальная Наковальня',
    category: 'ambient',
    durationSec: 8.0,
    description: 'Тяжелый удар заводской наковальни'
  },
  {
    key: 'trailer_dissonant_warp_stinger',
    name: '⚡ Варп-Стингер (Warp Stinger)',
    category: 'ambient',
    durationSec: 6.5,
    description: 'Диссонирующий космический варп-звук'
  },
  {
    key: 'trailer_pneumatic_gate_crush',
    name: '⚡ Пневмошлюз (Gate Crush)',
    category: 'ambient',
    durationSec: 6.0,
    description: 'Скрежет тяжелого пневматического шлюза'
  },
  {
    key: 'braam_reactor_turbine_overdrive',
    name: '⚡ Турбина Реактора (Взвыв)',
    category: 'ambient',
    durationSec: 8.0,
    description: 'Разгон и перегрузка турбин реактора'
  },
  {
    key: 'braam_seismic_tectonic_rumble',
    name: '⚡ Сейсмический Гул',
    category: 'ambient',
    durationSec: 12.0,
    description: 'Тектонический низкочастотный рокот'
  },
  {
    key: 'braam_triple_pulse_staccato',
    name: '⚡ Тройной Пульс Стаккато',
    category: 'ambient',
    durationSec: 8.0,
    description: 'Ритмичный пульсирующий аккорд'
  },
  {
    key: 'melodic_tension_blade_runner_synth_drop',
    name: '⚡ Неоновый Синт Blade Runner',
    category: 'ambient',
    durationSec: 8.0,
    description: 'Теплый винтажный синт Вангелиса'
  },
  {
    key: 'melodic_tension_dark_cello_bend_braam',
    name: '⚡ Темный Бенд Виолончели',
    category: 'ambient',
    durationSec: 8.0,
    description: 'Трагический глиссандо виолончели'
  },
];

export const DEFAULT_TRANSITIONS_BY_ACT: Record<string, string> = {
  prologue_space: 'random',
  act_1_convent: 'trailer_tension_riser_to_brutal_cut',
  act_2_sarcophagus: 'trailer_braam_sub_drop',
  act_3_timemachine: 'melodic_tension_mournful_vocal_drone',
  act_4_engine: 'trailer_braam_sub_drop',
  act_5_clientarchs: 'trailer_tension_riser_to_brutal_cut',
  act_6_punishment: 'trailer_braam_sub_drop',
  act_6_reward: 'melodic_tension_mournful_vocal_drone',
  act_8_outro: 'trailer_braam_sub_drop',
};

export const AVAILABLE_TRACK_OPTIONS: TrackOption[] = [
  // --- 💀 НАГНЕТАНИЕ И ТРЕВОГА (DREAD / CINEMATIC TRAILER TENSION) ---
  {
    key: 'braam_analog_synth_pitch_drop',
    name: '💀 Цифровой наркотик (Аналоговый Синт)',
    category: 'dread',
    durationSec: 10.0,
    description: 'Тяжелый аналоговый синтезаторный питч-дроп 30-секундной зависимости'
  },
  {
    key: 'trailer_tension_riser_to_brutal_cut',
    name: '💀 Нагнетающий Райзер к обрыву',
    category: 'dread',
    durationSec: 7.5,
    description: 'Нарастающий свист напряжения, обрывающийся в абсолютную тишину'
  },
  {
    key: 'braam_titan_warhorn_doom',
    name: '💀 Горн Судного Дня (Titan Warhorn)',
    category: 'dread',
    durationSec: 8.0,
    description: 'Исполинский кинотеатральный рев браама титанического ковчега'
  },
  {
    key: 'trailer_braam_sub_drop',
    name: '💀 Саб-Дроп Брам (Sub-Drop Braam)',
    category: 'dread',
    durationSec: 8.0,
    description: 'Глубокий инфернальный бас-дроп для шок-моментов'
  },
  {
    key: 'trailer_reese_bass_distortion_hit',
    name: '💀 Перегруженный Рис-Бас (Reese Bass Hit)',
    category: 'dread',
    durationSec: 6.0,
    description: 'Рвущий перепонки аналоговый синтезаторный удар трейлера'
  },
  {
    key: 'braam_reactor_turbine_overdrive',
    name: '💀 Турбина Реактора (Взвыв)',
    category: 'dread',
    durationSec: 8.0,
    description: 'Взвыв локального хроно-реактора и искривление времени'
  },
  {
    key: 'trailer_industrial_anvil_slam',
    name: '💀 Индустриальная Наковальня (Anvil Slam)',
    category: 'dread',
    durationSec: 8.0,
    description: 'Удар молота трибунала и тяжелое эхо заводского цеха'
  },
  {
    key: 'trailer_dissonant_warp_stinger',
    name: '💀 Диссонирующий Варп-Стингер',
    category: 'dread',
    durationSec: 6.5,
    description: 'Минное поле и темный клаустрофобный саспенс'
  },
  {
    key: 'trailer_pneumatic_gate_crush',
    name: '💀 Пневмошлюз / Сервисная игла (Gate Crush)',
    category: 'dread',
    durationSec: 6.0,
    description: 'Удар сервисной иглы пневмодозатора: кипящий концентрат в вену'
  },
  {
    key: 'braam_seismic_tectonic_rumble',
    name: '💀 Сейсмический Грохот (Tectonic Rumble)',
    category: 'dread',
    durationSec: 12.0,
    description: 'Дрожание палуб под напором многотысячного флота'
  },
  {
    key: 'braam_triple_pulse_staccato',
    name: '💀 Тройной Пульс Стаккато',
    category: 'dread',
    durationSec: 8.0,
    description: 'Синхронный стаккато-удар аварийных систем'
  },
  {
    key: 'melodic_tension_dark_cello_bend_braam',
    name: '💀 Темный Бенд Виолончели',
    category: 'dread',
    durationSec: 8.0,
    description: 'Трагический диссонирующий спад струнных'
  },
  {
    key: 'dread_03_predator_instant_terror_drop_25s',
    name: '💀 Мгновенный Дроп Ужаса (Predator Terror) 25s',
    category: 'dread',
    durationSec: 25.0,
    description: 'Эмбиент напряжения — инстантный обрыв в клаустрофобную тишину хищника'
  },
  {
    key: 'dread_04_predator_chittering_nightmare_25s',
    name: '💀 Хитиновый Кошмар (Chittering Nightmare) 25s',
    category: 'dread',
    durationSec: 25.0,
    description: 'Эмбиент напряжения — скрежет и скрип биоформы в темноте'
  },
  {
    key: 'dread_05_rust_and_bone_maximum_grimdark_25s',
    name: '💀 Ржавчина и Кость (Maximum Grimdark) 25s',
    category: 'dread',
    durationSec: 25.0,
    description: 'Эмбиент напряжения — максимальный гримдарк, индустриальное запустение и отчаяние'
  },
  {
    key: 'dread_10_predator_nightmare_drop_52s',
    name: '💀 Кошмар Хищника (Nightmare Drop) 52s',
    category: 'dread',
    durationSec: 52.0,
    description: 'Длинный эмбиент напряжения — клаустрофобный дроп ужаса и медленная агония'
  },
  {
    key: 'dread_11_morlock_war_march_climax_50s',
    name: '💀 Марш Морлоков (Кульминация Войны) 50s',
    category: 'dread',
    durationSec: 50.0,
    description: 'Длинный эмбиент напряжения — тяжелый марш 90-х, сокрушительные наковальни и басовый дроп'
  },

  // --- 🕊️ ДОБРАЯ МУЗЫКА И ОБЛЕГЧЕНИЕ (PEACE / RESOLUTION) ---
  {
    key: 'peace_01_pin_drop_silence_pure_calm_25s',
    name: '🕊️ Кристальная тишина и покой',
    category: 'peace',
    durationSec: 25.0,
    description: 'Абсолютный покой, теплые эмбиент-пады без диссонансов'
  },
  {
    key: 'peace_02_pin_drop_silence_warm_melody_30s',
    name: '🕊️ Теплая мелодия умиротворения',
    category: 'peace',
    durationSec: 30.0,
    description: 'Мягкий акустический резонанс, глубокое облегчение'
  },
  {
    key: 'peace_03_pin_drop_silence_gentle_resolution_25s',
    name: '🕊️ Нежное разрешение (Благодать Эдика)',
    category: 'peace',
    durationSec: 25.0,
    description: 'Идеальный твист облегчения после бюрократического кошмара'
  },
  {
    key: 'peace_04_chronicles_playbox_heavenly_vocalise_30s',
    name: '🕊️ Небесный вокализ Плейбокса',
    category: 'peace',
    durationSec: 30.0,
    description: 'Ангельский женский вокал, светлое парение над бездной'
  },
  {
    key: 'peace_05_chronicles_playbox_uplifting_pads_30s',
    name: '🕊️ Воодушевляющие пады надежды',
    category: 'peace',
    durationSec: 30.0,
    description: 'Мажорные теплые синты, дающие зрителю передохнуть'
  },
  {
    key: 'peace_06_chronicles_playbox_warm_culmination_25s',
    name: '🕊️ Теплая кульминация милости',
    category: 'peace',
    durationSec: 25.0,
    description: 'Мягкий восходящий аккорд высшей награды'
  },
  {
    key: 'peace_08_pin_drop_silence_reward_grace_60s',
    name: '🕊️ Печенька благодати (Высшая милость)',
    category: 'peace',
    durationSec: 60.0,
    description: 'Длинная 60-секундная симфония абсолютного корпоративного спасения'
  },
  {
    key: 'melodic_tension_blade_runner_synth_drop',
    name: '🕊️ Неоновый синт Бегущего по лезвию',
    category: 'peace',
    durationSec: 8.0,
    description: 'Аналоговый ретро-синтезатор Vangelis с теплым шлейфом'
  },

  // --- 📻 БАЗОВЫЙ ЭМБИЕНТ (BASE AMBIENT) ---
  {
    key: 'desolate_cry',
    name: '📻 Desolate Cry (Пустынный вопль)',
    category: 'ambient',
    durationSec: 120.0,
    description: 'Атмосферный темный гул бездны с мощным акцентом на 24с'
  },
  {
    key: 'titan_forge',
    name: '📻 Titan Forge (Кузница Титанов)',
    category: 'ambient',
    durationSec: 120.0,
    description: 'Индустриальный ритмичный гул тяжелых фабричных реакторов'
  },
  {
    key: 'clean_playrium',
    name: '📻 Чистый Плеериум (Clean Playrium)',
    category: 'ambient',
    durationSec: 98.0,
    description: 'Химический фоновый пульс цеха варки'
  },
  {
    key: 'chronicles_ambient',
    name: '📻 Хроники Плейбокса (Chronicles Ambient)',
    category: 'ambient',
    durationSec: 180.0,
    description: 'Космический глубокий эмбиент дрейфа Цитадели'
  },
  {
    key: 'rust_and_bone_1',
    name: '📻 Ржавчина и кость (Rust & Bone)',
    category: 'ambient',
    durationSec: 103.0,
    description: 'Мрачная металлическая подложка нижних палуб'
  }
];

// =========================================================================
// АУДИО-КОНФИГУРАЦИЯ ДЛЯ АКТА: act_4_engine (Длительность: 161.31s)
// Сгенерировано в Adobe Premiere Audio Director • Playbox Studios
// =========================================================================
export const ACT_4_ENGINE_AUDIO_CUES = [
  {
    "id": "cue_act4_morlock_march",
    "actId": "act_4_engine",
    "type": "dread",
    "cueKey": "dread_10_predator_nightmare_drop_52s",
    "title": "💀 Кошмар Хищника (Nightmare Drop) 52s",
    "startTime": 4.5,
    "duration": 50,
    "duckAmbientTo": 0.005
  },
  {
    "id": "cue_act4_khukhro_peace",
    "actId": "act_4_engine",
    "type": "peace",
    "cueKey": "peace_01_pin_drop_silence_pure_calm_25s",
    "title": "🕊️ Добрая передышка Хухро (240 сек)",
    "startTime": 103.6,
    "duration": 30,
    "duckAmbientTo": 0
  }
];

// =========================================================================
// АУДИО-КОНФИГУРАЦИЯ ДЛЯ АКТА: act_8_outro (Длительность: 53.42s)
// Сгенерировано в Adobe Premiere Audio Director • Playbox Studios
// =========================================================================
export const ACT_8_OUTRO_AUDIO_CUES: PremiereCue[] = [
  {
    id: "cue_act8_outro_terror",
    actId: "act_8_outro",
    type: "dread",
    cueKey: "trailer_braam_sub_drop",
    title: "💀 Финальный слепой старт (Саб-Дроп Брам)",
    startTime: 48.9,
    duration: 4.5,
    duckAmbientTo: 0.005
  }
];

// ============================================================================
// БАЗОВЫЕ НАЧАЛЬНЫЕ ОТРЕЗКИ ПО АКТАМ
// ============================================================================
const DEFAULT_INITIAL_CUES: Record<string, PremiereCue[]> = {
  "intro_playbox": [],
  "prologue_space": [
    {
      "id": "cue_prologue_warp_daemon_screamer",
      "actId": "prologue_space",
      "type": "screamer",
      "cueKey": "trailer_dissonant_warp_stinger",
      "title": "⚡ Скример: Ледяной шепот духа полишинга",
      "startTime": 175.74,
      "duration": 5,
      "duckAmbientTo": 1,
      "customGain": 1.25
    },
    {
      "id": "cue_prologue_shutters_slam_screamer",
      "actId": "prologue_space",
      "type": "screamer",
      "cueKey": "trailer_pneumatic_gate_crush",
      "title": "⚡ Скример: Бронированные жалюзи башни",
      "startTime": 211.06,
      "duration": 4.5,
      "duckAmbientTo": 1,
      "customGain": 1.3
    }
  ],
  "act_1_convent": [
    {
      "id": "cue_act1_drug",
      "actId": "act_1_convent",
      "type": "dread",
      "cueKey": "braam_analog_synth_pitch_drop",
      "title": "💀 Цифровой наркотик (Аналоговый Синт)",
      "startTime": 17.14,
      "duration": 10,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act1_zombie_screamer",
      "actId": "act_1_convent",
      "type": "screamer",
      "cueKey": "trailer_reese_bass_distortion_hit",
      "title": "⚡ Скример: Гуманоид в гипнозе смартфона",
      "startTime": 68,
      "duration": 5.5,
      "duckAmbientTo": 1,
      "customGain": 1.3
    },
    {
      "id": "cue_act1_fleet_salvo_screamer",
      "actId": "act_1_convent",
      "type": "screamer",
      "cueKey": "braam_titan_warhorn_doom",
      "title": "⚡ Скример: Залпы батарей правок",
      "startTime": 87.5,
      "duration": 6,
      "duckAmbientTo": 1,
      "customGain": 1.35
    }
  ],
  "act_2_sarcophagus": [
    {
      "id": "cue_act2_terror_drop",
      "actId": "act_2_sarcophagus",
      "type": "dread",
      "cueKey": "dread_03_predator_instant_terror_drop_25s",
      "title": "💀 Мгновенный Дроп Ужаса (Predator Terror) 25s",
      "startTime": 45.58,
      "duration": 25,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act2_space_freeze_screamer",
      "actId": "act_2_sarcophagus",
      "type": "screamer",
      "cueKey": "trailer_braam_sub_drop",
      "title": "⚡ Скример: Совет директоров выпрыгивает в шлюз",
      "startTime": 45.58,
      "duration": 6.5,
      "duckAmbientTo": 1,
      "customGain": 1.3
    },
    {
      "id": "cue_act2_mickey_reveal_screamer",
      "actId": "act_2_sarcophagus",
      "type": "screamer",
      "cueKey": "trailer_industrial_anvil_slam",
      "title": "💀 Индустриальная Наковальня (Anvil Slam)",
      "startTime": 174.27,
      "duration": 3.5,
      "duckAmbientTo": 1,
      "customGain": 1.35
    },
    {
      "id": "cue_1793975211161",
      "actId": "act_2_sarcophagus",
      "type": "dread",
      "cueKey": "dread_10_predator_nightmare_drop_52s",
      "title": "💀 Кошмар Хищника (Nightmare Drop) 52s",
      "startTime": 136.5,
      "duration": 48,
      "duckAmbientTo": 0.005,
      "customGain": 1
    },
    {
      "id": "cue_1793975454323",
      "actId": "act_2_sarcophagus",
      "type": "dread",
      "cueKey": "dread_10_predator_nightmare_drop_52s",
      "title": "💀 Кошмар Хищника (Nightmare Drop) 52s",
      "startTime": 184.9,
      "duration": 25.1,
      "duckAmbientTo": 0.005,
      "customGain": 1
    }
  ],
  "act_3_timemachine": [
    {
      "id": "cue_act3_corpse_screamer",
      "actId": "act_3_timemachine",
      "type": "screamer",
      "cueKey": "trailer_tension_riser_to_brutal_cut",
      "title": "⚡ Скример: Застывший кодер со шлангом на полу",
      "startTime": 54.5,
      "duration": 6.5,
      "duckAmbientTo": 1.0,
      "customGain": 1.3
    },
    {
      "id": "cue_act3_peace_edik",
      "actId": "act_3_timemachine",
      "type": "peace",
      "cueKey": "peace_03_pin_drop_silence_gentle_resolution_25s",
      "title": "🕊️ Нежное разрешение (Благодать Эдика)",
      "startTime": 108.62,
      "duration": 25.0,
      "duckAmbientTo": 0.0
    },
    {
      "id": "cue_act3_chronoreactor",
      "actId": "act_3_timemachine",
      "type": "dread",
      "cueKey": "braam_reactor_turbine_overdrive",
      "title": "💀 Взвыв хронореактора (Турбина Overdrive)",
      "startTime": 112.0,
      "duration": 8.0,
      "duckAmbientTo": 0.005
    }
  ],
  "act_4_engine": [
    {
      "id": "cue_act4_morlock_march",
      "actId": "act_4_engine",
      "type": "dread",
      "cueKey": "dread_10_predator_nightmare_drop_52s",
      "title": "💀 Кошмар Хищника (Nightmare Drop) 52s",
      "startTime": 4.5,
      "duration": 50,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act4_teeth_horror_screamer",
      "actId": "act_4_engine",
      "type": "screamer",
      "cueKey": "trailer_industrial_anvil_slam",
      "title": "⚡ Скример: Оскал человеческих зубов и плесени",
      "startTime": 10.2,
      "duration": 5.5,
      "duckAmbientTo": 1,
      "customGain": 1.35
    },
    {
      "id": "cue_act4_facehuggers_screamer",
      "actId": "act_4_engine",
      "type": "screamer",
      "cueKey": "trailer_reese_bass_distortion_hit",
      "title": "⚡ Скример: Личинки на чипах — 346 мутантов",
      "startTime": 25.14,
      "duration": 5,
      "duckAmbientTo": 1,
      "customGain": 1.3
    },
    {
      "id": "cue_act4_khukhro_peace",
      "actId": "act_4_engine",
      "type": "peace",
      "cueKey": "peace_03_pin_drop_silence_gentle_resolution_25s",
      "title": "🕊️ Нежное разрешение (Благодать Эдика)",
      "startTime": 135.8,
      "duration": 25.5,
      "duckAmbientTo": 0
    },
    {
      "id": "cue_1793975649566",
      "actId": "act_4_engine",
      "type": "screamer",
      "cueKey": "melodic_tension_dark_cello_bend_braam",
      "title": "💀 Темный Бенд Виолончели",
      "startTime": 131.1,
      "duration": 8,
      "duckAmbientTo": 1,
      "customGain": 1.25
    },
    {
      "id": "cue_1793975649568",
      "actId": "act_4_engine",
      "type": "screamer",
      "cueKey": "melodic_tension_dark_cello_bend_braam",
      "title": "💀 Темный Бенд Виолончели",
      "startTime": 131.1,
      "duration": 8,
      "duckAmbientTo": 1,
      "customGain": 1.25
    }
  ],
  "act_5_clientarchs": [
    {
      "id": "cue_act5_siege_drop",
      "actId": "act_5_clientarchs",
      "type": "dread",
      "cueKey": "dread_05_rust_and_bone_maximum_grimdark_25s",
      "title": "💀 Ржавчина и Кость (Осада периметра) 25s",
      "startTime": 0,
      "duration": 25,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act5_autopsy_screamer",
      "actId": "act_5_clientarchs",
      "type": "screamer",
      "cueKey": "trailer_industrial_anvil_slam",
      "title": "💀 Индустриальная Наковальня (Anvil Slam)",
      "startTime": 97.96,
      "duration": 6,
      "duckAmbientTo": 1,
      "customGain": 1.35
    },
    {
      "id": "cue_act5_invasion_terror",
      "actId": "act_5_clientarchs",
      "type": "dread",
      "cueKey": "dread_03_predator_instant_terror_drop_25s",
      "title": "💀 Мгновенный Дроп Ужаса (Вторжение Правконосцев) 25s",
      "startTime": 97.96,
      "duration": 25,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act5_morlock_march",
      "actId": "act_5_clientarchs",
      "type": "dread",
      "cueKey": "dread_11_morlock_war_march_climax_50s",
      "title": "💀 Марш Морлоков (Климакс Правконосцев) 50s",
      "startTime": 140.72,
      "duration": 50,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act5_mavis_crawl_screamer",
      "actId": "act_5_clientarchs",
      "type": "screamer",
      "cueKey": "braam_seismic_tectonic_rumble",
      "title": "⚡ Скример: Дева Мэвис ползёт на культях",
      "startTime": 208.7,
      "duration": 7.5,
      "duckAmbientTo": 1,
      "customGain": 1.4
    },
    {
      "id": "cue_act5_nightmare_drop",
      "actId": "act_5_clientarchs",
      "type": "dread",
      "cueKey": "dread_10_predator_nightmare_drop_52s",
      "title": "💀 Кошмар Хищника (Судный Штурм) 52s",
      "startTime": 208.7,
      "duration": 52,
      "duckAmbientTo": 0.005
    }
  ],
  "act_6_punishment": [
    {
      "id": "cue_act6_rust_bone",
      "actId": "act_6_punishment",
      "type": "dread",
      "cueKey": "dread_10_predator_nightmare_drop_52s",
      "title": "💀 Кошмар Хищника (Nightmare Drop) 52s",
      "startTime": 25.44,
      "duration": 28.1,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act6_tribunal_teeth_screamer",
      "actId": "act_6_punishment",
      "type": "screamer",
      "cueKey": "braam_reactor_turbine_overdrive",
      "title": "⚡ Скример: 22 ГБ плоти и зубов трибунала",
      "startTime": 36.02,
      "duration": 6,
      "duckAmbientTo": 1,
      "customGain": 1.35
    },
    {
      "id": "cue_act6_punishment_march",
      "actId": "act_6_punishment",
      "type": "dread",
      "cueKey": "dread_11_morlock_war_march_climax_50s",
      "title": "💀 Марш Морлоков 50с (Приговор Трибунала)",
      "startTime": 53.4,
      "duration": 50,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act6_catacombs_screamer",
      "actId": "act_6_punishment",
      "type": "screamer",
      "cueKey": "trailer_industrial_anvil_slam",
      "title": "⚡ Скример: Катакомбы нижней палубы (Зачистка гнили)",
      "startTime": 74.68,
      "duration": 6.5,
      "duckAmbientTo": 1,
      "customGain": 1.35
    }
  ],
  "act_6_reward": [
    {
      "id": "cue_act6_cookie_grace",
      "actId": "act_6_reward",
      "type": "peace",
      "cueKey": "peace_08_pin_drop_silence_reward_grace_60s",
      "title": "🕊️ Печенька благодати (Высшая милость)",
      "startTime": 0,
      "duration": 60,
      "duckAmbientTo": 0
    },
    {
      "id": "cue_act6_needle_drop",
      "actId": "act_6_reward",
      "type": "dread",
      "cueKey": "dread_03_predator_instant_terror_drop_25s",
      "title": "💀 Мгновенный Дроп Ужаса (Сервисная игла) 25s",
      "startTime": 60.18,
      "duration": 28.1,
      "duckAmbientTo": 0.005
    },
    {
      "id": "cue_act6_needle_slam_screamer",
      "actId": "act_6_reward",
      "type": "screamer",
      "cueKey": "trailer_pneumatic_gate_crush",
      "title": "⚡ Скример: Удар сервисной иглы (Пневмо-краш)",
      "startTime": 60.18,
      "duration": 5.5,
      "duckAmbientTo": 1,
      "customGain": 1.35
    }
  ],
  "act_8_outro": [
    {
      "id": "cue_act8_outro_terror",
      "actId": "act_8_outro",
      "type": "dread",
      "cueKey": "trailer_braam_sub_drop",
      "title": "💀 Финальный слепой старт (Саб-Дроп Брам)",
      "startTime": 48.9,
      "duration": 4.5,
      "duckAmbientTo": 0.005
    }
  ],
  "act_7_song": []
};

const STORAGE_KEY = 'playbox_premiere_audio_director_cues_v11';

export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search || '');
    // Strictly requires explicit developer opt-in query parameter (e.g. ?dev=1 or ?audio_director=1)
    if (params.get('dev') === '1' || params.get('dev') === 'true' || params.get('audio_director') === '1') {
      return true;
    }
    // Or explicit developer flag in storage (not generic 'dev' or 'dev_mode')
    if (window.localStorage && window.localStorage.getItem('plbx_audio_director_dev') === 'true') {
      return true;
    }
  } catch (_) {}
  return false;
}

if (typeof window !== 'undefined') {
  (window as any).isDevMode = isDevMode;
  (window as any).enableDevMode = () => {
    localStorage.setItem('plbx_audio_director_dev', 'true');
    location.reload();
  };
  (window as any).disableDevMode = () => {
    localStorage.removeItem('plbx_audio_director_dev');
    localStorage.removeItem('dev_mode');
    localStorage.removeItem('dev');
    location.reload();
  };
}

export class PremiereAudioDirector {
  private static _instance: PremiereAudioDirector | null = null;

    public getTransitionSoundForAct(actId: string): string {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(`cyberbulling_transition_sound_${actId}`);
        if (saved) {
          if (saved === 'random') return 'random';
          if (AVAILABLE_TRANSITION_OPTIONS.some(o => o.key === saved)) return saved;
        }
        const globalSaved = window.localStorage.getItem('cyberbulling_transition_sound');
        if (globalSaved) {
          if (globalSaved === 'random') return 'random';
          if (AVAILABLE_TRANSITION_OPTIONS.some(o => o.key === globalSaved)) return globalSaved;
        }
      }
    } catch {}
    return DEFAULT_TRANSITIONS_BY_ACT[actId] || 'random';
  }

  public setTransitionSoundForAct(actId: string, key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`cyberbulling_transition_sound_${actId}`, key);
        window.localStorage.setItem('cyberbulling_transition_sound', key);
      }
    } catch {}
    if ((window as any).__movieApp) {
      (window as any).__movieApp.setLockedTransitionSound(key, actId);
    }
  }

  public static getInstance(): PremiereAudioDirector {
    if (!PremiereAudioDirector._instance) {
      PremiereAudioDirector._instance = new PremiereAudioDirector();
    }
    return PremiereAudioDirector._instance;
  }

  // State
  private _isOpen = false;
  private _isFullscreen = false;
  private _currentActIndex = 0;
  private _currentActDuration = 45.5;
  private _currentTime = 0;
  private _cuesByAct: Record<string, PremiereCue[]> = {};
  private _selectedCueId: string | null = null;
  private _audioPreviewElement: HTMLAudioElement | null = null;
  private _activePreviewBtn: HTMLElement | null = null;
  private _activePreviewKey: string | null = null;

  // Dragging state
  private _dragMode: 'none' | 'move' | 'resize_start' | 'resize_end' = 'none';
  private _dragCueId: string | null = null;
  private _dragInitialPointerX = 0;
  private _dragInitialStartTime = 0;
  private _dragInitialDuration = 0;
  private _timelinePixelsPerSecond = 10;

  // DOM Elements
  private _container!: HTMLDivElement;
  private _toggleButton!: HTMLButtonElement;
  private _toastElement!: HTMLDivElement;
  private _modalElement!: HTMLDivElement;

  // Callbacks
  public onSeekRequested?: (seconds: number) => void;
  public onActChangeRequested?: (actIndex: number) => void;

  private constructor() {
    this._loadCuesFromStorage();
    this._createDOM();
    this._attachGlobalKeyboard();
  }

  // ==========================================================================
  // STORAGE & CONFIG MANAGEMENT
  // ==========================================================================
  private _loadCuesFromStorage(): void {
    // Deep clone defaults
    this._cuesByAct = JSON.parse(JSON.stringify(DEFAULT_INITIAL_CUES));
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved cues
        for (const actKey of Object.keys(parsed)) {
          this._cuesByAct[actKey] = parsed[actKey];
        }
      }
      // Ensure intro_playbox never has phantom dread cues
      this._cuesByAct['intro_playbox'] = [];
    } catch (e) {
      console.warn('[PremiereAudioDirector] Could not load saved cues:', e);
    }
  }

  public resetToDefaults(): void {
    this._cuesByAct = JSON.parse(JSON.stringify(DEFAULT_INITIAL_CUES));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._cuesByAct));
      this.showToast('🔄 СБРОШЕНО К КАНОНУ ПРОЕКТА!');
      this._applyCuesToAmbientManager();
      this.render();
    } catch (e) {
      console.error('[PremiereAudioDirector] Reset error:', e);
    }
  }

  public saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._cuesByAct));
      this.showToast('💾 ИЗМЕНЕНИЯ СОХРАНЕНЫ В ПАМЯТИ БРАУЗЕРА!');
      this._applyCuesToAmbientManager();
    } catch (e) {
      console.error('[PremiereAudioDirector] Save error:', e);
    }
  }

  public copyConfigToClipboard(): void {
    const act = STORY_ACTS[this._currentActIndex];
    const actId = act ? act.id : 'unknown';
    const currentActCues = this._cuesByAct[actId] || [];

    const tsConfig = `// =========================================================================\n` +
      `// АУДИО-КОНФИГУРАЦИЯ ДЛЯ АКТА: ${actId} (Длительность: ${this._currentActDuration.toFixed(2)}s)\n` +
      `// Сгенерировано в Adobe Premiere Audio Director • Playbox Studios\n` +
      `// =========================================================================\n` +
      `export const ${actId.toUpperCase()}_AUDIO_CUES = ${JSON.stringify(currentActCues, null, 2)};\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsConfig).then(() => {
        this.showToast(`✅ КОНФИГ АКТА [${act ? act.title : actId}] СКОПИРОВАН В БУФЕР ОБМЕНА!`);
      }).catch(() => {
        this._fallbackCopyText(tsConfig);
      });
    } else {
      this._fallbackCopyText(tsConfig);
    }
  }

  private _areCuesEqual(c1: PremiereCue[], c2: PremiereCue[]): boolean {
    if (c1.length !== c2.length) return false;
    for (let i = 0; i < c1.length; i++) {
      const a = c1[i];
      const b = c2[i];
      if (a.id !== b.id || a.type !== b.type || a.cueKey !== b.cueKey) return false;
      if (Math.abs(a.startTime - b.startTime) > 0.05) return false;
      if (Math.abs(a.duration - b.duration) > 0.05) return false;
      if (Math.abs((a.customGain ?? 1.0) - (b.customGain ?? 1.0)) > 0.01) return false;
      if (Math.abs((a.duckAmbientTo ?? 0.005) - (b.duckAmbientTo ?? 0.005)) > 0.001) return false;
    }
    return true;
  }

  public copyAllConfigsToClipboard(): void {
    const changedActs: Record<string, PremiereCue[]> = {};
    let totalChangedCount = 0;

    for (const act of STORY_ACTS) {
      const actId = act.id;
      const currentCues = this._cuesByAct[actId] || [];
      const defaultCues = DEFAULT_INITIAL_CUES[actId] || [];
      if (!this._areCuesEqual(currentCues, defaultCues)) {
        changedActs[actId] = currentCues;
        totalChangedCount++;
      }
    }

    if (totalChangedCount === 0) {
      // If nothing differs, inform user and copy current act only
      const act = STORY_ACTS[this._currentActIndex];
      const actId = act ? act.id : 'unknown';
      const currentActCues = this._cuesByAct[actId] || [];
      const tsConfig = `// =========================================================================\n` +
        `// АУДИО-КОНФИГУРАЦИЯ ДЛЯ АКТА: ${actId} (НЕТ ОТЛИЧИЙ ОТ КАНОНА)\n` +
        `// =========================================================================\n` +
        `export const ${actId.toUpperCase()}_AUDIO_CUES = ${JSON.stringify(currentActCues, null, 2)};\n`;

      this._copyTextWithToast(tsConfig, 'ℹ️ Нет отличий от канона! Скопирован текущий акт.');
      return;
    }

    const changedActNames = Object.keys(changedActs).join(', ');
    const header = `// =========================================================================\n` +
      `// ТОЛЬКО ИЗМЕНЕННЫЕ АКТЫ (${totalChangedCount} шт: ${changedActNames})\n` +
      `// Сгенерировано в Adobe Premiere Audio Director • Playbox Studios\n` +
      `// =========================================================================\n\n`;

    const body = Object.entries(changedActs).map(([actId, cues]) => {
      return `export const ${actId.toUpperCase()}_AUDIO_CUES = ${JSON.stringify(cues, null, 2)};`;
    }).join('\n\n') + '\n';

    this._copyTextWithToast(header + body, `✅ ИЗМЕНЕНИЯ [${totalChangedCount} акт.] СКОПИРОВАНЫ В БУФЕР!`);
  }

  private _copyTextWithToast(text: string, toastMsg: string): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(toastMsg);
      }).catch(() => {
        this._fallbackCopyText(text);
      });
    } else {
      this._fallbackCopyText(text);
    }
  }

  private _fallbackCopyText(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast('✅ КОНФИГ СКОПИРОВАН В БУФЕР ОБМЕНА!');
    } catch {
      alert('Пожалуйста, скопируйте конфиг вручную из консоли разработчика.');
      console.log('=== PREMIERE AUDIO CONFIG ===\n', text);
    }
    document.body.removeChild(ta);
  }

  private _applyCuesToAmbientManager(): void {
    const act = STORY_ACTS[this._currentActIndex];
    if (!act) return;
    const actId = act.id;
    const cues = this._cuesByAct[actId] || [];

    const curTime = this._currentTime;
    let activeCinematic: PremiereCue | null = null;
    let cinematicOffset = 0;
    let activeScreamer: PremiereCue | null = null;
    let screamerOffset = 0;

    for (const cue of cues) {
      if (curTime >= cue.startTime && curTime < (cue.startTime + cue.duration)) {
        const offset = curTime - cue.startTime;
        if (cue.type === 'screamer') {
          if (!activeScreamer) {
            activeScreamer = cue;
            screamerOffset = offset;
          }
        } else {
          if (!activeCinematic) {
            activeCinematic = cue;
            cinematicOffset = offset;
          }
        }
      }
    }

    if (activeCinematic) {
      AmbientManager.syncCinematicCue(activeCinematic.cueKey, cinematicOffset, !AmbientManager.isPaused(), activeCinematic.customGain ?? 1.0);
    } else {
      AmbientManager.stopCinematicCue(0.2);
    }

    if (activeScreamer) {
      AmbientManager.syncScreamerCue(activeScreamer.cueKey, screamerOffset, !AmbientManager.isPaused(), activeScreamer.customGain ?? 1.35);
    } else {
      AmbientManager.stopScreamerCue(0.2);
    }
  }

  // ==========================================================================
  // DOM CREATION & STYLING
  // ==========================================================================
  private _createDOM(): void {
    // 1. Inject Styles
    const style = document.createElement('style');
    style.textContent = `
      #premiere-audio-director-btn {
        position: fixed;
        bottom: 24px;
        right: 28px;
        z-index: 999990;
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #f59e0b;
        color: #f59e0b;
        padding: 8px 14px;
        font-family: 'Share Tech Mono', monospace, sans-serif;
        font-size: 13px;
        font-weight: bold;
        letter-spacing: 1px;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0,0,0,0.6), inset 0 0 8px rgba(245,158,11,0.2);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.15s ease-in-out;
      }
      #premiere-audio-director-btn:hover {
        background: #f59e0b;
        color: #0f172a;
        box-shadow: 0 0 18px rgba(245,158,11,0.7);
        transform: translateY(-2px);
      }

      #premiere-audio-director {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: 420px;
        z-index: 999995;
        background: #121316;
        border-top: 2px solid #334155;
        box-shadow: 0 -10px 40px rgba(0,0,0,0.85);
        display: flex;
        flex-direction: column;
        user-select: none;
        font-family: 'Inter', -apple-system, sans-serif;
        color: #e2e8f0;
        transition: height 0.2s ease-in-out, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateY(105%);
      }
      #premiere-audio-director.open {
        transform: translateY(0%);
      }
      #premiere-audio-director.fullscreen {
        height: 85vh;
      }

      /* TOP HEADER TOOLBAR */
      .pr-toolbar {
        height: 44px;
        background: #18191d;
        border-bottom: 1px solid #272a30;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 14px;
        flex-shrink: 0;
      }
      .pr-toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pr-logo {
        font-family: 'Share Tech Mono', monospace;
        font-size: 13px;
        font-weight: bold;
        color: #f59e0b;
        background: #242018;
        padding: 4px 8px;
        border: 1px solid #78350f;
        letter-spacing: 0.5px;
      }
      .pr-act-tabs {
        display: flex;
        gap: 4px;
        overflow-x: auto;
        max-width: 58vw;
      }
      .pr-act-tab {
        background: #22252a;
        border: 1px solid #333842;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 600;
        padding: 5px 10px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s;
      }
      .pr-act-tab:hover {
        background: #2e333d;
        color: #f1f5f9;
      }
      .pr-act-tab.active {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
      }

      .pr-toolbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pr-btn {
        background: #23272e;
        border: 1px solid #3b4252;
        color: #cbd5e1;
        font-size: 11px;
        font-weight: bold;
        padding: 6px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s;
      }
      .pr-btn:hover {
        background: #333945;
        color: #ffffff;
      }
      .pr-btn-primary {
        background: #059669;
        border-color: #10b981;
        color: #ffffff;
      }
      .pr-btn-primary:hover {
        background: #10b981;
      }
      .pr-btn-warning {
        background: #d97706;
        border-color: #f59e0b;
        color: #ffffff;
      }
      .pr-btn-warning:hover {
        background: #f59e0b;
      }
      .pr-btn-close {
        background: #dc2626;
        border-color: #ef4444;
        color: #ffffff;
        padding: 6px 10px;
      }
      .pr-btn-close:hover {
        background: #ef4444;
      }

      /* INSPECTOR BAR FOR SELECTED CLIP */
      .pr-inspector {
        height: 38px;
        background: #1a1c22;
        border-bottom: 1px solid #2d313b;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 14px;
        font-size: 12px;
        flex-shrink: 0;
      }
      .pr-inspector-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pr-inspector-badge {
        font-size: 10px;
        padding: 2px 6px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .pr-badge-dread { background: #881337; color: #f43f5e; border: 1px solid #be123c; }
      .pr-badge-peace { background: #064e3b; color: #10b981; border: 1px solid #059669; }
      .pr-badge-ambient { background: #0c4a6e; color: #38bdf8; border: 1px solid #0284c7; }

      .pr-inspector-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .pr-nudge-group {
        display: flex;
        align-items: center;
        gap: 2px;
        background: #111215;
        border: 1px solid #2e333d;
        padding: 2px 4px;
      }
      .pr-nudge-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 10px;
        font-family: monospace;
        cursor: pointer;
        padding: 2px 4px;
      }
      .pr-nudge-btn:hover {
        color: #f8fafc;
        background: #333945;
      }
      .pr-nudge-val {
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        color: #38bdf8;
        padding: 0 4px;
        min-width: 44px;
        text-align: center;
      }

      /* MAIN TIMELINE WORKSPACE */
      .pr-workspace {
        display: flex;
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      /* TRACK HEADERS (LEFT) */
      .pr-track-headers {
        width: 250px;
        flex-shrink: 0;
        background: #16181d;
        border-right: 2px solid #272a31;
        display: flex;
        flex-direction: column;
      }
      .pr-track-header-spacer {
        height: 26px;
        border-bottom: 1px solid #272a31;
        background: #121316;
        display: flex;
        align-items: center;
        padding-left: 10px;
        font-size: 10px;
        font-family: monospace;
        color: #64748b;
      }
      .pr-track-header {
        height: 46px;
        border-bottom: 1px solid #272a31;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        font-size: 11px;
        font-weight: 600;
      }
      .pr-track-header.pr-track-header-video {
        height: 38px;
        background: #15131e;
      }
      .pr-header-title {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pr-color-tag {
        width: 6px;
        height: 28px;
        border-radius: 1px;
      }
      .tag-video { background: #a855f7; }
      .tag-dread { background: #f43f5e; }
      .tag-peace { background: #10b981; }
      .tag-ambient { background: #0284c7; }
      .tag-screamer { background: #f59e0b; }
      .clip-screamer {
        background: linear-gradient(180deg, #b45309 0%, #78350f 100%);
        border: 1px solid #f59e0b;
        color: #fef3c7;
      }
      .clip-screamer:hover {
        background: linear-gradient(180deg, #d97706 0%, #92400e 100%);
        border-color: #fbbf24;
      }
      .pr-badge-screamer { background: rgba(245, 158, 11, 0.25); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); }

      .pr-track-btn-mute {
        background: #23272e;
        border: 1px solid #3b4252;
        color: #94a3b8;
        font-size: 10px;
        font-weight: bold;
        width: 22px;
        height: 22px;
        border-radius: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .pr-track-btn-mute:hover {
        background: #333945;
        color: #ffffff;
      }

      /* MODE INDICATOR BADGES (RANDOM / FIXED) */
      .pr-mode-indicator {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1.2;
        user-select: none;
        flex-shrink: 0;
      }
      .pr-mode-indicator.random {
        background: rgba(168, 85, 247, 0.22);
        color: #d8b4fe;
        border: 1px solid rgba(168, 85, 247, 0.5);
      }
      .pr-mode-indicator.fixed {
        background: rgba(16, 185, 129, 0.18);
        color: #6ee7b7;
        border: 1px solid rgba(16, 185, 129, 0.45);
      }
      .pr-mode-indicator:hover {
        filter: brightness(1.15);
      }
      .pr-track-btn-mute.active {
        background: #ef4444;
        border-color: #dc2626;
        color: #ffffff;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      }

      /* TIMELINE CANVAS / LANES AREA (RIGHT) */
      .pr-timeline-scroll {
        flex: 1;
        overflow-x: hidden;
        overflow-y: hidden;
        position: relative;
        background: #0f1013;
        display: flex;
        flex-direction: column;
      }

      /* RULER */
      .pr-ruler {
        height: 26px;
        background: #14161b;
        border-bottom: 1px solid #272a31;
        position: relative;
        cursor: pointer;
        width: 100%;
      }
      .pr-ruler-tick {
        position: absolute;
        bottom: 0;
        width: 1px;
        height: 6px;
        background: #334155;
      }
      .pr-ruler-tick.major {
        height: 12px;
        background: #64748b;
      }
      .pr-ruler-label {
        position: absolute;
        top: 3px;
        font-family: 'Share Tech Mono', monospace;
        font-size: 10px;
        color: #94a3b8;
        transform: translateX(-50%);
        pointer-events: none;
      }

      /* TRACK LANES */
      .pr-lane {
        height: 46px;
        border-bottom: 1px solid #1e2128;
        position: relative;
        background-image: linear-gradient(90deg, #13151a 0%, #13151a 99%, #181b22 100%);
        background-size: 40px 100%;
        width: 100%;
      }
      .pr-lane.pr-lane-video {
        height: 38px;
        background: #111018;
        border-bottom: 2px solid #272a36;
      }

      .pr-clip.clip-video {
        background: linear-gradient(180deg, #4c1d95 0%, #2e1065 100%);
        border: 1px solid #a855f7;
        color: #f3e8ff;
        cursor: pointer;
        font-size: 10px;
        padding: 0 6px;
        user-select: none;
      }
      .pr-clip.clip-video:hover {
        background: linear-gradient(180deg, #6b21a8 0%, #3b0764 100%);
        border-color: #d8b4fe;
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        z-index: 15;
      }
      .pr-ruler-cut-mark {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #a855f7;
        pointer-events: auto;
        cursor: pointer;
        z-index: 4;
      }
      .pr-ruler-cut-mark:hover {
        background: #d8b4fe;
        width: 3px;
      }

      /* AUDIO CLIPS */
      .pr-clip {
        position: absolute;
        top: 4px;
        bottom: 4px;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        cursor: grab;
        padding: 0 8px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: outline 0.1s, box-shadow 0.1s;
      }
      .pr-clip:active {
        cursor: grabbing;
      }
      .pr-clip.clip-dread {
        background: linear-gradient(180deg, #9f1239 0%, #4c0519 100%);
        border: 1px solid #f43f5e;
        color: #ffe4e6;
      }
      .pr-clip.clip-peace {
        background: linear-gradient(180deg, #065f46 0%, #022c22 100%);
        border: 1px solid #10b981;
        color: #d1fae5;
      }
      .pr-clip.clip-ambient {
        background: linear-gradient(180deg, #0369a1 0%, #082f49 100%);
        border: 1px solid #38bdf8;
        color: #e0f2fe;
        cursor: pointer;
      }
      .pr-clip.clip-ambient:hover {
        border-color: #7dd3fc;
        box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
      }
      .pr-clip.clip-trans {
        background: linear-gradient(180deg, #b45309 0%, #78350f 100%);
        border: 1px solid #f59e0b;
        color: #fef3c7;
        cursor: pointer;
      }
      .pr-clip.clip-trans:hover {
        border-color: #fbbf24;
        box-shadow: 0 0 12px rgba(245, 158, 11, 0.6);
      }
      .pr-badge-trans {
        background: #78350f;
        border: 1px solid #f59e0b;
        color: #fef3c7;
      }
      .tag-trans {
        background: #f59e0b;
        box-shadow: 0 0 6px rgba(245, 158, 11, 0.7);
      }
      .pr-clip.selected {
        outline: 2px solid #ffd166;
        box-shadow: 0 0 14px rgba(255, 209, 102, 0.7);
        z-index: 10;
      }

      /* RESIZE HANDLES */
      .pr-handle-left, .pr-handle-right {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 10px;
        cursor: col-resize;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pr-handle-left {
        left: 0;
        border-left: 3px solid rgba(255,255,255,0.7);
      }
      .pr-handle-right {
        right: 0;
        border-right: 3px solid rgba(255,255,255,0.7);
      }
      .pr-handle-left:hover, .pr-handle-right:hover {
        background: rgba(255,255,255,0.25);
      }

      /* PLAYHEAD */
      .pr-playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #ef4444;
        z-index: 50;
        pointer-events: none;
        transition: left 0.05s linear;
      }
      .pr-playhead-cap {
        position: absolute;
        top: 0;
        left: -6px;
        width: 14px;
        height: 14px;
        background: #ef4444;
        clip-path: polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%);
      }

      /* TOAST NOTIFICATION */
      #pr-toast {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: #065f46;
        border: 2px solid #10b981;
        color: #ffffff;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: bold;
        padding: 10px 24px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        z-index: 9999999;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      }
      #pr-toast.show {
        transform: translateX(-50%) translateY(0);
      }

      /* MODAL REPLACEMENT DIALOG */
      #pr-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(4px);
        z-index: 9999990;
        display: none;
        align-items: center;
        justify-content: center;
      }
      #pr-modal-backdrop.open {
        display: flex;
      }
      .pr-modal {
        width: 650px;
        max-width: 90vw;
        max-height: 80vh;
        background: #181a20;
        border: 1px solid #3b4252;
        box-shadow: 0 20px 50px rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        color: #e2e8f0;
        font-family: 'Inter', sans-serif;
      }
      .pr-modal-header {
        padding: 14px 18px;
        background: #20232a;
        border-bottom: 1px solid #2d313b;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .pr-modal-title {
        font-size: 14px;
        font-weight: bold;
        color: #f59e0b;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pr-modal-body {
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pr-track-card {
        background: #111317;
        border: 1px solid #262b35;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        transition: all 0.15s;
      }
      .pr-track-card:hover {
        background: #222630;
        border-color: #38bdf8;
      }
      .pr-track-card.active {
        border-color: #f59e0b;
        background: #282116;
      }
      .pr-track-title {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .pr-track-desc {
        font-size: 11px;
        color: #94a3b8;
      }
    `;
    document.head.appendChild(style);

    // 2. Create Floating Toggle Button (Dev Mode Only)
    this._toggleButton = document.createElement('button');
    this._toggleButton.id = 'premiere-audio-director-btn';
    this._toggleButton.innerHTML = `🎚️ РЕЖИССУРА ЗВУКА (D)`;
    this._toggleButton.onclick = () => this.toggle();
    if (isDevMode()) {
      document.body.appendChild(this._toggleButton);
    }

    // 3. Create Main Timeline Container
    this._container = document.createElement('div');
    this._container.id = 'premiere-audio-director';
    document.body.appendChild(this._container);

    // 4. Create Toast Notification Element
    this._toastElement = document.createElement('div');
    this._toastElement.id = 'pr-toast';
    document.body.appendChild(this._toastElement);

    // 5. Create Replacement Modal Backdrop
    this._modalElement = document.createElement('div');
    this._modalElement.id = 'pr-modal-backdrop';
    document.body.appendChild(this._modalElement);

    // Render Initial Structure
    this.render();
  }

  // ==========================================================================
  // RENDER MAIN TIMELINE
  // ==========================================================================
  public render(): void {
    const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];
    this._currentActDuration = act.duration || 45.5;
    const actId = act.id;
    const currentCues = this._cuesByAct[actId] || [];

    // Filter cues by type
    const dreadCues = currentCues.filter(c => c.type === 'dread');
    const peaceCues = currentCues.filter(c => c.type === 'peace');
    const currentAmbKey = (this._currentActIndex === 0)
      ? AmbientManager.getIntroTrack()
      : (AmbientManager.getTrackForAct(this._currentActIndex, actId).key || 'desolate_cry');
    const opt = AVAILABLE_TRACK_OPTIONS.find(o => o.key === currentAmbKey);
    const ambientTrackName = (this._currentActIndex === 0)
      ? (AmbientManager.getIntroTrack() === 'desolate_cry' ? 'Desolate Cry (Эмбиент бездны)' : 'Titan Forge (Кузница титанов)')
      : (opt ? opt.name : currentAmbKey);

    const ambientCue = {
      id: 'ambient_base_lane',
      actId: actId,
      type: 'ambient' as const,
      cueKey: currentAmbKey,
      title: `📻 БАЗОВЫЙ ЭМБИЕНТ: ${ambientTrackName}`,
      startTime: 0,
      duration: this._currentActDuration
    };

    // Video / Montage Cuts for current act
    let videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string | null }[] = [];
    if (this._currentActIndex === 0) {
      const introTrack = AmbientManager.getIntroTrack();
      const dropTime = introTrack === 'titan_forge' ? 24.0 : 27.0;
      videoCuts = [
        { time: 0.0, label: 'Дисклеймер', type: 'event_illustration' },
        { time: 8.0, label: 'Playbox Studios (череп)', type: 'event_illustration' },
        { time: 13.0, label: 'Представляет', type: 'event_illustration' },
        { time: dropTime, label: 'Дроп титра / Лого', type: 'event_illustration' },
      ];
    } else if (act.id === 'act_7_song') {
      videoCuts = CONCERT_SEQUENCE_CUTS;
    } else if (NARRATOR_CUTS[act.id]) {
      videoCuts = NARRATOR_CUTS[act.id];
    }

    const selectedCue = currentCues.find(c => c.id === this._selectedCueId);
    const isAmbientSelected = this._selectedCueId === 'ambient_base_lane';

    // Generate Act Tabs HTML
    const actTabsHtml = STORY_ACTS.map((a, idx) => {
      const activeCls = (idx === this._currentActIndex) ? 'active' : '';
      return `<button class="pr-act-tab ${activeCls}" data-act-idx="${idx}">[ ${idx}: ${a.badge || a.title} ]</button>`;
    }).join('');

    // Generate Inspector HTML
    let inspectorHtml = '';
    const isTransSelected = this._selectedCueId === 'transition_lane';
    if (isTransSelected) {
      const curTransKey = this.getTransitionSoundForAct(actId);
      const isRandom = curTransKey === 'random';
      const opt = AVAILABLE_TRANSITION_OPTIONS.find(o => o.key === curTransKey);
      const transName = isRandom ? '🎲 Случайный выбор из Fin (Рандом)' : (opt ? opt.name : curTransKey);
      const modeBadge = isRandom
        ? '<span class="pr-mode-indicator random" title="При каждом переходе со шторкой выбирается случайный звук Fin">🎲 РАНДОМ</span>'
        : '<span class="pr-mode-indicator fixed" title="Зафиксирован конкретный звук перехода">📌 ФИКС</span>';

      inspectorHtml = `
        <div class="pr-inspector-info">
          <span class="pr-inspector-badge pr-badge-trans">⚡ ПЕРЕХОД ГЛАВЫ (STAR WARS OPTICAL WIPE)</span>
          <span style="font-weight: bold; color: #fde68a;">${transName}</span>
          <span style="color: #64748b;">|</span>
          ${modeBadge}
          <span style="color: #64748b;">|</span>
          <span style="color: #94a3b8;">Шторка: <b style="color: #f59e0b; font-family: monospace;">0.0s - 3.5s</b></span>
        </div>
        <div class="pr-inspector-actions">
          <button class="pr-btn ${isRandom ? 'pr-btn-primary' : ''}" id="pr-toggle-trans-random-btn" title="Переключить между случайным и фиксированным">${isRandom ? '📌 СДЕЛАТЬ КОНКРЕТНЫМ' : '🎲 СДЕЛАТЬ РАНДОМНЫМ'}</button>
          <button class="pr-btn" id="pr-test-trans-sound-btn">▶ ТЕСТ ЗВУКА</button>
          <button class="pr-btn pr-btn-primary" id="pr-test-trans-wipe-btn">🎬 ТЕСТ ПЕРЕХОДА (WIPE)</button>
          <button class="pr-btn pr-btn-warning" id="pr-replace-track-btn">🔄 ЗАМЕНИТЬ ЗВУК</button>
        </div>
      `;
    } else if (isAmbientSelected) {
      const currentAmbKey = (this._currentActIndex === 0)
        ? AmbientManager.getIntroTrack()
        : (AmbientManager.getLockedTrackForAct(act.id) || act.audioKey || 'desolate_cry');
      const opt = AVAILABLE_TRACK_OPTIONS.find(o => o.key === currentAmbKey);
      const name = (this._currentActIndex === 0)
        ? (currentAmbKey === 'desolate_cry' ? 'Desolate Cry (Эмбиент бездны)' : 'Titan Forge (Кузница титанов)')
        : (opt ? opt.name : currentAmbKey);

      const isAct0 = this._currentActIndex === 0;
      const isRandom = isAct0 && AmbientManager.isIntroRandom();
      const modeBadge = isAct0
        ? (isRandom
            ? '<span class="pr-mode-indicator random" title="Случайный выбор между вариантами интро при старте">🎲 РАНДОМ</span>'
            : '<span class="pr-mode-indicator fixed" title="Конкретный фиксированный трек">📌 ФИКС</span>')
        : '<span class="pr-mode-indicator fixed" title="Конкретный фиксированный трек">📌 ФИКС</span>';

      inspectorHtml = `
        <div class="pr-inspector-info">
          <span class="pr-inspector-badge pr-badge-ambient">📻 БАЗОВЫЙ ЭМБИЕНТ</span>
          <span style="font-weight: bold; color: #f8fafc;">${name}</span>
          <span style="color: #64748b;">|</span>
          ${modeBadge}
          <span style="color: #64748b;">|</span>
          <span style="color: #94a3b8;">Длительность: <b style="color: #38bdf8; font-family: monospace;">${this._currentActDuration.toFixed(1)}s (Весь акт)</b></span>
        </div>
        <div class="pr-inspector-actions">
          ${isAct0 ? `<button class="pr-btn ${isRandom ? 'pr-btn-primary' : ''}" id="pr-inspector-toggle-random" title="Переключить между случайным и конкретным">${isRandom ? '📌 СДЕЛАТЬ КОНКРЕТНЫМ' : '🎲 СДЕЛАТЬ РАНДОМНЫМ'}</button>` : ''}
          <button class="pr-btn pr-btn-warning" id="pr-replace-track-btn">🔄 ЗАМЕНИТЬ ТРЕК</button>
        </div>
      `;
    } else if (selectedCue) {
      const badgeCls = selectedCue.type === 'dread' ? 'pr-badge-dread' : (selectedCue.type === 'peace' ? 'pr-badge-peace' : 'pr-badge-screamer');
      const typeLabel = selectedCue.type === 'dread' ? '💀 НАГНЕТАНИЕ' : (selectedCue.type === 'peace' ? '🕊️ ДОБРАЯ МУЗЫКА' : '⚡ СКРИМЕР (ЗВУК ШТОРКИ)');
      const accentColor = selectedCue.type === 'dread' ? '#f43f5e' : (selectedCue.type === 'peace' ? '#10b981' : '#f59e0b');
      inspectorHtml = `
        <div class="pr-inspector-info">
          <span class="pr-inspector-badge ${badgeCls}">${typeLabel}</span>
          <span style="font-weight: bold; color: #f8fafc;">${selectedCue.title}</span>
          <span style="color: #64748b;">|</span>
          <span class="pr-mode-indicator fixed" title="Конкретный фиксированный отрезок">📌 ФИКС</span>
          <span style="color: #64748b;">|</span>
          <span>Начало:</span>
          <div class="pr-nudge-group">
            <button class="pr-nudge-btn" data-nudge-start="-1.0">-1s</button>
            <button class="pr-nudge-btn" data-nudge-start="-0.1">-0.1s</button>
            <span class="pr-nudge-val">${selectedCue.startTime.toFixed(2)}s</span>
            <button class="pr-nudge-btn" data-nudge-start="+0.1">+0.1s</button>
            <button class="pr-nudge-btn" data-nudge-start="+1.0">+1s</button>
          </div>
          <span>Длительность:</span>
          <div class="pr-nudge-group">
            <button class="pr-nudge-btn" data-nudge-dur="-1.0">-1s</button>
            <button class="pr-nudge-btn" data-nudge-dur="-0.1">-0.1s</button>
            <span class="pr-nudge-val">${selectedCue.duration.toFixed(2)}s</span>
            <button class="pr-nudge-btn" data-nudge-dur="+0.1">+0.1s</button>
            <button class="pr-nudge-btn" data-nudge-dur="+1.0">+1s</button>
          </div>
          <span>Конец: <b style="color: #38bdf8; font-family: monospace;">${(selectedCue.startTime + selectedCue.duration).toFixed(2)}s</b></span>
          <span style="color: #64748b;">|</span>
          <span>Громкость:</span>
          <div class="pr-nudge-group" style="align-items: center; gap: 4px;">
            <input type="range" class="pr-cue-vol-slider" min="0" max="200" value="${Math.round((selectedCue.customGain ?? 1.0) * 100)}" style="width: 46px; height: 3px; accent-color: ${accentColor}; cursor: pointer;">
            <span class="pr-cue-vol-val" style="font-size: 10px; font-family: monospace; color: ${accentColor}; min-width: 28px;">${Math.round((selectedCue.customGain ?? 1.0) * 100)}%</span>
          </div>
        </div>
        <div class="pr-inspector-actions">
          <button class="pr-btn pr-btn-warning" id="pr-add-screamer-btn" style="background: #d97706; border-color: #f59e0b;" title="Вставить звук шторки / скример на дорожку Т4">⚡ + СКРИМЕР</button>
          <button class="pr-btn pr-btn-warning" id="pr-replace-track-btn">🔄 ЗАМЕНИТЬ ТРЕК</button>
          <button class="pr-btn pr-btn-close" id="pr-delete-cue-btn">🗑️ УДАЛИТЬ</button>
        </div>
      `;
    } else {
      inspectorHtml = `
        <div class="pr-inspector-info">
          <span style="color: #94a3b8;">💡 Кликните на любой отрезок (или базовый эмбиент) для выделения, обрезки или замены трека.</span>
        </div>
        <div class="pr-inspector-actions">
          <button class="pr-btn pr-btn-warning" id="pr-add-screamer-btn" style="background: #d97706; border-color: #f59e0b;" title="Вставить звук шторки / скример на дорожку Т4">⚡ + СКРИМЕР</button>
          <button class="pr-btn pr-btn-primary" id="pr-add-cue-btn">➕ ДОБАВИТЬ ОТРЕЗОК</button>
        </div>
      `;
    }

    // Generate Ruler Ticks HTML (every 5 seconds / 1 second)
    const totalSec = Math.ceil(this._currentActDuration);
    let rulerTicksHtml = '';
    const stepSec = totalSec <= 60 ? 5 : 10;
    for (let s = 0; s <= totalSec; s += stepSec) {
      const pct = (s / this._currentActDuration) * 100;
      if (pct > 100) break;
      const m = Math.floor(s / 60);
      const remS = s % 60;
      const timeStr = `${m}:${remS < 10 ? '0' : ''}${remS}`;
      rulerTicksHtml += `
        <div class="pr-ruler-tick major" style="left: ${pct}%;"></div>
        <div class="pr-ruler-label" style="left: ${pct}%;">${timeStr}</div>
      `;
    }

    // Ruler Cut Markers
    videoCuts.forEach(cut => {
      const cutPct = (cut.time / this._currentActDuration) * 100;
      if (cutPct >= 0 && cutPct <= 100) {
        const labelText = cut.label || cut.characterName || cut.texKey || 'Склейка';
        rulerTicksHtml += `<div class="pr-ruler-cut-mark" style="left: ${cutPct}%;" title="🎬 ${labelText} [ ${cut.time.toFixed(1)}s ]" data-cut-time="${cut.time}"></div>`;
      }
    });

    // Mute states
    const dreadMuted = AmbientManager.isCategoryMuted('dread');
    const peaceMuted = AmbientManager.isCategoryMuted('peace');
    const ambientMuted = AmbientManager.isCategoryMuted('ambient');
    const dreadVolPct = Math.round(((AmbientManager as any).getCategoryVolume?.('dread') ?? 1.25) * 100);
    const peaceVolPct = Math.round(((AmbientManager as any).getCategoryVolume?.('peace') ?? 1.0) * 100);
    const ambVolPct = Math.round(((AmbientManager as any).getCategoryVolume?.('ambient') ?? 1.0) * 100);
    const screamerMuted = AmbientManager.isCategoryMuted('screamer');
    const screamerVolPct = Math.round(((AmbientManager as any).getCategoryVolume?.('screamer') ?? 1.25) * 100);

    // Render HTML structure
    this._container.innerHTML = `
      <!-- TOP TOOLBAR -->
      <div class="pr-toolbar">
        <div class="pr-toolbar-left">
          <span class="pr-logo">PREMIERE AUDIO STUDIO</span>
          <div class="pr-act-tabs">${actTabsHtml}</div>
        </div>
        <div class="pr-toolbar-actions">
          <button class="pr-btn pr-btn-primary" id="pr-save-btn">💾 СОХРАНИТЬ</button>
          <button class="pr-btn pr-btn-warning" id="pr-copy-config-btn" title="Скопировать таймлайн только текущего акта">📋 АКТ</button>
          <button class="pr-btn pr-btn-warning" id="pr-copy-all-btn" title="Скопировать только измененные акты (отличия от канона в коде)">📋 ТОЛЬКО ИЗМЕНЕНИЯ</button>
          <button class="pr-btn" id="pr-fullscreen-btn">${this._isFullscreen ? '🗗 СВЕРНУТЬ' : '⛶ НА ВЕСЬ ЭКРАН'}</button>
          <button class="pr-btn pr-btn-close" id="pr-close-btn">✖ ЗАКРЫТЬ (ESC)</button>
        </div>
      </div>

      <!-- INSPECTOR BAR -->
      <div class="pr-inspector">${inspectorHtml}</div>

      <!-- MAIN TIMELINE -->
      <div class="pr-workspace">
        <!-- TRACK HEADERS -->
        <div class="pr-track-headers">
          <div class="pr-track-header-spacer">TRACKS / СЛОИ</div>
          
          <!-- V1: VIDEO CUTS -->
          <div class="pr-track-header pr-track-header-video">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-video"></div>
              <span>🎬 Кадры / Склейки</span>
            </div>
            <span style="font-size: 10px; color: #c084fc; font-weight: bold;">V1</span>
          </div>

          <!-- T1: DREAD -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-dread"></div>
              <span>💀 Нагнетание</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <button class="pr-btn" id="pr-add-dread-header-btn" style="padding: 2px 6px; font-size: 10px; height: 22px; font-weight: bold; background: #881337; color: #f43f5e; border-color: #be123c;" title="Вставить нагнетание на дорожку Т1">+ ТРЕК</button>
              <input type="range" class="pr-track-vol-slider" data-vol-track="dread" min="0" max="200" value="${dreadVolPct}" title="Громкость Нагнетания: ${dreadVolPct}%" style="width: 48px; height: 3px; accent-color: #f43f5e; cursor: pointer;">
              <span class="pr-track-vol-label" data-vol-label="dread" style="font-size: 10px; color: #f43f5e; font-family: monospace; min-width: 28px; text-align: right;">${dreadVolPct}%</span>
              <button class="pr-track-btn-mute ${dreadMuted ? 'active' : ''}" data-mute-track="dread" title="${dreadMuted ? 'Включить звук' : 'Замутить дорожку'}">M</button>
              <span style="font-size: 10px; color: #f43f5e; font-weight: bold;">Т1</span>
            </div>
          </div>

          <!-- T2: PEACE -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-peace"></div>
              <span>🕊️ Добрая музыка</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <button class="pr-btn" id="pr-add-peace-header-btn" style="padding: 2px 6px; font-size: 10px; height: 22px; font-weight: bold; background: #064e3b; color: #10b981; border-color: #059669;" title="Вставить добрую музыку на дорожку Т2">+ ТРЕК</button>
              <input type="range" class="pr-track-vol-slider" data-vol-track="peace" min="0" max="200" value="${peaceVolPct}" title="Громкость Доброй музыки: ${peaceVolPct}%" style="width: 48px; height: 3px; accent-color: #10b981; cursor: pointer;">
              <span class="pr-track-vol-label" data-vol-label="peace" style="font-size: 10px; color: #10b981; font-family: monospace; min-width: 28px; text-align: right;">${peaceVolPct}%</span>
              <button class="pr-track-btn-mute ${peaceMuted ? 'active' : ''}" data-mute-track="peace" title="${peaceMuted ? 'Включить звук' : 'Замутить дорожку'}">M</button>
              <span style="font-size: 10px; color: #10b981; font-weight: bold;">Т2</span>
            </div>
          </div>

          <!-- T3: AMBIENT -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-ambient"></div>
              <span>📻 Базовый эмбиент</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <input type="range" class="pr-track-vol-slider" data-vol-track="ambient" min="0" max="200" value="${ambVolPct}" title="Громкость Базового эмбиента: ${ambVolPct}%" style="width: 48px; height: 3px; accent-color: #38bdf8; cursor: pointer;">
              <span class="pr-track-vol-label" data-vol-label="ambient" style="font-size: 10px; color: #38bdf8; font-family: monospace; min-width: 28px; text-align: right;">${ambVolPct}%</span>
              ${this._currentActIndex === 0
                ? `<button class="pr-mode-indicator ${AmbientManager.isIntroRandom() ? 'random' : 'fixed'}" id="pr-toggle-intro-random" style="cursor: pointer; border: 1px solid rgba(168,85,247,0.5);" title="Кликните для переключения: Рандом ↔ Фикс">${AmbientManager.isIntroRandom() ? '🎲 РАНДОМ' : '📌 ФИКС'}</button>`
                : ''}
              <button class="pr-track-btn-mute ${ambientMuted ? 'active' : ''}" data-mute-track="ambient" title="${ambientMuted ? 'Включить звук' : 'Замутить дорожку'}">M</button>
              <span style="font-size: 10px; color: #38bdf8; font-weight: bold;">Т3</span>
            </div>
          </div>

          <!-- T4: SCREAMER (ЗВУКИ ШТОРОК) -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-screamer"></div>
              <span>⚡ Скример (Звуки шторок)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <button class="pr-btn pr-btn-warning" id="pr-add-screamer-header-btn" style="padding: 2px 7px; font-size: 10px; height: 22px; font-weight: bold; background: #d97706;" title="Вставить звук шторки / скример на дорожку Т4">+ СКРИМЕР</button>
              <input type="range" class="pr-track-vol-slider" data-vol-track="screamer" min="0" max="200" value="${screamerVolPct}" title="Громкость Скримеров: ${screamerVolPct}%" style="width: 48px; height: 3px; accent-color: #f59e0b; cursor: pointer;">
              <span class="pr-track-vol-label" data-vol-label="screamer" style="font-size: 10px; color: #f59e0b; font-family: monospace; min-width: 28px; text-align: right;">${screamerVolPct}%</span>
              <button class="pr-track-btn-mute ${screamerMuted ? 'active' : ''}" data-mute-track="screamer" title="${screamerMuted ? 'Включить звук' : 'Замутить дорожку'}">M</button>
              <span style="font-size: 10px; color: #f59e0b; font-weight: bold;">Т4</span>
            </div>
          </div>

          <!-- T5: TRANSITION (STAR WARS WIPE SFX) -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-trans"></div>
              <span>🎬 Шторка Star Wars</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 10px; color: #a855f7; font-weight: bold;">Т5</span>
            </div>
          </div>
        </div>

        <!-- TIMELINE AREA -->
        <div class="pr-timeline-scroll" id="pr-timeline-scroll">
          <!-- RULER -->
          <div class="pr-ruler" id="pr-ruler">${rulerTicksHtml}</div>

          <!-- LANE 0: VIDEO / CUTS -->
          <div class="pr-lane pr-lane-video" id="pr-lane-video"></div>

          <!-- LANE 1: DREAD -->
          <div class="pr-lane" id="pr-lane-dread"></div>

          <!-- LANE 2: PEACE -->
          <div class="pr-lane" id="pr-lane-peace"></div>

          <!-- LANE 3: AMBIENT -->
          <div class="pr-lane" id="pr-lane-ambient"></div>

          <!-- LANE 4: SCREAMER (TRANSITION BRAAMS & RISERS) -->
          <div class="pr-lane" id="pr-lane-screamer"></div>

          <!-- LANE 5: TRANSITION (STAR WARS WIPE) -->
          <div class="pr-lane" id="pr-lane-trans"></div>

          <!-- PLAYHEAD NEEDLE -->
          <div class="pr-playhead" id="pr-playhead" style="left: 0%;">
            <div class="pr-playhead-cap"></div>
          </div>
        </div>
      </div>
    `;

    // Attach Event Listeners
    this._attachEventListeners();
    const screamerCues = currentCues.filter(c => c.type === 'screamer');
    this._renderClips(videoCuts, dreadCues, peaceCues, ambientCue, screamerCues);
    this.updatePlayhead(this._currentTime);
  }

  // ==========================================================================
  // RENDER INTERACTIVE CLIPS
  // ==========================================================================
  private _renderClips(
    videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string | null }[],
    dreadCues: PremiereCue[],
    peaceCues: PremiereCue[],
    ambientCue: PremiereCue,
    screamerCues: PremiereCue[] = []
  ): void {
    const laneVideo = this._container.querySelector('#pr-lane-video') as HTMLDivElement;
    const laneDread = this._container.querySelector('#pr-lane-dread') as HTMLDivElement;
    const lanePeace = this._container.querySelector('#pr-lane-peace') as HTMLDivElement;
    const laneAmbient = this._container.querySelector('#pr-lane-ambient') as HTMLDivElement;
    if (!laneDread || !lanePeace || !laneAmbient) return;

    // 0. Render Video / Montage Cuts
    if (laneVideo && videoCuts) {
      for (let i = 0; i < videoCuts.length; i++) {
        const cut = videoCuts[i];
        const nextTime = (i + 1 < videoCuts.length) ? videoCuts[i + 1].time : this._currentActDuration;
        const dur = Math.max(0.4, nextTime - cut.time);
        const leftPct = (cut.time / this._currentActDuration) * 100;
        const widthPct = (dur / this._currentActDuration) * 100;

        const cutEl = document.createElement('div');
        cutEl.className = 'pr-clip clip-video';
        cutEl.style.left = `${Math.max(0, leftPct)}%`;
        cutEl.style.width = `${Math.min(100 - leftPct, Math.max(1.2, widthPct))}%`;
        const labelText = cut.label || cut.characterName || cut.texKey || 'Кадр';
        cutEl.title = `🎬 ${labelText} [ ${cut.time.toFixed(1)}s - ${nextTime.toFixed(1)}s ] (Кликните для перехода)`;
        cutEl.innerHTML = `
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; pointer-events: none;">
            🎬 ${labelText}
          </span>
          <span style="font-size: 9px; opacity: 0.7; font-family: monospace; margin-left: 4px; pointer-events: none;">${cut.time.toFixed(1)}s</span>
        `;
        cutEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.seek(cut.time);
        });
        laneVideo.appendChild(cutEl);
      }
    }

    // 1. Render Dread Clips
    dreadCues.forEach(cue => {
      const el = this._createClipElement(cue, 'clip-dread');
      laneDread.appendChild(el);
    });

    // 2. Render Peace Clips
    peaceCues.forEach(cue => {
      const el = this._createClipElement(cue, 'clip-peace');
      lanePeace.appendChild(el);
    });

    // 3. Render Ambient Strip (Full-width base track with interactive selection)
    const isAmbSelected = this._selectedCueId === 'ambient_base_lane';
    const isAct0Amb = this._currentActIndex === 0;
    const isRandomAmb = isAct0Amb && AmbientManager.isIntroRandom();
    const ambModeBadge = isAct0Amb
      ? (isRandomAmb
          ? '<span class="pr-mode-indicator random" title="Случайный выбор между вариантами интро при старте">🎲 РАНДОМ</span>'
          : '<span class="pr-mode-indicator fixed" title="Конкретный фиксированный трек">📌 ФИКС</span>')
      : '<span class="pr-mode-indicator fixed" title="Конкретный фиксированный трек">📌 ФИКС</span>';

    const isAct1TwoStage = this._currentActIndex === 1 && !AmbientManager.getLockedTrackForAct('prologue_space');

    if (isAct1TwoStage) {
      const introTrack = AmbientManager.getIntroTrack();
      const introName = introTrack === 'desolate_cry' ? 'Desolate Cry' : 'Titan Forge';
      const cutPct = Math.min(95, Math.max(5, (18.5 / this._currentActDuration) * 100));

      const ambEl1 = document.createElement('div');
      ambEl1.className = `pr-clip clip-ambient ${isAmbSelected ? 'selected' : ''}`;
      ambEl1.style.left = '0%';
      ambEl1.style.width = `${cutPct}%`;
      ambEl1.title = 'Трек из заставки продолжает играть до появления ковчега (0.0s - 18.5s)';
      ambEl1.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis;">
          ${ambModeBadge}
          <span style="font-weight: bold; white-space: nowrap;">📻 Заставка: ${introName}</span>
        </div>
        <span style="font-size: 9px; opacity: 0.85; font-family: monospace;">[ 0.0s - 18.5s ]</span>
      `;
      ambEl1.addEventListener('pointerdown', (e: PointerEvent) => {
        e.stopPropagation();
        this._selectedCueId = 'ambient_base_lane';
        this.render();
      });

      const ambEl2 = document.createElement('div');
      ambEl2.className = `pr-clip clip-ambient ${isAmbSelected ? 'selected' : ''}`;
      ambEl2.style.left = `${cutPct}%`;
      ambEl2.style.width = `${100 - cutPct}%`;
      ambEl2.title = 'Основной эмбиент ковчега: бесшовный переход на спаде звука (18.5s+, 5.0s мягкий кроссфейд)';
      ambEl2.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis;">
          <span class="pr-mode-indicator fixed" style="padding: 1px 4px; font-size: 9px;">📌 ФИКС</span>
          <span style="font-weight: bold; white-space: nowrap;">📻 Ковчег: Rust and Bone (Спад)</span>
        </div>
        <span style="font-size: 9px; opacity: 0.85; font-family: monospace;">[ 18.5s - ${this._currentActDuration.toFixed(1)}s ]</span>
      `;
      ambEl2.addEventListener('pointerdown', (e: PointerEvent) => {
        e.stopPropagation();
        this._selectedCueId = 'ambient_base_lane';
        this.render();
      });

      laneAmbient.appendChild(ambEl1);
      laneAmbient.appendChild(ambEl2);
    } else {
      const ambEl = document.createElement('div');
      ambEl.className = `pr-clip clip-ambient ${isAmbSelected ? 'selected' : ''}`;
      ambEl.style.left = '0%';
      ambEl.style.width = '100%';
      ambEl.title = 'Кликните для выделения и смены базового эмбиента';
      ambEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          ${ambModeBadge}
          <span style="font-weight: bold;">${ambientCue.title}</span>
        </div>
        <span style="font-size: 10px; opacity: 0.85; font-family: monospace;">[ 0.0s - ${this._currentActDuration.toFixed(1)}s ]${peaceCues.some(c => c.duckAmbientTo === 0.0) ? ' • (Глушится в 0 во время Доброй музыки)' : ''} • [ Кликните для выбора/замены ]</span>
      `;
      ambEl.addEventListener('pointerdown', (e: PointerEvent) => {
        e.stopPropagation();
        this._selectedCueId = 'ambient_base_lane';
        this.render();
      });
      laneAmbient.appendChild(ambEl);
    }

    // 3b. Render Screamer Clips (Transition Braams & Risers)
    const laneScreamer = this._container.querySelector('#pr-lane-screamer') as HTMLDivElement;
    if (laneScreamer) {
      if (screamerCues.length === 0) {
        laneScreamer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f59e0b; opacity: 0.65; font-size: 11px; cursor: pointer; user-select: none;">
            ⚡ [ Кликните сюда, чтобы вставить скример (звук шторки) на эту секунду ]
          </div>
        `;
      } else {
        screamerCues.forEach(cue => {
          const el = this._createClipElement(cue, 'clip-screamer');
          laneScreamer.appendChild(el);
        });
      }

      laneScreamer.addEventListener('pointerdown', (e: PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.pr-clip')) return;
        e.stopPropagation();
        const rect = laneScreamer.getBoundingClientRect();
        if (rect.width <= 0) return;
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetTime = Math.round(ratio * this._currentActDuration * 10) / 10;
        this.seek(targetTime);
        this.openAddCueModal('screamer');
      });
    }

    // 4. Render Star Wars Transition Strip
    const laneTrans = this._container.querySelector('#pr-lane-trans') as HTMLDivElement;
    if (laneTrans) {
      const act = STORY_ACTS[this._currentActIndex];
      const isIntro = this._currentActIndex === 0 || act.id === 'intro_playbox';

      if (isIntro) {
        laneTrans.innerHTML = `
          <div style="display: flex; align-items: center; height: 100%; padding: 0 10px; color: #64748b; font-size: 11px; font-style: italic; user-select: none;">
            🎬 Старт игры: оптический переход отсутствует (переходы Star Wars работают между главами 1–8)
          </div>
        `;
      } else {
        const curTransKey = this.getTransitionSoundForAct(act.id);
      const opt = AVAILABLE_TRANSITION_OPTIONS.find(o => o.key === curTransKey);
      const transName = opt ? opt.name : curTransKey;
      const isTransSelected = this._selectedCueId === 'transition_lane';
      const isRandom = curTransKey === 'random';
      const badgeHtml = isRandom
        ? '<span class="pr-mode-indicator random" style="padding: 1px 4px; font-size: 9px;">🎲 РАНДОМ</span>'
        : '<span class="pr-mode-indicator fixed" style="padding: 1px 4px; font-size: 9px; background: #92400e;">📌 ФИКС</span>';

      const transEl = document.createElement('div');
      transEl.className = `pr-clip clip-trans ${isTransSelected ? 'selected' : ''}`;
      // Display transition block at start of act (0.0s to 3.5s)
      const transDur = 3.5;
      const widthPct = Math.min(40, Math.max(6, (transDur / this._currentActDuration) * 100));
      transEl.style.left = '0%';
      transEl.style.width = `${widthPct}%`;
      transEl.title = 'Кликните для выбора, прослушивания и проверки оптического перехода Star Wars';
      transEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis;">
          ${badgeHtml}
          <span style="font-weight: bold; white-space: nowrap; font-size: 11px;">${transName}</span>
        </div>
        <span style="font-size: 9px; opacity: 0.9; font-family: monospace;">[ 0.0s - 3.5s ]</span>
      `;
      transEl.addEventListener('pointerdown', (e: PointerEvent) => {
        e.stopPropagation();
        this._selectedCueId = 'transition_lane';
        this.render();
      });
      laneTrans.appendChild(transEl);
      }
    }
  }

  private _createClipElement(cue: PremiereCue, themeClass: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `pr-clip ${themeClass} ${cue.id === this._selectedCueId ? 'selected' : ''}`;
    el.setAttribute('data-cue-id', cue.id);

    const leftPct = (cue.startTime / this._currentActDuration) * 100;
    const widthPct = (cue.duration / this._currentActDuration) * 100;
    el.style.left = `${Math.max(0, leftPct)}%`;
    el.style.width = `${Math.min(100 - leftPct, Math.max(1.5, widthPct))}%`;

    el.innerHTML = `
      <div class="pr-handle-left" data-handle="left"></div>
      <div style="pointer-events: none; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
        <span class="pr-mode-indicator fixed" style="padding: 1px 4px; font-size: 9px;" title="Конкретный фиксированный отрезок">📌 ФИКС</span>
        <span>${cue.title}</span>
        <span style="font-size: 10px; opacity: 0.85; font-family: monospace;">[ ${cue.startTime.toFixed(1)}s - ${(cue.startTime + cue.duration).toFixed(1)}s ]</span>
      </div>
      <div class="pr-handle-right" data-handle="right"></div>
    `;

    // Pointer event listeners for selection & dragging
    el.addEventListener('pointerdown', (e: PointerEvent) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const isLeftHandle = target.getAttribute('data-handle') === 'left';
      const isRightHandle = target.getAttribute('data-handle') === 'right';

      // Select clip
      this._selectedCueId = cue.id;
      this.render();

      // Start dragging mode
      if (isLeftHandle) {
        this._startDragging('resize_start', cue, e);
      } else if (isRightHandle) {
        this._startDragging('resize_end', cue, e);
      } else {
        this._startDragging('move', cue, e);
      }
    });

    return el;
  }

  // ==========================================================================
  // DRAG & TRIM CONTROLS
  // ==========================================================================
  private _startDragging(mode: 'move' | 'resize_start' | 'resize_end', cue: PremiereCue, e: PointerEvent): void {
    this._dragMode = mode;
    this._dragCueId = cue.id;
    this._dragInitialPointerX = e.clientX;
    this._dragInitialStartTime = cue.startTime;
    this._dragInitialDuration = cue.duration;

    const timelineScroll = this._container.querySelector('#pr-timeline-scroll') as HTMLElement;
    const timelineWidth = timelineScroll ? timelineScroll.clientWidth : 800;
    this._timelinePixelsPerSecond = timelineWidth / this._currentActDuration;

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (this._dragMode === 'none' || !this._dragCueId) return;
      const dxPixels = moveEv.clientX - this._dragInitialPointerX;
      const dtSeconds = dxPixels / this._timelinePixelsPerSecond;

      const act = STORY_ACTS[this._currentActIndex];
      const actId = act.id;
      const cueList = this._cuesByAct[actId] || [];
      const targetCue = cueList.find(c => c.id === this._dragCueId);
      if (!targetCue) return;

      if (this._dragMode === 'move') {
        const newStart = Math.max(0, Math.min(this._currentActDuration - targetCue.duration, this._dragInitialStartTime + dtSeconds));
        targetCue.startTime = Math.round(newStart * 10) / 10;
      } else if (this._dragMode === 'resize_start') {
        const maxStart = this._dragInitialStartTime + this._dragInitialDuration - 1.0;
        const newStart = Math.max(0, Math.min(maxStart, this._dragInitialStartTime + dtSeconds));
        const newDur = (this._dragInitialStartTime + this._dragInitialDuration) - newStart;
        targetCue.startTime = Math.round(newStart * 10) / 10;
        targetCue.duration = Math.round(newDur * 10) / 10;
      } else if (this._dragMode === 'resize_end') {
        const maxDur = this._currentActDuration - targetCue.startTime;
        const newDur = Math.max(1.0, Math.min(maxDur, this._dragInitialDuration + dtSeconds));
        targetCue.duration = Math.round(newDur * 10) / 10;
      }

      // Update visually on the fly
      const clipEl = this._container.querySelector(`[data-cue-id="${targetCue.id}"]`) as HTMLElement;
      if (clipEl) {
        const leftPct = (targetCue.startTime / this._currentActDuration) * 100;
        const widthPct = (targetCue.duration / this._currentActDuration) * 100;
        clipEl.style.left = `${Math.max(0, leftPct)}%`;
        clipEl.style.width = `${Math.min(100 - leftPct, Math.max(1.5, widthPct))}%`;
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (this._dragMode !== 'none') {
        this._dragMode = 'none';
        this._dragCueId = null;
        this.saveToStorage();
        this.render();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  // ==========================================================================
  // EVENT LISTENERS & ACTIONS
  // ==========================================================================
  private _attachEventListeners(): void {
    // 1. Act Selector Tabs
    this._container.querySelectorAll('.pr-act-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-act-idx'));
        this.switchAct(idx);
      });
    });

    // 2. Toolbar Action Buttons
    const saveBtn = this._container.querySelector('#pr-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveToStorage());

    const copyBtn = this._container.querySelector('#pr-copy-config-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => this.copyConfigToClipboard());

    const copyAllBtn = this._container.querySelector('#pr-copy-all-btn');
    if (copyAllBtn) copyAllBtn.addEventListener('click', () => this.copyAllConfigsToClipboard());

    const fullBtn = this._container.querySelector('#pr-fullscreen-btn');
    if (fullBtn) fullBtn.addEventListener('click', () => {
      this._isFullscreen = !this._isFullscreen;
      this._container.classList.toggle('fullscreen', this._isFullscreen);
      this.render();
    });

    const closeBtn = this._container.querySelector('#pr-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // 3. Ruler Scrubbing (Continuous Pointer Dragging / Scrubbing)
    const ruler = this._container.querySelector('#pr-ruler') as HTMLElement;
    if (ruler) {
      ruler.addEventListener('pointerdown', (e: PointerEvent) => {
        try { ruler.setPointerCapture(e.pointerId); } catch (_) {}
        const scrub = (pev: PointerEvent) => {
          const rect = ruler.getBoundingClientRect();
          if (rect.width <= 0) return;
          const ratio = Math.max(0, Math.min(1, (pev.clientX - rect.left) / rect.width));
          const targetTime = ratio * this._currentActDuration;
          this.seek(targetTime);
        };
        scrub(e);

        const onPointerMove = (pev: PointerEvent) => {
          scrub(pev);
        };
        const onPointerUp = (pev: PointerEvent) => {
          try { ruler.releasePointerCapture(pev.pointerId); } catch (_) {}
          ruler.removeEventListener('pointermove', onPointerMove);
          ruler.removeEventListener('pointerup', onPointerUp);
          ruler.removeEventListener('pointercancel', onPointerUp);
        };
        ruler.addEventListener('pointermove', onPointerMove);
        ruler.addEventListener('pointerup', onPointerUp);
        ruler.addEventListener('pointercancel', onPointerUp);
      });
    }

    // 4. Inspector Buttons
    const replaceBtn = this._container.querySelector('#pr-replace-track-btn');
    if (replaceBtn) replaceBtn.addEventListener('click', () => this.openTrackReplacementModal());

    const deleteBtn = this._container.querySelector('#pr-delete-cue-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteSelectedCue());

    // Toggle Intro Random / Fixed Mode (Header & Inspector)
    const toggleRandomHandler = () => {
      const isRandom = AmbientManager.isIntroRandom();
      AmbientManager.setIntroRandomMode(!isRandom, true);
      const activeKey = AmbientManager.getIntroTrack();
      if ((window as any).__movieApp) {
        (window as any).__movieApp.setIntroTrackVariant(activeKey);
      }
      this.render();
      this.showToast(!isRandom ? '🎲 ВКЛЮЧЕН РАНДОМНЫЙ ВЫБОР ТРЕКА' : '📌 ТРЕК ЗАФИКСИРОВАН');
    };

    const toggleHeaderRandomBtn = this._container.querySelector('#pr-toggle-intro-random');
    if (toggleHeaderRandomBtn) toggleHeaderRandomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRandomHandler();
    });

    const inspToggleRandomBtn = this._container.querySelector('#pr-inspector-toggle-random');
    if (inspToggleRandomBtn) inspToggleRandomBtn.addEventListener('click', () => {
      toggleRandomHandler();
    });

    const addBtn = this._container.querySelector('#pr-add-cue-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openAddCueModal());

    const addScreamerBtn = this._container.querySelector('#pr-add-screamer-btn');
    if (addScreamerBtn) addScreamerBtn.addEventListener('click', () => this.openAddCueModal('screamer'));

    const addScreamerHeaderBtn = this._container.querySelector('#pr-add-screamer-header-btn');
    if (addScreamerHeaderBtn) addScreamerHeaderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openAddCueModal('screamer');
    });

    const addDreadHeaderBtn = this._container.querySelector('#pr-add-dread-header-btn');
    if (addDreadHeaderBtn) addDreadHeaderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openAddCueModal('dread');
    });

    const addPeaceHeaderBtn = this._container.querySelector('#pr-add-peace-header-btn');
    if (addPeaceHeaderBtn) addPeaceHeaderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openAddCueModal('peace');
    });

    const toggleTransRandomBtn = this._container.querySelector('#pr-toggle-trans-random-btn');
    if (toggleTransRandomBtn) toggleTransRandomBtn.addEventListener('click', () => {
      const act = STORY_ACTS[this._currentActIndex];
      const curKey = this.getTransitionSoundForAct(act.id);
      const newKey = curKey === 'random' ? 'trailer_tension_riser_to_brutal_cut' : 'random';
      this.setTransitionSoundForAct(act.id, newKey);
      this.render();
      this.showToast(newKey === 'random' ? '🎲 ВКЛЮЧЕН СЛУЧАЙНЫЙ ВЫБОР ЗВУКА ШТОРКИ (FIN)' : '📌 ЗВУК ШТОРКИ ЗАФИКСИРОВАН');
    });

    const testTransSoundBtn = this._container.querySelector('#pr-test-trans-sound-btn');
    if (testTransSoundBtn) testTransSoundBtn.addEventListener('click', (e) => {
      const act = STORY_ACTS[this._currentActIndex];
      let soundKey = this.getTransitionSoundForAct(act.id);
      if (soundKey === 'random') {
        const finKeys = FIN_TRANSITION_KEYS;
        soundKey = finKeys[Math.floor(Math.random() * finKeys.length)];
      }
      this._playPreviewAudio(soundKey, testTransSoundBtn as HTMLElement);
    });

    const testTransWipeBtn = this._container.querySelector('#pr-test-trans-wipe-btn');
    if (testTransWipeBtn) testTransWipeBtn.addEventListener('click', () => {
      const act = STORY_ACTS[this._currentActIndex];
      let soundKey = this.getTransitionSoundForAct(act.id);
      if ((window as any).__movieApp) {
        if (soundKey === 'random') {
          soundKey = (window as any).__movieApp.getRandomFinTransitionSound();
        }
        (window as any).__movieApp.testStarWarsTransition(soundKey);
        this.showToast(`🎬 ПЕРЕХОД STAR WARS: [ ${soundKey} ]`);
      }
    });

    // 4a. Track Volume Sliders
    this._container.querySelectorAll<HTMLInputElement>('[data-vol-track]').forEach(slider => {
      slider.addEventListener('input', (e) => {
        e.stopPropagation();
        const input = e.currentTarget as HTMLInputElement;
        const cat = input.getAttribute('data-vol-track') as 'dread' | 'peace' | 'ambient' | 'screamer';
        const valPct = Number(input.value);
        if (cat && Number.isFinite(valPct)) {
          const mult = valPct / 100;
          (AmbientManager as any).setCategoryVolume?.(cat, mult);
          const label = this._container?.querySelector(`[data-vol-label="${cat}"]`);
          if (label) label.textContent = `${valPct}%`;
        }
      });
      slider.addEventListener('change', (e) => {
        e.stopPropagation();
        const input = e.currentTarget as HTMLInputElement;
        const cat = input.getAttribute('data-vol-track') as 'dread' | 'peace' | 'ambient' | 'screamer';
        const valPct = Number(input.value);
        this.showToast(`🔊 Громкость дорожки [ ${cat.toUpperCase()} ]: ${valPct}%`);
      });
    });

    // 4a-2. Selected Cue Volume Slider
    const cueVolSlider = this._container.querySelector<HTMLInputElement>('.pr-cue-vol-slider');
    if (cueVolSlider && this._selectedCueId) {
      cueVolSlider.addEventListener('input', (e) => {
        e.stopPropagation();
        const input = e.currentTarget as HTMLInputElement;
        const valPct = Number(input.value);
        const act = STORY_ACTS[this._currentActIndex];
        if (act) {
          const cues = this.getCuesForAct(act.id);
          const cue = cues.find(c => c.id === this._selectedCueId);
          if (cue) {
            cue.customGain = valPct / 100;
            this.saveToStorage();
            AmbientManager.syncMuteVolumes();
            const valSpan = this._container?.querySelector('.pr-cue-vol-val');
            if (valSpan) valSpan.textContent = `${valPct}%`;
          }
        }
      });
      cueVolSlider.addEventListener('change', (e) => {
        e.stopPropagation();
        const input = e.currentTarget as HTMLInputElement;
        const valPct = Number(input.value);
        this.showToast(`🔊 Громкость отрезка: ${valPct}%`);
      });
    }

    // 4b. Track Mute Buttons
    this._container.querySelectorAll('[data-mute-track]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = (e.currentTarget as HTMLElement).getAttribute('data-mute-track') as 'dread' | 'peace' | 'ambient' | 'screamer';
        if (cat) {
          const isMuted = AmbientManager.isCategoryMuted(cat);
          AmbientManager.setCategoryMuted(cat, !isMuted);
          this.render();
          this.showToast(!isMuted ? `🔇 ДОРОЖКА [ ${cat.toUpperCase()} ] ЗАМУЧЕНА` : `🔊 ДОРОЖКА [ ${cat.toUpperCase()} ] ВКЛЮЧЕНА`);
        }
      });
    });

    // 4c. Ruler Cut Markers Click
    this._container.querySelectorAll('[data-cut-time]').forEach(mark => {
      mark.addEventListener('click', (e) => {
        e.stopPropagation();
        const t = Number((e.currentTarget as HTMLElement).getAttribute('data-cut-time'));
        if (Number.isFinite(t)) this.seek(t);
      });
    });

    // 5. Nudge Buttons
    this._container.querySelectorAll('[data-nudge-start]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = Number((e.currentTarget as HTMLElement).getAttribute('data-nudge-start'));
        this.nudgeSelectedCue('start', val);
      });
    });

    this._container.querySelectorAll('[data-nudge-dur]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = Number((e.currentTarget as HTMLElement).getAttribute('data-nudge-dur'));
        this.nudgeSelectedCue('duration', val);
      });
    });
  }

  private _attachGlobalKeyboard(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Toggle with 'D' or Russian 'В' (when not typing in an input)
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        if (!isDevMode() && !this._isOpen) return;
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this._isOpen) {
        if (this._modalElement.classList.contains('open')) {
          this._closeModal();
        } else {
          this.close();
        }
      }
    });
  }

  // ==========================================================================
  // NUDGING & EDITING
  // ==========================================================================
  public nudgeSelectedCue(field: 'start' | 'duration', delta: number): void {
    if (!this._selectedCueId) return;
    const act = STORY_ACTS[this._currentActIndex];
    const cueList = this._cuesByAct[act.id] || [];
    const cue = cueList.find(c => c.id === this._selectedCueId);
    if (!cue) return;

    if (field === 'start') {
      const newStart = Math.max(0, Math.min(this._currentActDuration - cue.duration, cue.startTime + delta));
      cue.startTime = Math.round(newStart * 100) / 100;
    } else {
      const maxDur = this._currentActDuration - cue.startTime;
      const newDur = Math.max(1.0, Math.min(maxDur, cue.duration + delta));
      cue.duration = Math.round(newDur * 100) / 100;
    }

    this.saveToStorage();
    this.render();
  }

  public deleteSelectedCue(): void {
    if (!this._selectedCueId) return;
    const act = STORY_ACTS[this._currentActIndex];
    const cueList = this._cuesByAct[act.id] || [];
    this._cuesByAct[act.id] = cueList.filter(c => c.id !== this._selectedCueId);
    this._selectedCueId = null;
    this.saveToStorage();
    this.render();
    this.showToast('🗑️ ОТРЕЗОК УДАЛЕН');
  }

  // ==========================================================================
  // TRACK REPLACEMENT MODAL
  // ==========================================================================
  public openTrackReplacementModal(): void {
    this._stopPreviewAudio();
    if (!this._selectedCueId) return;
    const act = STORY_ACTS[this._currentActIndex];
    const isTransition = this._selectedCueId === 'transition_lane';
    const isAmbient = this._selectedCueId === 'ambient_base_lane';
    const cueList = this._cuesByAct[act.id] || [];
    const cue = (isAmbient || isTransition) ? null : cueList.find(c => c.id === this._selectedCueId);
    if (!isAmbient && !isTransition && !cue) return;

    let matchingTracks: TrackOption[] = [];
    let modalTitle = '';

    if (cue && cue.type === 'screamer') {
      modalTitle = `🔄 ВЫБОР ЗВУКА СКРИМЕРА / ШТОРКИ ДЛЯ [ ${act.title} ]`;
      matchingTracks = AVAILABLE_TRANSITION_OPTIONS.filter(o => o.key !== 'random');
    } else if (isTransition) {
      modalTitle = `🔄 ВЫБОР ЗВУКА ШТОРКИ STAR WARS ДЛЯ [ ${act.title} ]`;
      matchingTracks = AVAILABLE_TRANSITION_OPTIONS;
    } else if (isAmbient) {
      if (this._currentActIndex === 0) {
        modalTitle = '🔄 ВЫБОР РЕЖИМА И ТРЕКА ИНТРО (АКТ 0: ЗАСТАВКА)';
        matchingTracks = [
          {
            key: 'random',
            name: '🎲 Случайный выбор (Рандом)',
            category: 'ambient',
            durationSec: 45.5,
            description: 'При каждом старте интро случайно выбирается Titan Forge или Desolate Cry'
          },
          {
            key: 'titan_forge',
            name: '📌 Titan Forge (Конкретный)',
            category: 'ambient',
            durationSec: 45.5,
            description: 'Кузница титанов — тяжелый перкуссионный индастриал (дроп логотипа ровно на 24.0s)'
          },
          {
            key: 'desolate_cry',
            name: '📌 Desolate Cry in the Distortion (Конкретный)',
            category: 'ambient',
            durationSec: 45.5,
            description: 'Космический гул пустоты и дисторшна (нарастание титра на 27.0s)'
          }
        ];
      } else {
        modalTitle = `🔄 ВЫБОР БАЗОВОГО ЭМБИЕНТА ДЛЯ [ ${act.title} ]`;
        matchingTracks = AVAILABLE_TRACK_OPTIONS.filter(o => o.category === 'ambient');
      }
    } else if (cue) {
      matchingTracks = AVAILABLE_TRACK_OPTIONS.filter(o => o.category === cue.type);
      modalTitle = `🔄 ЗАМЕНА ТРЕКА ДЛЯ [ ${cue.title} ]`;
    }

    const currentKey = isTransition
      ? this.getTransitionSoundForAct(act.id)
      : isAmbient
      ? (this._currentActIndex === 0
          ? (AmbientManager.isIntroRandom() ? 'random' : AmbientManager.getIntroTrack())
          : (AmbientManager.getTrackForAct(this._currentActIndex, act.id).key || 'desolate_cry'))
      : (cue ? cue.cueKey : '');

    let cardsHtml = '';
    matchingTracks.forEach(tr => {
      const isActive = tr.key === currentKey ? 'active' : '';
      cardsHtml += `
        <div class="pr-track-card ${isActive}" data-track-key="${tr.key}">
          <div>
            <div class="pr-track-title">${tr.name}</div>
            <div class="pr-track-desc">${tr.description} • [ ${tr.durationSec}s ]</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="pr-btn" data-preview-key="${tr.key}">▶ ТЕСТ</button>
            <button class="pr-btn pr-btn-primary" data-select-key="${tr.key}">ВЫБРАТЬ</button>
          </div>
        </div>
      `;
    });

    this._modalElement.innerHTML = `
      <div class="pr-modal">
        <div class="pr-modal-header">
          <div class="pr-modal-title">${modalTitle}</div>
          <button class="pr-btn pr-btn-close" id="pr-modal-close-btn">✖</button>
        </div>
        <div class="pr-modal-body">${cardsHtml}</div>
      </div>
    `;

    this._modalElement.classList.add('open');

    // Attach Modal Listeners
    const modalClose = this._modalElement.querySelector('#pr-modal-close-btn');
    if (modalClose) modalClose.addEventListener('click', () => this._closeModal());

    this._modalElement.querySelectorAll('[data-preview-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (e.currentTarget as HTMLElement).getAttribute('data-preview-key');
        if (key) this._playPreviewAudio(key, btn as HTMLElement);
      });
    });

    this._modalElement.querySelectorAll('[data-select-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (e.currentTarget as HTMLElement).getAttribute('data-select-key');
        if (!key) return;

        if (isTransition) {
          this.setTransitionSoundForAct(act.id, key);
          this._closeModal();
          this.render();
          const opt = AVAILABLE_TRANSITION_OPTIONS.find(o => o.key === key);
          this.showToast(`✅ ЗВУК ШТОРКИ ИЗМЕНЕН НА: ${opt ? opt.name : key}`);
          return;
        }

        if (isAmbient) {
          if (this._currentActIndex === 0) {
            if (key === 'random') {
              AmbientManager.setIntroRandomMode(true, true);
              const activeKey = AmbientManager.getIntroTrack();
              if ((window as any).__movieApp) {
                (window as any).__movieApp.setIntroTrackVariant(activeKey);
              }
              this._closeModal();
              this.render();
              this.showToast('🎲 ВКЛЮЧЕН РАНДОМНЫЙ ВЫБОР ИНТРО');
            } else {
              AmbientManager.setIntroRandomMode(false, false);
              AmbientManager.setIntroTrack(key as 'desolate_cry' | 'titan_forge', true);
              if ((window as any).__movieApp) {
                (window as any).__movieApp.setIntroTrackVariant(key);
              }
              this._closeModal();
              this.render();
              this.showToast(`📌 ТРЕК ЗАФИКСИРОВАН: ${key === 'desolate_cry' ? 'Desolate Cry' : 'Titan Forge'}`);
            }
          } else {
            AmbientManager.setLockedTrackForAct(act.id, key as any);
            AmbientManager.playTrack(key as any, 0.28, 0.5);
            this._closeModal();
            this.render();
            const chosen = AVAILABLE_TRACK_OPTIONS.find(o => o.key === key);
            this.showToast(`✅ БАЗОВЫЙ ЭМБИЕНТ ИЗМЕНЕН НА: ${chosen ? chosen.name : key}`);
          }
          return;
        }

        const chosen = AVAILABLE_TRACK_OPTIONS.find(o => o.key === key) || AVAILABLE_TRANSITION_OPTIONS.find(o => o.key === key);
        if (chosen && cue) {
          cue.cueKey = chosen.key;
          cue.title = chosen.name;
          cue.duration = Math.min(cue.duration, chosen.durationSec);
          this._closeModal();
          this.saveToStorage();
          this.render();
          this.showToast(`✅ ТРЕК ЗАМЕНЕН НА: ${chosen.name}`);
        }
      });
    });
  }

  public openAddCueModal(targetCategory?: 'dread' | 'peace' | 'screamer'): void {
    this._stopPreviewAudio();
    const act = STORY_ACTS[this._currentActIndex];
    const isScreamerTarget = targetCategory === 'screamer';
    const modalTitle = isScreamerTarget
      ? `⚡ ВСТАВИТЬ СКРИМЕР (ЗВУК ШТОРКИ) В ТРЕК Т4 • [ ${act.title} ]`
      : `➕ ДОБАВИТЬ ОТРЕЗОК В АКТ ${this._currentActIndex} • [ ${act.title} ]`;

    const dreadOptions = AVAILABLE_TRACK_OPTIONS.filter(t => t.category === 'dread');
    const peaceOptions = AVAILABLE_TRACK_OPTIONS.filter(t => t.category === 'peace');
    const screamerOptions = AVAILABLE_TRANSITION_OPTIONS.filter(o => o.key !== 'random');

    const renderScreamerSection = () => {
      let s = `<b style="color: #f59e0b; font-size: 13px; margin-top: 10px; display: flex; align-items: center; gap: 6px;">⚡ ЗВУКИ ШТОРОК И СКРИМЕРЫ (TRANSITION BRAAMS & RISERS • ТРЕК Т4):</b>`;
      screamerOptions.forEach(tr => {
        s += `
          <div class="pr-track-card" data-insert-key="${tr.key}" data-insert-type="screamer" style="border-left: 3px solid #f59e0b;">
            <div>
              <div class="pr-track-title" style="color: #fde68a;">${tr.name}</div>
              <div class="pr-track-desc">${tr.description} • [ ${tr.durationSec}s ]</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="pr-btn" data-preview-key="${tr.key}">▶ ТЕСТ</button>
              <button class="pr-btn pr-btn-warning" data-insert-key="${tr.key}" data-insert-type="screamer" style="background: #d97706;">ВСТАВИТЬ В Т4</button>
            </div>
          </div>
        `;
      });
      return s;
    };

    const renderDreadSection = () => {
      let s = `<b style="color: #f43f5e; font-size: 13px; margin-top: 14px; display: flex; align-items: center; gap: 6px;">💀 НАГНЕТАНИЕ И ТРЕВОГА (ТРЕК Т1):</b>`;
      dreadOptions.forEach(tr => {
        s += `
          <div class="pr-track-card" data-insert-key="${tr.key}" data-insert-type="dread">
            <div>
              <div class="pr-track-title">${tr.name}</div>
              <div class="pr-track-desc">${tr.description} • [ ${tr.durationSec}s ]</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="pr-btn" data-preview-key="${tr.key}">▶ ТЕСТ</button>
              <button class="pr-btn pr-btn-primary" data-insert-key="${tr.key}" data-insert-type="dread">ВСТАВИТЬ В Т1</button>
            </div>
          </div>
        `;
      });
      return s;
    };

    const renderPeaceSection = () => {
      let s = `<b style="color: #10b981; font-size: 13px; margin-top: 14px; display: flex; align-items: center; gap: 6px;">🕊️ ДОБРАЯ МУЗЫКА И ОБЛЕГЧЕНИЕ (ТРЕК Т2):</b>`;
      peaceOptions.forEach(tr => {
        s += `
          <div class="pr-track-card" data-insert-key="${tr.key}" data-insert-type="peace">
            <div>
              <div class="pr-track-title">${tr.name}</div>
              <div class="pr-track-desc">${tr.description} • [ ${tr.durationSec}s ]</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="pr-btn" data-preview-key="${tr.key}">▶ ТЕСТ</button>
              <button class="pr-btn pr-btn-primary" data-insert-key="${tr.key}" data-insert-type="peace">ВСТАВИТЬ В Т2</button>
            </div>
          </div>
        `;
      });
      return s;
    };

    let bodyContent = '';
    if (isScreamerTarget) {
      bodyContent = renderScreamerSection() + renderDreadSection() + renderPeaceSection();
    } else if (targetCategory === 'peace') {
      bodyContent = renderPeaceSection() + renderDreadSection() + renderScreamerSection();
    } else {
      bodyContent = renderDreadSection() + renderPeaceSection() + renderScreamerSection();
    }

    let html = `
      <div class="pr-modal">
        <div class="pr-modal-header">
          <div class="pr-modal-title">${modalTitle}</div>
          <button class="pr-btn pr-btn-close" id="pr-modal-close-btn">✖</button>
        </div>
        <div class="pr-modal-body">
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">Вставка в позицию курсора: <b style="color: #38bdf8; font-family: monospace;">${this._currentTime.toFixed(1)}s</b>:</div>
          ${bodyContent}
    `;

    html += `</div></div>`;
    this._modalElement.innerHTML = html;
    this._modalElement.classList.add('open');

    const modalClose = this._modalElement.querySelector('#pr-modal-close-btn');
    if (modalClose) modalClose.addEventListener('click', () => this._closeModal());

    this._modalElement.querySelectorAll('[data-preview-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (e.currentTarget as HTMLElement).getAttribute('data-preview-key');
        if (key) this._playPreviewAudio(key, btn as HTMLElement);
      });
    });

    this._modalElement.querySelectorAll('[data-insert-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = (e.currentTarget as HTMLElement).getAttribute('data-insert-key');
        const type = (e.currentTarget as HTMLElement).getAttribute('data-insert-type') as 'dread' | 'peace' | 'screamer';
        const tr = AVAILABLE_TRACK_OPTIONS.find(o => o.key === key) || AVAILABLE_TRANSITION_OPTIONS.find(o => o.key === key);
        if (tr) {
          const newCue: PremiereCue = {
            id: `cue_${Date.now()}`,
            actId: act.id,
            type: type,
            cueKey: tr.key,
            title: tr.name,
            startTime: Math.round(this._currentTime * 10) / 10,
            duration: Math.min(25.0, tr.durationSec),
            duckAmbientTo: type === 'screamer' ? 1.0 : (type === 'peace' ? 0.0 : 0.005),
            customGain: type === 'screamer' ? 1.25 : 1.0
          };
          if (!this._cuesByAct[act.id]) this._cuesByAct[act.id] = [];
          this._cuesByAct[act.id].push(newCue);
          this._selectedCueId = newCue.id;
          this._closeModal();
          this.saveToStorage();
          this.render();
          this.showToast(`➕ ДОБАВЛЕН ОТРЕЗОК: ${tr.name}`);
        }
      });
    });
  }

  private _closeModal(): void {
    this._modalElement.classList.remove('open');
    this._stopPreviewAudio();
  }

  private _stopPreviewAudio(): void {
    if (this._activePreviewBtn) {
      if (this._activePreviewBtn.getAttribute('id') === 'pr-test-trans-sound-btn') {
        this._activePreviewBtn.innerHTML = '▶ ТЕСТ ЗВУКА';
      } else {
        this._activePreviewBtn.innerHTML = '▶ ТЕСТ';
      }
      this._activePreviewBtn.style.background = '';
      this._activePreviewBtn.style.borderColor = '';
      this._activePreviewBtn.style.color = '';
      this._activePreviewBtn = null;
    }
    if (this._audioPreviewElement) {
      const el = this._audioPreviewElement;
      this._audioPreviewElement = null;
      this._activePreviewKey = null;
      try {
        el.onended = null;
        el.onerror = null;
        el.pause();
        el.currentTime = 0;
        el.src = '';
      } catch (_) {}
    }
  }

  private _playPreviewAudio(cueKey: string, clickedBtn?: HTMLElement): void {
    // If user clicked the same test button while it is currently playing -> toggle stop!
    if (this._activePreviewKey === cueKey && this._audioPreviewElement && !this._audioPreviewElement.paused) {
      this._stopPreviewAudio();
      return;
    }

    // Stop any previously playing preview cleanly
    this._stopPreviewAudio();

    let actualKey = cueKey;
    if (actualKey === 'random') {
      const keys = FIN_TRANSITION_KEYS;
      actualKey = keys[Math.floor(Math.random() * keys.length)];
    }

    const url = getAudioUrl(actualKey);
    if (!url) {
      console.warn('[PremiereAudioDirector] Audio preview URL not found for key:', actualKey);
      this.showToast('Audio not found: ' + actualKey);
      return;
    }

    try {
      const audio = new Audio(url);
      audio.volume = 0.85;
      audio.muted = false;
      this._audioPreviewElement = audio;
      this._activePreviewKey = cueKey;

      if (clickedBtn) {
        this._activePreviewBtn = clickedBtn;
        if (clickedBtn.getAttribute('id') === 'pr-test-trans-sound-btn') {
          clickedBtn.innerHTML = '⏹ СТОП ТЕСТ';
        } else {
          clickedBtn.innerHTML = '⏹ СТОП';
        }
        clickedBtn.style.background = '#0284c7';
        clickedBtn.style.borderColor = '#38bdf8';
        clickedBtn.style.color = '#ffffff';
      }

      audio.onended = () => {
        this._stopPreviewAudio();
      };

      audio.onerror = (e) => {
        console.warn('[PremiereAudioDirector] Audio preview load error for', actualKey, e);
        this._stopPreviewAudio();
        this.showToast('Audio error: ' + actualKey);
      };

      const p = audio.play();
      if (p !== undefined) {
        p.catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('[PremiereAudioDirector] Play rejected:', err);
            this._stopPreviewAudio();
          }
        });
      }
    } catch (err) {
      console.error('[PremiereAudioDirector] Exception in _playPreviewAudio:', err);
      this._stopPreviewAudio();
    }
  }

  // ==========================================================================
  // PLAYHEAD, SEEKING & ACT SWITCHING
  // ==========================================================================
  public updatePlayhead(currentTime: number): void {
    this._currentTime = currentTime;
    const playhead = this._container.querySelector('#pr-playhead') as HTMLElement;
    if (playhead && this._currentActDuration > 0) {
      const pct = (currentTime / this._currentActDuration) * 100;
      playhead.style.left = `${Math.max(0, Math.min(100, pct))}%`;
    }
  }

  public seek(seconds: number): void {
    this._currentTime = Math.max(0, Math.min(this._currentActDuration, seconds));
    this.updatePlayhead(this._currentTime);
    if (this.onSeekRequested) {
      this.onSeekRequested(this._currentTime);
    }
  }

  public switchAct(actIndex: number): void {
    if (actIndex < 0 || actIndex >= STORY_ACTS.length) return;
    this._currentActIndex = actIndex;
    const act = STORY_ACTS[actIndex];
    this._currentActDuration = act.duration || 45.5;
    this._selectedCueId = null;
    this.render();
    if (this.onActChangeRequested) {
      this.onActChangeRequested(actIndex);
    }
  }

  public syncActFromApp(actIndex: number, currentTime: number): void {
    if (this._currentActIndex !== actIndex) {
      this._currentActIndex = actIndex;
      const act = STORY_ACTS[actIndex];
      this._currentActDuration = act ? (act.duration || 45.5) : 45.5;
      this._selectedCueId = null;
      if (this._isOpen) this.render();
    }
    this.updatePlayhead(currentTime);
  }

  // ==========================================================================
  // PUBLIC CONTROLS & TOAST
  // ==========================================================================
  public open(): void {
    if (!isDevMode()) return;
    this._isOpen = true;
    this._container.classList.add('open');
    if (this._toggleButton) this._toggleButton.style.display = 'none';
    this.render();
  }

  public close(): void {
    this._isOpen = false;
    this._container.classList.remove('open');
    if (this._toggleButton && isDevMode()) this._toggleButton.style.display = 'flex';
    this._closeModal();
  }

  public toggle(): void {
    if (this._isOpen) {
      this.close();
    } else {
      if (!isDevMode()) return;
      this.open();
    }
  }

  public isOpen(): boolean {
    return this._isOpen;
  }

  public showToast(message: string): void {
    this._toastElement.textContent = message;
    this._toastElement.classList.add('show');
    setTimeout(() => {
      this._toastElement.classList.remove('show');
    }, 2800);
  }

  public getCuesForAct(actId: string): PremiereCue[] {
    return this._cuesByAct[actId] || [];
  }

  public getActiveCueAtTime(actId: string, time: number, typeFilter?: 'cinematic' | 'screamer'): {
    cue: PremiereCue;
    offset: number;
  } | null {
    const cues = this._cuesByAct[actId] || [];
    for (const cue of cues) {
      if (typeFilter === 'screamer' && cue.type !== 'screamer') continue;
      if (typeFilter === 'cinematic' && cue.type === 'screamer') continue;
      if (time >= cue.startTime && time < (cue.startTime + cue.duration)) {
        return {
          cue,
          offset: Math.max(0, time - cue.startTime)
        };
      }
    }
    return null;
  }
}
