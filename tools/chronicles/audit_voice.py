"""Offline listening aid: record independent ASR, including inserted/repeated words.

Coverage alone can miss a broken extra take inside an otherwise complete line.
This report never edits source speech, media or timing, and makes no API calls.
"""
import argparse
import difflib
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
SPEC=importlib.util.spec_from_file_location('voice_alignment',Path(__file__).with_name('align_reused_voice.py'))
align=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(align)

def compare(text,words):
    authored=[align.normalize(w) for w in text.split() if align.normalize(w)]
    heard=[align.normalize(w['word']) for w in words if align.normalize(w['word'])]
    differences=[]
    for tag,a,b,c,d in difflib.SequenceMatcher(None,authored,heard,autojunk=False).get_opcodes():
        if tag!='equal':differences.append({'kind':tag,'expected':authored[a:b],'heard':heard[c:d],'heardIndices':[c,d]})
    extra=sum(max(0,len(x['heard'])-len(x['expected'])) for x in differences)
    return {'extraWordCount':extra,'differences':differences,'reviewRecommended':extra>=3}

def main():
    from faster_whisper import WhisperModel
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=ROOT/'scratch/chronicles-viewer-regression/voice-asr-audit.json');args=parser.parse_args()
    cache=json.loads((ROOT/'media/interactive/chronicles/generated-voice.json').read_text(encoding='utf-8'))['clips']
    report=json.loads(args.output.read_text(encoding='utf-8')) if args.output.exists() else {'network':'not_used','clips':{}}
    priority=['HANDOFF-01','I-04.ВХОД','HANDOFF-02','HANDOFF-03','HANDOFF-04','HANDOFF-05','I-01.ВХОД','I-03.ВХОД','I-02.ВХОД','I-05.ВХОД']
    ids=[uid for uid,u in cache.items() if '/chronicles/voice/' in u['file']]
    ids.sort(key=lambda uid:(priority.index(uid) if uid in priority else len(priority),uid))
    model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=4,local_files_only=True)
    for count,uid in enumerate(ids,1):
        u=cache[uid];path=ROOT/u['file'];digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if report['clips'].get(uid,{}).get('audioSha256')==digest:continue
        words=align.transcribe(model,path,u['text'],False)
        row={'audioSha256':digest,'text':u['text'],'heard':' '.join(w['word'].strip() for w in words),'words':words,**compare(u['text'],words)}
        report['clips'][uid]=row;args.output.parent.mkdir(exist_ok=True,parents=True);temporary=args.output.with_suffix('.tmp');temporary.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(args.output)
        print(json.dumps({'index':count,'total':len(ids),'id':uid,'extraWords':row['extraWordCount'],'heard':row['heard'] if row['reviewRecommended'] or uid in priority else None},ensure_ascii=False),flush=True)
    print('Offline ASR audit complete',flush=True)

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8');main()
