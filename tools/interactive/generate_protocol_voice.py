"""Generate only changed interactive lines using the film's existing Geremy voice."""
import hashlib
import importlib.util
import json
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
SCENE = ROOT / 'media/interactive/scenes/protocol_gate.json'
OUT = SCENE.parent / 'protocol_gate_voice'
EVENTS = ('intro', 'letter_misplaced', 'letter_correct', 'letter_wrong', 'word_correct', 'word_wrong', 'repeat_letter')


def main():
    spec = importlib.util.spec_from_file_location('project_voice', ROOT / 'tools/audio_pipeline/generate_voiceover.py')
    project_voice = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(project_voice)
    key = project_voice.get_api_key()
    if not key:
        raise SystemExit('ElevenLabs key not configured; no files changed')
    scene = json.loads(SCENE.read_text(encoding='utf-8'))
    OUT.mkdir(exist_ok=True)
    manifest_path = OUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {
        'voice_id': project_voice.DEFAULT_VOICE_ID,
        'voice_name': 'Geremy',
        'model_id': project_voice.DEFAULT_MODEL_ID,
        'clips': {},
    }
    manifest['relative_to'] = 'media/interactive/scenes'
    common = json.loads((SCENE.parent / 'shared_game_rules.json').read_text(encoding='utf-8'))
    lines = {event: scene['dialogue'][event] for event in EVENTS}
    lines['attempts_exhausted'] = common['exhaustedDialogue']
    for event, text in lines.items():
        digest = hashlib.sha256(text.encode()).hexdigest()
        target = (SCENE.parent / 'shared_voice' / f'{event}.mp3') if event == 'attempts_exhausted' else OUT / f'{event}.mp3'
        target.parent.mkdir(exist_ok=True)
        if target.exists() and manifest['clips'].get(event, {}).get('text_sha256') == digest:
            manifest['clips'][event]['file'] = target.relative_to(SCENE.parent).as_posix()
            print(event, 'unchanged')
            continue
        response = requests.post(
            f'https://api.elevenlabs.io/v1/text-to-speech/{project_voice.DEFAULT_VOICE_ID}',
            headers={'xi-api-key': key, 'Content-Type': 'application/json'},
            json={'text': text, 'model_id': project_voice.DEFAULT_MODEL_ID,
                  'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0.0, 'use_speaker_boost': True}},
            timeout=60,
        )
        if not response.ok:
            detail = response.json().get('detail', {})
            code = detail.get('status', 'request_rejected') if isinstance(detail, dict) else 'request_rejected'
            raise SystemExit(f'{event}: HTTP {response.status_code}, {code}; earlier clips preserved')
        if not response.headers.get('content-type', '').startswith('audio/'):
            raise SystemExit(f'{event}: expected audio response; earlier clips preserved')
        target.write_bytes(response.content)
        manifest['clips'][event] = {'text': text, 'text_sha256': digest, 'file': target.relative_to(SCENE.parent).as_posix(),
                                    'bytes': len(response.content), 'request_id': response.headers.get('request-id')}
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(event, 'saved', len(response.content), 'bytes')
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    scene['narration'] = 'geremy_recorded'
    SCENE.write_text(json.dumps(scene, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
