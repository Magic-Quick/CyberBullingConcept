"""Validate the authoring project before building; production never conceals missing voice."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[2]
PROJECT=ROOT/'repo/src/chronicles/default-project.md'

def validate(path=PROJECT):
    markdown=path.read_text(encoding='utf-8-sig').replace('\r\n','\n')
    configs=re.findall(r'^```chronicles-config\s*\n([\s\S]*?)^```\s*$',markdown,re.M)
    if len(configs)!=1:raise ValueError('Expected exactly one chronicles-config section')
    p=json.loads(configs[0]);speech_blocks=re.findall(r'^\[ГОЛОС ЛОРДА ([^\]]+)\]\s*\n([\s\S]*?)^\[КОНЕЦ РЕПЛИКИ\]',markdown,re.M);speech=dict(speech_blocks)
    errors=[];pending=[]
    if len(speech_blocks)!=len(speech):errors.append('Duplicate authored voice IDs')
    if p.get('schemaVersion')!=1:errors.append('Unsupported schema version')
    for field in ['tracks','assets','utterances','scenes','clips','stops']:
        ids=[x['id'] for x in p[field]]
        if len(set(ids))!=len(ids):errors.append('Duplicate IDs: '+field)
    assets={a['id']:a for a in p['assets']};scenes={s['id']:s for s in p['scenes']};tracks={t['id']:t for t in p['tracks']};us={u['id']:u for u in p['utterances']}
    if set(speech)!=set(us):errors.append('Authored speech and metadata IDs differ')
    for uid,u in us.items():
        text=speech.get(uid,'').strip()
        if not text:errors.append('Empty voice: '+uid)
        digest=hashlib.sha256(text.encode('utf-8')).hexdigest()
        if u.get('textHash') and u['textHash']!=digest:errors.append('Stale authored text hash: '+uid)
        audio=assets.get(u.get('audioAssetId'))
        if not audio:pending.append(uid+': missing voice');continue
        if u.get('audioTextHash') and u['audioTextHash']!=digest:pending.append(uid+': stale voice')
        duration=u.get('duration',0)
        if not isinstance(duration,(int,float)) or not math.isfinite(duration) or duration<=0:pending.append(uid+': missing real duration')
        words=u.get('words',[])
        if not words:pending.append(uid+': missing word alignment')
        elif [w['text'] for w in words]!=text.split():errors.append('Alignment text differs from source: '+uid)
        previous=0
        for word in words:
            start,end=word.get('start'),word.get('end')
            if not all(isinstance(v,(int,float)) and math.isfinite(v) for v in (start,end)):
                errors.append('Non-finite word timing: '+uid);break
            if start < previous-.001 or end<start or start<0 or end>duration+.12:
                errors.append('Invalid word interval: '+uid);break
            previous=start
    for asset in p['assets']:
        if asset.get('path'):
            target=(ROOT/asset['path']).resolve()
            if not target.is_relative_to(ROOT) or not target.is_file():errors.append('Missing/outside asset: '+asset['id'])
    for scene in p['scenes']:
        transition=scene.get('transition')
        if transition and (transition.get('type') not in ('cut','line_lr','line_rl','line_tb','circle_iris','circle_iris_corner') or not isinstance(transition.get('duration'),(int,float)) or not math.isfinite(transition['duration']) or transition['duration']<=0):errors.append('Invalid transition: '+scene['id'])
        for uid in scene['utteranceIds']:
            if uid not in us:errors.append('Missing scene voice: '+uid)
    voice_starts={c['utteranceId']:c['start']['offset'] for c in p['clips'] if c['kind']=='voice' and c.get('utteranceId') and c['start']['type']=='scene'}
    def resolve_ref(ref):
        if ref['type']=='scene':return ref['offset']
        uid=ref.get('utteranceId');u=us.get(uid)
        if not u or uid not in voice_starts:return None
        value=voice_starts[uid]
        if ref['type']=='utterance':return value+(u.get('duration',0) if ref.get('edge')=='end' else 0)+ref['offset']
        index=ref.get('wordIndex',-1)
        if not 0<=index<len(u.get('words',[])):return None
        return value+u['words'][index]['end' if ref.get('edge')=='end' else 'start']+ref['offset']
    for c in p['clips']:
        if c['sceneId'] not in scenes or c['trackId'] not in tracks:errors.append('Missing clip owner: '+c['id'])
        if c.get('assetId') and c['assetId'] not in assets:errors.append('Missing clip asset: '+c['id'])
        command=c.get('audioCommand')
        if command and (command.get('action') not in ('silence','duck') or not isinstance(command.get('channel'),str) or not command['channel'].strip() or not isinstance(command.get('gain',0),(int,float)) or not math.isfinite(command.get('gain',0)) or not 0<=command.get('gain',0)<=1):errors.append('Invalid audio command: '+c['id'])
        for field in ['duration','sourceIn','sourceOut','gain','fadeIn','fadeOut','cleanExposure','duckBaseTo']:
            value=c.get(field)
            if value is not None and (not isinstance(value,(int,float)) or not math.isfinite(value) or value<0 or field=='duckBaseTo' and value>1):errors.append('Invalid '+field+': '+c['id'])
        if c.get('sourceOut',c.get('sourceIn',0))<c.get('sourceIn',0):errors.append('Reversed source trim: '+c['id'])
        start=resolve_ref(c['start']);end=resolve_ref(c['end']) if c.get('end') else None
        if start is not None and (not math.isfinite(start) or start<0 or end is not None and end<start-.000001):errors.append('Invalid clip interval: '+c['id'])
        for ref in [c['start'],c.get('end')]:
            if not ref:continue
            if ref['type'] in ['utterance','word'] and ref.get('utteranceId') not in us:errors.append('Missing voice anchor: '+c['id'])
            if ref['type']=='word' and ref.get('utteranceId') in us:
                u=us[ref['utteranceId']]
                if not 0<=ref.get('wordIndex',-1)<len(u.get('words',[])):pending.append(c['id']+': unresolved word anchor')
    for cue in p.get('navigation',[]):
        scene=scenes.get(cue['sceneId']);at=resolve_ref(cue['at'])
        if not scene or at is None or not math.isfinite(at) or at<0 or cue['at'].get('utteranceId') and cue['at']['utteranceId'] not in scene['utteranceIds']:errors.append('Invalid navigation: '+cue['id'])
    for n in p['sequence']:
        if n['kind']=='scene' and n['sceneId'] not in scenes:errors.append('Missing route scene')
        if n['kind']=='stop' and not any(s['id']==n['stopId'] for s in p['stops']):errors.append('Missing route stop')
    for s in p['stops']:
        g=s['game']
        if g['id']=='I-02' and (not g.get('revealAll') or g.get('maxWrong')):errors.append('Invalid Househunt rules')
        if g['id']=='I-03' and g.get('maxWrong')!=1:errors.append('Invalid CHGK rules')
    info={'schemaVersion':1,'projectId':p['id'],'projectSHA256':hashlib.sha256(markdown.encode('utf-8')).hexdigest(),'compilerVersion':'chronicles-1','status':'draft' if errors or pending else 'production_ready','utteranceCount':len(us),'clipCount':len(p['clips']),'stopCount':len(p['stops']),'errors':errors,'pendingCount':len(pending)}
    return info,pending

def main():
    sys.stdout.reconfigure(encoding='utf-8');parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--draft',action='store_true');args=parser.parse_args()
    info,pending=validate();print(json.dumps(info,ensure_ascii=False,indent=2))
    (ROOT/'repo/src/chronicles/build-manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if info['errors']:raise SystemExit('Build rejected: invalid project')
    if pending and not args.draft:raise SystemExit(f'Production build rejected: {len(pending)} missing/stale voice or timing dependencies. Use build:candidate for an explicit draft preview.')

if __name__=='__main__':main()
