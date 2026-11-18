"""Word timing for the existing clips using the project's cached local Whisper model."""
import difflib
import hashlib
import json
import re
from pathlib import Path
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[2]
SCENES = ROOT / 'media/interactive/scenes'


def normalize(word):
    return re.sub(r'[^а-яёa-z0-9]', '', word.lower()).replace('ё', 'е')


def match_positions(authored, heard):
    positions = {}
    matcher = difflib.SequenceMatcher(None, [normalize(w) for w in authored],
        [normalize(w.word) for w in heard], autojunk=False)
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            word = heard[block.b + offset]
            positions[block.a + offset] = (word.start, word.end)
    return positions


def main():
    manifest = json.loads((SCENES / 'protocol_gate_voice/manifest.json').read_text(encoding='utf-8'))
    out = SCENES / 'protocol_gate_captions.json'
    captions = json.loads(out.read_text(encoding='utf-8')) if out.exists() else {}
    model = None
    for event, clip in manifest['clips'].items():
        path = SCENES / clip['file']
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        cached = captions.get(event, {})
        acceptable = cached.get('matched_words', 0) >= .65 * max(1, cached.get('total_words', 1))
        if cached.get('audio_sha256') == digest and cached.get('text_sha256') == clip['text_sha256'] and acceptable:
            print(event, 'unchanged', flush=True)
            continue
        if model is None:
            print('Loading cached local Whisper small on CPU', flush=True)
            model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True)
        segments, _ = model.transcribe(str(path), language='ru', initial_prompt=clip['text'],
            word_timestamps=True, beam_size=3, vad_filter=False, condition_on_previous_text=False)
        heard = [w for segment in segments for w in (segment.words or [])]
        authored = clip['text'].split()
        positions = match_positions(authored, heard)
        if len(positions) < .65 * len(authored):
            # A prompt can overwhelm recognition of short reactions. Compare an unprompted pass.
            segments, _ = model.transcribe(str(path), language='ru', beam_size=5, vad_filter=False,
                word_timestamps=True, condition_on_previous_text=False)
            alternate = [w for segment in segments for w in (segment.words or [])]
            alternate_positions = match_positions(authored, alternate)
            if len(alternate_positions) > len(positions):
                heard, positions = alternate, alternate_positions
        if not heard:
            raise SystemExit(f'{event}: no word timestamps; previous results preserved')
        exact_matches = len(positions)
        for index in range(len(authored)):
            if index in positions:
                continue
            right = next((i for i in range(index + 1, len(authored)) if i in positions), len(authored))
            left_time = positions[index - 1][1] if index else 0.0
            right_time = positions[right][0] if right < len(authored) else heard[-1].end
            step = max(0.01, right_time - left_time) / (right - index)
            positions[index] = (left_time, left_time + step)
        cues, pending, start = [], [], 0.0
        for index, word in enumerate(authored):
            if not pending:
                start = positions[index][0]
            pending.append(word)
            if re.search(r'[.!?]$', word) or len(' '.join(pending)) >= 90 or index == len(authored) - 1:
                cues.append({'start': round(start, 3), 'end': round(positions[index][1], 3), 'text': ' '.join(pending)})
                pending = []
        captions[event] = {'audio_sha256': digest, 'text_sha256': clip['text_sha256'],
            'alignment': 'local_whisper_small_word_timestamps', 'matched_words': exact_matches,
            'total_words': len(authored), 'cues': cues}
        out.write_text(json.dumps(captions, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(event, len(cues), 'cues, matched', exact_matches, '/', len(authored), flush=True)


if __name__ == '__main__':
    main()
