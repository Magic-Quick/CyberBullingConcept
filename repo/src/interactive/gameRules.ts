import rules from '../../../media/interactive/scenes/shared_game_rules.json';
import exhaustedVoiceUrl from '../../../media/interactive/scenes/shared_voice/attempts_exhausted.mp3?url';

/** All story games share the failure limit and the same spoken handoff. */
export const COMMON_GAME_RULES = { ...rules, exhaustedVoiceUrl };
