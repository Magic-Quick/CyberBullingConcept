"""Remove verified erroneous extra takes locally; retain the original recordings.

The explicit plan uses original recording times. Independent ASR and real
attention alignment must pass before the cache or authoring project is updated.
No speech is synthesized, no authored wording changes and no API is called.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import time
import av
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
align=module('alignment','align_reused_voice.py');audit=module('voice_audit','audit_voice.py');sync=module('voice_sync','sync_voice.py');generate=module('voice_generation','generate_voice.py')
def digest(value):return hashlib.sha256(value).hexdigest()

def remove_intervals(source:Path,target:Path,cuts:list):
    rate=44100;resampler=av.AudioResampler(format='fltp',layout='stereo',rate=rate);frames=[]
    with av.open(str(source)) as container:
        for frame in container.decode(audio=0):
            frames.extend(f.to_ndarray() for f in resampler.resample(frame))
        frames.extend(f.to_ndarray() for f in resampler.resample(None))
    audio=np.concatenate(frames,axis=1);cursor=0;pieces=[]
    for start,end,gap in cuts:
        a,b=round(start*rate),round(end*rate)
        if not cursor<=a<b<=audio.shape[1]:raise ValueError('Cuts must be ordered and inside the original recording')
        piece=audio[:,cursor:a].copy();fade=min(round(.005*rate),piece.shape[1]);piece[:,-fade:]*=np.linspace(1,0,fade);pieces.append(piece)
        if gap:pieces.append(np.zeros((2,round(gap*rate)),dtype=np.float32))
        cursor=b
    tail=audio[:,cursor:].copy();fade=min(round(.005*rate),tail.shape[1]);tail[:,:fade]*=np.linspace(0,1,fade);pieces.append(tail)
    pcm=np.ascontiguousarray(np.concatenate(pieces,axis=1),dtype=np.float32)
    with av.open(str(target),'w') as container:
        stream=container.add_stream('libmp3lame',rate=rate);stream.bit_rate=192000
        frame=av.AudioFrame.from_ndarray(pcm,format='fltp',layout='stereo');frame.sample_rate=rate
        for packet in stream.encode(frame):container.mux(packet)
        for packet in stream.encode(None):container.mux(packet)

def main():
    from faster_whisper import WhisperModel
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--plan',required=True,type=Path);args=parser.parse_args()
    plan=json.loads(args.plan.read_text(encoding='utf-8'));cache_path=ROOT/'media/interactive/chronicles/generated-voice.json';master=ROOT/'repo/src/chronicles/default-project.md';cache=json.loads(cache_path.read_text(encoding='utf-8'));original=master.read_text(encoding='utf-8');source,config,bodies=sync.parse_document(original);marked=copy.deepcopy(config);report=[]
    model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=4,local_files_only=True)
    for recipe in plan['repairs']:
        uid=recipe['id'];old=cache['clips'][uid];input_path=(ROOT/recipe['source']).resolve()
        if not input_path.is_relative_to(ROOT) or 'fin' in [p.lower() for p in input_path.parts]:raise ValueError('Invalid repair source')
        target=input_path.with_name(input_path.stem+'-clean.mp3')
        remove_intervals(input_path,target,recipe['cuts'])
        heard=align.transcribe(model,target,old['text'],False)
        # Russian hyphen compounds are often emitted as two ASR tokens.
        # Compare the same lexical units, without treating that as missing speech.
        authored=old['text'].replace('-',' ').split();split_heard=[{**word,'word':piece} for word in heard for piece in word['word'].replace('-',' ').split()]
        _,coverage=align.match_heard(authored,split_heard);comparison=audit.compare(old['text'],heard)
        if coverage<.85 or comparison['extraWordCount']>1:raise ValueError('Repaired take needs review: '+uid+' '+str(coverage)+' '+json.dumps({'heard':' '.join(w['word'].strip() for w in heard),**comparison},ensure_ascii=False))
        duration=align.speech_duration(target);forced=align.attention_align(model,target,old['text']);words,reasons=align.authored_word_times(old['text'].split(),forced,duration)
        if words is None:raise ValueError('Missing real word boundaries: '+uid)
        repair={'source':recipe['source'],'sourceSha256':digest(input_path.read_bytes()),'cuts':recipe['cuts'],'method':'local_edit_no_generation','heard':' '.join(w['word'].strip() for w in heard),'coverage':coverage,'alignmentReview':reasons}
        updated={**old,'file':target.relative_to(ROOT).as_posix(),'audio_sha256':digest(target.read_bytes()),'duration':duration,'words':words,'repair':repair};cache['clips'][uid]=updated
        next(u for u in marked['utterances'] if u['id']==uid)['audioTextHash']='repair_requested'
        report.append({'id':uid,'file':updated['file'],'duration':duration,**repair});print(json.dumps(report[-1],ensure_ascii=False),flush=True)
    output,changes=sync.apply_cache(marked,bodies,cache,ROOT,True)
    errors=[d for d in changes['diagnostics'] if d['severity']=='error']
    if errors:raise ValueError(json.dumps(errors))
    repaired_ids={r['id'] for r in plan['repairs']};old_ids={u['audioAssetId'] for u in config['utterances'] if u['id'] in repaired_ids};used={c.get('assetId') for c in output['clips']}|{u.get('audioAssetId') for u in output['utterances']};output['assets']=[a for a in output['assets'] if a['id'] not in old_ids or a['id'] in used]
    if master.read_text(encoding='utf-8')!=original:raise RuntimeError('The project changed during repair; import the prepared result explicitly')
    history=ROOT/'scratch/chronicles-viewer-regression';history.mkdir(exist_ok=True,parents=True);(history/('before-voice-repair-'+str(time.time_ns())+'.md')).write_text(original,encoding='utf-8')
    generate.save_json(cache_path,cache)
    for recipe in plan['repairs']:
        entry=cache['clips'][recipe['id']];generate.save_json((ROOT/recipe['source']).with_suffix('.json'),entry)
    master.write_text(sync.render_document(source,output,config),encoding='utf-8')
    generate.save_json(ROOT/'media/interactive/chronicles/voice-repair-report.json',{'network':'not_used','repairs':report,'montageChanges':changes})

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8');main()
