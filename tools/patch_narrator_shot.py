with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    c = f.read()

old_shot = "texKey: 'retro_film_nick_egorov_speedrun_v2'"
new_shot = "texKey: 'retro_film_nick_egorov_speedrun_v3'"

if old_shot in c:
    c = c.replace(old_shot, new_shot)
    print('Replaced Nick Egorov shot to speedrun_v3')

with open('repo/src/narratorShotSequence.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated narratorShotSequence.ts!')
