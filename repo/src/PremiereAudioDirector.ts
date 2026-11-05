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
  type: 'dread' | 'peace' | 'ambient';
  cueKey: string;
  title: string;
  startTime: number;
  duration: number;
  duckAmbientTo?: number;
}

export interface TrackOption {
  key: string;
  name: string;
  category: 'dread' | 'peace' | 'ambient';
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

// ============================================================================
// БАЗОВЫЕ НАЧАЛЬНЫЕ ОТРЕЗКИ ПО АКТАМ
// ============================================================================
const DEFAULT_INITIAL_CUES: Record<string, PremiereCue[]> = {
  intro_playbox: [],
  act_1_convent: [
    {
      id: 'cue_act1_drug',
      actId: 'act_1_convent',
      type: 'dread',
      cueKey: 'braam_analog_synth_pitch_drop',
      title: '💀 Цифровой наркотик (Аналоговый Синт)',
      startTime: 17.14,
      duration: 10.0,
      duckAmbientTo: 0.005
    },
    {
      id: 'cue_act1_terror',
      actId: 'act_1_convent',
      type: 'dread',
      cueKey: 'trailer_tension_riser_to_brutal_cut',
      title: '💀 Нагнетающий Райзер к обрыву (Конверсия)',
      startTime: 45.58,
      duration: 7.5,
      duckAmbientTo: 0.005
    }
  ],
  act_2_sarcophagus: [
    {
      id: 'cue_act2_chittering',
      actId: 'act_2_sarcophagus',
      type: 'dread',
      cueKey: 'trailer_dissonant_warp_stinger',
      title: '💀 Диссонирующий варп-стингер (Даниал 3A)',
      startTime: 25.14,
      duration: 6.5,
      duckAmbientTo: 0.005
    }
  ],
  act_3_timemachine: [
    {
      id: 'cue_act3_peace_edik',
      actId: 'act_3_timemachine',
      type: 'peace',
      cueKey: 'peace_03_pin_drop_silence_gentle_resolution_25s',
      title: '🕊️ Нежное разрешение (Благодать Эдика)',
      startTime: 108.62,
      duration: 25.0,
      duckAmbientTo: 0.0
    },
    {
      id: 'cue_act3_chronoreactor',
      actId: 'act_3_timemachine',
      type: 'dread',
      cueKey: 'braam_reactor_turbine_overdrive',
      title: '💀 Взвыв хронореактора (Турбина Overdrive)',
      startTime: 112.00,
      duration: 8.0,
      duckAmbientTo: 0.005
    }
  ],
  act_4_engine: [
    {
      id: 'cue_act4_morlock_march',
      actId: 'act_4_engine',
      type: 'dread',
      cueKey: 'braam_analog_synth_pitch_drop',
      title: '💀 Цифровой наркотик (Аналоговый Синт)',
      startTime: 23.9,
      duration: 10.0,
      duckAmbientTo: 0.005
    },
    {
      id: 'cue_act4_khukhro_peace',
      actId: 'act_4_engine',
      type: 'peace',
      cueKey: 'peace_01_pin_drop_silence_pure_calm_25s',
      title: '🕊️ Добрая передышка Хухро (240 сек)',
      startTime: 60.0,
      duration: 30.0,
      duckAmbientTo: 0
    }
  ],
  act_5_clientarchs: [
    {
      id: 'cue_act5_invasion_terror',
      actId: 'act_5_clientarchs',
      type: 'dread',
      cueKey: 'trailer_reese_bass_distortion_hit',
      title: '💀 Перегруженный Рис-Бас (Вторжение Правконосцев)',
      startTime: 97.96,
      duration: 6.0,
      duckAmbientTo: 0.005
    },
    {
      id: 'cue_act5_nightmare_drop',
      actId: 'act_5_clientarchs',
      type: 'dread',
      cueKey: 'braam_seismic_tectonic_rumble',
      title: '💀 Сейсмический грохот (Кошмар Правконосцев)',
      startTime: 208.70,
      duration: 12.0,
      duckAmbientTo: 0.005
    }
  ],
  act_6_punishment: [
    {
      id: 'cue_act6_punishment_march',
      actId: 'act_6_punishment',
      type: 'dread',
      cueKey: 'braam_titan_warhorn_doom',
      title: '💀 Горн Судного Дня (Приговор Трибунала)',
      startTime: 53.40,
      duration: 8.0,
      duckAmbientTo: 0.005
    }
  ],
  act_6_reward: [
    {
      id: 'cue_act6_cookie_grace',
      actId: 'act_6_reward',
      type: 'peace',
      cueKey: 'peace_08_pin_drop_silence_reward_grace_60s',
      title: '🕊️ Печенька благодати (Высшая милость)',
      startTime: 0.0,
      duration: 60.0,
      duckAmbientTo: 0.0
    },
    {
      id: 'cue_act6_needle_drop',
      actId: 'act_6_reward',
      type: 'dread',
      cueKey: 'trailer_pneumatic_gate_crush',
      title: '⚡ Сервисная игла пневмодозатора (Пневмо-краш)',
      startTime: 60.18,
      duration: 6.0,
      duckAmbientTo: 0.005
    }
  ],
  act_8_outro: [
    {
      id: 'cue_act8_outro_terror',
      actId: 'act_8_outro',
      type: 'dread',
      cueKey: 'trailer_braam_sub_drop',
      title: '💀 Финальный слепой старт (Саб-Дроп Брам)',
      startTime: 30.62,
      duration: 8.0,
      duckAmbientTo: 0.005
    }
  ]
};

const STORAGE_KEY = 'playbox_premiere_audio_director_cues_v4';

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

    // Check if any cue should play right now
    const curTime = this._currentTime;
    for (const cue of cues) {
      if (curTime >= cue.startTime && curTime < (cue.startTime + cue.duration)) {
        const offset = curTime - cue.startTime;
        AmbientManager.syncCinematicCue(cue.cueKey, offset, !AmbientManager.isPaused());
        return;
      }
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
        width: 190px;
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

    // 2. Create Floating Toggle Button (Always Available)
    this._toggleButton = document.createElement('button');
    this._toggleButton.id = 'premiere-audio-director-btn';
    this._toggleButton.innerHTML = `🎚️ РЕЖИССУРА ЗВУКА (D)`;
    this._toggleButton.onclick = () => this.toggle();
    document.body.appendChild(this._toggleButton);

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
      const badgeCls = selectedCue.type === 'dread' ? 'pr-badge-dread' : 'pr-badge-peace';
      const typeLabel = selectedCue.type === 'dread' ? '💀 НАГНЕТАНИЕ' : '🕊️ ДОБРАЯ МУЗЫКА';
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
        </div>
        <div class="pr-inspector-actions">
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
          <button class="pr-btn pr-btn-warning" id="pr-copy-config-btn">📋 СКОПИРОВАТЬ КОНФИГ</button>
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
            <div style="display: flex; align-items: center; gap: 6px;">
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
            <div style="display: flex; align-items: center; gap: 6px;">
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
            <div style="display: flex; align-items: center; gap: 6px;">
              ${this._currentActIndex === 0
                ? `<button class="pr-mode-indicator ${AmbientManager.isIntroRandom() ? 'random' : 'fixed'}" id="pr-toggle-intro-random" style="cursor: pointer; border: 1px solid rgba(168,85,247,0.5);" title="Кликните для переключения: Рандом ↔ Фикс">${AmbientManager.isIntroRandom() ? '🎲 РАНДОМ' : '📌 ФИКС'}</button>`
                : `<span class="pr-mode-indicator fixed" style="font-size: 9px;" title="Конкретный фиксированный трек">📌 ФИКС</span>`
              }
              <button class="pr-track-btn-mute ${ambientMuted ? 'active' : ''}" data-mute-track="ambient" title="${ambientMuted ? 'Включить звук' : 'Замутить дорожку'}">M</button>
              <span style="font-size: 10px; color: #38bdf8; font-weight: bold;">Т3</span>
            </div>
          </div>

          <!-- T4: TRANSITION (STAR WARS WIPE SFX) -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-trans"></div>
              <span>⚡ Шторка Star Wars</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 10px; color: #f59e0b; font-weight: bold;">Т4</span>
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

          <!-- LANE 4: TRANSITION (STAR WARS WIPE) -->
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
    this._renderClips(videoCuts, dreadCues, peaceCues, ambientCue);
    this.updatePlayhead(this._currentTime);
  }

  // ==========================================================================
  // RENDER INTERACTIVE CLIPS
  // ==========================================================================
  private _renderClips(
    videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string | null }[],
    dreadCues: PremiereCue[],
    peaceCues: PremiereCue[],
    ambientCue: PremiereCue
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
    if (testTransSoundBtn) testTransSoundBtn.addEventListener('click', () => {
      const act = STORY_ACTS[this._currentActIndex];
      let soundKey = this.getTransitionSoundForAct(act.id);
      if (soundKey === 'random') {
        const finKeys = FIN_TRANSITION_KEYS;
        soundKey = finKeys[Math.floor(Math.random() * finKeys.length)];
      }
      this._playPreviewAudio(soundKey);
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

    // 4b. Track Mute Buttons
    this._container.querySelectorAll('[data-mute-track]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = (e.currentTarget as HTMLElement).getAttribute('data-mute-track') as 'dread' | 'peace' | 'ambient';
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
    if (!this._selectedCueId) return;
    const act = STORY_ACTS[this._currentActIndex];
    const isTransition = this._selectedCueId === 'transition_lane';
    const isAmbient = this._selectedCueId === 'ambient_base_lane';
    const cueList = this._cuesByAct[act.id] || [];
    const cue = (isAmbient || isTransition) ? null : cueList.find(c => c.id === this._selectedCueId);
    if (!isAmbient && !isTransition && !cue) return;

    let matchingTracks: TrackOption[] = [];
    let modalTitle = '';

    if (isTransition) {
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
        if (key) this._playPreviewAudio(key);
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

        const chosen = AVAILABLE_TRACK_OPTIONS.find(o => o.key === key);
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

  public openAddCueModal(): void {
    const act = STORY_ACTS[this._currentActIndex];
    const dreadOptions = AVAILABLE_TRACK_OPTIONS.filter(t => t.category === 'dread');
    const peaceOptions = AVAILABLE_TRACK_OPTIONS.filter(t => t.category === 'peace');

    let html = `
      <div class="pr-modal">
        <div class="pr-modal-header">
          <div class="pr-modal-title">➕ ДОБАВИТЬ МУЗЫКАЛЬНЫЙ ОТРЕЗОК В АКТ ${this._currentActIndex}</div>
          <button class="pr-btn pr-btn-close" id="pr-modal-close-btn">✖</button>
        </div>
        <div class="pr-modal-body">
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">Выберите категорию и трек для вставки в позицию <b>${this._currentTime.toFixed(1)}s</b>:</div>
          <b style="color: #f43f5e; font-size: 13px;">💀 НАГНЕТАНИЕ И ТРЕВОГА:</b>
    `;

    dreadOptions.forEach(tr => {
      html += `
        <div class="pr-track-card" data-insert-key="${tr.key}" data-insert-type="dread">
          <div>
            <div class="pr-track-title">${tr.name}</div>
            <div class="pr-track-desc">${tr.description} • [ ${tr.durationSec}s ]</div>
          </div>
          <button class="pr-btn pr-btn-primary" data-insert-key="${tr.key}" data-insert-type="dread">ВСТАВИТЬ</button>
        </div>
      `;
    });

    html += `<b style="color: #10b981; font-size: 13px; margin-top: 14px;">🕊️ ДОБРАЯ МУЗЫКА И ОБЛЕГЧЕНИЕ:</b>`;

    peaceOptions.forEach(tr => {
      html += `
        <div class="pr-track-card" data-insert-key="${tr.key}" data-insert-type="peace">
          <div>
            <div class="pr-track-title">${tr.name}</div>
            <div class="pr-track-desc">${tr.description} • [ ${tr.durationSec}s ]</div>
          </div>
          <button class="pr-btn pr-btn-primary" data-insert-key="${tr.key}" data-insert-type="peace">ВСТАВИТЬ</button>
        </div>
      `;
    });

    html += `</div></div>`;
    this._modalElement.innerHTML = html;
    this._modalElement.classList.add('open');

    const modalClose = this._modalElement.querySelector('#pr-modal-close-btn');
    if (modalClose) modalClose.addEventListener('click', () => this._closeModal());

    this._modalElement.querySelectorAll('[data-insert-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = (e.currentTarget as HTMLElement).getAttribute('data-insert-key');
        const type = (e.currentTarget as HTMLElement).getAttribute('data-insert-type') as 'dread' | 'peace';
        const tr = AVAILABLE_TRACK_OPTIONS.find(o => o.key === key);
        if (tr) {
          const newCue: PremiereCue = {
            id: `cue_${Date.now()}`,
            actId: act.id,
            type: type,
            cueKey: tr.key,
            title: tr.name,
            startTime: Math.round(this._currentTime * 10) / 10,
            duration: Math.min(25.0, tr.durationSec),
            duckAmbientTo: type === 'dread' ? 0.005 : 0.0
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
    if (this._audioPreviewElement) {
      this._audioPreviewElement.pause();
      this._audioPreviewElement = null;
    }
  }

  private _playPreviewAudio(cueKey: string): void {
    if (this._audioPreviewElement) {
      this._audioPreviewElement.pause();
    }
    let actualKey = cueKey;
    if (actualKey === 'random') {
      const keys = FIN_TRANSITION_KEYS;
      actualKey = keys[Math.floor(Math.random() * keys.length)];
    }
    const audio = AmbientManager.getAudioElementForCue(actualKey);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0.5;
      audio.play().catch(() => {});
      this._audioPreviewElement = audio;
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
    this._isOpen = true;
    this._container.classList.add('open');
    this._toggleButton.style.display = 'none';
    this.render();
  }

  public close(): void {
    this._isOpen = false;
    this._container.classList.remove('open');
    this._toggleButton.style.display = 'flex';
    this._closeModal();
  }

  public toggle(): void {
    if (this._isOpen) {
      this.close();
    } else {
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

  public getActiveCueAtTime(actId: string, time: number): {
    cue: PremiereCue;
    offset: number;
  } | null {
    const cues = this._cuesByAct[actId] || [];
    for (const cue of cues) {
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
