"""Recover local timing metadata after a failed generation checkpoint.

This tool never requests or generates speech. It merges valid checkpoints,
then verifies already existing MP3s with the cached offline Whisper model.
Every recovered result is journalled separately before updating the manifest.
"""
from __future__ import annotations

import argparse
import ast
import importlib.util
import json
import os
import statistics
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MEDIA = ROOT / 'media/interactive/chronicles'
GENERATED = MEDIA / 'generated-voice.json'
REPORT = MEDIA / 'voice-recovery-report.json'
SIDECARS = MEDIA / 'voice-recovery-cache'
METHOD = 'elevenlabs_existing_audio_local_alignment_recovery'
VOICE_ID = 'GquPFn9xormgmHaJ2KdN'
MODEL_ID = 'eleven_multilingual_v2'

spec = importlib.util.spec_from_file_location('chronicles_local_alignment', Path(__file__).with_name('align_reused_voice.py'))
assert spec is not None and spec.loader is not None
align = importlib.util.module_from_spec(spec)
spec.loader.exec_module(align)


def read_recipe() -> dict:
    """Read the constant without importing the network-capable generation tool."""
    tree = ast.parse(Path(__file__).with_name('generate_voice.py').read_text(encoding='utf-8-sig'))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'RECIPE' for t in node.targets):
            recipe = ast.literal_eval(node.value)
            if isinstance(recipe, dict):
                return recipe
    raise RuntimeError('Established voice recipe not found; no recovery metadata changed')


def atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', prefix=path.name + '.recover-', suffix='.tmp',
                                     dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
        stream.flush()
        os.fsync(stream.fileno())
    for delay in (0, .1, .2, .4, .7, 1, 1):
        if delay:
            time.sleep(delay)
        try:
            os.replace(temporary, path)
            return
        except PermissionError:
            # Windows antivirus/indexers may briefly hold a mapped file.
            continue
        except OSError as error:
            if getattr(error, 'winerror', None) not in (5, 32):
                raise
    raise RuntimeError(f'Checkpoint is locked. Complete recovery data preserved in {temporary}')


def json_file(path: Path) -> dict | None:
    try:
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        return data if isinstance(data, dict) else None
    except (OSError, ValueError, UnicodeError):
        return None


def complete_entry(entry: dict, row: dict) -> bool:
    words = entry.get('words', [])
    return (entry.get('text_sha256') == row['text_sha256'] and entry.get('text') == row['text']
            and len(words) == len(row['text'].split()) and bool(words)
            and [word.get('text') for word in words] == row['text'].split()
            and (ROOT / entry.get('file', '')).is_file())


def merged_checkpoints(manifest: dict) -> tuple[dict, list[dict]]:
    known = {row['id']: row for row in manifest['utterances']}
    merged = {'schemaVersion': 1, 'clips': {}}
    inputs = []
    paths = sorted(set([GENERATED, *MEDIA.glob('generated-voice.json*.tmp')]),
                   key=lambda p: p.stat().st_mtime_ns if p.exists() else 0)
    backup = ROOT / 'scratch/chronicles-voice-recovery' / time.strftime('%Y%m%d-%H%M%S')
    backup.mkdir(parents=True, exist_ok=True)
    for path in paths:
        data = json_file(path)
        if not data or not isinstance(data.get('clips'), dict):
            if path.exists():
                inputs.append({'path': path.relative_to(ROOT).as_posix(), 'status': 'invalid_json'})
            continue
        (backup / path.name).write_bytes(path.read_bytes())
        inputs.append({'path': path.relative_to(ROOT).as_posix(), 'status': 'merged', 'clips': len(data['clips'])})
        for key, value in data.items():
            if key != 'clips':
                merged[key] = value
        for clip_id, entry in data['clips'].items():
            if not isinstance(entry, dict):
                continue
            previous = merged['clips'].get(clip_id)
            row = known.get(clip_id)
            if previous and row and complete_entry(previous, row) and not complete_entry(entry, row):
                continue
            merged['clips'][clip_id] = entry
    return merged, inputs


def align_existing(model, path: Path, row: dict, minimum: float) -> dict:
    text, authored = row['text'], row['text'].split()
    audio_hash = align.sha(path.read_bytes())
    duration = align.speech_duration(path)
    result = {'method': METHOD, 'text_sha256': row['text_sha256'], 'audio_sha256': audio_hash,
              'file': path.relative_to(ROOT).as_posix(), 'duration': duration,
              'minimumAsrCoverage': minimum, 'status': 'partial', 'reasons': [],
              'wordTimesAreModelEstimates': True, 'interpolation': False}
    if duration > 30:
        result['reasons'] = ['recording_exceeds_single_alignment_window']
        return result
    heard = align.transcribe(model, path, text, False)
    matches, coverage = align.match_heard(authored, heard)
    prompted_coverage = None
    if coverage < .95:
        alternative = align.transcribe(model, path, text, True)
        alternate_matches, prompted_coverage = align.match_heard(authored, alternative)
        if prompted_coverage > coverage:
            heard, matches, coverage = alternative, alternate_matches, prompted_coverage
    result.update({'asrCoverage': coverage, 'asrMatchedWords': len(matches),
                   'authoredLexicalWords': sum(bool(align.normalize(w)) for w in authored),
                   'heardText': ''.join(word['word'] for word in heard).strip(),
                   'promptedCoverage': prompted_coverage, 'matchedWordTimings': list(matches.values())})
    if coverage < minimum:
        result['reasons'] = ['asr_coverage_below_threshold']
        return result
    forced = align.attention_align(model, path, text)
    words, reasons = align.authored_word_times(authored, forced, duration)
    result['attentionWordTimings'], result['reasons'] = forced, reasons
    if words:
        result['words'], result['status'] = words, 'aligned'
    return result


def recovered_entry(row: dict, result: dict, recipe: dict) -> dict:
    probabilities = [float(w['probability']) for w in result.get('attentionWordTimings', []) if 'probability' in w]
    entry = {'text': row['text'], 'text_sha256': row['text_sha256'], 'file': result['file'],
             'duration': result['duration'], 'audio_sha256': result['audio_sha256'],
             'voice_id': VOICE_ID, 'model_id': MODEL_ID, 'settings': recipe,
             'source_generation': METHOD, 'alignment': align.METHOD,
             'alignmentStatus': result['status'], 'asrCoverage': result.get('asrCoverage', 0),
             'matched_words': result.get('asrMatchedWords', 0), 'total_words': result.get('authoredLexicalWords', 0),
             'reviewRecommended': result.get('asrCoverage', 0) < .85,
             'attentionTokenProbability': {'minimum': min(probabilities) if probabilities else None,
                                           'median': statistics.median(probabilities) if probabilities else None}}
    if result.get('words'):
        entry['words'] = [{**word, 'text': row['text'].split()[index]} for index, word in enumerate(result['words'])]
    else:
        entry['alignmentNotes'] = {'reasons': result['reasons'], 'matchedWordTimings': result.get('matchedWordTimings', [])}
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--minimum-coverage', type=float, default=.65)
    parser.add_argument('--limit', type=int)
    parser.add_argument('--retry-partial', action='store_true')
    args = parser.parse_args()
    if not 0 < args.minimum_coverage <= 1:
        parser.error('--minimum-coverage must be in (0,1]')
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    manifest = json.loads((MEDIA / 'voice-manifest.json').read_text(encoding='utf-8'))
    if manifest.get('voice_id') != VOICE_ID or manifest.get('model_id') != MODEL_ID:
        raise RuntimeError('Voice recipe identity changed; review the original generation before recovery')
    recipe = read_recipe()
    generated, inputs = merged_checkpoints(manifest)
    atomic_json(GENERATED, generated)
    pending = [row for row in manifest['utterances'] if not complete_entry(generated['clips'].get(row['id'], {}), row)]
    if args.limit is not None:
        pending = pending[:args.limit]
    report = {'schemaVersion': 1, 'method': METHOD, 'network': 'disabled', 'minimumAsrCoverage': args.minimum_coverage,
              'inputs': inputs, 'initialMergedClips': len(generated['clips']), 'requestedRecovery': len(pending),
              'model': 'small', 'device': 'cpu', 'computeType': 'int8', 'cpuThreads': 4,
              'wordTimeEstimator': 'Cached Whisper attention alignment constrained to exact authored words; no interpolation',
              'clips': []}
    atomic_json(REPORT, report)
    model = None
    for index, row in enumerate(pending, 1):
        path = MEDIA / 'voice' / (row['text_sha256'][:24] + '.mp3')
        if not path.is_file():
            report['clips'].append({'id': row['id'], 'status': 'missing_audio', 'reasons': ['existing_mp3_not_found']})
            atomic_json(REPORT, report)
            print(f'{index}/{len(pending)} {row["id"]}: existing MP3 missing, no network used', flush=True)
            continue
        sidecar = SIDECARS / (row['text_sha256'] + '.json')
        result = json_file(sidecar)
        valid_cache = (result and result.get('method') == METHOD and result.get('text_sha256') == row['text_sha256']
                       and result.get('audio_sha256') == align.sha(path.read_bytes())
                       and result.get('minimumAsrCoverage') == args.minimum_coverage)
        if not valid_cache or args.retry_partial and result.get('status') != 'aligned':
            if model is None:
                from faster_whisper import WhisperModel
                print('Loading cached Whisper small on CPU; all network/model downloads disabled', flush=True)
                model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True,
                                     cpu_threads=4, num_workers=1)
            try:
                result = align_existing(model, path, row, args.minimum_coverage)
            except Exception as error:
                result = {'method': METHOD, 'text_sha256': row['text_sha256'],
                          'audio_sha256': align.sha(path.read_bytes()), 'file': path.relative_to(ROOT).as_posix(),
                          'duration': align.speech_duration(path), 'minimumAsrCoverage': args.minimum_coverage,
                          'status': 'partial', 'reasons': ['local_alignment_failed:' + type(error).__name__]}
            # This durable per-file journal is saved BEFORE replacing a shared manifest.
            atomic_json(sidecar, result)
        entry = recovered_entry(row, result, recipe)
        generated['clips'][row['id']] = entry
        atomic_json(GENERATED, generated)
        report['clips'].append({'id': row['id'], 'status': result['status'], 'file': entry['file'],
                                'duration': entry['duration'], 'asrCoverage': entry['asrCoverage'],
                                'publishedWords': len(entry.get('words', [])), 'reasons': result['reasons'],
                                'sidecar': sidecar.relative_to(ROOT).as_posix()})
        atomic_json(REPORT, report)
        print(f'{index}/{len(pending)} {row["id"]}: {result["status"]}; ASR {entry["asrCoverage"]:.0%}; words {len(entry.get("words", []))}', flush=True)
    remaining = [row['id'] for row in manifest['utterances'] if not complete_entry(generated['clips'].get(row['id'], {}), row)]
    report['summary'] = {'mergedClips': len(generated['clips']), 'recoveredAligned': sum(c['status'] == 'aligned' for c in report['clips']),
                         'recoveredPartial': sum(c['status'] != 'aligned' for c in report['clips']),
                         'completeUtterances': len(manifest['utterances']) - len(remaining),
                         'remaining': remaining}
    atomic_json(REPORT, report)
    print(json.dumps(report['summary'], ensure_ascii=False), flush=True)
    return 0 if not remaining else 2


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
