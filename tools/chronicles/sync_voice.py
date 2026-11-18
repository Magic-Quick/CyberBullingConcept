"""Offline speech-cache synchronisation that preserves an edited director project.

No importer, generator, model or network client is invoked. Markdown speech and
all unrelated montage objects remain intact. The default output is a new file;
replacing the input master is deliberately prohibited, including with --overwrite.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import os
import re
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / 'repo/src/chronicles/default-project.md'
CACHE = ROOT / 'media/interactive/chronicles/generated-voice.json'
CONFIG = re.compile(r'^```chronicles-config[^\S\r\n]*\n([\s\S]*?)^```[ \t]*$', re.MULTILINE)
VOICE = re.compile(r'^\[ГОЛОС ЛОРДА ([^\]\r\n]+)\][ \t]*\n([\s\S]*?)^\[КОНЕЦ РЕПЛИКИ\][ \t]*$', re.MULTILINE)
VOICE_ID = 'GquPFn9xormgmHaJ2KdN'
MODEL_ID = 'eleven_multilingual_v2'


def sha(text: str | bytes) -> str:
    return hashlib.sha256(text.encode('utf-8') if isinstance(text, str) else text).hexdigest()


def parse_document(markdown: str) -> tuple[str, dict, dict[str, str]]:
    source = markdown.replace('\r\n', '\n').replace('\r', '\n')
    sections = list(CONFIG.finditer(source))
    if len(sections) != 1:
        raise ValueError('Expected exactly one chronicles-config section')
    config = json.loads(sections[0].group(1))
    if not isinstance(config, dict) or config.get('schemaVersion') != 1:
        raise ValueError('Unsupported project schema')
    for key in ('utterances', 'assets', 'clips', 'scenes', 'stops', 'tracks', 'sequence'):
        if not isinstance(config.get(key), list):
            raise ValueError(f'Missing project array: {key}')
    authored = source[:sections[0].start()] + source[sections[0].end():]
    bodies = {}
    for match in VOICE.finditer(authored):
        if match[1] in bodies:
            raise ValueError('Duplicate voice body: ' + match[1])
        bodies[match[1]] = match[2].strip()
    if any(not isinstance(u, dict) for u in config['utterances']):
        raise ValueError('Utterance metadata must contain objects')
    ids = [u.get('id') for u in config['utterances']]
    if any(not isinstance(uid, str) or not uid for uid in ids) or len(set(ids)) != len(ids) or set(ids) != set(bodies):
        raise ValueError('Voice bodies and metadata must have the same unique IDs')
    if any(not body for body in bodies.values()):
        raise ValueError('Empty voice bodies cannot be prepared for recording')
    return source, config, bodies


def local_file(root: Path, relative: str | None) -> Path | None:
    if not isinstance(relative, str) or not relative:
        return None
    path = (root / relative).resolve()
    return path if path.is_relative_to(root.resolve()) and path.is_file() else None


def matching_cache(cache: dict, uid: str, text: str, root: Path) -> dict | None:
    clips = cache.get('clips', {})
    if not isinstance(clips, dict):
        raise ValueError('Invalid voice cache: clips must be an object')
    preferred = [clips[uid]] if uid in clips else []
    for entry in [*preferred, *clips.values()]:
        if not isinstance(entry, dict) or entry.get('text') != text or entry.get('text_sha256') != sha(text):
            continue
        if entry.get('voice_id', VOICE_ID) != VOICE_ID or entry.get('model_id', MODEL_ID) != MODEL_ID:
            continue
        path = local_file(root, entry.get('file'))
        if path and entry.get('audio_sha256') == sha(path.read_bytes()):
            return entry
    return None


def ready(utterance: dict, text: str, assets: dict, root: Path) -> bool:
    asset = assets.get(utterance.get('audioAssetId'), {})
    path = local_file(root, asset.get('path'))
    return bool(utterance.get('audioTextHash') == sha(text) and path
                and (not asset.get('sha256') or asset['sha256'] == sha(path.read_bytes())))


def make_manifest(source: str, config: dict, bodies: dict, cache: dict, root: Path) -> tuple[dict, dict]:
    assets = {a['id']: a for a in config['assets']}
    rows, pending, cached = [], [], []
    for utterance in config['utterances']:
        uid, text = utterance['id'], bodies[utterance['id']]
        if ready(utterance, text, assets, root):
            continue
        candidate = matching_cache(cache, uid, text, root)
        status = 'stale' if utterance.get('audioAssetId') else 'missing'
        rows.append({'id': uid, 'text': text, 'text_sha256': sha(text),
                     'status': status, 'file': candidate.get('file') if candidate else None,
                     'duration': candidate.get('duration') if candidate else None})
        (cached if candidate else pending).append(uid)
    return ({'schemaVersion': 1, 'source': 'current_director_markdown_project', 'source_sha256': sha(source),
             'voice_id': VOICE_ID, 'model_id': MODEL_ID, 'utterances': rows},
            {'action': 'manifest', 'readyUnchanged': len(config['utterances']) - len(rows),
             'needsGeneration': pending, 'matchingCacheAvailable': cached,
             'charactersPending': sum(len(row['text']) for row in rows if row['id'] in pending)})


def voice_length(clip: dict, utterance: dict, assets: dict) -> float:
    asset = assets.get(clip.get('assetId', utterance.get('audioAssetId')), {})
    total = asset.get('duration', utterance.get('duration')) or 0
    available = max(0, min(clip.get('sourceOut', total), total) - clip.get('sourceIn', 0))
    length = min(clip.get('duration', available), available)
    if clip.get('end', {}).get('type') == 'scene' and clip.get('start', {}).get('type') == 'scene':
        length = min(length, max(0, clip['end']['offset'] - clip['start']['offset']))
    return length


def validate_words(entry: dict, text: str) -> bool:
    words = entry.get('words', [])
    if not isinstance(entry.get('duration'), (int, float)) or not math.isfinite(entry['duration']) or entry['duration'] <= 0:
        return False
    if not isinstance(words, list) or any(not isinstance(word, dict) for word in words) or [word.get('text') for word in words] != text.split():
        return False
    previous = 0
    for word in words:
        start, end = word.get('start'), word.get('end')
        if (not isinstance(start, (int, float)) or not isinstance(end, (int, float))
                or not math.isfinite(start) or not math.isfinite(end) or start < previous - .001
                or start < 0 or end < start or end > entry['duration'] + .05):
            return False
        previous = start
    return bool(words)


def apply_cache(config: dict, bodies: dict, cache: dict, root: Path, ripple: bool = False) -> tuple[dict, dict]:
    output = copy.deepcopy(config)
    assets = {a['id']: a for a in output['assets']}
    previous_assets = {a['id']: a for a in config['assets']}
    previous_utterances = {u['id']: u for u in config['utterances']}
    previous_clips = {c['id']: c for c in config['clips']}
    report = {'action': 'apply-cache', 'ripple': ripple, 'updatedUtterances': [], 'pending': [],
              'voiceDurationChanges': [], 'shiftedReferences': [], 'diagnostics': []}
    changes = []
    for utterance in output['utterances']:
        uid, text = utterance['id'], bodies[utterance['id']]
        current_ready = ready(utterance, text, assets, root)
        if current_ready and validate_words(utterance, text):
            continue
        entry = matching_cache(cache, uid, text, root)
        if current_ready and entry:
            current_asset = assets.get(utterance.get('audioAssetId'), {})
            current_path = local_file(root, current_asset.get('path'))
            if not current_path or sha(current_path.read_bytes()) != entry['audio_sha256']:
                # A different, manually selected valid take must not be silently replaced.
                entry = None
        if not entry or not validate_words(entry, text):
            report['pending'].append(uid)
            report['diagnostics'].append({'code': 'missing_matching_cache' if not entry else 'missing_alignment',
                                          'severity': 'warning', 'id': uid})
            continue
        existing = next((a for a in output['assets'] if a.get('path') == entry['file']), None)
        if existing:
            aid = existing['id']
            existing.update({'kind': 'audio', 'duration': entry['duration'], 'sha256': entry['audio_sha256']})
        else:
            aid = 'audio:' + entry['file']
            asset = {'id': aid, 'kind': 'audio', 'path': entry['file'], 'label': uid,
                     'duration': entry['duration'], 'sha256': entry['audio_sha256']}
            if aid in assets:
                raise ValueError('New voice asset ID conflicts with another resource: ' + aid)
            output['assets'].append(asset)
            assets[aid] = asset
        old_utterance = previous_utterances[uid]
        utterance.update({'textHash': sha(text), 'audioTextHash': sha(text), 'audioAssetId': aid,
                          'duration': entry['duration'], 'words': [{k: w[k] for k in ('text', 'start', 'end')} for w in entry['words']]})
        for clip in output['clips']:
            if clip.get('kind') != 'voice' or clip.get('utteranceId') != uid:
                continue
            old = previous_clips[clip['id']]
            old_length = voice_length(old, old_utterance, previous_assets)
            old_source = previous_assets.get(old.get('assetId', old_utterance.get('audioAssetId')), {}).get('duration', old_utterance.get('duration')) or 0
            source_in = clip.get('sourceIn', 0)
            # Preserve a deliberate tail trim; a full take follows its new full duration.
            full_old = max(0, old_source - source_in)
            trimmed_tail = clip.get('sourceOut') is not None or old_length < full_old - .001
            available = max(0, min(clip.get('sourceOut', entry['duration']), entry['duration']) - source_in)
            new_length = min(old_length, available) if trimmed_tail else available
            if source_in >= entry['duration'] or clip.get('sourceOut', 0) > entry['duration'] + .001:
                report['diagnostics'].append({'code': 'trim_outside_new_recording', 'severity': 'error', 'id': clip['id']})
            clip['assetId'], clip['duration'] = aid, round(new_length, 6)
            delta = round(new_length - old_length, 6)
            if clip.get('start', {}).get('type') == 'scene':
                start = old['start']['offset']
                if clip.get('end', {}).get('type') == 'scene':
                    clip['end']['offset'] = round(start + new_length, 6)
                if clip.get('enabled') is not False and abs(delta) > .000001:
                    change = {'id': clip['id'], 'sceneId': clip['sceneId'], 'oldEnd': start + old_length,
                              'oldLength': old_length, 'newLength': new_length, 'delta': delta}
                    changes.append(change)
                    report['voiceDurationChanges'].append(change)
            else:
                report['diagnostics'].append({'code': 'relative_voice_start_review', 'severity': 'warning', 'id': clip['id']})
        if old_utterance.get('audioTextHash') != sha(text):
            for clip in output['clips']:
                if any(ref and ref.get('type') == 'word' and ref.get('utteranceId') == uid for ref in (clip.get('start'), clip.get('end'))):
                    report['diagnostics'].append({'code': 'word_anchor_review', 'severity': 'warning', 'id': clip['id'], 'utteranceId': uid})
        report['updatedUtterances'].append(uid)
    if ripple:
        for clip in output['clips']:
            old = previous_clips[clip['id']]
            for edge in ('start', 'end'):
                ref = old.get(edge)
                if not ref or ref.get('type') != 'scene':
                    continue
                shift = sum(c['delta'] for c in changes if c['sceneId'] == clip['sceneId']
                            and c['id'] != clip['id'] and ref['offset'] >= c['oldEnd'] - .000001)
                if shift:
                    clip[edge]['offset'] = round(clip[edge]['offset'] + shift, 6)
                    report['shiftedReferences'].append({'id': clip['id'], 'edge': edge, 'delta': shift})
        for scene in output['scenes']:
            delta = sum(c['delta'] for c in changes if c['sceneId'] == scene['id'])
            if delta:
                scene['duration'] = round(max(0, scene['duration'] + delta), 6)
    utterances = {u['id']: u for u in output['utterances']}
    for scene in output['scenes']:
        voices = sorted((c for c in output['clips'] if c.get('kind') == 'voice' and c['sceneId'] == scene['id']
                         and c.get('enabled') is not False and c.get('start', {}).get('type') == 'scene'), key=lambda c: c['start']['offset'])
        for first, second in zip(voices, voices[1:]):
            end = first['start']['offset'] + voice_length(first, utterances[first['utteranceId']], assets)
            if end > second['start']['offset'] + .001:
                report['diagnostics'].append({'code': 'voice_overlap', 'severity': 'error', 'id': first['id'],
                                              'nextId': second['id'], 'overlapSeconds': round(end - second['start']['offset'], 6)})
    return output, report


def render_document(source: str, config: dict, old_config: dict) -> str:
    if config == old_config:
        return source
    return CONFIG.sub(lambda _: '```chronicles-config\n' + json.dumps(config, ensure_ascii=False, indent=2) + '\n```', source, count=1)


def write_output(path: Path, data: bytes, root: Path, master: Path, overwrite: bool = False) -> None:
    path, root, master = path.resolve(), root.resolve(), master.resolve()
    if not path.is_relative_to(root) or any(p.casefold() == 'fin' for p in path.parts):
        raise ValueError('Output must be inside the workspace and outside Fin')
    if path == master:
        raise ValueError('Never overwrite the input master; import the neighbouring result through the editor')
    previous = path.read_bytes() if path.exists() else None
    if previous is not None and not overwrite:
        raise FileExistsError(f'Output already exists: {path}; choose another output or explicitly use --overwrite')
    if previous is not None:
        history = root / 'scratch/chronicles-voice-sync-history'
        history.mkdir(parents=True, exist_ok=True)
        (history / f'{time.time_ns()}-{path.name}').write_bytes(previous)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('wb', prefix=path.name + '.', suffix='.tmp', dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(data); stream.flush(); os.fsync(stream.fileno())
    for delay in (0, .1, .2, .4, .7, 1, 1):
        if delay:
            time.sleep(delay)
        try:
            current = path.read_bytes() if path.exists() else None
            if current != previous:
                raise RuntimeError(f'Output changed concurrently; prepared result retained in {temporary}')
            os.replace(temporary, path)
            return
        except PermissionError:
            continue
        except OSError as error:
            if getattr(error, 'winerror', None) not in (5, 32):
                raise
    raise RuntimeError(f'Output locked; complete result retained in {temporary}')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--manifest', action='store_true', help='Export only stale/missing current speech for generate_voice.py')
    mode.add_argument('--apply-cache', action='store_true', help='Apply matching local cached recordings without reimporting scenes')
    parser.add_argument('--master', type=Path, default=MASTER)
    parser.add_argument('--cache', type=Path, default=CACHE)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--ripple', action='store_true', help='Explicitly shift later fixed scene references by voice duration changes')
    parser.add_argument('--overwrite', action='store_true', help='Replace an existing output with a history backup; never the input master')
    args = parser.parse_args()
    if args.ripple and not args.apply_cache:
        parser.error('--ripple is only valid with --apply-cache')
    master_bytes = args.master.read_bytes()
    source, config, bodies = parse_document(master_bytes.decode('utf-8-sig'))
    cache = json.loads(args.cache.read_text(encoding='utf-8')) if args.cache.exists() else {'clips': {}}
    stamp = str(time.time_ns())
    output = args.output or args.master.with_name(args.master.stem + ('.voice-manifest.' if args.manifest else '.voice-synced.') + stamp + ('.json' if args.manifest else '.md'))
    report_path = args.report or output.with_name(output.name + '.report.json')
    if output.resolve() == args.cache.resolve() or report_path.resolve() == args.cache.resolve():
        parser.error('The recording cache is read-only; choose another output')
    if output.resolve() == report_path.resolve():
        parser.error('Project/manifest and report need separate output files')
    if (args.manifest and output.suffix.lower() != '.json'
            or args.apply_cache and output.suffix.lower() not in ('.md', '.txt')):
        parser.error('Use .json for a manifest and .md/.txt for an updated project')
    if args.manifest:
        result, report = make_manifest(source, config, bodies, cache, ROOT)
        result['source'] = str(args.master.resolve())
        payload = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    else:
        result, report = apply_cache(config, bodies, cache, ROOT, args.ripple)
        payload = render_document(source, result, config)
    report.update({'master': str(args.master.resolve()), 'masterSha256': sha(master_bytes), 'output': str(output.resolve()), 'network': 'not_used'})
    if args.master.read_bytes() != master_bytes:
        raise RuntimeError('Input master changed while preparing the output; retry from its latest saved version')
    if args.apply_cache:
        history = ROOT / 'scratch/chronicles-voice-sync-history' / (stamp + '-' + args.master.name)
        write_output(history, master_bytes, ROOT, args.master)
        report['sourceBackup'] = str(history)
    write_output(output, payload.encode('utf-8'), ROOT, args.master, args.overwrite)
    write_output(report_path, (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'), ROOT, args.master, args.overwrite)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 2 if any(d['severity'] == 'error' for d in report.get('diagnostics', [])) else 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        raise SystemExit(main())
    except (ValueError, OSError, RuntimeError) as error:
        raise SystemExit(str(error)) from None
