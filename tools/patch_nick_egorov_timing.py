import re

# 1. Update narratorShotSequence.ts: Nick Egorov timing
with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    seq_code = f.read()

old_nick = """    // 75.49s: "...когда Нику Егорову не хватало пары часов..."
    {
      time: 79.99,
      texKey: 'retro_film_nick_egorov_speedrun_v3',
      type: 'character_quote',
      characterName: 'Ник Егоров',
      characterRole: 'Tech Lead / Сингулярность Кода',
      characterThemeColor: 0x00f5d4,
      label: 'Ник Егоров: ачивка за скорость',
    },

    {
      time: 83.07,
      texKey: 'retro_film_maksim_mamusin_android_coding_gemini_pro_v8',"""

new_nick = """    // 73.77s: "...когда Нику Егорову не хватало пары часов до ачивки за скорость..."
    {
      time: 73.77,
      texKey: 'retro_film_nick_egorov_speedrun_v3',
      type: 'character_quote',
      characterName: 'Ник Егоров',
      characterRole: 'Tech Lead / Сингулярность Кода',
      characterThemeColor: 0x00f5d4,
      label: 'Ник Егоров: ачивка за скорость',
    },

    // 84.78s: "Палач Старого Стека Максим Мамусин спросил..."
    {
      time: 84.78,
      texKey: 'retro_film_maksim_mamusin_android_coding_gemini_pro_v8',"""

if old_nick in seq_code:
    seq_code = seq_code.replace(old_nick, new_nick)
    with open('repo/src/narratorShotSequence.ts', 'w', encoding='utf-8') as f:
        f.write(seq_code)
    print("SUCCESS: narratorShotSequence.ts updated with Nick Egorov at 73.77s")
else:
    print("WARNING: old_nick not found directly, checking regex")
    # try regex replacement
    pattern = r"// 75\.49s:[^\n]*\n\s*\{\s*time:\s*79\.99,\s*texKey:\s*'retro_film_nick_egorov_speedrun_v3'[\s\S]*?time:\s*83\.07,\s*texKey:\s*'retro_film_maksim_mamusin_android_coding_gemini_pro_v8'"
    replacement = """// 73.77s: "...когда Нику Егорову не хватало пары часов до ачивки за скорость..."
    {
      time: 73.77,
      texKey: 'retro_film_nick_egorov_speedrun_v3',
      type: 'character_quote',
      characterName: 'Ник Егоров',
      characterRole: 'Tech Lead / Сингулярность Кода',
      characterThemeColor: 0x00f5d4,
      label: 'Ник Егоров: ачивка за скорость',
    },

    // 84.78s: "Палач Старого Стека Максим Мамусин спросил..."
    {
      time: 84.78,
      texKey: 'retro_film_maksim_mamusin_android_coding_gemini_pro_v8'"""
    if re.search(pattern, seq_code):
        seq_code = re.sub(pattern, replacement, seq_code)
        with open('repo/src/narratorShotSequence.ts', 'w', encoding='utf-8') as f:
            f.write(seq_code)
        print("SUCCESS (regex): narratorShotSequence.ts updated")
    else:
        print("FAILED to replace Nick Egorov timing")

