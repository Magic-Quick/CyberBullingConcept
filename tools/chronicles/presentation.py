"""Defaults for new imports. Placement and avatars remain editable in Markdown."""
AVATARS=[(('горин',),'avatar_gorin'),(('эдуард','эдик'),'avatar_eduard'),(('павел','самойленко'),'avatar_pavel'),(('хухр',),'avatar_huhro'),(('мамусин',),'avatar_mamusin'),(('ева',),'avatar_eva'),(('толя','щербаков'),'avatar_toly'),(('ник','егоров'),'avatar_nick_egorov'),(('егор','ткачев','ткачёв'),'avatar_egor'),(('даниал','искаков'),'avatar_hoodie'),(('ворон',),'retro_film_voron_arch_abbot_v7'),(('берёзкин','кирилл'),'avatar_kirill'),(('кристиан',),'avatar_christian'),(('давит',),'avatar_davit'),(('панков',),'avatar_pankov'),(('хаецкий','вова'),'avatar_khaetsky'),(('вика','фесенко'),'avatar_vika'),(('женя',),'avatar_zhenya'),(('новенький','алексей'),'retro_film_alexey_novice_v4')]
def apply_presentation(project):
    seen=set();assets={a['id']:a for a in project['assets']}
    for clip in project['clips']:
        if clip['kind']=='image':clip.setdefault('layout','screenshot')
        if clip['kind']!='nameplate':continue
        clip.setdefault('layout','character');name=clip.get('text','').lower().strip()
        clip.setdefault('typewriter',name not in seen);seen.add(name)
        key=next((key for names,key in AVATARS if any(part in name for part in names)),None)
        if key:
            aid='image:'+key;assets.setdefault(aid,{'id':aid,'kind':'image','key':key});clip.setdefault('avatarAssetId',aid)
    project['assets']=list(assets.values())
    # Unmatted copies preserve the identical reviewed crop and fill portrait screens.
    from pathlib import Path
    import json
    root=Path(__file__).resolve().parents[2]
    manifest=root/'media/interactive/chronicles/neutral-portraits.json'
    if manifest.exists():
        records=json.loads(manifest.read_text(encoding='utf-8'))['portraits'].values()
        paths={row['path']:row['responsivePath'] for row in records if row.get('responsivePath')}
        for asset in project['assets']:
            if asset.get('path') in paths:asset['path']=paths[asset['path']]
    return project
