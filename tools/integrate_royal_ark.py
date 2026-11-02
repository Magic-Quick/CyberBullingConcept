import re

def update_story_data():
    with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
        text = f.read()

    id_pos = text.find('"id": "act_5_clientarchs"')
    if id_pos == -1:
        raise ValueError("Could not find act_5_clientarchs in storyData.ts")

    next_act_pos = text.find('"id": "act_6_punishment"', id_pos)
    if next_act_pos == -1:
        raise ValueError("Could not find act_6_punishment in storyData.ts")

    act5_block = text[id_pos:next_act_pos]

    # Find "cues": [
    cues_marker = '"cues": ['
    cues_idx = act5_block.find(cues_marker)
    if cues_idx == -1:
        raise ValueError("Could not find cues in act_5_clientarchs")

    before_cues = act5_block[:cues_idx + len(cues_marker)]
    after_cues = act5_block[cues_idx + len(cues_marker):]

    # Shift all "start": X and "end": Y in after_cues by +74.06
    SHIFT = 74.06

    def shift_start(m):
        prefix = m.group(1)
        val = float(m.group(2))
        suffix = m.group(3)
        new_val = round(val + SHIFT, 2)
        return f"{prefix}{new_val}{suffix}"

    shifted_after = re.sub(r'("start":\s*)([0-9.]+)([\s,]*)', shift_start, after_cues)

    def shift_end(m):
        prefix = m.group(1)
        val = float(m.group(2))
        suffix = m.group(3)
        new_val = round(val + SHIFT, 2)
        return f"{prefix}{new_val}{suffix}"

    shifted_after = re.sub(r'("end":\s*)([0-9.]+)([\s,]*)', shift_end, shifted_after)

    new_royal_ark_cues_ts = """
      {
        "start": 4.5,
        "end": 7.64,
        "text": "Ауспексы дальнего сканирования воют на пределе:"
      },
      {
        "start": 7.98,
        "end": 12.88,
        "text": "на внешних рубежах показались боевые флотилии клиентархов-правконосцев."
      },
      {
        "start": 13.9,
        "end": 19.02,
        "text": "Первыми по титановой обшивке ковчега в ярости ударили клиентархи из Royal Ark —"
      },
      {
        "start": 19.38,
        "end": 22.46,
        "text": "грозный и опасный Клан «Королевский Ковчег»,"
      },
      {
        "start": 22.46,
        "end": 27.42,
        "text": "владыки выжженных пустошей, которых на нашем корабле смертельно боятся злить."
      },
      {
        "start": 27.84,
        "end": 32.12,
        "text": "Они обрушили на стальные переборки шквал тяжелых торпед правок."
      },
      {
        "start": 32.12,
        "end": 39.5,
        "text": "Палач Старого Стека Максим Мамусин смотрел на трещащие переборки в этом отсеке и передавал в рубку:",
        "speaker": "Максим Мамусин",
        "speakerRole": "Tech Lead • Палач Старого Стека",
        "avatarKey": "avatar_mamusin"
      },
      {
        "start": 39.94,
        "end": 42.8,
        "text": "«Бля, там какое-то мясо сейчас происходит».",
        "speaker": "Максим Мамусин",
        "speakerRole": "Tech Lead • Палач Старого Стека",
        "avatarKey": "avatar_mamusin"
      },
      {
        "start": 43.56,
        "end": 46.52,
        "text": "Владыка Ковчега вдохнул тестовую дозу плейриума,"
      },
      {
        "start": 46.52,
        "end": 54.62,
        "text": "обнаружил, что подопытные игроки внутри тап-капкана слишком легко выживают без единого черепка смерти,"
      },
      {
        "start": 55.16,
        "end": 56.46,
        "text": "и вынес приговор: «филлинга 0».",
        "slackScreenshotKey": "14_feeling_zero"
      },
      {
        "start": 57.04,
        "end": 62.0,
        "text": "Кузнецы плейблов вскрыли обшивку, выкрутили генератор страданий на максимум,",
        "slackScreenshotKey": "14_feeling_zero"
      },
      {
        "start": 62.2,
        "end": 63.92,
        "text": "и вернули черепок в цикл."
      },
      {
        "start": 64.34,
        "end": 70.64,
        "text": "И в тот же самый день тот же самый клиентарх посмотрел на гибель игроков и удовлетворённо отписал:"
      },
      {
        "start": 71.06,
        "end": 73.5,
        "text": "«Мне всё нравится».",
        "slackScreenshotKey": "14_feeling_zero"
      },
      {
        "start": 73.5,
        "end": 76.08,
        "text": "Садистский катарсис достигнут."
      },
      {
        "start": 76.46,
        "end": 78.56,
        "text": "Дофамин потёк по магистралям."
      },
"""

    new_act5_block = before_cues + new_royal_ark_cues_ts + shifted_after.lstrip('\r\n ')

    # Update duration and subtitle in before_cues / new_act5_block
    new_act5_block = re.sub(r'("duration":\s*)[0-9.]+', r'\g<1>305.07', new_act5_block, count=1)
    new_act5_block = re.sub(r'("subtitle":\s*")[^"]+(")', r'\g<1>Роял Арк • Зинга • Ноги Мэвис • Робо-корова с лазерным выменем\g<2>', new_act5_block, count=1)

    new_text = text[:id_pos] + new_act5_block + text[next_act_pos:]
    with open('repo/src/storyData.ts', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Updated repo/src/storyData.ts successfully!")

def update_narrator_cuts():
    with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
        text = f.read()

    start_match = re.search(r'act_5_clientarchs:\s*\[', text)
    if not start_match:
        raise ValueError("Could not find act_5_clientarchs in narratorShotSequence.ts")

    start_pos = start_match.end()
    bracket_count = 0
    end_pos = -1
    for i in range(start_pos, len(text)):
        if text[i] == '[':
            bracket_count += 1
        elif text[i] == ']':
            if bracket_count == 0:
                end_pos = i
                break
            bracket_count -= 1

    act5_block = text[start_pos:end_pos]

    # Shift all `{ time: X.XX` by +74.06 EXCEPT time: 0.00
    SHIFT = 74.06

    def shift_time(m):
        prefix = m.group(1)
        val = float(m.group(2))
        suffix = m.group(3)
        if val <= 0.01:
            return f"{prefix}0.00{suffix}"
        new_val = round(val + SHIFT, 2)
        return f"{prefix}{new_val:.2f}{suffix}"

    shifted_block = re.sub(r'(\btime:\s*)([0-9.]+)(\s*,)', shift_time, act5_block)

    royal_ark_cuts = """
    { time: 0.00, texKey: 'retro_film_act5_outer_perimeter_clientarch_siege_gemini_v1', type: 'event_illustration', label: 'Заявочный план: Внешний периметр — Осада Ковчега флотилиями клиентархов' },
    { time: 4.50, texKey: 'ai_lord_throne_book_reading_narrator', type: 'ai_lord', label: 'MCU: Лорд — Ауспексы дальнего сканирования воют на пределе' },
    { time: 13.90, texKey: 'retro_film_act5_outer_perimeter_clientarch_siege_gemini_v1', type: 'event_illustration', label: 'Royal Ark: Клан Королевский Ковчег обрушил шквал торпед' },
    {
      time: 32.12,
      texKey: 'retro_film_maksim_mamusin_android_coding_gemini_pro_v8',
      type: 'character_quote',
      characterName: 'МАКСИМ МАМУСИН',
      characterRole: 'Tech Lead • Палач Старого Стека',
      characterThemeColor: 0x48cae4,
      label: 'Мамусин: Палач Старого Стека смотрит на трещащие переборки'
    },
    {
      time: 39.94,
      texKey: 'retro_film_maksim_mamusin_android_coding_gemini_pro_v8',
      type: 'character_quote',
      characterName: 'МАКСИМ МАМУСИН',
      characterRole: 'Tech Lead • Палач Старого Стека',
      characterThemeColor: 0x48cae4,
      label: 'Мамусин: «Бля, там какое-то мясо сейчас происходит»'
    },
    { time: 43.56, texKey: 'retro_film_act5_outer_perimeter_clientarch_siege_gemini_v1', type: 'event_illustration', label: 'Владыка Ковчега вдохнул тестовую дозу Плейриума' },
    {
      time: 55.16,
      texKey: 'retro_film_act5_outer_perimeter_clientarch_siege_gemini_v1',
      type: 'character_quote',
      slackKey: '14_feeling_zero',
      label: 'Slack: Клиентарх Royal Ark — филлинга 0'
    },
    {
      time: 64.34,
      texKey: 'retro_film_act5_outer_perimeter_clientarch_siege_gemini_v1',
      type: 'character_quote',
      slackKey: '14_feeling_zero',
      label: 'Slack: Клиентарх Royal Ark — Мне всё нравится'
    },
    { time: 73.50, texKey: 'ai_lord_face_closeup_gemini_1080p', type: 'ai_lord', label: 'CU: Лик ИИ-Лорда — Садистский катарсис достигнут, дофамин потёк по магистралям' },
"""

    # In shifted_block, strip the duplicate time 0.00 cut from previous version
    shifted_block_clean = re.sub(r'^\s*\{\s*time:\s*0\.00[^\}]+\},?', '', shifted_block.lstrip(), flags=re.MULTILINE)

    new_act5_cuts = royal_ark_cuts + shifted_block_clean.lstrip()

    new_text = text[:start_pos] + new_act5_cuts + text[end_pos:]
    with open('repo/src/narratorShotSequence.ts', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Updated repo/src/narratorShotSequence.ts successfully!")

if __name__ == '__main__':
    update_story_data()
    update_narrator_cuts()
