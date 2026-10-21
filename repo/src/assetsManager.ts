import { Assets, Texture } from 'pixi.js';

const imageModules = import.meta.glob([
  './assets/images/*.{png,jpg,webp}',
  './assets/slack/*.{png,jpg,webp}',
  './assets/avatars/*.{png,jpg,webp}',
], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const audioModules = import.meta.glob('./assets/audio/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

import introVideoUrl from './assets/video/gemini_generated_video_50f3f52f.mp4';

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
    if (filename.includes('03_Акт_2') || filename === '02_act_2_dashboard_stasis.mp3') audioUrls['03_act2'] = url;
    if (filename.includes('04_Акт_3') || filename === '03_act_3_management_timemachine.mp3') audioUrls['04_act3'] = url;
    if (filename.includes('05_Акт_4') || filename === '04_act_4_engine_mutation_art.mp3') audioUrls['05_act4'] = url;
    if (filename.includes('06_Акт_5') || filename === '05_act_5_clientarchs_invasion.mp3') audioUrls['06_act5'] = url;
    if (filename.includes('07_Акт_6') || filename === '06_act_6_tribunal_awards.mp3') audioUrls['07_act6'] = url;
    if (filename.includes('08_Акт_7') || filename === '07_act_7_outro.mp3') audioUrls['08_act7'] = url;
    if (filename.includes('servotorization') || filename.includes('Сервоторизация') || filename.includes('SubHarmonic')) {
      audioUrls['servotorization'] = url;
      audioUrls['song_servotorization'] = url;
      audioUrls['servotorization_hd_subharmonic'] = url;
    }
    if (filename.includes('clean_playrium')) audioUrls['song_playrium'] = url;
    if (filename.includes('chronicles_ambient')) audioUrls['ambient_chronicles'] = url;
    if (filename.includes('desolate_cry') || filename.includes('Desolate Cry')) {
      audioUrls['ambient_desolate_cry'] = url;
      audioUrls['desolate_cry'] = url;
      audioUrls['desolate_cry_ambient'] = url;
    }
    if (filename.includes('rust_and_bone') || filename.includes('Rust and Bone')) {
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

export function getIntroVideoUrl(): string {
  return introVideoUrl;
}

export async function loadAllAssets(onProgress?: (ratio: number) => void): Promise<void> {
  initAssetMappings();
  const imageEntries = Object.entries(imageModules);
  let loaded = 0;
  const total = Math.max(1, imageEntries.length);

  await Promise.all(
    imageEntries.map(async ([path, url]) => {
      const filename = path.split('/').pop()!;
      const key = filename.replace(/\.(png|jpg|webp)$/, '');
      try {
        const tex = await Assets.load<Texture>({ alias: key, src: url, parser: 'texture' } as any);
        textures[key] = tex;
        textures[key.toLowerCase()] = tex;
      } catch (err) {
        console.warn(`[Assets] Failed to load texture: ${key}`, err);
        textures[key] = Texture.WHITE;
      }
      loaded++;
      onProgress?.(loaded / total);
    })
  );
}

const textureAliases: Record<string, string> = {
  stasis_coffin: 'sarcophagus',
  gorin_throne: 'hero_gorin',
  factory_conveyor: 'castle_handcar',
  hall_judges: 'castle_computers',
  cyber_lord_throne: 'ai_lord_baton',

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
  warhammer_gorin: 'warhammer_gorin',
  warhammer_eduard: 'warhammer_eduard',
  warhammer_egor: 'warhammer_egor',

  // Slack screenshot aliases
  '01_jnghfdbk': '01_jnghfdbk',
  '01_gorin_jnghfdbk': '01_jnghfdbk',
  '02_demoblil': '02_demoblil',
  '03_disney_long_box': '03_disney_long_box',
  '04_claude_banned': '04_claude_banned',
  '05_edik_11_points': '05_edik_11_points',
  '06_tent_brother': '06_tent_brother',
  '07_cow_laser': '07_cow_laser',
  '08_mavis_legs': '08_mavis_legs',
  '09_danial_3a_project': '09_danial_3a_project',
  '10_pyramids_museum': '10_pyramids_museum',
  '11_eva_kickoff': '11_eva_kickoff',
  '12_nick_time_machine': '12_nick_time_machine',
  '13_chest_egg_sound': '13_chest_egg_sound',
  '14_feeling_zero': '14_feeling_zero',
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
  return audioUrls[key];
}
