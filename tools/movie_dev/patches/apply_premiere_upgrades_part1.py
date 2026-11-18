import re

with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Imports
target_imports = """import { AmbientManager } from './AmbientManager';
import { STORY_ACTS } from './storyData';"""

replace_imports = """import { AmbientManager } from './AmbientManager';
import { STORY_ACTS } from './storyData';
import { NARRATOR_CUTS, NarratorShotCut } from './narratorShotSequence';
import { CONCERT_SEQUENCE_CUTS } from './concertSequence';

const INTRO_SHOTS: { time: number; label: string; type?: string }[] = [
  { time: 0.0, label: '📄 Дисклеймер ИИ', type: 'event_illustration' },
  { time: 8.0, label: '💀 Playbox Studios (Череп)', type: 'event_illustration' },
  { time: 13.0, label: '📜 Представляет', type: 'event_illustration' },
  { time: 24.0, label: '🌌 Дроп логотипа / Звёзды', type: 'event_illustration' },
];"""

if target_imports in text:
    text = text.replace(target_imports, replace_imports, 1)
    print("SUCCESS: Updated imports")
else:
    print("WARNING: target_imports not found")

with open('repo/src/PremiereAudioDirector.ts', 'w', encoding='utf-8') as f:
    f.write(text)
