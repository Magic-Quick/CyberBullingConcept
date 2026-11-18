import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add DREAD_OPTIONS and PEACE_OPTIONS after AMBIENT_OPTIONS
options_to_add = '''  public static readonly DREAD_OPTIONS = [
    { key: 'dread_11_morlock_war_march_climax_50s', name: 'Марш Морлоков (50с • Климакс)', dur: 50 },
    { key: 'dread_12_predator_digital_drug_28s', name: 'Цифровой наркотик (28с • Дроп)', dur: 28 },
    { key: 'dread_03_predator_instant_terror_drop_25s', name: 'Мгновенный ужас / Инвалид (25с)', dur: 25 },
    { key: 'dread_05_rust_and_bone_maximum_grimdark_25s', name: 'Эшафот / Макс. гримдарк (25с)', dur: 25 },
    { key: 'dread_10_predator_nightmare_drop_52s', name: 'Мэвис на карачках (52с)', dur: 52 },
    { key: 'dread_04_predator_chittering_nightmare_25s', name: 'Кошмар Хищника (25с)', dur: 25 },
  ];

  public static readonly PEACE_OPTIONS = [
    { key: 'peace_08_pin_drop_silence_reward_grace_60s', name: 'Печенька Благодати (60с • Свет)', dur: 60 },
    { key: 'peace_01_pin_drop_silence_pure_calm_25s', name: 'Чистый покой (25с • Pin Drop)', dur: 25 },
    { key: 'peace_02_pin_drop_silence_warm_melody_30s', name: 'Тёплая мелодия (30с • Пады)', dur: 30 },
    { key: 'peace_03_pin_drop_silence_gentle_resolution_25s', name: 'Мягкое разрешение (25с)', dur: 25 },
    { key: 'peace_04_chronicles_playbox_heavenly_vocalise_30s', name: 'Небесный вокализ (30с)', dur: 30 },
    { key: 'peace_05_chronicles_playbox_uplifting_pads_30s', name: 'Возвышенные пэды (30с)', dur: 30 },
    { key: 'peace_06_chronicles_playbox_warm_culmination_25s', name: 'Тёплая кульминация (25с)', dur: 25 },
  ];
'''

if 'public static readonly DREAD_OPTIONS' not in content:
    target = 'public static readonly AMBIENT_OPTIONS = ['
    idx = content.find(target)
    if idx != -1:
        # Find closing bracket
        end_idx = content.find('];', idx)
        if end_idx != -1:
            content = content[:end_idx+2] + '\n\n' + options_to_add + content[end_idx+2:]
            print('Added DREAD_OPTIONS and PEACE_OPTIONS')

# Write back
with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Phase 1 complete')
