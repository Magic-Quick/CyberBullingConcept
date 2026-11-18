import os, hashlib

p1 = r'repo/src/assets/fin/Team_Fin/retro_film_nick_egorov_speedrun_v2.png'
if os.path.exists(p1):
    with open(p1, 'rb') as f:
        h1 = hashlib.md5(f.read()).hexdigest()
    print('retro_film_nick_egorov_speedrun_v2 size:', os.path.getsize(p1), 'md5:', h1)

for root, dirs, files in os.walk(r'media/visual/generated'):
    for f in files:
        if 'egorov' in f or 'time_machine' in f or 'speedrun' in f:
            full = os.path.join(root, f)
            print(f, os.path.getsize(full))
