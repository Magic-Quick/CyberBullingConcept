with open('repo/src/assetsManager.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Filter out Slack_Fin from imageEntries so only ./assets/slack/ is used
old_filter = 'const imageEntries = Object.entries(imageModules);'
new_filter = 'const imageEntries = Object.entries(imageModules).filter(([p]) => !p.toLowerCase().includes("slack_fin"));'

if old_filter in c:
    c = c.replace(old_filter, new_filter)
    print('Replaced imageEntries filter')

# Update nick egorov alias to v3
old_nick = "retro_film_nick: 'retro_film_nick_egorov_speedrun_v2'"
new_nick = "retro_film_nick: 'retro_film_nick_egorov_speedrun_v3',\n  retro_film_nick_egorov_speedrun_v3: 'retro_film_nick_egorov_speedrun_v3'"

if old_nick in c:
    c = c.replace(old_nick, new_nick)
    print('Replaced nick alias')

with open('repo/src/assetsManager.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated assetsManager.ts!')
