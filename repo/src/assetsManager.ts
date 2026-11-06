import { Assets, Texture } from 'pixi.js';

const imageModules = import.meta.glob([
  './assets/images/*.{png,jpg,webp}',
  './assets/images/gui/*.{png,jpg,webp}',
  './assets/slack/*.{png,jpg,webp}',
  './assets/avatars/*.{png,jpg,webp}',
  './assets/fin/**/*.{png,jpg,webp}',
  '!./assets/fin/Slack_Fin/**',
], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const audioModules = import.meta.glob([
  './assets/audio/*.mp3',
  '!./assets/audio/voices_of_production*.mp3',
  '!./assets/audio/*Полная_версия*.mp3',
], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// Backup / previous intro videos:
// import introVideoUrlBackup50f from './assets/video/gemini_generated_video_50f3f52f.mp4';
// import introVideoUrlBackupAaf from './assets/video/gemini_generated_video_aaf115f1.mp4';
import introVideoUrl from './assets/video/gemini_generated_video_42e28e3d.mp4';

const textures: Record<string, Texture> = {};
const audioUrls: Record<string, string> = {};

// Clean key mapping for easy lookup
export function initAssetMappings(): void {
  for (const [path, url] of Object.entries(imageModules)) {
    const filename = path.split('/').pop()!;
    const nameWithoutExt = filename.replace(/\.(png|jpg|webp)$/, '');
    textures[nameWithoutExt] = Texture.WHITE; // placeholder until Assets.load
  }

  for (const [path, url] of Object.entries(audioModules)) {
    const filename = decodeURIComponent(path.split('/').pop()!);
    const nameWithoutExt = filename.replace(/\.mp3$/i, '');
    audioUrls[filename] = url;
    audioUrls[nameWithoutExt] = url;
    
    // Friendly aliases
    if (filename.includes('01_Пролог') || filename === '00_prologue_space_expose.mp3') audioUrls['01_prologue'] = url;
    if (filename.includes('02_Акт_1') || filename === '01_act_1_intro.mp3') audioUrls['02_act1'] = url;
    if (filename === '02_act_2_dashboard_stasis.mp3' || filename.includes('03_Акт_2')) {
      audioUrls['03_act2'] = url;
      audioUrls['02_act_2_dashboard_stasis'] = url;
    }
    if (filename.includes('04_Акт_3') || filename === '03_act_3_management_timemachine.mp3') audioUrls['04_act3'] = url;
    if (filename.includes('05_Акт_4') || filename === '04_act_4_engine_mutation_art.mp3') audioUrls['05_act4'] = url;
    if (filename.includes('06_Акт_5') || filename === '05_act_5_clientarchs_invasion.mp3') audioUrls['06_act5'] = url;
    if (filename.includes('07_Акт_6') || filename === '06_act_6_tribunal_awards.mp3') audioUrls['07_act6'] = url;
    if (filename.includes('08_Акт_7') || filename === '07_act_7_outro.mp3') audioUrls['08_act7'] = url;
    if (filename === 'servotorization.mp3') {
      audioUrls['servotorization'] = url;
      audioUrls['song_servotorization'] = url;
    }
    if (filename.toLowerCase().includes('subharmonic')) {
      audioUrls['servotorization_hd_subharmonic'] = url;
    }
    if (filename.includes('clean_playrium')) audioUrls['song_playrium'] = url;
    if (filename.includes('chronicles_ambient')) {
      audioUrls['ambient_chronicles'] = url;
      audioUrls['chronicles_ambient'] = url;
    }
    if (filename.includes('desolate_cry') || filename.includes('Desolate Cry')) {
      audioUrls['ambient_desolate_cry'] = url;
      audioUrls['desolate_cry'] = url;
      audioUrls['desolate_cry_ambient'] = url;
    }
    if ((filename.startsWith('rust_and_bone') || filename.includes('Rust and Bone') || filename === 'rust_and_bone_1.mp3') && !filename.startsWith('dread_')) {
      audioUrls['ambient_rust_and_bone'] = url;
      audioUrls['rust_and_bone'] = url;
      audioUrls['rust_and_bone_1'] = url;
    }
    if (filename.includes('absolute_blackout') || filename.includes('Absolute Blackout')) {
      audioUrls['ambient_absolute_blackout'] = url;
      audioUrls['absolute_blackout'] = url;
      audioUrls['absolute_blackout_fx'] = url;
    }
    if (filename.includes('titan_forge') || filename.includes('Titan Forge')) {
      audioUrls['ambient_titan_forge'] = url;
      audioUrls['titan_forge'] = url;
    }
  }
}

// Call immediately on module import so audioUrls is guaranteed populated
initAssetMappings();

export function getIntroVideoUrl(): string {
  return introVideoUrl;
}

export async function loadAllAssets(onProgress?: (ratio: number) => void): Promise<void> {
  initAssetMappings();

  // Deduplicate entries by texture key to eliminate ~100 redundant HTTP downloads (~77 MB saved!)
  const uniqueMap = new Map<string, { path: string; url: string; key: string }>();
  for (const [path, url] of Object.entries(imageModules)) {
    if (path.toLowerCase().includes("slack_fin")) continue;
    const filename = path.split('/').pop()!;
    const key = filename.replace(/\.(png|jpg|webp)$/, '');
    const lowerKey = key.toLowerCase();

    // Priority: ./assets/slack/ > ./assets/images/gui/ > ./assets/images/ > ./assets/avatars/ > ./assets/fin/
    const isSlack = path.includes('/assets/slack/');
    const isGui = path.includes('/assets/images/gui/');
    const isImages = path.includes('/assets/images/');
    const isAvatars = path.includes('/assets/avatars/');

    if (!uniqueMap.has(lowerKey)) {
      uniqueMap.set(lowerKey, { path, url, key });
    } else {
      const existing = uniqueMap.get(lowerKey)!;
      const existingIsSlack = existing.path.includes('/assets/slack/');
      const existingIsFin = existing.path.includes('/assets/fin/');
      if (isSlack || (!existingIsSlack && (isGui || isImages || isAvatars) && existingIsFin)) {
        uniqueMap.set(lowerKey, { path, url, key });
      }
    }
  }

  const entries = Array.from(uniqueMap.values());
  let loaded = 0;
  const total = Math.max(1, entries.length);

  // Load with concurrency limit (12 parallel downloads) to prevent browser socket choking
  const CONCURRENCY = 12;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < entries.length) {
      const item = entries[index++];
      try {
        const tex = await Assets.load<Texture>({ alias: item.key, src: item.url, parser: 'texture' } as any);
        textures[item.key] = tex;
        textures[item.key.toLowerCase()] = tex;
      } catch (err) {
        console.warn(`[Assets] Failed to load texture: ${item.key}`, err);
        textures[item.key] = Texture.WHITE;
      }
      loaded++;
      onProgress?.(loaded / total);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, entries.length) }, () => worker());
  await Promise.all(workers);
}

const textureAliases: Record<string, string> = {
  // Scoreboard 37 aliases
  retro_film_manufactorum_scoreboard_37_v1: 'manufactorum_scoreboard_37_v1',
  manufactorum_scoreboard_37_v1: 'manufactorum_scoreboard_37_v1',

  // Act 2: Stasis capsule & Altar crypt
  retro_film_act2_dashboard_altar_crypt_gemini_v1: 'retro_film_act2_dashboard_altar_crypt_gemini_v1',
  retro_horror_film_mickey_catacomb_stasis_wide_gemini_v1: 'retro_horror_film_mickey_catacomb_stasis_wide_gemini_v1',
  '09_voron_minnoe_pole': '09_voron_minnoe_pole',
  voron_minnoe_pole: '09_voron_minnoe_pole',
  // Canonical AI-Lord Narrator (Reading Chronicles from Tome on GPU Throne)
  ai_lord_throne_book_reading_narrator: 'ai_lord_throne_book_reading_narrator',
  ai_lord_reading_book: 'ai_lord_throne_book_reading_narrator',
  ai_lord_narrator: 'ai_lord_throne_book_reading_narrator',
  ai_lord: 'ai_lord_throne_book_reading_narrator',
  ai_lord_mcu: 'ai_lord_throne_book_reading_narrator',
  ai_lord_face_closeup: 'ai_lord_face_closeup_gemini_1080p',
  ai_lord_face: 'ai_lord_face_closeup_gemini_1080p',
  ai_lord_face_cu: 'ai_lord_face_closeup_gemini_1080p',
  ai_lord_face_extreme: 'ai_lord_face_eyes_macro_gemini_1080p',
  ai_lord_face_ecu: 'ai_lord_face_eyes_macro_gemini_1080p',
  ai_lord_face_closeup_gemini_1080p: 'ai_lord_face_closeup_gemini_1080p',
  ai_lord_face_eyes_macro_gemini_1080p: 'ai_lord_face_eyes_macro_gemini_1080p',

  // Fin Team Characters & Aliases
  retro_film_tribunal_scaffold_kirill_kristian_v1: 'retro_film_tribunal_scaffold_kirill_kristian_v1',
  retro_film_scaffold_kirill_kristian: 'retro_film_tribunal_scaffold_kirill_kristian_v1',
  retro_film_eduard_danial_playable_autopsy_green_v6: 'retro_film_eduard_danial_playable_autopsy_green_v6',
  retro_film_amputated_playable_autopsy: 'retro_film_eduard_danial_playable_autopsy_green_v6',
  retro_film_coders_openspace_desiccated_corpse_v13: 'retro_film_coders_openspace_desiccated_corpse_v13',
  retro_film_coders_openspace_desiccated_corpse: 'retro_film_coders_openspace_desiccated_corpse_v13',
  retro_film_desiccated_corpse: 'retro_film_coders_openspace_desiccated_corpse_v13',
  retro_film_gorin: 'retro_film_gorin_batman_cowl_gemini_v20',
  retro_film_danial: 'retro_film_danial_iskakov_sapper_v1',
  retro_film_voron: 'retro_film_voron_arch_abbot_v7',
  retro_film_voron_arch_abbot_gemini_pro_v12: 'retro_film_voron_arch_abbot_v7',
  avatar_voron: 'retro_film_voron_arch_abbot_v7',
  retro_film_eduard: 'retro_warhammer_eduard_levin_gpt_v3',
  retro_film_alexey_novice: 'retro_film_alexey_novice_v4',
  retro_film_davit: 'retro_film_davit_gazaryan_old_engine_v6',
  retro_film_pavel: 'retro_soviet_film_pavel_playbox_logo_gpt_v4',
  retro_film_artem: 'retro_film_artem_khukhro_guyver_gemini_v19',
  retro_film_artem_khukhro_guyver_gemini_v13: 'retro_film_artem_khukhro_guyver_gemini_v19',
  retro_film_artem_khukhro_guyver_gemini_v19: 'retro_film_artem_khukhro_guyver_gemini_v19',
  retro_film_eva: 'retro_film_eva_theatrical_prop_helmet_v7',
  retro_film_egor: 'retro_film_egor_reverend_interpreter_v4',
  retro_film_egor_reverend_interpreter: 'retro_film_egor_reverend_interpreter_v4',
  retro_film_egor_reverend_interpreter_v4: 'retro_film_egor_reverend_interpreter_v4',
  retro_film_tkachev: 'retro_film_egor_reverend_interpreter_v4',
  retro_film_nick: 'retro_film_nick_egorov_speedrun_v3',
  retro_film_nick_egorov_speedrun_v3: 'retro_film_nick_egorov_speedrun_v3',
  retro_film_tolya: 'retro_film_tolya_gpt_v2',
  retro_film_vika: 'retro_film_vika_neural_corruption_v3',
  retro_film_zhenya: 'retro_film_zhenya_artist_real_v11',
  retro_film_vova: 'retro_film_vova_khaetsky_v11',
  retro_film_kristian: 'retro_film_kristian_repository_guardian_v2',
  retro_film_kirill: 'retro_film_kirill_beryozkin_v2',
  humanoid_zombie_smartphone_v1: 'humanoid_zombie_smartphone_v1',
  retro_horror_film_mickey_biovat_slime_gemini_v6: 'retro_horror_film_mickey_biovat_slime_gemini_v6',
  retro_horror_film_mickey_biovat_slime_gpt_v8: 'retro_horror_film_mickey_biovat_slime_gpt_v8',
  mickey_biovat_slime_gemini_v6: 'retro_horror_film_mickey_biovat_slime_gemini_v6',
  mickey_biovat_slime_gpt_v8: 'retro_horror_film_mickey_biovat_slime_gpt_v8',

  // Tribunal & Awards (AI-Lord on GPU Throne with Baton & Cookie Servitors)
  ai_lord_throne_tribunal_awards: 'ai_lord_throne_tribunal_awards',
  tribunal_awards: 'ai_lord_throne_tribunal_awards',
  ai_lord_tribunal: 'ai_lord_throne_tribunal_awards',
  ai_lord_baton: 'ai_lord_throne_tribunal_awards',
  ai_lord_cookie: 'retro_film_ship_storage_coffee_cup_v2',
  coffee_cup: 'retro_film_ship_storage_coffee_cup_v2',
  coffee_cup_v1: 'retro_film_ship_storage_coffee_cup_v1',
  coffee_cup_v2: 'retro_film_ship_storage_coffee_cup_v2',
  coffee_vault: 'retro_film_ship_storage_coffee_vault_v2',
  cyber_lord_throne: 'ai_lord_throne_tribunal_awards',

  stasis_coffin: 'retro_film_clientarch_billionaires_space_freeze_gemini_v10',
  gorin_throne: 'hero_gorin',

  // AI-Lord Concert Sequence
  ai_lord_singing: 'ai_lord_calm_singing',
  concert_base: 'ai_lord_calm_singing',
  concert_calm_base: 'ai_lord_calm_singing',
  concert_drive_default: 'ai_lord_drive_default',
  concert_peak: 'ai_lord_drive_default',
  concert_peak_soft: 'ai_lord_drive_default',
  concert_crowd_back: 'ai_lord_drive_back',
  concert_crowd_wide: 'ai_lord_concert_arena_wide',
  concert_bass_hands: 'ai_lord_concert_extreme_low_angle',
  // 1970s Retro Sci-Fi Concert Extension
  concert_calm_wing: '01_calm_wing_profile',
  concert_calm_audience: '02_calm_audience_pov',
  concert_calm_shoulder: '03_calm_over_shoulder',
  concert_arena_wide: 'ai_lord_concert_arena_wide',
  concert_extreme_low: 'ai_lord_concert_extreme_low_angle',
  concert_practical_base: 'ai_lord_calm_singing',
  concert_drive_solo: 'ai_lord_drive_default',
  concert_drive_back: 'ai_lord_drive_back',

  // Character avatar aliases
  avatar_gorin: 'avatar_gorin',
  avatar_eduard: 'avatar_eduard',
  avatar_egor: 'avatar_egor',
  avatar_nick: 'avatar_nick_egorov',
  avatar_nick_egorov: 'avatar_nick_egorov',
  avatar_egorov: 'avatar_nick_egorov',
  avatar_eva: 'avatar_eva',
  avatar_pavel: 'avatar_pavel',
  avatar_toly: 'avatar_toly',
  avatar_huhro: 'avatar_huhro',
  avatar_vika: 'avatar_vika',
  avatar_zhenya: 'avatar_zhenya',
  avatar_mamusin: 'avatar_mamusin',
  avatar_davit: 'avatar_davit',
  avatar_pankov: 'avatar_pankov',
  avatar_khaetsky: 'avatar_khaetsky',
  avatar_hoodie: 'hero_hoodie',
  avatar_christian: 'retro_film_kristian_repository_guardian_v2',
  avatar_kirill: 'retro_film_kirill_beryozkin_v2',
  warhammer_gorin: 'warhammer_gorin',
  warhammer_eduard: 'warhammer_eduard',
  warhammer_egor: 'warhammer_egor',

  // Slack screenshot aliases
  '01_jnghfdbk': '01_jnghfdbk',
  '01_gorin_jnghfdbk': '01_jnghfdbk',
  '01c_korchoe': '01c_korchoe',
  '01d_prishlizhat': '01d_prishlizhat',
  '02_demoblil': '02_demoblil',
  '03_disney_long_box': '03_disney_long_box',
  '03b_gorin_disney_status': '03b_gorin_disney_status',
  '04_claude_banned': '04_claude_banned',
  '05_edik_11_points': '05_edik_11_points',
  '06_tent_brother': '06_tent_brother',
  '07_cow_laser': 'cow_laser_tkachev_thread',
  'cow_laser_tkachev_thread': 'cow_laser_tkachev_thread',
  '08_mavis_legs': '08_mavis_legs',
  '09_danial_3a_project': '09_danial_3a_project',
  '10_pyramids_museum': '10_pyramids_museum',
  '11_eva_kickoff': '11_eva_kickoff',
  '12_nick_time_machine': '12_nick_time_machine',
  '13_chest_egg_sound': '13_chest_egg_sound',
  '14_feeling_zero': '14_feeling_zero',
  '14a_feeling_zero': '14a_feeling_zero',
  '14b_all_good': '14b_all_good',
  '12a_gorin_time_machine': '12a_gorin_time_machine',
  '12b_edik_time_machine': '12b_edik_time_machine',
  '07a_cow_khukhro': '07a_cow_khukhro',
  '07b_cow_tkachev': '07b_cow_tkachev',
  '07c_cow_edik': '07c_cow_edik',
};

export function getTexture(key: string): Texture {
  const normKey = key.toLowerCase();
  const resolved = (textureAliases[key] ?? textureAliases[normKey] ?? key).toLowerCase();
  if (textures[resolved] && textures[resolved] !== Texture.WHITE && textures[resolved].width > 1) {
    return textures[resolved];
  }
  if (textures[key] && textures[key] !== Texture.WHITE && textures[key].width > 1) {
    return textures[key];
  }
  if (textures[normKey] && textures[normKey] !== Texture.WHITE && textures[normKey].width > 1) {
    return textures[normKey];
  }
  // Fallback between avatar_ and hero_ prefixes
  const heroKey = normKey.replace('avatar_', 'hero_');
  if (textures[heroKey] && textures[heroKey] !== Texture.WHITE && textures[heroKey].width > 1) {
    return textures[heroKey];
  }
  const avKey = normKey.replace('hero_', 'avatar_');
  if (textures[avKey] && textures[avKey] !== Texture.WHITE && textures[avKey].width > 1) {
    return textures[avKey];
  }
  return textures[resolved] ?? textures[normKey] ?? textures[key] ?? Texture.WHITE;
}

export function hasTexture(key: string): boolean {
  const tex = getTexture(key);
  return Boolean(tex && tex !== Texture.WHITE && tex.width > 1);
}

export function getAudioUrl(key: string): string | undefined {
  if (!key) return undefined;
  const k = key.trim();
  const lower = k.toLowerCase();
  if (audioUrls[k]) return audioUrls[k];
  if (audioUrls[lower]) return audioUrls[lower];
  if (audioUrls[k + '.mp3']) return audioUrls[k + '.mp3'];
  if (audioUrls[lower + '.mp3']) return audioUrls[lower + '.mp3'];
  // Fallback check against all keys
  for (const [existingKey, url] of Object.entries(audioUrls)) {
    if (existingKey.toLowerCase() === lower || existingKey.toLowerCase() === lower + '.mp3') {
      return url;
    }
  }
  return undefined;
}
