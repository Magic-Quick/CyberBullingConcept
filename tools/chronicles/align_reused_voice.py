"""Align reused Geremy clips locally; this tool never creates speech or uses a network.

Whisper ASR first checks that the recording resembles the approved transcript.
For accepted recordings, its attention alignment estimates boundaries for the
approved tokens. No missing word time is interpolated. Incomplete or suspect
results remain reports, not purported complete word alignments.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import re
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MEDIA = ROOT / 'media/interactive/chronicles'
METHOD = 'local_faster_whisper_small_attention_alignment_asr_verified_v1'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize(text: str) -> str:
    return re.sub(r'[^\w]+', '', text.lower().replace('ё', 'е'), flags=re.UNICODE)


def save_json(path: Path, value: dict):
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def match_heard(authored: list[str], heard: list[dict]) -> tuple[dict, float]:
    """Return exact lexical ASR matches with their actual model timestamps."""
    source = [(i, normalize(w)) for i, w in enumerate(authored) if normalize(w)]
    target = [(i, normalize(w['word'])) for i, w in enumerate(heard) if normalize(w['word'])]
    matcher = difflib.SequenceMatcher(None, [x[1] for x in source], [x[1] for x in target], autojunk=False)
    matches = {}
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            index = source[block.a + offset][0]
            original = heard[target[block.b + offset][0]]
            matches[index] = {'index': index, 'text': authored[index], 'start': float(original['start']),
                              'end': float(original['end']), 'probability': float(original.get('probability', 0))}
    return matches, len(matches) / max(1, len(source))


def authored_word_times(authored: list[str], forced: list[dict], duration: float) -> tuple[list[dict] | None, list[str]]:
    """Map attention-aligned token groups back to exact author whitespace tokens.

    Token groups may split punctuation differently. Lexical characters must match
    in full. Each word takes the existing aligned groups' outer boundaries; this
    merges model observations and does not synthesize intermediate timestamps.
    Standalone non-spoken punctuation uses the adjacent observed boundary.
    """
    expected = ''.join(normalize(word) for word in authored)
    observed = ''.join(normalize(word['word']) for word in forced)
    if expected != observed:
        return None, ['forced_text_mismatch']
    character_groups = []
    for word in forced:
        character_groups.extend([word] * len(normalize(word['word'])))
    cursor = 0
    result = []
    reasons = []
    for word in authored:
        size = len(normalize(word))
        if not size:
            boundary = result[-1]['end'] if result else float(character_groups[0]['start']) if character_groups else 0
            result.append({'text': word, 'start': round(boundary, 3), 'end': round(boundary, 3)})
            continue
        groups = character_groups[cursor:cursor + size]
        if len(groups) != size:
            return None, ['forced_mapping_incomplete']
        start, end = float(groups[0]['start']), float(groups[-1]['end'])
        probability = min(float(g.get('probability', 0)) for g in groups)
        if start < -0.001 or end > duration + .04 or end < start:
            reasons.append('outside_recording')
        if end - start < .019:
            reasons.append('collapsed_word_boundary')
        if result and start < result[-1]['start'] - .001:
            reasons.append('nonmonotonic_word_boundary')
        result.append({'text': word, 'start': round(max(0, start), 3), 'end': round(min(duration, end), 3)})
        cursor += size
    durations = [w['end'] - w['start'] for w in result if normalize(w['text'])]
    median = statistics.median(durations) if durations else 0
    if durations and max(durations) > max(2.5, median * 6):
        reasons.append('suspect_long_word')
    return (None if reasons else result), sorted(set(reasons))


def speech_duration(path: Path) -> float:
    import av
    with av.open(str(path)) as container:
        return round(sum(frame.samples / frame.sample_rate for frame in container.decode(audio=0)), 6)


def transcribe(model, path: Path, text: str, prompted: bool) -> list[dict]:
    segments, _ = model.transcribe(str(path), language='ru', initial_prompt=text if prompted else None,
                                   word_timestamps=True, beam_size=5 if not prompted else 3,
                                   vad_filter=False, condition_on_previous_text=False)
    return [{'word': word.word, 'start': word.start, 'end': word.end, 'probability': word.probability}
            for segment in segments for word in (segment.words or [])]


def attention_align(model, path: Path, text: str) -> list[dict]:
    from faster_whisper.audio import decode_audio
    from faster_whisper.tokenizer import Tokenizer
    audio = decode_audio(str(path), sampling_rate=model.feature_extractor.sampling_rate)
    features = model.feature_extractor(audio)
    # All reused reactions fit one Whisper window. Explicitly reject a longer
    # recording rather than silently truncate it and invent an alignment.
    frames = features.shape[-1]
    max_frames = model.feature_extractor.nb_max_frames
    if frames > max_frames:
        raise ValueError('recording_exceeds_single_alignment_window')
    encoded = model.encode(features)
    tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual, task='transcribe', language='ru')
    alignments = model.find_alignment(tokenizer, [tokenizer.encode(text)], encoded, frames)
    return [{key: float(value) if key in ('start', 'end', 'probability') else value
             for key, value in word.items() if key != 'tokens'} for word in alignments[0]] if alignments else []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--minimum-coverage', type=float, default=.65)
    parser.add_argument('--limit', type=int)
    parser.add_argument('--force', action='store_true', help='Re-run cached local alignments; never enables a network')
    args = parser.parse_args()
    if not 0 < args.minimum_coverage <= 1:
        parser.error('--minimum-coverage must be in (0,1]')
    # Defense in depth: no model downloads or telemetry, even if another library
    # changes its defaults. These variables affect only this process.
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    MEDIA.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((MEDIA / 'voice-manifest.json').read_text(encoding='utf-8'))
    reused = [row for row in manifest['utterances'] if row.get('status') == 'reused' and row.get('file')]
    old = json.loads((ROOT / 'media/interactive/scenes/protocol_gate_voice/manifest.json').read_text(encoding='utf-8'))['clips']
    old_by_file = {(Path('media/interactive/scenes') / c['file']).as_posix(): c for c in old.values()}
    unique = {}
    for row in reused:
        unique.setdefault((row['file'], row['text'].replace('…', '...')), []).append(row)
    if args.limit is not None:
        unique = dict(list(unique.items())[:args.limit])
    generated_path = MEDIA / 'generated-voice.json'
    generated = json.loads(generated_path.read_text(encoding='utf-8')) if generated_path.exists() else {'schemaVersion': 1, 'clips': {}}
    cache_path = MEDIA / 'reused-alignment-cache.json'
    cache = json.loads(cache_path.read_text(encoding='utf-8')) if cache_path.exists() else {'schemaVersion': 1, 'clips': {}}
    report = {'schemaVersion': 1, 'method': METHOD, 'network': 'disabled', 'minimumAsrCoverage': args.minimum_coverage,
              'model': 'small', 'device': 'cpu', 'computeType': 'int8', 'clips': [], 'modelAvailable': False,
              'wordTimesAreModelEstimates': True,
              'verification': 'Maximum exact lexical ASR coverage across an unprompted and, when needed, prompted pass',
              'wordTimeEstimator': 'Whisper attention alignment constrained to the approved transcript; no interpolation'}
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True, cpu_threads=4, num_workers=1)
        report['modelAvailable'] = True
    except Exception as exc:
        report['error'] = {'code': 'local_model_unavailable', 'type': type(exc).__name__, 'detail': str(exc)[:500]}
        save_json(MEDIA / 'reused-alignment-report.json', report)
        print('Local cached Whisper small unavailable; report saved; no network used.', flush=True)
        return 2
    for index, ((relative, normalized_text), rows) in enumerate(unique.items(), 1):
        path = ROOT / relative
        audio_hash = sha(path.read_bytes())
        duration = speech_duration(path)
        # Canonical typography has the same lexical content and can share one
        # acoustic inference. Per-ID words below retain the exact authored text.
        text = rows[0]['text']
        cache_key = audio_hash + ':' + sha(normalized_text.encode('utf-8'))
        result = cache['clips'].get(cache_key) if not args.force else None
        if not result or result.get('method') != METHOD or result.get('minimumAsrCoverage') != args.minimum_coverage:
            authored = text.split()
            heard = transcribe(model, path, text, False)
            matches, coverage = match_heard(authored, heard)
            prompted_coverage = None
            if coverage < .95:
                alternative = transcribe(model, path, text, True)
                alternate_matches, prompted_coverage = match_heard(authored, alternative)
                if prompted_coverage > coverage:
                    heard, matches, coverage = alternative, alternate_matches, prompted_coverage
            result = {'method': METHOD, 'minimumAsrCoverage': args.minimum_coverage, 'audio_sha256': audio_hash,
                      'file': relative, 'duration': duration, 'asrCoverage': coverage,
                      'asrMatchedWords': len(matches), 'authoredLexicalWords': sum(bool(normalize(w)) for w in authored),
                      'heardText': ''.join(w['word'] for w in heard).strip(), 'promptedCoverage': prompted_coverage,
                      'matchedWordTimings': list(matches.values()), 'status': 'partial', 'reasons': []}
            if coverage < args.minimum_coverage:
                result['reasons'] = ['asr_coverage_below_threshold']
            else:
                try:
                    forced = attention_align(model, path, text)
                    words, reasons = authored_word_times(authored, forced, duration)
                    result['attentionWordTimings'] = forced
                    result['reasons'] = reasons
                    if words:
                        result['words'] = words
                        result['status'] = 'aligned'
                except Exception as exc:
                    result['reasons'] = ['attention_alignment_failed:' + type(exc).__name__]
            cache['clips'][cache_key] = result
            save_json(cache_path, cache)
        for row in rows:
            token_probabilities = [float(w['probability']) for w in result.get('attentionWordTimings', []) if 'probability' in w]
            entry = {'text': row['text'], 'text_sha256': sha(row['text'].encode('utf-8')), 'file': relative,
                     'duration': duration, 'audio_sha256': audio_hash, 'alignment': result['method'],
                     'alignmentStatus': result['status'], 'asrCoverage': result['asrCoverage'],
                     'matched_words': result['asrMatchedWords'], 'total_words': result['authoredLexicalWords'],
                     'source_recording_text_sha256': old_by_file.get(relative, {}).get('text_sha256'),
                     'typographic_alias': row['text'] != old_by_file.get(relative, {}).get('text', row['text']),
                     'reviewRecommended': result['asrCoverage'] < .85,
                     'attentionTokenProbability': {'minimum': min(token_probabilities) if token_probabilities else None,
                                                   'median': statistics.median(token_probabilities) if token_probabilities else None}}
            if result.get('words'):
                source_words = row['text'].split()
                if len(source_words) == len(result['words']):
                    entry['words'] = [{**word, 'text': source_words[i]} for i, word in enumerate(result['words'])]
            if 'words' not in entry:
                entry['alignmentNotes'] = {'reasons': result['reasons'], 'matchedWordTimings': result.get('matchedWordTimings', [])}
            generated.setdefault('clips', {})[row['id']] = entry
            report['clips'].append({'id': row['id'], 'file': relative, 'audio_sha256': audio_hash,
                                    'status': entry['alignmentStatus'], 'asrCoverage': result['asrCoverage'],
                                    'matched_words': entry['matched_words'], 'total_words': entry['total_words'],
                                    'publishedWords': len(entry.get('words', [])), 'reasons': result['reasons'],
                                    'reviewRecommended': entry['reviewRecommended'],
                                    'attentionTokenProbability': entry['attentionTokenProbability']})
        save_json(generated_path, generated)
        print(f'{index}/{len(unique)} {path.name}: {result["status"]}, ASR {result["asrCoverage"]:.0%}, IDs {len(rows)}', flush=True)
    report['summary'] = {'uniqueAudioFiles': len({c['file'] for c in report['clips']}), 'utterances': len(report['clips']),
                         'aligned': sum(c['status'] == 'aligned' for c in report['clips']),
                         'partial': sum(c['status'] != 'aligned' for c in report['clips']),
                         'reviewRecommended': sum(c['reviewRecommended'] for c in report['clips']),
                         'publishedWordTimings': sum(c['publishedWords'] for c in report['clips'])}
    save_json(MEDIA / 'reused-alignment-report.json', report)
    print(json.dumps(report['summary'], ensure_ascii=False), flush=True)
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
