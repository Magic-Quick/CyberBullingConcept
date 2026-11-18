with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    { time: 4.50, texKey: 'retro_film_act4_motor_deck_render_factorum_gemini_v1', type: 'event_illustration', label: 'Заявочный план: Моторный цех и рендер-факторум платформы' },"""
replacement = """    { time: 4.50, texKey: 'retro_film_act4_motor_deck_render_factorum_gemini_v1', type: 'event_illustration', ambientCueKey: 'dread_11_morlock_war_march_climax_50s', label: 'Заявочный план: Моторный цех — Начало биокатастрофы (Марш Морлоков 50с)' },"""

if target in text:
    text = text.replace(target, replacement, 1)
    print("SUCCESS 1: Added dread_11_morlock_war_march_climax_50s at 4.50s")
else:
    print("WARNING 1: target not found")

target2 = """    { time: 25.14, texKey: 'retro_film_macro_facehugger_critters_microchip_3', type: 'event_illustration', ambientCueKey: 'dread_04_predator_chittering_nightmare_25s', label: 'В логах крик: Личинки на чипах — 346 копий мутанта' },"""
replacement2 = """    { time: 25.14, texKey: 'retro_film_macro_facehugger_critters_microchip_3', type: 'event_illustration', label: 'В логах крик: Личинки на чипах — 346 копий мутанта' },"""

if target2 in text:
    text = text.replace(target2, replacement2, 1)
    print("SUCCESS 2: Removed dread_04 at 25.14s")
else:
    print("WARNING 2: target2 not found")

with open('repo/src/narratorShotSequence.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("narratorShotSequence.ts updated")
