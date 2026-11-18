"""Record only missing approved utterances with the established Geremy recipe.

Timing API: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
No keys or response payloads are logged. Completed files survive quota/network failures.
"""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import difflib
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import threading
import time

import av
import requests

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / 'media/interactive/chronicles'
RECIPE = {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0.0, 'use_speaker_boost': True}

def save_json(path, value):
    """Windows readers/AV may briefly deny replacement; retain the completed checkpoint."""
    temporary=path.with_name(path.name+'.tmp')
    temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for attempt in range(12):
        try:
            temporary.replace(path)
            return
        except PermissionError:
            if attempt==11:raise
            time.sleep(min(1,.05*(attempt+1)))

def aligned_words(text, alignment):
    if not alignment:
        return []
    chars = alignment['characters']
    starts, ends = alignment['character_start_times_seconds'], alignment['character_end_times_seconds']
    heard = ''.join(chars)
    positions = {}
    for block in difflib.SequenceMatcher(None, text, heard, autojunk=False).get_matching_blocks():
        for j in range(block.size): positions[block.a+j] = block.b+j
    words = []
    for word in re.finditer(r'\S+', text):
        matched = [positions[i] for i in range(word.start(), word.end()) if i in positions]
        if not matched:
            return []
        words.append({'text': word.group(), 'start': round(starts[min(matched)], 4), 'end': round(ends[max(matched)], 4)})
    return words

def duration(path):
    with av.open(str(path)) as audio:
        return round(sum(f.samples/f.sample_rate for f in audio.decode(audio=0)), 4)

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    manifest = json.loads((FOLDER/'voice-manifest.json').read_text(encoding='utf-8'))
    generated_path=FOLDER/'generated-voice.json'
    generated=json.loads(generated_path.read_text(encoding='utf-8')) if generated_path.exists() else {'clips':{}}
    missing=[]
    for u in manifest['utterances']:
        saved=generated['clips'].get(u['id'])
        if u.get('file') and (ROOT/u['file']).is_file(): continue
        if saved and saved['text_sha256']==u['text_sha256'] and (ROOT/saved['file']).is_file(): continue
        missing.append(u)
    # Equal authored lines share a recording but keep independent semantic IDs.
    groups={}
    for u in missing: groups.setdefault(u['text_sha256'],[]).append(u)
    work=list(groups.values())[:args.limit or None]
    print(json.dumps({'missing_utterances':len(missing),'unique_requests':len(work),'characters':sum(len(g[0]['text']) for g in work),'voice':manifest['voice_id'],'model':manifest['model_id']},ensure_ascii=False),flush=True)
    if args.dry_run:return
    if not work:return
    spec=importlib.util.spec_from_file_location('project_voice',ROOT/'tools/audio_pipeline/generate_voiceover.py')
    provider=importlib.util.module_from_spec(spec);spec.loader.exec_module(provider)
    key=provider.get_api_key()
    if not key:raise SystemExit('ElevenLabs is not configured; no requests sent')
    output=FOLDER/'voice';output.mkdir(parents=True,exist_ok=True)
    stop=threading.Event()
    def record(group):
        u=group[0]
        if stop.is_set():return None
        text=u['text']
        path=output/(u['text_sha256'][:24]+'.mp3')
        sidecar=path.with_suffix('.json')
        if sidecar.is_file() and path.is_file():
            cached=json.loads(sidecar.read_text(encoding='utf-8'))
            if cached.get('text_sha256')==u['text_sha256'] and cached.get('audio_sha256')==hashlib.sha256(path.read_bytes()).hexdigest():
                return {'group':group,'meta':cached,'characters':0}
        if path.exists():
            # Never spend credits twice just because the process lost its aggregate manifest.
            stop.set();return {'error':'existing_audio_needs_local_recovery','id':u['id']}
        request={'text':text,'model_id':manifest['model_id'],'voice_settings':RECIPE}
        try:
            response=requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{manifest['voice_id']}/with-timestamps",headers={'xi-api-key':key,'Content-Type':'application/json'},json=request,timeout=60)
        except requests.RequestException as e:
            stop.set();return {'error':'network_'+type(e).__name__,'id':u['id']}
        if not response.ok:
            stop.set()
            try:
                d=response.json().get('detail',{});code=d.get('status','request_rejected') if isinstance(d,dict) else 'request_rejected'
            except ValueError:code='request_rejected'
            return {'error':code,'status':response.status_code,'id':u['id']}
        data=response.json()
        body=base64.b64decode(data['audio_base64'],validate=True)
        if len(body)<1000:stop.set();return {'error':'empty_audio','id':u['id']}
        path.write_bytes(body)
        words=aligned_words(text,data.get('alignment'))
        meta={'text':text,'text_sha256':u['text_sha256'],'file':path.relative_to(ROOT).as_posix(),'duration':duration(path),'words':words,'audio_sha256':hashlib.sha256(body).hexdigest(),'voice_id':manifest['voice_id'],'model_id':manifest['model_id'],'settings':RECIPE,'request_id':response.headers.get('request-id')}
        save_json(sidecar,meta)
        return {'group':group,'meta':meta,'characters':response.headers.get('x-character-count')}
    errors=[];done=0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures=[pool.submit(record,g) for g in work]
        for future in as_completed(futures):
            result=future.result()
            if not result:continue
            if 'error' in result:errors.append(result);print(json.dumps(result),flush=True);continue
            for u in result['group']:generated['clips'][u['id']]={**result['meta'],'text':u['text'],'text_sha256':u['text_sha256']}
            try:save_json(generated_path,generated)
            except PermissionError:
                stop.set()
                for pending in futures:pending.cancel()
                raise SystemExit('Manifest is locked. Completed per-clip sidecars are preserved; retry safely after the lock is released.')
            done+=1
            print(f"{done}/{len(work)} {result['group'][0]['id']} saved; {result['meta']['duration']:.2f}s; word timing={'yes' if result['meta']['words'] else 'needs alignment'}",flush=True)
    if errors:raise SystemExit('Generation stopped; completed clips preserved; '+json.dumps(errors,ensure_ascii=False))
    print('All requested clips recorded; run sync_voice.py --apply-cache, then import its Markdown result in the director.',flush=True)

if __name__=='__main__':main()
